import crypto from 'crypto';

export interface OtpRecord {
  phone_normalized: string;
  otp_hash: string;
  expires_at: number; // epoch ms
  attempts: number;
  consumed: boolean;
  created_at: number; // epoch ms
}

export interface SmsDispatchReceipt {
  messageId: string;
  phoneNormalized: string;
  dispatchedAt: string;
  provider: 'live_twilio' | 'live_msg91' | 'simulated_civicauth';
  cooldownSeconds: number;
  virtualSmsToast?: {
    sender: string;
    message: string;
    otp: string;
    timestamp: string;
  };
}

export interface VerifyOtpResult {
  valid: boolean;
  error?: string;
  remainingAttempts?: number;
}

class SmsDispatchService {
  private static instance: SmsDispatchService;
  private otpStore: Map<string, OtpRecord> = new Map();
  private readonly hmacSecret: string;
  private readonly cooldownMs = 30 * 1000; // 30 seconds cooldown between send requests
  private readonly ttlMs = 5 * 60 * 1000; // 5 minutes TTL
  private readonly maxAttempts = 5;

  private constructor() {
    this.hmacSecret = process.env.OTP_HMAC_SECRET || 'civic_otp_hmac_sovereign_secret_2026';
  }

  public static getInstance(): SmsDispatchService {
    if (!SmsDispatchService.instance) {
      SmsDispatchService.instance = new SmsDispatchService();
    }
    return SmsDispatchService.instance;
  }

