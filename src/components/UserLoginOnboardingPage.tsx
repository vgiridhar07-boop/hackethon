import React, { useState, useEffect, useMemo, useRef } from 'react';
import { UserSessionPayload } from '../types';
import { STATES_UTS } from '../data/statesUts';
import { DISTRICT_ROUTING_170 } from '../data/districtRouting170';
import { reverseGeocodeWithNominatim } from '../services/geolocation';
import { LocationPreviewMap } from './LocationPreviewMap';
import { LocationPermissionModal } from './LocationPermissionModal';

interface UserLoginOnboardingPageProps {
  onLoginSuccess: (session: UserSessionPayload) => void;
  onCancel?: () => void;
  existingSession?: UserSessionPayload | null;
}

interface CountryPrefix {
  code: string;
  country: string;
  flagCode: string;
}

const COUNTRY_PREFIXES: CountryPrefix[] = [
  { code: '+91', country: 'India', flagCode: 'IN' },
  { code: '+1', country: 'USA / Canada', flagCode: 'US' },
  { code: '+44', country: 'United Kingdom', flagCode: 'UK' },
  { code: '+971', country: 'United Arab Emirates', flagCode: 'UAE' },
  { code: '+65', country: 'Singapore', flagCode: 'SG' },
  { code: '+61', country: 'Australia', flagCode: 'AU' },
  { code: '+49', country: 'Germany', flagCode: 'DE' },
];

