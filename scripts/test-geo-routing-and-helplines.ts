/**
 * TEST SUITE: GEO-ROUTING, FIRST-PAGE LOCATION RESOLUTION & DYNAMIC HELPLINES
 * 
 * Verifies:
 * 1. Location Coordinate Resolution (POST /api/location/resolve)
 * 2. Guntur Regional Server Binding & Verified Helplines (100, 101, 108, 1902, 155300, 1912, 0863-2231866)
 * 3. Multi-Region Switching (Karnataka -> Bengaluru, Telangana -> Hyderabad, Delhi -> Central Delhi)
 * 4. Regional Header Propagation (X-Region-Id, X-Region-State, X-Region-District)
 * 5. Dynamic Helpline Scope Categorization (District, State, National)
 * 6. Police Contact Resolution & Call Police (100) Configuration
 * 7. Manual State/District Fallback Connection (POST /api/region/connect)
 */

import { regionRouterEngine } from '../src/services/regionRouter';

const BASE_URL = 'http://localhost:3001';
const FRONTEND_URL = 'http://localhost:5173';

async function runGeoRoutingTestSuite() {
  console.log('[TEST SUITE] Starting Geo-Routing, Regional Server & Dynamic Helplines Verification...');
  let testsPassed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`[PASS] ${msg}`);
      testsPassed++;
    } else {
      console.error(`[FAIL] ${msg}`);
      throw new Error(`Assertion failed: ${msg}`);
    }
  }

  // -------------------------------------------------------------------------
  // 1. FRONTEND ROUTE ACCESSIBILITY & FIRST PAGE
  // -------------------------------------------------------------------------
  console.log('\n--- 1. Testing First Page & Auth Routes Accessibility ---');
  const loginRes = await fetch(`${FRONTEND_URL}/login`);
  assert(loginRes.status === 200, 'First Page / Role Selection Gateway returned HTTP 200');

  const citLoginRes = await fetch(`${FRONTEND_URL}/login/citizen`);
  assert(citLoginRes.status === 200, 'Citizen Portal Login returned HTTP 200');

  const offLoginRes = await fetch(`${FRONTEND_URL}/login/officer`);
  assert(offLoginRes.status === 200, 'Officer Portal Login returned HTTP 200');

  // -------------------------------------------------------------------------
  // 2. COORDINATE REVERSE GEOCODING & GUNTUR SERVER BINDING
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Testing Coordinate Resolution & Guntur Regional Server Binding ---');

  const gunturCoords = { lat: 16.3067, lng: 80.4365 };
  const resolveRes = await fetch(`${BASE_URL}/api/location/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(gunturCoords),
  });

  assert(resolveRes.status === 200, 'POST /api/location/resolve returned HTTP 200');
  const resolveData = await resolveRes.json();

  assert(resolveData.status === 'success', 'Resolution status reported success');
  assert(resolveData.resolved.state === 'Andhra Pradesh', 'Resolved state is Andhra Pradesh');
  assert(resolveData.resolved.district === 'Guntur', 'Resolved district is Guntur');
  assert(resolveData.resolved.districtId === 10, 'Resolved districtId is 10 (Guntur)');

  // Regional Server Binding check
  const region = resolveData.regionContext;
  assert(region.regionId === 'ap-guntur', 'Bound to regionId ap-guntur');
  assert(region.serverLabel === 'Guntur Regional Server (AP)', 'Server label matches Guntur Regional Server (AP)');
  assert(
    region.jurisdiction.includes('Guntur District Administration'),
    'Jurisdiction bound to Guntur District Administration'
  );
  assert(region.status === 'online', 'Regional server status is online');

  // -------------------------------------------------------------------------
  // 3. GUNTUR DYNAMIC EMERGENCY HELPLINES VERIFICATION
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Testing Guntur Specific Emergency Helplines ---');

  const gunturHelplinesRes = await fetch(
    `${BASE_URL}/api/helplines?state=Andhra%20Pradesh&district=Guntur`
  );
  assert(gunturHelplinesRes.status === 200, 'GET /api/helplines returned HTTP 200 for Guntur AP');
  const gunturHelplinesData = await gunturHelplinesRes.json();
  const gunturList = gunturHelplinesData.helplines;

  assert(Array.isArray(gunturList) && gunturList.length >= 10, 'Returned 10+ categorized emergency helplines');

  // Police 100
  const police100 = gunturList.find((h: any) => h.number === '100');
  assert(Boolean(police100), 'Police helpline 100 exists');
  assert(police100.category === 'Police', 'Police helpline category is Police');

  // ERSS 112
  const erss112 = gunturList.find((h: any) => h.number === '112');
  assert(Boolean(erss112), 'Emergency ERSS 112 exists');
  assert(erss112.scope === 'national', 'ERSS 112 scope is national');

  // Fire 101
  const fire101 = gunturList.find((h: any) => h.number === '101');
  assert(Boolean(fire101), 'Fire emergency 101 exists');

  // Ambulance 108
  const amb108 = gunturList.find((h: any) => h.number === '108');
  assert(Boolean(amb108), 'Ambulance 108 exists');
  assert(amb108.scope === 'state', 'Ambulance 108 scope is state');

  // State Call Centre (Spandana) 1902
  const spandana1902 = gunturList.find((h: any) => h.number === '1902');
  assert(Boolean(spandana1902), 'State Call Centre 1902 exists');
  assert(spandana1902.scope === 'state', 'Spandana 1902 scope is state');

  // Citizen Call Centre (GMC) 155300
  const gmc155300 = gunturList.find((h: any) => h.number === '155300');
  assert(Boolean(gmc155300), "Citizen's Call Center 155300 exists");
  assert(gmc155300.scope === 'district', 'GMC 155300 scope is district');

  // Women Helpline 1091
  const women1091 = gunturList.find((h: any) => h.number === '1091');
  assert(Boolean(women1091), 'Women Police Helpline 1091 exists');

  // Child Helpline 1098
  const child1098 = gunturList.find((h: any) => h.number === '1098');
  assert(Boolean(child1098), 'Childline 1098 exists');

  // Crime Stopper 1090
  const crime1090 = gunturList.find((h: any) => h.number === '1090');
  assert(Boolean(crime1090), 'Crime Stopper 1090 exists');

  // Electricity Control Room 1912 / CPDCL Guntur
  const elec1912 = gunturList.find((h: any) => h.number === '1912');
  assert(Boolean(elec1912), 'Electricity Control Room 1912 exists');
  assert(elec1912.scope === 'district', 'Electricity control room scope is district');
  assert(elec1912.description.includes('9440817526'), 'Electricity description includes direct number 9440817526');

  // Local Police Station (Pattabhipuram PS)
  const pattabhipuram = gunturList.find((h: any) => h.number.includes('0863-2231866'));
  assert(Boolean(pattabhipuram), 'Local Pattabhipuram Police Station (0863-2231866) exists');
  assert(pattabhipuram.scope === 'district', 'Pattabhipuram Police Station scope is district');

  // Primary Police Dialing Config
  assert(gunturHelplinesData.policePrimary.number === '100', 'Primary Police number is 100');
  assert(
    gunturHelplinesData.policePrimary.localPsContact?.includes('0863-2231866'),
    'Local Police Station contact attached to policePrimary'
  );

  // -------------------------------------------------------------------------
  // 4. REGION SWITCHING & MULTI-STATE JURISDICTIONS
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Testing Multi-Region Switching & Dynamic Numbers ---');

  // Test 4.1: Karnataka -> Bengaluru Urban
  const blrConnectRes = await fetch(`${BASE_URL}/api/region/connect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state: 'Karnataka', district: 'Bengaluru Urban' }),
  });
  assert(blrConnectRes.status === 200, 'POST /api/region/connect for Bengaluru returned HTTP 200');
  const blrConnectData = await blrConnectRes.json();
  assert(blrConnectData.regionContext.regionId === 'ka-blr', 'Bengaluru regionId is ka-blr');
  assert(
    blrConnectData.regionContext.serverLabel.includes('Bengaluru'),
    'Server label references Bengaluru'
  );

  const blrHelplinesRes = await fetch(
    `${BASE_URL}/api/helplines?state=Karnataka&district=Bengaluru%20Urban`
  );
  const blrHelplinesData = await blrHelplinesRes.json();
  const bbmpHelpline = blrHelplinesData.helplines.find((h: any) => h.number === '080-22660000');
  assert(Boolean(bbmpHelpline), 'BBMP Control Room (080-22660000) returned for Bengaluru');

  // Test 4.2: Telangana -> Hyderabad
  const hydConnectRes = await fetch(`${BASE_URL}/api/region/connect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state: 'Telangana', district: 'Hyderabad' }),
  });
  const hydConnectData = await hydConnectRes.json();
  assert(hydConnectData.regionContext.regionId === 'tg-hyd', 'Hyderabad regionId is tg-hyd');

  const hydHelplinesRes = await fetch(
    `${BASE_URL}/api/helplines?state=Telangana&district=Hyderabad`
  );
  const hydHelplinesData = await hydHelplinesRes.json();
  const ghmcHelpline = hydHelplinesData.helplines.find((h: any) => h.number === '040-21111111');
  assert(Boolean(ghmcHelpline), 'GHMC Grievance Helpline (040-21111111) returned for Hyderabad');

  // Test 4.3: Maharashtra -> Mumbai
  const mumConnectRes = await fetch(`${BASE_URL}/api/region/connect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state: 'Maharashtra', district: 'Mumbai City' }),
  });
  const mumConnectData = await mumConnectRes.json();
  assert(mumConnectData.regionContext.regionId === 'mh-mum', 'Mumbai regionId is mh-mum');

  const mumHelplinesRes = await fetch(
    `${BASE_URL}/api/helplines?state=Maharashtra&district=Mumbai%20City`
  );
  const mumHelplinesData = await mumHelplinesRes.json();
  const bmcHelpline = mumHelplinesData.helplines.find((h: any) => h.number === '1916');
  assert(Boolean(bmcHelpline), 'BMC Disaster Helpline (1916) returned for Mumbai');

  // Test 4.4: NCT of Delhi -> Central Delhi
  const delConnectRes = await fetch(`${BASE_URL}/api/region/connect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state: 'NCT of Delhi', district: 'Central Delhi' }),
  });
  const delConnectData = await delConnectRes.json();
  assert(delConnectData.regionContext.regionId === 'dl-del', 'Delhi regionId is dl-del');

  // -------------------------------------------------------------------------
  // 5. REGIONAL HEADER ECHO & PROPAGATION
  // -------------------------------------------------------------------------
  console.log('\n--- 5. Testing Regional Header Propagation ---');

  const headerTestRes = await fetch(`${BASE_URL}/api/v1/auth/citizen/send-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Region-Id': 'ap-guntur',
      'X-Region-State': 'Andhra Pradesh',
      'X-Region-District': 'Guntur',
    },
    body: JSON.stringify({ phoneNumber: '9876599999' }),
  });

  const connectedHeader = headerTestRes.headers.get('x-region-connected');
  assert(connectedHeader === 'ap-guntur', 'Response echoed X-Region-Connected: ap-guntur');

  // -------------------------------------------------------------------------
  // 6. CALL POLICE (100) BUTTON & FALLBACK CONFIGURATION
  // -------------------------------------------------------------------------
  console.log('\n--- 6. Testing Police Call & ERSS Configuration ---');

  const policeCfg = regionRouterEngine.getPoliceNumber('Andhra Pradesh', 'Guntur');
  assert(policeCfg.number === '100', 'Guntur Police configuration resolves to 100');
  assert(
    policeCfg.localPsContact?.includes('0863-2231866') === true,
    'Local Police Station contact attached'
  );

  const nationalPoliceCfg = regionRouterEngine.getPoliceNumber('State', 'District');
  assert(nationalPoliceCfg.number === '100', 'Fallback police number is 100');

  console.log(`\n======================================================`);
  console.log(`ALL TESTS PASSED! (${testsPassed} assertions verified, 0 failures)`);
  console.log(`======================================================\n`);
}

runGeoRoutingTestSuite().catch((err) => {
  console.error('[TEST SUITE FATAL ERROR]:', err);
  process.exit(1);
});
