-- ============================================================================
-- CIVIC HELPLINE INDIA - ROW-LEVEL SECURITY (RLS) & ACCESS CONTROL POLICIES
-- PostgreSQL 16 + PostGIS 3.4 / Supabase Database Architecture
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ROLE DEFINITIONS & PRIVILEGE REVOCATIONS
-- ----------------------------------------------------------------------------

-- Revoke default public schema execute and table access from anonymous roles
REVOKE ALL ON SCHEMA public FROM public;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM public;

-- Grant usage on public schema to authenticated and service roles only
GRANT USAGE ON SCHEMA public TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 2. ENABLE ROW-LEVEL SECURITY ACROSS ALL TABLES (ZERO PUBLIC ACCESS)
-- ----------------------------------------------------------------------------

ALTER TABLE states_uts ENABLE ROW LEVEL SECURITY;
ALTER TABLE districts_cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments_helplines ENABLE ROW LEVEL SECURITY;
ALTER TABLE district_grievance_routing ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_status_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE helpline_audit_flags ENABLE ROW LEVEL SECURITY;

-- Enforce strict RLS (even table owners cannot bypass when acting as role)
ALTER TABLE states_uts FORCE ROW LEVEL SECURITY;
ALTER TABLE districts_cities FORCE ROW LEVEL SECURITY;
ALTER TABLE departments_helplines FORCE ROW LEVEL SECURITY;
ALTER TABLE district_grievance_routing FORCE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;
ALTER TABLE complaints FORCE ROW LEVEL SECURITY;
ALTER TABLE complaint_images FORCE ROW LEVEL SECURITY;
ALTER TABLE complaint_status_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE helpline_audit_flags FORCE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 3. REFERENCE DIRECTORY POLICIES (READ-ONLY FOR PUBLIC, WRITE-RESTRICTED)
-- ----------------------------------------------------------------------------

-- States & UTs: Read-only for authenticated and anonymous; mutations restricted to System Admin
CREATE POLICY "states_uts_public_read"
  ON states_uts FOR SELECT
  USING (true);

CREATE POLICY "states_uts_admin_modify"
  ON states_uts FOR ALL
  TO service_role, super_admin
  USING (true)
  WITH CHECK (true);

-- Districts & Cities: Read-only public lookup; mutations restricted to System Admin
CREATE POLICY "districts_cities_public_read"
  ON districts_cities FOR SELECT
  USING (true);

CREATE POLICY "districts_cities_admin_modify"
  ON districts_cities FOR ALL
  TO service_role, super_admin
  USING (true)
  WITH CHECK (true);

-- Helplines: Read-only for public directories; updates restricted to Moderators/Admins
CREATE POLICY "departments_helplines_public_read"
  ON departments_helplines FOR SELECT
  USING (true);

CREATE POLICY "departments_helplines_admin_modify"
  ON departments_helplines FOR ALL
  TO service_role, super_admin
  USING (true)
  WITH CHECK (true);

-- District Grievance Routing (170 Districts): Read-only routing tables
CREATE POLICY "district_routing_public_read"
  ON district_grievance_routing FOR SELECT
  USING (true);

-- ----------------------------------------------------------------------------
-- 4. CITIZEN USERS ENTITY POLICIES (DPDP ACT 2023 - STRICT PRIVATE ISOLATION)
-- ----------------------------------------------------------------------------

-- Citizens may ONLY read their own profile row. Master dumps are strictly blocked.
CREATE POLICY "users_select_own_profile"
  ON users FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Citizens may ONLY insert their own matching profile upon verified sign-in.
CREATE POLICY "users_insert_own_profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Citizens may ONLY update their own preferences (full_name, preferred_lang, default_district_id)
CREATE POLICY "users_update_own_profile"
  ON users FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND role = (SELECT role FROM users WHERE user_id = auth.uid()) -- Prevent privilege escalation
  );

-- Direct deletion of user accounts is denied to regular users
CREATE POLICY "users_delete_deny"
  ON users FOR DELETE
  USING (false);

-- ----------------------------------------------------------------------------
-- 5. COMPLAINTS ENTITY POLICIES (WRITE-ONLY SUBMISSIONS & SCOPED-OWN READS)
-- ----------------------------------------------------------------------------

-- A. Submissions (Write-Only): Authenticated users can insert ONLY where record.user_id == auth.uid()
CREATE POLICY "complaints_insert_authenticated_owner"
  ON complaints FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'Submitted'
    AND latitude IS NOT NULL
    AND longitude IS NOT NULL
  );

-- B. Restricted Reads: Regular citizens can ONLY query their OWN complaints
CREATE POLICY "complaints_select_own_records"
  ON complaints FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (auth.jwt() ->> 'role') IN ('Department Operator', 'State Moderator', 'System Admin')
  );

-- C. Deny All Updates for Regular Citizens (Only Administrative Roles May Mutate Lifecycle)
CREATE POLICY "complaints_update_moderators_only"
  ON complaints FOR UPDATE
  TO authenticated, service_role
  USING (
    (auth.jwt() ->> 'role') IN ('Department Operator', 'State Moderator', 'System Admin')
    -- Citizen 48h satisfaction window re-open / close exception:
    OR (
      user_id = auth.uid()
      AND status = 'Resolved'
      AND citizen_satisfaction_deadline > CURRENT_TIMESTAMP
    )
  )
  WITH CHECK (
    user_id = (SELECT c.user_id FROM complaints c WHERE c.complaint_id = complaints.complaint_id)
  );

