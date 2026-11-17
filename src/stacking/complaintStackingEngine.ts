import {
  COMPOUND_HAZARD_PAIRS,
  CivicCategory,
  SubIssuePolicy,
  detectSubIssuePolicy,
} from './stackingPolicyConfig';

export type StackLifecycleStatus =
  | 'Buffering'
  | 'Dispatched'
  | 'On Hold'
  | 'Escalated_Tier_2'
  | 'Escalated_Tier_3'
  | 'In Progress'
  | 'Resolved';

export type StackMatchMode =
  | 'CoLocated_Same_Issue'
  | 'Compound_Cross_Category'
  | 'Corridor_Feeder_Outage';

export interface IncomingComplaintPayload {
  complaintId: string;
  ticketNumber: string;
  userId: string;
  districtId: number;
  stateCode: string;
  isRuralPanchayat: boolean;
  category: CivicCategory;
  subIssueCode: string;
  latitude: number;
  longitude: number;
  gpsAccuracyMeters: number;
  description: string;
  cvConfidence: number; // 0.0 to 1.0 from MobileNetV3/ResNet50
  nlpUrgencyScore: number; // 1 to 5 from Transformer NLP
  embedding?: number[]; // 384-d float vector
  assignedDepartment: string;
  assignedOfficerContact: string | null;
}

export interface StackingResult {
  stackId: string;
  stackCode: string;
  actionTaken:
    | 'CREATED_AND_DISPATCHED_IMMEDIATELY'
    | 'CREATED_AND_BUFFERING'
    | 'STACKED_AND_DISPATCHED'
    | 'STACKED_STILL_BUFFERING'
    | 'STACKED_AND_ESCALATED';
  matchMode: StackMatchMode;
  uniqueCitizenCount: number;
  rawReportCount: number;
  kEffectiveThreshold: number;
  dispatchReadinessScore: number;
  pooledCvConfidence: number;
  authorityNotified: boolean;
  escalationTierTriggered: 0 | 1 | 2 | 3;
  subIssueLabel: string;
  assignedDepartment: string;
  mustDispatchByIso: string;
}

