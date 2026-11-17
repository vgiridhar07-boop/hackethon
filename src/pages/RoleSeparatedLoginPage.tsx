import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

type LoginPersona = 'CITIZEN' | 'OFFICER';

export const RoleSeparatedLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [persona, setPersona] = useState<LoginPersona>('CITIZEN');

  // Citizen OTP State
  const [citizenPhone, setCitizenPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  // Officer Special Code State
  const [officerBadgeId, setOfficerBadgeId] = useState('');
  const [specialAccessCode, setSpecialAccessCode] = useState('');
  const [showSpecialCode, setShowSpecialCode] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCitizenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!otpSent) {
      if (!/^\d{10}$/.test(citizenPhone)) {
        setErrorMsg('Please enter a valid 10-digit Indian mobile number.');
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

      localStorage.setItem('civic_auth_token', data.accessToken);
      localStorage.setItem('civic_persona', 'CITIZEN');
      // Route directly to the ALREADY CREATED Citizen Portal page
      navigate('/citizen/dashboard');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOfficerCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!officerBadgeId.trim() || !specialAccessCode.trim()) {
      setErrorMsg('Please enter both your Officer Badge ID and Special Departmental Access Code.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/officer/code-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          officerBadgeId: officerBadgeId.trim(),
          specialAccessCode: specialAccessCode.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid Special Access Code');

      localStorage.setItem('civic_auth_token', data.accessToken);
      localStorage.setItem('civic_persona', 'OFFICER');
      localStorage.setItem('civic_officer_profile', JSON.stringify(data.officer));
      // Route to the NEW Dedicated Officer Command Portal
      navigate('/officer/portal');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col justify-between transition-colors duration-300 ${
        persona === 'CITIZEN' ? 'bg-stitch-surface-canvas' : 'bg-slate-900'
      }`}
    >
      {/* Top Sovereign Identity Banner */}
      <header className="bg-stitch-navy border-b border-white/10 text-white py-4 px-6 shadow-stitch-sm">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-mono font-bold text-stitch-terracotta uppercase tracking-widest">
              DIGITAL INDIA • PUBLIC DIGITAL INFRASTRUCTURE
            </p>
            <h1 className="text-h2 font-black tracking-tight">
              Civic Helpline India — Unified Access Gateway
            </h1>
          </div>
          <a
            href="tel:112"
            className="min-h-touch px-4 py-2 rounded-stitch-btn bg-stitch-emergency hover:bg-stitch-emergency-hover text-white font-bold text-xs flex items-center gap-2 shadow-sm"
          >
            <span className="material-symbols-outlined text-sm">emergency</span>
            <span>112 Emergency Bypass (No Login Needed)</span>
          </a>
        </div>
      </header>

      {/* Center Role-Separated Login Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div
          className={`w-full max-w-lg rounded-stitch-card shadow-stitch-md border overflow-hidden transition-all ${
            persona === 'CITIZEN'
              ? 'bg-white border-stitch-surface-border text-stitch-ink-primary'
              : 'bg-slate-800 border-slate-700 text-white'
          }`}
        >
          {/* Role Switcher Tabs (Minimum 48x48dp Touch Targets) */}
          <div className="grid grid-cols-2 border-b border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => {
                setPersona('CITIZEN');
                setErrorMsg(null);
              }}
              className={`min-h-touch py-3.5 px-4 font-bold text-sm flex items-center justify-center gap-2 transition-colors ${
                persona === 'CITIZEN'
                  ? 'bg-stitch-navy text-white border-b-4 border-stitch-terracotta'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-base">person</span>
              <span>Citizen Portal</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setPersona('OFFICER');
                setErrorMsg(null);
              }}
              className={`min-h-touch py-3.5 px-4 font-bold text-sm flex items-center justify-center gap-2 transition-colors ${
                persona === 'OFFICER'
                  ? 'bg-stitch-terracotta text-white border-b-4 border-amber-300'
                  : 'bg-slate-100 text-stitch-ink-secondary hover:bg-slate-200'
              }`}
            >
              <span className="material-symbols-outlined text-base">security</span>
              <span>Officer Command Portal</span>
            </button>
          </div>

          <div className="p-6 sm:p-8">
            {errorMsg && (
              <div
                role="alert"
                className="mb-5 p-3.5 rounded-stitch-btn bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-base text-red-600">error</span>
                <span>{errorMsg}</span>
              </div>
            )}

            {/* CITIZEN LOGIN FORM -> Routes to Existing Citizen Page */}
            {persona === 'CITIZEN' ? (
              <form onSubmit={handleCitizenSubmit} className="space-y-5">
                <div>
                  <span className="inline-block px-2.5 py-1 rounded-stitch-pill bg-slate-100 text-stitch-navy text-xs font-bold mb-2 border border-slate-200">
                    CITIZEN GRIEVANCE &amp; HELPLINE ACCESS
                  </span>
                  <h2 className="text-h2 font-black text-stitch-ink-primary">
                    Report &amp; Track Civic Issues
                  </h2>
                  <p className="text-xs text-stitch-ink-secondary mt-1">
                    Sign in with your mobile number to raise geo-tagged complaints in under 90 seconds or track your existing tickets.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stitch-ink-primary mb-1.5">
                    10-Digit Mobile Number (DPDP Encrypted)
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3.5 rounded-l-stitch-btn border border-r-0 border-stitch-surface-border bg-stitch-surface-muted text-stitch-ink-secondary font-mono text-sm font-bold">
                      +91
                    </span>
                    <input
                      type="tel"
                      maxLength={10}
                      value={citizenPhone}
                      onChange={(e) => setCitizenPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="Enter 10-digit mobile number"
                      disabled={otpSent}
                      className="flex-1 min-h-touch px-3.5 rounded-r-stitch-btn border border-stitch-surface-border text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-stitch-navy"
                      required
                    />
                  </div>
                </div>

                {otpSent && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-stitch-ink-primary mb-1.5">
                      6-Digit SMS OTP
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="Enter 6-digit OTP"
                      className="w-full min-h-touch px-3.5 rounded-stitch-btn border border-stitch-surface-border font-mono text-base tracking-widest focus:outline-none focus:ring-2 focus:ring-stitch-navy"
                      required
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="min-h-touch w-full rounded-stitch-btn bg-stitch-navy hover:bg-stitch-navy-light text-white font-bold text-xs uppercase tracking-wider shadow-stitch-sm transition-transform active:scale-[0.99] flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">login</span>
                  <span>
                    {loading
                      ? 'Verifying...'
                      : otpSent
                      ? 'Verify OTP & Open Citizen Portal →'
                      : 'Send 6-Digit OTP →'}
                  </span>
                </button>

                <div className="pt-2 border-t border-stitch-surface-border flex items-center justify-between text-xs text-stitch-ink-muted">
                  <span>Need urgent helpline numbers without OTP?</span>
                  <button
                    type="button"
                    onClick={() => navigate('/citizen/dashboard')}
                    className="font-bold text-stitch-terracotta hover:underline"
                  >
                    Continue to Citizen Directory →
                  </button>
                </div>
              </form>
            ) : (
              /* OFFICER LOGIN FORM -> Authenticates via Special Access Code */
              <form onSubmit={handleOfficerCodeSubmit} className="space-y-5">
                <div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-stitch-pill bg-amber-500/20 text-amber-300 border border-amber-400/30 text-xs font-bold mb-2">
                    <span className="material-symbols-outlined text-xs">lock</span>
                    <span>AUTHORIZED MUNICIPAL &amp; NODAL OFFICERS ONLY</span>
                  </span>
                  <h2 className="text-h2 font-black text-white">
                    Officer Command Portal Login
                  </h2>
                  <p className="text-xs text-slate-300 mt-1">
                    Enter your official Badge ID and your departmental <strong>Special Access Code</strong> to view, accept, hold, and resolve citizen complaints.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-200 mb-1.5">
                    Officer Badge / Employee ID
                  </label>
                  <input
                    type="text"
                    value={officerBadgeId}
                    onChange={(e) => setOfficerBadgeId(e.target.value)}
                    placeholder="e.g., GMC-OFF-44 or MCD-UGD-112"
                    className="w-full min-h-touch px-3.5 rounded-stitch-btn bg-slate-900 border border-slate-600 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-stitch-terracotta"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Try seeded badges: GMC-OFF-44 (Water), GMC-R&amp;B-19 (Roads), GMC-SWM-08 (Garbage)
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      Special Departmental Access Code
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowSpecialCode(!showSpecialCode)}
                      className="text-xs text-amber-300 hover:underline flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-xs">
                        {showSpecialCode ? 'visibility_off' : 'visibility'}
                      </span>
                      <span>{showSpecialCode ? 'Hide Code' : 'Show Code'}</span>
                    </button>
                  </div>
                  <input
                    type={showSpecialCode ? 'text' : 'password'}
                    value={specialAccessCode}
                    onChange={(e) => setSpecialAccessCode(e.target.value)}
                    placeholder="e.g., OFF-AP-GNT-WATER-2026"
                    className="w-full min-h-touch px-3.5 rounded-stitch-btn bg-slate-900 border border-amber-500/60 text-amber-200 font-mono text-sm tracking-wider focus:outline-none focus:ring-2 focus:ring-amber-400"
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    Issued by your District Collectorate / Municipal Commissioner Nodal Cell.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="min-h-touch w-full rounded-stitch-btn bg-stitch-terracotta hover:bg-stitch-terracotta-hover text-white font-bold text-xs uppercase tracking-wider shadow-stitch-md transition-transform active:scale-[0.99] flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">vpn_key</span>
                  <span>
                    {loading
                      ? 'Verifying Special Code...'
                      : 'Authenticate & Enter Officer Command Portal →'}
                  </span>
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

