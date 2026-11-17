import { Request, Response, NextFunction, Router } from 'express';
import jwt from 'jsonwebtoken';
import { complaintsStore, stackingEngine } from '../server/routes/complaints';
import { DISTRICT_ROUTING_170 } from '../data/districtRouting170';
import { STATES_UTS } from '../data/statesUts';
import { computeHaversineDistanceMeters } from '../stacking/complaintStackingEngine';
import { Complaint } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'dpdp_sovereign_jwt_secret_2026';

export interface EvidencePhoto {
  image_id: string;
  complaint_id: string;
  ticket_number: string;
  storage_url: string;
  exif_latitude?: number | null;
  exif_longitude?: number | null;
  ai_validation_passed: boolean;
  ai_confidence: number;
  is_resolution_proof: boolean;
  uploaded_at: string;
}

export interface TopPlaceHotspot {
  place_id: string;
  place_name: string;
  ward_mandal: string;
  district_name: string;
  district_id: number;
  latitude: number;
  longitude: number;
  n_place: number;
  latest_photo_url: string | null;
}

export interface PlaceVolumePill {
  place_id: string;
  place_name: string;
  n_place: number;
}

export interface AreaHotspot {
  area_name: string;
  district_name: string;
  total_area_complaints: number;
  total_citizen_bookings: number;
  distinct_issue_stacks: number;
}

export interface ConceptHotspot {
  concept_name: string;
  category: string;
  total_cases_booked: number;
  active_locations_count: number;
}

export interface RankedGrievanceItem {
  group_id: string;
  display_code: string;
  primary_complaint_id: string;
  ticket_number: string;
  district_id: number;
  district_name: string;
  state_name: string;
  category: string;
  concept_name: string;
  area_name: string;
  landmark: string | null;
  description: string;
  latitude: number;
  longitude: number;
  status: 'Submitted' | 'Under Review' | 'Assigned' | 'On Hold' | 'In Progress' | 'Resolved';
  assigned_department: string;
  accepted_by_officer_id: string | null;
  hold_reason: string | null;
  claim_version: number;
  claimed_by_officer_id: string | null;
  claimed_at: string | null;
  assigned_helplines: string[];
  escalation_deadline: string | null;
  ai_confidence: number;
  ai_urgency_score: number;
  sla_target_hours: number;
  created_at: string;

  // Place-Volume Calibration Metrics
  place_id: string;
  place_name: string;
  n_place: number;
  n_case: number;
  calibrated_volume_pct: number; // W_k in [8%, 100%]

  // Citizen Evidence & Completion Proof Galleries
  evidence_photos: EvidencePhoto[];
  resolution_proof_photos: EvidencePhoto[];
  stacked_ticket_numbers: string[];

  // Legacy & Area Rollup
  concept_booked_count: number;
  concept_raw_bookings: number;
  area_total_complaints: number;
  area_unique_citizens: number;
  k_threshold: number;
  is_compound_hazard: boolean;
  volume_rank_in_district: number;
}

interface InternalPlaceCluster {
  place_id: string;
  place_name: string;
  ward_mandal: string;
  district_id: number;
  district_name: string;
  state_name: string;
  latitude: number;
  longitude: number;
  complaints: Complaint[];
}

