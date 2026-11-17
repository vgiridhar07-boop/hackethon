import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const CitizenOnlyLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [citizenPhone, setCitizenPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCitizenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!otpSent) {
      if (!/^\d{10}$/.test(citizenPhone)) {
        setErrorMsg('Please enter a valid 10-digit mobile number.');
        return;
      }
      setOtpSent(true);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/citizen/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: citizenPhone, otpCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'OTP verification failed');

      localStorage.setItem('citizen_access_token', data.accessToken);
      localStorage.setItem('civic_auth_token', data.accessToken);
      localStorage.setItem('civic_persona', 'CITIZEN');
      // Route directly to the EXISTING Citizen Portal
      navigate('/citizen/dashboard');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stitch-surface-canvas flex flex-col justify-between">
      {/* Citizen Sovereign Header - Zero Officer Links */}
      <header className="bg-stitch-navy text-white py-4 px-6 shadow-stitch-sm">
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
          <a
            href="tel:112"
            className="min-h-touch px-4 py-2 rounded-stitch-btn bg-stitch-emergency hover:bg-stitch-emergency-hover text-white font-bold text-xs flex items-center gap-2 shadow-stitch-sm transition-all"
          >
            <span className="material-symbols-outlined text-sm">emergency</span>
            <span>Dial 112 Emergency</span>
          </a>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-stitch-card bg-white border border-stitch-surface-border shadow-stitch-md p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-block px-2.5 py-1 rounded-stitch-pill bg-stitch-navy-tint text-stitch-navy text-xs font-bold">
              CITIZEN ACCESS DESK
            </span>
            <span className="text-[11px] text-slate-500 font-medium">DPDP Act 2023 Compliant</span>
          </div>

          <h2 className="text-h2 text-stitch-ink-primary font-bold">Report & Track Civic Issues</h2>
          <p className="text-xs text-stitch-ink-secondary mt-1 mb-5">
            Verify your mobile number via OTP to lodge geo-tagged complaints, attach photo evidence, and track resolution SLAs.
          </p>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-stitch-btn bg-stitch-emergency-surface border border-stitch-emergency-border text-stitch-emergency text-xs font-semibold flex items-center gap-2">
              <span className="material-symbols-outlined text-sm shrink-0">warning</span>
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleCitizenSubmit} className="space-y-4">
            <div>
              <label className="block text-label text-stitch-ink-primary mb-1">
                10-Digit Mobile Number
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-3.5 rounded-l-stitch-btn border border-r-0 border-stitch-surface-border bg-stitch-surface-muted font-mono text-sm font-bold text-stitch-ink-secondary">
                  +91
                </span>
                <input
                  type="tel"
                  maxLength={10}
                  value={citizenPhone}
                  onChange={(e) => setCitizenPhone(e.target.value.replace(/\D/g, ''))}
                  disabled={otpSent}
                  placeholder="Enter 10-digit mobile number"
                  className="flex-1 min-h-touch px-3.5 rounded-r-stitch-btn border border-stitch-surface-border text-sm font-mono text-stitch-ink-primary focus:outline-none focus:ring-2 focus:ring-stitch-navy"
                  required
                />
              </div>
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
                    className="text-xs text-stitch-navy font-semibold hover:underline"
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
                  className="w-full min-h-touch px-3.5 rounded-stitch-btn border border-stitch-surface-border font-mono text-base tracking-widest text-center text-stitch-ink-primary focus:outline-none focus:ring-2 focus:ring-stitch-navy"
                  required
                />
                <p className="text-[11px] text-stitch-ink-muted mt-1.5">
                  Test SMS OTP code is 123456
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="min-h-touch w-full rounded-stitch-btn bg-stitch-navy hover:bg-stitch-navy-dark text-white font-bold text-sm shadow-stitch-sm transition-all"
            >
              {loading
                ? 'Signing In...'
                : otpSent
                ? 'Verify & Open Citizen Portal [ENTER]'
                : 'Send OTP Code [NEXT]'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-stitch-surface-border text-center">
            <p className="text-[11px] text-stitch-ink-muted">
              National Informatics Centre (NIC) • Ministry of Electronics & IT
            </p>
          </div>
        </div>
      </main>

      <footer className="py-3 px-6 bg-stitch-surface-muted border-t border-stitch-surface-border text-center text-xs text-stitch-ink-muted">
        <span>GIGW 3.0 & WCAG 2.1 AA Accessibility Compliant • Sovereign Citizen Helpline Portal</span>
      </footer>
    </div>
  );
};

export default CitizenOnlyLoginPage;

