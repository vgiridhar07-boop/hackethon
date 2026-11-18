/**
 * REGIONAL SERVER REGISTRY & DYNAMIC HELPLINE ROUTING ENGINE
 * 
 * Provides:
 * 1. Regional server mapping for Indian States and Districts
 * 2. Reverse geocode coordinate-to-district resolver
 * 3. Dynamic emergency helpline directory scoped to District, State, and National tiers
 */

export interface RegionalServerProfile {
  regionId: string;
  serverLabel: string;
  jurisdiction: string;
  state: string;
  district: string;
  districtId: number;
  stateId: number;
  apiCluster: string;
  timezone: string;
  status: 'online' | 'degraded';
  latencyMs: number;
}

export interface EmergencyHelplineItem {
  id: string;
  label: string;
  number: string;
  category:
    | 'Police'
    | 'Emergency'
    | 'Fire'
    | 'Medical'
    | 'Women'
    | 'Child'
    | 'Governance'
    | 'Civic'
    | 'Electricity'
    | 'Disaster';
  scope: 'district' | 'state' | 'national';
  description: string;
  callableUri: string;
}

// -----------------------------------------------------------------------------
// 1. REGIONAL SERVER REGISTRY
// -----------------------------------------------------------------------------

export const REGIONAL_SERVERS: Record<string, Omit<RegionalServerProfile, 'latencyMs'>> = {
  // Andhra Pradesh Districts
  'ap-guntur': {
    regionId: 'ap-guntur',
    serverLabel: 'Guntur Regional Server (AP)',
    jurisdiction: 'Guntur District Administration & GMC Command Cell',
    state: 'Andhra Pradesh',
    district: 'Guntur',
    districtId: 10,
    stateId: 1,
    apiCluster: 'cluster-ap-south.civic.gov.in',
    timezone: 'Asia/Kolkata',
    status: 'online',
  },
  'ap-vizag': {
    regionId: 'ap-vizag',
    serverLabel: 'Visakhapatnam Coastal Server (AP)',
    jurisdiction: 'Visakhapatnam Metropolitan & District Administration',
    state: 'Andhra Pradesh',
    district: 'Visakhapatnam',
    districtId: 25,
    stateId: 1,
    apiCluster: 'cluster-ap-coastal.civic.gov.in',
    timezone: 'Asia/Kolkata',
    status: 'online',
  },
  'ap-ntr': {
    regionId: 'ap-ntr',
    serverLabel: 'Amaravati / NTR Capital Server (AP)',
    jurisdiction: 'NTR District & Vijayawada Municipal Corporation (VMC)',
    state: 'Andhra Pradesh',
    district: 'NTR',
    districtId: 16,
    stateId: 1,
    apiCluster: 'cluster-ap-capital.civic.gov.in',
    timezone: 'Asia/Kolkata',
    status: 'online',
  },
  'ap-state': {
    regionId: 'ap-state',
    serverLabel: 'Andhra Pradesh State Gateway Server',
    jurisdiction: 'Government of Andhra Pradesh Central Nodal Cell',
    state: 'Andhra Pradesh',
    district: 'Statewide',
    districtId: 1,
    stateId: 1,
    apiCluster: 'gateway-ap.civic.gov.in',
    timezone: 'Asia/Kolkata',
    status: 'online',
  },

  // Telangana
  'tg-hyd': {
    regionId: 'tg-hyd',
    serverLabel: 'Hyderabad Metro Server (TG)',
    jurisdiction: 'Greater Hyderabad Municipal Corporation (GHMC) Cell',
    state: 'Telangana',
    district: 'Hyderabad',
    districtId: 149,
    stateId: 30,
    apiCluster: 'cluster-tg-metro.civic.gov.in',
    timezone: 'Asia/Kolkata',
    status: 'online',
  },

  // Karnataka
  'ka-blr': {
    regionId: 'ka-blr',
    serverLabel: 'Bengaluru Tech Hub Server (KA)',
    jurisdiction: 'Bruhat Bengaluru Mahanagara Palike (BBMP) Operations',
    state: 'Karnataka',
    district: 'Bengaluru Urban',
    districtId: 116,
    stateId: 12,
    apiCluster: 'cluster-ka-south.civic.gov.in',
    timezone: 'Asia/Kolkata',
    status: 'online',
  },

  // Tamil Nadu
  'tn-chn': {
    regionId: 'tn-chn',
    serverLabel: 'Chennai Regional Server (TN)',
    jurisdiction: 'Greater Chennai Corporation (GCC) Central Operations',
    state: 'Tamil Nadu',
    district: 'Chennai',
    districtId: 147,
    stateId: 29,
    apiCluster: 'cluster-tn-metro.civic.gov.in',
    timezone: 'Asia/Kolkata',
    status: 'online',
  },

  // Maharashtra
  'mh-mum': {
    regionId: 'mh-mum',
    serverLabel: 'Mumbai Western Command Server (MH)',
    jurisdiction: 'Brihanmumbai Municipal Corporation (BMC) Disaster Cell',
    state: 'Maharashtra',
    district: 'Mumbai City',
    districtId: 126,
    stateId: 14,
    apiCluster: 'cluster-mh-west.civic.gov.in',
    timezone: 'Asia/Kolkata',
    status: 'online',
  },
  'mh-pune': {
    regionId: 'mh-pune',
    serverLabel: 'Pune Metropolitan Server (MH)',
    jurisdiction: 'Pune Municipal Corporation (PMC) Redressal Cell',
    state: 'Maharashtra',
    district: 'Pune',
    districtId: 128,
    stateId: 14,
    apiCluster: 'cluster-mh-central.civic.gov.in',
    timezone: 'Asia/Kolkata',
    status: 'online',
  },

  // Delhi NCT
  'dl-del': {
    regionId: 'dl-del',
    serverLabel: 'Delhi NCT Central Command Server (DL)',
    jurisdiction: 'Municipal Corporation of Delhi (MCD) Unified Command',
    state: 'NCT of Delhi',
    district: 'Central Delhi',
    districtId: 164,
    stateId: 32,
    apiCluster: 'cluster-dl-central.civic.gov.in',
    timezone: 'Asia/Kolkata',
    status: 'online',
  },

  // National Fallback
  'in-national': {
    regionId: 'in-national',
    serverLabel: 'India Sovereign National Gateway',
    jurisdiction: 'National Informatics Centre (NIC) Sovereign Node',
    state: 'National',
    district: 'Pan-India',
    districtId: 0,
    stateId: 0,
    apiCluster: 'gateway-india.civic.gov.in',
    timezone: 'Asia/Kolkata',
    status: 'online',
  },
};

