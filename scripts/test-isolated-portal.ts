import assert from 'assert';

const API_BASE = 'http://localhost:3001';

async function runIsolatedPortalTestSuite() {
  console.log('[TEST SUITE] Starting Zero-Visibility Portal Isolation & Volume-Ranked UI verification...');

  // --------------------------------------------------------------------------
  // TEST 1: Citizen OTP Login
  // --------------------------------------------------------------------------
  console.log('\n[TEST 1] Testing Citizen OTP login...');
  const citizenRes = await fetch(`${API_BASE}/api/v1/auth/citizen/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phoneNumber: '9876543210',
      otpCode: '123456',
    }),
  });

  assert.strictEqual(citizenRes.status, 200, 'Citizen OTP login must return 200');
  const citizenData = await citizenRes.json();
  assert.strictEqual(citizenData.persona, 'CITIZEN');
  const citizenToken = citizenData.accessToken;
  console.log('[PASS] Citizen authenticated successfully with persona CITIZEN');

  // --------------------------------------------------------------------------
  // TEST 2: Unauthenticated Probe to Isolated Officer Feed
  // --------------------------------------------------------------------------
  console.log('\n[TEST 2] Testing unauthenticated probe to isolated officer feed...');
  const unauthRes = await fetch(`${API_BASE}/api/v1/authority-portal/volume-sorted-feed`);
  assert.strictEqual(unauthRes.status, 404, 'Unauthenticated probe must return 404 opaque not found');
  console.log('[PASS] Unauthenticated visitor received 404 Not Found (Portal existence hidden)');

  // --------------------------------------------------------------------------
  // TEST 3: Citizen Token Probe to Isolated Officer Feed
  // --------------------------------------------------------------------------
  console.log('\n[TEST 3] Testing Citizen token probe to isolated officer feed...');
  const citizenProbeRes = await fetch(`${API_BASE}/api/v1/authority-portal/volume-sorted-feed`, {
    headers: { Authorization: `Bearer ${citizenToken}` },
  });
  assert.strictEqual(citizenProbeRes.status, 404, 'Citizen token probing officer feed must return 404');
  console.log('[PASS] Citizen token received 404 Not Found (Strict Zero-Visibility enforced)');

  // --------------------------------------------------------------------------
  // TEST 4: Dedicated Officer Direct Phone Number + OTP Login
  // --------------------------------------------------------------------------
  console.log('\n[TEST 4A] Testing Officer login rejection on unregistered mobile number...');
  const unregOfficerRes = await fetch(`${API_BASE}/api/v1/auth/officer/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phoneNumber: '9999999999',
      otpCode: '123456',
    }),
  });
  assert.strictEqual(unregOfficerRes.status, 401, 'Unregistered mobile number must return 401');
  console.log('[PASS] Unregistered mobile correctly rejected by Officer Directory');

  console.log('\n[TEST 4B] Testing Officer Phone Number + OTP Login (9848011221 -> GMC-OFF-44)...');
  const officerPhoneRes = await fetch(`${API_BASE}/api/v1/auth/officer/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phoneNumber: '9848011221',
      otpCode: '123456',
    }),
  });

  assert.strictEqual(officerPhoneRes.status, 200, 'Registered officer phone must return 200');
  const officerPhoneData = await officerPhoneRes.json();
  assert.strictEqual(officerPhoneData.persona, 'OFFICER');
  assert.strictEqual(officerPhoneData.officer.officer_badge_id, 'GMC-OFF-44');
  assert.strictEqual(officerPhoneData.officer.assigned_category, 'Water');
  assert.strictEqual(officerPhoneData.officer.district_id, 10);
  const officerToken = officerPhoneData.accessToken;
  console.log(`[PASS] Officer Phone Login Verified: ${officerPhoneData.officer.full_name} (${officerPhoneData.officer.designation})`);

  console.log('\n[TEST 4C] Testing Officer Phone Login for Delhi MCD Drainage (9811011224)...');
  const mcdPhoneRes = await fetch(`${API_BASE}/api/v1/auth/officer/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phoneNumber: '9811011224',
      otpCode: '123456',
    }),
  });
  assert.strictEqual(mcdPhoneRes.status, 200);
  const mcdPhoneData = await mcdPhoneRes.json();
  assert.strictEqual(mcdPhoneData.officer.officer_badge_id, 'MCD-UGD-112');
  console.log(`[PASS] MCD Officer Phone Login Verified: ${mcdPhoneData.officer.full_name}`);

  // --------------------------------------------------------------------------
  // TEST 5: Seed Volume Hierarchy Complaints Across Areas and Concepts
  // --------------------------------------------------------------------------
  console.log('\n[TEST 5] Seeding multi-area and multi-concept complaint volume hierarchy in Guntur (District 10)...');

  // Case A: Arundelpet (Water) - Stacked to 3 citizen bookings (Most Booked Concept)
  const caseA1Res = await fetch(`${API_BASE}/api/v1/complaints`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      category: 'Water',
      district_id: 10,
      latitude: 16.3067,
      longitude: 80.4365,
      address_text: 'Arundelpet 4th Lane, Guntur',
      description: 'Major drinking water main pipeline burst causing street flooding.',
      user_id: 'citizen-001',
    }),
  });
  const caseA1 = await caseA1Res.json();
  const stackCodeA = caseA1.complaint?.stack_code;

  if (stackCodeA) {
    // Stack 2 additional citizens onto stack A
    await fetch(`${API_BASE}/api/v1/complaints/stacks/${stackCodeA}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 'citizen-002' }),
    });
    await fetch(`${API_BASE}/api/v1/complaints/stacks/${stackCodeA}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 'citizen-003' }),
    });
  }

  // Case B: Brodipet (Roads) - Stacked to 2 citizen bookings
  const caseB1Res = await fetch(`${API_BASE}/api/v1/complaints`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      category: 'Roads',
      district_id: 10,
      latitude: 16.312,
      longitude: 80.441,
      address_text: 'Brodipet Main Road, Guntur',
      description: 'Dangerous crater pothole cluster in front of commercial complex.',
      user_id: 'citizen-004',
    }),
  });
  const caseB1 = await caseB1Res.json();
  const stackCodeB = caseB1.complaint?.stack_code;
  if (stackCodeB) {
    await fetch(`${API_BASE}/api/v1/complaints/stacks/${stackCodeB}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 'citizen-005' }),
    });
  }

  // Case C: Nagarampalem (Garbage) - 1 citizen booking
  await fetch(`${API_BASE}/api/v1/complaints`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      category: 'Garbage',
      district_id: 10,
      latitude: 16.295,
      longitude: 80.428,
      address_text: 'Nagarampalem Market, Guntur',
      description: 'Overflowing commercial waste bin obstructing walkway.',
      user_id: 'citizen-006',
    }),
  });

  // Case D: Arundelpet (Drainage) - 1 citizen booking (Increases Arundelpet Area total!)
  await fetch(`${API_BASE}/api/v1/complaints`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      category: 'Drainage',
      district_id: 10,
      latitude: 16.307,
      longitude: 80.437,
      address_text: 'Arundelpet 4th Lane, Guntur',
      description: 'Underground stormwater drainage block overflowing during rains.',
      user_id: 'citizen-007',
    }),
  });

  console.log('[PASS] Seeded volume hierarchy: Arundelpet (highest area volume), Water (highest concept volume)');

  // --------------------------------------------------------------------------
  // TEST 6: Fetch Volume-Sorted Feed via Officer Token
  // --------------------------------------------------------------------------
  console.log('\n[TEST 6] Querying volume-sorted feed with Officer Token...');
  const feedRes = await fetch(
    `${API_BASE}/api/v1/authority-portal/volume-sorted-feed?districtId=10`,
    {
      headers: { Authorization: `Bearer ${officerToken}` },
    }
  );

  assert.strictEqual(feedRes.status, 200, 'Officer request must return 200');
  const feedData = await feedRes.json();

  assert.ok(Array.isArray(feedData.topAreaHotspots), 'topAreaHotspots must be array');
  assert.ok(Array.isArray(feedData.topBookedConcepts), 'topBookedConcepts must be array');
  assert.ok(Array.isArray(feedData.rankedGrievanceFeed), 'rankedGrievanceFeed must be array');

  console.log(`[INFO] Top Area: ${feedData.topAreaHotspots[0]?.area_name} (${feedData.topAreaHotspots[0]?.total_citizen_bookings} bookings)`);
  console.log(`[INFO] Top Concept: ${feedData.topBookedConcepts[0]?.concept_name} (${feedData.topBookedConcepts[0]?.total_cases_booked} cases)`);

  // Verify #1 Area matches Arundelpet
  assert.ok(
    feedData.topAreaHotspots[0]?.area_name.includes('Arundelpet'),
    'Arundelpet must rank as #1 Area Hotspot'
  );

  // --------------------------------------------------------------------------
  // TEST 7: Strict Monotonic Decreasing Volume Ordering Verification
  // --------------------------------------------------------------------------
  console.log('\n[TEST 7] Verifying strictly decreasing volume sort order (Top to Bottom)...');
  const feed = feedData.rankedGrievanceFeed;
  assert.ok(feed.length >= 2, 'Feed must have at least 2 items to verify sort');

  for (let i = 0; i < feed.length - 1; i++) {
    const current = feed[i];
    const next = feed[i + 1];

    if (current.concept_booked_count === next.concept_booked_count) {
      // Tie breaker: area complaints
      assert.ok(
        current.area_total_complaints >= next.area_total_complaints,
        `Tie-breaker failed at index ${i}: current area ${current.area_total_complaints} must be >= next area ${next.area_total_complaints}`
      );
    } else {
      assert.ok(
        current.concept_booked_count >= next.concept_booked_count,
        `Decreasing sort failed at index ${i}: current bookings ${current.concept_booked_count} must be >= next bookings ${next.concept_booked_count}`
      );
    }
  }

  console.log('[PASS] Monotonic volume ordering verified: Top card is #1 Most Booked, gradually decreasing downward');

  // --------------------------------------------------------------------------
  // TEST 8: Officer Accept and Hold on Volume-Ranked Feed Item
  // --------------------------------------------------------------------------
  console.log('\n[TEST 8] Testing officer Accept and Hold workflow on top-ranked complaint...');
  const topComplaintId = feed[0].primary_complaint_id;

  const acceptRes = await fetch(`${API_BASE}/api/v1/officer/complaints/${topComplaintId}/accept`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${officerToken}`,
    },
    body: JSON.stringify({
      officerId: officerPhoneData.officer.officer_id,
      officerBadgeId: officerPhoneData.officer.officer_badge_id,
      officerName: officerPhoneData.officer.full_name,
    }),
  });
  assert.strictEqual(acceptRes.status, 200);
  console.log('[PASS] Top volume grievance accepted to fix');

  const holdRes = await fetch(`${API_BASE}/api/v1/officer/complaints/${topComplaintId}/hold`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${officerToken}`,
    },
    body: JSON.stringify({
      officerId: officerPhoneData.officer.officer_id,
      officerBadgeId: officerPhoneData.officer.officer_badge_id,
      officerName: officerPhoneData.officer.full_name,
      holdReason: 'Held in queue while prioritizing higher-volume hotspot cases',
    }),
  });
  assert.strictEqual(holdRes.status, 200);
  console.log('[PASS] Top volume grievance placed on hold');

  console.log('\n[ALL TESTS PASSED] Zero-Visibility Isolation & Volume-Ranked Hotspot Engine verified 100% successfully.\n');
}

runIsolatedPortalTestSuite().catch((err) => {
  console.error('[TEST SUITE ERROR]', err);
  process.exit(1);
});

