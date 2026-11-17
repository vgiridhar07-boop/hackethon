import { DISTRICT_ROUTING_170 } from '../data/districtRouting170';
import { STATES_UTS } from '../data/statesUts';
import { DistrictRouting, StateUT } from '../types';

export interface GeolocationLock {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface WardResolutionResult {
  district: DistrictRouting;
  state: StateUT;
  address_text: string;
  is_urban: boolean;
  mandal_name: string;
}

// Approximate coordinate centroids for major district headquarters in dataset
const DISTRICT_CENTROIDS: Record<number, { lat: number; lng: number }> = {
  10: { lat: 16.3067, lng: 80.4365 }, // Guntur, AP
  25: { lat: 17.6868, lng: 83.2185 }, // Visakhapatnam, AP
  16: { lat: 16.5062, lng: 80.648 }, // NTR (Vijayawada), AP
  116: { lat: 12.9716, lng: 77.5946 }, // Bengaluru Urban, KA
  149: { lat: 17.385, lng: 78.4867 }, // Hyderabad, TG
  147: { lat: 13.0827, lng: 80.2707 }, // Chennai, TN
  126: { lat: 18.9388, lng: 72.8354 }, // Mumbai City, MH
  128: { lat: 18.5204, lng: 73.8567 }, // Pune, MH
  164: { lat: 28.6139, lng: 77.209 }, // New Delhi, DL
  83: { lat: 25.5941, lng: 85.1376 }, // Patna, BR
  143: { lat: 26.9124, lng: 75.7873 }, // Jaipur, RJ
  153: { lat: 26.8467, lng: 80.9462 }, // Lucknow, UP
  122: { lat: 23.2599, lng: 77.4126 }, // Bhopal, MP
  158: { lat: 22.5726, lng: 88.3639 }, // Kolkata, WB
  102: { lat: 23.0225, lng: 72.5714 }, // Ahmedabad, GJ
  119: { lat: 8.5241, lng: 76.9366 }, // Thiruvananthapuram, KL
  139: { lat: 20.2961, lng: 85.8245 }, // Khordha (Bhubaneswar), OD
  93: { lat: 21.2514, lng: 81.6296 }, // Raipur, CG
  113: { lat: 23.3441, lng: 85.3096 }, // Ranchi, JH
  141: { lat: 30.901, lng: 75.8573 }, // Ludhiana, PB
};

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  return Math.sqrt(Math.pow(lat1 - lat2, 2) + Math.pow(lon1 - lon2, 2));
}

export async function getCurrentGpsPosition(): Promise<GeolocationLock> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation hardware API not supported by browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        });
      },
      (_err) => {
        // Fallback default coordinates (Guntur, AP) for testing or denied permissions
        resolve({
          latitude: 16.3067,
          longitude: 80.4365,
          accuracy: 15,
          timestamp: Date.now(),
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  });
}

export function reverseResolveWard(lat: number, lng: number): WardResolutionResult {
  // Find closest district in dataset based on coordinate centroids
  let bestDistrictId = 10; // Guntur default
  let minDistance = Infinity;

  for (const [idStr, coords] of Object.entries(DISTRICT_CENTROIDS)) {
    const dId = parseInt(idStr, 10);
    const dist = calculateDistance(lat, lng, coords.lat, coords.lng);
    if (dist < minDistance) {
      minDistance = dist;
      bestDistrictId = dId;
    }
  }

  const district =
    DISTRICT_ROUTING_170.find((d) => d.district_id === bestDistrictId) ||
    DISTRICT_ROUTING_170[9]; // Guntur fallback

  const state =
    STATES_UTS.find((s) => s.name.toLowerCase() === district.state_ut_name.toLowerCase()) ||
    STATES_UTS[0];

  const isUrban = district.local_governance_text.includes('Municipality/Corp: Yes');

  // Extract first mandal name
  const mandalMatch = district.mandals_villages_text.match(/:\s*([A-Za-z.\s]+)[,.]/);
  const mandalName = mandalMatch ? mandalMatch[1].trim() : district.district_name;

  return {
    district,
    state,
    address_text: `${mandalName}, ${district.district_name}, ${district.state_ut_name}`,
    is_urban: isUrban,
    mandal_name: mandalName,
  };
}

export interface NominatimReverseResult {
  stateName: string;
  matchedState: StateUT;
  districtName: string;
  matchedDistrict: DistrictRouting;
  formattedAddress: string;
  rawAddress: any;
}

/**
 * Reverse geocoding via OpenStreetMap Nominatim with sovereign administrative hierarchy matching
 */
export async function reverseGeocodeWithNominatim(
  lat: number,
  lng: number
): Promise<NominatimReverseResult> {
  let formattedAddress = '';
  let rawState = '';
  let rawDistrict = '';
  let rawAddressData: any = null;

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'CivicHelplineIndia/1.0',
        },
      }
    );

    if (res.ok) {
      const data = await res.json();
      rawAddressData = data.address || {};
      formattedAddress = data.display_name || '';
      rawState = rawAddressData.state || rawAddressData.state_code || '';
      rawDistrict =
        rawAddressData.state_district ||
        rawAddressData.county ||
        rawAddressData.city ||
        rawAddressData.town ||
        rawAddressData.suburb ||
        '';
    }
  } catch (err) {
    console.warn('Nominatim network lookup failed, using local centroid mapping fallback:', err);
  }

  // Fallback to local centroid resolver if Nominatim fails or returns incomplete data
  const fallback = reverseResolveWard(lat, lng);
  if (!formattedAddress) {
    formattedAddress = fallback.address_text;
  }

  // Normalize state matching against sovereign 36 STATES_UTS
  let matchedState: StateUT = fallback.state;
  const foundState = STATES_UTS.find((s) => {
    if (!rawState) return false;
    const sName = s.name.toLowerCase();
    const qState = rawState.toLowerCase();
    return sName.includes(qState) || qState.includes(sName);
  });

  if (foundState) {
    matchedState = foundState;
  }

  // Filter districts belonging to the matched state
  const stateDistricts = DISTRICT_ROUTING_170.filter(
    (d) => d.state_ut_name.toLowerCase() === matchedState.name.toLowerCase()
  );

  // Normalize district matching against the 170 sovereign districts
  let matchedDistrict: DistrictRouting = fallback.district;

  if (rawDistrict && stateDistricts.length > 0) {
    const qDist = rawDistrict.toLowerCase().replace(/district/gi, '').trim();
    const foundDist = stateDistricts.find((d) => {
      const dName = d.district_name.toLowerCase();
      return dName.includes(qDist) || qDist.includes(dName);
    });
    if (foundDist) {
      matchedDistrict = foundDist;
    }
  }

  if (matchedDistrict === fallback.district && rawDistrict) {
    // If not matched directly in state, check across all 170 districts
    const qDist = rawDistrict.toLowerCase().replace(/district/gi, '').trim();
    const globalMatch = DISTRICT_ROUTING_170.find((d) => {
      const dName = d.district_name.toLowerCase();
      return dName.includes(qDist) || qDist.includes(dName);
    });
    if (globalMatch) {
      matchedDistrict = globalMatch;
      const associatedState = STATES_UTS.find(
        (s) => s.name.toLowerCase() === globalMatch.state_ut_name.toLowerCase()
      );
      if (associatedState) {
        matchedState = associatedState;
      }
    }
  }

  return {
    stateName: matchedState.name,
    matchedState,
    districtName: matchedDistrict.district_name,
    matchedDistrict,
    formattedAddress,
    rawAddress: rawAddressData,
  };
}
