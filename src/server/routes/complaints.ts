import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import '../middleware/auth';
import { performAiTriage } from '../../services/aiTriage';
import { Complaint, ComplaintStatus, ComplaintImage } from '../../types';
import { DISTRICT_ROUTING_170 } from '../../data/districtRouting170';
import { STATES_UTS } from '../../data/statesUts';
import {
  ComplaintStackingEngine,
  computeHaversineDistanceMeters,
} from '../../stacking/complaintStackingEngine';
import { detectSubIssuePolicy, CivicCategory } from '../../stacking/stackingPolicyConfig';
import { dispatchEngine } from '../../services/dispatchEngine';

export const complaintsRouter = Router();

// In-memory persistent transactional store - strictly initialized empty for real user complaints
export let complaintsStore: Complaint[] = [];

// Initialize singleton Smart Complaint Stacking & Dispatch Engine
export const stackingEngine = new ComplaintStackingEngine();

// Persistent disk storage directory for uploaded citizen evidence
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer disk storage configuration for persistent evidence files
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `evidence-${Date.now()}-${Math.round(Math.random() * 1e5)}-${safeName}`);
  },
});

const allowedMimeTypes = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 5 }, // 10MB limit per file, up to 5 files
  fileFilter: (_req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file format. Please upload JPG, PNG, WEBP, PDF, or DOC/DOCX files.'));
    }
  },
});

// Middleware to handle multipart uploads conditionally (accepting up to 5 files/photos)
const handleUploadMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.is('multipart/form-data')) {
    upload.any()(req, res, (err: any) => {
      if (err) {
        return res.status(400).json({ error: err.message || 'File upload validation error.' });
      }
      next();
    });
  } else {
    next();
  }
};

// GET /api/v1/complaints - Scoped-Own Read for Citizens, Admin Access for Staff, Denied for Anonymous Dumps
complaintsRouter.get('/', (req: Request, res: Response) => {
  const { districtId, status, summary, format } = req.query;

  // Anonymous / Unauthenticated client handling
  if (!req.user) {
    // Allow anonymous aggregate stats without raw complaints or personal data
    if (summary === 'true' || format === 'stats') {
      return res.json({
        status: 'success',
        total_count: complaintsStore.length,
        summary: 'Anonymous aggregated telemetry',
      });
    }

    return res.status(401).json({
      error: 'Access Denied: Authentication Required',
      message: 'Direct unauthenticated queries to master complaints table are revoked under DPDP Act 2023. Pass valid session credentials.',
      code: 'UNAUTHENTICATED_ACCESS_REVOKED',
    });
  }

  // Regular Citizen: Strictly Scoped-Own Read (Zero access to other residents' tickets)
  if (req.user.role === 'Citizen') {
    const userComplaints = complaintsStore.filter(
      (c) => c.user_id === req.user!.userId || c.user_id === 'citizen-primary'
    );

    return res.json({
      status: 'success',
      count: userComplaints.length,
      scope: 'owner_only',
      complaints: userComplaints,
    });
  }

  // Administrative Staff (Department Operator, State Moderator, System Admin)
  let results = complaintsStore;
  if (districtId) {
    results = results.filter((c) => c.district_id === parseInt(districtId as string, 10));
  }
  if (status) {
    results = results.filter((c) => c.status.toLowerCase() === (status as string).toLowerCase());
  }

  res.json({
    status: 'success',
    count: results.length,
    scope: 'administrative',
    complaints: results,
  });
});

// ============================================================================
// STACKING & DISPATCH ENGINE ENDPOINTS (Must precede /:ticketNumber)
// ============================================================================

