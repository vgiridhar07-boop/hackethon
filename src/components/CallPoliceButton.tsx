import React, { useState } from 'react';
import { useRegion } from '../context/RegionContext';

interface CallPoliceButtonProps {
  className?: string;
  variant?: 'pill' | 'header' | 'prominent';
}

export const CallPoliceButton: React.FC<CallPoliceButtonProps> = ({
  className = '',
  variant = 'prominent',
}) => {
  const { policeInfo, regionContext, isCallPoliceModalOpen, setIsCallPoliceModalOpen } = useRegion();
  const [copied, setCopied] = useState(false);

  const policeNumber = policeInfo.number || '100';
  const cleanNumber = policeNumber.replace(/\D/g, '');

  const handleClick = (_e: React.MouseEvent) => {
    // Check if mobile device
    const isMobile =
      typeof navigator !== 'undefined' &&
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (!isMobile) {
      // On desktop, open the modal dialog to ensure desktop users without softphones can copy/dial
      setIsCallPoliceModalOpen(true);
    }
  };

  const handleCopy = (num: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(num);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <>
      <a
        href={`tel:${cleanNumber}`}
        onClick={handleClick}
        aria-label={`Call Police ${policeNumber} emergency helpline`}
        className={`inline-flex items-center justify-center gap-2 font-black transition-all shadow-stitch-sm active:scale-95 text-white bg-red-600 hover:bg-red-700 border border-red-700 ${
          variant === 'prominent'
            ? 'min-h-touch px-4 py-2.5 rounded-stitch-btn text-xs sm:text-sm tracking-wide uppercase'
            : variant === 'header'
            ? 'px-3 py-1.5 rounded-stitch-btn text-xs uppercase'
            : 'px-3 py-1 rounded-stitch-pill text-xs'
        } ${className}`}
      >
        <span className="material-symbols-outlined text-base animate-pulse">local_police</span>
        <span>Call Police • {policeNumber}</span>
      </a>

      {/* Desktop Helper & Telephony Fallback Modal */}
      {isCallPoliceModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="police-modal-title"
          className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn text-stitch-ink-primary font-sans"
        >
          <div className="bg-white rounded-stitch-card shadow-2xl max-w-md w-full border-2 border-red-600 overflow-hidden">
            {/* Header */}
            <div className="bg-red-600 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-2xl">local_police</span>
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-widest text-red-100 block">
                    EMERGENCY POLICE ASSISTANCE
                  </span>
                  <h3 id="police-modal-title" className="text-h3 font-black text-white">
                    Dialing Police: {policeNumber}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCallPoliceModalOpen(false)}
                aria-label="Close dialog"
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white font-bold"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-stitch-btn text-xs text-red-950 space-y-1">
                <div className="flex items-center justify-between font-bold">
                  <span>Connected Jurisdiction:</span>
                  <span className="font-mono text-red-700">{regionContext.district}, {regionContext.state}</span>
                </div>
                <p className="text-[11px] text-red-900">
                  {policeInfo.label} • Calls connect directly to the District Police Control Room and nearest mobile patrol unit.
                </p>
              </div>

              {/* Large Dial Display & One-Click Copy */}
              <div className="text-center space-y-2 py-2">
                <div className="font-mono text-4xl sm:text-5xl font-black text-red-600 tracking-wider">
                  {policeNumber}
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  {copied ? 'Copied to clipboard!' : 'Use this number in your phone dialer'}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <a
                  href={`tel:${cleanNumber}`}
                  className="flex-1 min-h-touch py-2.5 px-4 rounded-stitch-btn bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase flex items-center justify-center gap-2 shadow-stitch-sm transition-all"
                >
                  <span className="material-symbols-outlined text-sm">call</span>
                  <span>Dial {policeNumber} Now</span>
                </a>

                <button
                  type="button"
                  onClick={() => handleCopy(cleanNumber)}
                  className="min-h-touch py-2.5 px-4 rounded-stitch-btn border border-stitch-surface-border hover:bg-slate-50 font-bold text-xs text-stitch-ink-primary flex items-center justify-center gap-1.5 transition-all"
                >
                  <span className="material-symbols-outlined text-sm">
                    {copied ? 'check' : 'content_copy'}
                  </span>
                  <span>{copied ? 'Copied' : `Copy ${policeNumber}`}</span>
                </button>
              </div>

              {/* Local Police Station fallback if profiled */}
              {policeInfo.localPsContact && (
                <div className="pt-3 border-t border-stitch-surface-border text-xs text-slate-600">
                  <span className="font-bold text-stitch-ink-primary block mb-1">
                    Local Jurisdiction Station:
                  </span>
                  <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200">
                    <span className="font-mono text-[11px]">{policeInfo.localPsContact}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(policeInfo.localPsContact!.split(':')[1]?.trim() || policeInfo.localPsContact!)}
                      className="text-xs text-stitch-navy hover:underline font-bold"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}

              {/* Pan-India ERSS 112 Alternative */}
              <div className="pt-2 text-center text-[11px] text-slate-500">
                <span>Alternative: </span>
                <a href="tel:112" className="text-red-700 font-bold hover:underline">
                  National ERSS 112
                </a>
                <span> (Single Emergency Response for Police, Fire &amp; Medical)</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CallPoliceButton;
