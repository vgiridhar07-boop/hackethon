/**
 * TEST SUITE: UNIFIED CIVIC GRIEVANCE OFFICER PORTAL & DISPATCH ENGINE
 * Tests PDF-verified phone auth, portal isolation, taxonomy dispatch,
 * department-scoped RBAC, and atomic optimistic concurrency.
 */

import { dispatchEngine } from '../src/services/dispatchEngine';
import {
  OFFICIAL_REGISTRY_2026,
  classifyComplaintCategory,
  getHelplinesForDistrict,
} from '../src/config/official_registry_2026';

const BASE_URL = 'http://localhost:3001';

async function runUnifiedDispatchTestSuite() {
  console.log('[TEST SUITE] Starting Unified Civic Grievance Officer Portal & Automated Dispatch verification...');
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
  // 1. REGISTRY & TAXONOMY INTEGRITY (Module B)
  // -------------------------------------------------------------------------
  console.log('\n--- 1. Testing Official Registry 2026 & Taxonomy Classification ---');

  // Test 1.1: Verify Universal National Helplines count
  assert(
    OFFICIAL_REGISTRY_2026.universal_national_helplines.length === 7,
    'Universal national helplines count is exactly 7'
  );

  // Test 1.2: Check Roads taxonomy classification
  const roadsClf = classifyComplaintCategory('Massive pothole crater on main asphalt road near the bridge');
  assert(roadsClf.category === 'ROADS', 'Classified pothole crater text as ROADS');
  assert(roadsClf.escalation_threshold_hours === 48, 'ROADS escalation threshold is 48 hours');
  assert(roadsClf.default_priority === 'MEDIUM', 'ROADS default priority is MEDIUM');

  // Test 1.3: Check Water taxonomy classification
  const waterClf = classifyComplaintCategory('Severe pipeline leakage burst drinking water contamination dirty water');
  assert(waterClf.category === 'WATER', 'Classified pipeline burst text as WATER');
  assert(waterClf.escalation_threshold_hours === 24, 'WATER escalation threshold is 24 hours');
  assert(waterClf.default_priority === 'HIGH', 'WATER default priority is HIGH');

  // Test 1.4: Check Sanitation taxonomy classification
  const sanClf = classifyComplaintCategory('Overflowing garbage dump waste dead animal stench and dirty dustbin');
  assert(sanClf.category === 'SANITATION', 'Classified garbage dump text as SANITATION');
  assert(sanClf.escalation_threshold_hours === 36, 'SANITATION escalation threshold is 36 hours');

  // Test 1.5: Check Electricity taxonomy classification
  const elecClf = classifyComplaintCategory('Transformer power outage blackout and spark hanging high tension wire shock');
  assert(elecClf.category === 'ELECTRICITY', 'Classified transformer spark text as ELECTRICITY');
  assert(elecClf.escalation_threshold_hours === 12, 'ELECTRICITY escalation threshold is 12 hours');
  assert(elecClf.default_priority === 'HIGH', 'ELECTRICITY default priority is HIGH');

  // Test 1.6: District Helplines Lookup
  const gunturRoads = getHelplinesForDistrict('Andhra Pradesh', 'Guntur', 'ROADS');
  assert(gunturRoads.primary.includes('9441244749'), 'Guntur ROADS primary numbers contain 9441244749');
  assert(gunturRoads.fallback.includes('112'), 'Fallback contains ERSS shortcode 112');

  const gunturWater = getHelplinesForDistrict('Andhra Pradesh', 'Guntur', 'WATER');
  assert(gunturWater.primary.includes('9100121400'), 'Guntur WATER primary numbers contain 9100121400');

  // -------------------------------------------------------------------------
  // 2. DISPATCH ENGINE (Module B)
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Testing Automated Dispatch Engine Routing & Deadlines ---');

  const dispatchRes = dispatchEngine.dispatchComplaint({
    description: 'Electric transformer spark and blackout in market street',
    stateName: 'Andhra Pradesh',
    districtName: 'Guntur',
    districtId: 10,
    latitude: 16.3067,
    longitude: 80.4365,
    addressText: 'Market Road, Guntur',
  });

  assert(dispatchRes.category === 'ELECTRICITY', 'Dispatch assigned category ELECTRICITY');
  assert(dispatchRes.urgency_score === 5, 'Hazardous spark elevated urgency score to 5');
  assert(dispatchRes.sla_target_hours === 12, 'SLA target hours set to 12');
  assert(dispatchRes.claim_version === 1, 'Initial claim_version initialized to 1');
  assert(Boolean(dispatchRes.escalation_deadline), 'Escalation deadline timestamp generated');
  assert(dispatchRes.assigned_helplines.length > 0, 'Verified departmental helpline numbers attached');

  // -------------------------------------------------------------------------
  // 3. OFFICER AUTHENTICATION & WHITELIST ENFORCEMENT (Module A)
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Testing PDF-Verified Officer Authentication & Whitelist ---');

  // Test 3.1: Seeded Guntur Water Officer
  const seededWaterRes = await fetch(`${BASE_URL}/api/v1/auth/officer/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber: '9848011221', otpCode: '123456' }),
  });
  assert(seededWaterRes.status === 200, 'Seeded Guntur Water Officer login returned HTTP 200');
  const seededWaterData = await seededWaterRes.json();
  const waterToken = seededWaterData.accessToken;
  assert(seededWaterData.officer.assigned_category === 'Water', 'Seeded officer category is Water');
  assert(seededWaterData.officer.district_id === 10, 'Seeded officer district_id is 10 (Guntur)');

  // Test 3.2: Seeded Guntur Roads Officer
  const seededRoadsRes = await fetch(`${BASE_URL}/api/v1/auth/officer/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber: '9848011222', otpCode: '123456' }),
  });
  assert(seededRoadsRes.status === 200, 'Seeded Guntur Roads Officer login returned HTTP 200');
  const seededRoadsData = await seededRoadsRes.json();
  const roadsToken = seededRoadsData.accessToken;
  assert(seededRoadsData.officer.assigned_category === 'Roads', 'Seeded officer category is Roads');

  // Test 3.3: Master PDF Registry Number: Tawang Electricity (8974170896)
  const tawangPhoneRes = await fetch(`${BASE_URL}/api/v1/auth/officer/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber: '8974170896', otpCode: '654321' }),
  });
  assert(tawangPhoneRes.status === 200, 'Tawang Electricity PDF registry number authenticated successfully');
  const tawangData = await tawangPhoneRes.json();
  assert(tawangData.officer.assigned_category === 'Electricity', 'Tawang officer dynamic category is Electricity');
  assert(tawangData.officer.district_name === 'Tawang', 'Tawang officer district is Tawang');

  // Test 3.4: Master PDF Registry Number: Guntur Roads (9441244749)
  const gntRoadsRes = await fetch(`${BASE_URL}/api/v1/auth/officer/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber: '9441244749', otpCode: '112233' }),
  });
  assert(gntRoadsRes.status === 200, 'Guntur Roads PDF directory number authenticated successfully');
  const gntRoadsData = await gntRoadsRes.json();
  assert(gntRoadsData.officer.assigned_category === 'Roads', 'Guntur Roads directory officer category is Roads');

  // Test 3.5: Non-whitelisted unauthorized number rejection
  const unauthorizedRes = await fetch(`${BASE_URL}/api/v1/auth/officer/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber: '9999999999', otpCode: '123456' }),
  });
  assert(unauthorizedRes.status === 401, 'Unauthorized non-directory phone number rejected with HTTP 401');
  const unauthData = await unauthorizedRes.json();
  assert(
    unauthData.error.includes('not registered in the Municipal & Nodal Officer Directory'),
    'Returned official directory restriction error'
  );

  // Test 3.6: Invalid OTP format
  const badOtpRes = await fetch(`${BASE_URL}/api/v1/auth/officer/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber: '9848011221', otpCode: '12' }),
  });
  assert(badOtpRes.status === 400, 'Short OTP rejected with HTTP 400');

  // -------------------------------------------------------------------------
  // 4. STRICT PORTAL ISOLATION (Citizens Denied Officer Endpoints)
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Testing Strict Zero-Visibility Portal Isolation ---');

  // Obtain Citizen Token
  const citRes = await fetch(`${BASE_URL}/api/v1/auth/citizen/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber: '9876500001', otpCode: '123456' }),
  });
  const citData = await citRes.json();
  const citizenToken = citData.accessToken;

  // Test 4.1: Citizen token cannot access /api/v1/officer/complaints (must return 404)
  const citOfficerQuery = await fetch(`${BASE_URL}/api/v1/officer/complaints`, {
    headers: { Authorization: `Bearer ${citizenToken}` },
  });
  assert(citOfficerQuery.status === 404, 'Citizen token querying officer endpoint returned opaque 404 Not Found');

  // Test 4.2: Citizen token cannot access volume feed
  const citVolumeFeed = await fetch(`${BASE_URL}/api/v1/authority-portal/volume-sorted-feed`, {
    headers: { Authorization: `Bearer ${citizenToken}` },
  });
  assert(citVolumeFeed.status === 404, 'Citizen token querying volume feed returned opaque 404 Not Found');

  // Test 4.3: Unauthenticated request to claim endpoint returns 404
  const unauthClaim = await fetch(`${BASE_URL}/api/v1/officer/complaints/test-id/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ officerId: 'test', expectedVersion: 1 }),
  });
  assert(unauthClaim.status === 404, 'Unauthenticated claim request returned opaque 404 Not Found');

  // -------------------------------------------------------------------------
  // 5. DEPARTMENT-SCOPED RBAC (Module A)
  // -------------------------------------------------------------------------
  console.log('\n--- 5. Testing Department-Scoped RBAC (Water vs Roads vs Tawang) ---');

  // Create two real complaints via the API: one Water in Guntur, one Roads in Guntur
  const createWaterRes = await fetch(`${BASE_URL}/api/v1/complaints`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${citizenToken}`,
    },
    body: JSON.stringify({
      category: 'Water',
      district_id: 10, // Guntur
      latitude: 16.3067,
      longitude: 80.4365,
      address_text: 'Arundelpet Main Line, Guntur',
      description: 'Contaminated muddy water pipeline leak in Guntur',
    }),
  });
  assert(createWaterRes.status === 201, 'Created real Water complaint in Guntur via API');
  const createWaterData = await createWaterRes.json();
  const testWaterId = createWaterData.complaint_id;

  const createRoadsRes = await fetch(`${BASE_URL}/api/v1/complaints`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${citizenToken}`,
    },
    body: JSON.stringify({
      category: 'Roads',
      district_id: 10, // Guntur
      latitude: 16.3100,
      longitude: 80.4400,
      address_text: 'Brodipet 4th Lane, Guntur',
      description: 'Deep road crater and broken pavement',
    }),
  });
  assert(createRoadsRes.status === 201, 'Created real Roads complaint in Guntur via API');
  const createRoadsData = await createRoadsRes.json();
  const testRoadsId = createRoadsData.complaint_id;

  // Test 5.1: Water Officer only receives Water complaints
  const waterQueueRes = await fetch(`${BASE_URL}/api/v1/officer/complaints`, {
    headers: { Authorization: `Bearer ${waterToken}` },
  });
  assert(waterQueueRes.status === 200, 'Water Officer fetched complaints queue');
  const waterQueueData = await waterQueueRes.json();
  const allWater = waterQueueData.complaints.every((c: any) => c.category.toLowerCase() === 'water');
  assert(allWater, 'Water Officer feed strictly contains only Water category tickets');

  // Test 5.2: Roads Officer only receives Roads complaints
  const roadsQueueRes = await fetch(`${BASE_URL}/api/v1/officer/complaints`, {
    headers: { Authorization: `Bearer ${roadsToken}` },
  });
  assert(roadsQueueRes.status === 200, 'Roads Officer fetched complaints queue');
  const roadsQueueData = await roadsQueueRes.json();
  const allRoads = roadsQueueData.complaints.every((c: any) => c.category.toLowerCase() === 'roads');
  assert(allRoads, 'Roads Officer feed strictly contains only Roads category tickets');

  // Test 5.3: Water Officer attempts to claim Roads ticket -> Expect 403 FORBIDDEN_DEPARTMENT_SCOPE
  const crossClaimRes = await fetch(`${BASE_URL}/api/v1/officer/complaints/${testRoadsId}/claim`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${waterToken}`,
    },
    body: JSON.stringify({
      officerId: 'off-ap-gnt-water-001',
      expectedVersion: 1,
      officerName: 'Er. K. Srinivasa Rao',
    }),
  });
  assert(crossClaimRes.status === 403, 'Cross-department claim rejected with HTTP 403 Forbidden');
  const crossClaimData = await crossClaimRes.json();
  assert(crossClaimData.error === 'FORBIDDEN_DEPARTMENT_SCOPE', 'Error code is FORBIDDEN_DEPARTMENT_SCOPE');

  // -------------------------------------------------------------------------
  // 6. ATOMIC CONCURRENCY & OPTIMISTIC LOCKING (Module B)
  // -------------------------------------------------------------------------
  console.log('\n--- 6. Testing Atomic Concurrency & Optimistic Locking ---');

  // Test 6.1: Water Officer claims Water ticket with expectedVersion = 1 -> Expect 200
  const claim1Res = await fetch(`${BASE_URL}/api/v1/officer/complaints/${testWaterId}/claim`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${waterToken}`,
    },
    body: JSON.stringify({
      officerId: 'off-ap-gnt-water-001',
      expectedVersion: 1,
      officerName: 'Er. K. Srinivasa Rao',
      officerPhone: '9848011221',
      remarks: 'Dispatching field crew with water tanker and pipe weld unit.',
    }),
  });

  assert(claim1Res.status === 200, 'First claim with expectedVersion: 1 succeeded with HTTP 200');
  const claim1Data = await claim1Res.json();
  assert(claim1Data.claim_version === 2, 'Claim version advanced to 2');
  assert(claim1Data.status === 'In Progress', 'Complaint status updated to In Progress');

  // Test 6.2: Simultaneous / Concurrent claim with stale expectedVersion = 1 -> Expect 409 Conflict
  const claimConflictRes = await fetch(`${BASE_URL}/api/v1/officer/complaints/${testWaterId}/claim`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${waterToken}`,
    },
    body: JSON.stringify({
      officerId: 'off-ap-gnt-water-001',
      expectedVersion: 1, // Stale version! Current is 2
      officerName: 'Another Water Engineer',
    }),
  });

  assert(claimConflictRes.status === 409, 'Concurrent claim with stale version returned HTTP 409 Conflict');
  const conflictData = await claimConflictRes.json();
  assert(conflictData.code === 'CONCURRENT_CLAIM_CONFLICT', 'Error code is CONCURRENT_CLAIM_CONFLICT');
  assert(conflictData.current_version === 2, 'Reported current version is 2');

  // Test 6.3: Claim with updated version (2) succeeds
  const claim2Res = await fetch(`${BASE_URL}/api/v1/officer/complaints/${testWaterId}/claim`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${waterToken}`,
    },
    body: JSON.stringify({
      officerId: 'off-ap-gnt-water-001',
      expectedVersion: 2, // Matches current version!
      officerName: 'Er. K. Srinivasa Rao',
      remarks: 'Updating crew notes on active repair.',
    }),
  });
  assert(claim2Res.status === 200, 'Second claim with expectedVersion: 2 succeeded');
  const claim2Data = await claim2Res.json();
  assert(claim2Data.claim_version === 3, 'Claim version advanced to 3');

  // Test 6.4: Zod schema validation: Reject invalid input (missing expectedVersion)
  const invalidZodRes = await fetch(`${BASE_URL}/api/v1/officer/complaints/${testWaterId}/claim`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${waterToken}`,
    },
    body: JSON.stringify({
      officerId: 'off-ap-gnt-water-001',
      // expectedVersion is omitted
    }),
  });
  assert(invalidZodRes.status === 400, 'Missing expectedVersion rejected with HTTP 400 (Zod validation)');

  // -------------------------------------------------------------------------
  // 7. VOLUME-SORTED FEED RANKING & CALIBRATION (Module B)
  // -------------------------------------------------------------------------
  console.log('\n--- 7. Testing Volume-Sorted Leaderboard & Monotonic Sort ---');

  const volumeFeedRes = await fetch(`${BASE_URL}/api/v1/authority-portal/volume-sorted-feed?districtId=10`, {
    headers: { Authorization: `Bearer ${waterToken}` },
  });
  assert(volumeFeedRes.status === 200, 'Volume-sorted feed endpoint returned HTTP 200');
  const volumeData = await volumeFeedRes.json();
  assert(Array.isArray(volumeData.topAreaHotspots), 'Returns topAreaHotspots array');
  assert(Array.isArray(volumeData.topBookedConcepts), 'Returns topBookedConcepts array');
  assert(Array.isArray(volumeData.rankedGrievanceFeed), 'Returns rankedGrievanceFeed array');
  assert(Array.isArray(volumeData.placeVolumePills), 'Returns placeVolumePills array');
  assert(volumeData.topPlaceHotspot !== undefined, 'Returns topPlaceHotspot');

  // Verify monotonic descending sort on feed
  const feedItems = volumeData.rankedGrievanceFeed;
  for (let i = 0; i < feedItems.length - 1; i++) {
    const cur = feedItems[i];
    const nxt = feedItems[i + 1];
    assert(
      cur.n_place >= nxt.n_place,
      `Monotonic descending place-volume sort satisfied: item ${i} (${cur.n_place}) >= item ${i + 1} (${nxt.n_place})`
    );
    assert(
      cur.calibrated_volume_pct >= nxt.calibrated_volume_pct,
      `Monotonic staircase volume bar satisfied: item ${i} (${cur.calibrated_volume_pct}%) >= item ${i + 1} (${nxt.calibrated_volume_pct}%)`
    );
  }

  // -------------------------------------------------------------------------
  // 8. 50-METER MICRO-PLACE SPATIAL CLUSTERING & EVIDENCE PHOTO GALLERY
  // -------------------------------------------------------------------------
  console.log('\n--- 8. Testing 50m Micro-Place Clustering & Evidence Gallery ---');

  // Create two co-located complaints within 20m of each other with citizen photos
  const photo1Res = await fetch(`${BASE_URL}/api/v1/complaints`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${citizenToken}`,
    },
    body: JSON.stringify({
      category: 'Water',
      description: 'Major drinking water main pipe fractured and leaking onto street',
      latitude: 16.3090,
      longitude: 80.4400,
      address_text: 'Arundelpet Main Road, Guntur',
      landmark: 'Near SBI Bank Branch',
      district_id: 10,
      image_url: 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?w=800',
    }),
  });
  assert(photo1Res.status === 201, 'Created co-located complaint #1 with photo');
  const photo1Data = await photo1Res.json();

  // Second complaint 15 meters away (16.3091, 80.4401 is ~15m away)
  const photo2Res = await fetch(`${BASE_URL}/api/v1/complaints`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${citizenToken}`,
    },
    body: JSON.stringify({
      category: 'Water',
      description: 'Low water pressure and puddle from underground burst pipeline',
      latitude: 16.3091,
      longitude: 80.4401,
      address_text: 'Arundelpet Main Road, Guntur',
      landmark: 'Near SBI Bank Branch',
      district_id: 10,
      image_url: 'https://images.unsplash.com/photo-1541888946425-d0fbb18f156b?w=800',
    }),
  });
  assert(photo2Res.status === 201, 'Created co-located complaint #2 within 15m with photo');
  const photo2Data = await photo2Res.json();

  // Query volume-sorted feed again
  const clusterFeedRes = await fetch(`${BASE_URL}/api/v1/authority-portal/volume-sorted-feed?districtId=10`, {
    headers: { Authorization: `Bearer ${waterToken}` },
  });
  const clusterData = await clusterFeedRes.json();
  const stackedCard = clusterData.rankedGrievanceFeed.find(
    (item: any) =>
      item.stacked_ticket_numbers?.includes(photo1Data.ticket_number) ||
      item.primary_complaint_id === photo1Data.complaint_id ||
      item.primary_complaint_id === photo2Data.complaint_id
  );

  assert(Boolean(stackedCard), 'Found micro-place clustered card in grievance feed');
  assert(stackedCard.n_place >= 2, `Micro-place spatial clustering grouped complaints (n_place = ${stackedCard.n_place} >= 2)`);
  assert(Array.isArray(stackedCard.evidence_photos), 'Card contains evidence_photos array');
  assert(stackedCard.evidence_photos.length >= 1, `Evidence gallery aggregated photos (count = ${stackedCard.evidence_photos.length})`);
  assert(
    stackedCard.calibrated_volume_pct >= 8 && stackedCard.calibrated_volume_pct <= 100,
    `Calibrated volume bar width in valid range: ${stackedCard.calibrated_volume_pct}%`
  );

  // -------------------------------------------------------------------------
  // 9. RESOLUTION WITH COMPLETION PROOF PHOTO
  // -------------------------------------------------------------------------
  console.log('\n--- 9. Testing Resolution Proof Photo Upload Workflow ---');

  // Accept/claim the complaint first so it is In Progress
  await fetch(`${BASE_URL}/api/v1/officer/complaints/${photo1Data.complaint_id}/accept`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${waterToken}`,
    },
    body: JSON.stringify({
      officerId: 'off-ap-gnt-water-001',
      officerBadgeId: 'GNT-PHED-01',
      officerName: 'Er. K. Srinivasa Rao',
    }),
  });

  // Now resolve with completion proof photo
  const resolveProofRes = await fetch(`${BASE_URL}/api/v1/officer/complaints/${photo1Data.complaint_id}/resolve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${waterToken}`,
    },
    body: JSON.stringify({
      officerId: 'off-ap-gnt-water-001',
      officerBadgeId: 'GNT-PHED-01',
      officerName: 'Er. K. Srinivasa Rao',
      proofImageUrl: 'https://images.unsplash.com/photo-1590402494682-cd3fb53b1f70?w=800',
      remarks: 'Pipeline replaced with ductile iron pipe and pressure tested.',
    }),
  });

  assert(resolveProofRes.status === 200, 'Resolution with completion proof succeeded with HTTP 200');
  const resolveData = await resolveProofRes.json();
  assert(resolveData.status === 'Resolved', 'Complaint status transitioned to Resolved');
  assert(Boolean(resolveData.resolved_at), 'Resolved timestamp recorded');
  assert(Boolean(resolveData.citizen_satisfaction_deadline), '48h citizen satisfaction window initiated');
  assert(
    resolveData.complaint.images.some((img: any) => img.is_resolution_proof === true),
    'Resolution proof image successfully attached with is_resolution_proof: true'
  );

  console.log(`\n=======================================================`);
  console.log(`[ALL TESTS COMPLETE] Passed: ${testsPassed} | Failed: ${testsFailed}`);
  console.log(`=======================================================\n`);
}

runUnifiedDispatchTestSuite().catch((err) => {
  console.error('[TEST SUITE CRITICAL ERROR]', err);
  process.exit(1);
});
