import React, { useState, useEffect } from 'react';
import { ComplaintCategory, StateUT, DistrictRouting, Complaint } from '../types';
import { IncidentStackCard } from './IncidentStackCard';

interface CivicServicesHubProps {
  selectedState: StateUT;
  selectedDistrict: DistrictRouting;
  onOpenReportModal: (category?: ComplaintCategory) => void;
  onNavigateTab: (tab: 'complaints' | 'directory' | 'scorecard') => void;
  onOpenLoginOnboarding?: () => void;
  recentComplaints: Complaint[];
  userName: string;
}

export const CivicServicesHub: React.FC<CivicServicesHubProps> = ({
  selectedState,
  selectedDistrict,
  onOpenReportModal,
  onNavigateTab,
  onOpenLoginOnboarding,
  recentComplaints,
  userName,
}) => {
  const [nearbyStacks, setNearbyStacks] = useState<any[]>([]);
  const [joinedStacks, setJoinedStacks] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function loadNearbyStacks() {
      try {
        const res = await fetch(
          `/api/v1/complaints/stacks/nearby?districtId=${selectedDistrict.district_id}&radius=5000`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.stacks) setNearbyStacks(data.stacks);
        }
      } catch {
        // Offline mode fallback
      }
    }
    loadNearbyStacks();
  }, [selectedDistrict.district_id]);

  const handleJoinStack = async (stackCode: string) => {
    try {
      const res = await fetch(
        `/api/v1/complaints/stacks/${encodeURIComponent(stackCode)}/join`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }
      );
      if (res.ok) {
        setJoinedStacks((prev) => new Set(prev).add(stackCode));
        const refreshRes = await fetch(
          `/api/v1/complaints/stacks/nearby?districtId=${selectedDistrict.district_id}&radius=5000`
        );
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          if (data.stacks) setNearbyStacks(data.stacks);
        }
      }
    } catch {
      // Offline fallback
    }
  };
  return (
    <div className="space-y-6">
      {/* Citizen Welcome & Ward Status Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-stitch-card shadow-stitch-md border border-stitch-surface-border">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-stitch-ink-muted">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            <span className="font-semibold text-stitch-ink-secondary">
              Ward 14 • {selectedDistrict.district_name} ({selectedDistrict.local_governance_text.includes('Municipality/Corp: Yes') ? 'Urban' : 'Rural'})
            </span>
          </div>
          <h2 className="text-h2 font-black text-stitch-ink-primary tracking-tight mt-1">
            Hello, {userName}
          </h2>
          <p className="text-xs text-stitch-ink-muted">
            Public digital infrastructure active across {selectedDistrict.district_name}, {selectedState.name}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenLoginOnboarding && (
            <button
              type="button"
              onClick={onOpenLoginOnboarding}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-stitch-pill bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-bold text-stitch-navy transition-colors"
              title="Regional Hierarchy & Live GPS Onboarding"
            >
              <span className="material-symbols-outlined text-sm text-stitch-terracotta">my_location</span>
              <span>Re-lock GPS / Region</span>
            </button>
          )}
          <div className="flex items-center gap-1.5 bg-blue-50 px-3 py-1.5 rounded-stitch-pill border border-blue-200">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            <span className="text-xs font-mono font-bold text-blue-900">Resident ID #8942</span>
          </div>
        </div>
      </div>

      {/* Municipal Emergency SOS Banner (Google Stitch Design) */}
      <div className="w-full bg-red-50 rounded-stitch-card p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-red-200 shadow-stitch-sm">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-stitch-btn bg-red-600 flex items-center justify-center text-white font-mono font-black text-sm shrink-0 shadow-sm">
            SOS
          </div>
          <div>
            <h3 className="text-sm font-bold text-red-950 leading-tight">
              Municipal Emergency SOS Switchboard
            </h3>
            <p className="text-xs text-red-800">
              24/7 Police, Ambulance, Fire, Gas Leaks & Disaster Ops
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <a
            href="tel:112"
            className="flex-1 sm:flex-none min-h-touch px-5 py-2.5 rounded-stitch-btn bg-stitch-emergency hover:bg-stitch-emergency-hover text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
          >
            <span>[DIAL 112]</span>
          </a>
          <a
            href="tel:14420"
            className="flex-1 sm:flex-none min-h-touch px-4 py-2.5 rounded-stitch-btn bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
          >
            <span>[14420] SEWER</span>
          </a>
        </div>
      </div>

      {/* 3 Core Action Pathway Hero Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pathway 1: Report a Complaint */}
        <div className="bg-white rounded-stitch-card shadow-stitch-md border border-stitch-surface-border p-5 flex flex-col justify-between gap-4 border-t-4 border-t-stitch-terracotta">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stitch-terracotta">
              PATHWAY 1 • SUB-90-SEC FLOW
            </span>
            <h3 className="text-base font-bold text-stitch-ink-primary mt-1">
              Report a Complaint
            </h3>
            <p className="text-xs text-stitch-ink-secondary mt-1">
              Geo-tagged photo capture with MobileNetV3/ResNet50 computer vision check and automated departmental routing.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onOpenReportModal('Roads')}
            className="w-full min-h-touch px-4 py-2.5 rounded-stitch-btn bg-stitch-terracotta hover:bg-stitch-terracotta-hover text-white font-bold text-xs shadow-stitch-sm transition-all"
          >
            Launch Smart Complaint Engine →
          </button>
        </div>

        {/* Pathway 2: Find Helplines */}
        <div className="bg-white rounded-stitch-card shadow-stitch-md border border-stitch-surface-border p-5 flex flex-col justify-between gap-4 border-t-4 border-t-stitch-navy">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stitch-navy">
              PATHWAY 2 • VERIFIED DIRECTORY
            </span>
            <h3 className="text-base font-bold text-stitch-ink-primary mt-1">
              Find Helplines
            </h3>
            <p className="text-xs text-stitch-ink-secondary mt-1">
              170 administrative district matrices with one-tap auto-dialing, operating hours, and official portal links.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab('directory')}
            className="w-full min-h-touch px-4 py-2.5 rounded-stitch-btn bg-stitch-navy hover:bg-stitch-navy-light text-white font-bold text-xs shadow-stitch-sm transition-all"
          >
            Browse All 170 Districts →
          </button>
        </div>

        {/* Pathway 3: Track Your Complaint */}
        <div className="bg-white rounded-stitch-card shadow-stitch-md border border-stitch-surface-border p-5 flex flex-col justify-between gap-4 border-t-4 border-t-blue-600">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-700">
              PATHWAY 3 • 5-STAGE LIFECYCLE
            </span>
            <h3 className="text-base font-bold text-stitch-ink-primary mt-1">
              Track Your Complaint
            </h3>
            <p className="text-xs text-stitch-ink-secondary mt-1">
              Deterministic stepper, Before/After image proof, and statutory 48-hour citizen satisfaction window.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab('complaints')}
            className="w-full min-h-touch px-4 py-2.5 rounded-stitch-btn bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-stitch-sm transition-all"
          >
            Track Existing Tickets ({recentComplaints.length}) →
          </button>
        </div>
      </div>

      {/* Active Community Incident Stacks (Threshold-Driven Aggregation) */}
      {nearbyStacks.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-stitch-navy animate-pulse" />
              <h3 className="text-sm font-black text-stitch-ink-primary uppercase tracking-wider">
                Active Community Incident Stacks ({selectedDistrict.district_name})
              </h3>
            </div>
            <span className="text-xs text-stitch-ink-muted">
              Auto-aggregated by Spatio-Semantic Clustering Engine
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {nearbyStacks.slice(0, 4).map((stack) => (
              <IncidentStackCard
                key={stack.stack_id}
                stackCode={stack.stack_code}
                category={stack.category}
                subIssueLabel={stack.sub_issue_label}
                uniqueCitizenCount={stack.unique_citizen_count}
                kEffectiveThreshold={stack.k_effective_threshold}
                pooledCvConfidence={stack.pooled_cv_confidence}
                stackStatus={stack.stack_status}
                isCompoundHazard={stack.is_compound_hazard}
                assignedDepartment={stack.assigned_department}
                mustDispatchByIso={stack.must_dispatch_by}
                onOneTapJoinStack={() => handleJoinStack(stack.stack_code)}
                hasUserJoined={joinedStacks.has(stack.stack_code)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Primary Civic Categories Quick Tiles (Stitch Screen 1) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-stitch-ink-primary uppercase tracking-wider">
            Municipal Department Desks ({selectedDistrict.district_name})
          </h3>
          <span className="text-xs text-stitch-ink-muted">Tap to report or request</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            {
              cat: 'Roads' as ComplaintCategory,
              title: 'Roads & Streets',
              desc: 'Potholes, footpaths, signals & dividers',
              tag: 'SLA <4h to 72h',
              color: 'border-blue-200 bg-blue-50/50',
            },
            {
              cat: 'Water' as ComplaintCategory,
              title: 'Water Supply',
              desc: 'Pipeline bursts, dirty water & supply cuts',
              tag: 'SLA <24h',
              color: 'border-cyan-200 bg-cyan-50/50',
            },
            {
              cat: 'Garbage' as ComplaintCategory,
              title: 'Garbage & Sanitation',
              desc: 'Overflowing bins, door-to-door pickup',
              tag: 'SLA <72h',
              color: 'border-emerald-200 bg-emerald-50/50',
            },
            {
              cat: 'Drainage' as ComplaintCategory,
              title: 'Drainage & Sewage',
              desc: 'Clogged storm drains & NAMASTE 14420',
              tag: 'SLA <24h',
              color: 'border-purple-200 bg-purple-50/50',
            },
            {
              cat: 'Electricity' as ComplaintCategory,
              title: 'Electricity & Lighting',
              desc: 'Sparking lines, fallen poles & outages',
              tag: 'SLA <24h',
              color: 'border-amber-200 bg-amber-50/50',
            },
            {
              cat: 'Roads' as ComplaintCategory,
              title: 'District Escalation Desk',
              desc: `Collectorate Grievance Cell & Apex ${selectedState.nodal_helpline}`,
              tag: 'Apex Escalation',
              color: 'border-slate-200 bg-slate-50/60',
            },
          ].map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onOpenReportModal(item.cat)}
              className={`p-4 rounded-stitch-card border text-left transition-all hover:shadow-stitch-sm active:scale-[0.99] flex flex-col justify-between gap-2.5 ${item.color}`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-stitch-ink-primary">{item.title}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white text-slate-700 font-bold border border-slate-200">
                    {item.tag}
                  </span>
                </div>
                <p className="text-xs text-stitch-ink-secondary">{item.desc}</p>
              </div>

              <div className="text-xs font-bold text-stitch-navy flex items-center gap-1 pt-1">
                <span>Report Grievance</span>
                <span>→</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Civic Advisory Bulletin (Stitch Screen 1) */}
      <div className="bg-white rounded-stitch-card shadow-stitch-md border border-stitch-surface-border p-4.5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-stitch-navy text-white uppercase tracking-wider">
              CIVIC ADVISORY
            </span>
            <span className="text-xs font-bold text-stitch-ink-primary">
              Main Pipeline Upgrade & Maintenance Notice
            </span>
          </div>
          <span className="text-[11px] text-stitch-ink-muted">Published 45m ago</span>
        </div>
        <p className="text-xs text-stitch-ink-secondary leading-relaxed">
          The {selectedDistrict.district_name} Water Works division has scheduled urgent ductile iron valve replacement for Ward 14. Low water pressure is anticipated tomorrow between 09:00 AM and 11:30 AM. Municipal tankers will be on standby.
        </p>
      </div>

      {/* Quick Dial Helplines Bar */}
      <div className="bg-white rounded-stitch-card shadow-stitch-md border border-stitch-surface-border p-4.5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-stitch-ink-primary uppercase tracking-wider">
            Quick Dial Emergency Desks
          </h3>
          <span className="text-[11px] text-stitch-ink-muted">Toll-Free Verified Numbers</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <a
            href="tel:112"
            className="p-3 rounded-stitch-btn bg-stitch-surface-muted hover:bg-slate-200 text-center border border-stitch-surface-border transition-colors block"
          >
            <div className="text-xs font-bold text-stitch-ink-primary">ERSS Emergency</div>
            <div className="text-sm font-mono font-black text-red-600 mt-0.5">112</div>
          </a>

          <a
            href="tel:14420"
            className="p-3 rounded-stitch-btn bg-stitch-surface-muted hover:bg-slate-200 text-center border border-stitch-surface-border transition-colors block"
          >
            <div className="text-xs font-bold text-stitch-ink-primary">NAMASTE Sewer</div>
            <div className="text-sm font-mono font-black text-amber-700 mt-0.5">14420</div>
          </a>

          <a
            href="tel:1969"
            className="p-3 rounded-stitch-btn bg-stitch-surface-muted hover:bg-slate-200 text-center border border-stitch-surface-border transition-colors block"
          >
            <div className="text-xs font-bold text-stitch-ink-primary">Swachhata SWM</div>
            <div className="text-sm font-mono font-black text-emerald-700 mt-0.5">1969</div>
          </a>

          <a
            href={`tel:${selectedState.nodal_helpline}`}
            className="p-3 rounded-stitch-btn bg-stitch-surface-muted hover:bg-slate-200 text-center border border-stitch-surface-border transition-colors block"
          >
            <div className="text-xs font-bold text-stitch-ink-primary">State Nodal Desk</div>
            <div className="text-sm font-mono font-black text-stitch-navy mt-0.5">{selectedState.nodal_helpline}</div>
          </a>
        </div>
      </div>
    </div>
  );
};

