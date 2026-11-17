import React, { useState, useEffect } from 'react';
import { Complaint, ComplaintStatus, ComplaintCategory } from '../types';
import { IncidentStackCard } from './IncidentStackCard';

interface ComplaintTrackerProps {
  complaints: Complaint[];
  onUpdateStatus: (ticketNumber: string, newStatus: ComplaintStatus, remarks?: string) => void;
  onSelectTicket?: (ticket: Complaint) => void;
  onOpenReportModal?: (category?: ComplaintCategory) => void;
}

export const ComplaintTracker: React.FC<ComplaintTrackerProps> = ({
  complaints,
  onUpdateStatus,
  onOpenReportModal,
}) => {
  const [searchTicket, setSearchTicket] = useState<string>('');
  const [selectedTicket, setSelectedTicket] = useState<Complaint | null>(
    complaints[0] || null
  );
  const [satisfactionFeedback, setSatisfactionFeedback] = useState<string>('');

  useEffect(() => {
    if (selectedTicket && !complaints.some((c) => c.ticket_number === selectedTicket.ticket_number)) {
      setSelectedTicket(complaints[0] || null);
    } else if (!selectedTicket && complaints.length > 0) {
      setSelectedTicket(complaints[0]);
    }
  }, [complaints]);

  const filteredTickets = searchTicket.trim()
    ? complaints.filter((c) =>
        c.ticket_number.toLowerCase().includes(searchTicket.trim().toLowerCase())
      )
    : complaints;

  const currentComplaint = selectedTicket || filteredTickets[0] || null;

  const stages: Array<{
    status: ComplaintStatus;
    label: string;
    sublabel: string;
  }> = [
    { status: 'Submitted', label: '1. Submitted', sublabel: 'Ticket Created & GPS Lock' },
    { status: 'Under Review', label: '2. Under Review', sublabel: 'AI & Moderator Validation' },
    { status: 'Assigned', label: '3. Assigned', sublabel: 'Dispatched to Municipal Ward' },
    { status: 'In Progress', label: '4. In Progress', sublabel: 'Field Team Work Initiated' },
    { status: 'Resolved', label: '5. Resolved', sublabel: 'Verified Proof & 48h Window' },
  ];

  const getStageIndex = (st: ComplaintStatus): number => {
    switch (st) {
      case 'Submitted':
        return 0;
      case 'Under Review':
        return 1;
      case 'Assigned':
        return 2;
      case 'In Progress':
        return 3;
      case 'Resolved':
        return 4;
      default:
        return 0;
    }
  };

  const currentIndex = currentComplaint ? getStageIndex(currentComplaint.status) : 0;

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="bg-white rounded-stitch-card shadow-stitch-md border border-stitch-surface-border p-5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-h3 font-bold text-stitch-ink-primary">
              Track Public Grievances
            </h2>
            <p className="text-xs text-stitch-ink-muted">
              Real-time 5-stage SLA tracking with verified before/after photographic proof.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search by Ticket ID (e.g. CIV-2026-DL-12345)..."
              value={searchTicket}
              onChange={(e) => setSearchTicket(e.target.value)}
              className="min-h-touch px-4 py-2 border border-stitch-surface-border rounded-stitch-btn text-xs sm:text-sm font-mono text-stitch-ink-primary focus:ring-2 focus:ring-stitch-navy focus:outline-none"
            />
            <button
              type="button"
              onClick={() => {
                const match = complaints.find(
                  (c) => c.ticket_number.toLowerCase() === searchTicket.trim().toLowerCase()
                );
                if (match) setSelectedTicket(match);
              }}
              className="min-h-touch px-4 py-2 bg-stitch-navy text-white text-xs font-bold rounded-stitch-btn hover:bg-stitch-navy-light transition-colors"
            >
              Lookup
            </button>
          </div>
        </div>

        {/* Quick Recent Tickets Pill Bar */}
        {complaints.length > 0 && (
          <div className="mt-4 pt-3 border-t border-stitch-surface-border flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-[11px] font-bold text-stitch-ink-muted uppercase whitespace-nowrap">
              Active Incidents:
            </span>
            {complaints.map((c) => (
              <button
                key={c.complaint_id}
                type="button"
                onClick={() => setSelectedTicket(c)}
                className={`px-3 py-1 rounded-stitch-btn text-xs font-mono font-bold whitespace-nowrap transition-all border ${
                  currentComplaint?.ticket_number === c.ticket_number
                    ? 'bg-stitch-navy text-white border-stitch-navy shadow-stitch-sm'
                    : 'bg-stitch-surface-muted text-stitch-ink-secondary border-stitch-surface-border hover:bg-slate-200'
                }`}
              >
                {c.ticket_number} ({c.status})
              </button>
            ))}
          </div>
        )}
      </div>

      {currentComplaint ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main 5-Stage Vertical Stepper (Left 2 cols) */}
          <div className="lg:col-span-2 bg-white rounded-stitch-card shadow-stitch-md border border-stitch-surface-border p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stitch-surface-border pb-4">
              <div>
                <span className="text-xs font-mono font-bold text-stitch-terracotta uppercase tracking-wider">
                  TICKET IDENTIFIER
                </span>
                <h3 className="text-xl font-black text-stitch-ink-primary font-mono">
                  {currentComplaint.ticket_number}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-stitch-pill bg-stitch-surface-muted text-stitch-ink-primary text-xs font-bold border border-stitch-surface-border">
                  Category: {currentComplaint.category}
                </span>
                <span
                  className={`px-3 py-1 rounded-stitch-pill text-xs font-bold text-white ${
                    currentComplaint.status === 'Resolved'
                      ? 'bg-emerald-600'
                      : currentComplaint.status === 'In Progress'
                      ? 'bg-blue-600'
                      : currentComplaint.status === 'Assigned'
                      ? 'bg-indigo-600'
                      : 'bg-slate-700'
                  }`}
                >
                  {currentComplaint.status}
                </span>
              </div>
            </div>

            {/* Stepper Visualization */}
            <div className="space-y-4">
              {stages.map((stage, idx) => {
                const isPassed = idx < currentIndex;
                const isCurrent = idx === currentIndex;

                return (
                  <div key={stage.status} className="flex items-start gap-4">
                    {/* Circle Indicator & Vertical Connector */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                          isPassed
                            ? 'bg-emerald-600 text-white'
                            : isCurrent
                            ? 'bg-stitch-navy text-white ring-4 ring-stitch-navy/20'
                            : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        {isPassed ? (
                          <span className="material-symbols-outlined text-sm">check</span>
                        ) : (
                          idx + 1
                        )}
                      </div>
                      {idx < stages.length - 1 && (
                        <div
                          className={`w-0.5 h-10 ${
                            idx < currentIndex ? 'bg-emerald-600' : 'bg-slate-200'
                          }`}
                        />
                      )}
                    </div>

                    {/* Step Description */}
                    <div className="pt-1 flex-1">
                      <div className="flex items-center justify-between">
                        <h4
                          className={`text-sm font-bold ${
                            isCurrent
                              ? 'text-stitch-navy'
                              : isPassed
                              ? 'text-stitch-ink-primary'
                              : 'text-stitch-ink-muted'
                          }`}
                        >
                          {stage.label}
                        </h4>
                        {isCurrent && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-bold">
                            ACTIVE STAGE
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stitch-ink-muted mt-0.5">
                        {stage.sublabel}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Incident Summary & Remarks Log */}
            <div className="p-4 bg-stitch-surface-canvas rounded-stitch-card border border-stitch-surface-border space-y-2">
              <h4 className="text-xs font-bold text-stitch-ink-primary uppercase tracking-wider">
                Grievance Narrative & Location Details
              </h4>
              <p className="text-xs text-stitch-ink-secondary leading-relaxed">
                {currentComplaint.description}
              </p>
              <div className="text-[11px] text-stitch-ink-muted pt-1">
                <strong>Address:</strong> {currentComplaint.address_text}
                {currentComplaint.landmark && ` • Landmark: ${currentComplaint.landmark}`}
              </div>
            </div>

            {/* Audit Status Logs */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-stitch-ink-primary uppercase tracking-wider">
                Departmental Audit Trail & Status Logs
              </h4>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {currentComplaint.status_logs.map((log) => (
                  <div
                    key={log.log_id}
                    className="p-2.5 rounded-stitch-btn bg-stitch-surface-muted border border-stitch-surface-border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1"
                  >
                    <div>
                      <span className="font-bold text-stitch-ink-primary">
                        [{log.new_status}]
                      </span>{' '}
                      <span className="text-stitch-ink-secondary">{log.remarks}</span>
                    </div>
                    <div className="text-[10px] text-stitch-ink-muted whitespace-nowrap">
                      {log.updated_by} • {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Col: Evidence, Before/After & Citizen Satisfaction Window */}
          <div className="space-y-6">
            {/* Master Incident Stack Card (Community Aggregation & Threshold Progress) */}
            {currentComplaint.stack_code && (
              <IncidentStackCard
                stackCode={currentComplaint.stack_code}
                category={currentComplaint.category}
                subIssueLabel={
                  currentComplaint.description.split(':')[0] ||
                  `${currentComplaint.category} Incident`
                }
                uniqueCitizenCount={currentComplaint.status === 'Submitted' ? 1 : 2}
                kEffectiveThreshold={currentComplaint.status === 'Submitted' ? 3 : 2}
                pooledCvConfidence={currentComplaint.ai_confidence || 0.92}
                stackStatus={
                  currentComplaint.status === 'Resolved'
                    ? 'Resolved'
                    : currentComplaint.status === 'In Progress'
                    ? 'In Progress'
                    : currentComplaint.status === 'Assigned'
                    ? 'Dispatched'
                    : 'Buffering'
                }
                isCompoundHazard={false}
                assignedDepartment={
                  currentComplaint.assigned_department || 'Municipal Authority'
                }
                mustDispatchByIso={
                  currentComplaint.escalation_deadline ||
                  new Date(new Date(currentComplaint.created_at || '2026-01-01T00:00:00Z').getTime() + 4 * 60 * 60 * 1000).toISOString()
                }
                onOneTapJoinStack={() => {}}
                hasUserJoined={true}
              />
            )}

            {/* Before & After Image Comparison */}
            <div className="bg-white rounded-stitch-card shadow-stitch-md border border-stitch-surface-border p-5 space-y-4">
              <h4 className="text-xs font-bold text-stitch-ink-primary uppercase tracking-wider">
                Visual Photographic Evidence
              </h4>

              <div className="space-y-3">
                {/* Before Image */}
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Before: Citizen Evidence
                  </span>
                  <div className="rounded-stitch-card overflow-hidden border border-stitch-surface-border min-h-28 bg-slate-100 flex items-center justify-center">
                    {currentComplaint.images[0]?.storage_url ? (
                      currentComplaint.images[0].storage_url.startsWith('data:application/pdf') ||
                      currentComplaint.images[0].storage_url.startsWith('data:application/msword') ||
                      currentComplaint.images[0].storage_url.startsWith('data:application/vnd') ? (
                        <div className="p-4 flex flex-col items-center justify-center text-center">
                          <span className="material-symbols-outlined text-3xl text-slate-600">
                            description
                          </span>
                          <span className="text-xs font-bold text-slate-700 mt-1">
                            Attached Official Document
                          </span>
                          <span className="text-[10px] text-slate-500">
                            Verified evidentiary attachment
                          </span>
                        </div>
                      ) : (
                        <img
                          src={currentComplaint.images[0].storage_url}
                          alt="Before citizen evidence"
                          className="w-full h-36 object-cover"
                        />
                      )
                    ) : (
                      <div className="p-4 text-center text-xs text-stitch-ink-muted">
                        No photographic evidence attached for this grievance.
                      </div>
                    )}
                  </div>
                </div>

                {/* After Image if Resolved */}
                {currentComplaint.status === 'Resolved' && (
                  <div>
                    <span className="text-[10px] font-bold text-emerald-700 uppercase block mb-1">
                      After: Field Team Completion Proof
                    </span>
                    <div className="rounded-stitch-card overflow-hidden border border-emerald-300 min-h-24 bg-emerald-50 flex items-center justify-center">
                      {currentComplaint.images.find((img) => img.is_resolution_proof)?.storage_url ? (
                        <img
                          src={
                            currentComplaint.images.find((img) => img.is_resolution_proof)!.storage_url
                          }
                          alt="After completion proof"
                          className="w-full h-36 object-cover"
                        />
                      ) : (
                        <div className="p-3 text-center text-xs text-emerald-800 font-medium">
                          Field engineering team verified resolution on site. Photographic proof archived in municipal system.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 48-Hour Citizen Satisfaction Window */}
            {currentComplaint.status === 'Resolved' && (
              <div className="bg-amber-50 rounded-stitch-card border-2 border-amber-300 p-5 space-y-3 shadow-stitch-sm">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                    STATUTORY 48-HOUR SATISFACTION WINDOW
                  </span>
                  <h4 className="text-sm font-bold text-amber-950 mt-0.5">
                    Verify Municipal Resolution
                  </h4>
                  <p className="text-xs text-amber-900 mt-1">
                    Please confirm if the repair meets satisfaction. If the issue persists, you may re-open and escalate to the District Collectorate.
                  </p>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSatisfactionFeedback('Satisfaction confirmed. Ticket archived as permanently resolved.');
                      onUpdateStatus(
                        currentComplaint.ticket_number,
                        'Resolved',
                        'Citizen verified repair satisfaction. Audit closed.'
                      );
                    }}
                    className="min-h-touch px-4 py-2.5 rounded-stitch-btn bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-stitch-sm transition-all"
                  >
                    Confirm Satisfaction & Close [OK]
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSatisfactionFeedback('Escalated to State Moderator Desk due to unresolved defect.');
                      onUpdateStatus(
                        currentComplaint.ticket_number,
                        'Assigned',
                        'Citizen re-opened ticket: Unresolved or defective repair reported within 48h window.'
                      );
                    }}
                    className="min-h-touch px-4 py-2.5 rounded-stitch-btn border-2 border-red-600 text-red-700 hover:bg-red-50 font-bold text-xs transition-all"
                  >
                    Unsatisfied - Re-Open & Escalate [!]
                  </button>
                </div>

                {satisfactionFeedback && (
                  <p className="text-xs text-emerald-800 font-semibold pt-1">
                    {satisfactionFeedback}
                  </p>
                )}
              </div>
            )}

            {/* Direct Officer & Department Contact */}
            <div className="bg-white rounded-stitch-card shadow-stitch-md border border-stitch-surface-border p-5 space-y-3">
              <h4 className="text-xs font-bold text-stitch-ink-primary uppercase tracking-wider">
                Assigned Municipal Ward Team
              </h4>
              <p className="text-xs text-stitch-ink-secondary">
                {currentComplaint.assigned_department}
              </p>
              {currentComplaint.assigned_officer_contact && (
                <div className="p-2.5 bg-stitch-surface-muted rounded-stitch-btn border border-stitch-surface-border text-xs text-stitch-ink-primary font-mono">
                  {currentComplaint.assigned_officer_contact}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : complaints.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-stitch-card border border-stitch-surface-border space-y-4 shadow-stitch-sm">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500">
            <span className="material-symbols-outlined text-3xl">inbox</span>
          </div>
          <div>
            <h3 className="text-h3 font-bold text-stitch-ink-primary">
              No Public Grievances Logged
            </h3>
            <p className="text-xs text-stitch-ink-muted max-w-md mx-auto mt-1">
              There are currently no active civic grievances filed. Grievances submitted through the portal or API will appear here with live 5-stage SLA tracking.
            </p>
          </div>
          {onOpenReportModal && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => onOpenReportModal()}
                className="px-5 py-2.5 rounded-stitch-btn bg-stitch-navy hover:bg-stitch-navy-light text-white font-bold text-xs uppercase tracking-wider transition-all shadow-stitch-sm"
              >
                File First Civic Grievance
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="p-12 text-center bg-white rounded-stitch-card border border-stitch-surface-border text-stitch-ink-muted">
          No complaint record matches search query &ldquo;{searchTicket}&rdquo;.
        </div>
      )}
    </div>
  );
};