// -----------------------------------------------------------------------------
// 2. PAN-INDIA NATIONAL FALLBACK HELPLINES
// -----------------------------------------------------------------------------

export const NATIONAL_BASE_HELPLINES: EmergencyHelplineItem[] = [
  {
    id: 'nat-erss-112',
    label: 'Single Emergency Response (ERSS)',
    number: '112',
    category: 'Emergency',
    scope: 'national',
    description: 'All-in-one national emergency response for Police, Fire, and Medical assistance',
    callableUri: 'tel:112',
  },
  {
    id: 'nat-police-100',
    label: 'Police Control Room',
    number: '100',
    category: 'Police',
    scope: 'national',
    description: 'Immediate Police Assistance and Patrol dispatch nationwide',
    callableUri: 'tel:100',
  },
  {
    id: 'nat-fire-101',
    label: 'Fire & Rescue Services',
    number: '101',
    category: 'Fire',
    scope: 'national',
    description: 'Emergency fire fighting, structural rescue, and hazard mitigation',
    callableUri: 'tel:101',
  },
  {
    id: 'nat-ambulance-108',
    label: 'National Ambulance Network',
    number: '108',
    category: 'Medical',
    scope: 'national',
    description: '24x7 emergency medical trauma ambulance and emergency patient transport',
    callableUri: 'tel:108',
  },
  {
    id: 'nat-women-181',
    label: 'National Women Helpline',
    number: '181',
    category: 'Women',
    scope: 'national',
    description: 'Emergency rescue, legal counseling, and support for women in distress',
    callableUri: 'tel:181',
  },
  {
    id: 'nat-child-1098',
    label: 'Childline Rescue Network',
    number: '1098',
    category: 'Child',
    scope: 'national',
    description: 'Toll-free 24-hour emergency phone outreach service for children in need',
    callableUri: 'tel:1098',
  },
  {
    id: 'nat-cyber-1930',
    label: 'Cyber Crime Reporting Desk',
    number: '1930',
    category: 'Police',
    scope: 'national',
    description: 'National cyber financial fraud and digital crime reporting helpline',
    callableUri: 'tel:1930',
  },
];