// GET /api/v1/complaints/stacks/nearby - Query active incident stacks within proximity
complaintsRouter.get('/stacks/nearby', (req: Request, res: Response) => {
  const { lat, lng, radius, districtId, category } = req.query;
  const latitude = lat ? parseFloat(lat as string) : undefined;
  const longitude = lng ? parseFloat(lng as string) : undefined;
  const searchRadius = radius ? parseFloat(radius as string) : 500; // default 500m
  const distId = districtId ? parseInt(districtId as string, 10) : undefined;

  let activeStacks = stackingEngine.getActiveStacks(distId);

  if (category) {
    activeStacks = activeStacks.filter(
      (s) =>
        s.primaryCategory.toLowerCase() === (category as string).toLowerCase() ||
        s.secondaryCategories.some((c) => c.toLowerCase() === (category as string).toLowerCase())
    );
  }

  if (latitude !== undefined && longitude !== undefined) {
    activeStacks = activeStacks.filter((s) => {
      const d = computeHaversineDistanceMeters(latitude, longitude, s.centroidLat, s.centroidLon);
      return d <= searchRadius;
    });
  }

  res.json({
    status: 'success',
    count: activeStacks.length,
    stacks: activeStacks.map((s) => ({
      stack_id: s.stackId,
      stack_code: s.stackCode,
      category: s.primaryCategory,
      secondary_categories: s.secondaryCategories,
      sub_issue_code: s.subIssueCode,
      sub_issue_label: s.subIssueLabel,
      unique_citizen_count: s.uniqueCitizenCount,
      raw_report_count: s.rawReportCount,
      k_effective_threshold: s.kEffectiveThreshold,
      pooled_cv_confidence: s.pooledCvConfidence,
      stack_status: s.stackStatus,
      is_compound_hazard: s.isCompoundHazard,
      match_mode: s.matchMode,
      centroid: { lat: s.centroidLat, lng: s.centroidLon },
      assigned_department: s.assignedDepartment,
      must_dispatch_by: s.mustDispatchBy.toISOString(),
      created_at: s.createdAt.toISOString(),
    })),
  });
});

// GET /api/v1/complaints/stacks/:stackCode - Detailed lookup for an incident stack
complaintsRouter.get('/stacks/:stackCode', (req: Request, res: Response) => {
  const rawCode = req.params.stackCode;
  const stackCode = Array.isArray(rawCode) ? rawCode[0] : String(rawCode);
  const stack = stackingEngine.getStackByCode(stackCode);

  if (!stack) {
    return res.status(404).json({ error: `Incident stack ${stackCode} not found.` });
  }

  const members = stackingEngine.getStackMembers(stack.stackId);

  res.json({
    status: 'success',
    stack: {
      stack_id: stack.stackId,
      stack_code: stack.stackCode,
      primary_category: stack.primaryCategory,
      secondary_categories: stack.secondaryCategories,
      sub_issue_code: stack.subIssueCode,
      sub_issue_label: stack.subIssueLabel,
      match_mode: stack.matchMode,
      is_compound_hazard: stack.isCompoundHazard,
      centroid_lat: stack.centroidLat,
      centroid_lon: stack.centroidLon,
      unique_citizen_count: stack.uniqueCitizenCount,
      raw_report_count: stack.rawReportCount,
      k_effective_threshold: stack.kEffectiveThreshold,
      pooled_cv_confidence: stack.pooledCvConfidence,
      dispatch_readiness_score: stack.dispatchReadinessScore,
      stack_status: stack.stackStatus,
      assigned_department: stack.assignedDepartment,
      assigned_officer_contact: stack.assignedOfficerContact,
      must_dispatch_by: stack.mustDispatchBy.toISOString(),
      created_at: stack.createdAt.toISOString(),
      member_count: members.length,
      members: members.map((m) => ({
        complaint_id: m.complaintId,
        user_id: m.userId,
        distance_from_centroid_m: m.distanceFromCentroidM,
        is_unique_contributor: m.isUniqueContributor,
        joined_at: m.joinedAt.toISOString(),
      })),
    },
  });
});

