import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { RegionalServerProfile, EmergencyHelplineItem } from '../services/regionRouter';

export interface ResolvedLocationData {
  country: string;
  state: string;
  district: string;
  city?: string;
  postalCode?: string;
  formattedAddress?: string;
  stateId?: number;
  districtId?: number;
  lat?: number;
  lng?: number;
}

export interface PoliceContactInfo {
  number: string;
  label: string;
  localPsContact?: string;
}

export type LocationDetectionStatus = 'idle' | 'detecting' | 'resolved' | 'denied' | 'error';

export interface RegionContextType {
  regionContext: RegionalServerProfile;
  locationStatus: LocationDetectionStatus;
  resolvedLocation: ResolvedLocationData | null;
  helplines: EmergencyHelplineItem[];
  policeInfo: PoliceContactInfo;
  isHelplinesDrawerOpen: boolean;
  setIsHelplinesDrawerOpen: (open: boolean) => void;
  isCallPoliceModalOpen: boolean;
  setIsCallPoliceModalOpen: (open: boolean) => void;
  detectLocation: (forcePrompt?: boolean) => Promise<void>;
  connectToManualRegion: (stateName: string, districtName: string) => Promise<void>;
  errorMessage: string | null;
}

const DEFAULT_REGION: RegionalServerProfile = {
  regionId: 'ap-guntur',
  serverLabel: 'Guntur Regional Server (AP)',
  jurisdiction: 'Guntur District Administration & GMC Command Cell',
  state: 'Andhra Pradesh',
  district: 'Guntur',
  districtId: 10,
  stateId: 1,
  apiCluster: 'cluster-ap-south.civic.gov.in',
  timezone: 'Asia/Kolkata',
  status: 'online',
  latencyMs: 14,
};

const DEFAULT_RESOLVED: ResolvedLocationData = {
  country: 'India',
  state: 'Andhra Pradesh',
  district: 'Guntur',
  city: 'Guntur',
  postalCode: '522002',
  formattedAddress: 'Ward 14, Main Road, Guntur, Andhra Pradesh, 522002, India',
  stateId: 1,
  districtId: 10,
  lat: 16.3067,
  lng: 80.4365,
};

const DEFAULT_POLICE: PoliceContactInfo = {
  number: '100',
  label: 'Police Control Room (Guntur)',
  localPsContact: 'Pattabhipuram Police Station (Guntur Urban): 0863-2231866',
};

const RegionContext = createContext<RegionContextType>({
  regionContext: DEFAULT_REGION,
  locationStatus: 'idle',
  resolvedLocation: DEFAULT_RESOLVED,
  helplines: [],
  policeInfo: DEFAULT_POLICE,
  isHelplinesDrawerOpen: false,
  setIsHelplinesDrawerOpen: () => {},
  isCallPoliceModalOpen: false,
  setIsCallPoliceModalOpen: () => {},
  detectLocation: async () => {},
  connectToManualRegion: async () => {},
  errorMessage: null,
});

