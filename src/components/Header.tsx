import React from 'react';
import { UserProfile, StateUT, DistrictRouting } from '../types';
import { CallPoliceButton } from './CallPoliceButton';

interface HeaderProps {
  user: UserProfile;
  selectedState?: StateUT;
  selectedDistrict?: DistrictRouting;
  onOpenLanguageModal: () => void;
  onOpenAuthModal: () => void;
  onOpenLoginOnboarding?: () => void;
  activeLanguage: string;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  selectedState,
  selectedDistrict,
  onOpenLanguageModal,
  onOpenAuthModal,
  onOpenLoginOnboarding,
  activeLanguage,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-stitch-navy text-white shadow-stitch-md border-b border-stitch-navy-light/40">
      {/* Top Sovereign Authority Kicker Bar */}
      <div className="bg-stitch-navy-dark px-4 py-1.5 border-b border-white/10 flex flex-wrap items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="font-mono text-stitch-terracotta font-extrabold tracking-wider uppercase text-[11px]">
            DIGITAL INDIA • PUBLIC DIGITAL INFRASTRUCTURE
          </span>
          <span className="hidden sm:inline-block text-slate-400">|</span>
          <span className="hidden sm:inline-block text-slate-300 font-medium text-[11px]">
            MeitY • GIGW 3.0 • DPDP Act 2023 Compliant
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenLanguageModal}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-stitch-pill bg-white/10 hover:bg-white/20 text-white font-medium text-[11px] transition-colors"
            aria-label="Select Language"
          >
            <span className="font-semibold uppercase tracking-wider">{activeLanguage}</span>
            <span className="text-[10px] text-stitch-terracotta-light">[CHANGE]</span>
          </button>
        </div>
      </div>

      {/* Main Authority Header */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {/* Sovereign Emblem / Logo Emblem */}
          <div className="w-11 h-11 rounded-stitch-btn bg-white/10 border border-white/20 flex flex-col items-center justify-center text-stitch-terracotta-light shrink-0">
            <span className="text-[10px] font-mono font-bold leading-none text-stitch-terracotta">GOV</span>
            <span className="text-xs font-black tracking-widest text-white leading-tight">IN</span>
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-h2 font-black tracking-tight text-white truncate">
                Civic Helpline India
              </h1>
              <span className="hidden md:inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-stitch-terracotta text-white tracking-wider uppercase">
                National Portal
              </span>
            </div>
            <p className="text-xs text-slate-300 font-normal truncate hidden sm:block">
              Report • Track • Resolve – A Cleaner, Safer, and Better India
            </p>
          </div>
        </div>

        {/* User Profile & Regional Onboarding Pill */}
        <div className="flex items-center gap-2.5 shrink-0">
          <CallPoliceButton variant="header" />

          {onOpenLoginOnboarding && (
            <button
              type="button"
              onClick={onOpenLoginOnboarding}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-stitch-btn bg-stitch-terracotta hover:bg-stitch-terracotta-hover text-white text-xs font-bold transition-all shadow-stitch-sm"
              title="Regional Login & Exact Location Onboarding"
            >
              <span className="material-symbols-outlined text-sm">my_location</span>
              <span className="hidden sm:inline">Regional Login / GPS</span>
              <span className="sm:hidden">Login</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenLoginOnboarding || onOpenAuthModal}
            className="flex items-center gap-2 px-3 py-1.5 rounded-stitch-btn bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all text-left"
          >
            <div className="w-7 h-7 rounded-full bg-stitch-terracotta flex items-center justify-center font-bold text-xs text-white">
              {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'C'}
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-xs font-semibold leading-tight">{user.full_name}</span>
              <span className="text-[10px] text-slate-300 leading-tight">
                {selectedDistrict ? `${selectedDistrict.district_name}, ${selectedState?.name || selectedDistrict.state_ut_name}` : 'Resident Access'}
              </span>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};
