import { Router, Request, Response } from 'express';
import { reverseResolveWard } from '../../services/geolocation';

export const geoRouter = Router();

// POST /api/v1/geo/reverse-ward - PostGIS spatial point-in-polygon & nearest ward resolution
geoRouter.post('/reverse-ward', (req: Request, res: Response) => {
  const { latitude, longitude } = req.body;

  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return res.status(400).json({ error: 'Valid numeric latitude and longitude required.' });
  }

  // Verify coordinates are within Indian boundaries (approx Lat 6 to 38, Lng 68 to 98)
  if (latitude < 6.0 || latitude > 38.5 || longitude < 68.0 || longitude > 98.5) {
    return res.status(400).json({
      error: 'Coordinates fall outside valid Indian sovereign territory boundaries.',
    });
  }

  const wardResult = reverseResolveWard(latitude, longitude);

  res.json({
    status: 'success',
    point: { latitude, longitude },
    district_id: wardResult.district.district_id,
    district_name: wardResult.district.district_name,
    state_id: wardResult.state.state_id,
    state_name: wardResult.state.name,
    state_code: wardResult.state.code,
    nodal_helpline: wardResult.state.nodal_helpline,
    portal_url: wardResult.state.portal_url,
    mandals_villages: wardResult.district.mandals_villages_text,
    local_governance: wardResult.district.local_governance_text,
    is_urban: wardResult.is_urban,
    road_category_routing: wardResult.district.road_category_routing,
    water_category_routing: wardResult.district.water_category_routing,
    garbage_category_routing: wardResult.district.garbage_category_routing,
    electricity_category_routing: wardResult.district.electricity_category_routing,
  });
});

