import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useRegion } from '../context/RegionContext';
import { RegionLocationBanner } from '../components/RegionLocationBanner';
import { CallPoliceButton } from '../components/CallPoliceButton';
import { EmergencyHelplinesDrawer } from '../components/EmergencyHelplinesDrawer';

export const RoleSelectionGatewayPage: React.FC = () => {
  const navigate = useNavigate();
  const { regionContext, isHelplinesDrawerOpen, setIsHelplinesDrawerOpen, helplines } = useRegion();

  const handleSelectRole = (rolePath: '/login/citizen' | '/login/officer') => {
    navigate(rolePath);
  };

  const handleKeyDown = (
    e: React.KeyboardEvent,
    rolePath: '/login/citizen' | '/login/officer'
  ) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelectRole(rolePath);
    }
  };

  return (
    <div className="min-h-dvh bg-stitch-surface-canvas flex flex-col justify-between text-stitch-ink-primary font-sans">
      {/* 1. Automated Location & Regional Server Bar (Triggered on page load) */}
      <RegionLocationBanner onOpenHelplines={() => setIsHelplinesDrawerOpen(true)} />

      {/* 2. Top Sovereign Gov Header with Prominent Call Police (100) & ERSS (112) */}
      <header className="bg-stitch-navy text-white py-4 px-6 shadow-stitch-sm border-b-2 border-stitch-terracotta">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-stitch-btn bg-white/10 border border-white/20 flex flex-col items-center justify-center text-stitch-terracotta-light shrink-0">
              <span className="text-[9px] font-mono font-bold leading-none text-stitch-terracotta">GOV</span>
              <span className="text-xs font-black tracking-widest text-white leading-tight">IN</span>
            </div>
            <div>
              <p className="text-[11px] font-mono text-stitch-terracotta uppercase tracking-wider font-extrabold">
                NATIONAL CIVIC GRIEVANCE COMMAND SYSTEM
              </p>
              <h1 className="text-h2 font-black tracking-tight text-white">Civic Helpline India</h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Prominent Call Police (100) Button in Header */}
            <CallPoliceButton variant="header" />

            {/* National ERSS 112 Emergency Button */}
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

      {/* 3. Main Role Selection Centerpiece */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-4xl space-y-6">
          {/* Emergency Priority Banner with Instant Access */}
          <div className="rounded-stitch-card bg-red-50 border border-red-200 p-4 sm:p-5 shadow-stitch-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-center sm:text-left">
              <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-xl">shield</span>
              </div>
              <div>
                <span className="font-mono text-[10px] font-extrabold uppercase tracking-wider text-red-700 block">
                  PRIORITY EMERGENCY HELPLINES • {regionContext.district.toUpperCase()}, {regionContext.state.toUpperCase()}
                </span>
                <p className="text-xs font-semibold text-red-950 mt-0.5">
                  In acute danger or witnessing a life-threatening collapse? Use instant emergency bypass:
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
              <CallPoliceButton variant="prominent" className="flex-1 sm:flex-initial" />
              <button
                type="button"
                onClick={() => setIsHelplinesDrawerOpen(true)}
                className="min-h-touch px-3.5 py-2.5 rounded-stitch-btn border border-red-300 hover:bg-red-100 text-red-900 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <span className="material-symbols-outlined text-sm">contact_phone</span>
                <span>Helplines ({helplines.length})</span>
              </button>
            </div>
          </div>

          {/* Headline & Prompt */}
          <div className="text-center space-y-2.5 max-w-2xl mx-auto pt-2">
            <span className="inline-block px-3 py-1 rounded-stitch-pill bg-stitch-navy-tint text-stitch-navy font-mono text-xs font-bold uppercase tracking-wider">
              Authentication Gateway • {regionContext.serverLabel}
            </span>
            <h2 className="text-h1 sm:text-hero font-black text-stitch-ink-primary tracking-tight">
              Select your portal to continue
            </h2>
            <p className="text-sm sm:text-body text-stitch-ink-secondary">
              Are you a <strong>Citizen</strong> lodging or tracking a grievance, or a <strong>Department Officer</strong> managing field operations?
            </p>
          </div>

          {/* Dual Interactive Role Selection Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. CITIZEN PORTAL CARD */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => handleSelectRole('/login/citizen')}
              onKeyDown={(e) => handleKeyDown(e, '/login/citizen')}
              className="group cursor-pointer rounded-stitch-card bg-white border-2 border-stitch-surface-border hover:border-stitch-navy p-6 sm:p-8 shadow-stitch-sm hover:shadow-stitch-lg transition-all duration-200 flex flex-col justify-between focus:outline-none focus:ring-4 focus:ring-stitch-navy/20 relative"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-14 h-14 rounded-stitch-card bg-stitch-navy-tint text-stitch-navy flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                    <span className="material-symbols-outlined text-3xl">person</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-stitch-pill bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold font-mono">
                    Public Access
                  </span>
                </div>

                <div>
                  <h3 className="text-h2 font-black text-stitch-ink-primary group-hover:text-stitch-navy transition-colors">
                    Citizen
                  </h3>
                  <p className="text-xs sm:text-sm text-stitch-ink-secondary mt-1.5 leading-relaxed">
                    Report civic defects, attach photo evidence, and track SLA countdowns in your ward.
                  </p>
                </div>

                <ul className="space-y-2 pt-2 border-t border-stitch-surface-border text-xs text-stitch-ink-secondary">
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-xs text-emerald-600">check_circle</span>
                    <span>Lodge geo-tagged civic grievances with photo evidence</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-xs text-emerald-600">check_circle</span>
                    <span>Track real-time SLA countdown and field resolution status</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-xs text-emerald-600">check_circle</span>
                    <span>Receive instant updates via randomized SMS OTP or Google login</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-stitch-surface-border flex items-center justify-between">
                <span className="text-xs font-bold text-stitch-navy group-hover:underline">
                  Proceed to Citizen Login
                </span>
                <span className="w-10 h-10 rounded-full bg-stitch-navy text-white flex items-center justify-center group-hover:translate-x-1 transition-transform">
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </span>
              </div>
            </div>

            {/* 2. OFFICER PORTAL CARD */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => handleSelectRole('/login/officer')}
              onKeyDown={(e) => handleKeyDown(e, '/login/officer')}
              className="group cursor-pointer rounded-stitch-card bg-white border-2 border-stitch-surface-border hover:border-stitch-terracotta p-6 sm:p-8 shadow-stitch-sm hover:shadow-stitch-lg transition-all duration-200 flex flex-col justify-between focus:outline-none focus:ring-4 focus:ring-stitch-terracotta/20 relative"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-14 h-14 rounded-stitch-card bg-stitch-terracotta/10 text-stitch-terracotta flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                    <span className="material-symbols-outlined text-3xl">badge</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-stitch-pill bg-amber-50 text-amber-900 border border-amber-300 text-[11px] font-bold font-mono">
                    Restricted Intranet
                  </span>
                </div>

                <div>
                  <h3 className="text-h2 font-black text-stitch-ink-primary group-hover:text-stitch-terracotta transition-colors">
                    Department Officer
                  </h3>
                  <p className="text-xs sm:text-sm text-stitch-ink-secondary mt-1.5 leading-relaxed">
                    Access assigned ward complaints, update resolution status, and manage field operations.
                  </p>
                </div>

                <ul className="space-y-2 pt-2 border-t border-stitch-surface-border text-xs text-stitch-ink-secondary">
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-xs text-stitch-terracotta">shield</span>
                    <span>Place-volume calibrated grievance queue and density ranking</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-xs text-stitch-terracotta">shield</span>
                    <span>Atomic claim locks, hold management, and resolution proof upload</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-xs text-stitch-terracotta">shield</span>
                    <span>Direct phone login verified against 2026 Administrative Directory</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-stitch-surface-border flex items-center justify-between">
                <span className="text-xs font-bold text-stitch-terracotta group-hover:underline">
                  Proceed to Officer Login
                </span>
                <span className="w-10 h-10 rounded-full bg-stitch-terracotta text-white flex items-center justify-center group-hover:translate-x-1 transition-transform">
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </span>
              </div>
            </div>
          </div>

          {/* Security & Regulatory Notice */}
          <div className="text-center text-xs text-slate-500 space-y-1">
            <p>
              Official Gateway of National Civic Grievance Helpline Directory. Connected to {regionContext.jurisdiction}.
            </p>
            <p className="text-[11px] font-mono">
              Protected under Digital Personal Data Protection (DPDP) Act 2023 &amp; Information Technology Act 2000.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-stitch-surface-border bg-white py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <span>Government of India • Ministry of Electronics &amp; Information Technology</span>
          <span className="font-mono text-[11px]">NIC S3WaaS Sovereign Infrastructure • {regionContext.serverLabel}</span>
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

export default RoleSelectionGatewayPage;
