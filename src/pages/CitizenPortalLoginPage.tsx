import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRegion } from '../context/RegionContext';
import { RegionLocationBanner } from '../components/RegionLocationBanner';
import { CallPoliceButton } from '../components/CallPoliceButton';
import { EmergencyHelplinesDrawer } from '../components/EmergencyHelplinesDrawer';

export const CitizenPortalLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { loginCitizen } = useAuth();
  const { isHelplinesDrawerOpen, setIsHelplinesDrawerOpen } = useRegion();

  const [citizenPhone, setCitizenPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [virtualSmsToast, setVirtualSmsToast] = useState<string | null>(null);

  const cleanPhone = citizenPhone.replace(/\D/g, '');
  const isValidPhone = cleanPhone.length === 10;
  const isValidOtp = otpCode.trim().length === 6;

  // Masked phone display: e.g. +91 98480 ****21
  const maskedPhone = cleanPhone.length === 10
    ? `+91 ${cleanPhone.slice(0, 5)} ****${cleanPhone.slice(8)}`
    : `+91 ${cleanPhone}`;

  // Resend cooldown timer tick
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 10);
    setCitizenPhone(raw);
    setErrorMsg(null);
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    if (!isValidPhone) {
      setErrorMsg('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    if (resendCooldown > 0) {
      setErrorMsg(`Please wait ${resendCooldown} seconds before requesting a new OTP.`);
      return;
    }

    setIsSendingOtp(true);
    try {
      const res = await fetch('/api/v1/auth/citizen/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: cleanPhone,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch verification OTP.');
      }

      setOtpSent(true);
      setOtpCode(''); // Never auto-fill OTP field; require manual user input
      setResendCooldown(30);

      if (data.virtualSmsToast) {
        setVirtualSmsToast(data.virtualSmsToast);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to dispatch verification code. Please retry.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!isValidOtp) {
      setErrorMsg('Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/citizen/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: cleanPhone,
          otpCode: otpCode.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'OTP verification failed');
      }

      // Attach { role: 'citizen' } and store in session
      loginCitizen(data.accessToken, {
        userId: data.user?.userId || `usr-cit-${cleanPhone.slice(-4)}`,
        phone: `+91 ${cleanPhone}`,
        role: 'Citizen',
        default_district_id: data.user?.defaultDistrictId || 10,
      });

      navigate('/citizen/dashboard');
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification failed. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  // Google OAuth 1-Click Simulation / Flow
  const handleGoogleSignIn = () => {
    setIsGoogleLoading(true);
    setErrorMsg(null);

    setTimeout(() => {
      const demoToken = `cit-google-token-${Date.now()}`;
      loginCitizen(demoToken, {
        userId: `usr-cit-google-${Date.now().toString(36)}`,
        fullName: 'vgiri',
        email: 'citizen.vgiri@gmail.com',
        authMethod: 'google',
        role: 'Citizen',
        default_district_id: 10,
        state: 'Andhra Pradesh',
        district: 'Guntur',
      });
      setIsGoogleLoading(false);
      navigate('/citizen/dashboard');
    }, 600);
  };

  return (
    <div className="min-h-dvh bg-stitch-surface-canvas flex flex-col justify-between font-sans text-stitch-ink-primary">
      {/* 1. Automated Location & Regional Server Bar */}
      <RegionLocationBanner onOpenHelplines={() => setIsHelplinesDrawerOpen(true)} />

      {/* 2. Header with Call Police (100) & ERSS 112 */}
      <header className="bg-stitch-navy text-white py-4 px-6 shadow-stitch-sm border-b-2 border-stitch-terracotta">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-stitch-btn bg-white/10 border border-white/20 flex flex-col items-center justify-center text-stitch-terracotta-light shrink-0">
              <span className="text-[9px] font-mono font-bold leading-none text-stitch-terracotta">GOV</span>
              <span className="text-xs font-black tracking-widest text-white leading-tight">IN</span>
            </div>
            <div>
              <p className="text-[11px] font-mono text-stitch-terracotta uppercase tracking-wider font-extrabold">
                DIGITAL INDIA • CITIZEN GRIEVANCE REDRESSAL
              </p>
              <h1 className="text-h2 font-black tracking-tight text-white">Civic Helpline India</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <CallPoliceButton variant="header" />
            <a
              href="tel:112"
              className="min-h-touch px-3.5 py-1.5 rounded-stitch-btn bg-stitch-emergency hover:bg-stitch-emergency-hover text-white font-bold text-xs flex items-center gap-1.5 shadow-stitch-sm transition-all uppercase"
            >
              <span className="material-symbols-outlined text-sm">emergency</span>
              <span>112 Emergency</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Authentication Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md rounded-stitch-card bg-white border border-stitch-surface-border shadow-stitch-md p-6 sm:p-8 space-y-6">
          {/* Back to Role Selection Button */}
          <div className="flex items-center justify-between">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-stitch-navy hover:text-stitch-terracotta transition-colors min-h-touch py-1 px-2 rounded-stitch-btn hover:bg-stitch-navy-tint/50"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              <span>Back to Role Selection</span>
            </Link>

            <span className="px-2.5 py-0.5 rounded-stitch-pill bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-mono font-bold">
              Citizen Portal
            </span>
          </div>

          {/* Heading */}
          <div className="space-y-1">
            <h2 className="text-h2 font-extrabold text-stitch-ink-primary">
              Citizen Sign In
            </h2>
            <p className="text-xs text-stitch-ink-secondary">
              Report civic defects, attach photo evidence, and track SLA countdowns in your ward.
            </p>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-stitch-btn bg-stitch-emergency-surface border border-stitch-emergency-border text-stitch-emergency text-xs font-semibold flex items-center gap-2">
              <span className="material-symbols-outlined text-sm shrink-0">warning</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* One-Click Google Authentication */}
          <button
            type="button"
            disabled={isGoogleLoading}
            onClick={handleGoogleSignIn}
            className="w-full min-h-touch py-2.5 px-4 rounded-stitch-btn border border-stitch-surface-border hover:bg-slate-50 text-xs font-bold text-stitch-ink-primary flex items-center justify-center gap-2.5 shadow-stitch-sm transition-all disabled:opacity-50"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{isGoogleLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
          </button>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-stitch-surface-border w-full" />
            <span className="bg-white px-2 text-[10px] font-mono text-slate-400 font-bold uppercase shrink-0">
              OR WITH MOBILE OTP
            </span>
          </div>

          {/* Virtual SMS Notification Toast / Delivery Banner */}
          {virtualSmsToast && (
            <div className="p-3.5 rounded-stitch-btn bg-blue-50 border border-blue-200 text-blue-950 text-xs shadow-stitch-sm flex items-start gap-2.5 animate-fadeIn">
              <span className="material-symbols-outlined text-base text-blue-700 shrink-0 mt-0.5">sms</span>
              <div className="flex-1">
                <span className="font-mono text-[10px] font-bold text-blue-800 uppercase block tracking-wider">
                  Automated Gateway Delivery
                </span>
                <p className="font-medium text-xs text-blue-900 mt-0.5 leading-snug">
                  {virtualSmsToast}
                </p>
              </div>
            </div>
          )}

          {/* Phone Number / OTP Form */}
          {!otpSent ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stitch-ink-primary mb-1">
                  10-Digit Mobile Number
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3.5 rounded-l-stitch-btn border border-r-0 border-stitch-surface-border bg-stitch-surface-muted font-mono text-sm font-bold text-stitch-ink-secondary">
                    +91
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    value={citizenPhone}
                    onChange={handlePhoneChange}
                    placeholder="9876543210"
                    disabled={isSendingOtp}
                    className="w-full min-h-touch px-3 rounded-r-stitch-btn border border-stitch-surface-border font-mono text-sm font-bold text-stitch-ink-primary placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-stitch-navy"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  A fresh, cryptographically random 6-digit SMS OTP will be generated and dispatched.
                </p>
              </div>

              <button
                type="submit"
                disabled={!isValidPhone || isSendingOtp}
                className="w-full min-h-touch py-2.5 px-4 rounded-stitch-btn bg-stitch-navy hover:bg-stitch-navy-dark text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-stitch-sm transition-all disabled:opacity-50"
              >
                <span>{isSendingOtp ? 'Dispatching SMS OTP...' : 'Send Verification OTP'}</span>
                <span className="material-symbols-outlined text-sm">send</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="p-3 rounded-stitch-btn bg-stitch-surface-muted border border-stitch-surface-border flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">OTP Dispatched to:</span>
                  <span className="font-mono text-xs font-bold text-stitch-ink-primary">{maskedPhone}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setOtpSent(false);
                    setOtpCode('');
                    setVirtualSmsToast(null);
                  }}
                  className="text-xs text-stitch-terracotta underline font-bold"
                >
                  Edit Number
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-stitch-ink-primary mb-1">
                  Enter 6-Digit SMS OTP
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="------"
                  autoComplete="one-time-code"
                  className="w-full min-h-touch px-3 text-center tracking-[0.3em] font-mono text-lg font-bold rounded-stitch-btn border border-stitch-surface-border focus:outline-none focus:ring-2 focus:ring-stitch-navy"
                />
                <p className="text-[11px] text-slate-500 mt-1 text-center">
                  Enter the 6-digit code received via SMS notification above.
                </p>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-stitch-ink-secondary">Didn't receive code?</span>
                <button
                  type="button"
                  disabled={resendCooldown > 0 || isSendingOtp}
                  onClick={() => handleSendOtp()}
                  className="font-bold text-stitch-navy hover:text-stitch-terracotta transition-colors disabled:text-slate-400 disabled:cursor-not-allowed"
                >
                  {resendCooldown > 0
                    ? `Resend OTP in ${resendCooldown}s`
                    : isSendingOtp
                    ? 'Resending...'
                    : 'Resend OTP'}
                </button>
              </div>

              <button
                type="submit"
                disabled={!isValidOtp || loading}
                className="w-full min-h-touch py-2.5 px-4 rounded-stitch-btn bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-stitch-sm transition-all disabled:opacity-50"
              >
                <span>{loading ? 'Verifying OTP...' : 'Verify OTP & Enter Portal'}</span>
                <span className="material-symbols-outlined text-sm">verified_user</span>
              </button>
            </form>
          )}

          {/* Quick-Switch to Officer Portal in Footer */}
          <div className="pt-4 border-t border-stitch-surface-border text-center text-xs text-slate-500">
            <span>Are you a municipal or nodal officer? </span>
            <Link
              to="/login/officer"
              className="text-stitch-terracotta hover:underline font-bold"
            >
              Switch to Officer Login →
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-stitch-surface-border bg-white py-3 px-6 text-center text-xs text-slate-500">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <span>Digital Personal Data Protection (DPDP) Act 2023 Compliant</span>
          <span className="font-mono text-[11px]">Sovereign Civic Infrastructure</span>
        </div>
      </footer>

      {/* Dynamic Emergency Helplines Drawer */}
      <EmergencyHelplinesDrawer
        isOpen={isHelplinesDrawerOpen}
        onClose={() => setIsHelplinesDrawerOpen(false)}
      />
    </div>
  );
};

export default CitizenPortalLoginPage;