// -----------------------------------------------------------------------------
// 3. DISTRICT & STATE SPECIFIC HELPLINE MAPPINGS
// -----------------------------------------------------------------------------

export const REGIONAL_HELPLINE_DATABASE: Record<string, EmergencyHelplineItem[]> = {
  // Guntur District, Andhra Pradesh (Verified Complete Profile)
  'Andhra Pradesh:Guntur': [
    {
      id: 'gnt-police-100',
      label: 'Police Control Room (Guntur)',
      number: '100',
      category: 'Police',
      scope: 'district',
      description: 'Guntur District Police Control Room & PCR vehicle emergency dispatch',
      callableUri: 'tel:100',
    },
    {
      id: 'gnt-erss-112',
      label: 'Emergency ERSS Dispatch',
      number: '112',
      category: 'Emergency',
      scope: 'national',
      description: 'Unified Emergency Response Support System (Police, Fire, Medical)',
      callableUri: 'tel:112',
    },
    {
      id: 'gnt-fire-101',
      label: 'Fire & Emergency Services',
      number: '101',
      category: 'Fire',
      scope: 'national',
      description: 'Guntur Fire Station & Disaster Management Brigade',
      callableUri: 'tel:101',
    },
    {
      id: 'gnt-ambulance-108',
      label: 'Emergency Medical Ambulance',
      number: '108',
      category: 'Medical',
      scope: 'state',
      description: 'Andhra Pradesh 108 Emergency Medical Trauma Ambulance',
      callableUri: 'tel:108',
    },
    {
      id: 'gnt-state-call-centre-1902',
      label: 'AP State Call Centre (Spandana)',
      number: '1902',
      category: 'Governance',
      scope: 'state',
      description: 'Government of Andhra Pradesh Public Grievance Redressal (Spandana)',
      callableUri: 'tel:1902',
    },
    {
      id: 'gnt-citizens-call-center-155300',
      label: "Citizen's Call Center (GMC)",
      number: '155300',
      category: 'Civic',
      scope: 'district',
      description: 'Guntur Municipal Corporation (GMC) Citizen Grievance & Ward Call Centre',
      callableUri: 'tel:155300',
    },
    {
      id: 'gnt-women-1091',
      label: 'Women Police Helpline',
      number: '1091',
      category: 'Women',
      scope: 'state',
      description: 'Andhra Pradesh Police 24/7 dedicated helpline for women in distress',
      callableUri: 'tel:1091',
    },
    {
      id: 'gnt-child-1098',
      label: 'Childline Emergency Rescue',
      number: '1098',
      category: 'Child',
      scope: 'national',
      description: 'Guntur District Childline protection and rescue helpline',
      callableUri: 'tel:1098',
    },
    {
      id: 'gnt-crime-stopper-1090',
      label: 'Crime Stopper Tip Line',
      number: '1090',
      category: 'Police',
      scope: 'state',
      description: 'AP Police confidential intelligence and crime tip reporting desk',
      callableUri: 'tel:1090',
    },
    {
      id: 'gnt-electricity-control-1912',
      label: 'Electricity Control Room (CPDCL Guntur)',
      number: '1912',
      category: 'Electricity',
      scope: 'district',
      description: 'CPDCL Guntur Central Control Room: 1912 / Direct: 9440817526',
      callableUri: 'tel:1912',
    },
    {
      id: 'gnt-police-station-local',
      label: 'Pattabhipuram Police Station (Guntur Urban)',
      number: '0863-2231866',
      category: 'Police',
      scope: 'district',
      description: 'Local Jurisdiction Station Contact, Pattabhipuram PS, Guntur City',
      callableUri: 'tel:08632231866',
    },
  ],

  // Andhra Pradesh: Vijayawada / NTR District
  'Andhra Pradesh:NTR': [
    {
      id: 'ntr-police-100',
      label: 'Vijayawada City Police Control',
      number: '100',
      category: 'Police',
      scope: 'district',
      description: 'Vijayawada City Police Commissionerate Control Room: 0866-2576956 / 100',
      callableUri: 'tel:100',
    },
    {
      id: 'ntr-vmc-civic-103',
      label: 'VMC Civic Grievance Helpline',
      number: '0866-2422400',
      category: 'Civic',
      scope: 'district',
      description: 'Vijayawada Municipal Corporation Control Desk',
      callableUri: 'tel:08662422400',
    },
    {
      id: 'ntr-disha-181',
      label: 'AP Disha Women Emergency Helpline',
      number: '181',
      category: 'Women',
      scope: 'state',
      description: 'AP Police Disha SOS rapid response cell',
      callableUri: 'tel:181',
    },
    {
      id: 'ntr-corruption-14400',
      label: 'Anti-Corruption Bureau (ACB AP)',
      number: '14400',
      category: 'Governance',
      scope: 'state',
      description: 'AP Vigilance and Anti-Corruption Bureau 14400 toll-free',
      callableUri: 'tel:14400',
    },
    {
      id: 'ntr-spandana-1902',
      label: 'State Citizen Call Centre (Spandana)',
      number: '1902',
      category: 'Governance',
      scope: 'state',
      description: 'AP Public Grievances Resolution Centre',
      callableUri: 'tel:1902',
    },
  ],

  // Andhra Pradesh: Visakhapatnam
  'Andhra Pradesh:Visakhapatnam': [
    {
      id: 'vzg-police-100',
      label: 'Vizag City Police Control Room',
      number: '100',
      category: 'Police',
      scope: 'district',
      description: 'Visakhapatnam Police Control Desk: 0891-2565454 / 100',
      callableUri: 'tel:100',
    },
    {
      id: 'vzg-gvmc-1800',
      label: 'GVMC Toll-Free Civic Call Centre',
      number: '1800-425-00009',
      category: 'Civic',
      scope: 'district',
      description: 'Greater Visakhapatnam Municipal Corporation Helpline',
      callableUri: 'tel:180042500009',
    },
    {
      id: 'vzg-coastal-disaster',
      label: 'Coastal Disaster Warning Desk',
      number: '1077',
      category: 'Disaster',
      scope: 'district',
      description: 'District Collectorate Emergency Operations Centre (DEOC Vizag)',
      callableUri: 'tel:1077',
    },
  ],

  // Telangana: Hyderabad
  'Telangana:Hyderabad': [
    {
      id: 'hyd-police-100',
      label: 'Hyderabad City Police Command & Control',
      number: '100',
      category: 'Police',
      scope: 'district',
      description: 'Hyderabad Integrated Command and Control Centre (ICCC)',
      callableUri: 'tel:100',
    },
    {
      id: 'hyd-ghmc-civic',
      label: 'GHMC Citizen Grievance Helpline',
      number: '040-21111111',
      category: 'Civic',
      scope: 'district',
      description: 'Greater Hyderabad Municipal Corporation Central Desk',
      callableUri: 'tel:04021111111',
    },
    {
      id: 'hyd-power-1912',
      label: 'TSSPDCL Electricity Disruption Desk',
      number: '1912',
      category: 'Electricity',
      scope: 'state',
      description: 'Telangana Southern Power Distribution Company Ltd',
      callableUri: 'tel:1912',
    },
    {
      id: 'hyd-she-teams',
      label: 'SHE Teams Women Safety Desk',
      number: '9441669988',
      category: 'Women',
      scope: 'state',
      description: 'Telangana Police SHE Teams Mobile Support',
      callableUri: 'tel:9441669988',
    },
  ],

  // Karnataka: Bengaluru Urban
  'Karnataka:Bengaluru Urban': [
    {
      id: 'blr-police-100',
      label: 'Bengaluru City Police Command',
      number: '100',
      category: 'Police',
      scope: 'district',
      description: 'Namma 112 / 100 Bengaluru City Police Command Center',
      callableUri: 'tel:100',
    },
    {
      id: 'blr-bbmp-sahaya',
      label: 'BBMP Sahaya Civic Grievance',
      number: '080-22660000',
      category: 'Civic',
      scope: 'district',
      description: 'Bruhat Bengaluru Mahanagara Palike Control Desk',
      callableUri: 'tel:08022660000',
    },
    {
      id: 'blr-bescom-1912',
      label: 'BESCOM Power Breakdown Helpline',
      number: '1912',
      category: 'Electricity',
      scope: 'district',
      description: 'Bangalore Electricity Supply Company Central Cell',
      callableUri: 'tel:1912',
    },
    {
      id: 'blr-bwssb-water',
      label: 'BWSSB Water & Drainage Emergency',
      number: '1916',
      category: 'Civic',
      scope: 'district',
      description: 'Bangalore Water Supply and Sewerage Board Desk',
      callableUri: 'tel:1916',
    },
  ],

  // Tamil Nadu: Chennai
  'Tamil Nadu:Chennai': [
    {
      id: 'chn-police-100',
      label: 'Greater Chennai Police Control',
      number: '100',
      category: 'Police',
      scope: 'district',
      description: 'Chennai City Police Emergency Control Room',
      callableUri: 'tel:100',
    },
    {
      id: 'chn-gcc-1913',
      label: 'Greater Chennai Corporation (GCC)',
      number: '1913',
      category: 'Civic',
      scope: 'district',
      description: 'GCC Central Civic Complaints and Flood Mitigation Helpline',
      callableUri: 'tel:1913',
    },
    {
      id: 'chn-tangedco-power',
      label: 'TANGEDCO Electricity Grievance Minnagam',
      number: '9498794987',
      category: 'Electricity',
      scope: 'state',
      description: 'Tamil Nadu Power Minnagam Central Complaint Center',
      callableUri: 'tel:9498794987',
    },
  ],

  // Maharashtra: Mumbai City
  'Maharashtra:Mumbai City': [
    {
      id: 'mum-police-100',
      label: 'Mumbai Police Main Control Room',
      number: '100',
      category: 'Police',
      scope: 'district',
      description: 'Mumbai Police HQ Central Command: 022-22620111 / 100',
      callableUri: 'tel:100',
    },
    {
      id: 'mum-bmc-disaster-1916',
      label: 'BMC Disaster Management Control Room',
      number: '1916',
      category: 'Civic',
      scope: 'district',
      description: 'Brihanmumbai Municipal Corporation 24x7 Emergency Cell',
      callableUri: 'tel:1916',
    },
    {
      id: 'mum-traffic-8454999999',
      label: 'Mumbai Traffic Police WhatsApp Helpline',
      number: '8454999999',
      category: 'Police',
      scope: 'district',
      description: 'Traffic congestion, breakdowns, and signal disruption reports',
      callableUri: 'tel:8454999999',
    },
  ],

  // NCT of Delhi: Central Delhi
  'NCT of Delhi:Central Delhi': [
    {
      id: 'del-police-100',
      label: 'Delhi Police Central Command',
      number: '100',
      category: 'Police',
      scope: 'district',
      description: 'Delhi Police PCR Integrated Emergency Response',
      callableUri: 'tel:100',
    },
    {
      id: 'del-mcd-civic-155304',
      label: 'MCD Central Civic Helpline',
      number: '155304',
      category: 'Civic',
      scope: 'district',
      description: 'Municipal Corporation of Delhi Toll-Free Grievance Desk',
      callableUri: 'tel:155304',
    },
    {
      id: 'del-delhi-jal-board',
      label: 'Delhi Jal Board (DJB) Water Emergency',
      number: '1916',
      category: 'Civic',
      scope: 'state',
      description: 'DJB Central Water Tanker and Pipeline Burst Helpline',
      callableUri: 'tel:1916',
    },
    {
      id: 'del-dcw-181',
      label: 'Delhi Commission for Women (DCW)',
      number: '181',
      category: 'Women',
      scope: 'state',
      description: 'DCW 24-hour Crisis Intervention Women Helpline',
      callableUri: 'tel:181',
    },
  ],
};

