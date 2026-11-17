import assert from 'assert';

const API_BASE = 'http://localhost:3001';

async function runOfficerTestSuite() {
  console.log('[TEST SUITE] Starting Dual-Persona Login & Officer Command Portal verification...');

  // --------------------------------------------------------------------------
  // TEST 1: Citizen OTP Login
  // --------------------------------------------------------------------------
  console.log('\n[TEST 1] Testing Citizen OTP verification...');
  const citizenRes = await fetch(`${API_BASE}/api/v1/auth/citizen/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phoneNumber: '9876543210',
      otpCode: '123456',
      preferredLang: 'en',
    }),
  });

  assert.strictEqual(citizenRes.status, 200, 'Citizen OTP login should return HTTP 200');
  const citizenData = await citizenRes.json();
  assert.strictEqual(citizenData.status, 'authenticated');
  assert.strictEqual(citizenData.persona, 'CITIZEN');
  assert.strictEqual(citizenData.redirectUrl, '/citizen/dashboard');
  assert.ok(citizenData.accessToken, 'Access token must be returned for Citizen');
  console.log('[PASS] Citizen OTP verified successfully -> Redirects to /citizen/dashboard');

  // --------------------------------------------------------------------------
  // TEST 2: Officer Login with Invalid Special Access Code
  // --------------------------------------------------------------------------
  console.log('\n[TEST 2] Testing Officer login rejection on invalid access code...');
  const invalidOfficerRes = await fetch(`${API_BASE}/api/v1/auth/officer/code-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      officerBadgeId: 'GMC-OFF-44',
      specialAccessCode: 'WRONG-ACCESS-CODE-9999',
    }),
  });

  assert.strictEqual(invalidOfficerRes.status, 401, 'Invalid special access code must return HTTP 401');
  const invalidOfficerData = await invalidOfficerRes.json();
  assert.ok(invalidOfficerData.error, 'Error message should be present');
  console.log('[PASS] Rejected unauthorized officer attempt with HTTP 401');

  // --------------------------------------------------------------------------
  // TEST 3: Officer Login with Valid Special Access Code (GMC Water Works)
  // --------------------------------------------------------------------------
  console.log('\n[TEST 3] Testing Officer login with valid Special Access Code (GMC-OFF-44)...');
  const officerRes = await fetch(`${API_BASE}/api/v1/auth/officer/code-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      officerBadgeId: 'GMC-OFF-44',
      specialAccessCode: 'OFF-AP-GNT-WATER-2026',
    }),
  });

  assert.strictEqual(officerRes.status, 200, 'Valid officer credentials must return HTTP 200');
  const officerData = await officerRes.json();
  assert.strictEqual(officerData.status, 'authenticated');
  assert.strictEqual(officerData.persona, 'OFFICER');
  assert.ok(
    ['/authority-portal/dashboard', '/officer/portal'].includes(officerData.redirectUrl),
    'Redirect URL should route to Officer Dashboard'
  );
  assert.ok(officerData.accessToken, 'Access token must be returned for Officer');
  assert.strictEqual(officerData.officer.officer_badge_id, 'GMC-OFF-44');
  assert.strictEqual(officerData.officer.assigned_category, 'Water');
  assert.strictEqual(officerData.officer.district_id, 10);
  console.log(`[PASS] Authenticated Officer: ${officerData.officer.full_name} (${officerData.officer.designation})`);

  // --------------------------------------------------------------------------
  // TEST 4: Officer Login with Second Seeded Officer (Delhi MCD Drainage)
  // --------------------------------------------------------------------------
  console.log('\n[TEST 4] Testing Officer login for Delhi MCD Drainage (MCD-UGD-112)...');
  const mcdRes = await fetch(`${API_BASE}/api/v1/auth/officer/code-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      officerBadgeId: 'MCD-UGD-112',
      specialAccessCode: 'OFF-DL-MCD-DRAIN-2026',
    }),
  });

  assert.strictEqual(mcdRes.status, 200, 'Delhi MCD credentials must return HTTP 200');
  const mcdData = await mcdRes.json();
  assert.strictEqual(mcdData.officer.assigned_category, 'Drainage');
  assert.strictEqual(mcdData.officer.district_id, 164);
  console.log(`[PASS] Authenticated MCD Officer: ${mcdData.officer.full_name}`);

  // --------------------------------------------------------------------------
  // TEST 5: Create a Test Complaint for Officer Handling
  // --------------------------------------------------------------------------
  console.log('\n[TEST 5] Submitting real complaint in Guntur (District 10) for Water...');
  const createRes = await fetch(`${API_BASE}/api/v1/complaints`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': 'citizen-primary',
      'x-user-role': 'Citizen',
    },
    body: JSON.stringify({
      category: 'Water',
      district_id: 10,
      latitude: 16.3067,
      longitude: 80.4365,
      address_text: 'Arundelpet 4th Lane, Guntur, Andhra Pradesh',
      description: 'Severe municipal water supply pipeline leakage flooding street pavement.',
      user_id: 'citizen-primary',
    }),
  });

  assert.strictEqual(createRes.status, 201, 'Complaint creation should return HTTP 201');
  const createData = await createRes.json();
  const createdComplaint = createData.complaint;
  const ticketNumber = createdComplaint.ticket_number;
  const complaintId = createdComplaint.complaint_id;
  console.log(`[PASS] Created complaint ticket: ${ticketNumber} (ID: ${complaintId})`);

  // --------------------------------------------------------------------------
  // TEST 6: Officer Query Jurisdictional Complaints
  // --------------------------------------------------------------------------
  console.log('\n[TEST 6] Querying officer complaint queue for Guntur Water category...');
  const queueRes = await fetch(
    `${API_BASE}/api/v1/officer/complaints?districtId=10&category=Water`,
    {
      headers: {
        Authorization: `Bearer ${officerData.accessToken}`,
      },
    }
  );

  assert.strictEqual(queueRes.status, 200, 'Queue query should return HTTP 200');
  const queueData = await queueRes.json();
  assert.ok(Array.isArray(queueData.complaints), 'Complaints should be an array');
  const targetComplaint = queueData.complaints.find(
    (c: any) => c.complaint_id === complaintId
  );
  assert.ok(targetComplaint, 'Target complaint should be visible in officer queue');
  console.log(`[PASS] Found target complaint in officer queue. Queue depth: ${queueData.count}`);

  // --------------------------------------------------------------------------
  // TEST 7: Officer Action: Accept Complaint to Fix
  // --------------------------------------------------------------------------
  console.log('\n[TEST 7] Officer accepting complaint for field resolution...');
  const acceptRes = await fetch(
    `${API_BASE}/api/v1/officer/complaints/${complaintId}/accept`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${officerData.accessToken}`,
      },
      body: JSON.stringify({
        officerId: officerData.officer.officer_id,
        officerBadgeId: officerData.officer.officer_badge_id,
        officerName: officerData.officer.full_name,
        officerPhone: officerData.officer.official_phone,
        estimatedHours: 8,
      }),
    }
  );

  assert.strictEqual(acceptRes.status, 200, 'Accept endpoint should return HTTP 200');
  const acceptData = await acceptRes.json();
  assert.strictEqual(acceptData.status, 'In Progress');
  console.log(`[PASS] Complaint transitioned to 'In Progress': ${acceptData.message}`);

  // --------------------------------------------------------------------------
  // TEST 8: Officer Action: Keep on Hold
  // --------------------------------------------------------------------------
  console.log('\n[TEST 8] Officer placing complaint on hold...');
  const holdReasonText = 'Awaiting heavy excavator JCB from zonal depot for underground pipe repair';
  const holdRes = await fetch(
    `${API_BASE}/api/v1/officer/complaints/${complaintId}/hold`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${officerData.accessToken}`,
      },
      body: JSON.stringify({
        officerId: officerData.officer.officer_id,
        officerBadgeId: officerData.officer.officer_badge_id,
        officerName: officerData.officer.full_name,
        holdReason: holdReasonText,
      }),
    }
  );

  assert.strictEqual(holdRes.status, 200, 'Hold endpoint should return HTTP 200');
  const holdData = await holdRes.json();
  assert.strictEqual(holdData.status, 'On Hold');
  assert.strictEqual(holdData.holdReason, holdReasonText);
  console.log(`[PASS] Complaint transitioned to 'On Hold': ${holdData.message}`);

  // --------------------------------------------------------------------------
  // TEST 9: Verify Complaint Record Audit Logs & Updated State
  // --------------------------------------------------------------------------
  console.log('\n[TEST 9] Verifying updated complaint state and status log...');
  const verifyRes = await fetch(`${API_BASE}/api/v1/complaints/${ticketNumber}`, {
    headers: {
      'x-user-id': 'citizen-primary',
      'x-user-role': 'Citizen',
    },
  });

  assert.strictEqual(verifyRes.status, 200);
  const verifyData = await verifyRes.json();
  assert.strictEqual(verifyData.complaint.status, 'On Hold');
  assert.strictEqual(verifyData.complaint.hold_reason, holdReasonText);
  assert.ok(
    verifyData.complaint.status_logs.length >= 2,
    'Status logs must record acceptance and hold actions'
  );
  console.log('[PASS] Verified audit trail and persistent state for ticket: ' + ticketNumber);

  console.log('\n[ALL TESTS PASSED] Dual-Persona Login & Officer Command Portal verified 100% successfully.\n');
}

runOfficerTestSuite().catch((err) => {
  console.error('[TEST SUITE ERROR]', err);
  process.exit(1);
});