export interface IncidentStackRecord {
  stackId: string;
  stackCode: string;
  districtId: number;
  isRuralPanchayat: boolean;
  primaryCategory: CivicCategory;
  secondaryCategories: CivicCategory[];
  subIssueCode: string;
  subIssueLabel: string;
  matchMode: StackMatchMode;
  isCompoundHazard: boolean;
  centroidLat: number;
  centroidLon: number;
  clusterRadiusMeters: number;
  semanticCentroid: number[];
  rawReportCount: number;
  uniqueCitizenCount: number;
  kBaseThreshold: number;
  kEffectiveThreshold: number;
  pooledCvConfidence: number;
  maxUrgencyScore: number;
  dispatchReadinessScore: number;
  maxWaitMinutes: number;
  mustDispatchBy: Date;
  slaTargetHours: number;
  stackStatus: StackLifecycleStatus;
  assignedDepartment: string;
  assignedOfficerContact: string | null;
  acceptedByOfficerId?: string | null;
  acceptedAt?: Date | null;
  heldAt?: Date | null;
  holdReason?: string | null;
  dispatchedAt: Date | null;
  escalatedTier2At: Date | null;
  escalatedTier3At: Date | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StackMembershipRecord {
  membershipId: number;
  stackId: string;
  complaintId: string;
  userId: string;
  distanceFromCentroidM: number;
  semanticSimilarity: number;
  isUniqueContributor: boolean;
  joinedAt: Date;
}

export interface NotificationDispatcher {
  notifyAuthorityTier1: (stackId: string, dept: string, contact: string | null) => Promise<void>;
  notifyAuthorityTier2Executive: (stackId: string, dept: string) => Promise<void>;
  notifyAuthorityTier3Collectorate: (stackId: string, districtId: number) => Promise<void>;
  notifyCitizenStackUpdate: (stackId: string, message: string) => Promise<void>;
}

// Compute Haversine distance in meters between two WGS84 coordinates
export function computeHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Compute Cosine similarity between two float vectors
export function computeCosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length === 0 || vecB.length === 0 || vecA.length !== vecB.length) {
    return 1.0; // Fallback exact match if embeddings not provided
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Simple deterministic synthetic 384-d pseudo-embedding generator from string for testing & offline mode
export function generateSyntheticEmbedding(text: string): number[] {
  const dim = 384;
  const vec = new Array(dim).fill(0);
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  for (let i = 0; i < dim; i++) {
    vec[i] = Math.sin(hash + i * 0.17) * Math.cos(i);
  }
  // Normalize vector to unit length
  const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  return vec.map((v) => (norm > 0 ? v / norm : 0));
}

export class ComplaintStackingEngine {
  private readonly notificationDispatcher: NotificationDispatcher;
  private readonly dbPool: any | null;

  // In-memory persistent transactional storage for standalone operation & test verification
  private inMemoryStacks: Map<string, IncidentStackRecord> = new Map();
  private inMemoryMemberships: StackMembershipRecord[] = [];
  private membershipCounter = 1;

  constructor(
    notificationDispatcher?: Partial<NotificationDispatcher>,
    dbPool?: any
  ) {
    this.dbPool = dbPool || null;
    this.notificationDispatcher = {
      notifyAuthorityTier1: async (stackId, dept, contact) => {
        console.log(
          `[AUTHORITY DISPATCH] Tier 1 -> Stack: ${stackId} Dispatched to ${dept} (Contact: ${contact || 'Desk Queue'})`
        );
      },
      notifyAuthorityTier2Executive: async (stackId, dept) => {
        console.log(
          `[SURGE ESCALATION] Tier 2 -> Stack: ${stackId} Escalated to Executive Engineer / Municipal Commissioner for ${dept}`
        );
      },
      notifyAuthorityTier3Collectorate: async (stackId, districtId) => {
        console.log(
          `[APEX ESCALATION] Tier 3 -> Stack: ${stackId} Escalated to District Collectorate Grievance Cell (District ID: ${districtId}) & State Nodal 181 / 1902`
        );
      },
      notifyCitizenStackUpdate: async (stackId, message) => {
        console.log(`[CITIZEN NOTIFY] Stack: ${stackId} -> ${message}`);
      },
      ...notificationDispatcher,
    };
  }

  /**
   * Resolves the SubIssuePolicy and computes the effective threshold K_effective
   * accounting for rural Gram Panchayat adaptation and NLP urgency overrides.
   */
  public resolvePolicy(payload: IncomingComplaintPayload): {
    policy: SubIssuePolicy;
    kEffective: number;
  } {
    const policy = detectSubIssuePolicy(payload.category, payload.description, payload.subIssueCode);

    // Rule 1: If AI NLP urgency is 5 (Critical Public Danger), force immediate K=1 bypass
    if (payload.nlpUrgencyScore >= 5 || policy.kUrban === 1) {
      return {
        policy: { ...policy, maxWaitMinutes: 0, slaHours: 4 },
        kEffective: 1,
      };
    }

    // Rule 2: Rural Gram Panchayat adaptation: reduces base threshold by 1 (minimum 1)
    const baseK = payload.isRuralPanchayat ? policy.kRural : policy.kUrban;

    // Rule 3: If NLP urgency is 4 (Urgent), cap K_effective at 2 in urban and 1 in rural
    const urgencyAdjustedK =
      payload.nlpUrgencyScore === 4 ? Math.min(baseK, payload.isRuralPanchayat ? 1 : 2) : baseK;

    return {
      policy,
      kEffective: Math.max(1, urgencyAdjustedK) as 1 | 2 | 3 | 4,
    };
  }

  /**
   * Computes the deterministic Dispatch Readiness Score S(t)
   */
  public computeDispatchScore(params: {
    uniqueCitizenCount: number;
    kEffective: number;
    maxUrgencyScore: number;
    pooledCvConfidence: number;
    elapsedMinutes: number;
    maxWaitMinutes: number;
    isCompoundHazard: boolean;
  }): number {
    const fillRatioComponent = 100 * (params.uniqueCitizenCount / params.kEffective);
    const urgencyComponent = params.maxUrgencyScore >= 4 ? 25 : 0;
    const cvComponent = 15 * params.pooledCvConfidence;
    const timeDecayComponent =
      params.maxWaitMinutes <= 0
        ? 100
        : 100 * Math.min(1.5, params.elapsedMinutes / params.maxWaitMinutes);
    const compoundComponent = params.isCompoundHazard ? 50 : 0;

    return Number(
      (fillRatioComponent + urgencyComponent + cvComponent + timeDecayComponent + compoundComponent).toFixed(2)
    );
  }

  /**
   * Main transactional entry point: ingests a newly filed complaint, searches for
   * an active spatial/semantic stack, updates Bayesian centroids, and triggers
   * authority notifications if K_effective or S(t) >= 100 is satisfied.
   */
  public async processAndStackComplaint(payload: IncomingComplaintPayload): Promise<StackingResult> {
    const { policy, kEffective } = this.resolvePolicy(payload);
    const embedding = payload.embedding && payload.embedding.length > 0
      ? payload.embedding
      : generateSyntheticEmbedding(`${payload.category} ${payload.description}`);

    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);

    // Find candidate stacks in memory
    let candidateStack: IncidentStackRecord | null = null;
    let candidateDistance = Infinity;
    let candidateSimilarity = 0;

    for (const stack of this.inMemoryStacks.values()) {
      if (stack.districtId !== payload.districtId) continue;
      if (stack.stackStatus === 'Resolved') continue;
      if (stack.createdAt < twoDaysAgo) continue;

      const dist = computeHaversineDistanceMeters(
        payload.latitude,
        payload.longitude,
        stack.centroidLat,
        stack.centroidLon
      );

      // Check Mode A & Mode C: Same Category
      if (stack.primaryCategory === payload.category) {
        if (dist <= policy.radiusMeters) {
          const sim = computeCosineSimilarity(embedding, stack.semanticCentroid);
          const isSameSubIssue = stack.subIssueCode === policy.subIssueCode;
          if (isSameSubIssue || sim >= 0.72) {
            if (dist < candidateDistance) {
              candidateStack = stack;
              candidateDistance = dist;
              candidateSimilarity = sim;
            }
          }
        }
      } else {
        // Check Mode B: Cross-Category Compound Hazard within 25 meters in past 12 hours
        if (stack.createdAt >= twelveHoursAgo && dist <= 25) {
          const isPair = COMPOUND_HAZARD_PAIRS.some(
            ([a, b]) =>
              (a === stack.primaryCategory && b === payload.category) ||
              (b === stack.primaryCategory && a === payload.category)
          );
          if (isPair) {
            if (dist < candidateDistance) {
              candidateStack = stack;
              candidateDistance = dist;
              candidateSimilarity = 1.0;
            }
          }
        }
      }
    }

    // CASE 1: No matching active stack -> Create a new incident_stack
    if (!candidateStack) {
      const randomSeq = Math.floor(10000 + Math.random() * 90000);
      const stackCode = `STK-2026-${payload.stateCode || 'IN'}-${randomSeq}`;
      const stackId = `stk-${Date.now().toString(36)}-${randomSeq}`;

      const initialScore = this.computeDispatchScore({
        uniqueCitizenCount: 1,
        kEffective,
        maxUrgencyScore: payload.nlpUrgencyScore,
        pooledCvConfidence: payload.cvConfidence,
        elapsedMinutes: 0,
        maxWaitMinutes: policy.maxWaitMinutes,
        isCompoundHazard: false,
      });

      const shouldDispatchImmediately =
        kEffective === 1 || initialScore >= 100 || policy.maxWaitMinutes === 0;
      const initialStatus: StackLifecycleStatus = shouldDispatchImmediately ? 'Dispatched' : 'Buffering';
      const matchMode: StackMatchMode =
        policy.radiusMeters >= 250 ? 'Corridor_Feeder_Outage' : 'CoLocated_Same_Issue';

      const mustDispatchBy = new Date(now.getTime() + policy.maxWaitMinutes * 60 * 1000);

      const newStack: IncidentStackRecord = {
        stackId,
        stackCode,
        districtId: payload.districtId,
        isRuralPanchayat: payload.isRuralPanchayat,
        primaryCategory: payload.category,
        secondaryCategories: [],
        subIssueCode: policy.subIssueCode,
        subIssueLabel: policy.subIssueLabel,
        matchMode,
        isCompoundHazard: false,
        centroidLat: payload.latitude,
        centroidLon: payload.longitude,
        clusterRadiusMeters: policy.radiusMeters,
        semanticCentroid: embedding,
        rawReportCount: 1,
        uniqueCitizenCount: 1,
        kBaseThreshold: payload.isRuralPanchayat ? policy.kRural : policy.kUrban,
        kEffectiveThreshold: kEffective,
        pooledCvConfidence: payload.cvConfidence,
        maxUrgencyScore: payload.nlpUrgencyScore,
        dispatchReadinessScore: initialScore,
        maxWaitMinutes: policy.maxWaitMinutes,
        mustDispatchBy,
        slaTargetHours: policy.slaHours,
        stackStatus: initialStatus,
        assignedDepartment: policy.responsibleAuthority || payload.assignedDepartment,
        assignedOfficerContact: payload.assignedOfficerContact,
        dispatchedAt: shouldDispatchImmediately ? now : null,
        escalatedTier2At: null,
        escalatedTier3At: null,
        resolvedAt: null,
        createdAt: now,
        updatedAt: now,
      };

      this.inMemoryStacks.set(stackId, newStack);

      this.inMemoryMemberships.push({
        membershipId: this.membershipCounter++,
        stackId,
        complaintId: payload.complaintId,
        userId: payload.userId,
        distanceFromCentroidM: 0.0,
        semanticSimilarity: 1.0,
        isUniqueContributor: true,
        joinedAt: now,
      });

      if (shouldDispatchImmediately) {
        await this.notificationDispatcher.notifyAuthorityTier1(
          stackId,
          newStack.assignedDepartment,
          newStack.assignedOfficerContact
        );
      }

      return {
        stackId,
        stackCode,
        actionTaken: shouldDispatchImmediately
          ? 'CREATED_AND_DISPATCHED_IMMEDIATELY'
          : 'CREATED_AND_BUFFERING',
        matchMode,
        uniqueCitizenCount: 1,
        rawReportCount: 1,
        kEffectiveThreshold: kEffective,
        dispatchReadinessScore: initialScore,
        pooledCvConfidence: payload.cvConfidence,
        authorityNotified: shouldDispatchImmediately,
        escalationTierTriggered: shouldDispatchImmediately ? 1 : 0,
        subIssueLabel: policy.subIssueLabel,
        assignedDepartment: newStack.assignedDepartment,
        mustDispatchByIso: mustDispatchBy.toISOString(),
      };
    }

    // CASE 2: Matching active candidate stack found -> Attach complaint & evaluate threshold
    const cand = candidateStack;
    const stackId = cand.stackId;

    // Anti-Sybil Check: Has this user_id already contributed to this stack?
    const existingMembership = this.inMemoryMemberships.find(
      (m) => m.stackId === stackId && m.userId === payload.userId
    );
    const isUniqueUser = !existingMembership;

    // Check if this is a Mode B Compound Cross-Category Hazard
    const isCrossCategory = cand.primaryCategory !== payload.category;
    const isCompoundPair =
      isCrossCategory &&
      COMPOUND_HAZARD_PAIRS.some(
        ([a, b]) =>
          (a === cand.primaryCategory && b === payload.category) ||
          (b === cand.primaryCategory && a === payload.category)
      );

    const newRawCount = cand.rawReportCount + 1;
    const newUniqueCount = cand.uniqueCitizenCount + (isUniqueUser ? 1 : 0);

    // Bayesian Pooled CV Confidence: 1 - (1 - P_prev) * (1 - C_new)
    const prevPooledCv = cand.pooledCvConfidence;
    const newPooledCv = isUniqueUser
      ? Number((1 - (1 - prevPooledCv) * (1 - payload.cvConfidence)).toFixed(4))
      : Math.max(prevPooledCv, payload.cvConfidence);

    // Spatial Centroid Bayesian Update weighted by raw count
    const prevLat = cand.centroidLat;
    const prevLon = cand.centroidLon;
    const newLat = Number(((prevLat * (newRawCount - 1) + payload.latitude) / newRawCount).toFixed(8));
    const newLon = Number(((prevLon * (newRawCount - 1) + payload.longitude) / newRawCount).toFixed(8));

    // Semantic Centroid Bayesian running average update
    const newSemanticCentroid: number[] = new Array(cand.semanticCentroid.length);
    for (let i = 0; i < cand.semanticCentroid.length; i++) {
      newSemanticCentroid[i] =
        (cand.semanticCentroid[i] * (newRawCount - 1) + embedding[i]) / newRawCount;
    }

    const newMaxUrgency = Math.max(cand.maxUrgencyScore, payload.nlpUrgencyScore);
    const newKEffective = isCompoundPair
      ? 1 // Compound cross-category hazards immediately collapse threshold to 1!
      : Math.min(cand.kEffectiveThreshold, kEffective);

    const newSlaHours = Math.min(cand.slaTargetHours, policy.slaHours);
    const newCompoundFlag = cand.isCompoundHazard || isCompoundPair;
    const matchMode: StackMatchMode = newCompoundFlag
      ? 'Compound_Cross_Category'
      : policy.radiusMeters >= 250
      ? 'Corridor_Feeder_Outage'
      : 'CoLocated_Same_Issue';

    const elapsedMinutes = (now.getTime() - cand.createdAt.getTime()) / (60 * 1000);

    const newScore = this.computeDispatchScore({
      uniqueCitizenCount: newUniqueCount,
      kEffective: newKEffective,
      maxUrgencyScore: newMaxUrgency,
      pooledCvConfidence: newPooledCv,
      elapsedMinutes,
      maxWaitMinutes: cand.maxWaitMinutes,
      isCompoundHazard: newCompoundFlag,
    });

    // State Transition & Surge Escalation Logic
    let newStatus: StackLifecycleStatus = cand.stackStatus;
    let authorityNotified = false;
    let escalationTier: 0 | 1 | 2 | 3 = 0;
    let actionTaken: StackingResult['actionTaken'] = 'STACKED_STILL_BUFFERING';

    if (cand.stackStatus === 'Buffering') {
      if (newUniqueCount >= newKEffective || newMaxUrgency === 5 || newScore >= 100) {
        newStatus = 'Dispatched';
        authorityNotified = true;
        escalationTier = 1;
        actionTaken = 'STACKED_AND_DISPATCHED';
        cand.dispatchedAt = now;
      }
    } else if (cand.stackStatus === 'Dispatched' || cand.stackStatus === 'Escalated_Tier_2') {
      // Surge Escalation when stack keeps growing after initial dispatch
      if (newUniqueCount >= 3 * newKEffective) {
        newStatus = 'Escalated_Tier_3';
        authorityNotified = true;
        escalationTier = 3;
        actionTaken = 'STACKED_AND_ESCALATED';
        cand.escalatedTier3At = now;
      } else if (newUniqueCount >= 2 * newKEffective && cand.stackStatus === 'Dispatched') {
        newStatus = 'Escalated_Tier_2';
        authorityNotified = true;
        escalationTier = 2;
        actionTaken = 'STACKED_AND_ESCALATED';
        cand.escalatedTier2At = now;
      }
    }

    if (isCrossCategory && !cand.secondaryCategories.includes(payload.category)) {
      cand.secondaryCategories.push(payload.category);
    }

    cand.matchMode = matchMode;
    cand.isCompoundHazard = newCompoundFlag;
    cand.centroidLat = newLat;
    cand.centroidLon = newLon;
    cand.semanticCentroid = newSemanticCentroid;
    cand.rawReportCount = newRawCount;
    cand.uniqueCitizenCount = newUniqueCount;
    cand.kEffectiveThreshold = newKEffective;
    cand.pooledCvConfidence = newPooledCv;
    cand.maxUrgencyScore = newMaxUrgency;
    cand.dispatchReadinessScore = newScore;
    cand.slaTargetHours = newSlaHours;
    cand.stackStatus = newStatus;
    cand.updatedAt = now;

    this.inMemoryMemberships.push({
      membershipId: this.membershipCounter++,
      stackId,
      complaintId: payload.complaintId,
      userId: payload.userId,
      distanceFromCentroidM: Number(candidateDistance.toFixed(2)),
      semanticSimilarity: Number(candidateSimilarity.toFixed(4)),
      isUniqueContributor: isUniqueUser,
      joinedAt: now,
    });

    // Trigger asynchronous authority notifications
    if (escalationTier === 1) {
      await this.notificationDispatcher.notifyAuthorityTier1(
        stackId,
        cand.assignedDepartment,
        cand.assignedOfficerContact
      );
      await this.notificationDispatcher.notifyCitizenStackUpdate(
        stackId,
        `Your complaint has been verified by ${newUniqueCount} citizens in your area (Stack ${cand.stackCode}) and dispatched to ${cand.assignedDepartment}.`
      );
    } else if (escalationTier === 2) {
      await this.notificationDispatcher.notifyAuthorityTier2Executive(stackId, cand.assignedDepartment);
    } else if (escalationTier === 3) {
      await this.notificationDispatcher.notifyAuthorityTier3Collectorate(stackId, payload.districtId);
    }

    return {
      stackId,
      stackCode: cand.stackCode,
      actionTaken,
      matchMode,
      uniqueCitizenCount: newUniqueCount,
      rawReportCount: newRawCount,
      kEffectiveThreshold: newKEffective,
      dispatchReadinessScore: newScore,
      pooledCvConfidence: newPooledCv,
      authorityNotified,
      escalationTierTriggered: escalationTier,
      subIssueLabel: cand.subIssueLabel,
      assignedDepartment: cand.assignedDepartment,
      mustDispatchByIso: cand.mustDispatchBy.toISOString(),
    };
  }

  /**
   * Starvation-Guard Cron Worker:
   * Ensures that even if a low-density street only receives N=1 report for a K=2 or K=3 issue,
   * once T_max (mustDispatchBy) expires, the stack automatically dispatches to the authority!
   */
  public async flushExpiredBufferingStacks(nowOverride?: Date): Promise<number> {
    const currentTime = nowOverride || new Date();
    let flushedCount = 0;

    for (const stack of this.inMemoryStacks.values()) {
      if (stack.stackStatus === 'Buffering' && stack.mustDispatchBy <= currentTime) {
        stack.stackStatus = 'Dispatched';
        stack.dispatchReadinessScore = 100.0;
        stack.dispatchedAt = currentTime;
        stack.updatedAt = currentTime;
        flushedCount++;

        await this.notificationDispatcher.notifyAuthorityTier1(
          stack.stackId,
          stack.assignedDepartment,
          stack.assignedOfficerContact
        );
      }
    }

    return flushedCount;
  }

  /**
   * Get all active stacks in a district or within a bounding box
   */
  public getActiveStacks(districtId?: number): IncidentStackRecord[] {
    return Array.from(this.inMemoryStacks.values()).filter(
      (s) => s.stackStatus !== 'Resolved' && (!districtId || s.districtId === districtId)
    );
  }

  /**
   * Get a stack by its human-readable stack code
   */
  public getStackByCode(stackCode: string): IncidentStackRecord | null {
    for (const stack of this.inMemoryStacks.values()) {
      if (stack.stackCode.toUpperCase() === stackCode.toUpperCase()) {
        return stack;
      }
    }
    return null;
  }

  /**
   * Get member complaints for a stack
   */
  public getStackMembers(stackId: string): StackMembershipRecord[] {
    return this.inMemoryMemberships.filter((m) => m.stackId === stackId);
  }

  /**
   * Clear in-memory state (useful for unit testing)
   */
  public resetInMemoryStore(): void {
    this.inMemoryStacks.clear();
    this.inMemoryMemberships = [];
    this.membershipCounter = 1;
  }
}
