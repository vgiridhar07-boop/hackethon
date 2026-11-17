import React from 'react';
import { StateUT, DistrictRouting } from '../types';

interface JurisdictionSelectorProps {
  states: StateUT[];
  districts: DistrictRouting[];
  selectedState: StateUT;
  selectedDistrict: DistrictRouting;
  onSelectState: (state: StateUT) => void;
  onSelectDistrict: (district: DistrictRouting) => void;
  isGpsActive: boolean;
  onTriggerGps: () => void;
  governanceMode: 'All' | 'Urban' | 'Rural';
  onChangeGovernanceMode: (mode: 'All' | 'Urban' | 'Rural') => void;
}

export const JurisdictionSelector: React.FC<JurisdictionSelectorProps> = ({
  states,
  districts,
  selectedState,
  selectedDistrict,
  onSelectState,
  onSelectDistrict,
  isGpsActive,
  onTriggerGps,
  governanceMode,
  onChangeGovernanceMode,
}) => {
  // Filter districts belonging to the active state
  const stateDistricts = districts.filter(
    (d) => d.state_ut_name.toLowerCase() === selectedState.name.toLowerCase()
  );

  return (
    <div className="bg-white rounded-stitch-card shadow-stitch-md border border-stitch-surface-border p-4 mb-6">
      {/* Top Status Bar: GPS & Geofence Notice */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-stitch-surface-border">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-stitch-ink-secondary">
            {isGpsActive ? (
              <span className="text-emerald-700 font-bold">
                [GPS LOCKED] {selectedDistrict.district_name}, {selectedState.name}
              </span>
            ) : (
              <span>Jurisdiction: {selectedDistrict.district_name}, {selectedState.name}</span>
            )}
          </span>
        </div>

        <button
          type="button"
          onClick={onTriggerGps}
          className="min-h-touch px-3 py-1.5 rounded-stitch-btn bg-stitch-surface-muted hover:bg-slate-200 text-stitch-ink-primary text-xs font-semibold flex items-center gap-1.5 transition-colors border border-stitch-surface-border"
        >
          <span>[GPS]</span>
          <span>Auto-Detect Current Ward</span>
        </button>
      </div>

      {/* Cascading State & District Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
        {/* State/UT Selector */}
        <div>
          <label htmlFor="state-selector" className="block text-xs font-bold uppercase tracking-wider text-stitch-ink-muted mb-1.5">
            1. Select State or Union Territory (36 Jurisdictions)
          </label>
          <select
            id="state-selector"
            value={selectedState.code}
            onChange={(e) => {
              const st = states.find((s) => s.code === e.target.value);
              if (st) onSelectState(st);
            }}
            className="w-full min-h-touch px-3.5 py-2.5 bg-white border border-stitch-surface-border rounded-stitch-btn text-sm font-semibold text-stitch-ink-primary focus:outline-none focus:ring-2 focus:ring-stitch-navy transition-all"
          >
            {states.map((st) => (
              <option key={st.code} value={st.code}>
                {st.name} ({st.type})
              </option>
            ))}
          </select>
        </div>

        {/* District Selector */}
        <div>
          <label htmlFor="district-selector" className="block text-xs font-bold uppercase tracking-wider text-stitch-ink-muted mb-1.5">
            2. Select Administrative District / ULB ({stateDistricts.length} Available)
          </label>
          <select
            id="district-selector"
            value={selectedDistrict.district_id}
            onChange={(e) => {
              const dId = parseInt(e.target.value, 10);
              const dist = districts.find((d) => d.district_id === dId);
              if (dist) onSelectDistrict(dist);
            }}
            className="w-full min-h-touch px-3.5 py-2.5 bg-white border border-stitch-surface-border rounded-stitch-btn text-sm font-semibold text-stitch-ink-primary focus:outline-none focus:ring-2 focus:ring-stitch-navy transition-all"
          >
            {stateDistricts.map((d) => (
              <option key={d.district_id} value={d.district_id}>
                {d.district_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Governance Tier Filter & Dataset Details */}
      <div className="mt-4 pt-3 border-t border-stitch-surface-border flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-stitch-ink-muted uppercase tracking-wider">Governance Filter:</span>
          <div className="inline-flex rounded-stitch-btn bg-stitch-surface-muted p-1 border border-stitch-surface-border">
            {(['All', 'Urban', 'Rural'] as const).map((tier) => (
              <button
                key={tier}
                type="button"
                onClick={() => onChangeGovernanceMode(tier)}
                className={`px-3 py-1 rounded-stitch-btn font-semibold transition-all ${
                  governanceMode === tier
                    ? 'bg-stitch-navy text-white shadow-stitch-sm'
                    : 'text-stitch-ink-secondary hover:text-stitch-ink-primary'
                }`}
              >
                {tier}
              </button>
            ))}
          </div>
        </div>

        <div className="text-stitch-ink-muted">
          <span className="font-semibold text-stitch-ink-secondary">{selectedDistrict.local_governance_text}</span>
          <span className="mx-2">•</span>
          <span>Source: Administrative Directory Page {selectedDistrict.source_pdf_page}</span>
        </div>
      </div>
    </div>
  );
};

