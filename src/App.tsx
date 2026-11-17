import React, { useState, useEffect } from 'react';
import {
  StateUT,
  DistrictRouting,
  Complaint,
  HelplineEndpoint,
  UserProfile,
  ComplaintCategory,
  ComplaintStatus,
  UserSessionPayload,
} from './types';
import { STATES_UTS } from './data/statesUts';
import { DISTRICT_ROUTING_170 } from './data/districtRouting170';
import { Header } from './components/Header';
import { EmergencyQuickAccessBar } from './components/EmergencyQuickAccessBar';
import { JurisdictionSelector } from './components/JurisdictionSelector';
import { NavigationTabs, ActiveTab } from './components/NavigationTabs';
import { CivicServicesHub } from './components/CivicServicesHub';
import { ComplaintTracker } from './components/ComplaintTracker';
import { HelplineDirectory } from './components/HelplineDirectory';
import { SlaScorecard } from './components/SlaScorecard';
import { ComplaintRegistrationModal } from './components/ComplaintRegistrationModal';
import { LanguageModal } from './components/LanguageModal';
import { CitizenAuthModal } from './components/CitizenAuthModal';
import { AuditFlagModal } from './components/AuditFlagModal';
import { UserLoginOnboardingPage } from './components/UserLoginOnboardingPage';
import { initializeIndexedDbWithSeedData, getDb } from './services/db';
import { getCurrentGpsPosition, reverseResolveWard } from './services/geolocation';

