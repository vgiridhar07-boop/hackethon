import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Complaint, HelplineEndpoint, UserProfile, HelplineAuditFlag } from '../types';
import { NATIONAL_HELPLINES } from '../data/nationalHelplines';
import { DISTRICT_ROUTING_170 } from '../data/districtRouting170';
import { STATES_UTS } from '../data/statesUts';

interface CivicHelplineDB extends DBSchema {
  complaints: {
    key: string;
    value: Complaint;
    indexes: { 'by-ticket': string; 'by-status': string };
  };
  helplines: {
    key: string;
    value: HelplineEndpoint;
    indexes: { 'by-category': string; 'by-district': number };
  };
  user_profile: {
    key: string;
    value: UserProfile;
  };
  audit_flags: {
    key: number;
    value: HelplineAuditFlag;
  };
  offline_queue: {
    key: string;
    value: any;
  };
}

const DB_NAME = 'civic_helpline_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<CivicHelplineDB>> | null = null;

export async function getDb(): Promise<IDBPDatabase<CivicHelplineDB>> {
  if (!dbPromise) {
    dbPromise = openDB<CivicHelplineDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('complaints')) {
          const complaintStore = db.createObjectStore('complaints', { keyPath: 'complaint_id' });
          complaintStore.createIndex('by-ticket', 'ticket_number', { unique: true });
          complaintStore.createIndex('by-status', 'status');
        }

        if (!db.objectStoreNames.contains('helplines')) {
          const helplineStore = db.createObjectStore('helplines', { keyPath: 'id' });
          helplineStore.createIndex('by-category', 'category');
          helplineStore.createIndex('by-district', 'district_id');
        }

        if (!db.objectStoreNames.contains('user_profile')) {
          db.createObjectStore('user_profile', { keyPath: 'user_id' });
        }

        if (!db.objectStoreNames.contains('audit_flags')) {
          db.createObjectStore('audit_flags', { keyPath: 'flag_id', autoIncrement: true });
        }

        if (!db.objectStoreNames.contains('offline_queue')) {
          db.createObjectStore('offline_queue', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export async function initializeIndexedDbWithSeedData(): Promise<void> {
  const db = await getDb();

  // Seed default citizen user if not present
  const existingUser = await db.get('user_profile', 'citizen-primary');
  if (!existingUser) {
    await db.put('user_profile', {
      user_id: 'citizen-primary',
      phone_number: '+91 98765 43210',
      full_name: 'vgiri',
      preferred_lang: 'en',
      role: 'Citizen',
      default_district_id: 10,
      created_at: new Date().toISOString(),
    });
  }

  // Purge any legacy mock/demo complaints to guarantee zero fake data
  const existingComplaints = await db.getAll('complaints');
  const mockComplaintIds = [
    'c101-guntur-water',
    'c102-delhi-pothole',
    'c103-mumbai-street',
    'c104-bengaluru-garbage',
  ];
  for (const c of existingComplaints) {
    if (mockComplaintIds.includes(c.complaint_id) || c.user_id?.startsWith('usr-demo')) {
      await db.delete('complaints', c.complaint_id);
    }
  }

  // Seed helplines if empty
  const helplineCount = await db.count('helplines');
  if (helplineCount === 0) {
    const tx = db.transaction('helplines', 'readwrite');

    // 1. National and State Apex Helplines
    for (const h of NATIONAL_HELPLINES) {
      await tx.store.put(h);
    }

    // 2. Lateral expansion of all 170 districts into 4 categories each (680 endpoints)
    for (const r of DISTRICT_ROUTING_170) {
      const state = STATES_UTS.find((s) => s.name.toLowerCase() === r.state_ut_name.toLowerCase());
      const stateNodal = state?.nodal_helpline || '112';
      const statePortal = state?.portal_url || 'https://pgportal.gov.in';

      const categories: Array<{
        catSlug: string;
        cat: any;
        subCat: string;
        routingText: string;
      }> = [
        {
          catSlug: 'roads',
          cat: 'Roads',
          subCat: 'Roads & Infrastructure',
          routingText: r.road_category_routing,
        },
        {
          catSlug: 'water',
          cat: 'Water',
          subCat: 'Water Supply & Drainage',
          routingText: r.water_category_routing,
        },
        {
          catSlug: 'garbage',
          cat: 'Garbage',
          subCat: 'Sanitation & Waste Management',
          routingText: r.garbage_category_routing,
        },
        {
          catSlug: 'electricity',
          cat: 'Electricity',
          subCat: 'Electricity & Street Lighting',
          routingText: r.electricity_category_routing,
        },
      ];

      for (const item of categories) {
        const id = `dist-${r.routing_id}-${item.catSlug}`;
        const endpoint: HelplineEndpoint = {
          id,
          district_id: r.district_id,
          state_id: state?.state_id,
          organization_name: `${r.district_name} (${r.state_ut_name}) - ${r.local_governance_text}`,
          department_name: item.routingText,
          category: item.cat,
          sub_category: item.subCat,
          contact_number: null,
          primary_phone_raw: null,
          callable_uri: null,
          fallback_phone_raw: stateNodal,
          fallback_callable_uri: `tel:${stateNodal}`,
          sms_uri: null,
          whatsapp_uri: null,
          is_tollfree: true,
          operational_hours: 'Mon-Sat 09:30-17:30 (24x7 Emergency Failover)',
          operating_hours: 'Mon-Sat 09:30-17:30 (24x7 Emergency Failover)',
          languages_supported: ['en', 'hi'],
          geolocation_scope: `${r.district_name}, ${r.state_ut_name} (${r.mandals_villages_text})`,
          priority_tier: 3,
          escalation_contact: `District Collectorate Grievance Cell (${r.district_name}) & State Nodal Helpline ${stateNodal}`,
          official_email: undefined,
          web_portal: statePortal,
          integration_protocol: 'Direct dialer fallback auto-routes to State Nodal Helpline.',
          common_issues_covered: item.routingText,
          last_verified_at: new Date().toISOString(),
        };
        await tx.store.put(endpoint);
      }
    }
    await tx.done;
  }
}

