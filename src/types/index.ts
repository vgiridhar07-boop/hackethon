export type JurisdictionType = 'State' | 'UT';

export type HelplineCategory =
  | 'Emergency'
  | 'Garbage'
  | 'Roads'
  | 'Water'
  | 'Drainage'
  | 'Electricity'
  | 'Consumer'
  | 'General';

export type ComplaintCategory =
  | 'Garbage'
  | 'Roads'
  | 'Water'
  | 'Drainage'
  | 'Electricity';

export type ComplaintStatus =
  | 'Submitted'
  | 'Under Review'
  | 'On Hold'
  | 'Assigned'
  | 'In Progress'
  | 'Resolved';

export type RbacRole =
  | 'Citizen'
  | 'Department Operator'
  | 'State Moderator'
  | 'System Admin';

export interface StateUT {
  state_id: number;
  name: string;
  code: string;
  type: JurisdictionType;
  portal_url: string;
  nodal_helpline: string;
}

export interface DistrictRouting {
  routing_id: number;
  district_id: number;
  state_ut_name: string;
  district_name: string;
  source_pdf_page: number;
  mandals_villages_text: string;
  local_governance_text: string;
  road_category_routing: string;
  water_category_routing: string;
  garbage_category_routing: string;
  electricity_category_routing: string;
}

export interface HelplineEndpoint {
  id: string;
  district_id?: number | null;
  state_id?: number | null;
  organization_name: string;
  department_name: string;
  category: HelplineCategory;
  sub_category?: string;
  contact_number?: string | null;
  primary_phone_raw?: string | null;
  callable_uri?: string | null;
  fallback_phone_raw: string;
  fallback_callable_uri: string;
  sms_uri?: string | null;
  whatsapp_uri?: string | null;
  is_tollfree: boolean;
  operational_hours: string;
  operating_hours: string;
  languages_supported: string[];
  geolocation_scope: string;
  priority_tier: number;
  escalation_contact?: string;
  official_email?: string;
  web_portal?: string;
  integration_protocol?: string;
  common_issues_covered?: string;
  last_verified_at?: string;
}

export interface UserProfile {
  user_id: string;
  phone_number: string;
  email?: string;
  full_name: string;
  preferred_lang: string;
  role: RbacRole;
  default_district_id?: number | null;
  auth_method?: 'phone' | 'email' | 'google';
  state_name?: string;
  district_name?: string;
  latitude?: number;
  longitude?: number;
  address_text?: string;
  created_at: string;
}

export interface UserSessionPayload {
  userId: string;
  authMethod: 'phone' | 'email' | 'google';
  phone?: string;
  email?: string;
  fullName?: string;
  state: string;
  district: string;
  location: {
    lat: number;
    lng: number;
    accuracy: number;
    address: string;
  };
  authenticatedAt: string;
}

export interface ComplaintImage {
  image_id: string;
  complaint_id: string;
  storage_url: string;
  exif_latitude?: number | null;
  exif_longitude?: number | null;
  ai_validation_passed: boolean;
  is_resolution_proof: boolean;
  uploaded_at: string;
}

export interface ComplaintStatusLog {
  log_id: number;
  complaint_id: string;
  previous_status: string;
  new_status: string;
  remarks: string;
  updated_by: string;
  timestamp: string;
}

export interface AiTriageResult {
  ai_category: ComplaintCategory;
  ai_confidence: number;
  ai_urgency_score: number; // 1 to 5
  sla_target_hours: number; // 4, 24, or 72
  duplicate_detected_within_50m: boolean;
  duplicate_ticket_id?: string;
  detected_issues: string[];
  detectedIssues?: string[];
  anonymization_performed: boolean;
}

export interface Complaint {
  complaint_id: string;
  ticket_number: string;
  user_id: string;
  category: ComplaintCategory;
  district_id: number;
  state_id?: number;
  latitude: number;
  longitude: number;
  address_text?: string;
  landmark?: string;
  description: string;
  ai_category?: string;
  ai_confidence?: number;
  ai_urgency_score?: number;
  sla_target_hours: number;
  status: ComplaintStatus;
  assigned_department?: string;
  assigned_officer_contact?: string;
  created_at: string;
  resolved_at?: string | null;
  citizen_satisfaction_deadline?: string | null;
  stack_id?: string;
  stack_code?: string;
  accepted_by_officer_id?: string | null;
  accepted_at?: string | null;
  held_at?: string | null;
  hold_reason?: string | null;
  claim_version?: number;
  claimed_by_officer_id?: string | null;
  claimed_at?: string | null;
  assigned_helplines?: string[];
  escalation_deadline?: string | null;
  images: ComplaintImage[];
  status_logs: ComplaintStatusLog[];
}

export interface HelplineAuditFlag {
  flag_id: number;
  helpline_id: string;
  reported_by_user_id?: string;
  issue_type: 'Number Changed' | 'Unreachable' | 'Wrong Department';
  citizen_notes: string;
  verification_status: string;
  created_at: string;
}

export interface DistrictSlaMetrics {
  district_id: number;
  district_name: string;
  state_name: string;
  total_complaints: number;
  resolved_complaints: number;
  avg_resolution_hours: number;
  sla_compliance_rate: number; // 0 to 100%
  critical_under_4h_rate: number;
  urgent_under_24h_rate: number;
  standard_under_72h_rate: number;
}