function normalizeKey(str?: string | null): string {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

export function createIsolatedPortalRouter(dbPool?: any, jwtSecret = JWT_SECRET): Router {
  const router = Router();

  // ---------------------------------------------------------------------------
  // STRICT OFFICER ISOLATION MIDDLEWARE
  // Rejects any Citizen token or unauthenticated request with 404 to hide portal existence
  // ---------------------------------------------------------------------------
  const requireIsolatedOfficerSession = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(404).json({ error: 'Resource not found.' });
    }
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, jwtSecret) as any;
      if (decoded.persona !== 'OFFICER') {
        // Citizen tokens MUST NEVER access or discover Officer endpoints
        return res.status(404).json({ error: 'Resource not found.' });
      }
      (req as any).officer = decoded;
      next();
    } catch {
      return res.status(404).json({ error: 'Resource not found.' });
    }
  };

  // ---------------------------------------------------------------------------
  // GET /api/v1/authority-portal/volume-sorted-feed
  // Returns:
  //   1. topPlaceHotspot: #1 highest-complaint place card data
  //   2. placeVolumePills: Monotonically decreasing place-volume filter pills
  //   3. topAreaHotspots: Areas sorted highest-to-lowest
  //   4. topBookedConcepts: Concepts sorted highest-to-lowest
  //   5. rankedGrievanceFeed: Every card sorted strictly DESC by (N_place, N_case, urgency, created_at)
  // ---------------------------------------------------------------------------
  router.get(
    '/api/v1/authority-portal/volume-sorted-feed',
    requireIsolatedOfficerSession,
    async (req: Request, res: Response) => {
      const { districtId, category, statusFilter = 'ALL', placeFilter = 'ALL' } = req.query;

      // Department-Scoped RBAC: If officer is a Department Operator, lock to assigned jurisdiction
      const officer = (req as any).officer;
      const isDeptOperator = officer && officer.role === 'Department Operator';

      const targetDistrictId = isDeptOperator
        ? (officer.districtId || (districtId ? Number(districtId) : null))
        : (districtId ? Number(districtId) : null);

      const targetCategory = isDeptOperator && officer.category
        ? officer.category.toLowerCase()
        : (category ? String(category).toLowerCase() : null);

      const targetStatus = String(statusFilter);

      const activeComplaints = complaintsStore.filter((c) => {
        if (c.status === 'Resolved') return false;
        if (targetDistrictId && c.district_id !== targetDistrictId) return false;

        if (targetCategory) {
          const cCat = c.category.toLowerCase();
          const match =
            cCat === targetCategory ||
            (targetCategory === 'roads' && (cCat === 'road' || cCat === 'roads')) ||
            (targetCategory === 'water' && cCat === 'water') ||
            (targetCategory === 'garbage' && (cCat === 'sanitation' || cCat === 'garbage')) ||
            (targetCategory === 'sanitation' && (cCat === 'garbage' || cCat === 'sanitation')) ||
            (targetCategory === 'electricity' && cCat === 'electricity');
          if (!match) return false;
        }

        if (targetStatus !== 'ALL' && c.status !== targetStatus) return false;
        return true;
      });

      // -----------------------------------------------------------------------
      // 1. Micro-Place Spatial Clustering (50-Meter Radius & Landmark Grouping)
      // -----------------------------------------------------------------------
      const clusters: InternalPlaceCluster[] = [];

      for (const comp of activeComplaints) {
        let matchedCluster = clusters.find((cluster) => {
          if (cluster.district_id !== comp.district_id) return false;

          // Check 50-meter geodesic radius
          if (comp.latitude && comp.longitude && cluster.latitude && cluster.longitude) {
            const dist = computeHaversineDistanceMeters(
              comp.latitude,
              comp.longitude,
              cluster.latitude,
              cluster.longitude
            );
            if (dist <= 50) return true;
          }

          // Address & landmark match fallback
          const cNormAddr = normalizeKey(comp.address_text);
          const clusNormAddr = normalizeKey(cluster.ward_mandal);
          const cNormLandmark = normalizeKey(comp.landmark);
          if (cNormAddr && clusNormAddr && cNormAddr === clusNormAddr) {
            if (cNormLandmark) {
              return cluster.complaints.some(
                (existing) => normalizeKey(existing.landmark) === cNormLandmark
              );
            }
            return true;
          }
          return false;
        });

        if (matchedCluster) {
          matchedCluster.complaints.push(comp);
        } else {
          const clusterIndex = clusters.length + 1;
          const district = DISTRICT_ROUTING_170.find((d) => d.district_id === comp.district_id);
          const state = district ? STATES_UTS.find((s) => s.name === district.state_ut_name) : null;
          const placeId = `PLC-${comp.district_id}-${clusterIndex}`;

          let placeName = comp.landmark && comp.address_text
            ? `${comp.landmark}, ${comp.address_text}`
            : comp.address_text
            ? comp.address_text
            : comp.landmark
            ? `${comp.landmark}, Ward ${comp.district_id}`
            : `${district?.district_name || 'District Ward'} Sector ${clusterIndex}`;

          clusters.push({
            place_id: placeId,
            place_name: placeName,
            ward_mandal: comp.address_text ? comp.address_text.trim() : (district?.district_name || 'Ward Area'),
            district_id: comp.district_id,
            district_name: district?.district_name || 'District Ward',
            state_name: state?.name || 'Andhra Pradesh',
            latitude: comp.latitude,
            longitude: comp.longitude,
            complaints: [comp],
          });
        }
      }

      // Max complaints in any single place cluster (N_max)
      const maxComplaintsInAnyPlace = clusters.length > 0
        ? Math.max(...clusters.map((c) => c.complaints.length), 1)
        : 1;

      // -----------------------------------------------------------------------
      // 2. Compute Top Place-Density Hotspot & Place-Volume Filter Pills
      // -----------------------------------------------------------------------
      const clustersSortedByPlaceVolume = [...clusters].sort(
        (a, b) => b.complaints.length - a.complaints.length
      );

      const topCluster = clustersSortedByPlaceVolume[0] || null;
      let topPlaceLatestPhoto: string | null = null;
      if (topCluster) {
        for (const comp of topCluster.complaints) {
          const citizenImgs = (comp.images || []).filter((img) => !img.is_resolution_proof);
          if (citizenImgs.length > 0 && citizenImgs[0].storage_url) {
            topPlaceLatestPhoto = citizenImgs[0].storage_url;
            break;
          }
        }
      }

      const topPlaceHotspot: TopPlaceHotspot | null = topCluster
        ? {
            place_id: topCluster.place_id,
            place_name: topCluster.place_name,
            ward_mandal: topCluster.ward_mandal,
            district_name: topCluster.district_name,
            district_id: topCluster.district_id,
            latitude: topCluster.latitude,
            longitude: topCluster.longitude,
            n_place: topCluster.complaints.length,
            latest_photo_url: topPlaceLatestPhoto,
          }
        : null;

      const placeVolumePills: PlaceVolumePill[] = clustersSortedByPlaceVolume.map((cluster) => ({
        place_id: cluster.place_id,
        place_name: cluster.place_name,
        n_place: cluster.complaints.length,
      }));

      // -----------------------------------------------------------------------
      // 3. Build Grievance Feed Items with Place-Volume & Photo Gallery Calibration
      // -----------------------------------------------------------------------
      const rankedGrievanceFeed: RankedGrievanceItem[] = [];

      for (const cluster of clusters) {
        const nPlace = cluster.complaints.length;
        const volumeBarPct = Math.max(
          8,
          Math.round((nPlace / maxComplaintsInAnyPlace) * 100)
        );

        // Group complaints within place P_k by concept / sub-issue c
        const conceptGroups = new Map<string, Complaint[]>();
        for (const comp of cluster.complaints) {
          const stack = comp.stack_code ? stackingEngine.getStackByCode(comp.stack_code) : null;
          const conceptKey = stack?.subIssueCode || comp.category || 'General Civic';
          if (!conceptGroups.has(conceptKey)) {
            conceptGroups.set(conceptKey, []);
          }
          conceptGroups.get(conceptKey)!.push(comp);
        }

        for (const [conceptName, groupComplaints] of conceptGroups.entries()) {
          const nCase = groupComplaints.length;

          // Pick primary complaint: highest urgency first, earliest created second
          const sortedGroup = [...groupComplaints].sort((a, b) => {
            const urgA = a.ai_urgency_score || 3;
            const urgB = b.ai_urgency_score || 3;
            if (urgB !== urgA) return urgB - urgA;
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          });
          const primaryComplaint = sortedGroup[0];

          // Aggregate Evidence Photo Array E(P_k, c) across all complaints in stack
          const evidencePhotos: EvidencePhoto[] = [];
          const resolutionProofPhotos: EvidencePhoto[] = [];
          const seenPhotoUrls = new Set<string>();

          for (const comp of sortedGroup) {
            if (comp.images && Array.isArray(comp.images)) {
              for (const img of comp.images) {
                if (!img.storage_url || seenPhotoUrls.has(img.storage_url)) continue;
                seenPhotoUrls.add(img.storage_url);

                const photoObj: EvidencePhoto = {
                  image_id: img.image_id || `img-${Date.now()}`,
                  complaint_id: comp.complaint_id,
                  ticket_number: comp.ticket_number,
                  storage_url: img.storage_url,
                  exif_latitude: img.exif_latitude ?? comp.latitude,
                  exif_longitude: img.exif_longitude ?? comp.longitude,
                  ai_validation_passed: img.ai_validation_passed ?? true,
                  ai_confidence: comp.ai_confidence ?? 0.92,
                  is_resolution_proof: img.is_resolution_proof ?? false,
                  uploaded_at: img.uploaded_at || comp.created_at,
                };

                if (img.is_resolution_proof) {
                  resolutionProofPhotos.push(photoObj);
                } else {
                  evidencePhotos.push(photoObj);
                }
              }
            }
          }

          // Order citizen photos with highest AI computer vision confidence first
          evidencePhotos.sort((a, b) => b.ai_confidence - a.ai_confidence);

          const stack = primaryComplaint.stack_code
            ? stackingEngine.getStackByCode(primaryComplaint.stack_code)
            : null;

          const maxUrgencyScore = Math.max(
            ...groupComplaints.map((c) => c.ai_urgency_score || 3)
          );
          const earliestCreatedAt = sortedGroup.reduce(
            (earliest, c) => (new Date(c.created_at) < new Date(earliest) ? c.created_at : earliest),
            primaryComplaint.created_at
          );

          const stackedTickets = Array.from(new Set(groupComplaints.map((c) => c.ticket_number)));
          const isCompound = groupComplaints.some(
            (c) => c.stack_code && stackingEngine.getStackByCode(c.stack_code)?.isCompoundHazard
          );

          rankedGrievanceFeed.push({
            group_id: stack?.stackId || primaryComplaint.complaint_id,
            display_code: stack?.stackCode || primaryComplaint.ticket_number,
            primary_complaint_id: primaryComplaint.complaint_id,
            ticket_number: primaryComplaint.ticket_number,
            district_id: cluster.district_id,
            district_name: cluster.district_name,
            state_name: cluster.state_name,
            category: primaryComplaint.category,
            concept_name: conceptName,
            area_name: cluster.ward_mandal,
            landmark: primaryComplaint.landmark || null,
            description: primaryComplaint.description,
            latitude: cluster.latitude,
            longitude: cluster.longitude,
            status: primaryComplaint.status,
            assigned_department: primaryComplaint.assigned_department || 'Municipal Public Works Desk',
            accepted_by_officer_id: primaryComplaint.accepted_by_officer_id || null,
            hold_reason: primaryComplaint.hold_reason || null,
            claim_version: primaryComplaint.claim_version ?? 1,
            claimed_by_officer_id: primaryComplaint.claimed_by_officer_id || null,
            claimed_at: primaryComplaint.claimed_at || null,
            assigned_helplines: primaryComplaint.assigned_helplines || [],
            escalation_deadline: primaryComplaint.escalation_deadline || null,
            ai_confidence: primaryComplaint.ai_confidence || 0.92,
            ai_urgency_score: maxUrgencyScore,
            sla_target_hours: primaryComplaint.sla_target_hours || 48,
            created_at: earliestCreatedAt,

            // Place-Volume Calibration
            place_id: cluster.place_id,
            place_name: cluster.place_name,
            n_place: nPlace,
            n_case: nCase,
            calibrated_volume_pct: volumeBarPct,

            // Citizen Evidence & Resolution Proof Arrays
            evidence_photos: evidencePhotos,
            resolution_proof_photos: resolutionProofPhotos,
            stacked_ticket_numbers: stackedTickets,

            // Rollups
            concept_booked_count: nCase,
            concept_raw_bookings: nCase,
            area_total_complaints: nPlace,
            area_unique_citizens: new Set(groupComplaints.map((c) => c.user_id)).size,
            k_threshold: stack?.kEffectiveThreshold || 1,
            is_compound_hazard: isCompound,
            volume_rank_in_district: 1,
          });
        }
      }

      // -----------------------------------------------------------------------
      // 4. Strict Descending Monotonic Sort Order:
      // SortKey = (N_place DESC, N_case DESC, max_urgency_score DESC, earliest_created_at ASC)
      // -----------------------------------------------------------------------
      rankedGrievanceFeed.sort((a, b) => {
        if (b.n_place !== a.n_place) {
          return b.n_place - a.n_place; // Highest-complaint places at Position #1 top
        }
        if (b.n_case !== a.n_case) {
          return b.n_case - a.n_case; // Most booked concept at that place next
        }
        if (b.ai_urgency_score !== a.ai_urgency_score) {
          return b.ai_urgency_score - a.ai_urgency_score;
        }
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

      // Assign Volume Rank in District (#1, #2, #3, ...)
      rankedGrievanceFeed.forEach((item, index) => {
        item.volume_rank_in_district = index + 1;
      });

      // Filter by place if requested in query
      let filteredFeed = rankedGrievanceFeed;
      if (placeFilter && placeFilter !== 'ALL') {
        filteredFeed = rankedGrievanceFeed.filter(
          (item) => item.place_id === placeFilter || item.place_name === placeFilter
        );
      }

      // -----------------------------------------------------------------------
      // 5. Area & Concept Hotspots (Backwards-Compatible Rollups)
      // -----------------------------------------------------------------------
      const areaMap = new Map<string, { totalComplaints: number; districtName: string }>();
      for (const item of rankedGrievanceFeed) {
        if (!areaMap.has(item.area_name)) {
          areaMap.set(item.area_name, {
            totalComplaints: 0,
            districtName: item.district_name,
          });
        }
        areaMap.get(item.area_name)!.totalComplaints += item.n_case;
      }

      const topAreaHotspots: AreaHotspot[] = Array.from(areaMap.entries())
        .map(([areaName, data]) => ({
          area_name: areaName,
          district_name: data.districtName,
          total_area_complaints: data.totalComplaints,
          total_citizen_bookings: data.totalComplaints,
          distinct_issue_stacks: rankedGrievanceFeed.filter((i) => i.area_name === areaName).length,
        }))
        .sort((a, b) => b.total_citizen_bookings - a.total_citizen_bookings)
        .slice(0, 5);

      const conceptMap = new Map<string, { category: string; totalCasesBooked: number; activeLocations: Set<string> }>();
      for (const item of rankedGrievanceFeed) {
        if (!conceptMap.has(item.concept_name)) {
          conceptMap.set(item.concept_name, {
            category: item.category,
            totalCasesBooked: 0,
            activeLocations: new Set<string>(),
          });
        }
        const data = conceptMap.get(item.concept_name)!;
        data.totalCasesBooked += item.n_case;
        data.activeLocations.add(item.place_name);
      }

      const topBookedConcepts: ConceptHotspot[] = Array.from(conceptMap.entries())
        .map(([conceptName, data]) => ({
          concept_name: conceptName,
          category: data.category,
          total_cases_booked: data.totalCasesBooked,
          active_locations_count: data.activeLocations.size,
        }))
        .sort((a, b) => b.total_cases_booked - a.total_cases_booked)
        .slice(0, 5);

      return res.status(200).json({
        topPlaceHotspot,
        placeVolumePills,
        topAreaHotspots,
        topBookedConcepts,
        rankedGrievanceFeed: filteredFeed,
      });
    }
  );

  return router;
}

export default createIsolatedPortalRouter;
