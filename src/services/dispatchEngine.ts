import { z } from 'zod';
import {
  classifyComplaintCategory,
  getHelplinesForDistrict,
} from '../config/official_registry_2026';
import { DISTRICT_ROUTING_170 } from '../data/districtRouting170';
import { Complaint } from '../types';

// ---------------------------------------------------------------------------
// SCHEMA VALIDATION (ZOD)
// ---------------------------------------------------------------------------

export const ClaimTicketInputSchema = z.object({
  officerId: z.string().min(1, 'Officer ID is required'),
  expectedVersion: z.number().int().min(1, 'Expected version must be an integer >= 1'),
  officerName: z.string().optional(),
  officerBadgeId: z.string().optional(),
  officerPhone: z.string().optional(),
  remarks: z.string().optional(),
});

export type ClaimTicketInput = z.infer<typeof ClaimTicketInputSchema>;

export const ComplaintClassificationInputSchema = z.object({
  description: z.string().min(5, 'Complaint description must be at least 5 characters long'),
  stateName: z.string().optional(),
  districtName: z.string().optional(),
  districtId: z.number().optional(),
  latitude: z.number(),
  longitude: z.number(),
  addressText: z.string().optional(),
  landmark: z.string().optional(),
});

export type ComplaintClassificationInput = z.infer<typeof ComplaintClassificationInputSchema>;

export interface DispatchRoutingResult {
  category: 'ROADS' | 'WATER' | 'SANITATION' | 'ELECTRICITY';
  department_name: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  urgency_score: number;
  sla_target_hours: number;
  escalation_deadline: string;
  assigned_helplines: string[];
  fallback_helplines: string[];
  district_id: number;
  district_name: string;
  state_name: string;
  matched_keywords: string[];
  claim_version: number;
}

// ---------------------------------------------------------------------------
// AUTOMATED CLASSIFICATION & DISPATCH ENGINE
// ---------------------------------------------------------------------------

export class DispatchEngine {
  /**
   * Resolves district and state names from ID or fallback coordinate lookups.
   */
  public resolveJurisdiction(districtId?: number, stateName?: string, districtName?: string): {
    districtId: number;
    districtName: string;
    stateName: string;
  } {
    if (districtId) {
      const match = DISTRICT_ROUTING_170.find((d) => d.district_id === districtId);
      if (match) {
        return {
          districtId: match.district_id,
          districtName: match.district_name,
          stateName: match.state_ut_name,
        };
      }
    }

    if (districtName) {
      const normD = districtName.trim().toLowerCase();
      const match = DISTRICT_ROUTING_170.find((d) => d.district_name.toLowerCase() === normD);
      if (match) {
        return {
          districtId: match.district_id,
          districtName: match.district_name,
          stateName: match.state_ut_name,
        };
      }
    }

    // Default fallback to Guntur, Andhra Pradesh (District ID 10)
    return {
      districtId: 10,
      districtName: districtName || 'Guntur',
      stateName: stateName || 'Andhra Pradesh',
    };
  }

