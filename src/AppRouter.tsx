import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { RegionProvider } from './context/RegionContext';

// Lazy-loaded route views for optimal code-splitting and bundling
const RoleSelectionGatewayPage = lazy(() => import('./pages/RoleSelectionGatewayPage'));
const CitizenPortalLoginPage = lazy(() => import('./pages/CitizenPortalLoginPage'));
const OfficerPortalLoginPage = lazy(() => import('./pages/OfficerPortalLoginPage'));
const VolumeRankedOfficerPortalPage = lazy(() => import('./pages/VolumeRankedOfficerPortalPage'));
const CitizenHomeDashboard = lazy(() => import('./pages/CitizenHomeDashboard'));

// Guard for Citizen-Protected Routes: Redirects unauthenticated to /login
const RequireCitizenGuard: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const token =
    localStorage.getItem('citizen_access_token') || localStorage.getItem('civic_auth_token');
  const persona = localStorage.getItem('civic_persona');
  const role = localStorage.getItem('civic_role');

  if (!token || (persona !== 'CITIZEN' && role !== 'citizen')) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Guard for Officer-Protected Routes: Redirects unauthenticated to /login
const RequireOfficerGuard: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const token =
    localStorage.getItem('officer_command_token') || localStorage.getItem('civic_auth_token');
  const persona = localStorage.getItem('civic_persona');
  const role = localStorage.getItem('civic_role');

  if (!token || (persona !== 'OFFICER' && role !== 'officer')) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Root Redirect based on stored session
const RootRedirect: React.FC = () => {
  const officerToken = localStorage.getItem('officer_command_token');
  const persona = localStorage.getItem('civic_persona');
  const role = localStorage.getItem('civic_role');

  if (officerToken && (persona === 'OFFICER' || role === 'officer')) {
    return <Navigate to="/officer/dashboard" replace />;
  }

  const citizenToken =
    localStorage.getItem('citizen_access_token') || localStorage.getItem('civic_auth_token');
  if (citizenToken && (persona === 'CITIZEN' || role === 'citizen')) {
    return <Navigate to="/citizen/dashboard" replace />;
  }

  return <Navigate to="/login" replace />;
};

const LoadingFallback: React.FC = () => (
  <div className="min-h-dvh bg-stitch-surface-canvas flex items-center justify-center font-mono text-xs text-slate-500">
    <span>Loading portal...</span>
  </div>
);

export const AppRouter: React.FC = () => {
  const isOfficerSubdomain =
    typeof window !== 'undefined' && window.location.hostname.startsWith('officer.');

  return (
    <RegionProvider>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
            {isOfficerSubdomain ? (
              <>
                <Route path="/" element={<OfficerPortalLoginPage />} />
                <Route path="/login" element={<OfficerPortalLoginPage />} />
                <Route path="/login/officer" element={<OfficerPortalLoginPage />} />
                <Route
                  path="/dashboard"
                  element={
                    <RequireOfficerGuard>
                      <VolumeRankedOfficerPortalPage />
                    </RequireOfficerGuard>
                  }
                />
                <Route
                  path="/officer/dashboard"
                  element={
                    <RequireOfficerGuard>
                      <VolumeRankedOfficerPortalPage />
                    </RequireOfficerGuard>
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </>
            ) : (
              <>
                {/* Root Session Evaluation */}
                <Route path="/" element={<RootRedirect />} />

                {/* 1. Entry Role Selection Gateway */}
                <Route path="/login" element={<RoleSelectionGatewayPage />} />
                <Route path="/auth/select-role" element={<Navigate to="/login" replace />} />

                {/* 2. Dedicated Citizen Portal Login */}
                <Route path="/login/citizen" element={<CitizenPortalLoginPage />} />

                {/* 3. Dedicated Officer Portal Login */}
                <Route path="/login/officer" element={<OfficerPortalLoginPage />} />
                <Route path="/authority-portal/login" element={<OfficerPortalLoginPage />} />

                {/* 4. Protected Citizen Dashboard */}
                <Route
                  path="/citizen/dashboard/*"
                  element={
                    <RequireCitizenGuard>
                      <CitizenHomeDashboard />
                    </RequireCitizenGuard>
                  }
                />
                <Route
                  path="/citizen/*"
                  element={
                    <RequireCitizenGuard>
                      <CitizenHomeDashboard />
                    </RequireCitizenGuard>
                  }
                />

                {/* 5. Protected Officer Dashboard */}
                <Route
                  path="/officer/dashboard"
                  element={
                    <RequireOfficerGuard>
                      <VolumeRankedOfficerPortalPage />
                    </RequireOfficerGuard>
                  }
                />
                <Route
                  path="/officer/portal"
                  element={
                    <RequireOfficerGuard>
                      <VolumeRankedOfficerPortalPage />
                    </RequireOfficerGuard>
                  }
                />
                <Route
                  path="/authority-portal/dashboard"
                  element={
                    <RequireOfficerGuard>
                      <VolumeRankedOfficerPortalPage />
                    </RequireOfficerGuard>
                  }
                />
                <Route
                  path="/authority-portal/volume-ranked"
                  element={
                    <RequireOfficerGuard>
                      <VolumeRankedOfficerPortalPage />
                    </RequireOfficerGuard>
                  }
                />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/login" replace />} />
              </>
            )}
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  </RegionProvider>
  );
};

export default AppRouter;
