-- ============================================================================
-- CIVIC HELPLINE INDIA - COMPLETE POSTGRESQL 16 + POSTGIS 3.4 DDL SCHEMA
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Custom ENUM Types
CREATE TYPE jurisdiction_type_enum AS ENUM ('State', 'UT');
CREATE TYPE helpline_category_enum AS ENUM (
  'Emergency',
  'Garbage',
  'Roads',
  'Water',
  'Drainage',
  'Electricity',
  'Consumer',
  'General'
);
CREATE TYPE complaint_category_enum AS ENUM (
  'Garbage',
  'Roads',
  'Water',
  'Drainage',
  'Electricity'
);
CREATE TYPE complaint_status_enum AS ENUM (
  'Submitted',
  'Under Review',
  'Assigned',
  'In Progress',
  'Resolved'
);
CREATE TYPE rbac_role_enum AS ENUM (
  'Citizen',
  'Department Operator',
  'State Moderator',
  'System Admin'
);

-- 6.1 Entity: states_uts (All 28 States & 8 Union Territories)
CREATE TABLE states_uts (
  state_id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  code VARCHAR(5) NOT NULL UNIQUE,
  type jurisdiction_type_enum NOT NULL,
  portal_url VARCHAR(255),
  nodal_helpline VARCHAR(20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6.2 Entity: districts_cities (Administrative Districts & Municipal Boundaries)
CREATE TABLE districts_cities (
  district_id SERIAL PRIMARY KEY,
  state_id INTEGER NOT NULL REFERENCES states_uts(state_id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  headquarters VARCHAR(120),
  municipal_corp VARCHAR(255),
  mandals_count INTEGER,
  mandals_list TEXT,
  villages_count_text VARCHAR(50),
  pr_dept_available BOOLEAN NOT NULL DEFAULT TRUE,
  pr_eng_available BOOLEAN NOT NULL DEFAULT TRUE,
  municipality_corp_available BOOLEAN NOT NULL DEFAULT FALSE,
  latitude DECIMAL(10, 8) NOT NULL DEFAULT 20.59368400,
  longitude DECIMAL(11, 8) NOT NULL DEFAULT 78.96288000,
  boundary_geom GEOMETRY(Polygon, 4326),
  UNIQUE(state_id, name)
);

CREATE INDEX idx_districts_cities_state_id ON districts_cities(state_id);
CREATE INDEX idx_districts_cities_name_trgm ON districts_cities USING GIN (name gin_trgm_ops);
CREATE INDEX idx_districts_cities_boundary_geom ON districts_cities USING GIST (boundary_geom);

-- 6.3 Entity: departments_helplines (Core Schema + Extended Telephony Columns)
CREATE TABLE departments_helplines (
  helpline_id SERIAL PRIMARY KEY,
  id VARCHAR(64) NOT NULL UNIQUE,
  district_id INTEGER REFERENCES districts_cities(district_id) ON DELETE SET NULL,
  state_id INTEGER REFERENCES states_uts(state_id) ON DELETE CASCADE,
  organization_name VARCHAR(200) NOT NULL,
  department_name VARCHAR(200) NOT NULL,
  category helpline_category_enum NOT NULL,
  sub_category VARCHAR(150),
  contact_number VARCHAR(30),
  primary_phone_raw VARCHAR(30),
  callable_uri VARCHAR(50),
  fallback_phone_raw VARCHAR(30),
  fallback_callable_uri VARCHAR(50),
  sms_uri VARCHAR(50),
  whatsapp_uri VARCHAR(100),
  is_tollfree BOOLEAN NOT NULL DEFAULT FALSE,
  operational_hours VARCHAR(100) NOT NULL DEFAULT '24x7',
  operating_hours VARCHAR(100) NOT NULL DEFAULT '24x7',
  languages_supported TEXT[] NOT NULL DEFAULT ARRAY['en', 'hi'],
  geolocation_scope VARCHAR(150) NOT NULL DEFAULT 'Pan-India',
  priority_tier INTEGER NOT NULL DEFAULT 1,
  escalation_contact VARCHAR(200),
  official_email VARCHAR(150),
  web_portal VARCHAR(255),
  integration_protocol TEXT,
  common_issues_covered TEXT,
  last_verified_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dept_helplines_lookup ON departments_helplines(state_id, district_id, category);
CREATE INDEX idx_dept_helplines_trgm ON departments_helplines USING GIN (department_name gin_trgm_ops);

-- Extended Entity: district_grievance_routing (170 District Matrices)
CREATE TABLE district_grievance_routing (
  routing_id SERIAL PRIMARY KEY,
  district_id INTEGER NOT NULL REFERENCES districts_cities(district_id) ON DELETE CASCADE,
  state_ut_name VARCHAR(100) NOT NULL,
  district_name VARCHAR(120) NOT NULL,
  source_pdf_page INTEGER NOT NULL,
  mandals_villages_text TEXT NOT NULL,
  local_governance_text TEXT NOT NULL,
  road_category_routing TEXT NOT NULL,
  water_category_routing TEXT NOT NULL,
  garbage_category_routing TEXT NOT NULL,
  electricity_category_routing TEXT NOT NULL
);

-- 6.4 Entity: users (DPDP Act 2023 Compliant)
CREATE TABLE users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(15) NOT NULL UNIQUE,
  phone_number_sha256 VARCHAR(64) NOT NULL UNIQUE,
  phone_number_aes_enc TEXT NOT NULL,
  full_name VARCHAR(100),
  preferred_lang VARCHAR(10) NOT NULL DEFAULT 'en',
  role rbac_role_enum NOT NULL DEFAULT 'Citizen',
  default_district_id INTEGER REFERENCES districts_cities(district_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6.5 Entity: complaints (Central Transactional Grievance Record & SLA Lifecycle)
CREATE TABLE complaints (
  complaint_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number VARCHAR(25) NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  category complaint_category_enum NOT NULL,
  district_id INTEGER NOT NULL REFERENCES districts_cities(district_id),
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  location_geom GEOMETRY(Point, 4326) NOT NULL,
  address_text TEXT,
  landmark VARCHAR(200),
  description TEXT,
  ai_category VARCHAR(50),
  ai_confidence DECIMAL(5, 4) CHECK (ai_confidence >= 0.0000 AND ai_confidence <= 1.0000),
  ai_urgency_score INTEGER CHECK (ai_urgency_score BETWEEN 1 AND 5),
  sla_target_hours INTEGER NOT NULL DEFAULT 72,
  status complaint_status_enum NOT NULL DEFAULT 'Submitted',
  assigned_department VARCHAR(150),
  assigned_officer_contact VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMPTZ,
  citizen_satisfaction_deadline TIMESTAMPTZ
);

CREATE INDEX idx_complaints_location_geom ON complaints USING GIST (location_geom);
CREATE INDEX idx_complaints_ticket_number ON complaints(ticket_number);
CREATE INDEX idx_complaints_user_status ON complaints(user_id, status);

-- 6.6 Entity: complaint_images
CREATE TABLE complaint_images (
  image_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES complaints(complaint_id) ON DELETE CASCADE,
  storage_url VARCHAR(500) NOT NULL,
  exif_latitude DECIMAL(10, 8),
  exif_longitude DECIMAL(11, 8),
  ai_validation_passed BOOLEAN NOT NULL DEFAULT FALSE,
  is_resolution_proof BOOLEAN NOT NULL DEFAULT FALSE,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6.7 Entity: complaint_status_logs (Immutable Audit Trail)
CREATE TABLE complaint_status_logs (
  log_id BIGSERIAL PRIMARY KEY,
  complaint_id UUID NOT NULL REFERENCES complaints(complaint_id) ON DELETE CASCADE,
  previous_status VARCHAR(30) NOT NULL,
  new_status VARCHAR(30) NOT NULL,
  remarks TEXT,
  updated_by VARCHAR(100) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Crowd-Sourced Directory Audit Queue
CREATE TABLE helpline_audit_flags (
  flag_id BIGSERIAL PRIMARY KEY,
  helpline_id INTEGER NOT NULL REFERENCES departments_helplines(helpline_id) ON DELETE CASCADE,
  reported_by_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  issue_type VARCHAR(50) NOT NULL CHECK (issue_type IN ('Number Changed', 'Unreachable', 'Wrong Department')),
  citizen_notes TEXT,
  verification_status VARCHAR(30) NOT NULL DEFAULT 'Pending 24h Audit',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- MANDATORY ROW-LEVEL SECURITY ENFORCEMENT (ALL TABLES LOCKED)
-- See security-policies.sql for detailed grant matrices & role definitions
-- ============================================================================
ALTER TABLE states_uts ENABLE ROW LEVEL SECURITY;
ALTER TABLE districts_cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments_helplines ENABLE ROW LEVEL SECURITY;
ALTER TABLE district_grievance_routing ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_status_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE helpline_audit_flags ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SMART COMPLAINT STACKING & DISPATCH ENGINE — POSTGRESQL 16 + POSTGIS DDL
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "vector"; -- pgvector for 384-d NLP semantic embeddings

CREATE TYPE stack_lifecycle_status_enum AS ENUM (
  'Buffering',          -- Waiting for K_effective reports or T_max expiration
  'Dispatched',         -- K_effective reached (or K=1 bypass); authority notified
  'Escalated_Tier_2',   -- 2*K_effective reached without action; Executive Engineer notified
  'Escalated_Tier_3',   -- 3*K_effective reached or SLA breached; Collectorate/181/1902 notified
  'In Progress',        -- Field crew deployed on the stacked incident
  'Resolved'            -- Single resolution proof closes all stacked member complaints
);

CREATE TYPE stack_match_mode_enum AS ENUM (
  'CoLocated_Same_Issue',      -- Mode A: Same location + Same category/sub-issue
  'Compound_Cross_Category',   -- Mode B: Same micro-location (<=25m) + Coupled hazard categories
  'Corridor_Feeder_Outage'     -- Mode C: Same ward/feeder outage (Water / Electricity)
);

CREATE TABLE incident_stacks (
  stack_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stack_code VARCHAR(30) NOT NULL UNIQUE,          -- e.g., 'STK-2026-AP-10042'
  district_id INTEGER NOT NULL REFERENCES districts_cities(district_id),
  is_rural_panchayat BOOLEAN NOT NULL DEFAULT FALSE,
  primary_category complaint_category_enum NOT NULL,
  secondary_categories complaint_category_enum[] NOT NULL DEFAULT '{}',
  sub_issue_code VARCHAR(80) NOT NULL,
  match_mode stack_match_mode_enum NOT NULL DEFAULT 'CoLocated_Same_Issue',
  is_compound_hazard BOOLEAN NOT NULL DEFAULT FALSE,

  -- Spatial Centroid & Clustering Radius
  centroid_lat DECIMAL(10, 8) NOT NULL,
  centroid_lon DECIMAL(11, 8) NOT NULL,
  centroid_geom GEOMETRY(Point, 4326) NOT NULL,
  cluster_radius_meters INTEGER NOT NULL DEFAULT 50,

  -- Semantic Embedding Centroid (384-d all-MiniLM-L6-v2 / IndicBERT)
  semantic_centroid vector(384),

  -- Arithmetic Stack Counters & Thresholds
  raw_report_count INTEGER NOT NULL DEFAULT 1,      -- Includes repeat clicks by same user
  unique_citizen_count INTEGER NOT NULL DEFAULT 1,  -- Distinct user_ids (N_eff)
  k_base_threshold INTEGER NOT NULL CHECK (k_base_threshold BETWEEN 1 AND 4),
  k_effective_threshold INTEGER NOT NULL CHECK (k_effective_threshold BETWEEN 1 AND 4),
  pooled_cv_confidence DECIMAL(5, 4) NOT NULL DEFAULT 0.0000,
  max_urgency_score INTEGER NOT NULL DEFAULT 1 CHECK (max_urgency_score BETWEEN 1 AND 5),
  dispatch_readiness_score DECIMAL(7, 2) NOT NULL DEFAULT 0.00,

  -- Timing, Starvation Guard & SLA Windows
  max_wait_minutes INTEGER NOT NULL DEFAULT 360,    -- T_max starvation ceiling
  must_dispatch_by TIMESTAMPTZ NOT NULL,            -- created_at + max_wait_minutes
  sla_target_hours INTEGER NOT NULL DEFAULT 72,
  stack_status stack_lifecycle_status_enum NOT NULL DEFAULT 'Buffering',

  -- Authority Routing & Escalation Audit
  assigned_department VARCHAR(200) NOT NULL,
  assigned_officer_contact VARCHAR(50),
  dispatched_at TIMESTAMPTZ,
  escalated_tier2_at TIMESTAMPTZ,
  escalated_tier3_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_incident_stacks_active_spatial
  ON incident_stacks USING GIST (centroid_geom)
  WHERE stack_status <> 'Resolved';

CREATE INDEX idx_incident_stacks_buffering_deadline
  ON incident_stacks (must_dispatch_by)
  WHERE stack_status = 'Buffering';

CREATE TABLE stack_memberships (
  membership_id BIGSERIAL PRIMARY KEY,
  stack_id UUID NOT NULL REFERENCES incident_stacks(stack_id) ON DELETE CASCADE,
  complaint_id UUID NOT NULL UNIQUE REFERENCES complaints(complaint_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  distance_from_centroid_m DECIMAL(7, 2) NOT NULL,
  semantic_similarity DECIMAL(5, 4) NOT NULL,
  is_unique_contributor BOOLEAN NOT NULL DEFAULT TRUE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_stack_memberships_stack_user ON stack_memberships(stack_id, user_id);

ALTER TABLE incident_stacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE stack_memberships ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- OFFICER SPECIAL ACCESS CODES & HOLD/ACCEPT WORKFLOW SCHEMA EXTENSION
-- ============================================================================

-- 1. Extend complaint_status_enum to explicitly support 'On Hold' officer state
ALTER TYPE complaint_status_enum ADD VALUE IF NOT EXISTS 'On Hold' AFTER 'Under Review';
ALTER TYPE stack_lifecycle_status_enum ADD VALUE IF NOT EXISTS 'On Hold' AFTER 'Dispatched';

-- 2. Create officer_access_codes table for Special Code Authentication
CREATE TABLE IF NOT EXISTS officer_access_codes (
  officer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  officer_badge_id VARCHAR(50) NOT NULL UNIQUE,        -- e.g., 'GMC-ENG-44', 'DEL-MCD-108'
  full_name VARCHAR(120) NOT NULL,
  designation VARCHAR(120) NOT NULL,                   -- e.g., 'Ward Junior Engineer (Water Works)'
  department_name VARCHAR(200) NOT NULL,               -- Matches departments_helplines / district routing
  assigned_category complaint_category_enum NOT NULL,  -- 'Roads', 'Water', 'Garbage', 'Drainage', 'Electricity'
  state_id INTEGER NOT NULL REFERENCES states_uts(state_id) ON DELETE CASCADE,
  district_id INTEGER NOT NULL REFERENCES districts_cities(district_id) ON DELETE CASCADE,
  rbac_role rbac_role_enum NOT NULL DEFAULT 'Department Operator',
  special_code_hash VARCHAR(128) NOT NULL,             -- Salted SHA-256 hash of the Special Access Code
  special_code_display_hint VARCHAR(30) NOT NULL,      -- Masked hint for admin audit, e.g., 'OFF-AP-GMC-****'
  official_phone VARCHAR(30) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_officer_codes_jurisdiction
  ON officer_access_codes(state_id, district_id, assigned_category)
  WHERE is_active = TRUE;

-- 3. Add Officer Acceptance & Hold tracking columns to complaints and incident_stacks
ALTER TABLE complaints
  ADD COLUMN IF NOT EXISTS accepted_by_officer_id UUID REFERENCES officer_access_codes(officer_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS held_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS hold_reason TEXT;

ALTER TABLE incident_stacks
  ADD COLUMN IF NOT EXISTS accepted_by_officer_id UUID REFERENCES officer_access_codes(officer_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS held_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS hold_reason TEXT;

ALTER TABLE officer_access_codes ENABLE ROW LEVEL SECURITY;

-- 4. Seed Verified Officer Special Access Codes for Immediate Testing & Production Bootstrapping
INSERT INTO officer_access_codes (
  officer_badge_id, full_name, designation, department_name, assigned_category,
  state_id, district_id, rbac_role, special_code_hash, special_code_display_hint, official_phone
) VALUES
  (
    'GMC-OFF-44',
    'Er. K. Srinivasa Rao',
    'Executive Engineer — Municipal Water Works',
    'Guntur Municipal Corporation Water Works',
    'Water',
    1, 10, 'Department Operator',
    encode(digest('OFF-AP-GNT-WATER-2026', 'sha256'), 'hex'),
    'OFF-AP-GNT-****-2026',
    '+91-863-2220100'
  ),
  (
    'GMC-R&B-19',
    'Er. P. Venkata Ramana',
    'Assistant Engineer — Roads & Buildings (R&B)',
    'Dept: Roads & Buildings (R&B) Dept; Municipal Corp (Guntur MC)',
    'Roads',
    1, 10, 'Department Operator',
    encode(digest('OFF-AP-GNT-ROADS-2026', 'sha256'), 'hex'),
    'OFF-AP-GNT-****-2026',
    '+91-863-2220102'
  ),
  (
    'GMC-SWM-08',
    'Dr. M. Padmavathi',
    'Zonal Health & Sanitation Officer',
    'Dept: Sanitation Dept; Municipal Waste Mgmt Dept (Guntur MC)',
    'Garbage',
    1, 10, 'Department Operator',
    encode(digest('OFF-AP-GNT-GARBAGE-2026', 'sha256'), 'hex'),
    'OFF-AP-GNT-****-2026',
    '+91-863-2220105'
  ),
  (
    'MCD-UGD-112',
    'Er. Rajesh Sharma',
    'Nodal Safety Engineer — UGD & NAMASTE Cell',
    'Municipal Corporation of Delhi (MCD) — Underground Drainage',
    'Drainage',
    32, 164, 'State Moderator',
    encode(digest('OFF-DL-MCD-DRAIN-2026', 'sha256'), 'hex'),
    'OFF-DL-MCD-****-2026',
    '+91-11-23220011'
  ),
  (
    'BMC-DISCOM-77',
    'Er. Vikram Deshmukh',
    'Sub-Station Vigilance Engineer — Street Lighting & DISCOM',
    'Brihanmumbai Municipal Corporation (BMC) — Electricity & Street Lighting',
    'Electricity',
    14, 130, 'Department Operator',
    encode(digest('OFF-MH-BMC-ELEC-2026', 'sha256'), 'hex'),
    'OFF-MH-BMC-****-2026',
    '+91-22-22620251'
  )
ON CONFLICT (officer_badge_id) DO NOTHING;

-- ============================================================================
-- VOLUME-RANKED AREA HOTSPOT & CONCEPT BOOKING VIEW (POSTGRESQL 16)
-- ============================================================================

CREATE OR REPLACE VIEW v_volume_ranked_grievances AS
WITH area_totals AS (
  -- Compute total complaints booked per Area (District + Address/Ward locality cluster)
  SELECT
    c.district_id,
    COALESCE(NULLIF(TRIM(c.address_text), ''), 'General Ward Area') AS area_name,
    COUNT(DISTINCT c.complaint_id) AS area_total_complaints,
    COUNT(DISTINCT c.user_id) AS area_unique_citizens
  FROM complaints c
  WHERE c.status <> 'Resolved'
  GROUP BY c.district_id, COALESCE(NULLIF(TRIM(c.address_text), ''), 'General Ward Area')
),
concept_stacks AS (
  -- Aggregate bookings per Concept / Incident Stack
  SELECT
    COALESCE(s.stack_id::text, c.complaint_id::text) AS group_id,
    COALESCE(s.stack_code, c.ticket_number) AS display_code,
    c.complaint_id AS primary_complaint_id,
    c.ticket_number,
    c.district_id,
    d.name AS district_name,
    st.name AS state_name,
    c.category,
    COALESCE(s.sub_issue_code, c.ai_category, c.category::text) AS concept_name,
    COALESCE(NULLIF(TRIM(c.address_text), ''), 'General Ward Area') AS area_name,
    c.landmark,
    c.description,
    c.latitude,
    c.longitude,
    c.status,
    c.assigned_department,
    c.accepted_by_officer_id,
    c.hold_reason,
    c.ai_confidence,
    c.ai_urgency_score,
    c.sla_target_hours,
    c.created_at,
    COALESCE(s.unique_citizen_count, 1) AS concept_booked_count,
    COALESCE(s.raw_report_count, 1) AS concept_raw_bookings,
    COALESCE(s.k_threshold, 1) AS k_threshold,
    COALESCE(s.is_compound_hazard, FALSE) AS is_compound_hazard
  FROM complaints c
  JOIN districts_cities d ON d.district_id = c.district_id
  JOIN states_uts st ON st.state_id = d.state_id
  LEFT JOIN stack_memberships sm ON sm.complaint_id = c.complaint_id
  LEFT JOIN incident_stacks s ON s.stack_id = sm.stack_id
  WHERE c.status <> 'Resolved'
)
SELECT
  cs.*,
  at.area_total_complaints,
  at.area_unique_citizens,
  -- Global & Jurisdiction Rank by Concept Bookings DESC, Area Complaints DESC
  ROW_NUMBER() OVER (
    PARTITION BY cs.district_id
    ORDER BY
      cs.concept_booked_count DESC,
      at.area_total_complaints DESC,
      cs.concept_raw_bookings DESC,
      cs.ai_urgency_score DESC,
      cs.created_at ASC
  ) AS volume_rank_in_district,
  DENSE_RANK() OVER (
    PARTITION BY cs.district_id
    ORDER BY at.area_total_complaints DESC
  ) AS area_hotspot_rank
FROM concept_stacks cs
JOIN area_totals at
  ON at.district_id = cs.district_id
 AND at.area_name = cs.area_name
ORDER BY
  cs.concept_booked_count DESC,
  at.area_total_complaints DESC,
  cs.concept_raw_bookings DESC,
  cs.ai_urgency_score DESC,
  cs.created_at ASC;


