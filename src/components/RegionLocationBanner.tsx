import React, { useState } from 'react';
import { useRegion } from '../context/RegionContext';
import { STATES_UTS } from '../data/statesUts';
import { DISTRICT_ROUTING_170 } from '../data/districtRouting170';

interface RegionLocationBannerProps {
  className?: string;
  onOpenHelplines?: () => void;
}

export const RegionLocationBanner: React.FC<RegionLocationBannerProps> = ({
  className = '',
  onOpenHelplines,
}) => {
  const {
    regionContext,
    locationStatus,
    resolvedLocation,
    detectLocation,
    connectToManualRegion,
    errorMessage,
    helplines,
  } = useRegion();

  const [isChangingManual, setIsChangingManual] = useState(false);
  const [selectedState, setSelectedState] = useState(regionContext.state || 'Andhra Pradesh');
  const [selectedDistrict, setSelectedDistrict] = useState(regionContext.district || 'Guntur');
  const [connecting, setConnecting] = useState(false);

  // Filter districts belonging to selected state
  const availableDistricts = DISTRICT_ROUTING_170.filter(
    (d) => d.state_ut_name.toLowerCase() === selectedState.toLowerCase()
  );

  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newState = e.target.value;
    setSelectedState(newState);
    const districtsForState = DISTRICT_ROUTING_170.filter(
      (d) => d.state_ut_name.toLowerCase() === newState.toLowerCase()
    );
    if (districtsForState.length > 0) {
      setSelectedDistrict(districtsForState[0].district_name);
    }
  };

  const handleApplyManualLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnecting(true);
    try {
      await connectToManualRegion(selectedState, selectedDistrict);
      setIsChangingManual(false);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div
      className={`w-full bg-slate-900 border-b border-slate-800 text-slate-100 px-4 py-2.5 transition-all text-xs font-sans ${className}`}
    >
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2.5">
        {/* Left Side: Status Display */}
        <div className="flex items-center gap-2.5 flex-wrap justify-center md:justify-start">
          {/* DETECTING STATE */}
          {locationStatus === 'detecting' && (
            <div className="flex items-center gap-2 text-amber-300">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
              <span className="font-medium">
                Detecting your location to connect to your regional server and local helplines...
              </span>
            </div>
          )}

          {/* RESOLVED STATE */}
          {locationStatus === 'resolved' && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              <span className="text-slate-300">
                Location:{' '}
                <strong className="text-white">
                  {resolvedLocation?.district || regionContext.district},{' '}
                  {resolvedLocation?.state || regionContext.state}
                </strong>
              </span>
              <span className="text-slate-500">•</span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 font-mono text-[11px] font-bold">
                <span className="material-symbols-outlined text-xs text-emerald-400">dns</span>
                <span>{regionContext.serverLabel}</span>
                <span className="text-slate-400 font-normal">({regionContext.latencyMs}ms)</span>
              </span>
            </div>
          )}

          {/* DENIED / ERROR STATE */}
          {(locationStatus === 'denied' || locationStatus === 'error') && !isChangingManual && (
            <div className="flex items-center gap-2 text-amber-300">
              <span className="material-symbols-outlined text-sm text-amber-400 shrink-0">
                location_off
              </span>
              <span>
                {errorMessage ||
                  'Location access not granted. Select your jurisdiction manually:'}
              </span>
              <button
                type="button"
                onClick={() => setIsChangingManual(true)}
                className="ml-1 font-bold text-white underline hover:text-amber-200"
              >
                Select State &amp; District
              </button>
            </div>
          )}
        </div>

        {/* Right Side: Quick Action Buttons & Helplines Drawer Trigger */}
        <div className="flex items-center gap-2 flex-wrap justify-center">
          {locationStatus === 'resolved' && !isChangingManual && (
            <>
              <button
                type="button"
                onClick={() => setIsChangingManual(true)}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-xs">edit_location</span>
                <span>Change</span>
              </button>

              <button
                type="button"
                onClick={() => detectLocation(true)}
                title="Refresh GPS Coordinates"
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-xs">my_location</span>
                <span>Refresh GPS</span>
              </button>
            </>
          )}

          {/* View Local Helplines Button */}
          {onOpenHelplines && (
            <button
              type="button"
              onClick={onOpenHelplines}
              className="px-3 py-1 rounded-stitch-btn bg-stitch-navy hover:bg-stitch-navy-light text-white font-bold text-[11px] flex items-center gap-1.5 transition-all shadow-stitch-sm"
            >
              <span className="material-symbols-outlined text-xs text-stitch-terracotta">
                contact_phone
              </span>
              <span>
                Local Helplines ({helplines.length > 0 ? helplines.length : 'Active'})
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Manual State & District Selector Dropdown (Fallback / Edit mode) */}
      {isChangingManual && (
        <form
          onSubmit={handleApplyManualLocation}
          className="max-w-6xl mx-auto mt-2.5 pt-2.5 border-t border-slate-800 flex flex-wrap items-center gap-2.5 animate-fadeIn"
        >
          <span className="font-mono text-[11px] text-slate-400 font-bold uppercase shrink-0">
            Manual Jurisdiction Connect:
          </span>

          <div className="flex-1 min-w-[160px]">
            <select
              value={selectedState}
              onChange={handleStateChange}
              className="w-full px-2.5 py-1.5 rounded bg-slate-800 border border-slate-700 text-white font-medium text-xs focus:outline-none focus:ring-1 focus:ring-stitch-terracotta"
            >
              {STATES_UTS.map((st) => (
                <option key={st.state_id} value={st.name}>
                  {st.name} ({st.code})
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[160px]">
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded bg-slate-800 border border-slate-700 text-white font-medium text-xs focus:outline-none focus:ring-1 focus:ring-stitch-terracotta"
            >
              {availableDistricts.length > 0 ? (
                availableDistricts.map((d) => (
                  <option key={d.district_id} value={d.district_name}>
                    {d.district_name}
                  </option>
                ))
              ) : (
                <option value={selectedDistrict}>{selectedDistrict || 'Default District'}</option>
              )}
            </select>
          </div>

          <button
            type="submit"
            disabled={connecting}
            className="px-3.5 py-1.5 rounded bg-stitch-terracotta hover:bg-stitch-terracotta-hover text-white font-bold text-xs uppercase flex items-center gap-1 shadow-stitch-sm transition-all disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-xs">hub</span>
            <span>{connecting ? 'Connecting...' : 'Connect to Server'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsChangingManual(false)}
            className="px-2.5 py-1.5 text-slate-400 hover:text-white text-xs font-medium"
          >
            Cancel
          </button>
        </form>
      )}
    </div>
  );
};

export default RegionLocationBanner;
