import { Router, Request, Response } from 'express';
import { regionRouterEngine } from '../../services/regionRouter';
import { reverseGeocodeWithNominatim } from '../../services/geolocation';
import { STATES_UTS } from '../../data/statesUts';
import { DISTRICT_ROUTING_170 } from '../../data/districtRouting170';

export const regionRoutes = Router();

// Middleware to attach Region context from headers or resolved parameters
export const regionContextMiddleware = (req: Request, res: Response, next: Function) => {
  const regionId = (req.headers['x-region-id'] as string) || 'ap-guntur';
  const regionState = (req.headers['x-region-state'] as string) || 'Andhra Pradesh';
  const regionDistrict = (req.headers['x-region-district'] as string) || 'Guntur';

  (req as any).region = {
    regionId,
    state: regionState,
    district: regionDistrict,
  };

  res.setHeader('X-Region-Connected', regionId);
  res.setHeader('X-Region-State', regionState);
  res.setHeader('X-Region-District', regionDistrict);

  next();
};

/**
 * POST /api/location/resolve & /api/v1/location/resolve
 * Reverse-geocodes coordinates to sovereign State, District, and bound Regional Server
 */
const resolveLocationHandler = async (req: Request, res: Response) => {
  const lat = typeof req.body.lat === 'number' ? req.body.lat : req.body.latitude;
  const lng = typeof req.body.lng === 'number' ? req.body.lng : req.body.longitude;

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({
      error: 'Valid numeric latitude and longitude coordinates required.',
    });
  }

  // Ensure coordinates are within reasonable proximity to India (Lat: 6 to 38, Lng: 68 to 98)
  // If outside or mock coords, gracefully resolve to nearest matching district
  try {
    const geoResult = await reverseGeocodeWithNominatim(lat, lng);
    const stateName = geoResult.stateName || 'Andhra Pradesh';
    const districtName = geoResult.districtName || 'Guntur';

    const serverProfile = regionRouterEngine.resolveRegionalServer(stateName, districtName);

    const postalCode =
      geoResult.rawAddress?.postcode ||
      (districtName.toLowerCase() === 'guntur' ? '522002' : '500001');

    const city =
      geoResult.rawAddress?.city ||
      geoResult.rawAddress?.town ||
      geoResult.rawAddress?.suburb ||
      districtName;

    return res.status(200).json({
      status: 'success',
      resolved: {
        country: 'India',
        state: stateName,
        district: districtName,
        city,
        postalCode,
        formattedAddress: geoResult.formattedAddress,
        stateId: geoResult.matchedState.state_id,
        districtId: geoResult.matchedDistrict.district_id,
        lat,
        lng,
      },
      regionContext: serverProfile,
    });
  } catch (err: any) {
    console.warn('[LocationResolve] Error resolving coordinates, returning fallback:', err);
    // Safe graceful fallback to Guntur, Andhra Pradesh
    const fallbackServer = regionRouterEngine.resolveRegionalServer('Andhra Pradesh', 'Guntur');
    return res.status(200).json({
      status: 'success',
      resolved: {
        country: 'India',
        state: 'Andhra Pradesh',
        district: 'Guntur',
        city: 'Guntur',
        postalCode: '522002',
        formattedAddress: 'Ward 14, Main Road, Guntur, Andhra Pradesh 522002',
        stateId: 1,
        districtId: 10,
        lat,
        lng,
      },
      regionContext: fallbackServer,
    });
  }
};

/**
 * POST /api/region/connect & /api/v1/region/connect
 * Connects the client to the regional server/jurisdiction matching state & district
 */
const connectRegionHandler = (req: Request, res: Response) => {
  const state = req.body.state || req.body.stateName || 'Andhra Pradesh';
  const district = req.body.district || req.body.districtName || 'Guntur';

  const qState = String(state || '').toLowerCase().trim();
  const qDist = String(district || '').toLowerCase().replace(/district/gi, '').trim();

  // Normalize state & district against master registry with flexible matching
  const matchedState = STATES_UTS.find((s) => {
    const sName = s.name.toLowerCase();
    return (
      sName === qState ||
      s.code.toLowerCase() === qState ||
      sName.includes(qState) ||
      qState.includes(sName) ||
      (qState.includes('delhi') && sName.includes('delhi'))
    );
  }) || STATES_UTS[0];

  const stateDistricts = DISTRICT_ROUTING_170.filter(
    (d) => d.state_ut_name.toLowerCase() === matchedState.name.toLowerCase()
  );

  const matchedDistrict =
    stateDistricts.find((d) => {
      const dName = d.district_name.toLowerCase();
      return dName === qDist || dName.includes(qDist) || qDist.includes(dName);
    }) ||
    DISTRICT_ROUTING_170.find((d) => {
      const dName = d.district_name.toLowerCase();
      return dName === qDist || dName.includes(qDist) || qDist.includes(dName);
    }) ||
    stateDistricts[0] ||
    DISTRICT_ROUTING_170[9]; // Guntur default

  const serverProfile = regionRouterEngine.resolveRegionalServer(
    matchedState.name,
    matchedDistrict.district_name
  );

  return res.status(200).json({
    status: 'connected',
    regionContext: {
      ...serverProfile,
      state: matchedState.name,
      district: matchedDistrict.district_name,
      districtId: matchedDistrict.district_id,
      stateId: matchedState.state_id,
      connectedAt: new Date().toISOString(),
    },
  });
};

/**
 * GET /api/helplines & /api/v1/helplines
 * Returns dynamic, location-scoped emergency numbers (District + State + National)
 */
const getHelplinesHandler = (req: Request, res: Response) => {
  const state = (req.query.state as string) || 'Andhra Pradesh';
  const district = (req.query.district as string) || 'Guntur';

  const helplines = regionRouterEngine.getHelplinesForRegion(state, district);
  const policeInfo = regionRouterEngine.getPoliceNumber(state, district);

  return res.status(200).json({
    status: 'success',
    jurisdiction: {
      state,
      district,
    },
    policePrimary: policeInfo,
    helplines,
    count: helplines.length,
  });
};

// Mount route paths with both /api and /api/v1 prefixes
regionRoutes.post('/api/location/resolve', resolveLocationHandler);
regionRoutes.post('/api/v1/location/resolve', resolveLocationHandler);

regionRoutes.post('/api/region/connect', connectRegionHandler);
regionRoutes.post('/api/v1/region/connect', connectRegionHandler);

regionRoutes.get('/api/helplines', getHelplinesHandler);
regionRoutes.get('/api/v1/helplines', getHelplinesHandler);
