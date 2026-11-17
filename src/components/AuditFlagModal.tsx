import React, { useState } from 'react';
import { HelplineEndpoint } from '../types';

interface AuditFlagModalProps {
  isOpen: boolean;
  onClose: () => void;
  helpline: HelplineEndpoint | null;
  onSubmitFlag: (helplineId: string, issueType: string, notes: string) => void;
}

export const AuditFlagModal: React.FC<AuditFlagModalProps> = ({
  isOpen,
  onClose,
  helpline,
  onSubmitFlag,
}) => {
  const [issueType, setIssueType] = useState<'Unreachable' | 'Number Changed' | 'Wrong Department'>(
    'Unreachable'
  );
  const [citizenNotes, setCitizenNotes] = useState<string>('');
  const [isDone, setIsDone] = useState<boolean>(false);

  if (!isOpen || !helpline) return null;

  const handleSubmit = () => {
    onSubmitFlag(helpline.id, issueType, citizenNotes);
    setIsDone(true);
    setTimeout(() => {
      setIsDone(false);
      onClose();
    }, 1500);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="audit-flag-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
    >
      <div className="bg-white rounded-stitch-card shadow-2xl max-w-md w-full border border-stitch-surface-border overflow-hidden">
        <div className="bg-stitch-navy text-white px-6 py-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-mono tracking-widest text-stitch-terracotta-light">
              TASK 7.1 CROWD-SOURCED DIRECTORY AUDIT
            </span>
            <h2 id="audit-flag-title" className="text-h3 font-black text-white">
              Report Outdated Helpline
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white font-bold text-sm"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {isDone ? (
            <div className="text-center py-6 space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xl mx-auto">
                <span className="material-symbols-outlined text-xl">check</span>
              </div>
              <h3 className="text-sm font-bold text-stitch-ink-primary">
                Audit Queued for Verification
              </h3>
              <p className="text-xs text-stitch-ink-muted">
                Our Telephony Operations desk verifies reported discrepancies within 24 hours.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-stitch-surface-canvas rounded-stitch-btn border border-stitch-surface-border text-xs">
                <span className="text-stitch-ink-muted block text-[10px] uppercase font-bold">Target Helpline:</span>
                <strong className="text-stitch-ink-primary block">{helpline.department_name}</strong>
                <span className="text-slate-500">{helpline.organization_name}</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-stitch-ink-muted uppercase mb-1.5">
                  Nature of Discrepancy
                </label>
                <div className="space-y-1.5">
                  {(['Unreachable', 'Number Changed', 'Wrong Department'] as const).map((type) => (
                    <label
                      key={type}
                      className="flex items-center gap-2 p-2 rounded-stitch-btn border border-stitch-surface-border hover:bg-slate-50 cursor-pointer text-xs font-medium text-stitch-ink-primary"
                    >
                      <input
                        type="radio"
                        name="audit-issue-type"
                        value={type}
                        checked={issueType === type}
                        onChange={() => setIssueType(type)}
                        className="text-stitch-navy focus:ring-stitch-navy"
                      />
                      <span>{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="audit-citizen-notes" className="block text-xs font-bold text-stitch-ink-muted uppercase mb-1">
                  Citizen Notes (Optional)
                </label>
                <textarea
                  id="audit-citizen-notes"
                  rows={3}
                  value={citizenNotes}
                  onChange={(e) => setCitizenNotes(e.target.value)}
                  placeholder="e.g. Number rings busy, official stated line was decommissioned..."
                  className="w-full p-2.5 border border-stitch-surface-border rounded-stitch-btn text-xs text-stitch-ink-primary focus:ring-2 focus:ring-stitch-navy focus:outline-none"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-stitch-btn border border-amber-200 text-[11px] text-amber-900">
                <strong>24-Hour SLA Audit Guarantee:</strong> Discrepancies reported by citizens are verified via automated SIP ping and human moderator call. Validated numbers are updated across all 36 States/UTs.
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs text-stitch-ink-muted hover:underline"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="min-h-touch px-5 py-2 rounded-stitch-btn bg-stitch-terracotta hover:bg-stitch-terracotta-hover text-white font-bold text-xs shadow-stitch-sm transition-all"
                >
                  Submit Audit Ticket →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

