import fs from 'fs';
import path from 'path';
import { STATES_UTS } from '../src/data/statesUts';
import { DISTRICT_ROUTING_170 } from '../src/data/districtRouting170';
import { NATIONAL_HELPLINES } from '../src/data/nationalHelplines';

function escapeSql(str: string | null | undefined): string {
  if (str === null || str === undefined) return 'NULL';
  return `'${String(str).replace(/'/g, "''")}'`;
}

const seedsDir = path.join(process.cwd(), 'database', 'seeds');
if (!fs.existsSync(seedsDir)) {
  fs.mkdirSync(seedsDir, { recursive: true });
}

// 1. Generate 01_states_uts.sql
let sqlStates = `-- Seed 01: States & Union Territories of India (36 Administrative Jurisdictions)\n`;
sqlStates += `INSERT INTO states_uts (state_id, name, code, type, portal_url, nodal_helpline)\nVALUES\n`;
const stateRows = STATES_UTS.map((s) => {
  return `  (${s.state_id}, ${escapeSql(s.name)}, ${escapeSql(s.code)}, ${escapeSql(s.type)}, ${escapeSql(s.portal_url)}, ${escapeSql(s.nodal_helpline)})`;
});
sqlStates += stateRows.join(',\n') + '\nON CONFLICT (name) DO UPDATE SET\n  code = EXCLUDED.code,\n  portal_url = EXCLUDED.portal_url,\n  nodal_helpline = EXCLUDED.nodal_helpline;\n';
fs.writeFileSync(path.join(seedsDir, '01_states_uts.sql'), sqlStates, 'utf-8');
console.log(`[Seeds] Generated 01_states_uts.sql (${STATES_UTS.length} states/UTs)`);

// 2. Generate 02_districts_170.sql
let sqlDistricts = `-- Seed 02: 170 Administrative Districts & Grievance Routing Matrices\n`;
sqlDistricts += `INSERT INTO districts_cities (district_id, state_id, name, headquarters, mandals_list, road_category_routing, water_category_routing, garbage_category_routing, electricity_category_routing)\nVALUES\n`;

const districtRows = DISTRICT_ROUTING_170.map((d) => {
  const stateMatch = STATES_UTS.find((s) => s.name.toLowerCase() === d.state_ut_name.toLowerCase()) || STATES_UTS[0];
  return `  (${d.district_id}, ${stateMatch.state_id}, ${escapeSql(d.district_name)}, ${escapeSql(d.district_name)}, ${escapeSql(d.mandals_villages_text)}, ${escapeSql(d.road_category_routing)}, ${escapeSql(d.water_category_routing)}, ${escapeSql(d.garbage_category_routing)}, ${escapeSql(d.electricity_category_routing)})`;
});
sqlDistricts += districtRows.join(',\n') + '\nON CONFLICT (district_id) DO NOTHING;\n';
fs.writeFileSync(path.join(seedsDir, '02_districts_170.sql'), sqlDistricts, 'utf-8');
console.log(`[Seeds] Generated 02_districts_170.sql (${DISTRICT_ROUTING_170.length} districts)`);

// 3. Generate 03_helplines.sql
let sqlHelplines = `-- Seed 03: Pan-India Universal & Departmental Helplines Directory\n`;
sqlHelplines += `INSERT INTO departments_helplines (id, organization_name, department_name, category, contact_number, primary_phone_raw, callable_uri, is_tollfree, operational_hours, geolocation_scope, priority_tier)\nVALUES\n`;

const helplineRows = NATIONAL_HELPLINES.map((h, idx) => {
  const id = `nat-${idx + 1}-${h.shortCode || h.tollFreeNumber || 'line'}`;
  const number = h.shortCode || h.tollFreeNumber || '112';
  const org = h.organizationName || h.departmentName;
  const dept = h.departmentName;
  const cat = h.category || 'General';
  const uri = `tel:${number.replace(/[^0-9]/g, '')}`;
  return `  (${escapeSql(id)}, ${escapeSql(org)}, ${escapeSql(dept)}, ${escapeSql(cat)}, ${escapeSql(number)}, ${escapeSql(number)}, ${escapeSql(uri)}, ${h.isTollFree ? 'TRUE' : 'FALSE'}, ${escapeSql(h.operationalHours || '24x7')}, 'Pan-India', ${h.priorityTier || 1})`;
});
sqlHelplines += helplineRows.join(',\n') + '\nON CONFLICT (id) DO NOTHING;\n';
fs.writeFileSync(path.join(seedsDir, '03_helplines.sql'), sqlHelplines, 'utf-8');
console.log(`[Seeds] Generated 03_helplines.sql (${NATIONAL_HELPLINES.length} national helplines)`);

// 4. Generate 04_officers.sql
let sqlOfficers = `-- Seed 04: PDF-Verified Departmental Officers & Whitelisted Field Operatives\n`;
sqlOfficers += `INSERT INTO users (user_id, phone_number, phone_number_sha256, phone_number_aes_enc, full_name, preferred_lang, role, default_district_id)\nVALUES\n`;

// Seed whitelisted test officers from 2026 directory
const verifiedOfficers = [
  { id: '11111111-1111-4111-8111-111111111111', phone: '9440818047', name: 'Executive Engineer - PWD Roads', role: 'Department Operator', districtId: 1 },
  { id: '22222222-2222-4222-8222-222222222222', phone: '9100120900', name: 'Superintending Engineer - PHED Water', role: 'Department Operator', districtId: 1 },
  { id: '33333333-3333-4333-8333-333333333333', phone: '9849903325', name: 'Municipal Commissioner - Sanitation', role: 'Department Operator', districtId: 1 },
  { id: '44444444-4444-4444-8444-444444444444', phone: '8500001912', name: 'Divisional Engineer - DISCOM Power', role: 'Department Operator', districtId: 1 },
  { id: '55555555-5555-4555-8555-555555555555', phone: '9441244749', name: 'Chief Engineer - Guntur PWD Roads', role: 'Department Operator', districtId: 6 },
  { id: '66666666-6666-4666-8666-666666666666', phone: '9100121400', name: 'Chief Engineer - Guntur PHED Water', role: 'Department Operator', districtId: 6 },
  { id: '77777777-7777-4777-8777-777777777777', phone: '9849906101', name: 'Superintendent - Guntur Sanitation', role: 'Department Operator', districtId: 6 },
  { id: '88888888-8888-4888-8888-888888888888', phone: '9440815049', name: 'Divisional Engineer - Guntur DISCOM', role: 'Department Operator', districtId: 6 },
];

const officerRows = verifiedOfficers.map((o) => {
  return `  (${escapeSql(o.id)}, ${escapeSql(o.phone)}, ${escapeSql(`sha256_${o.phone}`)}, ${escapeSql(`aes256_${o.phone}`)}, ${escapeSql(o.name)}, 'en', ${escapeSql(o.role)}, ${o.districtId})`;
});
sqlOfficers += officerRows.join(',\n') + '\nON CONFLICT (phone_number) DO NOTHING;\n';
fs.writeFileSync(path.join(seedsDir, '04_officers.sql'), sqlOfficers, 'utf-8');
console.log(`[Seeds] Generated 04_officers.sql (${verifiedOfficers.length} verified officers)`);

