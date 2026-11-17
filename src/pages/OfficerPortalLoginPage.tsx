import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const OfficerPortalLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { loginOfficer } = useAuth();

  const [authMode, setAuthMode] = useState<'phone' | 'accessCode'>('phone');
  const [officerPhone, setOfficerPhone] = useState('9848011221');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('123456');
  const [accessCode, setAccessCode] = useState('GMC-OFF-44');
  const [showAccessCode, setShowAccessCode] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const cleanPhone = officerPhone.replace(/\D/g, '');
  const isValidPhone = cleanPhone.length === 10;
  const isValidOtp = otpCode.trim().length === 6;

  // Handle Phone + OTP submission
  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!otpSent) {
      if (!isValidPhone) {
        setErrorMsg('Please enter a valid 10-digit registered official mobile number.');
        return;
      }
      setOtpSent(true);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/officer/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: cleanPhone,
          otpCode: otpCode.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed. Unauthorized directory number.');
      }

      // Attach { role: 'officer' } and store in session
      loginOfficer(data.accessToken, data.officer);
      navigate('/officer/dashboard');
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Special Access Code submission
  const handleAccessCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!accessCode.trim()) {
      setErrorMsg('Please enter your Officer Badge ID or Special Access Code.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/officer/verify-access-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessCode: accessCode.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid Officer Access Code.');
      }

      // Attach { role: 'officer' } and store in session
      loginOfficer(data.accessToken, data.officer);
      navigate('/officer/dashboard');
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-slate-900 flex flex-col justify-between font-sans text-slate-100">
      {/* High-Security Sovereign Header */}
      <header className="bg-stitch-navy text-white py-4 px-6 shadow-stitch-sm border-b-2 border-stitch-terracotta">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-stitch-btn bg-white/10 border border-white/20 flex flex-col items-center justify-center text-stitch-terracotta-light shrink-0">
              <span className="text-[9px] font-mono font-bold leading-none text-stitch-terracotta">GOV</span>
              <span className="text-xs font-black tracking-widest text-white leading-tight">IN</span>
            </div>
            <div>
              <p className="text-[11px] font-mono text-stitch-terracotta uppercase tracking-wider font-extrabold">
                NIC S3WaaS • RESTRICTED GOV INTRANET
              </p>
              <h1 className="text-h2 font-black tracking-tight text-white">
                Municipal &amp; Nodal Officer Portal
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-stitch-terracotta">shield</span>
            <span className="font-mono text-xs text-slate-300 font-bold uppercase tracking-wider">
              AUTHORITY TERMINAL
            </span>
          </div>
        </div>
      </header>

      {/* Main Form Centerpiece */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-lg rounded-stitch-card bg-white border border-slate-700 shadow-stitch-floating p-6 sm:p-8 space-y-5 text-stitch-ink-primary">
          {/* Top Bar: Back Button & Desk Indicator */}
          <div className="flex items-center justify-between">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-stitch-navy hover:text-stitch-terracotta transition-colors min-h-touch py-1 px-2 rounded-stitch-btn hover:bg-slate-100"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              <span>Back to Role Selection</span>
            </Link>

            <span className="px-2.5 py-0.5 rounded-stitch-pill bg-amber-50 text-amber-900 border border-amber-300 text-[11px] font-mono font-bold">
              Restricted Desk
            </span>
          </div>

          {/* Security Notice Banner */}
          <div className="p-3 rounded-stitch-btn bg-amber-50 border border-amber-300 text-amber-950 text-xs font-medium flex items-center gap-2.5">
            <span className="material-symbols-outlined text-sm text-amber-700 shrink-0">security</span>
            <span>
              <strong>Authorized personnel only.</strong> All login attempts and IP addresses are audited and logged under IT Act 2000.
            </span>
          </div>

          {/* Heading */}
          <div className="space-y-1">
            <h2 className="text-h2 font-black text-stitch-ink-primary">
              Department Officer Sign In
            </h2>
            <p className="text-xs text-stitch-ink-secondary">
              Verify your registered official mobile number or badge ID to access your jurisdiction command queue.
            </p>
          </div>

          {/* Department / Jurisdiction Verification Indicator */}
          <div className="p-3 rounded-stitch-btn bg-slate-50 border border-stitch-surface-border text-xs text-stitch-ink-secondary space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-bold text-stitch-ink-primary">
                Jurisdiction Coverage:
              </span>
              <span className="text-[11px] font-mono text-emerald-700 font-bold">
                170 Districts Verified
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Supported Departments: Public Works (PWD/R&amp;B), Public Health (PHED/Jal Board), Urban Local Bodies (SBM/ULB), Power DISCOMs.
            </p>
          </div>

          {/* Auth Mode Toggle Tabs */}
          <div className="flex rounded-stitch-btn bg-slate-100 p-1 border border-stitch-surface-border">
            <button
              type="button"
              onClick={() => {
                setAuthMode('phone');
                setErrorMsg(null);
              }}
              className={`flex-1 min-h-touch py-2 text-xs font-bold rounded-stitch-btn transition-all ${
                authMode === 'phone'
                  ? 'bg-stitch-navy text-white shadow-stitch-sm'
                  : 'text-stitch-ink-secondary hover:text-stitch-ink-primary'
              }`}
            >
              Official Phone + OTP
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('accessCode');
                setErrorMsg(null);
              }}
              className={`flex-1 min-h-touch py-2 text-xs font-bold rounded-stitch-btn transition-all ${
                authMode === 'accessCode'
                  ? 'bg-stitch-navy text-white shadow-stitch-sm'
                  : 'text-stitch-ink-secondary hover:text-stitch-ink-primary'
              }`}
            >
              Badge ID / Access Code
            </button>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-stitch-btn bg-stitch-emergency-surface border border-stitch-emergency-border text-stitch-emergency text-xs font-semibold flex items-center gap-2">
              <span className="material-symbols-outlined text-sm shrink-0">error</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* MODE A: OFFICIAL PHONE + OTP */}
          {authMode === 'phone' && (
            <>
              {!otpSent ? (
                <form onSubmit={handlePhoneSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-stitch-ink-primary mb-1">
                      Official Registered Mobile Number
                    </label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3.5 rounded-l-stitch-btn border border-r-0 border-stitch-surface-border bg-stitch-surface-muted font-mono text-sm font-bold text-stitch-ink-secondary">
                        +91
                      </span>
                      <input
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel-national"
                        value={officerPhone}
                        onChange={(e) => {
                          setOfficerPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
                          setErrorMsg(null);
                        }}
                        placeholder="9848011221"
                        className="w-full min-h-touch px-3 rounded-r-stitch-btn border border-stitch-surface-border font-mono text-sm font-bold text-stitch-ink-primary placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-stitch-terracotta"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Must match an authorized phone number from the 2026 Administrative Directory.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={!isValidPhone}
                    className="w-full min-h-touch py-2.5 px-4 rounded-stitch-btn bg-stitch-terracotta hover:bg-stitch-terracotta-hover text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-stitch-sm transition-all disabled:opacity-50"
                  >
                    <span>Request Official SMS OTP</span>
                    <span className="material-symbols-outlined text-sm">send</span>
                  </button>
                </form>
              ) : (
                <form onSubmit={handlePhoneSubmit} className="space-y-4">
                  <div className="p-3 rounded-stitch-btn bg-stitch-surface-muted border border-stitch-surface-border flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-slate-500 uppercase block">Sending OTP to:</span>
                      <span className="font-mono text-xs font-bold text-stitch-ink-primary">+91 {cleanPhone}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setOtpSent(false);
                        setOtpCode('123456');
                      }}
                      className="text-xs text-stitch-terracotta underline font-bold"
                    >
                      Change
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stitch-ink-primary mb-1">
                      Enter 6-Digit Official OTP
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="w-full min-h-touch px-3 text-center tracking-[0.3em] font-mono text-lg font-bold rounded-stitch-btn border border-stitch-surface-border focus:outline-none focus:ring-2 focus:ring-stitch-terracotta"
                    />
                    <p className="text-[11px] text-slate-500 mt-1 text-center font-mono">
                      Verification code pre-filled for authorized session testing (<code>123456</code>)
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={!isValidOtp || loading}
                    className="w-full min-h-touch py-2.5 px-4 rounded-stitch-btn bg-stitch-terracotta hover:bg-stitch-terracotta-hover text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-stitch-sm transition-all disabled:opacity-50"
                  >
                    <span>{loading ? 'Verifying Credentials...' : 'Authenticate & Enter Command Queue'}</span>
                    <span className="material-symbols-outlined text-sm">verified</span>
                  </button>
                </form>
              )}
            </>
          )}

          {/* MODE B: BADGE ID / ACCESS CODE */}
          {authMode === 'accessCode' && (
            <form onSubmit={handleAccessCodeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stitch-ink-primary mb-1">
                  Officer Badge ID / Special Access Code
                </label>
                <div className="relative">
                  <input
                    type={showAccessCode ? 'text' : 'password'}
                    value={accessCode}
                    onChange={(e) => {
                      setAccessCode(e.target.value);
                      setErrorMsg(null);
                    }}
                    placeholder="GMC-OFF-44 or OFF-DL-MCD-DRAIN-2026"
                    className="w-full min-h-touch px-3 pr-10 rounded-stitch-btn border border-stitch-surface-border font-mono text-sm font-bold text-stitch-ink-primary focus:outline-none focus:ring-2 focus:ring-stitch-terracotta"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAccessCode(!showAccessCode)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    title={showAccessCode ? 'Hide access code' : 'Show access code'}
                  >
                    <span className="material-symbols-outlined text-sm">
                      {showAccessCode ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Assigned by State Nodal Cell / Municipal Commissioner IT Desk.
                </p>
              </div>

              <button
                type="submit"
                disabled={!accessCode.trim() || loading}
                className="w-full min-h-touch py-2.5 px-4 rounded-stitch-btn bg-stitch-terracotta hover:bg-stitch-terracotta-hover text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-stitch-sm transition-all disabled:opacity-50"
              >
                <span>{loading ? 'Verifying Access Code...' : 'Authenticate & Enter Command Queue'}</span>
                <span className="material-symbols-outlined text-sm">lock_open</span>
              </button>
            </form>
          )}

          {/* Quick-Pick Seed Credentials for Testing */}
          <div className="pt-2 border-t border-stitch-surface-border">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block mb-1.5">
              Quick Directory Testing Numbers:
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('phone');
                  setOfficerPhone('9848011221');
                  setOtpSent(false);
                }}
                className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-[10px] font-mono font-bold text-slate-700"
              >
                Guntur Water (9848011221)
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('phone');
                  setOfficerPhone('9848011222');
                  setOtpSent(false);
                }}
                className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-[10px] font-mono font-bold text-slate-700"
              >
                Guntur Roads (9848011222)
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('phone');
                  setOfficerPhone('9811011224');
                  setOtpSent(false);
                }}
                className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-[10px] font-mono font-bold text-slate-700"
              >
                Delhi Drainage (9811011224)
              </button>
            </div>
          </div>

          {/* Quick-Switch to Citizen Portal in Footer */}
          <div className="pt-4 border-t border-stitch-surface-border text-center text-xs text-slate-500">
            <span>Not a municipal officer? </span>
            <Link
              to="/login/citizen"
              className="text-stitch-navy hover:underline font-bold"
            >
              Switch to Citizen Login →
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-3 px-6 text-center text-xs text-slate-400">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <span>National Informatics Centre (NIC) • Government Intranet Node</span>
          <span className="font-mono text-[11px]">Strict Sovereign Whitelist Active</span>
        </div>
      </footer>
    </div>
  );
};

export default OfficerPortalLoginPage;
