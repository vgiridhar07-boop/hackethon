import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const OfficerDirectPortalLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [officerPhone, setOfficerPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isSubdomain = typeof window !== 'undefined' && window.location.hostname.startsWith('officer.');

  const handleOfficerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!otpSent) {
      if (!/^\d{10}$/.test(officerPhone)) {
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
          phoneNumber: officerPhone.trim(),
          otpCode: otpCode.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');

      localStorage.setItem('officer_command_token', data.accessToken);
      localStorage.setItem('civic_auth_token', data.accessToken);
      localStorage.setItem('civic_persona', 'OFFICER');
      localStorage.setItem('civic_officer_profile', JSON.stringify(data.officer));

      if (isSubdomain) {
        navigate('/dashboard');
      } else {
        navigate('/authority-portal/dashboard');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stitch-surface-canvas flex flex-col justify-between">
      {/* Sovereign Header - Matte Authority Navy with Terracotta Accent */}
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
                Municipal & Nodal Officer Portal
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

      {/* Main Login Card - Flat Matte White on Off-White Canvas */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-stitch-card bg-white border border-stitch-surface-border shadow-stitch-md p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-block px-2.5 py-1 rounded-stitch-pill bg-stitch-terracotta/10 text-stitch-terracotta border border-stitch-terracotta/20 text-xs font-bold">
              OFFICER VERIFICATION DESK
            </span>
            <span className="text-[11px] text-slate-500 font-medium">Restricted Access</span>
          </div>

          <h2 className="text-h2 text-stitch-ink-primary font-bold">Officer Sign In</h2>
          <p className="text-xs text-stitch-ink-secondary mt-1 mb-5">
            Log in using your registered 10-digit official mobile number and 6-digit SMS OTP to access your jurisdiction queue.
          </p>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-stitch-btn bg-stitch-emergency-surface border border-stitch-emergency-border text-stitch-emergency text-xs font-semibold flex items-center gap-2">
              <span className="material-symbols-outlined text-sm shrink-0">warning</span>
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleOfficerLogin} className="space-y-4">
            <div>
              <label className="block text-label text-stitch-ink-primary mb-1">
                Official Registered Mobile Number
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-3.5 rounded-l-stitch-btn border border-r-0 border-stitch-surface-border bg-stitch-surface-muted font-mono text-sm font-bold text-stitch-ink-secondary">
                  +91
                </span>
                <input
                  type="tel"
                  maxLength={10}
                  value={officerPhone}
                  onChange={(e) => setOfficerPhone(e.target.value.replace(/\D/g, ''))}
                  disabled={otpSent}
                  placeholder="e.g. 9848011221"
                  className="flex-1 min-h-touch px-3.5 rounded-r-stitch-btn border border-stitch-surface-border text-sm font-mono text-stitch-ink-primary focus:outline-none focus:ring-2 focus:ring-stitch-terracotta"
                  required
                />
              </div>
              <p className="text-[11px] text-stitch-ink-muted mt-1">
                Must match your registered number in the departmental directory.
              </p>
            </div>

            {otpSent && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-label text-stitch-ink-primary">
                    6-Digit SMS Verification OTP
                  </label>
                  <button
                    type="button"
                    onClick={() => setOtpSent(false)}
                    className="text-xs text-stitch-terracotta font-semibold hover:underline"
                  >
                    Change Number
                  </button>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 6-digit OTP (e.g. 123456)"
                  className="w-full min-h-touch px-3.5 rounded-stitch-btn border border-stitch-surface-border font-mono text-base tracking-widest text-center text-stitch-ink-primary focus:outline-none focus:ring-2 focus:ring-stitch-terracotta"
                  required
                />
                <p className="text-[11px] text-stitch-ink-muted mt-1.5">
                  Test OTP code is 123456
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="min-h-touch w-full rounded-stitch-btn bg-stitch-terracotta hover:bg-stitch-terracotta-hover text-white font-bold text-sm shadow-stitch-sm transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">shield</span>
              <span>
                {loading
                  ? 'Verifying Directory...'
                  : otpSent
                  ? 'Verify & Open Command Portal [ENTER]'
                  : 'Send Officer OTP [NEXT]'}
              </span>
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-stitch-surface-border text-center">
            <p className="text-[11px] font-mono text-slate-500">
              Verified Officer Directory Numbers: 9848011221 (Guntur Water), 9848011222 (Guntur Roads), 9848011223 (Sanitation), 9811011224 (Delhi Drainage), 9822011225 (Mumbai Elec)
            </p>
          </div>
        </div>
      </main>

      <footer className="py-3 px-6 bg-stitch-surface-muted border-t border-stitch-surface-border text-center font-mono text-[11px] text-stitch-ink-muted">
        NIC Sovereign Intranet Gateway • Strictly Monitored • Unauthorized Access Subject to IT Act 2000 Prosecution
      </footer>
    </div>
  );
};

export default OfficerDirectPortalLoginPage;