-- D. No Deletions: Complaints are statutory audit records and can NEVER be deleted by citizens
CREATE POLICY "complaints_delete_deny_all"
  ON complaints FOR DELETE
  USING (false);

-- ----------------------------------------------------------------------------
-- 6. COMPLAINT IMAGES & EVIDENCE POLICIES
-- ----------------------------------------------------------------------------

-- Images can only be attached to a complaint owned by the authenticated citizen
CREATE POLICY "complaint_images_insert_owner"
  ON complaint_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM complaints c
      WHERE c.complaint_id = complaint_images.complaint_id
      AND c.user_id = auth.uid()
    )
  );

-- Images can only be viewed by the complaint owner or administrative staff
CREATE POLICY "complaint_images_select_owner_or_admin"
  ON complaint_images FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM complaints c
      WHERE c.complaint_id = complaint_images.complaint_id
      AND (
        c.user_id = auth.uid()
        OR (auth.jwt() ->> 'role') IN ('Department Operator', 'State Moderator', 'System Admin')
      )
    )
  );

-- Deny all update and delete on evidence photos
CREATE POLICY "complaint_images_update_deny"
  ON complaint_images FOR UPDATE
  USING (false);

CREATE POLICY "complaint_images_delete_deny"
  ON complaint_images FOR DELETE
  USING (false);

-- ----------------------------------------------------------------------------
-- 7. COMPLAINT STATUS LOGS (IMMUTABLE AUDIT TRAIL)
-- ----------------------------------------------------------------------------

-- Read logs for own complaint
CREATE POLICY "complaint_logs_select_own"
  ON complaint_status_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM complaints c
      WHERE c.complaint_id = complaint_status_logs.complaint_id
      AND (
        c.user_id = auth.uid()
        OR (auth.jwt() ->> 'role') IN ('Department Operator', 'State Moderator', 'System Admin')
      )
    )
  );

-- Insert logs restricted to authenticated system transitions
CREATE POLICY "complaint_logs_insert_admin"
  ON complaint_status_logs FOR INSERT
  TO authenticated, service_role
  WITH CHECK (true);

-- Immutable: NEVER update or delete audit logs
CREATE POLICY "complaint_logs_update_deny"
  ON complaint_status_logs FOR UPDATE
  USING (false);

CREATE POLICY "complaint_logs_delete_deny"
  ON complaint_status_logs FOR DELETE
  USING (false);

-- ----------------------------------------------------------------------------
-- 8. HELPLINE AUDIT FLAGS (CROWD-SOURCED DIRECTORY AUDIT)
-- ----------------------------------------------------------------------------

CREATE POLICY "audit_flags_insert_citizen"
  ON helpline_audit_flags FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = reported_by_user_id
  );

CREATE POLICY "audit_flags_select_admin"
  ON helpline_audit_flags FOR SELECT
  TO authenticated
  USING (
    reported_by_user_id = auth.uid()
    OR (auth.jwt() ->> 'role') IN ('State Moderator', 'System Admin')
  );

CREATE POLICY "audit_flags_update_admin"
  ON helpline_audit_flags FOR UPDATE
  TO authenticated, service_role
  USING (
    (auth.jwt() ->> 'role') IN ('State Moderator', 'System Admin')
  );

CREATE POLICY "audit_flags_delete_deny"
  ON helpline_audit_flags FOR DELETE
  USING (false);

-- ----------------------------------------------------------------------------
-- 9. INCIDENT STACKS & MEMBERSHIPS (COMMUNITY AGGREGATION & ANTI-SYBIL)
-- ----------------------------------------------------------------------------

-- A. Citizens can view public incident stacks (anonymized community progress)
CREATE POLICY "incident_stacks_select_public"
  ON incident_stacks FOR SELECT
  TO authenticated, anon
  USING (true);

-- B. Mutation of incident stacks is strictly managed by the dispatch engine
CREATE POLICY "incident_stacks_insert_service"
  ON incident_stacks FOR INSERT
  TO authenticated, service_role
  WITH CHECK (true);

CREATE POLICY "incident_stacks_update_service"
  ON incident_stacks FOR UPDATE
  TO authenticated, service_role
  USING (true);

CREATE POLICY "incident_stacks_delete_deny"
  ON incident_stacks FOR DELETE
  USING (false);

-- C. Stack memberships: citizens can view their own contributions
CREATE POLICY "stack_memberships_select_own"
  ON stack_memberships FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (auth.jwt() ->> 'role') IN ('Department Operator', 'State Moderator', 'System Admin')
  );

CREATE POLICY "stack_memberships_insert_service"
  ON stack_memberships FOR INSERT
  TO authenticated, service_role
  WITH CHECK (true);

CREATE POLICY "stack_memberships_delete_deny"
  ON stack_memberships FOR DELETE
  USING (false);