  /**
   * Evaluates complaint text and location to return departmental routing, priority, SLA, and helplines.
   */
  public dispatchComplaint(input: ComplaintClassificationInput): DispatchRoutingResult {
    // 1. Validate Input
    const validated = ComplaintClassificationInputSchema.parse(input);

    // 2. Automated Category Taxonomy Classification
    const classification = classifyComplaintCategory(validated.description);

    // 3. Resolve Geographical Jurisdiction
    const jurisdiction = this.resolveJurisdiction(
      validated.districtId,
      validated.stateName,
      validated.districtName
    );

    // 4. Retrieve Official Helpline Numbers for Department in this District
    const helplines = getHelplinesForDistrict(
      jurisdiction.stateName,
      jurisdiction.districtName,
      classification.category
    );

    // 5. Determine Urgency Score (1 to 5) and Priority
    let urgencyScore = 3;
    let priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = classification.default_priority;

    if (classification.category === 'ELECTRICITY') {
      urgencyScore = 5;
      priority = 'HIGH';
    } else if (classification.category === 'WATER') {
      urgencyScore = 4;
      priority = 'HIGH';
    } else if (classification.category === 'ROADS') {
      urgencyScore = 3;
      priority = 'MEDIUM';
    } else {
      urgencyScore = 3;
      priority = 'MEDIUM';
    }

    // High danger modifiers
    const textLower = validated.description.toLowerCase();
    if (
      textLower.includes('spark') ||
      textLower.includes('hanging wire') ||
      textLower.includes('shock') ||
      textLower.includes('caved in') ||
      textLower.includes('flooding')
    ) {
      urgencyScore = 5;
      priority = 'CRITICAL';
    }

    // 6. Calculate Escalation Deadline
    const nowMs = Date.now();
    const escalationMs = nowMs + classification.escalation_threshold_hours * 3600 * 1000;
    const escalationDeadline = new Date(escalationMs).toISOString();

    return {
      category: classification.category,
      department_name: helplines.department,
      priority,
      urgency_score: urgencyScore,
      sla_target_hours: classification.escalation_threshold_hours,
      escalation_deadline: escalationDeadline,
      assigned_helplines: helplines.primary,
      fallback_helplines: helplines.fallback,
      district_id: jurisdiction.districtId,
      district_name: jurisdiction.districtName,
      state_name: jurisdiction.stateName,
      matched_keywords: classification.matched_keywords,
      claim_version: 1,
    };
  }

  /**
   * Performs atomic claiming on a complaint with optimistic locking.
   * Throws Error if expectedVersion does not match current version or if already claimed.
   */
  public claimTicket(
    complaint: Complaint,
    claimInput: ClaimTicketInput
  ): {
    success: boolean;
    complaint: Complaint;
    newVersion: number;
  } {
    // Validate claim input
    const validated = ClaimTicketInputSchema.parse(claimInput);

    const currentVersion = complaint.claim_version ?? 1;

    // Optimistic Concurrency Check
    if (currentVersion !== validated.expectedVersion) {
      const err = new Error(
        `CONCURRENT_CLAIM_CONFLICT: Ticket version mismatch (current: ${currentVersion}, expected: ${validated.expectedVersion}). The ticket was modified by another officer.`
      );
      (err as any).statusCode = 409;
      throw err;
    }

    // Verify if already claimed by another active officer
    if (
      complaint.claimed_by_officer_id &&
      complaint.claimed_by_officer_id !== validated.officerId &&
      complaint.status === 'In Progress'
    ) {
      const err = new Error(
        `ALREADY_CLAIMED_CONFLICT: This ticket is already claimed and in progress by officer ${complaint.claimed_by_officer_id}.`
      );
      (err as any).statusCode = 409;
      throw err;
    }

    // Apply atomic claim mutation
    const previousStatus = complaint.status;
    const nextVersion = currentVersion + 1;

    complaint.claim_version = nextVersion;
    complaint.claimed_by_officer_id = validated.officerId;
    complaint.claimed_at = new Date().toISOString();
    complaint.status = 'In Progress';
    complaint.accepted_by_officer_id = validated.officerId;
    complaint.accepted_at = complaint.claimed_at;
    complaint.held_at = null;
    complaint.hold_reason = null;

    if (validated.officerPhone) {
      complaint.assigned_officer_contact = validated.officerPhone;
    }

    complaint.status_logs.push({
      log_id: Date.now(),
      complaint_id: complaint.complaint_id,
      previous_status: previousStatus,
      new_status: 'In Progress',
      remarks: `Claimed atomically (version ${currentVersion} -> ${nextVersion}) by ${validated.officerName || 'Officer'} (${validated.officerBadgeId || validated.officerId}). ${validated.remarks || ''}`.trim(),
      updated_by: `${validated.officerName || 'Officer'} (${validated.officerBadgeId || validated.officerId})`,
      timestamp: complaint.claimed_at,
    });

    return {
      success: true,
      complaint,
      newVersion: nextVersion,
    };
  }
}

export const dispatchEngine = new DispatchEngine();