export const App: React.FC = () => {
  const [activeView, setActiveView] = useState<'dashboard' | 'auth'>('dashboard');
  const [userSession, setUserSession] = useState<UserSessionPayload | null>(() => {
    try {
      const raw = localStorage.getItem('civic_user_session');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('services');
  const [selectedState, setSelectedState] = useState<StateUT>(STATES_UTS[0]); // Andhra Pradesh default
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictRouting>(
    DISTRICT_ROUTING_170[9] // Guntur default (Page 7)
  );
  const [governanceMode, setGovernanceMode] = useState<'All' | 'Urban' | 'Rural'>('All');
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [helplines, setHelplines] = useState<HelplineEndpoint[]>([]);
  const [user, setUser] = useState<UserProfile>(() => ({
    user_id: 'citizen-primary',
    phone_number: '+91 98765 43210',
    full_name: 'vgiri',
    preferred_lang: 'English',
    role: 'Citizen',
    default_district_id: 10,
    created_at: new Date().toISOString(),
  }));
  const [isGpsActive, setIsGpsActive] = useState<boolean>(true);
  const [activeLanguage, setActiveLanguage] = useState<string>('English');

  // Sync saved session on mount
  useEffect(() => {
    if (userSession) {
      if (userSession.state) {
        const sMatch = STATES_UTS.find((s) => s.name.toLowerCase() === userSession.state.toLowerCase());
        if (sMatch) setSelectedState(sMatch);
      }
      if (userSession.district) {
        const dMatch = DISTRICT_ROUTING_170.find(
          (d) => d.district_name.toLowerCase() === userSession.district.toLowerCase()
        );
        if (dMatch) setSelectedDistrict(dMatch);
      }
      setUser((prev) => ({
        ...prev,
        user_id: userSession.userId,
        phone_number: userSession.phone || prev.phone_number,
        email: userSession.email,
        full_name: userSession.fullName || prev.full_name,
        state_name: userSession.state,
        district_name: userSession.district,
        latitude: userSession.location?.lat,
        longitude: userSession.location?.lng,
        address_text: userSession.location?.address,
      }));
    }
  }, []);

  // Modals state
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [reportModalCategory, setReportModalCategory] = useState<ComplaintCategory>('Roads');
  const [isLangModalOpen, setIsLangModalOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState<boolean>(false);
  const [targetAuditHelpline, setTargetAuditHelpline] = useState<HelplineEndpoint | null>(null);

  // Initialize data on launch: fetch real backend complaints and sync with offline IndexedDB
  useEffect(() => {
    async function init() {
      try {
        await initializeIndexedDbWithSeedData();
        const db = await getDb();

        // 1. Attempt to fetch real complaints from backend API
        let realComplaints: Complaint[] = [];
        try {
          const activeUserId = userSession?.userId || 'citizen-primary';
          const activeRole = 'Citizen';
          const citizenToken = localStorage.getItem('citizen_access_token') || localStorage.getItem('civic_auth_token');
          const headers: Record<string, string> = {
            'x-user-id': activeUserId,
            'x-user-role': activeRole,
          };
          if (citizenToken) {
            headers['Authorization'] = `Bearer ${citizenToken}`;
          }
          const res = await fetch('/api/v1/complaints', {
            headers,
          });
          if (res.ok) {
            const data = await res.json();
            if (data.complaints && Array.isArray(data.complaints)) {
              realComplaints = data.complaints;
            }
          }
        } catch {
          // Backend offline or unreachable
        }

        // 2. Load offline complaints from IndexedDB
        const storedComplaints = await db.getAll('complaints');

        // Merge without duplicates
        const combinedMap = new Map<string, Complaint>();
        realComplaints.forEach((c) => combinedMap.set(c.complaint_id, c));
        storedComplaints.forEach((c) => {
          if (!combinedMap.has(c.complaint_id)) {
            combinedMap.set(c.complaint_id, c);
          }
        });

        const finalComplaints = Array.from(combinedMap.values());
        setComplaints(finalComplaints);

        const storedHelplines = await db.getAll('helplines');
        if (storedHelplines.length > 0) {
          setHelplines(storedHelplines);
        }
        const storedUser = await db.get('user_profile', 'citizen-primary');
        if (storedUser) {
          setUser(storedUser);
        }
      } catch (err) {
        // Fallback in case of sandboxed IndexedDB restriction
      }
    }
    init();
  }, []);

  // Handle GPS trigger
  const handleTriggerGps = async () => {
    try {
      const pos = await getCurrentGpsPosition();
      const resolved = reverseResolveWard(pos.latitude, pos.longitude);
      setSelectedDistrict(resolved.district);
      setSelectedState(resolved.state);
      setIsGpsActive(true);
    } catch (e) {
      setIsGpsActive(false);
    }
  };

  // State selection handler
  const handleSelectState = (state: StateUT) => {
    setSelectedState(state);
    setIsGpsActive(false);
    // Auto-select first district in state
    const firstDist = DISTRICT_ROUTING_170.find(
      (d) => d.state_ut_name.toLowerCase() === state.name.toLowerCase()
    );
    if (firstDist) {
      setSelectedDistrict(firstDist);
    }
  };

  // District selection handler
  const handleSelectDistrict = (district: DistrictRouting) => {
    setSelectedDistrict(district);
    setIsGpsActive(false);
  };

  // Open complaint registration modal
  const handleOpenReportModal = (category: ComplaintCategory = 'Roads') => {
    setReportModalCategory(category);
    setIsReportModalOpen(true);
  };

  // New complaint registered
  const handleSubmitNewComplaint = async (newComp: Complaint) => {
    const updated = [newComp, ...complaints];
    setComplaints(updated);
    try {
      const db = await getDb();
      await db.put('complaints', newComp);
    } catch (e) {
      // IndexedDB fallback
    }
  };

  // Status update (Stage transitions & 48-hour satisfaction re-open)
  const handleUpdateComplaintStatus = async (
    ticketNumber: string,
    newStatus: ComplaintStatus,
    remarks?: string
  ) => {
    const updated = complaints.map((c) => {
      if (c.ticket_number === ticketNumber) {
        const newLog = {
          log_id: Date.now(),
          complaint_id: c.complaint_id,
          previous_status: c.status,
          new_status: newStatus,
          remarks: remarks || `Status advanced to ${newStatus}`,
          updated_by: 'Citizen Verification Desk',
          timestamp: new Date().toISOString(),
        };
        return {
          ...c,
          status: newStatus,
          resolved_at: newStatus === 'Resolved' ? new Date().toISOString() : c.resolved_at,
          citizen_satisfaction_deadline:
            newStatus === 'Resolved'
              ? new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
              : c.citizen_satisfaction_deadline,
          status_logs: [...c.status_logs, newLog],
        };
      }
      return c;
    });

    setComplaints(updated);
    try {
      const db = await getDb();
      const target = updated.find((c) => c.ticket_number === ticketNumber);
      if (target) await db.put('complaints', target);

      // Synchronize with backend API
      const authToken = localStorage.getItem('civic_auth_token') || localStorage.getItem('officer_command_token');
      const patchHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-user-id': user.user_id || 'citizen-primary',
        'x-user-role': user.role || 'Citizen',
      };
      if (authToken) {
        patchHeaders['Authorization'] = `Bearer ${authToken}`;
      }

      await fetch(`/api/v1/complaints/${encodeURIComponent(ticketNumber)}/status`, {
        method: 'PATCH',
        headers: patchHeaders,
        body: JSON.stringify({
          status: newStatus,
          remarks: remarks || `Status advanced to ${newStatus}`,
          updated_by: user.full_name || 'Citizen Verification Desk',
        }),
      });
    } catch (e) {
      // Offline fallback
    }
  };

  // Open audit modal for an outdated number
  const handleOpenAuditModal = (helpline: HelplineEndpoint) => {
    setTargetAuditHelpline(helpline);
    setIsAuditModalOpen(true);
  };

  // Submit audit flag
  const handleSubmitAuditFlag = async (
    helplineId: string,
    issueType: string,
    citizenNotes: string
  ) => {
    try {
      const db = await getDb();
      await db.put('audit_flags', {
        flag_id: Date.now(),
        helpline_id: helplineId,
        reported_by_user_id: user.user_id,
        issue_type: issueType as any,
        citizen_notes: citizenNotes,
        verification_status: 'Pending 24h Audit',
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      // Fallback
    }
  };

  // Handle successful login from UserLoginOnboardingPage
  const handleLoginSuccess = async (session: UserSessionPayload) => {
    setUserSession(session);

    // Sync state and district
    const sMatch = STATES_UTS.find((s) => s.name.toLowerCase() === session.state.toLowerCase());
    if (sMatch) setSelectedState(sMatch);

    const dMatch = DISTRICT_ROUTING_170.find(
      (d) => d.district_name.toLowerCase() === session.district.toLowerCase()
    );
    if (dMatch) setSelectedDistrict(dMatch);

    const updatedUser: UserProfile = {
      user_id: session.userId,
      phone_number: session.phone || '+91 98765 43210',
      email: session.email,
      full_name: session.fullName || 'vgiri',
      preferred_lang: activeLanguage,
      role: 'Citizen',
      default_district_id: dMatch?.district_id || 10,
      state_name: session.state,
      district_name: session.district,
      latitude: session.location.lat,
      longitude: session.location.lng,
      address_text: session.location.address,
      created_at: session.authenticatedAt,
    };

    setUser(updatedUser);

    try {
      const db = await getDb();
      await db.put('user_profile', updatedUser);
    } catch {}

    setActiveView('dashboard');
  };

  // Render dedicated Login & Onboarding view
  if (activeView === 'auth') {
    return (
      <UserLoginOnboardingPage
        onLoginSuccess={handleLoginSuccess}
        onCancel={() => setActiveView('dashboard')}
        existingSession={userSession}
      />
    );
  }

  return (
    <div className="min-h-screen bg-stitch-surface-canvas text-stitch-ink-primary font-sans flex flex-col pb-28">
      {/* Top Sovereign Identity & Header */}
      <Header
        user={user}
        selectedState={selectedState}
        selectedDistrict={selectedDistrict}
        onOpenLanguageModal={() => setIsLangModalOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenLoginOnboarding={() => setActiveView('auth')}
        activeLanguage={activeLanguage}
      />

      {/* Main Navigation Tabs */}
      <NavigationTabs
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        pendingCount={complaints.filter((c) => c.status !== 'Resolved').length}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {/* State & District Administrative Jurisdiction Selector */}
        <JurisdictionSelector
          states={STATES_UTS}
          districts={DISTRICT_ROUTING_170}
          selectedState={selectedState}
          selectedDistrict={selectedDistrict}
          onSelectState={handleSelectState}
          onSelectDistrict={handleSelectDistrict}
          isGpsActive={isGpsActive}
          onTriggerGps={handleTriggerGps}
          governanceMode={governanceMode}
          onChangeGovernanceMode={setGovernanceMode}
        />

        {/* Tab 1: Civic Services Hub (Home Dashboard) */}
        {activeTab === 'services' && (
          <CivicServicesHub
            selectedState={selectedState}
            selectedDistrict={selectedDistrict}
            onOpenReportModal={handleOpenReportModal}
            onNavigateTab={setActiveTab}
            onOpenLoginOnboarding={() => setActiveView('auth')}
            recentComplaints={complaints}
            userName={user.full_name}
          />
        )}

        {/* Tab 2: Track Your Complaint (5-Stage Lifecycle Stepper) */}
        {activeTab === 'complaints' && (
          <ComplaintTracker
            complaints={complaints}
            onUpdateStatus={handleUpdateComplaintStatus}
            onOpenReportModal={() => setIsReportModalOpen(true)}
          />
        )}

        {/* Tab 3: Pan-India Verified Helpline Directory */}
        {activeTab === 'directory' && (
          <HelplineDirectory
            helplines={helplines}
            selectedState={selectedState}
            selectedDistrict={selectedDistrict}
            onOpenAuditModal={handleOpenAuditModal}
            governanceMode={governanceMode}
          />
        )}

        {/* Tab 4: Open Civic Data & Municipal SLA Scorecard */}
        {activeTab === 'scorecard' && (
          <SlaScorecard
            states={STATES_UTS}
            selectedState={selectedState}
          />
        )}
      </main>

      {/* Persistent Bottom Floating Emergency Quick Access Bar */}
      <EmergencyQuickAccessBar
        stateNodalCode={selectedState.nodal_helpline}
        stateNodalName={`${selectedState.name} Nodal Desk`}
      />

      {/* Modals */}
      <ComplaintRegistrationModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        selectedState={selectedState}
        selectedDistrict={selectedDistrict}
        existingComplaints={complaints}
        onSubmitComplaint={handleSubmitNewComplaint}
        preselectedCategory={reportModalCategory}
      />

      <LanguageModal
        isOpen={isLangModalOpen}
        onClose={() => setIsLangModalOpen(false)}
        activeLanguage={activeLanguage}
        onSelectLanguage={setActiveLanguage}
      />

      <CitizenAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={user}
        onUpdateUser={setUser}
      />

      <AuditFlagModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        helpline={targetAuditHelpline}
        onSubmitFlag={handleSubmitAuditFlag}
      />
    </div>
  );
};

export default App;
