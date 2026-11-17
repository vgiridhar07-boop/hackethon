import React, { useState, useMemo } from 'react';
import { StateUT, DistrictSlaMetrics } from '../types';
import { DISTRICT_ROUTING_170 } from '../data/districtRouting170';

interface SlaScorecardProps {
  states: StateUT[];
  selectedState: StateUT;
}

export const SlaScorecard: React.FC<SlaScorecardProps> = ({
  states,
  selectedState,
}) => {
  const [filterState, setFilterState] = useState<string>(selectedState.name);
  const [sortKey, setSortKey] = useState<'compliance' | 'volume' | 'speed'>('compliance');

  // Generate realistic SLA metrics for districts in the selected state
  const districtMetrics = useMemo<DistrictSlaMetrics[]>(() => {
    const districts = DISTRICT_ROUTING_170.filter(
      (d) => d.state_ut_name.toLowerCase() === filterState.toLowerCase()
    );

    return districts.map((d, index) => {
      const baseComplaints = 140 + ((d.district_id * 17) % 310);
      const resolved = Math.round(baseComplaints * (0.84 + ((d.district_id * 7) % 14) / 100));
      const compliance = Math.round((resolved / baseComplaints) * 100);
      const avgHours = Math.round(18 + ((d.district_id * 3) % 45));

      return {
        district_id: d.district_id,
        district_name: d.district_name,
        state_name: d.state_ut_name,
        total_complaints: baseComplaints,
        resolved_complaints: resolved,
        avg_resolution_hours: avgHours,
        sla_compliance_rate: compliance,
        critical_under_4h_rate: 92 + (index % 7),
        urgent_under_24h_rate: 88 + (index % 9),
        standard_under_72h_rate: 94 + (index % 5),
      };
    });
  }, [filterState]);

  // Sort metrics
  const sortedMetrics = useMemo(() => {
    return [...districtMetrics].sort((a, b) => {
      if (sortKey === 'compliance') return b.sla_compliance_rate - a.sla_compliance_rate;
      if (sortKey === 'volume') return b.total_complaints - a.total_complaints;
      return a.avg_resolution_hours - b.avg_resolution_hours;
    });
  }, [districtMetrics, sortKey]);

  return (
    <div className="space-y-6">
      {/* Header & Filter */}
      <div className="bg-white rounded-stitch-card shadow-stitch-md border border-stitch-surface-border p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-h3 font-bold text-stitch-ink-primary">
              Open Civic Data & Municipal SLA Scorecard
            </h2>
            <p className="text-xs text-stitch-ink-muted">
              Auditable public governance metrics measuring response times against statutory SLAs (&lt;4h, &lt;24h, &lt;72h).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="scorecard-state-filter" className="text-xs font-bold text-stitch-ink-muted uppercase">
              State:
            </label>
            <select
              id="scorecard-state-filter"
              value={filterState}
              onChange={(e) => setFilterState(e.target.value)}
              className="min-h-touch px-3 py-1.5 border border-stitch-surface-border rounded-stitch-btn text-xs font-semibold bg-white text-stitch-ink-primary"
            >
              {states.map((st) => (
                <option key={st.code} value={st.name}>
                  {st.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* National Benchmark Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3 bg-stitch-surface-canvas rounded-stitch-btn border border-stitch-surface-border">
            <span className="text-[10px] font-bold uppercase text-stitch-ink-muted block">
              Critical SLA (&lt;4h)
            </span>
            <span className="text-lg font-black text-red-600 font-mono">94.8%</span>
            <span className="text-[10px] text-stitch-ink-muted block">Road hazards & gas leaks</span>
          </div>

          <div className="p-3 bg-stitch-surface-canvas rounded-stitch-btn border border-stitch-surface-border">
            <span className="text-[10px] font-bold uppercase text-stitch-ink-muted block">
              Urgent SLA (&lt;24h)
            </span>
            <span className="text-lg font-black text-amber-600 font-mono">91.2%</span>
            <span className="text-[10px] text-stitch-ink-muted block">Water & sewer disruptions</span>
          </div>

          <div className="p-3 bg-stitch-surface-canvas rounded-stitch-btn border border-stitch-surface-border">
            <span className="text-[10px] font-bold uppercase text-stitch-ink-muted block">
              Standard SLA (&lt;72h)
            </span>
            <span className="text-lg font-black text-emerald-600 font-mono">96.5%</span>
            <span className="text-[10px] text-stitch-ink-muted block">Litter & street lighting</span>
          </div>

          <div className="p-3 bg-stitch-surface-canvas rounded-stitch-btn border border-stitch-surface-border">
            <span className="text-[10px] font-bold uppercase text-stitch-ink-muted block">
              Citizen Satisfaction
            </span>
            <span className="text-lg font-black text-stitch-navy font-mono">89.4%</span>
            <span className="text-[10px] text-stitch-ink-muted block">Verified post-48h window</span>
          </div>
        </div>
      </div>

      {/* Sorting Controls */}
      <div className="flex items-center justify-between text-xs px-1">
        <span className="text-stitch-ink-muted">
          Showing rankings for {sortedMetrics.length} districts in {filterState}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-stitch-ink-muted">Sort by:</span>
          {(
            [
              { id: 'compliance', label: 'SLA Compliance' },
              { id: 'speed', label: 'Fastest Resolution' },
              { id: 'volume', label: 'Total Volume' },
            ] as const
          ).map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSortKey(s.id)}
              className={`px-2.5 py-1 rounded-stitch-btn font-semibold text-xs transition-colors ${
                sortKey === s.id
                  ? 'bg-stitch-navy text-white'
                  : 'bg-white border border-stitch-surface-border text-stitch-ink-secondary hover:bg-slate-50'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* District Rankings Table */}
      <div className="bg-white rounded-stitch-card shadow-stitch-md border border-stitch-surface-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stitch-navy text-white font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Rank & District</th>
                <th className="py-3 px-4">Total Logged</th>
                <th className="py-3 px-4">Resolved</th>
                <th className="py-3 px-4">Avg Speed</th>
                <th className="py-3 px-4">&lt;4h Critical</th>
                <th className="py-3 px-4">&lt;24h Urgent</th>
                <th className="py-3 px-4">Overall Compliance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stitch-surface-border">
              {sortedMetrics.map((row, idx) => (
                <tr key={row.district_id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-bold text-stitch-ink-primary">
                    <span className="text-stitch-ink-muted mr-2">#{idx + 1}</span>
                    {row.district_name}
                  </td>
                  <td className="py-3 px-4 font-mono font-semibold text-stitch-ink-secondary">
                    {row.total_complaints}
                  </td>
                  <td className="py-3 px-4 font-mono font-semibold text-emerald-700">
                    {row.resolved_complaints}
                  </td>
                  <td className="py-3 px-4 font-mono text-stitch-ink-primary">
                    {row.avg_resolution_hours} Hours
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-700">
                    {row.critical_under_4h_rate}%
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-700">
                    {row.urgent_under_24h_rate}%
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-emerald-700">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-600 rounded-full"
                          style={{ width: `${row.sla_compliance_rate}%` }}
                        />
                      </div>
                      <span>{row.sla_compliance_rate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

