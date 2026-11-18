import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const OfficerDirectPortalLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [officerPhone, setOfficerPhone] = useState('9848011221');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isSubdomain = typeof window !== 'undefined' && window.location.hostname.startsWith('officer.');
  const cleanPhone = officerPhone.replace(/\D/g, '').slice(0, 10);

  const handleOfficerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (cleanPhone.length !== 10) {
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
      if (!res.ok) throw new Error(data.error || 'This phone number is not registered as an Officer.');

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
      setErrorMsg(err.message || 'Authentication failed.');
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
            Log in directly using your registered 10-digit official mobile number to access your jurisdiction queue.
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
                  placeholder="e.g. 9848011221"
                  className="flex-1 min-h-touch px-3.5 rounded-r-stitch-btn border border-stitch-surface-border text-sm font-mono text-stitch-ink-primary focus:outline-none focus:ring-2 focus:ring-stitch-terracotta"
                  required
                />
              </div>
              <p className="text-[11px] text-stitch-ink-muted mt-1">
                Must match your registered number in the departmental directory.
              </p>
            </div>

            <button
              type="submit"
              disabled={cleanPhone.length !== 10 || loading}
              className="w-full min-h-touch py-2.5 px-4 rounded-stitch-btn bg-stitch-terracotta hover:bg-stitch-terracotta-hover text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-stitch-sm transition-all disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : 'Enter Authority Portal'}</span>
              <span className="material-symbols-outlined text-sm">login</span>
            </button>
          </form>

          {/* Quick-Pick Directory Credentials */}
          <div className="mt-5 pt-3 border-t border-stitch-surface-border">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block mb-1.5">
              Authorized Directory Numbers:
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setOfficerPhone('9848011221')}
                className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-[10px] font-mono font-bold text-slate-700"
              >
                Guntur Water (9848011221)
              </button>
              <button
                type="button"
                onClick={() => setOfficerPhone('9848011222')}
                className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-[10px] font-mono font-bold text-slate-700"
              >
                Guntur Roads (9848011222)
              </button>
              <button
                type="button"
                onClick={() => setOfficerPhone('9811011224')}
                className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-[10px] font-mono font-bold text-slate-700"
              >
                Delhi Drainage (9811011224)
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Sovereign Footer */}
      <footer className="border-t border-stitch-surface-border bg-white py-3 px-6 text-center text-xs text-slate-500">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <span>National Informatics Centre (NIC) • Government Intranet Node</span>
          <span className="font-mono text-[11px]">Direct Sovereign Whitelist Active</span>
        </div>
      </footer>
    </div>
  );
};

export default OfficerDirectPortalLoginPage;