export const RegionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [regionContext, setRegionContext] = useState<RegionalServerProfile>(() => {
    try {
      const saved = localStorage.getItem('civic_region_profile');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_REGION;
  });

  const [resolvedLocation, setResolvedLocation] = useState<ResolvedLocationData | null>(() => {
    try {
      const saved = localStorage.getItem('civic_resolved_location');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_RESOLVED;
  });

  const [locationStatus, setLocationStatus] = useState<LocationDetectionStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [helplines, setHelplines] = useState<EmergencyHelplineItem[]>([]);
  const [policeInfo, setPoliceInfo] = useState<PoliceContactInfo>(DEFAULT_POLICE);
  const [isHelplinesDrawerOpen, setIsHelplinesDrawerOpen] = useState(false);
  const [isCallPoliceModalOpen, setIsCallPoliceModalOpen] = useState(false);

  // Sync region headers to localStorage for outbound fetch tracking
  useEffect(() => {
    if (regionContext) {
      localStorage.setItem('civic_region_id', regionContext.regionId);
      localStorage.setItem('civic_region_state', regionContext.state);
      localStorage.setItem('civic_region_district', regionContext.district);
    }
  }, [regionContext]);

  // Fetch dynamic location-based emergency helplines
  const fetchHelplines = useCallback(async (state: string, district: string) => {
    try {
      const res = await fetch(
        `/api/helplines?state=${encodeURIComponent(state)}&district=${encodeURIComponent(district)}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.helplines) setHelplines(data.helplines);
        if (data.policePrimary) setPoliceInfo(data.policePrimary);
      }
    } catch (err) {
      console.warn('Failed to fetch helplines from backend:', err);
    }
  }, []);

  // Connect to a region manually (e.g. from State/District dropdown)
  const connectToManualRegion = useCallback(
    async (stateName: string, districtName: string) => {
      setErrorMessage(null);
      try {
        const res = await fetch('/api/region/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ state: stateName, district: districtName }),
        });

        if (!res.ok) throw new Error('Failed to connect to regional server.');

        const data = await res.json();
        const serverProfile: RegionalServerProfile = data.regionContext;
        setRegionContext(serverProfile);
        localStorage.setItem('civic_region_profile', JSON.stringify(serverProfile));

        const updatedLoc: ResolvedLocationData = {
          country: 'India',
          state: stateName,
          district: districtName,
          city: districtName,
          formattedAddress: `${districtName}, ${stateName}, India`,
          stateId: serverProfile.stateId,
          districtId: serverProfile.districtId,
        };
        setResolvedLocation(updatedLoc);
        localStorage.setItem('civic_resolved_location', JSON.stringify(updatedLoc));

        setLocationStatus('resolved');
        await fetchHelplines(stateName, districtName);
      } catch (err: any) {
        setErrorMessage(err.message || 'Error connecting to regional server.');
      }
    },
    [fetchHelplines]
  );

  // Detect location via Browser Geolocation API
  const detectLocation = useCallback(
    async (_forcePrompt = false) => {
      if (typeof window === 'undefined' || !navigator.geolocation) {
        setLocationStatus('error');
        setErrorMessage('Geolocation hardware is not supported by your browser.');
        return;
      }

      setLocationStatus('detecting');
      setErrorMessage(null);

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          try {
            const res = await fetch('/api/location/resolve', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ lat, lng }),
            });

            if (!res.ok) throw new Error('Regional reverse geocoding failed.');

            const data = await res.json();
            const resolved: ResolvedLocationData = data.resolved;
            const serverProfile: RegionalServerProfile = data.regionContext;

            setResolvedLocation(resolved);
            setRegionContext(serverProfile);
            setLocationStatus('resolved');

            localStorage.setItem('civic_resolved_location', JSON.stringify(resolved));
            localStorage.setItem('civic_region_profile', JSON.stringify(serverProfile));

            await fetchHelplines(resolved.state, resolved.district);
          } catch (err: any) {
            console.warn('Coordinate resolution error:', err);
            // Default to Guntur, Andhra Pradesh on server error
            await connectToManualRegion('Andhra Pradesh', 'Guntur');
            setLocationStatus('resolved');
          }
        },
        (error) => {
          console.warn('Geolocation permission or hardware error:', error.message);
          if (error.code === error.PERMISSION_DENIED) {
            setLocationStatus('denied');
            setErrorMessage('Location permission was denied. Select your State & District manually below.');
          } else {
            setLocationStatus('error');
            setErrorMessage('Unable to obtain GPS lock. Select your State & District manually below.');
          }
          // Do NOT block login: load current or default helplines
          const state = resolvedLocation?.state || 'Andhra Pradesh';
          const dist = resolvedLocation?.district || 'Guntur';
          fetchHelplines(state, dist);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000,
        }
      );
    },
    [connectToManualRegion, fetchHelplines, resolvedLocation]
  );

  // On initial mount of the application: request location immediately on the first page!
  useEffect(() => {
    // If permissions API is available, inspect permission status
    if (typeof navigator !== 'undefined' && 'permissions' in navigator) {
      navigator.permissions
        .query({ name: 'geolocation' as PermissionName })
        .then((permissionStatus) => {
          if (permissionStatus.state === 'denied') {
            setLocationStatus('denied');
            setErrorMessage('Location permission was denied. Select your State & District manually below.');
            fetchHelplines(regionContext.state, regionContext.district);
          } else {
            // Prompt immediately for location
            detectLocation();
          }

          permissionStatus.onchange = () => {
            if (permissionStatus.state === 'granted') {
              detectLocation(true);
            } else if (permissionStatus.state === 'denied') {
              setLocationStatus('denied');
            }
          };
        })
        .catch(() => {
          // Safe fallback for browsers without permissions API query support
          detectLocation();
        });
    } else {
      detectLocation();
    }
  }, []);

  return (
    <RegionContext.Provider
      value={{
        regionContext,
        locationStatus,
        resolvedLocation,
        helplines,
        policeInfo,
        isHelplinesDrawerOpen,
        setIsHelplinesDrawerOpen,
        isCallPoliceModalOpen,
        setIsCallPoliceModalOpen,
        detectLocation,
        connectToManualRegion,
        errorMessage,
      }}
    >
      {children}
    </RegionContext.Provider>
  );
};

export const useRegion = () => useContext(RegionContext);