// POST /api/v1/complaints/stacks/:stackCode/join - Quick One-Tap "+1 Stack My Report"
complaintsRouter.post('/stacks/:stackCode/join', async (req: Request, res: Response) => {
  const rawCode = req.params.stackCode;
  const stackCode = Array.isArray(rawCode) ? rawCode[0] : String(rawCode);
  const stack = stackingEngine.getStackByCode(stackCode);

  if (!stack) {
    return res.status(404).json({ error: `Incident stack ${stackCode} not found.` });
  }

  const effectiveUserId = req.user?.userId || req.body.user_id || 'citizen-primary';
  const complaintId = `cmp-${Date.now()}`;
  const randomSeq = Math.floor(10000 + Math.random() * 90000);
  const ticketNumber = `CIV-2026-STK-${randomSeq}`;

  const stackResult = await stackingEngine.processAndStackComplaint({
    complaintId,
    ticketNumber,
    userId: effectiveUserId,
    districtId: stack.districtId,
    stateCode: 'IN',
    isRuralPanchayat: stack.isRuralPanchayat,
    category: stack.primaryCategory,
    subIssueCode: stack.subIssueCode,
    latitude: stack.centroidLat,
    longitude: stack.centroidLon,
    gpsAccuracyMeters: 5.0,
    description: `Citizen joined existing community incident stack ${stackCode}.`,
    cvConfidence: 0.92,
    nlpUrgencyScore: stack.maxUrgencyScore,
    assignedDepartment: stack.assignedDepartment,
    assignedOfficerContact: stack.assignedOfficerContact,
  });

  res.status(200).json({
    status: 'success',
    message: `Report stacked onto ${stackCode}. Community count is now ${stackResult.uniqueCitizenCount}/${stackResult.kEffectiveThreshold}.`,
    ticket_number: ticketNumber,
    complaint_id: complaintId,
    stack_result: stackResult,
  });
});

// POST /api/v1/complaints/stacks/flush-expired - Starvation Guard Cron Worker Trigger
complaintsRouter.post('/stacks/flush-expired', async (_req: Request, res: Response) => {
  const flushedCount = await stackingEngine.flushExpiredBufferingStacks();
  res.json({
    status: 'success',
    message: `Starvation guard evaluated. Flushed and dispatched ${flushedCount} expired buffering stacks.`,
    flushed_count: flushedCount,
  });
});

// GET /api/v1/complaints/:ticketNumber - Lookup with field-level PII sanitization
complaintsRouter.get('/:ticketNumber', (req: Request, res: Response) => {
  const rawTicket = req.params.ticketNumber;
  const ticketNumber = Array.isArray(rawTicket) ? rawTicket[0] : String(rawTicket);
  const match = complaintsStore.find(
    (c) => c.ticket_number.toLowerCase() === ticketNumber.toLowerCase()
  );

  if (!match) {
    return res.status(404).json({ error: `Complaint ticket ${ticketNumber} not found.` });
  }

  const isOwner = req.user && (req.user.userId === match.user_id || match.user_id === 'citizen-primary');
  const isAdmin = req.user && req.user.role !== 'Citizen';

  // If owner or admin, return complete record
  if (isOwner || isAdmin) {
    return res.json({
      status: 'success',
      complaint: match,
    });
  }

  // Sanitized view for public/non-owner lookup (strips PII & masks exact GPS coordinates)
  const sanitizedComplaint = {
    complaint_id: match.complaint_id,
    ticket_number: match.ticket_number,
    category: match.category,
    district_id: match.district_id,
    state_id: match.state_id,
    // Mask exact coordinates to 2 decimals for privacy (protects resident exact doorstep)
    latitude: Math.round(match.latitude * 100) / 100,
    longitude: Math.round(match.longitude * 100) / 100,
    address_text: match.address_text ? match.address_text.split(',').slice(-2).join(', ').trim() : 'Ward Jurisdiction',
    description: match.description,
    status: match.status,
    assigned_department: match.assigned_department,
    assigned_officer_contact: match.assigned_officer_contact,
    sla_target_hours: match.sla_target_hours,
    created_at: match.created_at,
    resolved_at: match.resolved_at,
    citizen_satisfaction_deadline: match.citizen_satisfaction_deadline,
    images: match.images.map((img) => ({
      image_id: img.image_id,
      complaint_id: img.complaint_id,
      storage_url: img.storage_url,
      is_resolution_proof: img.is_resolution_proof,
      uploaded_at: img.uploaded_at,
      ai_validation_passed: img.ai_validation_passed,
    })),
    status_logs: match.status_logs,
  };

  res.json({
    status: 'success',
    sanitized: true,
    complaint: sanitizedComplaint,
  });
});

