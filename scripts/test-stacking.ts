import { ComplaintStackingEngine } from '../src/stacking/complaintStackingEngine';
import app from '../src/server/index';
import http from 'http';

async function runStackingVerificationSuite() {
  console.log('================================================================================');
  console.log('SMART COMPLAINT STACKING, SPATIO-SEMANTIC & DISPATCH ENGINE VERIFICATION');
  console.log('Zero-Latency Bypass | Dynamic S(t) | Cross-Category Compound | Starvation Guard');
  console.log('================================================================================\n');

  // Initialize engine with notification spy handlers
  const dispatchedTier1: Array<{ stackId: string; dept: string }> = [];
  const escalatedTier2: Array<{ stackId: string; dept: string }> = [];
  const escalatedTier3: Array<{ stackId: string; districtId: number }> = [];

  const engine = new ComplaintStackingEngine({
    notifyAuthorityTier1: async (stackId, dept) => {
      dispatchedTier1.push({ stackId, dept });
    },
    notifyAuthorityTier2Executive: async (stackId, dept) => {
      escalatedTier2.push({ stackId, dept });
    },
    notifyAuthorityTier3Collectorate: async (stackId, districtId) => {
      escalatedTier3.push({ stackId, districtId });
    },
  });

  // TEST 1: K=1 Life-Safety & Acute Infrastructure Immediate Bypass
  console.log('[TEST 1] K=1 Life-Safety Immediate Bypass (Live Wire / Sewer Gas / Manhole)');
  const t1Res = await engine.processAndStackComplaint({
    complaintId: 'cmp-t1-001',
    ticketNumber: 'CIV-2026-AP-00001',
    userId: 'usr-citizen-alpha',
    districtId: 10,
    stateCode: 'AP',
    isRuralPanchayat: false,
    category: 'Electricity',
    subIssueCode: 'ELECTRICITY_CRITICAL_LIVEWIRE_POLE',
    latitude: 16.3067,
    longitude: 80.4365,
    gpsAccuracyMeters: 4.0,
    description: 'Hanging live electric wire sparking on road near school gate electrocution hazard.',
    cvConfidence: 0.95,
    nlpUrgencyScore: 5,
    assignedDepartment: 'DISCOM Emergency Fuse-Off Call Center, Electricity Board Assistant Engineer, 112 ERSS',
    assignedOfficerContact: '112 / 1912',
  });

  if (
    t1Res.kEffectiveThreshold === 1 &&
    t1Res.actionTaken === 'CREATED_AND_DISPATCHED_IMMEDIATELY' &&
    t1Res.authorityNotified === true &&
    t1Res.escalationTierTriggered === 1
  ) {
    console.log(
      `[PASS] Test 1 -> Dispatched immediately in 0ms (Stack: ${t1Res.stackCode}, K=1 Bypass). Department: ${t1Res.assignedDepartment}`
    );
  } else {
    throw new Error(`Test 1 Failed: Expected K=1 immediate dispatch, got ${JSON.stringify(t1Res)}`);
  }

  // TEST 2: K=2 Urgent Fast Stack & Bayesian Pooled CV Confidence Fusion
  console.log('\n[TEST 2] K=2 Urgent Fast Stack & Pooled CV Confidence Fusion');
  engine.resetInMemoryStore();

  // Report 1: Citizen 1 reports overflowing dumpster
  const c1Confidence = 0.82;
  const t2Report1 = await engine.processAndStackComplaint({
    complaintId: 'cmp-t2-001',
    ticketNumber: 'CIV-2026-AP-00002',
    userId: 'usr-citizen-bob',
    districtId: 10,
    stateCode: 'AP',
    isRuralPanchayat: false,
    category: 'Garbage',
    subIssueCode: 'GARBAGE_URGENT_OVERFLOWING_DUMPSTER',
    latitude: 16.3067,
    longitude: 80.4365,
    gpsAccuracyMeters: 4.5,
    description: 'Overflowing community garbage dumpster spilling onto street with foul smell.',
    cvConfidence: c1Confidence,
    nlpUrgencyScore: 4,
    assignedDepartment: 'Municipal Solid Waste Management (SWM) Cell',
    assignedOfficerContact: '1800-425-0000',
  });

  if (
    t2Report1.kEffectiveThreshold === 2 &&
    t2Report1.actionTaken === 'CREATED_AND_BUFFERING' &&
    t2Report1.uniqueCitizenCount === 1 &&
    t2Report1.authorityNotified === false
  ) {
    console.log(`[PASS] Test 2.1 -> Report 1 created stack ${t2Report1.stackCode} (Buffering 1/2)`);
  } else {
    throw new Error(`Test 2.1 Failed: Expected Buffering 1/2, got ${JSON.stringify(t2Report1)}`);
  }

  // Report 2: Citizen 2 reports same issue 18 meters away (lat + 0.00015 is ~17m)
  const c2Confidence = 0.85;
  const expectedPooledCv = Number((1 - (1 - c1Confidence) * (1 - c2Confidence)).toFixed(4)); // 1 - 0.18 * 0.15 = 0.9730

  const t2Report2 = await engine.processAndStackComplaint({
    complaintId: 'cmp-t2-002',
    ticketNumber: 'CIV-2026-AP-00003',
    userId: 'usr-citizen-charlie',
    districtId: 10,
    stateCode: 'AP',
    isRuralPanchayat: false,
    category: 'Garbage',
    subIssueCode: 'GARBAGE_URGENT_OVERFLOWING_DUMPSTER',
    latitude: 16.30685, // ~17m distance
    longitude: 80.4365,
    gpsAccuracyMeters: 5.0,
    description: 'Dumpster full and overflowing on main road corner.',
    cvConfidence: c2Confidence,
    nlpUrgencyScore: 4,
    assignedDepartment: 'Municipal Solid Waste Management (SWM) Cell',
    assignedOfficerContact: '1800-425-0000',
  });

  if (
    t2Report2.stackId === t2Report1.stackId &&
    t2Report2.uniqueCitizenCount === 2 &&
    t2Report2.actionTaken === 'STACKED_AND_DISPATCHED' &&
    t2Report2.authorityNotified === true &&
    Math.abs(t2Report2.pooledCvConfidence - expectedPooledCv) < 0.005
  ) {
    console.log(
      `[PASS] Test 2.2 -> Report 2 joined Stack ${t2Report2.stackCode}. Community threshold 2/2 satisfied! Pooled CV Proof: ${(t2Report2.pooledCvConfidence * 100).toFixed(1)}% (Authority Dispatched)`
    );
  } else {
    throw new Error(`Test 2.2 Failed: Expected Stacked & Dispatched, got ${JSON.stringify(t2Report2)}`);
  }

  // TEST 3: K=3 Standard Pothole Stack & Rural Gram Panchayat Adaptation (K_rural = 2)
  console.log('\n[TEST 3] Standard Stack & Rural Gram Panchayat Density Adaptation');
  engine.resetInMemoryStore();

  // Urban standard pothole (K_base = 3)
  const urbanPothole = await engine.processAndStackComplaint({
    complaintId: 'cmp-t3-urban',
    ticketNumber: 'CIV-2026-AP-00004',
    userId: 'usr-urban-citizen',
    districtId: 10,
    stateCode: 'AP',
    isRuralPanchayat: false,
    category: 'Roads',
    subIssueCode: 'ROAD_STANDARD_POTHOLE_FOOTPATH',
    latitude: 16.3067,
    longitude: 80.4365,
    gpsAccuracyMeters: 4.0,
    description: 'Routine road potholes and surface cracks on colony road.',
    cvConfidence: 0.88,
    nlpUrgencyScore: 3,
    assignedDepartment: 'Ward Junior Engineer (Roads)',
    assignedOfficerContact: null,
  });

  if (urbanPothole.kEffectiveThreshold === 3) {
    console.log(`[PASS] Test 3.1 -> Urban Pothole configured to K_urban = ${urbanPothole.kEffectiveThreshold}`);
  } else {
    throw new Error(`Test 3.1 Failed: Expected K=3 for urban pothole, got ${urbanPothole.kEffectiveThreshold}`);
  }

  // Rural Gram Panchayat standard pothole (K_rural = 2 due to lower population density)
  const ruralPothole1 = await engine.processAndStackComplaint({
    complaintId: 'cmp-t3-rural-1',
    ticketNumber: 'CIV-2026-AP-00005',
    userId: 'usr-rural-citizen-1',
    districtId: 12,
    stateCode: 'AP',
    isRuralPanchayat: true,
    category: 'Roads',
    subIssueCode: 'ROAD_STANDARD_POTHOLE_FOOTPATH',
    latitude: 16.5000,
    longitude: 80.6000,
    gpsAccuracyMeters: 6.0,
    description: 'Potholes on village gram panchayat access road.',
    cvConfidence: 0.87,
    nlpUrgencyScore: 3,
    assignedDepartment: 'Panchayat Raj Engineering (PR Eng)',
    assignedOfficerContact: null,
  });

  if (ruralPothole1.kEffectiveThreshold === 2 && ruralPothole1.actionTaken === 'CREATED_AND_BUFFERING') {
    console.log(`[PASS] Test 3.2 -> Rural Gram Panchayat Pothole adapted to K_rural = ${ruralPothole1.kEffectiveThreshold} (Buffering 1/2)`);
  } else {
    throw new Error(`Test 3.2 Failed: Expected K_rural = 2, got ${JSON.stringify(ruralPothole1)}`);
  }

  // Second rural report triggers dispatch on K=2
  const ruralPothole2 = await engine.processAndStackComplaint({
    complaintId: 'cmp-t3-rural-2',
    ticketNumber: 'CIV-2026-AP-00006',
    userId: 'usr-rural-citizen-2',
    districtId: 12,
    stateCode: 'AP',
    isRuralPanchayat: true,
    category: 'Roads',
    subIssueCode: 'ROAD_STANDARD_POTHOLE_FOOTPATH',
    latitude: 16.5002, // ~22m away
    longitude: 80.6000,
    gpsAccuracyMeters: 5.5,
    description: 'Deep potholes on gram panchayat connection road.',
    cvConfidence: 0.89,
    nlpUrgencyScore: 3,
    assignedDepartment: 'Panchayat Raj Engineering (PR Eng)',
    assignedOfficerContact: null,
  });

  if (ruralPothole2.actionTaken === 'STACKED_AND_DISPATCHED' && ruralPothole2.uniqueCitizenCount === 2) {
    console.log(`[PASS] Test 3.3 -> Rural stack dispatched on 2nd report! K_rural=2 adaptation verified.`);
  } else {
    throw new Error(`Test 3.3 Failed: Expected rural dispatch at K=2, got ${JSON.stringify(ruralPothole2)}`);
  }

  // TEST 4: Mode B Cross-Category Compound Hazard (<= 25m Water + Roads)
  console.log('\n[TEST 4] Mode B Cross-Category Compound Hazard (Water Pipeline Burst + Road Cave-In <= 25m)');
  engine.resetInMemoryStore();

  // Step 1: Water pipeline burst reported
  const waterReport = await engine.processAndStackComplaint({
    complaintId: 'cmp-t4-water',
    ticketNumber: 'CIV-2026-AP-00007',
    userId: 'usr-water-reporter',
    districtId: 10,
    stateCode: 'AP',
    isRuralPanchayat: false,
    category: 'Water',
    subIssueCode: 'WATER_URGENT_SUPPLY_OUTAGE',
    latitude: 16.30670,
    longitude: 80.43650,
    gpsAccuracyMeters: 4.0,
    description: 'Distribution pipeline broken and leaking under street.',
    cvConfidence: 0.85,
    nlpUrgencyScore: 4,
    assignedDepartment: 'Municipal Water Works Executive Engineer',
    assignedOfficerContact: '1800-425-9999',
  });

  // Step 2: Road cave-in reported 12 meters away within 15 minutes
  const roadReport = await engine.processAndStackComplaint({
    complaintId: 'cmp-t4-road',
    ticketNumber: 'CIV-2026-AP-00008',
    userId: 'usr-road-reporter',
    districtId: 10,
    stateCode: 'AP',
    isRuralPanchayat: false,
    category: 'Roads',
    subIssueCode: 'ROAD_STANDARD_POTHOLE_FOOTPATH',
    latitude: 16.30680, // ~11 meters away
    longitude: 80.43650,
    gpsAccuracyMeters: 4.0,
    description: 'Road cave-in developing above pipeline leak.',
    cvConfidence: 0.90,
    nlpUrgencyScore: 3,
    assignedDepartment: 'Ward Junior Engineer (Roads)',
    assignedOfficerContact: null,
  });

  if (
    roadReport.stackId === waterReport.stackId &&
    roadReport.matchMode === 'Compound_Cross_Category' &&
    roadReport.kEffectiveThreshold === 1 &&
    roadReport.authorityNotified === true
  ) {
    console.log(
      `[PASS] Test 4 -> Co-located Water + Roads hazard within 12m coupled into Mode B Compound Stack (${roadReport.stackCode}) with immediate K=1 emergency dispatch!`
    );
  } else {
    throw new Error(`Test 4 Failed: Expected Mode B Compound Cross-Category match, got ${JSON.stringify(roadReport)}`);
  }

  // TEST 5: Anti-Sybil Duplicate User Protection
  console.log('\n[TEST 5] Anti-Sybil Duplicate User Protection (Same User Multiple Reports)');
  engine.resetInMemoryStore();

  const sybilUserId = 'usr-sybil-spammer-007';
  let lastSybilResult: any = null;

  for (let i = 1; i <= 3; i++) {
    lastSybilResult = await engine.processAndStackComplaint({
      complaintId: `cmp-sybil-${i}`,
      ticketNumber: `CIV-2026-AP-SYBIL-${i}`,
      userId: sybilUserId,
      districtId: 10,
      stateCode: 'AP',
      isRuralPanchayat: false,
      category: 'Roads',
      subIssueCode: 'ROAD_STANDARD_POTHOLE_FOOTPATH',
      latitude: 16.3067,
      longitude: 80.4365,
      gpsAccuracyMeters: 4.0,
      description: `Pothole on street report attempt #${i}`,
      cvConfidence: 0.88,
      nlpUrgencyScore: 3,
      assignedDepartment: 'Ward Junior Engineer (Roads)',
      assignedOfficerContact: null,
    });
  }

  if (
    lastSybilResult.rawReportCount === 3 &&
    lastSybilResult.uniqueCitizenCount === 1 &&
    lastSybilResult.actionTaken === 'STACKED_STILL_BUFFERING'
  ) {
    console.log(
      `[PASS] Test 5 -> Anti-Sybil Protection Verified: raw_report_count = ${lastSybilResult.rawReportCount}, unique_citizen_count = ${lastSybilResult.uniqueCitizenCount}. Stack remains Buffering (1/3). Spam defeated!`
    );
  } else {
    throw new Error(`Test 5 Failed: Expected 1 unique citizen, got ${JSON.stringify(lastSybilResult)}`);
  }

  // TEST 6: Starvation Guard (T_max) Auto-Flush
  console.log('\n[TEST 6] Starvation Guard (T_max) Auto-Flush for Low-Density Isolated Streets');
  engine.resetInMemoryStore();

  const lonelyReport = await engine.processAndStackComplaint({
    complaintId: 'cmp-lonely-01',
    ticketNumber: 'CIV-2026-AP-LONELY',
    userId: 'usr-lonely-citizen',
    districtId: 10,
    stateCode: 'AP',
    isRuralPanchayat: false,
    category: 'Roads',
    subIssueCode: 'ROAD_STANDARD_POTHOLE_FOOTPATH',
    latitude: 16.3067,
    longitude: 80.4365,
    gpsAccuracyMeters: 4.0,
    description: 'Pothole on a quiet dead-end street with low foot traffic.',
    cvConfidence: 0.85,
    nlpUrgencyScore: 3,
    assignedDepartment: 'Ward Junior Engineer (Roads)',
    assignedOfficerContact: null,
  });

  if (lonelyReport.actionTaken === 'CREATED_AND_BUFFERING') {
    console.log(`[PASS] Test 6.1 -> Initial isolated complaint is Buffering (1/3) with T_max = 360 mins.`);
  }

  // Simulate time travel 7 hours into the future (beyond T_max = 6 hours)
  const futureDate = new Date(Date.now() + 7 * 60 * 60 * 1000);
  const flushedCount = await engine.flushExpiredBufferingStacks(futureDate);
  const updatedStack = engine.getStackByCode(lonelyReport.stackCode);

  if (flushedCount === 1 && updatedStack?.stackStatus === 'Dispatched' && updatedStack.dispatchReadinessScore === 100.0) {
    console.log(`[PASS] Test 6.2 -> Starvation Guard flushed expired stack (${lonelyReport.stackCode}) to 'Dispatched'! No citizen left in limbo.`);
  } else {
    throw new Error(`Test 6.2 Failed: Expected stack flush to Dispatched, got ${JSON.stringify(updatedStack)}`);
  }

  // TEST 7: HTTP Gateway Integration Test
  console.log('\n[TEST 7] HTTP API Gateway Integration Test (/api/v1/complaints & /stacks)');
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(3003, resolve));

  try {
    const httpRes = await fetch('http://localhost:3003/api/v1/complaints', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'usr-http-test-01',
      },
      body: JSON.stringify({
        category: 'Water',
        district_id: 10,
        latitude: 16.3067,
        longitude: 80.4365,
        address_text: 'Ward 14, Main Road, Guntur',
        description: 'Severe water supply disruption with dirty brown water coming from taps.',
      }),
    });

    const httpData = await httpRes.json();
    if (httpRes.ok && httpData.stack_result) {
      console.log(`[PASS] Test 7.1 -> POST /api/v1/complaints returned stack_result: Stack ${httpData.stack_result.stackCode}`);
    } else {
      throw new Error(`Test 7.1 Failed: ${JSON.stringify(httpData)}`);
    }

    // Nearby Stacks Query
    const nearbyRes = await fetch('http://localhost:3003/api/v1/complaints/stacks/nearby?lat=16.3067&lng=80.4365&radius=500&districtId=10');
    const nearbyData = await nearbyRes.json();
    if (nearbyRes.ok && nearbyData.count > 0) {
      console.log(`[PASS] Test 7.2 -> GET /api/v1/complaints/stacks/nearby found ${nearbyData.count} active incident stack(s)`);
    } else {
      throw new Error(`Test 7.2 Failed: ${JSON.stringify(nearbyData)}`);
    }

    // One-Tap Join Stack
    const joinRes = await fetch(`http://localhost:3003/api/v1/complaints/stacks/${httpData.stack_result.stackCode}/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'usr-http-test-02',
      },
      body: JSON.stringify({}),
    });
    const joinData = await joinRes.json();
    if (joinRes.ok && joinData.stack_result) {
      console.log(`[PASS] Test 7.3 -> POST /stacks/:stackCode/join successfully stacked second citizen report (+1 Priority)`);
    } else {
      throw new Error(`Test 7.3 Failed: ${JSON.stringify(joinData)}`);
    }
  } finally {
    server.close();
  }

  console.log('\n================================================================================');
  console.log('ALL 7 SMART COMPLAINT STACKING & DISPATCH ENGINE TESTS PASSED WITH 100% SUCCESS');
  console.log('================================================================================\n');
}

runStackingVerificationSuite().catch((err) => {
  console.error('\n[FATAL TEST FAILURE]:', err);
  process.exit(1);
});

