import React from 'react';

interface LocationPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry: () => void;
  onUseFallback: () => void;
  errorMessage?: string;
}

export const LocationPermissionModal: React.FC<LocationPermissionModalProps> = ({
  isOpen,
  onClose,
  onRetry,
  onUseFallback,
  errorMessage,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-perm-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
    >
      <div className="bg-white rounded-stitch-card shadow-2xl max-w-lg w-full border border-stitch-surface-border overflow-hidden">
        {/* Header */}
        <div className="bg-stitch-navy text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-500/20 text-red-300 border border-red-500/40 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">location_off</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono tracking-widest text-stitch-terracotta-light">
                GEOSPATIAL AUTHENTICATION REQUIREMENT
              </span>
              <h2 id="location-perm-title" className="text-h3 font-black text-white leading-tight">
                Location Access Blocked
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-xs font-bold"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="p-3.5 bg-amber-50 rounded-stitch-btn border border-amber-200 text-xs text-amber-900 leading-relaxed">
            <strong>Mandatory Governance Requirement:</strong> Civic Helpline India operates on strict municipal jurisdiction mapping. Live GPS coordinates are required to anchor your session to your authentic local ward, district magistrate desk, and statutory SLA response circle.
          </div>

          {errorMessage && (
            <div className="p-2.5 bg-red-50 rounded-stitch-btn border border-red-200 text-xs text-red-700 font-mono">
              Error: {errorMessage}
            </div>
          )}

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-stitch-ink-primary uppercase tracking-wider">
              How to Enable Location in Your Browser:
            </h4>

            <div className="space-y-2 text-xs text-stitch-ink-secondary">
              <div className="flex items-start gap-2.5 p-2.5 bg-stitch-surface-muted rounded-stitch-btn border border-stitch-surface-border">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  1
                </span>
                <div>
                  <strong className="text-stitch-ink-primary block">Click Site Settings in URL Bar</strong>
                  Look for the padlock or settings icon directly to the left of the website URL in your browser.
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 bg-stitch-surface-muted rounded-stitch-btn border border-stitch-surface-border">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  2
                </span>
                <div>
                  <strong className="text-stitch-ink-primary block">Set Location to &ldquo;Allow&rdquo;</strong>
                  Locate the &ldquo;Location&rdquo; permission toggle and change it from &ldquo;Blocked&rdquo; to &ldquo;Allow&rdquo;.
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 bg-stitch-surface-muted rounded-stitch-btn border border-stitch-surface-border">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  3
                </span>
                <div>
                  <strong className="text-stitch-ink-primary block">Retry Detection</strong>
                  Click the button below to re-query the browser hardware GPS.
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-stitch-surface-border">
            <button
              type="button"
              onClick={onUseFallback}
              className="w-full sm:w-auto px-4 py-2.5 rounded-stitch-btn bg-slate-100 hover:bg-slate-200 text-stitch-ink-secondary text-xs font-bold transition-colors"
            >
              Continue with Manual Centroid
            </button>

            <button
              type="button"
              onClick={onRetry}
              className="w-full sm:w-auto px-6 py-2.5 rounded-stitch-btn bg-stitch-navy hover:bg-stitch-navy-light text-white text-xs font-bold shadow-stitch-sm transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">my_location</span>
              <span>Retry GPS Detection</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
