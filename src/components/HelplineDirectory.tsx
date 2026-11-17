import React, { useState, useMemo } from 'react';
import Fuse from 'fuse.js';
import { HelplineEndpoint, StateUT, DistrictRouting } from '../types';
import { executeOneTapCall } from '../services/dialer';

interface HelplineDirectoryProps {
  helplines: HelplineEndpoint[];
  selectedState: StateUT;
  selectedDistrict: DistrictRouting;
  onOpenAuditModal: (helpline: HelplineEndpoint) => void;
  governanceMode: 'All' | 'Urban' | 'Rural';
}

export const HelplineDirectory: React.FC<HelplineDirectoryProps> = ({
  helplines,
  selectedState,
  selectedDistrict,
  onOpenAuditModal,
  governanceMode,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [callNotification, setCallNotification] = useState<string | null>(null);

  // Setup Fuse.js fuzzy index
  const fuse = useMemo(() => {
    return new Fuse(helplines, {
      keys: [
        'organization_name',
        'department_name',
        'category',
        'sub_category',
        'geolocation_scope',
        'common_issues_covered',
        'contact_number',
        'primary_phone_raw',
        'fallback_phone_raw',
      ],
      threshold: 0.35,
      ignoreLocation: true,
    });
  }, [helplines]);

  // Filter pipeline
  const filteredHelplines = useMemo(() => {
    let results = helplines;

    // 1. Search filter
    if (searchQuery.trim().length > 1) {
      results = fuse.search(searchQuery.trim()).map((res) => res.item);
    }

    // 2. Category filter
    if (selectedCategory !== 'All') {
      if (selectedCategory === 'Emergency') {
        results = results.filter((h) => h.category === 'Emergency' || h.id.includes('namaste'));
      } else {
        results = results.filter((h) => h.category === selectedCategory);
      }
    }

    // 3. Governance mode filter (if Urban or Rural is chosen)
    if (governanceMode === 'Urban') {
      results = results.filter(
        (h) =>
          h.priority_tier <= 2 || // Always show National/State
          h.organization_name.toLowerCase().includes('municipality') ||
          h.organization_name.toLowerCase().includes('corp') ||
          h.organization_name.toLowerCase().includes('urban')
      );
    } else if (governanceMode === 'Rural') {
      results = results.filter(
        (h) =>
          h.priority_tier <= 2 ||
          h.organization_name.toLowerCase().includes('panchayat') ||
          h.organization_name.toLowerCase().includes('pr ') ||
          h.organization_name.toLowerCase().includes('rural')
      );
    }

    return results;
  }, [helplines, searchQuery, selectedCategory, governanceMode, fuse]);

  const categories: Array<{ id: string; label: string }> = [
    { id: 'All', label: 'All Desks' },
    { id: 'Emergency', label: 'Emergency (112 / 14420)' },
    { id: 'Roads', label: 'Roads & Streets' },
    { id: 'Water', label: 'Water Supply' },
    { id: 'Drainage', label: 'Drainage & Sewage' },
    { id: 'Garbage', label: 'Garbage & Sanitation' },
    { id: 'Electricity', label: 'Electricity & DISCOM' },
    { id: 'Consumer', label: 'Consumer Disputes (1915)' },
    { id: 'General', label: 'State & Central Apex' },
  ];

  return (
    <div className="space-y-6">
      {/* Search & Filter Header */}
      <div className="bg-white rounded-stitch-card shadow-stitch-md border border-stitch-surface-border p-5 space-y-4">
        <div>
          <h2 className="text-h3 font-bold text-stitch-ink-primary">
            Pan-India Civic Helpline Directory
          </h2>
          <p className="text-xs text-stitch-ink-muted">
            100% verified directory covering all 36 States/UTs, 170 Districts, and National Switchboards.
          </p>
        </div>

        {/* Search Input Bar */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by district, keyword (e.g. pothole, transformer, sewer), or helpline number..."
            className="w-full min-h-touch pl-4 pr-10 border border-stitch-surface-border rounded-stitch-btn text-xs sm:text-sm text-stitch-ink-primary focus:ring-2 focus:ring-stitch-navy focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-3.5 text-xs text-slate-400 hover:text-slate-600 font-bold"
            >
              CLEAR
            </button>
          )}
        </div>

        {/* Horizontal Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCategory(c.id)}
              className={`min-h-touch px-3.5 py-1.5 rounded-stitch-pill text-xs font-semibold whitespace-nowrap transition-all border ${
                selectedCategory === c.id
                  ? 'bg-stitch-navy text-white border-stitch-navy shadow-stitch-sm'
                  : 'bg-stitch-surface-muted text-stitch-ink-secondary border-stitch-surface-border hover:bg-slate-200'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Auto-Failover Notification Toast */}
      {callNotification && (
        <div className="p-3.5 bg-amber-50 rounded-stitch-btn border border-amber-300 text-xs text-amber-900 flex items-center justify-between animate-fadeIn">
          <span>{callNotification}</span>
          <button
            type="button"
            onClick={() => setCallNotification(null)}
            className="text-xs font-bold text-amber-700 hover:underline ml-3"
          >
            DISMISS
          </button>
        </div>
      )}

      {/* Results Count & Scope Display */}
      <div className="flex items-center justify-between text-xs text-stitch-ink-muted px-1">
        <span>Showing {filteredHelplines.length} verified helplines</span>
        <span>Scope: {selectedDistrict.district_name}, {selectedState.name} & National</span>
      </div>

      {/* Directory Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredHelplines.map((item) => {
          const isEmergency = item.category === 'Emergency' || item.id === 'nat-namaste-14420';
          const hasDirectNumber = item.callable_uri && item.primary_phone_raw && !item.primary_phone_raw.includes('xxxx');

          return (
            <div
              key={item.id}
              className={`p-5 rounded-stitch-card border transition-all flex flex-col justify-between gap-4 shadow-stitch-sm ${
                isEmergency
                  ? 'bg-red-50/50 border-red-200 hover:border-red-300'
                  : 'bg-white border-stitch-surface-border hover:border-slate-300'
              }`}
            >
              {/* Header: Scope, Category, Hours */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-stitch-ink-muted">
                    {item.geolocation_scope}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        isEmergency
                          ? 'bg-red-600 text-white'
                          : 'bg-stitch-navy text-white'
                      }`}
                    >
                      {item.category}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-stitch-surface-muted text-stitch-ink-secondary text-[10px] font-semibold border border-stitch-surface-border">
                      {item.operational_hours}
                    </span>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-stitch-ink-primary leading-tight">
                  {item.department_name}
                </h3>
                <p className="text-xs text-stitch-ink-muted">
                  {item.organization_name}
                </p>

                {item.common_issues_covered && (
                  <div className="text-[11px] text-stitch-ink-secondary bg-stitch-surface-canvas p-2.5 rounded-stitch-btn border border-stitch-surface-border mt-1">
                    <strong>Issues Covered:</strong> {item.common_issues_covered}
                  </div>
                )}
              </div>

              {/* Action Buttons: One-Tap Dial, Portal, Audit Flag */}
              <div className="pt-3 border-t border-stitch-surface-border flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      executeOneTapCall(item, {
                        onFallbackNotice: (msg) => setCallNotification(msg),
                      })
                    }
                    className={`flex-1 min-h-touch px-4 py-2.5 rounded-stitch-btn font-bold text-xs flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-stitch-sm ${
                      isEmergency
                        ? 'bg-stitch-emergency hover:bg-stitch-emergency-hover text-white'
                        : 'bg-stitch-navy hover:bg-stitch-navy-light text-white'
                    }`}
                  >
                    <span>[CALL]</span>
                    <span>
                      {hasDirectNumber
                        ? `Dial ${item.primary_phone_raw}`
                        : `Auto-Dial Nodal (${item.fallback_phone_raw})`}
                    </span>
                  </button>

                  {item.web_portal && (
                    <a
                      href={item.web_portal}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-touch px-3.5 py-2.5 rounded-stitch-btn border border-stitch-surface-border text-stitch-ink-primary text-xs font-semibold hover:bg-slate-50 flex items-center justify-center"
                    >
                      Portal
                    </a>
                  )}
                </div>

                {/* Report Number Flag Action */}
                <div className="flex items-center justify-between text-[11px] text-stitch-ink-muted px-1">
                  <span>
                    Escalation: {item.escalation_contact || 'District Collectorate'}
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpenAuditModal(item)}
                    className="text-stitch-terracotta hover:underline font-semibold"
                  >
                    [!] Report Outdated
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