// -----------------------------------------------------------------------------
// 4. REGION ROUTER ENGINE CLASS
// -----------------------------------------------------------------------------

export class RegionRouterEngine {
  private static instance: RegionRouterEngine;

  private constructor() {}

  public static getInstance(): RegionRouterEngine {
    if (!RegionRouterEngine.instance) {
      RegionRouterEngine.instance = new RegionRouterEngine();
    }
    return RegionRouterEngine.instance;
  }

  /**
   * Resolves appropriate regional server profile for given state and district
   */
  public resolveRegionalServer(state: string, district: string): RegionalServerProfile {
    const normState = (state || '').trim();
    const normDist = (district || '').trim();

    // 1. Direct district match
    if (/andhra/i.test(normState)) {
      if (/guntur/i.test(normDist)) {
        return { ...REGIONAL_SERVERS['ap-guntur'], latencyMs: 14 };
      }
      if (/visakhapatnam|vizag/i.test(normDist)) {
        return { ...REGIONAL_SERVERS['ap-vizag'], latencyMs: 18 };
      }
      if (/ntr|vijayawada|krishna/i.test(normDist)) {
        return { ...REGIONAL_SERVERS['ap-ntr'], latencyMs: 16 };
      }
      return {
        ...REGIONAL_SERVERS['ap-state'],
        district: normDist || 'Andhra Pradesh',
        latencyMs: 22,
      };
    }

    if (/telangana/i.test(normState)) {
      if (/hyderabad/i.test(normDist) || !normDist) {
        return { ...REGIONAL_SERVERS['tg-hyd'], latencyMs: 19 };
      }
    }

    if (/karnataka/i.test(normState)) {
      if (/bengaluru|bangalore/i.test(normDist) || !normDist) {
        return { ...REGIONAL_SERVERS['ka-blr'], latencyMs: 24 };
      }
    }

    if (/tamil\s*nadu/i.test(normState)) {
      if (/chennai/i.test(normDist) || !normDist) {
        return { ...REGIONAL_SERVERS['tn-chn'], latencyMs: 21 };
      }
    }

    if (/maharashtra/i.test(normState)) {
      if (/pune/i.test(normDist)) {
        return { ...REGIONAL_SERVERS['mh-pune'], latencyMs: 23 };
      }
      if (/mumbai/i.test(normDist) || !normDist) {
        return { ...REGIONAL_SERVERS['mh-mum'], latencyMs: 20 };
      }
    }

    if (/delhi/i.test(normState)) {
      return { ...REGIONAL_SERVERS['dl-del'], latencyMs: 15 };
    }

    // Default National Gateway
    return {
      ...REGIONAL_SERVERS['in-national'],
      state: normState || 'National',
      district: normDist || 'Pan-India',
      latencyMs: 28,
    };
  }