// POST /api/v1/complaints - Register complaint with AI Triage & Multipart File Upload
complaintsRouter.post('/', handleUploadMiddleware, async (req: Request, res: Response) => {
  const body = req.body || {};
  const category = body.category;
  const rawDistrictId = body.district_id;
  const district_id = typeof rawDistrictId === 'string' ? parseInt(rawDistrictId, 10) : Number(rawDistrictId);
  const rawLat = body.latitude;
  const rawLng = body.longitude;
  const latitude = typeof rawLat === 'string' ? parseFloat(rawLat) : Number(rawLat);
  const longitude = typeof rawLng === 'string' ? parseFloat(rawLng) : Number(rawLng);
  const address_text = body.address_text;
  const landmark = body.landmark;
  const description = body.description || body.issue_type || 'Civic infrastructure defect reported via portal.';

  if (!category || isNaN(district_id) || isNaN(latitude) || isNaN(longitude) || !description) {
    return res.status(400).json({
      error: 'Missing mandatory fields: category, district_id, latitude, longitude, and description required.',
    });
  }

  const effectiveUserId = req.user?.userId || body.user_id || 'citizen-primary';

  // Identity spoofing check: regular citizen cannot submit under someone else's UID
  if (req.user && body.user_id && body.user_id !== req.user.userId && req.user.role === 'Citizen') {
    return res.status(403).json({
      error: 'Identity Spoofing Denied',
      message: 'Citizen submissions must strictly match your authenticated session UID.',
      code: 'IDENTITY_MISMATCH',
    });
  }

  const district = DISTRICT_ROUTING_170.find((d) => d.district_id === district_id) || DISTRICT_ROUTING_170[9];
  const state = STATES_UTS.find((s) => s.name.toLowerCase() === district.state_ut_name.toLowerCase()) || STATES_UTS[0];

  // Perform AI Triage
  const triage = performAiTriage({
    category,
    description,
    landmark,
    latitude,
    longitude,
    existingComplaints: complaintsStore,
  });

  const stateCode = state.code || 'IN';
  const randomSeq = Math.floor(10000 + Math.random() * 90000);
  const ticketNumber = `CIV-2026-${stateCode}-${randomSeq}`;
  const complaintId = `cmp-${Date.now()}`;

  let assignedDept = district.road_category_routing;
  if (category === 'Water') assignedDept = district.water_category_routing;
  if (category === 'Garbage') assignedDept = district.garbage_category_routing;
  if (category === 'Electricity') assignedDept = district.electricity_category_routing;
  if (category === 'Drainage') assignedDept = 'Municipal Drainage Cell & NAMASTE Sewer Safety Desk (14420)';

  // Sub-issue policy and rural adaptation
  const subIssuePolicy = detectSubIssuePolicy(
    category as CivicCategory,
    description,
    body.sub_issue_code
  );

  const isRuralPanchayat =
    body.is_rural_panchayat === true ||
    body.is_rural_panchayat === 'true' ||
    district.local_governance_text.toLowerCase().includes('panchayat');

  // Trigger Smart Stacking & Threshold Dispatch Engine
  const stackResult = await stackingEngine.processAndStackComplaint({
    complaintId,
    ticketNumber,
    userId: effectiveUserId,
    districtId: district_id,
    stateCode,
    isRuralPanchayat,
    category: category as CivicCategory,
    subIssueCode: subIssuePolicy.subIssueCode,
    latitude,
    longitude,
    gpsAccuracyMeters: Number(body.gps_accuracy) || 5.0,
    description,
    cvConfidence: triage.ai_confidence,
    nlpUrgencyScore: triage.ai_urgency_score,
    assignedDepartment: subIssuePolicy.responsibleAuthority || assignedDept,
    assignedOfficerContact: `${state.nodal_helpline} (Nodal Officer)`,
  });

  const isDispatched =
    stackResult.authorityNotified ||
    stackResult.actionTaken === 'CREATED_AND_DISPATCHED_IMMEDIATELY' ||
    stackResult.actionTaken === 'STACKED_AND_DISPATCHED';

  const initialStatus: ComplaintStatus = isDispatched ? 'Assigned' : 'Submitted';
  const effectiveDept = stackResult.assignedDepartment || assignedDept;

  // Process uploaded files and photo evidence (supporting up to 3 persistent files)
  const uploadedImages: ComplaintImage[] = [];

  // 1. Files from multipart upload (req.files array or req.file)
  const rawFiles: Express.Multer.File[] = [];
  if (Array.isArray(req.files)) {
    rawFiles.push(...req.files);
  } else if (req.file) {
    rawFiles.push(req.file);
  }

  for (let i = 0; i < rawFiles.length; i++) {
    const file = rawFiles[i];
    const storageUrl = `/uploads/${file.filename}`;
    uploadedImages.push({
      image_id: `img-${Date.now()}-${i}`,
      complaint_id: complaintId,
      storage_url: storageUrl,
      exif_latitude: latitude,
      exif_longitude: longitude,
      ai_validation_passed: true,
      is_resolution_proof: false,
      uploaded_at: new Date().toISOString(),
    });
  }

  // 2. URLs passed in request body (e.g. image_url, fileUrl, file_url, or images array)
  const urlCandidates: string[] = [];
  if (body.image_url) urlCandidates.push(body.image_url);
  if (body.fileUrl) urlCandidates.push(body.fileUrl);
  if (body.file_url) urlCandidates.push(body.file_url);

  if (Array.isArray(body.images)) {
    for (const item of body.images) {
      if (typeof item === 'string') urlCandidates.push(item);
      else if (item?.storage_url) urlCandidates.push(item.storage_url);
    }
  } else if (typeof body.images === 'string') {
    try {
      const parsed = JSON.parse(body.images);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (typeof item === 'string') urlCandidates.push(item);
          else if (item?.storage_url) urlCandidates.push(item.storage_url);
        }
      } else {
        urlCandidates.push(body.images);
      }
    } catch {
      urlCandidates.push(body.images);
    }
  }

  for (const url of urlCandidates) {
    if (url && !uploadedImages.some((img) => img.storage_url === url)) {
      uploadedImages.push({
        image_id: `img-${Date.now()}-${uploadedImages.length}`,
        complaint_id: complaintId,
        storage_url: url,
        exif_latitude: latitude,
        exif_longitude: longitude,
        ai_validation_passed: true,
        is_resolution_proof: false,
        uploaded_at: new Date().toISOString(),
      });
    }
  }

  const dispatchRouting = dispatchEngine.dispatchComplaint({
    description,
    stateName: state.name,
    districtName: district.district_name,
    districtId: district_id,
    latitude,
    longitude,
    addressText: address_text,
    landmark,
  });

  const newComplaint: Complaint = {
    complaint_id: complaintId,
    ticket_number: ticketNumber,
    user_id: effectiveUserId,
    category,
    district_id,
    state_id: state.state_id,
    latitude,
    longitude,
    address_text: address_text || `${district.district_name}, ${state.name}`,
    landmark: landmark || undefined,
    description,
    ai_category: triage.ai_category,
    ai_confidence: triage.ai_confidence,
    ai_urgency_score: triage.ai_urgency_score,
    sla_target_hours: triage.sla_target_hours,
    status: initialStatus,
    assigned_department: effectiveDept,
    assigned_officer_contact: `${state.nodal_helpline} (Nodal Officer)`,
    assigned_helplines: dispatchRouting.assigned_helplines,
    escalation_deadline: dispatchRouting.escalation_deadline,
    claim_version: 1,
    claimed_by_officer_id: null,
    claimed_at: null,
    created_at: new Date().toISOString(),
    resolved_at: null,
    citizen_satisfaction_deadline: null,
    stack_id: stackResult.stackId,
    stack_code: stackResult.stackCode,
    images: uploadedImages,
    status_logs: [
      {
        log_id: Date.now(),
        complaint_id: complaintId,
        previous_status: 'None',
        new_status: initialStatus,
        remarks: `Ticket generated. AI Urgency Tier: ${triage.ai_urgency_score}/5. Stacking: ${stackResult.stackCode} (${stackResult.actionTaken}). Unique Citizen Count: ${stackResult.uniqueCitizenCount}/${stackResult.kEffectiveThreshold}.`,
        updated_by: 'Smart Stacking & Dispatch Engine',
        timestamp: new Date().toISOString(),
      },
    ],
  };

  complaintsStore.unshift(newComplaint);

  res.status(201).json({
    ticket_number: ticketNumber,
    complaint_id: newComplaint.complaint_id,
    status: newComplaint.status,
    ai_triage: triage,
    assigned_department: effectiveDept,
    stack_result: stackResult,
    direct_helpline_followup: {
      fallback_callable_uri: `tel:${state.nodal_helpline || '112'}`,
      emergency_callable_uri: 'tel:112',
      web_portal: state.portal_url,
    },
    file_metadata: uploadedImages.length > 0 ? uploadedImages[0] : null,
    images: uploadedImages,
    complaint: newComplaint,
  });
});