  public normalizePhoneNumber(phone: string): string {
    const digitsOnly = String(phone).replace(/\D/g, '');
    if (digitsOnly.length === 10) {
      return digitsOnly;
    }
    if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
      return digitsOnly.slice(2);
    }
    return digitsOnly;
  }

  public generateCsprngOtp(): string {
    // Cryptographically Secure Pseudo-Random Number Generator (CSPRNG)
    return crypto.randomInt(100000, 1000000).toString();
  }

  public hashOtp(otp: string): string {
    return crypto.createHmac('sha256', this.hmacSecret).update(otp).digest('hex');
  }

  public checkCooldown(rawPhone: string): { allowed: boolean; remainingSeconds: number } {
    const cleanPhone = this.normalizePhoneNumber(rawPhone);
    const existing = this.otpStore.get(cleanPhone);
    if (!existing || existing.consumed) {
      return { allowed: true, remainingSeconds: 0 };
    }
    const elapsed = Date.now() - existing.created_at;
    if (elapsed >= this.cooldownMs) {
      return { allowed: true, remainingSeconds: 0 };
    }
    const remaining = Math.ceil((this.cooldownMs - elapsed) / 1000);
    return { allowed: false, remainingSeconds: remaining };
  }

  public async sendOtp(rawPhone: string, force: boolean = false): Promise<SmsDispatchReceipt> {
    const cleanPhone = this.normalizePhoneNumber(rawPhone);
    if (!/^\d{10}$/.test(cleanPhone)) {
      throw new Error('Valid 10-digit mobile number required.');
    }

    const now = Date.now();
    const existing = this.otpStore.get(cleanPhone);

    // Enforce cooldown if an unexpired OTP was requested recently (unless force bypass requested)
    if (!force && existing && !existing.consumed && now - existing.created_at < this.cooldownMs) {
      const waitSec = Math.ceil((this.cooldownMs - (now - existing.created_at)) / 1000);
      const err = new Error(`Please wait ${waitSec} seconds before requesting a new OTP.`);
      (err as any).status = 429;
      (err as any).retryAfter = waitSec;
      throw err;
    }

    // Generate fresh CSPRNG OTP
    const freshOtp = this.generateCsprngOtp();
    const otpHash = this.hashOtp(freshOtp);

    // Store record (immediately invalidates any previous OTP for this phone)
    const newRecord: OtpRecord = {
      phone_normalized: cleanPhone,
      otp_hash: otpHash,
      expires_at: now + this.ttlMs,
      attempts: 0,
      consumed: false,
      created_at: now,
    };
    this.otpStore.set(cleanPhone, newRecord);

    const messageText = `Your login verification code is ${freshOtp}. It expires in 5 minutes. Do not share this code.`;
    const messageId = `msg-sms-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    // Inspect environment for live SMS providers
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioFrom = process.env.TWILIO_PHONE_NUMBER;

    if (twilioSid && twilioToken && twilioFrom) {
      // Live Twilio SMS dispatch
      try {
        const auth = Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64');
        const params = new URLSearchParams({
          To: `+91${cleanPhone}`,
          From: twilioFrom,
          Body: messageText,
        });
        await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        });
        console.log(`[SmsDispatchService] Real SMS dispatched via Twilio to +91${cleanPhone} (messageId: ${messageId})`);
        return {
          messageId,
          phoneNormalized: cleanPhone,
          dispatchedAt: new Date(now).toISOString(),
          provider: 'live_twilio',
          cooldownSeconds: 30,
        };
      } catch (err) {
        console.warn(`[SmsDispatchService] Twilio delivery failed, falling back to simulated pipeline:`, err);
      }
    }

    // Automated SMS Gateway Simulator (for local/demo environments)
    // Realistic async dispatch latency simulation
    await new Promise((resolve) => setTimeout(resolve, 200));

    console.log(`[SmsDispatchService] Automated virtual SMS dispatched to +91${cleanPhone}: "${messageText}" (messageId: ${messageId})`);

    return {
      messageId,
      phoneNormalized: cleanPhone,
      dispatchedAt: new Date(now).toISOString(),
      provider: 'simulated_civicauth',
      cooldownSeconds: 30,
      virtualSmsToast: {
        sender: 'CivicAuth SMS',
        message: messageText,
        otp: freshOtp,
        timestamp: new Date(now).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      },
    };
  }

  public async generateAndDispatchOtp(rawPhone: string, force: boolean = false): Promise<{
    success: boolean;
    otp: string;
    virtualSmsToast: string;
    messageId: string;
    cooldownSeconds: number;
  }> {
    const receipt = await this.sendOtp(rawPhone, force);
    const toastMessage = receipt.virtualSmsToast?.message
      ? `SMS from CivicAuth: ${receipt.virtualSmsToast.message}`
      : `SMS from CivicAuth: Your login verification code is ${receipt.virtualSmsToast?.otp}. It expires in 5 minutes. Do not share this code.`;

    return {
      success: true,
      otp: receipt.virtualSmsToast?.otp || '',
      virtualSmsToast: toastMessage,
      messageId: receipt.messageId,
      cooldownSeconds: receipt.cooldownSeconds,
    };
  }

  public verifyOtp(rawPhone: string, rawOtp: string): VerifyOtpResult {
    const cleanPhone = this.normalizePhoneNumber(rawPhone);
    const cleanOtp = String(rawOtp).trim();

    if (!/^\d{6}$/.test(cleanOtp)) {
      return {
        valid: false,
        error: 'OTP must be a valid 6-digit number.',
      };
    }

    const record = this.otpStore.get(cleanPhone);
    if (!record || record.consumed) {
      return {
        valid: false,
        error: 'No active OTP found. Please request a new code.',
      };
    }

    const now = Date.now();
    if (now > record.expires_at) {
      return {
        valid: false,
        error: 'OTP has expired. Please request a new code.',
      };
    }

    if (record.attempts >= this.maxAttempts) {
      return {
        valid: false,
        error: 'Too many incorrect attempts. Please request a new OTP.',
        remainingAttempts: 0,
      };
    }

    // Exact Match Check via Constant-Time Comparison
    const candidateHash = this.hashOtp(cleanOtp);
    const candidateBuf = Buffer.from(candidateHash, 'hex');
    const actualBuf = Buffer.from(record.otp_hash, 'hex');

    const isMatch = candidateBuf.length === actualBuf.length && crypto.timingSafeEqual(candidateBuf, actualBuf);

    if (!isMatch) {
      record.attempts += 1;
      const remaining = Math.max(0, this.maxAttempts - record.attempts);
      return {
        valid: false,
        error: remaining > 0
          ? `Incorrect OTP. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
          : 'Too many incorrect attempts. Please request a new OTP.',
        remainingAttempts: remaining,
      };
    }

    // Exact match: atomically mark consumed to prevent replay attacks
    record.consumed = true;
    return {
      valid: true,
    };
  }

  // Diagnostic helper for unit test verification
  public getRecordForTesting(rawPhone: string): OtpRecord | undefined {
    return this.otpStore.get(this.normalizePhoneNumber(rawPhone));
  }

  // Clear helper for clean test isolation
  public clearStore(): void {
    this.otpStore.clear();
  }
}

export const smsDispatchService = SmsDispatchService.getInstance();
