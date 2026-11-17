import React from 'react';

export interface IncidentStackCardProps {
  stackCode: string;
  category: string;
  subIssueLabel: string;
  uniqueCitizenCount: number;
  kEffectiveThreshold: number;
  pooledCvConfidence: number;
  stackStatus:
    | 'Buffering'
    | 'Dispatched'
    | 'Escalated_Tier_2'
    | 'Escalated_Tier_3'
    | 'In Progress'
    | 'Resolved';
  isCompoundHazard: boolean;
  assignedDepartment: string;
  mustDispatchByIso: string;
  onOneTapJoinStack?: () => void;
  hasUserJoined?: boolean;
}

export const IncidentStackCard: React.FC<IncidentStackCardProps> = ({
  stackCode,
  category,
  subIssueLabel,
  uniqueCitizenCount,
  kEffectiveThreshold,
  pooledCvConfidence,
  stackStatus,
  isCompoundHazard,
  assignedDepartment,
  mustDispatchByIso,
  onOneTapJoinStack,
  hasUserJoined = false,
}) => {
  const isImmediateBypass = kEffectiveThreshold === 1;
  const fillPercentage = Math.min(100, Math.round((uniqueCitizenCount / kEffectiveThreshold) * 100));

  const formatStatusDisplay = (status: string): string => {
    switch (status) {
      case 'Buffering':
        return `Buffering (${uniqueCitizenCount}/${kEffectiveThreshold})`;
      case 'Dispatched':
        return 'Dispatched to Authority (Tier 1)';
      case 'Escalated_Tier_2':
        return 'Escalated to Executive Engineer (Tier 2)';
      case 'Escalated_Tier_3':
        return 'Apex Escalation to Collectorate (Tier 3)';
      case 'In Progress':
        return 'Field Crew Deployed (In Progress)';
      case 'Resolved':
        return 'Resolved by Department';
      default:
        return status.replace(/_/g, ' ');
    }
  };

  const getStatusBadgeStyle = (): string => {
    switch (stackStatus) {
      case 'Buffering':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Dispatched':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'Escalated_Tier_2':
        return 'bg-orange-50 text-orange-800 border-orange-200';
      case 'Escalated_Tier_3':
        return 'bg-red-50 text-red-800 border-red-200';
      case 'In Progress':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'Resolved':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="rounded-stitch-card bg-white border border-stitch-surface-border shadow-stitch-md p-4 sm:p-5 flex flex-col gap-3 transition-all hover:shadow-stitch-lg">
      {/* Top Status & Stack ID Row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="px-2.5 py-1 rounded-stitch-pill bg-slate-100 text-stitch-navy font-mono text-xs font-bold border border-slate-200 flex items-center gap-1">
            <span className="material-symbols-outlined text-xs">link</span>
            <span>{stackCode}</span>
          </span>

          {isImmediateBypass && (
            <span className="px-2.5 py-1 rounded-stitch-pill bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">bolt</span>
              <span>K=1 Immediate Emergency Bypass</span>
            </span>
          )}

          {isCompoundHazard && (
            <span className="px-2.5 py-1 rounded-stitch-pill bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">warning</span>
              <span>Multi-Dept Compound Hazard</span>
            </span>
          )}

          <span
            className={`px-2.5 py-0.5 rounded-stitch-pill border text-[11px] font-bold flex items-center gap-1 ${getStatusBadgeStyle()}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            <span>{formatStatusDisplay(stackStatus)}</span>
          </span>
        </div>

        <span className="text-xs font-semibold text-stitch-ink-muted flex items-center gap-1">
          <span className="material-symbols-outlined text-xs text-blue-600">verified</span>
          <span>AI Pooled Proof: {(pooledCvConfidence * 100).toFixed(1)}%</span>
        </span>
      </div>

      {/* Title & Responsible Authority */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-stitch-terracotta">
            {category}
          </span>
          <span className="text-stitch-ink-muted text-xs">•</span>
          <span className="text-xs text-stitch-ink-muted">Master Incident Stack</span>
        </div>
        <h3 className="text-sm sm:text-base font-black text-stitch-ink-primary tracking-tight mt-0.5">
          {subIssueLabel}
        </h3>
        <p className="text-xs text-stitch-ink-secondary mt-1">
          Dispatched Authority:{' '}
          <strong className="text-stitch-navy">{assignedDepartment}</strong>
        </p>
      </div>

      {/* Stack Progress Bar (Low-Threshold K Visualization) */}
      <div className="bg-stitch-surface-muted rounded-stitch-btn p-3 border border-stitch-surface-border space-y-2">
        <div className="flex flex-wrap items-center justify-between text-xs font-semibold gap-1">
          <span className="text-stitch-ink-primary flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-stitch-navy">groups</span>
            <span>
              Community Verification Stack: <strong>{uniqueCitizenCount}</strong> /{' '}
              {kEffectiveThreshold} Citizens
            </span>
          </span>

          <span className={stackStatus === 'Buffering' ? 'text-amber-800' : 'text-emerald-800'}>
            {stackStatus === 'Buffering'
              ? `Needs ${Math.max(
                  0,
                  kEffectiveThreshold - uniqueCitizenCount
                )} more report(s) or auto-dispatches at ${new Date(
                  mustDispatchByIso
                ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : `Dispatched to Authority (${formatStatusDisplay(stackStatus)})`}
          </span>
        </div>

        <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              isImmediateBypass
                ? 'bg-red-500'
                : fillPercentage >= 100
                ? 'bg-emerald-600'
                : 'bg-stitch-terracotta'
            }`}
            style={{ width: `${fillPercentage}%` }}
          />
        </div>
      </div>

      {/* One-Tap "+1 Me Too / Attach Evidence" Action (48x48dp touch target) */}
      {stackStatus !== 'Resolved' && (
        <button
          type="button"
          onClick={onOneTapJoinStack}
          disabled={hasUserJoined}
          className={`min-h-touch w-full rounded-stitch-btn font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-stitch-sm ${
            hasUserJoined
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 cursor-default'
              : 'bg-stitch-navy hover:bg-stitch-navy-light active:scale-[0.99] text-white cursor-pointer'
          }`}
        >
          {hasUserJoined ? (
            <>
              <span className="material-symbols-outlined text-base text-emerald-700">check</span>
              <span>You Have Confirmed This Community Incident (+1 Verified)</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-base">add</span>
              <span>I See This Issue Too - Stack My Report (+1 Priority)</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};