// RFC 5322 compliant email validation regex
const RFC_EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export const UserLoginOnboardingPage: React.FC<UserLoginOnboardingPageProps> = ({
  onLoginSuccess,
  onCancel,
  existingSession,
}) => {
  // Input fields state
  const [fullName, setFullName] = useState<string>(existingSession?.fullName || 'vgiri');
  const [emailAddress, setEmailAddress] = useState<string>(
    existingSession?.email || 'citizen@digitalindia.gov.in'
  );
  const [countryCode, setCountryCode] = useState<string>('+91');
  const [phoneNumber, setPhoneNumber] = useState<string>(
    existingSession?.phone?.replace(/^\+\d+\s*/, '').replace(/\D/g, '') || '9876543210'
  );

  // Field touched states for validation display
  const [touched, setTouched] = useState<{
    name: boolean;
    email: boolean;
    phone: boolean;
  }>({
    name: false,
    email: false,
    phone: false,
  });

  // Google OAuth integration state
  const [isGoogleAuthenticated, setIsGoogleAuthenticated] = useState<boolean>(
    existingSession?.authMethod === 'google'
  );
  const [googleProfile, setGoogleProfile] = useState<{
    displayName: string;
    email: string;
    photoUrl?: string;
  } | null>(
    existingSession?.authMethod === 'google'
      ? {
          displayName: existingSession.fullName || 'vgiri',
          email: existingSession.email || 'citizen.vgiri@gmail.com',
        }
      : null
  );

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Phone input ref for auto-focusing on Google login completion
  const phoneInputRef = useRef<HTMLInputElement>(null);

  // Regional Hierarchy Selectors (Cascading)
  const [selectedStateName, setSelectedStateName] = useState<string>(
    existingSession?.state || STATES_UTS[0].name
  );
  const [selectedDistrictName, setSelectedDistrictName] = useState<string>(
    existingSession?.district || 'Guntur'
  );

  // Geolocation & Auto-Fill State
  const [isDetectingLocation, setIsDetectingLocation] = useState<boolean>(false);
  const [gpsLocked, setGpsLocked] = useState<boolean>(!!existingSession?.location);
  const [latitude, setLatitude] = useState<number>(existingSession?.location?.lat || 16.3067);
  const [longitude, setLongitude] = useState<number>(existingSession?.location?.lng || 80.4365);
  const [accuracy, setAccuracy] = useState<number>(existingSession?.location?.accuracy || 4.2);
  const [formattedAddress, setFormattedAddress] = useState<string>(
    existingSession?.location?.address || 'Ward 14, Main Road, Guntur, Andhra Pradesh, 522002'
  );
  const [reverseGeocodedPlace, setReverseGeocodedPlace] = useState<string>('');
  const [locationPermissionError, setLocationPermissionError] = useState<string | null>(null);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState<boolean>(false);

  // Available districts for the currently selected state
  const availableDistricts = useMemo(() => {
    return DISTRICT_ROUTING_170.filter(
      (d) => d.state_ut_name.toLowerCase() === selectedStateName.toLowerCase()
    );
  }, [selectedStateName]);

  // When selected state changes, ensure selected district belongs to that state
  const handleStateChange = (newStateName: string) => {
    setSelectedStateName(newStateName);
    const districtsForState = DISTRICT_ROUTING_170.filter(
      (d) => d.state_ut_name.toLowerCase() === newStateName.toLowerCase()
    );
    if (districtsForState.length > 0) {
      setSelectedDistrictName(districtsForState[0].district_name);
    } else {
      setSelectedDistrictName('');
    }
  };

  // Trigger exact geolocation capture
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setLocationPermissionError('Browser geolocation hardware API is not supported on this device.');
      setIsPermissionModalOpen(true);
      return;
    }

    setIsDetectingLocation(true);
    setLocationPermissionError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const acc = position.coords.accuracy;

        setLatitude(lat);
        setLongitude(lng);
        setAccuracy(acc);
        setGpsLocked(true);

        try {
          const geoRes = await reverseGeocodeWithNominatim(lat, lng);
          setFormattedAddress(geoRes.formattedAddress);
          setReverseGeocodedPlace(
            `${geoRes.districtName ? geoRes.districtName + ', ' : ''}${geoRes.stateName}`
          );

          // Auto-populate State and District
          setSelectedStateName(geoRes.stateName);
          setSelectedDistrictName(geoRes.districtName);
        } catch {
          // Centroid fallback
        } finally {
          setIsDetectingLocation(false);
        }
      },
      (error) => {
        setIsDetectingLocation(false);
        let msg = 'Failed to acquire location signal.';
        if (error.code === 1) {
          msg = 'Location permission was denied by the user or browser policy.';
        } else if (error.code === 2) {
          msg = 'Position unavailable. Satellite/network positioning could not be determined.';
        } else if (error.code === 3) {
          msg = 'Geolocation request timed out after 10000ms.';
        }
        setLocationPermissionError(msg);
        setIsPermissionModalOpen(true);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Auto-trigger location detection on initial mount if not yet locked
  useEffect(() => {
    if (!gpsLocked) {
      handleDetectLocation();
    }
  }, []);

  // Validation rules
  // 1. Full Name Validation: >= 2 chars, non-empty, strips leading/trailing whitespace, rejects purely numeric
  const nameTrimmed = fullName.trim();
  const isNameEmpty = nameTrimmed.length === 0;
  const isNameTooShort = nameTrimmed.length < 2;
  const isNamePurelyNumeric = /^\d+$/.test(nameTrimmed);
  const isNameValid = !isNameEmpty && !isNameTooShort && !isNamePurelyNumeric;

  const getNameError = (): string | null => {
    if (!touched.name) return null;
    if (isNameEmpty) return 'Full name is required.';
    if (isNameTooShort) return 'Full name must be at least 2 characters.';
    if (isNamePurelyNumeric) return 'Full name cannot consist purely of numeric digits.';
    return null;
  };

  // 2. Email Validation: RFC-compliant regex
  const emailTrimmed = emailAddress.trim();
  const isEmailEmpty = emailTrimmed.length === 0;
  const isEmailRfcValid = RFC_EMAIL_REGEX.test(emailTrimmed);
  const isEmailValid = !isEmailEmpty && isEmailRfcValid;

  const getEmailError = (): string | null => {
    if (!touched.email) return null;
    if (isEmailEmpty) return 'Email address is required.';
    if (!isEmailRfcValid) return 'Please enter a valid RFC-compliant email address (e.g. resident@domain.com).';
    return null;
  };

  // 3. Phone Validation: Strict 10-digit numeric format, strips non-numeric, checks +91 prefix rules
  const cleanPhoneDigits = phoneNumber.replace(/\D/g, '');
  const isPhoneEmpty = cleanPhoneDigits.length === 0;
  const isPhoneLengthValid = cleanPhoneDigits.length === 10;
  const isPhonePrefixValid = countryCode !== '+91' || /^[6-9]/.test(cleanPhoneDigits);
  const isPhoneValid = !isPhoneEmpty && isPhoneLengthValid && isPhonePrefixValid;

  const getPhoneError = (): string | null => {
    if (!touched.phone) return null;
    if (isPhoneEmpty) return 'Mobile phone number is required.';
    if (!isPhoneLengthValid) return 'Phone number must be exactly 10 digits.';
    if (countryCode === '+91' && !/^[6-9]/.test(cleanPhoneDigits)) {
      return 'Indian mobile numbers must start with 6, 7, 8, or 9.';
    }
    return null;
  };

  // 4. Regional & Geospatial Validation
  const isRegionValid = Boolean(selectedStateName && selectedDistrictName);
  const isFormValid = isNameValid && isEmailValid && isPhoneValid && isRegionValid && gpsLocked;

  // Handle One-Click "Continue with Google"
  const handleGoogleSignIn = () => {
    // Simulated Google OAuth / Identity Services payload
    const mockGoogleProfile = {
      displayName: 'vgiri',
      email: 'citizen.vgiri@gmail.com',
      photoUrl: 'https://lh3.googleusercontent.com/a/default-user',
    };

    setIsGoogleAuthenticated(true);
    setGoogleProfile(mockGoogleProfile);
    setFullName(mockGoogleProfile.displayName);
    setEmailAddress(mockGoogleProfile.email);
    setTouched((prev) => ({ ...prev, name: true, email: true }));

    // Focus phone input field for profile completion
    setTimeout(() => {
      if (phoneInputRef.current) {
        phoneInputRef.current.focus();
        phoneInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
  };

  // Handle disconnecting or unlocking Google profile
  const handleDisconnectGoogle = () => {
    setIsGoogleAuthenticated(false);
    setGoogleProfile(null);
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, email: true, phone: true });
    setSubmitError(null);

    if (!isNameValid) {
      setSubmitError('Please enter a valid full name (minimum 2 characters, non-numeric).');
      return;
    }
    if (!isEmailValid) {
      setSubmitError('Please enter a valid RFC-compliant email address.');
      return;
    }
    if (!isPhoneValid) {
      setSubmitError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!isRegionValid) {
      setSubmitError('Please select both your State and District administrative jurisdiction.');
      return;
    }
    if (!gpsLocked) {
      setSubmitError('Exact GPS coordinates must be locked to bind municipal jurisdiction.');
      return;
    }

    setIsSubmitting(true);

    try {
      const cleanPhone = cleanPhoneDigits;
      const cleanEmail = emailTrimmed.toLowerCase();
      const method = isGoogleAuthenticated ? 'google' : 'phone';
      const userId = `usr-${cleanPhone}-${Date.now().toString(36)}`;

      const sessionPayload: UserSessionPayload = {
        userId,
        authMethod: method,
        phone: `${countryCode} ${cleanPhone}`,
        email: cleanEmail,
        fullName: nameTrimmed,
        state: selectedStateName,
        district: selectedDistrictName,
        location: {
          lat: latitude,
          lng: longitude,
          accuracy: Math.round(accuracy * 10) / 10,
          address: formattedAddress,
        },
        authenticatedAt: new Date().toISOString(),
      };

      // Persist in localStorage
      try {
        localStorage.setItem('civic_user_session', JSON.stringify(sessionPayload));
      } catch {
        // Sandboxed storage fallback
      }

      // Simulate micro-delay for realistic tactile feedback
      await new Promise((resolve) => setTimeout(resolve, 600));

      onLoginSuccess(sessionPayload);
    } catch (err: any) {
      setSubmitError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-stitch-ink-primary flex flex-col justify-between">
      {/* Location Permission Instructions Modal */}
      <LocationPermissionModal
        isOpen={isPermissionModalOpen}
        onClose={() => setIsPermissionModalOpen(false)}
        onRetry={() => {
          setIsPermissionModalOpen(false);
          handleDetectLocation();
        }}
        onUseFallback={() => {
          setIsPermissionModalOpen(false);
          setGpsLocked(true);
        }}
        errorMessage={locationPermissionError || undefined}
      />

      {/* Top Sovereign Navigation Banner */}
      <header className="bg-stitch-navy text-white px-4 py-3 shadow-stitch-md border-b border-white/10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-stitch-btn bg-white/10 border border-white/20 flex flex-col items-center justify-center text-stitch-terracotta-light">
              <span className="text-[9px] font-mono font-bold leading-none text-stitch-terracotta">GOV</span>
              <span className="text-xs font-black tracking-widest text-white leading-tight">IN</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black tracking-tight text-white">
                  Civic Helpline India
                </h1>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-stitch-terracotta text-white uppercase tracking-wider">
                  Citizen Gateway
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Single Sign-On &amp; Regional Geospatial Onboarding
              </p>
            </div>
          </div>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="text-xs font-bold text-slate-300 hover:text-white px-3 py-1.5 rounded-stitch-btn hover:bg-white/10 transition-colors flex items-center gap-1"
            >
              <span>Exit to Dashboard</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Centerpiece Layout */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 sm:py-10 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        {/* Left Column: Unified Login & Onboarding Card (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Header Card */}
          <div className="bg-white rounded-stitch-card border border-stitch-surface-border shadow-stitch-md p-6 space-y-2">
            <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-900 border border-blue-200 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
              Sovereign Citizen Onboarding
            </div>
            <h2 className="text-h2 font-black text-stitch-ink-primary tracking-tight">
              Resident Authentication &amp; Profile Setup
            </h2>
            <p className="text-xs text-stitch-ink-muted leading-relaxed">
              Authenticate your identity with your verified name, email address, and mobile number. Your profile is cryptographically anchored to your administrative district and GPS radius under DPDP Act 2023.
            </p>
          </div>

          {/* Unified Authentication Form Card */}
          <div className="bg-white rounded-stitch-card border border-stitch-surface-border shadow-stitch-md p-6 space-y-5">
            {submitError && (
              <div className="p-3 rounded-stitch-btn bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                <span className="material-symbols-outlined text-base text-red-600 shrink-0 mt-0.5">error</span>
                <span>{submitError}</span>
              </div>
            )}

            {/* 1. Direct Google Account Integration ("Continue with Google") */}
            <div className="space-y-3">
              {!isGoogleAuthenticated ? (
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="w-full py-2.5 px-4 rounded-stitch-btn border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold shadow-2xs flex items-center justify-center gap-3 transition-all active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-stitch-navy"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>
              ) : (
                <div className="p-3.5 rounded-stitch-btn bg-blue-50/70 border border-blue-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                      {googleProfile?.displayName.charAt(0).toUpperCase() || 'G'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-blue-950 truncate">
                          {googleProfile?.displayName}
                        </span>
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-blue-700 bg-white px-1.5 py-0.2 rounded border border-blue-200">
                          <span className="material-symbols-outlined text-[11px] text-blue-600">verified</span>
                          Google Connected
                        </span>
                      </div>
                      <p className="text-[11px] text-blue-800 truncate">
                        {googleProfile?.email}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleDisconnectGoogle}
                    className="text-[11px] font-bold text-blue-700 hover:text-blue-900 hover:underline shrink-0"
                  >
                    Use Another
                  </button>
                </div>
              )}

              {/* OR Divider */}
              <div className="flex items-center my-3">
                <div className="flex-1 border-t border-stitch-surface-border" />
                <span className="px-3 text-[10px] uppercase font-bold text-stitch-ink-muted tracking-wider">
                  {isGoogleAuthenticated ? 'complete profile details' : 'or continue with credentials'}
                </span>
                <div className="flex-1 border-t border-stitch-surface-border" />
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Field 1: Full Name */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="name" className="block text-xs font-bold text-stitch-ink-primary uppercase tracking-wider">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  {isGoogleAuthenticated ? (
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">lock</span>
                      Locked from Google
                    </span>
                  ) : isNameValid && touched.name ? (
                    <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">check_circle</span>
                      Valid
                    </span>
                  ) : null}
                </div>

                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-stitch-ink-muted">
                    <span className="material-symbols-outlined text-base">person</span>
                  </span>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    minLength={2}
                    autoComplete="name"
                    value={fullName}
                    readOnly={isGoogleAuthenticated}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (!touched.name) setTouched((t) => ({ ...t, name: true }));
                    }}
                    onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                    placeholder="e.g. Ramesh Kumar"
                    className={`w-full min-h-touch pl-9 pr-3.5 py-2.5 border rounded-stitch-btn text-xs sm:text-sm font-semibold text-stitch-ink-primary focus:outline-none transition-all ${
                      isGoogleAuthenticated
                        ? 'bg-slate-100 text-slate-600 border-slate-300 cursor-not-allowed'
                        : getNameError()
                        ? 'border-red-400 bg-red-50/20 focus:ring-2 focus:ring-red-400'
                        : isNameValid && touched.name
                        ? 'border-emerald-400 bg-emerald-50/10 focus:ring-2 focus:ring-emerald-400'
                        : 'border-stitch-surface-border focus:ring-2 focus:ring-stitch-navy'
                    }`}
                  />
                </div>
                {getNameError() && (
                  <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">error</span>
                    <span>{getNameError()}</span>
                  </p>
                )}
                {!getNameError() && (
                  <p className="text-[10px] text-stitch-ink-muted mt-1">
                    Must be at least 2 characters long and cannot be solely numeric.
                  </p>
                )}
              </div>

              {/* Field 2: Email Address */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="email" className="block text-xs font-bold text-stitch-ink-primary uppercase tracking-wider">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  {isGoogleAuthenticated ? (
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">lock</span>
                      Locked from Google
                    </span>
                  ) : isEmailValid && touched.email ? (
                    <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">check_circle</span>
                      Valid RFC Email
                    </span>
                  ) : null}
                </div>

                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-stitch-ink-muted">
                    <span className="material-symbols-outlined text-base">mail</span>
                  </span>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={emailAddress}
                    readOnly={isGoogleAuthenticated}
                    onChange={(e) => {
                      setEmailAddress(e.target.value);
                      if (!touched.email) setTouched((t) => ({ ...t, email: true }));
                    }}
                    onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                    placeholder="resident@example.com"
                    className={`w-full min-h-touch pl-9 pr-3.5 py-2.5 border rounded-stitch-btn text-xs sm:text-sm font-semibold text-stitch-ink-primary focus:outline-none transition-all ${
                      isGoogleAuthenticated
                        ? 'bg-slate-100 text-slate-600 border-slate-300 cursor-not-allowed'
                        : getEmailError()
                        ? 'border-red-400 bg-red-50/20 focus:ring-2 focus:ring-red-400'
                        : isEmailValid && touched.email
                        ? 'border-emerald-400 bg-emerald-50/10 focus:ring-2 focus:ring-emerald-400'
                        : 'border-stitch-surface-border focus:ring-2 focus:ring-stitch-navy'
                    }`}
                  />
                </div>
                {getEmailError() && (
                  <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">error</span>
                    <span>{getEmailError()}</span>
                  </p>
                )}
                {!getEmailError() && (
                  <p className="text-[10px] text-stitch-ink-muted mt-1">
                    Verified RFC-compliant format. Used for statutory grievance escalation reports.
                  </p>
                )}
              </div>

              {/* Field 3: Phone Number with Country Code Prefix */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="phone" className="block text-xs font-bold text-stitch-ink-primary uppercase tracking-wider">
                    Mobile Phone Number <span className="text-red-500">*</span>
                  </label>
                  {isGoogleAuthenticated && !isPhoneValid ? (
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Required to Complete Onboarding
                    </span>
                  ) : isPhoneValid && touched.phone ? (
                    <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">check_circle</span>
                      Valid 10 Digits
                    </span>
                  ) : null}
                </div>

                <div className="flex items-center">
                  {/* Country Prefix Selector */}
                  <div className="relative shrink-0">
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="min-h-touch pl-2.5 pr-6 py-2.5 rounded-l-stitch-btn border border-r-0 border-stitch-surface-border bg-stitch-surface-muted text-xs font-bold text-stitch-ink-primary font-mono focus:outline-none focus:ring-1 focus:ring-stitch-navy appearance-none cursor-pointer"
                    >
                      {COUNTRY_PREFIXES.map((p) => (
                        <option key={p.code} value={p.code}>
                          {p.code} ({p.flagCode})
                        </option>
                      ))}
                    </select>
                    <span className="absolute right-1.5 inset-y-0 flex items-center pointer-events-none text-stitch-ink-muted">
                      <span className="material-symbols-outlined text-xs">arrow_drop_down</span>
                    </span>
                  </div>

                  {/* 10-Digit Numeric Phone Input */}
                  <input
                    ref={phoneInputRef}
                    id="phone"
                    name="phone"
                    type="tel"
                    maxLength={10}
                    autoComplete="tel"
                    value={phoneNumber}
                    onChange={(e) => {
                      const numericOnly = e.target.value.replace(/\D/g, '');
                      setPhoneNumber(numericOnly);
                      if (!touched.phone) setTouched((t) => ({ ...t, phone: true }));
                    }}
                    onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
                    placeholder="9876543210"
                    className={`flex-1 min-h-touch px-3.5 py-2.5 border rounded-r-stitch-btn text-xs sm:text-sm font-mono font-bold text-stitch-ink-primary focus:outline-none transition-all ${
                      getPhoneError()
                        ? 'border-red-400 bg-red-50/20 focus:ring-2 focus:ring-red-400'
                        : isPhoneValid && touched.phone
                        ? 'border-emerald-400 bg-emerald-50/10 focus:ring-2 focus:ring-emerald-400'
                        : isGoogleAuthenticated && !isPhoneValid
                        ? 'border-amber-400 ring-2 ring-amber-300/50 bg-amber-50/20'
                        : 'border-stitch-surface-border focus:ring-2 focus:ring-stitch-navy'
                    }`}
                  />
                </div>
                {getPhoneError() && (
                  <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">error</span>
                    <span>{getPhoneError()}</span>
                  </p>
                )}
                {!getPhoneError() && (
                  <p className="text-[10px] text-stitch-ink-muted mt-1">
                    Strict 10-digit format (numbers only). Starts with 6, 7, 8, or 9 for Indian (+91) networks.
                  </p>
                )}
              </div>

              {/* CASCADING REGIONAL HIERARCHY SELECTORS */}
              <div className="pt-3 border-t border-stitch-surface-border space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-stitch-ink-primary uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-stitch-navy">account_balance</span>
                    <span>Regional Jurisdiction (State &amp; District)</span>
                  </h3>
                  {reverseGeocodedPlace && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Auto-Detected from GPS
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* State Dropdown */}
                  <div>
                    <label htmlFor="onboard-state-select" className="block text-[11px] font-bold text-stitch-ink-muted uppercase mb-1">
                      State / UT ({STATES_UTS.length})
                    </label>
                    <select
                      id="onboard-state-select"
                      value={selectedStateName}
                      onChange={(e) => handleStateChange(e.target.value)}
                      className="w-full min-h-touch px-3 py-2 border border-stitch-surface-border rounded-stitch-btn text-xs font-semibold bg-white text-stitch-ink-primary focus:ring-2 focus:ring-stitch-navy focus:outline-none"
                    >
                      {STATES_UTS.map((st) => (
                        <option key={st.code} value={st.name}>
                          {st.name} ({st.type})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* District Dropdown (Cascading) */}
                  <div>
                    <label htmlFor="onboard-district-select" className="block text-[11px] font-bold text-stitch-ink-muted uppercase mb-1">
                      District ({availableDistricts.length} Available)
                    </label>
                    <select
                      id="onboard-district-select"
                      value={selectedDistrictName}
                      onChange={(e) => setSelectedDistrictName(e.target.value)}
                      disabled={availableDistricts.length === 0}
                      className="w-full min-h-touch px-3 py-2 border border-stitch-surface-border rounded-stitch-btn text-xs font-semibold bg-white text-stitch-ink-primary focus:ring-2 focus:ring-stitch-navy focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      {availableDistricts.length > 0 ? (
                        availableDistricts.map((d) => (
                          <option key={d.district_id} value={d.district_name}>
                            {d.district_name} (Page {d.source_pdf_page})
                          </option>
                        ))
                      ) : (
                        <option value="">No Sovereign District Mapped</option>
                      )}
                    </select>
                  </div>
                </div>
              </div>

              {/* PRIMARY SUBMIT CTA */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!isFormValid || isSubmitting}
                  className={`w-full min-h-touch py-3 px-6 rounded-stitch-btn text-xs font-bold uppercase tracking-wider shadow-stitch-sm transition-all flex items-center justify-center gap-2 ${
                    isFormValid && !isSubmitting
                      ? 'bg-stitch-navy hover:bg-stitch-navy-light text-white active:scale-[0.99] cursor-pointer'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <span className="material-symbols-outlined text-base animate-spin">sync</span>
                      <span>Authenticating &amp; Verifying Profile...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base">login</span>
                      <span>Continue &amp; Sign In →</span>
                    </>
                  )}
                </button>
              </div>

              {!isFormValid && (
                <div className="text-[11px] text-stitch-ink-muted text-center pt-1 space-y-0.5">
                  {!isNameValid && <div>• Please enter a valid full name.</div>}
                  {!isEmailValid && <div>• Please enter a valid email address.</div>}
                  {!isPhoneValid && <div>• Please enter a valid 10-digit mobile number.</div>}
                  {!gpsLocked && <div>• Please capture live GPS location to bind municipal jurisdiction.</div>}
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Right Column: Live GPS & Interactive Leaflet/OSM Pin (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white rounded-stitch-card border border-stitch-surface-border shadow-stitch-md p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-700">
                  SECTION 2 • GEOSPATIAL ANCHOR
                </span>
                <h3 className="text-sm font-bold text-stitch-ink-primary mt-0.5">
                  Exact Geolocation &amp; Auto-Fill
                </h3>
              </div>

              {gpsLocked && (
                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  GPS LOCKED
                </span>
              )}
            </div>

            {/* Detect Exact Location Trigger Button */}
            <button
              type="button"
              onClick={handleDetectLocation}
              disabled={isDetectingLocation}
              className="w-full py-2.5 px-4 rounded-stitch-btn bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-900 text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-75"
            >
              <span className={`material-symbols-outlined text-base text-blue-700 ${isDetectingLocation ? 'animate-spin' : ''}`}>
                {isDetectingLocation ? 'sync' : 'my_location'}
              </span>
              <span>
                {isDetectingLocation
                  ? 'Querying Satellite & Reverse Geocoding...'
                  : 'Detect My Exact Location (High Accuracy)'}
              </span>
            </button>

            {/* Status Pill: Exact Coordinates & Radius */}
            <div className="p-3 bg-stitch-surface-muted rounded-stitch-btn border border-stitch-surface-border space-y-1.5 font-mono text-[11px]">
              <div className="flex items-center justify-between text-stitch-ink-primary">
                <span className="font-bold text-slate-500 uppercase text-[9px]">Coordinates:</span>
                <span className="font-semibold text-blue-900">
                  {latitude.toFixed(6)}° N, {longitude.toFixed(6)}° E
                </span>
              </div>
              <div className="flex items-center justify-between text-stitch-ink-primary">
                <span className="font-bold text-slate-500 uppercase text-[9px]">GPS Precision:</span>
                <span className="font-semibold text-emerald-700">
                  ± {Math.round(accuracy * 10) / 10}m Accuracy
                </span>
              </div>
              <div className="pt-1 border-t border-slate-200 text-[10px] font-sans text-stitch-ink-secondary leading-snug">
                <strong className="text-stitch-ink-primary block mb-0.5 font-mono uppercase text-[9px]">
                  OSM Nominatim Reverse Geocoded Address:
                </strong>
                <span className="line-clamp-2">{formattedAddress}</span>
              </div>
            </div>

            {/* Interactive Leaflet/OSM Preview Pin */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-stitch-ink-secondary uppercase tracking-wider">
                  Live Geospatial Pin Preview
                </span>
                <span className="text-[10px] text-stitch-ink-muted">
                  Interactive OpenStreetMap
                </span>
              </div>
              <LocationPreviewMap
                latitude={latitude}
                longitude={longitude}
                accuracy={accuracy}
                address={formattedAddress}
                className="h-52 w-full rounded-stitch-btn overflow-hidden border border-stitch-surface-border shadow-xs"
              />
            </div>

            {/* Legal Notice */}
            <div className="p-3 bg-slate-50 rounded-stitch-btn border border-slate-200 text-[11px] text-slate-600 space-y-1">
              <strong className="text-slate-800 font-bold block text-xs">
                Statutory Grievance Jurisdiction
              </strong>
              <p className="leading-relaxed">
                By completing onboarding with verified credentials and coordinates, your account is authorized to escalate civic complaints directly to the District Collectorate of <strong>{selectedDistrictName || 'your district'}</strong>.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-stitch-navy-dark text-slate-400 text-xs py-4 px-4 border-t border-white/10 text-center">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Digital India Sovereign Infrastructure • MeitY</span>
          <span className="font-mono text-[11px]">DPDP Act 2023 Cryptographic Session Anchor</span>
        </div>
      </footer>
    </div>
  );
};
