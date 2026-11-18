/**
 * TEST SUITE: RANDOMIZED USER SMS OTP & OFFICER DIRECT LOGIN STREAMLINING
 * Verifies:
 * 1. Randomized OTP (CSPRNG, distinct codes, previous code invalidated)
 * 2. Automated SMS Dispatch (async dispatch receipt, virtual SMS notification toast)
 * 3. Successful Citizen Verification (valid OTP, atomic consumption, JWT issue)
 * 4. Failed User Login & Replay Prevention (mismatch increments attempts, replay rejected)
 * 5. Resend Cooldown Enforcement (429 rejection within cooldown window)
 * 6. Officer Direct Phone Login (zero OTP, zero badge, valid officer JWT issued)
 * 7. Officer Unauthorized Phone Rejection (non-directory phone rejected with 401)
 */

import { smsDispatchService } from '../src/services/smsDispatchService';

const BASE_URL = 'http://localhost:3001';

async function runRandomOtpAndOfficerDirectTestSuite() {
  console.log('[TEST SUITE] Starting Randomized User SMS OTP & Officer Direct Login Verification...');
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
  // 1. UNIT TEST: CSPRNG RANDOMNESS & PREVIOUS CODE INVALIDATION
  // -------------------------------------------------------------------------
  console.log('\n--- 1. Testing CSPRNG Randomness & Code Invalidation ---');

  const testPhoneA = '9999900001';
  smsDispatchService.clearStore();

  const dispatch1 = await smsDispatchService.generateAndDispatchOtp(testPhoneA);
  assert(dispatch1.success === true, 'First OTP generated and dispatched');
  assert(/^\d{6}$/.test(dispatch1.otp), 'First OTP is a valid 6-digit numeric string');

  // Immediately generate second OTP for same phone (forcing past cooldown for invalidation test)
  const dispatch2 = await smsDispatchService.generateAndDispatchOtp(testPhoneA, true);
  assert(dispatch2.success === true, 'Second OTP generated and dispatched');
  assert(/^\d{6}$/.test(dispatch2.otp), 'Second OTP is a valid 6-digit numeric string');

  // Verify consecutive OTPs are fresh and distinct
  console.log(`Generated OTP 1: ${dispatch1.otp}, OTP 2: ${dispatch2.otp}`);
  assert(dispatch1.otp !== dispatch2.otp, 'Two consecutive OTP requests generate distinct random codes');

  // Verify the first OTP is immediately invalidated
  const verifyOldRes = smsDispatchService.verifyOtp(testPhoneA, dispatch1.otp);
  assert(verifyOldRes.valid === false, 'First OTP is immediately invalidated after second OTP generation');
  assert(verifyOldRes.error?.includes('Incorrect OTP') === true, 'Rejection specifies incorrect OTP');

  // Verify the second OTP is valid
  const verifyNewRes = smsDispatchService.verifyOtp(testPhoneA, dispatch2.otp);
  assert(verifyNewRes.valid === true, 'Second (latest) OTP verifies successfully');

  // -------------------------------------------------------------------------
  // 2. SIMULATED SMS DELIVERY & VIRTUAL NOTIFICATION TOAST
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Testing Automated SMS Gateway Dispatch & Virtual Toast ---');

  const testPhoneB = '9999900002';
  const dispatchB = await smsDispatchService.generateAndDispatchOtp(testPhoneB);
  assert(Boolean(dispatchB.messageId), 'Dispatch returned unique messageId receipt');
  assert(
    dispatchB.virtualSmsToast.startsWith('SMS from CivicAuth:'),
    'Virtual SMS toast matches expected notification format'
  );
  assert(
    dispatchB.virtualSmsToast.includes(dispatchB.otp),
    'Virtual SMS toast surfaces the delivered OTP code'
  );
  assert(
    dispatchB.virtualSmsToast.includes('It expires in 5 minutes. Do not share this code.'),
    'Virtual SMS message contains mandatory security warning'
  );

  // -------------------------------------------------------------------------
  // 3. SUCCESSFUL USER LOGIN & CONSUMPTION ATOMICTY
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Testing User Login & Atomic OTP Consumption ---');

  const testPhoneC = '9876500003';
  const dispatchC = await smsDispatchService.generateAndDispatchOtp(testPhoneC);

  // Initial verification must succeed
  const verifyC1 = smsDispatchService.verifyOtp(testPhoneC, dispatchC.otp);
  assert(verifyC1.valid === true, 'Initial verification of fresh OTP succeeds');

  // Immediate subsequent verification with same OTP must fail (replay prevention)
  const verifyC2 = smsDispatchService.verifyOtp(testPhoneC, dispatchC.otp);
  assert(verifyC2.valid === false, 'Replaying consumed OTP is rejected');
  assert(verifyC2.error?.includes('consumed') || verifyC2.error?.includes('active'), 'Error indicates consumed/inactive OTP');

  // -------------------------------------------------------------------------
  // 4. INCORRECT OTP ATTEMPTS & RATE LIMITING
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Testing Mismatch Attempts Decrement & Lockout ---');

  const testPhoneD = '9876500004';
  const dispatchD = await smsDispatchService.generateAndDispatchOtp(testPhoneD);

  // Send 5 incorrect OTP attempts
  for (let attempt = 1; attempt <= 5; attempt++) {
    const wrongRes = smsDispatchService.verifyOtp(testPhoneD, '000000');
    assert(wrongRes.valid === false, `Wrong OTP attempt #${attempt} rejected`);
    if (attempt < 5) {
      assert(wrongRes.remainingAttempts === 5 - attempt, `Remaining attempts accurately tracked: ${5 - attempt}`);
    } else {
      assert(wrongRes.error?.includes('Too many incorrect attempts') === true, 'Max attempts lockout triggered');
    }
  }

  // Even the correct OTP is now rejected because max attempts were exhausted
  const lockoutRes = smsDispatchService.verifyOtp(testPhoneD, dispatchD.otp);
  assert(lockoutRes.valid === false, 'Correct OTP rejected after max attempts exceeded');
  assert(lockoutRes.error?.includes('Too many incorrect attempts') === true, 'Lockout enforced on correct OTP');

  // -------------------------------------------------------------------------
  // 5. RESEND COOLDOWN ENFORCEMENT
  // -------------------------------------------------------------------------
  console.log('\n--- 5. Testing Resend Cooldown Enforcement ---');

  const testPhoneE = '9876500005';
  await smsDispatchService.generateAndDispatchOtp(testPhoneE);

  // Calling checkCooldown immediately should report active cooldown
  const cooldownCheck = smsDispatchService.checkCooldown(testPhoneE);
  assert(cooldownCheck.allowed === false, 'Immediate resend is blocked by cooldown');
  assert(cooldownCheck.remainingSeconds > 0 && cooldownCheck.remainingSeconds <= 30, 'Remaining cooldown seconds tracked');

  // -------------------------------------------------------------------------
  // 6. END-TO-END HTTP INTEGRATION: CITIZEN SEND-OTP & VERIFY-OTP
  // -------------------------------------------------------------------------
  console.log('\n--- 6. Testing End-to-End HTTP Citizen Endpoints ---');

  const httpCitizenPhone = '9876512345';

  // Step 6.1: Send OTP via HTTP endpoint
  const sendRes = await fetch(`${BASE_URL}/api/v1/auth/citizen/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber: httpCitizenPhone }),
  });
  assert(sendRes.status === 200, 'POST /api/v1/auth/citizen/send-otp returned HTTP 200');
  const sendData = await sendRes.json();
  assert(sendData.success === true, 'Citizen send-otp response reported success');
  assert(Boolean(sendData.virtualSmsToast), 'Citizen send-otp returned virtualSmsToast');

  // Extract delivered OTP from virtual SMS toast for verification
  const match = sendData.virtualSmsToast.match(/code is (\d{6})/);
  assert(Boolean(match && match[1]), 'Extracted 6-digit OTP from virtual delivery message');
  const deliveredOtp = match[1];

  // Step 6.2: Resend within cooldown must fail with HTTP 429
  const resendCooldownRes = await fetch(`${BASE_URL}/api/v1/auth/citizen/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber: httpCitizenPhone }),
  });
  assert(resendCooldownRes.status === 429, 'Immediate resend OTP rejected with HTTP 429 Too Many Requests');
  const cooldownData = await resendCooldownRes.json();
  assert(cooldownData.error.includes('Please wait'), '429 error message references wait time');

  // Step 6.3: Verify wrong OTP returns HTTP 401
  const wrongVerifyRes = await fetch(`${BASE_URL}/api/v1/auth/citizen/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber: httpCitizenPhone, otpCode: '999999' }),
  });
  assert(wrongVerifyRes.status === 401, 'Wrong OTP rejected with HTTP 401');

  // Step 6.4: Verify with delivered OTP returns HTTP 200 and Citizen JWT
  const successVerifyRes = await fetch(`${BASE_URL}/api/v1/auth/citizen/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber: httpCitizenPhone, otpCode: deliveredOtp }),
  });
  assert(successVerifyRes.status === 200, 'Delivered OTP verified successfully with HTTP 200');
  const verifyData = await successVerifyRes.json();
  assert(verifyData.persona === 'CITIZEN', 'Verified persona is CITIZEN');
  assert(Boolean(verifyData.accessToken), 'Citizen JWT accessToken generated');
  assert(verifyData.redirectUrl === '/citizen/dashboard', 'Redirect URL set to /citizen/dashboard');

  // Step 6.5: Verify replay of consumed OTP returns HTTP 401
  const replayVerifyRes = await fetch(`${BASE_URL}/api/v1/auth/citizen/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber: httpCitizenPhone, otpCode: deliveredOtp }),
  });
  assert(replayVerifyRes.status === 401, 'Replay of consumed OTP rejected with HTTP 401');

  // -------------------------------------------------------------------------
  // 7. END-TO-END HTTP INTEGRATION: OFFICER DIRECT LOGIN (NO OTP, NO BADGE)
  // -------------------------------------------------------------------------
  console.log('\n--- 7. Testing End-to-End HTTP Officer Direct Login (Zero OTP / Badge) ---');

  // Step 7.1: Valid Registered Officer Phone - Direct Login
  const officerLoginRes = await fetch(`${BASE_URL}/api/v1/auth/officer/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber: '9848011221' }), // Guntur Water Official
  });
  assert(officerLoginRes.status === 200, 'Officer direct login with phone only returned HTTP 200');
  const officerData = await officerLoginRes.json();
  assert(officerData.persona === 'OFFICER', 'Returned persona is OFFICER');
  assert(officerData.officer.assigned_category === 'Water', 'Officer category assigned to Water');
  assert(Boolean(officerData.accessToken), 'Officer JWT accessToken generated');
  assert(officerData.redirectUrl === '/officer/dashboard', 'Redirect URL set to /officer/dashboard');

  // Step 7.2: Another Directory Officer - Guntur Roads (9848011222)
  const roadsOfficerRes = await fetch(`${BASE_URL}/api/v1/auth/officer/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '9848011222' }),
  });
  assert(roadsOfficerRes.status === 200, 'Guntur Roads direct login returned HTTP 200');
  const roadsData = await roadsOfficerRes.json();
  assert(roadsData.officer.assigned_category === 'Roads', 'Officer category assigned to Roads');

  // Step 7.3: Unauthorized Non-Officer Phone Number
  const unauthOfficerRes = await fetch(`${BASE_URL}/api/v1/auth/officer/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber: '9999999999' }),
  });
  assert(
    unauthOfficerRes.status === 401 || unauthOfficerRes.status === 403,
    'Unregistered phone number rejected with HTTP 401/403'
  );
  const unauthData = await unauthOfficerRes.json();
  assert(
    unauthData.error?.includes('not registered') || unauthData.error?.includes('Officer'),
    'Error message clearly explains phone is not registered as an Officer'
  );

  // Step 7.4: Empty or Malformed Phone Number
  const malformedOfficerRes = await fetch(`${BASE_URL}/api/v1/auth/officer/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber: '123' }),
  });
  assert(malformedOfficerRes.status === 400, 'Malformed officer phone rejected with HTTP 400');

  console.log(`\n======================================================`);
  console.log(`ALL TESTS PASSED! (${testsPassed} assertions verified, 0 failures)`);
  console.log(`======================================================\n`);
}

runRandomOtpAndOfficerDirectTestSuite().catch((err) => {
  console.error('[TEST SUITE FATAL ERROR]:', err);
  process.exit(1);
});