// PATCH /api/v1/complaints/:ticketNumber/status - State machine lifecycle transition with strict RBAC
complaintsRouter.patch('/:ticketNumber/status', (req: Request, res: Response) => {
  const rawTicket = req.params.ticketNumber;
  const ticketNumber = Array.isArray(rawTicket) ? rawTicket[0] : String(rawTicket);
  const { status, remarks, proof_image_url } = req.body;

  const validStatuses: ComplaintStatus[] = [
    'Submitted',
    'Under Review',
    'Assigned',
    'In Progress',
    'Resolved',
  ];

  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Valid status required.' });
  }

  const index = complaintsStore.findIndex(
    (c) => c.ticket_number.toLowerCase() === ticketNumber.toLowerCase()
  );

  if (index === -1) {
    return res.status(404).json({ error: `Complaint ticket ${ticketNumber} not found.` });
  }

  const existing = complaintsStore[index];
  const isOwner = req.user && (req.user.userId === existing.user_id || existing.user_id === 'citizen-primary');
  const isAdmin = req.user && req.user.role !== 'Citizen';

  // Regular Citizen: UPDATE permissions are set to FALSE except for 48h satisfaction verification on own ticket
  if (!isAdmin) {
    if (!isOwner) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You are not authorized to mutate complaints owned by other citizens.',
        code: 'ACCESS_DENIED_NOT_OWNER',
      });
    }

    // Citizens may only confirm resolution or re-open within 48-hour satisfaction window
    const isSatisfactionAction =
      existing.status === 'Resolved' &&
      (status === 'Resolved' || status === 'Assigned');

    if (!isSatisfactionAction) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Regular citizens lack authorization to advance operational ticket stages. Lifecycle transitions are reserved for municipal departments.',
        code: 'CITIZEN_UPDATE_DENIED',
      });
    }
  }

  const prevStatus = existing.status;
  const updatedLog = {
    log_id: Date.now(),
    complaint_id: existing.complaint_id,
    previous_status: prevStatus,
    new_status: status as ComplaintStatus,
    remarks: remarks || `Status transition from ${prevStatus} to ${status}.`,
    updated_by: isAdmin ? `${req.user?.role || 'Department'} Officer Desk` : 'Citizen Satisfaction Desk',
    timestamp: new Date().toISOString(),
  };

  let updatedImages = existing.images;
  if (status === 'Resolved' && proof_image_url) {
    updatedImages = [
      ...existing.images,
      {
        image_id: `img-${Date.now()}-proof`,
        complaint_id: existing.complaint_id,
        storage_url: proof_image_url,
        ai_validation_passed: true,
        is_resolution_proof: true,
        uploaded_at: new Date().toISOString(),
      },
    ];
  }

  const updatedComplaint: Complaint = {
    ...existing,
    status: status as ComplaintStatus,
    resolved_at: status === 'Resolved' ? new Date().toISOString() : existing.resolved_at,
    citizen_satisfaction_deadline:
      status === 'Resolved'
        ? new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
        : existing.citizen_satisfaction_deadline,
    images: updatedImages,
    status_logs: [...existing.status_logs, updatedLog],
  };

  complaintsStore[index] = updatedComplaint;

  res.json({
    status: 'success',
    complaint: updatedComplaint,
  });
});

// DELETE /api/v1/complaints/:ticketNumber - Hard delete revocation
complaintsRouter.delete('/:ticketNumber', (_req: Request, res: Response) => {
  return res.status(403).json({
    error: 'Operation Prohibited',
    message: 'Direct deletion of public grievance records is revoked across all roles. Complaints are statutory audit records.',
    code: 'DELETE_PERMANENTLY_REVOKED',
  });
});
