import { Router, Request, Response } from 'express';
import { STATES_UTS } from '../../data/statesUts';
import { DISTRICT_ROUTING_170 } from '../../data/districtRouting170';
import { NATIONAL_HELPLINES } from '../../data/nationalHelplines';

export const directoryRouter = Router();

// In-memory audit flags store
const auditFlagsQueue: any[] = [];

// GET /api/v1/directory/helplines - Multi-tier Directory Query
directoryRouter.get('/helplines', (req: Request, res: Response) => {
  const { stateCode, districtId, category, governanceTier: _governanceTier, q } = req.query;

  let state = STATES_UTS[0];
  if (stateCode) {
    const matched = STATES_UTS.find((s) => s.code.toLowerCase() === (stateCode as string).toLowerCase());
    if (matched) state = matched;
  }

  let district = DISTRICT_ROUTING_170.find((d) => d.state_ut_name.toLowerCase() === state.name.toLowerCase()) || DISTRICT_ROUTING_170[9];
  if (districtId) {
    const matchedDist = DISTRICT_ROUTING_170.find((d) => d.district_id === parseInt(districtId as string, 10));
    if (matchedDist) district = matchedDist;
  }

  // Response with national switchboards and district department routing
  const districtDepartments = [
    {
      category: 'Roads',
      department_name: district.road_category_routing,
      issues_covered: 'Potholes, broken roads/ footpaths, dividers, speed breakers, road lights & signals',
      primary_phone_raw: null,
      fallback_callable_uri: `tel:${state.nodal_helpline || '112'}`,
      web_portal: state.portal_url,
    },
    {
      category: 'Water',
      department_name: district.water_category_routing,
      issues_covered: 'Pipeline leaks, blocked drains, water stagnation, supply disruption, contamination, flooding',
      primary_phone_raw: null,
      fallback_callable_uri: `tel:${state.nodal_helpline || '112'}`,
      web_portal: state.portal_url,
    },
    {
      category: 'Garbage',
      department_name: district.garbage_category_routing,
      issues_covered: 'Road garbage, overflowing dustbins, dead animals, construction/plastic waste, illegal dumping',
      primary_phone_raw: null,
      fallback_callable_uri: `tel:${state.nodal_helpline || '112'}`,
      web_portal: state.portal_url,
    },
    {
      category: 'Electricity',
      department_name: district.electricity_category_routing,
      issues_covered: 'Damaged/ fallen poles, hanging/sparking wires, power cuts, faulty transformers, street lights',
      primary_phone_raw: null,
      fallback_callable_uri: `tel:${state.nodal_helpline || '112'}`,
      web_portal: state.portal_url,
    },
  ];

  let filteredDistrictDepartments = districtDepartments;
  if (category) {
    const catStr = String(category).toLowerCase();
    filteredDistrictDepartments = filteredDistrictDepartments.filter(
      (dept) => dept.category.toLowerCase() === catStr
    );
  }
  if (q) {
    const queryStr = String(q).toLowerCase();
    filteredDistrictDepartments = filteredDistrictDepartments.filter(
      (dept) =>
        dept.category.toLowerCase().includes(queryStr) ||
        dept.department_name.toLowerCase().includes(queryStr) ||
        dept.issues_covered.toLowerCase().includes(queryStr)
    );
  }

  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.json({
    status: 'success',
    cached: true,
    jurisdiction: {
      state_id: state.state_id,
      state_name: state.name,
      state_code: state.code,
      nodal_helpline: state.nodal_helpline,
      portal_url: state.portal_url,
      district_id: district.district_id,
      district_name: district.district_name,
      mandals_villages: district.mandals_villages_text,
      local_governance: district.local_governance_text,
    },
    national_emergency_switchboards: NATIONAL_HELPLINES,
    district_department_routing: filteredDistrictDepartments,
  });
});

// GET /api/v1/directory/sync-bundle - Offline pre-caching bundle
directoryRouter.get('/sync-bundle', (req: Request, res: Response) => {
  res.json({
    version: '2026.11.1',
    generated_at: new Date().toISOString(),
    states_count: STATES_UTS.length,
    districts_count: DISTRICT_ROUTING_170.length,
    states: STATES_UTS,
    districts: DISTRICT_ROUTING_170,
    national_helplines: NATIONAL_HELPLINES,
  });
});

// POST /api/v1/directory/flag-number - Crowd-sourced audit queue
directoryRouter.post('/flag-number', (req: Request, res: Response) => {
  const { helpline_id, issue_type, citizen_notes } = req.body;
  if (!helpline_id || !issue_type) {
    return res.status(400).json({ error: 'helpline_id and issue_type are required.' });
  }

  const flag = {
    flag_id: Date.now(),
    helpline_id,
    issue_type,
    citizen_notes: citizen_notes || '',
    verification_status: 'Pending 24h Audit',
    created_at: new Date().toISOString(),
  };

  auditFlagsQueue.push(flag);

  res.status(201).json({
    status: 'success',
    message: 'Helpline discrepancy registered into 24-hour verification queue.',
    flag,
  });
});