  /**
   * Returns merged, prioritized emergency helplines for a district & state
   */
  public getHelplinesForRegion(state: string, district: string): EmergencyHelplineItem[] {
    const key = `${state}:${district}`;
    const specificList = REGIONAL_HELPLINE_DATABASE[key];

    if (specificList && specificList.length > 0) {
      // Merge with national fallbacks for any categories missing in local overrides
      const localIds = new Set(specificList.map((h) => h.id));
      const supplementaryNational = NATIONAL_BASE_HELPLINES.filter(
        (n) => !localIds.has(n.id) && !specificList.some((s) => s.number === n.number)
      );

      return [...specificList, ...supplementaryNational];
    }

    // If district not specifically profiled, check state fallback
    const statePrefix = `${state}:`;
    const anyStateKey = Object.keys(REGIONAL_HELPLINE_DATABASE).find((k) => k.startsWith(statePrefix));
    if (anyStateKey) {
      const stateList = REGIONAL_HELPLINE_DATABASE[anyStateKey].filter((h) => h.scope === 'state');
      const localIds = new Set(stateList.map((h) => h.id));
      const supplementaryNational = NATIONAL_BASE_HELPLINES.filter(
        (n) => !localIds.has(n.id) && !stateList.some((s) => s.number === n.number)
      );
      return [...stateList, ...supplementaryNational];
    }

    // National default helplines
    return [...NATIONAL_BASE_HELPLINES];
  }

  /**
   * Returns the primary Police contact number for this region (defaults to 100)
   */
  public getPoliceNumber(state: string, district: string): {
    number: string;
    label: string;
    localPsContact?: string;
  } {
    const helplines = this.getHelplinesForRegion(state, district);
    const policeRow = helplines.find((h) => h.category === 'Police' && h.scope === 'district') ||
      helplines.find((h) => h.category === 'Police') || { number: '100', label: 'Police Control Room' };

    const localStation = helplines.find(
      (h) => h.category === 'Police' && h.id.includes('police-station')
    );

    return {
      number: policeRow.number || '100',
      label: policeRow.label || 'Police Control Room (100)',
      localPsContact: localStation ? `${localStation.label}: ${localStation.number}` : undefined,
    };
  }
}

export const regionRouterEngine = RegionRouterEngine.getInstance();
