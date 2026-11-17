import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface OfficerProfile {
  officer_id: string;
  officer_badge_id: string;
  full_name: string;
  designation: string;
  department_name: string;
  assigned_category: string;
  state_name: string;
  district_id: number;
  district_name: string;
  official_phone: string;
}

interface OfficerComplaintItem {
  complaint_id: string;
  ticket_number: string;
  category: string;
  latitude: number;
  longitude: number;
  address_text: string;
  landmark: string | null;
  description: string;
  ai_confidence: number;
  ai_urgency_score: number;
  sla_target_hours: number;
  status: 'Submitted' | 'Under Review' | 'On Hold' | 'Assigned' | 'In Progress' | 'Resolved';
  assigned_department: string;
  hold_reason: string | null;
  created_at: string;
  stack_code: string;
  stacked_citizen_count: number;
  k_threshold: number;
  is_compound_hazard: boolean;
  evidence_images: string[];
}

export const OfficerCommandPortalPage: React.FC = () => {
  const navigate = useNavigate();
  const [officer, setOfficer] = useState<OfficerProfile | null>(null);
  const [complaints, setComplaints] = useState<OfficerComplaintItem[]>([]);
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING_ACCEPT' | 'ON_HOLD' | 'IN_PROGRESS' | 'RESOLVED'>('ALL');
  const [holdModalComplaintId, setHoldModalComplaintId] = useState<string | null>(null);
  const [selectedHoldReason, setSelectedHoldReason] = useState('Awaiting field crew / heavy equipment dispatch');
  const [customHoldReason, setCustomHoldReason] = useState('');
  const [holdingPressId, setHoldingPressId] = useState<string | null>(null);
  const [holdProgress, setHoldProgress] = useState<number>(0);
  const holdTimerRef = useRef<number | null>(null);

  const fetchOfficerQueue = useCallback(async (districtId: number, category: string) => {
    try {
      const res = await fetch(`/api/v1/officer/complaints?districtId=${districtId}&category=${category}`);
      if (res.ok) {
        const data = await res.json();
        setComplaints(data.complaints || []);
      }
    } catch {
      // Offline fallback
    }
  }, []);

  useEffect(() => {
    const rawProfile = localStorage.getItem('civic_officer_profile');
    if (!rawProfile) {
      navigate('/login');
      return;
    }
    try {
      const parsed: OfficerProfile = JSON.parse(rawProfile);
      setOfficer(parsed);
      fetchOfficerQueue(parsed.district_id, parsed.assigned_category);
    } catch {
      navigate('/login');
    }
  }, [navigate, fetchOfficerQueue]);

  // Accept Complaint to Fix -> Transitions to 'In Progress'
  const handleAcceptComplaint = async (complaintId: string) => {
    if (!officer) return;
    try {
      const res = await fetch(`/api/v1/officer/complaints/${complaintId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          officerId: officer.officer_id,
          officerBadgeId: officer.officer_badge_id,
          officerName: officer.full_name,
          officerPhone: officer.official_phone,
        }),
      });
      if (res.ok) {
        fetchOfficerQueue(officer.district_id, officer.assigned_category);
      }
    } catch {
      // Error handling
    }
  };

  // Keep Complaint on Hold -> Transitions to 'On Hold'
  const handleConfirmHold = async (complaintId: string, reason: string) => {
    if (!officer) return;
    const finalReason = customHoldReason.trim() || reason;
    try {
      const res = await fetch(`/api/v1/officer/complaints/${complaintId}/hold`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          officerId: officer.officer_id,
          officerBadgeId: officer.officer_badge_id,
          officerName: officer.full_name,
          holdReason: finalReason,
        }),
      });
      if (res.ok) {
        setHoldModalComplaintId(null);
        setCustomHoldReason('');
        fetchOfficerQueue(officer.district_id, officer.assigned_category);
      }
    } catch {
      // Error handling
    }
  };

  // Press-and-Hold Gesture Handler (800ms tactile hold to place on hold or accept)
  const startPressHoldToDefer = (complaintId: string) => {
    setHoldingPressId(complaintId);
    setHoldProgress(0);
    const startTime = Date.now();
    holdTimerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / 800) * 100));
      setHoldProgress(pct);
      if (pct >= 100) {
        if (holdTimerRef.current) clearInterval(holdTimerRef.current);
        setHoldingPressId(null);
        setHoldProgress(0);
        handleConfirmHold(
          complaintId,
          'Held in queue by officer via quick-hold gesture awaiting next dispatch slot.'
        );
      }
    }, 40);
  };

  const cancelPressHold = () => {
    if (holdTimerRef.current) clearInterval(holdTimerRef.current);
    setHoldingPressId(null);
    setHoldProgress(0);
  };

  const filteredComplaints = complaints.filter((c) => {
    if (activeTab === 'PENDING_ACCEPT')
      return c.status === 'Submitted' || c.status === 'Assigned' || c.status === 'Under Review';
    if (activeTab === 'ON_HOLD') return c.status === 'On Hold';
    if (activeTab === 'IN_PROGRESS') return c.status === 'In Progress';
    if (activeTab === 'RESOLVED') return c.status === 'Resolved';
    return true;
  });

  if (!officer) return null;

  return (
    <div className="min-h-screen bg-stitch-surface-canvas flex flex-col justify-between">
      {/* Top Officer Command Header */}
      <header className="bg-stitch-navy-dark text-white border-b-2 border-stitch-terracotta px-4 sm:px-6 py-4 shadow-stitch-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded bg-stitch-terracotta text-white font-mono text-xs font-bold">
                BADGE: {officer.officer_badge_id}
              </span>
              <span className="text-xs text-amber-300 font-semibold uppercase tracking-wider">
                {officer.district_name} District • {officer.state_name} ({officer.assigned_category} Desk)
              </span>
            </div>
            <h1 className="text-h2 font-black mt-1">
              {officer.full_name} — {officer.designation}
            </h1>
            <p className="text-xs text-slate-300">{officer.department_name}</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fetchOfficerQueue(officer.district_id, officer.assigned_category)}
              className="min-h-touch px-4 py-2 rounded-stitch-btn bg-white/10 hover:bg-white/20 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">sync</span>
              <span>Sync Dispatched Stacks</span>
            </button>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem('officer_command_token');
                localStorage.removeItem('civic_auth_token');
                localStorage.removeItem('civic_officer_profile');
                localStorage.removeItem('civic_persona');
                localStorage.removeItem('civic_role');
                navigate('/login');
              }}
              className="min-h-touch px-4 py-2 rounded-stitch-btn border border-white/25 hover:bg-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">logout</span>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Command Workspace */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex-1 space-y-6">
        {/* Queue Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-stitch-surface-border pb-3">
          {[
            { id: 'ALL', label: `All Dispatched (${complaints.length})`, icon: 'list' },
            {
              id: 'PENDING_ACCEPT',
              label: `New / Awaiting Acceptance (${
                complaints.filter((c) => ['Submitted', 'Assigned', 'Under Review'].includes(c.status)).length
              })`,
              icon: 'inbox',
            },
            {
              id: 'ON_HOLD',
              label: `Kept On Hold (${complaints.filter((c) => c.status === 'On Hold').length})`,
              icon: 'pause_circle',
            },
            {
              id: 'IN_PROGRESS',
              label: `Accepted & Fixing (${complaints.filter((c) => c.status === 'In Progress').length})`,
              icon: 'build',
            },
            {
              id: 'RESOLVED',
              label: `Resolved (${complaints.filter((c) => c.status === 'Resolved').length})`,
              icon: 'check_circle',
            },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`min-h-touch px-4 py-2 rounded-stitch-btn font-bold text-xs flex items-center gap-1.5 transition-colors ${
                activeTab === tab.id
                  ? 'bg-stitch-navy text-white shadow-stitch-sm'
                  : 'bg-white text-stitch-ink-secondary border border-stitch-surface-border hover:bg-stitch-surface-muted'
              }`}
            >
              <span className="material-symbols-outlined text-sm">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Complaint & Stack Cards Grid */}
        {filteredComplaints.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-stitch-card border border-stitch-surface-border shadow-stitch-sm space-y-2">
            <span className="material-symbols-outlined text-4xl text-slate-400">task_alt</span>
            <h3 className="text-base font-bold text-stitch-ink-primary">No Complaints in This Filter</h3>
            <p className="text-xs text-stitch-ink-muted">
              All grievances in your {officer.assigned_category} desk queue are currently handled.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {filteredComplaints.map((item) => {
              const isCritical = item.ai_urgency_score >= 5 || item.sla_target_hours <= 4;
              const isHeld = item.status === 'On Hold';
              const isAccepted = item.status === 'In Progress';

              return (
                <article
                  key={item.complaint_id}
                  className={`rounded-stitch-card bg-white shadow-stitch-md border-2 p-5 flex flex-col justify-between gap-4 transition-all ${
                    isCritical
                      ? 'border-stitch-emergency'
                      : isHeld
                      ? 'border-amber-500'
                      : isAccepted
                      ? 'border-stitch-sla-inProgress'
                      : 'border-stitch-surface-border'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Top Metadata & Stack Badge Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-slate-100 text-stitch-navy border border-slate-200">
                          {item.ticket_number}
                        </span>
                        <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-slate-100 text-stitch-ink-secondary border border-slate-200 flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">groups</span>
                          <span>
                            Stack: {item.stacked_citizen_count}/{item.k_threshold} ({item.stack_code})
                          </span>
                        </span>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-stitch-pill text-xs font-bold flex items-center gap-1 ${
                          isCritical
                            ? 'bg-stitch-emergency text-white'
                            : isHeld
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : isAccepted
                            ? 'bg-blue-100 text-blue-900 border border-blue-300'
                            : 'bg-slate-100 text-slate-800 border border-slate-200'
                        }`}
                      >
                        <span>{item.status}</span>
                        <span>•</span>
                        <span>SLA &lt;{item.sla_target_hours}h</span>
                      </span>
                    </div>

                    {/* Issue Description & Location */}
                    <div>
                      <h3 className="text-h3 font-bold text-stitch-ink-primary">
                        {item.description}
                      </h3>
                      <p className="text-xs text-stitch-ink-secondary mt-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs text-stitch-navy">location_on</span>
                        <span>
                          {item.address_text} {item.landmark ? `(${item.landmark})` : ''} • GPS: {Number(item.latitude).toFixed(5)}, {Number(item.longitude).toFixed(5)}
                        </span>
                      </p>
                    </div>

                    {/* AI Verification & Hold Banner */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">psychology</span>
                        <span>AI Visual Confidence: {(Number(item.ai_confidence) * 100).toFixed(1)}%</span>
                      </span>
                      <span className="px-2.5 py-1 rounded bg-slate-100 text-stitch-ink-secondary font-semibold border border-slate-200">
                        Urgency Score: {item.ai_urgency_score}/5
                      </span>
                    </div>

                    {isHeld && item.hold_reason && (
                      <div className="p-3 rounded-stitch-btn bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-1.5">
                        <span className="material-symbols-outlined text-sm text-amber-700 shrink-0 mt-0.5">pause_circle</span>
                        <div>
                          <strong>Currently On Hold:</strong> {item.hold_reason}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Officer Action Bar: ACCEPT TO FIX vs. KEEP ON HOLD */}
                  {item.status !== 'Resolved' && (
                    <div className="pt-3 border-t border-stitch-surface-border flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                      {!isAccepted ? (
                        <>
                          {/* Primary Button: Accept Complaint to Fix */}
                          <button
                            type="button"
                            onClick={() => handleAcceptComplaint(item.complaint_id)}
                            className="flex-1 min-h-touch px-4 py-2.5 rounded-stitch-btn bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-stitch-sm transition-transform active:scale-[0.99]"
                          >
                            <span className="material-symbols-outlined text-sm">check_circle</span>
                            <span>Accept Complaint to Fix</span>
                          </button>

                          {/* Secondary Button: Tap or Keep Holding to Place On Hold */}
                          <button
                            type="button"
                            onMouseDown={() => startPressHoldToDefer(item.complaint_id)}
                            onMouseUp={cancelPressHold}
                            onMouseLeave={cancelPressHold}
                            onTouchStart={() => startPressHoldToDefer(item.complaint_id)}
                            onTouchEnd={cancelPressHold}
                            onClick={() => setHoldModalComplaintId(item.complaint_id)}
                            className="relative overflow-hidden min-h-touch px-4 py-2.5 rounded-stitch-btn bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-400 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            {holdingPressId === item.complaint_id && (
                              <span
                                className="absolute inset-y-0 left-0 bg-amber-400/50 transition-all"
                                style={{ width: `${holdProgress}%` }}
                              />
                            )}
                            <span className="material-symbols-outlined text-sm relative z-10">pause_circle</span>
                            <span className="relative z-10">
                              {isHeld ? 'Update Hold Note' : 'Keep on Hold (Tap or Hold)'}
                            </span>
                          </button>
                        </>
                      ) : (
                        <div className="w-full flex items-center justify-between gap-2 bg-blue-50 border border-blue-200 p-2.5 rounded-stitch-btn">
                          <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-sm text-blue-700">build</span>
                            <span>Accepted by You — Field Work In Progress</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setHoldModalComplaintId(item.complaint_id)}
                            className="px-3 py-1.5 rounded bg-amber-100 text-amber-900 font-bold text-xs hover:bg-amber-200 flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-xs">pause</span>
                            <span>Put Back on Hold</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* Hold Reason Modal */}
      {holdModalComplaintId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-stitch-card bg-white p-6 shadow-stitch-floating space-y-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-600 text-xl">pause_circle</span>
              <h3 className="text-h3 font-bold text-stitch-ink-primary">
                Keep Complaint on Hold
              </h3>
            </div>
            <p className="text-xs text-stitch-ink-secondary">
              Select or enter why this complaint is being held in the queue before active field deployment:
            </p>
            <select
              value={selectedHoldReason}
              onChange={(e) => setSelectedHoldReason(e.target.value)}
              className="w-full min-h-touch px-3 py-2 rounded-stitch-btn border border-stitch-surface-border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-stitch-navy bg-white"
            >
              <option value="Awaiting field crew / heavy equipment dispatch">
                Awaiting field crew / heavy equipment (JCB / Jetting Machine / Tanker)
              </option>
              <option value="Queued behind active life-safety emergency in ward">
                Queued behind active life-safety emergency in ward
              </option>
              <option value="Awaiting additional stacked citizen reports to pinpoint exact spot">
                Awaiting additional stacked citizen reports to pinpoint exact spot
              </option>
              <option value="Cross-department coordination required (R&B / Water / DISCOM)">
                Cross-department coordination required (R&B / Water / DISCOM)
              </option>
            </select>

            <div>
              <label className="block text-xs font-bold text-stitch-ink-muted uppercase mb-1">
                Or Custom Reason (Optional):
              </label>
              <input
                type="text"
                value={customHoldReason}
                onChange={(e) => setCustomHoldReason(e.target.value)}
                placeholder="Specific operational reason..."
                className="w-full min-h-touch px-3 py-2 rounded-stitch-btn border border-stitch-surface-border text-xs focus:outline-none focus:ring-2 focus:ring-stitch-navy"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stitch-surface-border">
              <button
                type="button"
                onClick={() => setHoldModalComplaintId(null)}
                className="min-h-touch px-4 py-2 rounded-stitch-btn border border-stitch-surface-border text-xs font-semibold hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmHold(holdModalComplaintId, selectedHoldReason)}
                className="min-h-touch px-4 py-2 rounded-stitch-btn bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
              >
                Confirm Keep on Hold
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sovereign Footer */}
      <footer className="bg-stitch-navy-dark text-slate-400 text-xs py-4 px-4 border-t border-white/10 text-center">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Digital India Sovereign Infrastructure • Municipal Officer Command Matrix</span>
          <span className="font-mono text-[11px]">DPDP Act 2023 Cryptographic Officer Session</span>
        </div>
      </footer>
    </div>
  );
};

