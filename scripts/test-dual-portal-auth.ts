/**
 * TEST SUITE: ROLE-SELECTION GATEWAY & DUAL-PORTAL AUTHENTICATION SYSTEM
 * Verifies role routing, citizen login, officer login, strict portal separation,
 * and session state integrity.
 */

const BASE_URL = 'http://localhost:3001';
const FRONTEND_URL = 'http://localhost:5173';

async function runDualPortalAuthTests() {
  console.log('[TEST SUITE] Starting Role-Selection Gateway & Dual-Portal Authentication verification...');
  let testsPassed = 0;
  let testsFailed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`[PASS] ${msg}`);
      testsPassed++;
    } else {
      console.error(`[FAIL] ${msg}`);
      testsFailed++;
      throw new Error(`Assertion failed: ${msg}`);
    }
  }

  // -------------------------------------------------------------------------
  // 1. ROUTING ACCESSIBILITY (Frontend Gateway & Dual Logins)
  // -------------------------------------------------------------------------
  console.log('\n--- 1. Testing Route Accessibility ---');

  const routes = [
    '/login',
    '/login/citizen',
    '/login/officer',
    '/citizen/dashboard',
    '/officer/dashboard',
  ];

  for (const route of routes) {
    const res = await fetch(`${FRONTEND_URL}${route}`);
    assert(res.status === 200, `Frontend route ${route} returned HTTP 200`);
  }

  // -------------------------------------------------------------------------
  // 2. CITIZEN LOGIN & OTP VERIFICATION (/login/citizen)
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Testing Citizen Login & OTP Verification ---');

  // Test 2.1: Invalid mobile number rejected
  const invalidCitRes = await fetch(`${BASE_URL}/api/v1/auth/citizen/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber: '123', otpCode: '123456' }),
  });
  assert(invalidCitRes.status === 400, 'Invalid phone number rejected with HTTP 400');

  // Test 2.2: Invalid OTP length rejected
  const invalidOtpRes = await fetch(`${BASE_URL}/api/v1/auth/citizen/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber: '9876543210', otpCode: '12' }),
  });
  assert(invalidOtpRes.status === 400, 'Invalid OTP length rejected with HTTP 400');

  // Test 2.3: Valid Citizen OTP verification
  const citLoginRes = await fetch(`${BASE_URL}/api/v1/auth/citizen/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber: '9876543210', otpCode: '123456' }),
  });
  assert(citLoginRes.status === 200, 'Citizen OTP login succeeded with HTTP 200');
  const citData = await citLoginRes.json();
  assert(citData.persona === 'CITIZEN', 'Citizen persona returned as CITIZEN');
  assert(citData.redirectUrl === '/citizen/dashboard', 'Citizen redirectUrl targets /citizen/dashboard');
  assert(Boolean(citData.accessToken), 'Citizen JWT accessToken generated');

  const citizenToken = citData.accessToken;

  // -------------------------------------------------------------------------
  // 3. OFFICER LOGIN & WHITELIST VERIFICATION (/login/officer)
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Testing Officer Login & Directory Whitelist ---');

  // Test 3.1: Non-directory phone number rejected (Strict Whitelist)
  const unauthOfficerRes = await fetch(`${BASE_URL}/api/v1/auth/officer/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber: '9999999999', otpCode: '123456' }),
  });
  assert(unauthOfficerRes.status === 401, 'Unauthorized non-directory officer phone rejected with HTTP 401');

  // Test 3.2: PDF Directory-verified Officer Phone + OTP Login (Guntur Water: 9848011221)
  const officerPhoneRes = await fetch(`${BASE_URL}/api/v1/auth/officer/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber: '9848011221', otpCode: '123456' }),
  });
  assert(officerPhoneRes.status === 200, 'Directory-verified Officer Phone + OTP returned HTTP 200');
  const officerPhoneData = await officerPhoneRes.json();
  assert(officerPhoneData.persona === 'OFFICER', 'Officer persona returned as OFFICER');
  assert(
    officerPhoneData.officer.rbac_role === 'Department Operator' || officerPhoneData.officer.role === 'Department Operator',
    'Officer role is Department Operator'
  );
  assert(officerPhoneData.officer.assigned_category === 'Water', 'Officer category assigned to Water');
  assert(Boolean(officerPhoneData.accessToken), 'Officer JWT accessToken generated');

  const officerToken = officerPhoneData.accessToken;

  // Test 3.3: Special Access Code Login (GMC-OFF-44)
  const accessCodeRes = await fetch(`${BASE_URL}/api/v1/auth/officer/verify-access-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessCode: 'GMC-OFF-44' }),
  });
  assert(accessCodeRes.status === 200, 'Special Access Code login succeeded with HTTP 200');
  const accessCodeData = await accessCodeRes.json();
  assert(accessCodeData.officer.officer_badge_id === 'GMC-OFF-44', 'Officer Badge ID matches GMC-OFF-44');

  // -------------------------------------------------------------------------
  // 4. STRICT PORTAL SEPARATION & RBAC ISOLATION
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Testing Strict Portal Separation & RBAC Isolation ---');

  // Test 4.1: Citizen token attempting to query Officer volume feed -> Expect 404 (Zero Visibility)
  const citProbeRes = await fetch(`${BASE_URL}/api/v1/authority-portal/volume-sorted-feed?districtId=10`, {
    headers: { Authorization: `Bearer ${citizenToken}` },
  });
  assert(citProbeRes.status === 404, 'Citizen token querying officer volume feed receives opaque 404 Not Found');

  // Test 4.2: Citizen token attempting to claim an officer ticket -> Expect 404
  const citClaimRes = await fetch(`${BASE_URL}/api/v1/officer/complaints/test-cmp/claim`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${citizenToken}`,
    },
    body: JSON.stringify({
      officerId: 'spoofed-officer',
      expectedVersion: 1,
    }),
  });
  assert(citClaimRes.status === 404, 'Citizen token attempting to claim officer complaint receives opaque 404 Not Found');

  // Test 4.3: Officer token querying volume feed -> Expect 200
  const offFeedRes = await fetch(`${BASE_URL}/api/v1/authority-portal/volume-sorted-feed?districtId=10`, {
    headers: { Authorization: `Bearer ${officerToken}` },
  });
  assert(offFeedRes.status === 200, 'Officer token querying volume feed receives HTTP 200');
  const offFeedData = await offFeedRes.json();
  assert(Array.isArray(offFeedData.rankedGrievanceFeed), 'Returns rankedGrievanceFeed array');
  assert(Array.isArray(offFeedData.placeVolumePills), 'Returns placeVolumePills array');

  console.log(`\n=======================================================`);
  console.log(`[ALL TESTS COMPLETE] Passed: ${testsPassed} | Failed: ${testsFailed}`);
  console.log(`=======================================================\n`);
}

runDualPortalAuthTests().catch((err) => {
  console.error('[TEST SUITE CRITICAL ERROR]', err);
  process.exit(1);
});
