import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRegion } from '../context/RegionContext';
import { RegionLocationBanner } from '../components/RegionLocationBanner';
import { CallPoliceButton } from '../components/CallPoliceButton';
import { EmergencyHelplinesDrawer } from '../components/EmergencyHelplinesDrawer';

export const OfficerPortalLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { loginOfficer } = useAuth();
  const { isHelplinesDrawerOpen, setIsHelplinesDrawerOpen } = useRegion();

  const [officerPhone, setOfficerPhone] = useState('9848011221');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const cleanPhone = officerPhone.replace(/\D/g, '');
  const isValidPhone = cleanPhone.length === 10;

  // Handle direct phone login
  const handleOfficerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!isValidPhone) {
      setErrorMsg('Please enter a valid 10-digit registered official mobile number.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/officer/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: cleanPhone,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'This phone number is not registered as an Officer.');
      }

      // Attach { role: 'officer' } and store in session
      loginOfficer(data.accessToken, data.officer);
      navigate('/officer/dashboard');
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Unauthorized directory number.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-slate-900 flex flex-col justify-between font-sans text-slate-100">
      {/* 1. Automated Location & Regional Server Bar */}
      <RegionLocationBanner onOpenHelplines={() => setIsHelplinesDrawerOpen(true)} />

      {/* 2. High-Security Sovereign Header with Call Police (100) */}
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

          <div className="flex items-center gap-2.5 flex-wrap">
            <CallPoliceButton variant="header" />
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/10 border border-white/20">
              <span className="material-symbols-outlined text-sm text-stitch-terracotta">shield</span>
              <span className="font-mono text-xs text-slate-300 font-bold uppercase tracking-wider">
                AUTHORITY TERMINAL
              </span>
            </div>
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
              <strong>Authorized personnel only.</strong> Direct access restricted to official numbers registered in the 2026 Administrative Directory.
            </span>
          </div>

          {/* Heading */}
          <div className="space-y-1">
            <h2 className="text-h2 font-black text-stitch-ink-primary">
              Department Officer Sign In
            </h2>
            <p className="text-xs text-stitch-ink-secondary">
              Enter your registered official mobile number to access your jurisdiction command queue directly.
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

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-stitch-btn bg-stitch-emergency-surface border border-stitch-emergency-border text-stitch-emergency text-xs font-semibold flex items-center gap-2">
              <span className="material-symbols-outlined text-sm shrink-0">error</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Direct Phone Login Form (No OTP, No Badge) */}
          <form onSubmit={handleOfficerLogin} className="space-y-4">
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
              disabled={!isValidPhone || loading}
              className="w-full min-h-touch py-2.5 px-4 rounded-stitch-btn bg-stitch-terracotta hover:bg-stitch-terracotta-hover text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-stitch-sm transition-all disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating Officer...' : 'Log In to Command Queue'}</span>
              <span className="material-symbols-outlined text-sm">login</span>
            </button>
          </form>

          {/* Quick-Pick Directory Credentials for Testing */}
          <div className="pt-2 border-t border-stitch-surface-border">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block mb-1.5">
              Quick Directory Testing Numbers:
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setOfficerPhone('9848011221');
                  setErrorMsg(null);
                }}
                className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-[10px] font-mono font-bold text-slate-700"
              >
                Guntur Water (9848011221)
              </button>
              <button
                type="button"
                onClick={() => {
                  setOfficerPhone('9848011222');
                  setErrorMsg(null);
                }}
                className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-[10px] font-mono font-bold text-slate-700"
              >
                Guntur Roads (9848011222)
              </button>
              <button
                type="button"
                onClick={() => {
                  setOfficerPhone('9811011224');
                  setErrorMsg(null);
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
              Switch to Citizen Login &rarr;
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

      {/* Dynamic Emergency Helplines Drawer */}
      <EmergencyHelplinesDrawer
        isOpen={isHelplinesDrawerOpen}
        onClose={() => setIsHelplinesDrawerOpen(false)}
      />
    </div>
  );
};

export default OfficerPortalLoginPage;
