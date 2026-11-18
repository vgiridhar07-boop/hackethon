import React, { useState } from 'react';
import { useRegion } from '../context/RegionContext';
import { EmergencyHelplineItem } from '../services/regionRouter';

interface EmergencyHelplinesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EmergencyHelplinesDrawer: React.FC<EmergencyHelplinesDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const { regionContext, helplines, policeInfo } = useRegion();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const categories = [
    'All',
    'Police',
    'Emergency',
    'Medical',
    'Fire',
    'Civic',
    'Governance',
    'Electricity',
    'Women',
    'Child',
  ];

  const filteredHelplines = helplines.filter((item) => {
    if (selectedCategory === 'All') return true;
    return item.category.toLowerCase() === selectedCategory.toLowerCase();
  });

  const handleCopy = (id: string, num: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(num);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const getScopeBadge = (item: EmergencyHelplineItem) => {
    if (item.scope === 'district') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-blue-100 text-blue-800 border border-blue-200">
          {regionContext.district} Local
        </span>
      );
    }
    if (item.scope === 'state') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-purple-100 text-purple-800 border border-purple-200">
          {regionContext.state} State
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
        National (Pan-India)
      </span>
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="helplines-drawer-title"
      className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-sm flex justify-end animate-fadeIn font-sans"
    >
      <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col border-l border-stitch-surface-border">
        {/* Drawer Header */}
        <div className="bg-stitch-navy text-white px-6 py-4 flex items-center justify-between border-b-2 border-stitch-terracotta">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-stitch-btn bg-white/10 flex items-center justify-center text-stitch-terracotta-light">
              <span className="material-symbols-outlined text-lg">contact_phone</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono tracking-widest text-stitch-terracotta font-extrabold block">
                EMERGENCY TELEPHONY DIRECTORY
              </span>
              <h2 id="helplines-drawer-title" className="text-h3 font-black text-white">
                Emergency Helplines
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close helplines drawer"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
          >
            <span className="material-symbols-outlined text-sm font-bold">close</span>
          </button>
        </div>

        {/* Region Scope Indicator */}
        <div className="bg-slate-50 border-b border-stitch-surface-border px-6 py-2.5 flex items-center justify-between text-xs text-stitch-ink-secondary">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span>
              Connected Region:{' '}
              <strong className="text-stitch-ink-primary">
                {regionContext.district}, {regionContext.state}
              </strong>
            </span>
          </div>

          <span className="font-mono text-[11px] text-slate-500">
            {filteredHelplines.length} Helplines Available
          </span>
        </div>

        {/* Priority Quick Dial Bar: Police (100) & ERSS (112) */}
        <div className="p-4 bg-red-50 border-b border-red-200 grid grid-cols-2 gap-2.5">
          <a
            href={`tel:${policeInfo.number || '100'}`}
            className="p-2.5 rounded-stitch-btn bg-red-600 hover:bg-red-700 text-white font-black text-xs flex items-center justify-between shadow-stitch-sm transition-all"
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base">local_police</span>
              <span>Police {policeInfo.number || '100'}</span>
            </div>
            <span className="font-mono text-[11px] bg-red-800 px-1.5 py-0.5 rounded">DIAL</span>
          </a>

          <a
            href="tel:112"
            className="p-2.5 rounded-stitch-btn bg-stitch-emergency hover:bg-stitch-emergency-hover text-white font-black text-xs flex items-center justify-between shadow-stitch-sm transition-all"
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base">emergency</span>
              <span>ERSS 112</span>
            </div>
            <span className="font-mono text-[11px] bg-red-900 px-1.5 py-0.5 rounded">DIAL</span>
          </a>
        </div>

        {/* Category Filter Pills */}
        <div className="px-6 py-3 border-b border-stitch-surface-border flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-stitch-pill text-xs font-bold shrink-0 transition-all ${
                selectedCategory === cat
                  ? 'bg-stitch-navy text-white shadow-stitch-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-stitch-ink-secondary'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Helplines List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {filteredHelplines.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No emergency numbers found in category "{selectedCategory}".
            </div>
          ) : (
            filteredHelplines.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-stitch-card border border-stitch-surface-border bg-white shadow-stitch-sm hover:border-slate-300 transition-all space-y-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-xs sm:text-sm text-stitch-ink-primary">
                        {item.label}
                      </h4>
                      {getScopeBadge(item)}
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-mono text-base sm:text-lg font-black text-stitch-ink-primary block tracking-wider">
                      {item.number}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono text-slate-400 uppercase font-medium">
                    Category: {item.category}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopy(item.id, item.number)}
                      className="px-2.5 py-1 rounded border border-stitch-surface-border hover:bg-slate-50 text-xs font-bold text-stitch-ink-secondary flex items-center gap-1 transition-colors"
                    >
                      <span className="material-symbols-outlined text-xs">
                        {copiedId === item.id ? 'check' : 'content_copy'}
                      </span>
                      <span>{copiedId === item.id ? 'Copied' : 'Copy'}</span>
                    </button>

                    <a
                      href={item.callableUri || `tel:${item.number.replace(/\D/g, '')}`}
                      className="px-3 py-1 rounded bg-stitch-terracotta hover:bg-stitch-terracotta-hover text-white text-xs font-bold uppercase flex items-center gap-1 shadow-stitch-sm transition-all"
                    >
                      <span className="material-symbols-outlined text-xs">call</span>
                      <span>Call</span>
                    </a>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stitch-surface-border bg-slate-50 text-center text-[11px] text-slate-500">
          <span>All contacts sourced from official State &amp; District Gazette Directories.</span>
        </div>
      </div>
    </div>
  );
};

export default EmergencyHelplinesDrawer;
