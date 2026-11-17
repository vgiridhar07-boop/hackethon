import React, { useState } from 'react';

interface EmergencyContact {
  code: string;
  label: string;
  sublabel: string;
  uri: string;
  portalUrl: string;
  badgeColor: string;
}

const CRITICAL_HELPLINES: EmergencyContact[] = [
  {
    code: '112',
    label: 'ERSS National Emergency',
    sublabel: 'Life Safety, Infrastructure Collapse, Fire & Police (24x7)',
    uri: 'tel:112',
    portalUrl: 'https://112.gov.in',
    badgeColor: 'bg-stitch-emergency text-white',
  },
  {
    code: '14420',
    label: 'NAMASTE Sewer Safety Desk',
    sublabel: 'Hazardous Sewer Entry & Emergency Mechanized Cleaning (24x7)',
    uri: 'tel:14420',
    portalUrl: 'https://www.dosje.gov.in/organisation/national-safai-karamcharis-finance-development-corporation/namaste/',
    badgeColor: 'bg-amber-600 text-white',
  },
  {
    code: '1969',
    label: 'Swachhata MoHUA',
    sublabel: 'Urban Solid Waste & Sanitation Helpline (24x7)',
    uri: 'tel:1969',
    portalUrl: 'https://sbmurban.org/swachhtha-app',
    badgeColor: 'bg-emerald-700 text-white',
  },
  {
    code: '1915',
    label: 'National Consumer Helpline',
    sublabel: 'Utility Billing & Public Commercial Disputes (08:00-20:00)',
    uri: 'tel:1915',
    portalUrl: 'https://consumerhelpline.gov.in',
    badgeColor: 'bg-stitch-navy text-white',
  },
];

interface EmergencyQuickAccessBarProps {
  stateNodalCode?: string;
  stateNodalName?: string;
}

export const EmergencyQuickAccessBar: React.FC<EmergencyQuickAccessBarProps> = ({
  stateNodalCode = '181',
  stateNodalName = 'State Apex Helpline',
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <aside
      aria-label="Emergency One-Tap Helpline Bar"
      className="fixed bottom-0 inset-x-0 z-50 bg-stitch-navy-dark/95 backdrop-blur-md border-t-2 border-stitch-emergency shadow-stitch-floating text-white pb-safe"
    >
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-2.5">
        {/* Immediate One-Tap Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href="tel:112"
            className="min-h-touch px-4 py-2 rounded-stitch-btn bg-stitch-emergency hover:bg-stitch-emergency-hover font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-transform active:scale-95 text-white"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
            <span>[DIAL 112] EMERGENCY</span>
          </a>

          <a
            href="tel:14420"
            className="min-h-touch px-3.5 py-2 rounded-stitch-btn bg-amber-600 hover:bg-amber-700 font-semibold text-xs sm:text-sm flex items-center gap-1.5 transition-transform active:scale-95 text-white"
          >
            <span>[14420] SEWER SAFETY</span>
          </a>

          <a
            href={`tel:${stateNodalCode}`}
            className="hidden sm:flex min-h-touch px-3.5 py-2 rounded-stitch-btn bg-stitch-navy-light hover:bg-stitch-navy font-semibold text-xs sm:text-sm items-center gap-1.5 text-white"
          >
            <span>[{stateNodalCode}] {stateNodalName}</span>
          </a>
        </div>

        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="min-h-touch px-3.5 py-2 rounded-stitch-btn border border-white/20 text-xs font-semibold uppercase tracking-wider hover:bg-white/10 transition-colors"
        >
          {expanded ? 'Hide All Desks [-]' : 'All National Switchboards [+]'}
        </button>
      </div>

      {expanded && (
        <div className="max-w-7xl mx-auto px-4 pb-4 pt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 border-t border-white/10 animate-fadeIn">
          {CRITICAL_HELPLINES.map((item) => (
            <div
              key={item.code}
              className="p-3.5 rounded-stitch-card bg-white/10 flex flex-col justify-between gap-2 border border-white/10"
            >
              <div>
                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${item.badgeColor} uppercase tracking-wider`}>
                  Toll-Free: {item.code}
                </span>
                <h4 className="font-bold text-sm mt-1.5 text-white">{item.label}</h4>
                <p className="text-xs text-slate-300 mt-0.5">{item.sublabel}</p>
              </div>

              <div className="flex items-center gap-2 pt-1.5">
                <a
                  href={item.uri}
                  className="flex-1 min-h-touch bg-white text-stitch-navy font-bold text-xs rounded-stitch-btn flex items-center justify-center gap-1 hover:bg-slate-100 transition-colors"
                >
                  Call {item.code}
                </a>
                <a
                  href={item.portalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-touch px-3 border border-white/30 text-white text-xs rounded-stitch-btn flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  Portal
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
};

