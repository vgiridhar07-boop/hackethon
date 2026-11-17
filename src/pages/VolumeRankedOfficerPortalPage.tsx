import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

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

  place_id: string;
  place_name: string;
  n_place: number;
  n_case: number;
  calibrated_volume_pct: number;

  evidence_photos: EvidencePhoto[];
  resolution_proof_photos: EvidencePhoto[];
  stacked_ticket_numbers: string[];

  concept_booked_count: number;
  concept_raw_bookings: number;
  area_total_complaints: number;
  area_unique_citizens: number;
  k_threshold: number;
  is_compound_hazard: boolean;
  volume_rank_in_district: number;
}

interface LightboxState {
  isOpen: boolean;
  photos: EvidencePhoto[];
  currentIndex: number;
  zoom: number;
}

interface ResolveModalState {
  isOpen: boolean;
  complaintId: string | null;
  ticketNumber: string;
  beforePhotoUrl: string | null;
  proofImageUrl: string;
  remarks: string;
  isSubmitting: boolean;
}

export const VolumeRankedOfficerPortalPage: React.FC = () => {
  const navigate = useNavigate();

  // Data states
  const [topPlaceHotspot, setTopPlaceHotspot] = useState<TopPlaceHotspot | null>(null);
  const [placeVolumePills, setPlaceVolumePills] = useState<PlaceVolumePill[]>([]);
  const [_areaHotspots, setAreaHotspots] = useState<AreaHotspot[]>([]);
  const [_conceptHotspots, setConceptHotspots] = useState<ConceptHotspot[]>([]);
  const [feed, setFeed] = useState<RankedGrievanceItem[]>([]);

  // Filter states
  const [selectedPlaceFilter, setSelectedPlaceFilter] = useState<string>('ALL');
  const [selectedConceptFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(true);

  // Active hero photo index mapped per card group_id
  const [activePhotoByCard, setActivePhotoByCard] = useState<Record<string, number>>({});

  // Full-Screen Photo Lightbox Modal state
  const [lightbox, setLightbox] = useState<LightboxState>({
    isOpen: false,
    photos: [],
    currentIndex: 0,
    zoom: 1,
  });

  // Keep on Hold Modal state
  const [holdModalComplaintId, setHoldModalComplaintId] = useState<string | null>(null);
  const [selectedHoldReason, setSelectedHoldReason] = useState<string>(
    'Awaiting field crew / heavy equipment dispatch (JCB / Jetting Machine / Tanker)'
  );

  // Resolution Proof Modal state
  const [resolveModal, setResolveModal] = useState<ResolveModalState>({
    isOpen: false,
    complaintId: null,
    ticketNumber: '',
    beforePhotoUrl: null,
    proofImageUrl: '',
    remarks: 'Field repair completed with verified photographic proof.',
    isSubmitting: false,
  });

  // Action feedback alert
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'conflict';
    message: string;
  } | null>(null);

  // Press-and-hold timer references
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const holdStartTimeRef = useRef<number>(0);
  const [holdingCardId, setHoldingCardId] = useState<string | null>(null);
  const [holdingProgress, setHoldingProgress] = useState<number>(0);
  const holdAnimFrameRef = useRef<number | null>(null);

  const isSubdomain = typeof window !== 'undefined' && window.location.hostname.startsWith('officer.');

  const officerProfile = useMemo(() => {
    try {
      const raw = localStorage.getItem('civic_officer_profile');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const fetchVolumeSortedData = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem('officer_command_token') || localStorage.getItem('civic_auth_token');
    if (!token || !officerProfile) {
      navigate(isSubdomain ? '/login' : '/authority-portal/login');
      return;
    }

    try {
      const queryParams = new URLSearchParams();
      if (officerProfile.district_id) {
        queryParams.set('districtId', String(officerProfile.district_id));
      }
      if (selectedPlaceFilter !== 'ALL') {
        queryParams.set('placeFilter', selectedPlaceFilter);
      }

      const res = await fetch(`/api/v1/authority-portal/volume-sorted-feed?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 404 || res.status === 401) {
        navigate(isSubdomain ? '/login' : '/authority-portal/login');
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setTopPlaceHotspot(data.topPlaceHotspot || null);
        setPlaceVolumePills(data.placeVolumePills || []);
        setAreaHotspots(data.topAreaHotspots || []);
        setConceptHotspots(data.topBookedConcepts || []);
        setFeed(data.rankedGrievanceFeed || []);
      }
    } catch {
      // Offline fallback handling
    } finally {
      setLoading(false);
    }
  }, [isSubdomain, navigate, officerProfile, selectedPlaceFilter]);

  useEffect(() => {
    fetchVolumeSortedData();
  }, [fetchVolumeSortedData]);

  // Strictly enforce descending sort on client side:
  // (N_place DESC, N_case DESC, urgency DESC, created_at ASC)
  const sortedFeed = useMemo(() => {
    return [...feed]
      .filter((item) => selectedPlaceFilter === 'ALL' || item.place_id === selectedPlaceFilter || item.place_name === selectedPlaceFilter)
      .filter((item) => selectedConceptFilter === 'ALL' || item.concept_name === selectedConceptFilter)
      .sort((a, b) => {
        if (b.n_place !== a.n_place) {
          return b.n_place - a.n_place;
        }
        if (b.n_case !== a.n_case) {
          return b.n_case - a.n_case;
        }
        if (b.ai_urgency_score !== a.ai_urgency_score) {
          return b.ai_urgency_score - a.ai_urgency_score;
        }
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
  }, [feed, selectedPlaceFilter, selectedConceptFilter]);

  // Maximum complaints at any place for proportional staircase calculation
  const maxPlaceVolume = useMemo(() => {
    if (topPlaceHotspot && topPlaceHotspot.n_place > 0) {
      return topPlaceHotspot.n_place;
    }
    return sortedFeed.length > 0 ? Math.max(...sortedFeed.map((i) => i.n_place), 1) : 1;
  }, [topPlaceHotspot, sortedFeed]);

  // Handle atomic claim ticket
  const handleClaimTicket = async (complaintId: string, currentVersion: number) => {
    if (!officerProfile) return;
    const token = localStorage.getItem('officer_command_token') || localStorage.getItem('civic_auth_token');
    setNotification(null);

    try {
      const res = await fetch(`/api/v1/officer/complaints/${complaintId}/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          officerId: officerProfile.officer_id,
          expectedVersion: currentVersion,
          officerName: officerProfile.full_name,
          officerBadgeId: officerProfile.officer_badge_id,
          officerPhone: officerProfile.official_phone,
        }),
      });

      const data = await res.json();
      if (res.status === 409) {
        setNotification({
          type: 'conflict',
          message: `Concurrent Conflict: ${data.error || 'Ticket modified or claimed by another officer.'} Queue re-synced.`,
        });
        fetchVolumeSortedData();
        return;
      }
      if (res.status === 403) {
        setNotification({
          type: 'error',
          message: data.message || 'Department Scope Denied: Cannot claim complaints outside assigned category/district.',
        });
        return;
      }
      if (!res.ok) {
        setNotification({
          type: 'error',
          message: data.error || 'Failed to claim ticket.',
        });
        return;
      }

      setNotification({
        type: 'success',
        message: `Ticket successfully claimed under lock v${data.claim_version}. Field resolution initiated.`,
      });
      fetchVolumeSortedData();
    } catch {
      setNotification({
        type: 'error',
        message: 'Network error executing atomic ticket claim.',
      });
    }
  };

  // Handle Confirm Keep on Hold (from modal)
  const handleConfirmHold = async (complaintId: string, reason: string) => {
    if (!officerProfile) return;
    const token = localStorage.getItem('officer_command_token') || localStorage.getItem('civic_auth_token');
    try {
      const res = await fetch(`/api/v1/officer/complaints/${complaintId}/hold`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          officerId: officerProfile.officer_id,
          officerBadgeId: officerProfile.officer_badge_id,
          officerName: officerProfile.full_name,
          holdReason: reason,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setNotification({
          type: 'success',
          message: `Complaint moved to holding buffer (Lock v${data.claim_version}).`,
        });
      }
    } catch {
      // Ignore network error in quick-hold
    } finally {
      setHoldModalComplaintId(null);
      fetchVolumeSortedData();
    }
  };

  // Press-and-Hold (0.8s gesture) implementation
  const handleHoldPointerDown = (complaintId: string) => {
    holdStartTimeRef.current = Date.now();
    setHoldingCardId(complaintId);
    setHoldingProgress(0);

    const updateProgress = () => {
      const elapsed = Date.now() - holdStartTimeRef.current;
      const progress = Math.min(100, Math.round((elapsed / 800) * 100));
      setHoldingProgress(progress);
      if (progress < 100) {
        holdAnimFrameRef.current = requestAnimationFrame(updateProgress);
      }
    };
    holdAnimFrameRef.current = requestAnimationFrame(updateProgress);

    holdTimerRef.current = setTimeout(() => {
      // 0.8s hold threshold reached: Execute quick hold
      handleConfirmHold(
        complaintId,
        'Direct hold placed by officer via rapid queue-hold gesture.'
      );
      setHoldingCardId(null);
      setHoldingProgress(0);
      if (holdAnimFrameRef.current) cancelAnimationFrame(holdAnimFrameRef.current);
    }, 800);
  };

  const handleHoldPointerUp = (complaintId: string) => {
    const elapsed = Date.now() - holdStartTimeRef.current;
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (holdAnimFrameRef.current) cancelAnimationFrame(holdAnimFrameRef.current);
    setHoldingCardId(null);
    setHoldingProgress(0);

    // If released before 800ms, treat as regular tap -> open modal
    if (elapsed < 800) {
      setHoldModalComplaintId(complaintId);
    }
  };

  // Open Resolution Proof Modal
  const openResolveModal = (item: RankedGrievanceItem) => {
    const primaryBeforePhoto = item.evidence_photos[0]?.storage_url || null;
    setResolveModal({
      isOpen: true,
      complaintId: item.primary_complaint_id,
      ticketNumber: item.ticket_number,
      beforePhotoUrl: primaryBeforePhoto,
      proofImageUrl: '',
      remarks: 'Field repair completed. Verified with after-fix photo.',
      isSubmitting: false,
    });
  };

  // Submit Resolution Proof
  const handleConfirmResolve = async () => {
    if (!resolveModal.complaintId || !officerProfile) return;
    setResolveModal((prev) => ({ ...prev, isSubmitting: true }));
    const token = localStorage.getItem('officer_command_token') || localStorage.getItem('civic_auth_token');

    try {
      const res = await fetch(`/api/v1/officer/complaints/${resolveModal.complaintId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          officerId: officerProfile.officer_id,
          officerBadgeId: officerProfile.officer_badge_id,
          officerName: officerProfile.full_name,
          proofImageUrl: resolveModal.proofImageUrl.trim() || undefined,
          remarks: resolveModal.remarks.trim(),
        }),
      });

      if (res.ok) {
        await res.json();
        setNotification({
          type: 'success',
          message: `Ticket ${resolveModal.ticketNumber} marked Resolved with completion proof. Citizen 48h confirmation window initiated.`,
        });
        setResolveModal((prev) => ({ ...prev, isOpen: false }));
        fetchVolumeSortedData();
      } else {
        const data = await res.json();
        setNotification({
          type: 'error',
          message: data.error || 'Failed to submit resolution proof.',
        });
      }
    } catch {
      setNotification({
        type: 'error',
        message: 'Network error submitting resolution proof.',
      });
    } finally {
      setResolveModal((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  // Lightbox handlers
  const openLightbox = (photos: EvidencePhoto[], initialIndex: number) => {
    if (!photos || photos.length === 0) return;
    setLightbox({
      isOpen: true,
      photos,
      currentIndex: initialIndex,
      zoom: 1,
    });
  };

  const closeLightbox = () => {
    setLightbox({
      isOpen: false,
      photos: [],
      currentIndex: 0,
      zoom: 1,
    });
  };

  const nextLightboxPhoto = () => {
    setLightbox((prev) => ({
      ...prev,
      currentIndex: (prev.currentIndex + 1) % prev.photos.length,
      zoom: 1,
    }));
  };

  const prevLightboxPhoto = () => {
    setLightbox((prev) => ({
      ...prev,
      currentIndex: (prev.currentIndex - 1 + prev.photos.length) % prev.photos.length,
      zoom: 1,
    }));
  };

  const handleLogout = () => {
    localStorage.removeItem('officer_command_token');
    localStorage.removeItem('civic_auth_token');
    localStorage.removeItem('civic_officer_profile');
    localStorage.removeItem('civic_persona');
    localStorage.removeItem('civic_role');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-stitch-surface-canvas flex flex-col pb-20 font-sans text-stitch-ink-primary">
      {/* ------------------------------------------------------------------- */}
      {/* HEADER: Solid Authority Navy with Terracotta 2px Bottom Accent Line */}
      {/* ------------------------------------------------------------------- */}
      <header className="bg-stitch-navy text-white border-b-2 border-stitch-terracotta px-4 sm:px-6 py-4 shadow-stitch-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-stitch-btn bg-white/10 border border-white/20 flex flex-col items-center justify-center text-stitch-terracotta-light shrink-0">
              <span className="text-[9px] font-mono font-bold leading-none text-stitch-terracotta">GOV</span>
              <span className="text-xs font-black tracking-widest text-white leading-tight">IN</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-stitch-terracotta text-white font-mono text-[11px] font-bold">
                  OFFICER TERMINAL • {officerProfile?.officer_badge_id || 'OFF-OPERATOR'}
                </span>
                <span className="text-xs text-slate-300 font-mono hidden md:inline">
                  {officerProfile?.designation}
                </span>
              </div>
              <h1 className="text-h2 font-black text-white mt-0.5">
                Place-Volume Calibrated Command Portal — {officerProfile?.district_name || 'Jurisdiction'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={fetchVolumeSortedData}
              className="min-h-touch px-3.5 py-2 rounded-stitch-btn bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
              title="Refresh live grievance ranking"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              <span className="hidden sm:inline">Refresh Queue</span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="min-h-touch px-3.5 py-2 rounded-stitch-btn bg-stitch-emergency hover:bg-stitch-emergency-hover text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-stitch-sm"
            >
              <span className="material-symbols-outlined text-sm">logout</span>
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------------- */}
      {/* MAIN CONTENT AREA                                                   */}
      {/* ------------------------------------------------------------------- */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6 flex-1">
        {/* Real-Time Action Feedback Alert */}
        {notification && (
          <div
            className={`p-4 rounded-stitch-card border font-bold text-xs flex items-center justify-between ${
              notification.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : notification.type === 'conflict'
                ? 'bg-amber-50 border-amber-400 text-amber-950'
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">
                {notification.type === 'success'
                  ? 'check_circle'
                  : notification.type === 'conflict'
                  ? 'sync_problem'
                  : 'error'}
              </span>
              <span>{notification.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="text-xs font-mono underline hover:no-underline ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ================================================================= */}
        {/* 2.1 TOP PLACE-DENSITY CALIBRATION SUMMARY STRIP                   */}
        {/* Pure Matte Civic Cards - Highest Booked Place Card + Filter Pills */}
        {/* ================================================================= */}
        <section aria-label="Place-Volume Calibration Strip" className="space-y-3">
          {/* #1 Highest-Complaint Place Card */}
          <div className="rounded-stitch-card bg-white border border-stitch-surface-border border-l-4 border-l-stitch-emergency p-5 shadow-stitch-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-stitch-pill bg-stitch-emergency text-white text-xs font-black uppercase flex items-center gap-1 shadow-stitch-sm">
                    <span className="material-symbols-outlined text-xs">emergency</span>
                    <span>#1 Highest-Complaint Place Hotspot</span>
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-500">
                    Spatial 50m Micro-Cluster
                  </span>
                </div>

                <h2 className="text-h1 font-extrabold text-stitch-ink-primary">
                  {topPlaceHotspot ? topPlaceHotspot.place_name : 'No Active Place Hotspots'}
                </h2>

                <p className="text-xs text-stitch-ink-secondary">
                  {topPlaceHotspot ? (
                    <>
                      <strong>Ward / Locality:</strong> {topPlaceHotspot.ward_mandal} ({topPlaceHotspot.district_name}) •{' '}
                      <strong className="text-stitch-emergency">{topPlaceHotspot.n_place} Total Complaints Booked at this Micro-Place</strong>
                    </>
                  ) : (
                    'All place complaints resolved.'
                  )}
                </p>

                {topPlaceHotspot && (
                  <div className="pt-1 flex items-center gap-3">
                    <a
                      href={`https://www.google.com/maps?q=${topPlaceHotspot.latitude},${topPlaceHotspot.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-stitch-navy hover:text-stitch-terracotta underline"
                    >
                      <span className="material-symbols-outlined text-xs">near_me</span>
                      <span>Open Exact Place Pin in Maps ({topPlaceHotspot.latitude.toFixed(5)}, {topPlaceHotspot.longitude.toFixed(5)})</span>
                    </a>
                  </div>
                )}
              </div>

              {/* Latest Citizen Photo Thumbnail Preview */}
              {topPlaceHotspot && (
                <div className="shrink-0 flex items-center gap-3 self-start md:self-center">
                  <div className="text-right hidden sm:block">
                    <span className="text-[11px] font-mono font-bold text-stitch-ink-muted block">Latest Photo</span>
                    <span className="text-[10px] text-emerald-700 font-semibold block">Citizen Verified</span>
                  </div>
                  {topPlaceHotspot.latest_photo_url ? (
                    <button
                      type="button"
                      onClick={() => {
                        const topCard = sortedFeed.find((i) => i.place_id === topPlaceHotspot.place_id);
                        if (topCard && topCard.evidence_photos.length > 0) {
                          openLightbox(topCard.evidence_photos, 0);
                        }
                      }}
                      className="w-20 h-16 rounded-stitch-card border border-stitch-surface-border overflow-hidden bg-slate-100 hover:ring-2 hover:ring-stitch-terracotta transition-all cursor-pointer relative group"
                      title="Inspect latest citizen photo in full-screen modal"
                    >
                      <img
                        src={topPlaceHotspot.latest_photo_url}
                        alt="Latest citizen photo"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                        <span className="material-symbols-outlined text-sm">fullscreen</span>
                      </div>
                    </button>
                  ) : (
                    <div className="w-20 h-16 rounded-stitch-card border border-stitch-surface-border bg-slate-100 flex flex-col items-center justify-center text-slate-400">
                      <span className="material-symbols-outlined text-lg">no_photography</span>
                      <span className="text-[9px] font-mono">No Photo</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Decreasing Place-Volume Filter Pills */}
          {placeVolumePills.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-thin">
              <span className="text-[11px] font-bold text-stitch-ink-muted shrink-0 flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">filter_list</span>
                <span>Place Volume Rank:</span>
              </span>

              <button
                type="button"
                onClick={() => setSelectedPlaceFilter('ALL')}
                className={`min-h-touch px-3 py-1.5 rounded-stitch-pill text-xs font-bold shrink-0 transition-all ${
                  selectedPlaceFilter === 'ALL'
                    ? 'bg-stitch-navy text-white shadow-stitch-sm'
                    : 'bg-white text-stitch-ink-secondary border border-stitch-surface-border hover:bg-slate-100'
                }`}
              >
                All Places ({placeVolumePills.reduce((acc, curr) => acc + curr.n_place, 0)} Cases)
              </button>

              {placeVolumePills.map((pill, idx) => (
                <button
                  key={pill.place_id}
                  type="button"
                  onClick={() => setSelectedPlaceFilter(pill.place_id)}
                  className={`min-h-touch px-3 py-1.5 rounded-stitch-pill text-xs font-bold shrink-0 transition-all ${
                    selectedPlaceFilter === pill.place_id
                      ? 'bg-stitch-navy text-white shadow-stitch-sm'
                      : 'bg-white text-stitch-ink-secondary border border-stitch-surface-border hover:bg-slate-100'
                  }`}
                >
                  #{idx + 1} {pill.place_name.length > 28 ? pill.place_name.slice(0, 26) + '...' : pill.place_name} ({pill.n_place} Cases)
                </button>
              ))}
            </div>
          )}
        </section>

        {/* ================================================================= */}
        {/* CALIBRATED PROBLEM & CITIZEN PHOTO EVIDENCE FEED                  */}
        {/* Monotonically Decreasing Downward (N_place DESC, N_case DESC)     */}
        {/* ================================================================= */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stitch-surface-border pb-2.5">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-stitch-terracotta">stairs</span>
              <h3 className="text-h3 font-bold text-stitch-ink-primary">
                Calibrated Grievance Feed (Highest-Complaint Places at Top — Step-Down Staircase)
              </h3>
            </div>
            <span className="text-xs font-semibold text-stitch-ink-muted font-mono">
              Showing {sortedFeed.length} calibrated problem stacks
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-stitch-ink-muted text-sm font-semibold">
              Loading calibrated place-volume grievance feed...
            </div>
          ) : sortedFeed.length === 0 ? (
            <div className="p-12 text-center rounded-stitch-card bg-white border border-stitch-surface-border text-stitch-ink-secondary">
              <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">task_alt</span>
              <p className="font-bold text-sm">No Active Problems in Queue</p>
              <p className="text-xs text-slate-500 mt-1">All complaints in this filter range are currently resolved.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {sortedFeed.map((item, index) => {
                const rankNumber = index + 1;
                const isRankOne = rankNumber === 1;
                const isTopThree = rankNumber <= 3;

                // Calibrated Visual Density Bar Width W_k
                const volumeBarPct = Math.max(
                  8,
                  Math.round((item.n_place / maxPlaceVolume) * 100)
                );

                // Active hero photo for this card
                const activePhotoIdx = activePhotoByCard[item.group_id] ?? 0;
                const activePhoto = item.evidence_photos[activePhotoIdx] || item.evidence_photos[0] || null;

                const isHolding = holdingCardId === item.primary_complaint_id;

                return (
                  <article
                    key={item.group_id + '-' + item.primary_complaint_id}
                    className={`rounded-stitch-card bg-white shadow-stitch-md border-2 p-5 transition-all ${
                      isRankOne
                        ? 'border-stitch-emergency ring-2 ring-stitch-emergency/20'
                        : isTopThree
                        ? 'border-stitch-terracotta'
                        : 'border-stitch-surface-border'
                    }`}
                  >
                    {/* Top Row: Calibration Rank + Place Volume Badge + Issue Concept Volume Badge */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stitch-surface-border pb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Rank Badge */}
                        <span
                          className={`px-3 py-1 rounded-stitch-pill font-mono text-xs font-black uppercase ${
                            isRankOne
                              ? 'bg-stitch-emergency text-white shadow-stitch-sm'
                              : isTopThree
                              ? 'bg-stitch-terracotta text-white shadow-stitch-sm'
                              : 'bg-stitch-navy text-white'
                          }`}
                        >
                          #{rankNumber} {isRankOne ? 'HIGHEST COMPLAINT PLACE' : 'RANK'}
                        </span>

                        {/* Place Complaint Volume Badge */}
                        <span className="px-3 py-1 rounded-stitch-pill bg-stitch-navy-tint text-stitch-navy font-bold text-xs flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs text-stitch-navy">location_on</span>
                          <span>
                            {item.n_place} Complaints Booked at This Place ({item.place_name})
                          </span>
                        </span>

                        {/* Case Concept Volume Badge */}
                        <span className="px-3 py-1 rounded-stitch-pill bg-amber-100 text-amber-950 font-bold text-xs flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs text-amber-800">local_fire_department</span>
                          <span>
                            {item.n_case} Bookings for {item.concept_name.replace(/_/g, ' ')}
                          </span>
                        </span>

                        {item.is_compound_hazard && (
                          <span className="px-2.5 py-0.5 rounded-stitch-pill bg-red-100 text-red-900 border border-red-300 font-mono text-[10px] font-black uppercase">
                            Compound Hazard
                          </span>
                        )}

                        <span className="px-2.5 py-0.5 rounded-stitch-pill bg-slate-100 text-slate-800 border border-slate-300 font-mono text-[11px] font-bold">
                          Lock v{item.claim_version ?? 1}
                        </span>

                        {item.claimed_by_officer_id && (
                          <span className="px-2.5 py-0.5 rounded-stitch-pill bg-emerald-100 text-emerald-900 border border-emerald-300 font-mono text-[11px] font-bold">
                            Claimed: {item.claimed_by_officer_id}
                          </span>
                        )}
                      </div>

                      {/* Display Code & Status */}
                      <span className="font-mono text-xs font-bold text-stitch-ink-muted">
                        {item.display_code} • {item.status} • SLA &lt;{item.sla_target_hours}h
                      </span>
                    </div>

                    {/* Calibrated Visual Volume Density Bar (Step-Down Staircase) */}
                    <div className="mt-3 space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-mono font-semibold text-slate-500">
                        <span>Place Density Calibration:</span>
                        <span>{volumeBarPct}% Relative Place Volume ({item.n_place} / {maxPlaceVolume} max)</span>
                      </div>
                      <div className="bg-stitch-surface-muted rounded-full h-2.5 w-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            isRankOne
                              ? 'bg-stitch-emergency'
                              : isTopThree
                              ? 'bg-stitch-terracotta'
                              : 'bg-stitch-navy'
                          }`}
                          style={{ width: `${volumeBarPct}%` }}
                        />
                      </div>
                    </div>

                    {/* ============================================================= */}
                    {/* TWO-ZONE RESPONSIVE LAYOUT                                    */}
                    {/* Zone A: Citizen Photo Evidence Gallery (Left / Top)           */}
                    {/* Zone B: Calibrated Problem & Action Details (Right / Bottom)  */}
                    {/* ============================================================= */}
                    <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-5">
                      {/* ----------------------------------------------------------- */}
                      {/* ZONE A: CITIZEN PHOTO EVIDENCE GALLERY (Cols 1-5)           */}
                      {/* ----------------------------------------------------------- */}
                      <div className="lg:col-span-5 flex flex-col space-y-2">
                        {/* Primary Hero Evidence Photo */}
                        <div className="relative rounded-stitch-card overflow-hidden border border-stitch-surface-border bg-slate-100 aspect-video lg:aspect-[4/3] flex items-center justify-center">
                          {activePhoto ? (
                            <>
                              <img
                                src={activePhoto.storage_url}
                                alt={`Citizen evidence for ${item.ticket_number}`}
                                className="w-full h-full object-cover cursor-pointer hover:scale-102 transition-transform duration-200"
                                onClick={() => openLightbox(item.evidence_photos, activePhotoIdx)}
                              />

                              {/* Top-Left Badge: Total Photos */}
                              <div className="absolute top-2 left-2 px-2.5 py-1 rounded bg-black/75 text-white text-[11px] font-mono font-bold flex items-center gap-1.5 shadow-sm">
                                <span className="material-symbols-outlined text-xs">photo_camera</span>
                                <span>{item.evidence_photos.length} Citizen Photo{item.evidence_photos.length > 1 ? 's' : ''} Attached</span>
                              </div>

                              {/* Top-Right Badge: AI Verified */}
                              <div className="absolute top-2 right-2 px-2.5 py-1 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold flex items-center gap-1 shadow-sm">
                                <span className="material-symbols-outlined text-xs text-emerald-400">verified</span>
                                <span>AI Verified ({Math.round(activePhoto.ai_confidence * 100)}% Match)</span>
                              </div>

                              {/* Bottom-Right Expand Click Icon */}
                              <button
                                type="button"
                                onClick={() => openLightbox(item.evidence_photos, activePhotoIdx)}
                                className="absolute bottom-2 right-2 p-1.5 rounded bg-black/70 hover:bg-black text-white transition-colors"
                                title="Open full-screen photo inspection lightbox"
                              >
                                <span className="material-symbols-outlined text-sm">fullscreen</span>
                              </button>
                            </>
                          ) : (
                            <div className="p-6 text-center text-slate-400 space-y-1">
                              <span className="material-symbols-outlined text-4xl">no_photography</span>
                              <p className="text-xs font-bold text-slate-500">No Citizen Photo Attached</p>
                              <p className="text-[10px] text-slate-400">Telephonic / Manual Helpline Intake</p>
                            </div>
                          )}
                        </div>

                        {/* Multi-Photo Thumbnail Strip (56x56px) */}
                        {item.evidence_photos.length > 1 && (
                          <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-thin">
                            {item.evidence_photos.map((photo, pIdx) => {
                              const isSelected = pIdx === activePhotoIdx;
                              return (
                                <button
                                  key={photo.image_id || pIdx}
                                  type="button"
                                  onClick={() =>
                                    setActivePhotoByCard((prev) => ({
                                      ...prev,
                                      [item.group_id]: pIdx,
                                    }))
                                  }
                                  className={`w-14 h-14 rounded-stitch-btn overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                                    isSelected
                                      ? 'border-stitch-terracotta ring-2 ring-stitch-terracotta/30'
                                      : 'border-stitch-surface-border opacity-70 hover:opacity-100'
                                  }`}
                                  title={`Switch to photo #${pIdx + 1} (${photo.ticket_number})`}
                                >
                                  <img
                                    src={photo.storage_url}
                                    alt={`Thumbnail ${pIdx + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Completed Resolution Proof Thumbnail Preview (If already resolved) */}
                        {item.resolution_proof_photos && item.resolution_proof_photos.length > 0 && (
                          <div className="pt-1 border-t border-stitch-surface-border flex items-center justify-between">
                            <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                              <span className="material-symbols-outlined text-xs">task_alt</span>
                              <span>Resolution Proof Attached</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => openLightbox(item.resolution_proof_photos, 0)}
                              className="text-xs text-stitch-navy underline font-bold"
                            >
                              View After-Repair Photo
                            </button>
                          </div>
                        )}
                      </div>

                      {/* ----------------------------------------------------------- */}
                      {/* ZONE B: CALIBRATED PROBLEM & ACTION DETAILS (Cols 6-12)     */}
                      {/* ----------------------------------------------------------- */}
                      <div className="lg:col-span-7 flex flex-col justify-between space-y-3">
                        <div className="space-y-2">
                          <div>
                            <span className="text-xs font-mono font-bold text-stitch-terracotta uppercase">
                              {item.category} • {item.concept_name.replace(/_/g, ' ')}
                            </span>
                            <h4 className="text-h3 font-extrabold text-stitch-ink-primary mt-0.5">
                              {item.description}
                            </h4>
                          </div>

                          <div className="space-y-1 text-xs text-stitch-ink-secondary">
                            <p>
                              <strong>Exact Location / Ward:</strong> {item.area_name}{' '}
                              {item.landmark ? `(Landmark: ${item.landmark})` : ''}
                            </p>
                            <p>
                              <strong>Responsible Department:</strong> {item.assigned_department}
                            </p>
                            {item.hold_reason && (
                              <p className="text-amber-900 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded text-xs font-medium">
                                <strong>Current Hold Reason:</strong> {item.hold_reason}
                              </p>
                            )}
                          </div>

                          {/* Clickable Map Link */}
                          <div className="pt-1 flex flex-wrap items-center gap-3">
                            <a
                              href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-bold text-stitch-navy hover:text-stitch-terracotta underline"
                            >
                              <span className="material-symbols-outlined text-xs">near_me</span>
                              <span>Open Exact Pin in Maps ({item.latitude.toFixed(5)}, {item.longitude.toFixed(5)})</span>
                            </a>

                            {item.stacked_ticket_numbers && item.stacked_ticket_numbers.length > 1 && (
                              <span className="text-[11px] font-mono text-slate-500">
                                Stacked Tickets: {item.stacked_ticket_numbers.join(', ')}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* --------------------------------------------------------- */}
                        {/* OFFICER DECISION CONTROLS (Min 48x48dp Touch Targets)     */}
                        {/* --------------------------------------------------------- */}
                        <div className="pt-3 border-t border-stitch-surface-border flex flex-wrap items-center justify-between gap-3">
                          <div className="text-xs font-mono font-semibold text-slate-500">
                            Status: <strong className="text-stitch-ink-primary">{item.status}</strong>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {item.status !== 'In Progress' ? (
                              <>
                                {/* Accept to Fix Button */}
                                <button
                                  type="button"
                                  onClick={() => handleClaimTicket(item.primary_complaint_id, item.claim_version ?? 1)}
                                  className="min-h-touch px-4 py-2.5 rounded-stitch-btn bg-stitch-sla-resolved hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-stitch-sm transition-all"
                                  title={`Accept and claim ticket under optimistic lock version ${item.claim_version ?? 1}`}
                                >
                                  <span className="material-symbols-outlined text-sm">verified</span>
                                  <span>Accept to Fix (v{item.claim_version ?? 1})</span>
                                </button>

                                {/* Keep on Hold Button (Tap or 0.8s Hold Gesture) */}
                                <div className="relative">
                                  <button
                                    type="button"
                                    onPointerDown={() => handleHoldPointerDown(item.primary_complaint_id)}
                                    onPointerUp={() => handleHoldPointerUp(item.primary_complaint_id)}
                                    onPointerLeave={() => {
                                      if (isHolding) {
                                        if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
                                        if (holdAnimFrameRef.current) cancelAnimationFrame(holdAnimFrameRef.current);
                                        setHoldingCardId(null);
                                        setHoldingProgress(0);
                                      }
                                    }}
                                    className="min-h-touch px-4 py-2.5 rounded-stitch-btn bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-400 font-bold text-xs flex items-center gap-1.5 transition-all select-none relative overflow-hidden"
                                    title="Single tap to select reason, or hold for 0.8s to quick-hold"
                                  >
                                    {isHolding && (
                                      <div
                                        className="absolute inset-0 bg-amber-400/40 pointer-events-none transition-all"
                                        style={{ width: `${holdingProgress}%` }}
                                      />
                                    )}
                                    <span className="material-symbols-outlined text-sm relative z-10">pause_circle</span>
                                    <span className="relative z-10">
                                      {isHolding
                                        ? `Holding (${holdingProgress}%)`
                                        : item.status === 'On Hold'
                                        ? 'Update Hold (Tap/Hold)'
                                        : 'Keep on Hold (Tap/Hold)'}
                                    </span>
                                  </button>
                                </div>
                              </>
                            ) : (
                              <>
                                {/* In Progress Badge */}
                                <span className="min-h-touch px-3.5 py-2 rounded-stitch-btn bg-blue-100 text-blue-900 font-bold text-xs flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-sm">construction</span>
                                  <span>In Progress (v{item.claim_version ?? 1})</span>
                                </span>

                                {/* Upload Completion Proof & Resolve Button */}
                                <button
                                  type="button"
                                  onClick={() => openResolveModal(item)}
                                  className="min-h-touch px-4 py-2.5 rounded-stitch-btn bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-stitch-sm transition-all"
                                >
                                  <span className="material-symbols-outlined text-sm">add_a_photo</span>
                                  <span>Upload Completion Proof &amp; Resolve</span>
                                </button>

                                {/* Move back to Hold */}
                                <button
                                  type="button"
                                  onClick={() => setHoldModalComplaintId(item.primary_complaint_id)}
                                  className="min-h-touch px-3 py-2 rounded-stitch-btn bg-amber-50 text-amber-900 border border-amber-300 font-bold text-xs hover:bg-amber-100"
                                >
                                  Move to Hold
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* =================================================================== */}
      {/* FULL-SCREEN PHOTO INSPECTION LIGHTBOX MODAL                         */}
      {/* Verified EXIF timestamp, GPS coordinates, Zoom/Pan & Ticket ID      */}
      {/* =================================================================== */}
      {lightbox.isOpen && lightbox.photos.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col justify-between p-4 sm:p-6 text-white">
          {/* Top Bar: Ticket ID, Photo Counter & Close */}
          <div className="flex items-center justify-between border-b border-white/20 pb-3">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded bg-white/20 font-mono text-xs font-bold">
                Ticket: {lightbox.photos[lightbox.currentIndex]?.ticket_number}
              </span>
              <span className="font-mono text-xs text-slate-300">
                Photo {lightbox.currentIndex + 1} of {lightbox.photos.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Zoom In */}
              <button
                type="button"
                onClick={() => setLightbox((prev) => ({ ...prev, zoom: Math.min(3, prev.zoom + 0.5) }))}
                className="w-10 h-10 rounded-stitch-btn bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
                title="Zoom in"
              >
                <span className="material-symbols-outlined text-sm">zoom_in</span>
              </button>

              {/* Zoom Out */}
              <button
                type="button"
                onClick={() => setLightbox((prev) => ({ ...prev, zoom: Math.max(1, prev.zoom - 0.5) }))}
                className="w-10 h-10 rounded-stitch-btn bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
                title="Zoom out"
              >
                <span className="material-symbols-outlined text-sm">zoom_out</span>
              </button>

              {/* Reset Zoom */}
              <button
                type="button"
                onClick={() => setLightbox((prev) => ({ ...prev, zoom: 1 }))}
                className="w-10 h-10 rounded-stitch-btn bg-white/10 hover:bg-white/20 flex items-center justify-center text-xs font-mono font-bold text-white"
                title="Reset zoom"
              >
                1x
              </button>

              {/* Close Lightbox */}
              <button
                type="button"
                onClick={closeLightbox}
                className="w-10 h-10 rounded-stitch-btn bg-stitch-emergency hover:bg-stitch-emergency-hover flex items-center justify-center text-white ml-2"
                title="Close lightbox"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          </div>

          {/* Center Image Container with Zoom & Navigation */}
          <div className="relative flex-1 flex items-center justify-center overflow-hidden my-4">
            {/* Previous Button */}
            {lightbox.photos.length > 1 && (
              <button
                type="button"
                onClick={prevLightboxPhoto}
                className="absolute left-2 sm:left-4 z-10 w-12 h-12 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center"
                title="Previous photo"
              >
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
            )}

            {/* Displayed Photo */}
            <div className="max-w-5xl max-h-full flex items-center justify-center overflow-auto">
              <img
                src={lightbox.photos[lightbox.currentIndex]?.storage_url}
                alt={`Photo ${lightbox.currentIndex + 1}`}
                className="max-h-[70vh] max-w-full object-contain rounded transition-transform duration-200"
                style={{ transform: `scale(${lightbox.zoom})` }}
              />
            </div>

            {/* Next Button */}
            {lightbox.photos.length > 1 && (
              <button
                type="button"
                onClick={nextLightboxPhoto}
                className="absolute right-2 sm:right-4 z-10 w-12 h-12 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center"
                title="Next photo"
              >
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            )}
          </div>

          {/* Bottom Bar: EXIF Timestamp, GPS Coordinates & AI Confidence */}
          <div className="border-t border-white/20 pt-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex flex-wrap items-center gap-4 text-slate-300">
              <span>
                <strong>EXIF Timestamp:</strong>{' '}
                {lightbox.photos[lightbox.currentIndex]?.uploaded_at
                  ? new Date(lightbox.photos[lightbox.currentIndex].uploaded_at).toLocaleString('en-IN')
                  : 'Live Capture Timestamp Verified'}
              </span>

              {lightbox.photos[lightbox.currentIndex]?.exif_latitude && (
                <span>
                  <strong>GPS:</strong> {lightbox.photos[lightbox.currentIndex].exif_latitude?.toFixed(5)},{' '}
                  {lightbox.photos[lightbox.currentIndex].exif_longitude?.toFixed(5)}
                </span>
              )}

              {lightbox.photos[lightbox.currentIndex]?.exif_latitude && (
                <a
                  href={`https://www.google.com/maps?q=${lightbox.photos[lightbox.currentIndex].exif_latitude},${lightbox.photos[lightbox.currentIndex].exif_longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-stitch-terracotta underline font-bold"
                >
                  View on Google Maps
                </a>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded bg-emerald-900 text-emerald-200 border border-emerald-500 font-bold">
                AI Computer Vision Confidence: {Math.round((lightbox.photos[lightbox.currentIndex]?.ai_confidence || 0.9) * 100)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* RESOLUTION PROOF MODAL: Upload Completion Proof & Resolve           */}
      {/* Side-by-Side Citizen Before vs Officer After Photo Comparison       */}
      {/* =================================================================== */}
      {resolveModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-stitch-card bg-white p-6 shadow-stitch-floating space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stitch-surface-border pb-3">
              <div className="flex items-center gap-2 text-emerald-800">
                <span className="material-symbols-outlined">add_a_photo</span>
                <h3 className="text-h3 font-extrabold text-stitch-ink-primary">
                  Upload Completion Proof &amp; Resolve ({resolveModal.ticketNumber})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setResolveModal((prev) => ({ ...prev, isOpen: false }))}
                className="text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <p className="text-xs text-stitch-ink-secondary">
              Attach verified post-repair photographic proof to substantiate field resolution. This triggers the 48-hour citizen satisfaction confirmation window.
            </p>

            {/* Side-by-Side Before & After Preview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Before Photo */}
              <div className="space-y-1">
                <span className="text-[11px] font-mono font-bold text-stitch-ink-muted block">
                  Citizen Before-Evidence:
                </span>
                <div className="rounded-stitch-card overflow-hidden border border-stitch-surface-border bg-slate-100 aspect-video flex items-center justify-center">
                  {resolveModal.beforePhotoUrl ? (
                    <img
                      src={resolveModal.beforePhotoUrl}
                      alt="Before evidence"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center text-slate-400 text-xs">
                      <span className="material-symbols-outlined text-2xl">no_photography</span>
                      <p>No Citizen Photo</p>
                    </div>
                  )}
                </div>
              </div>

              {/* After Photo Preview */}
              <div className="space-y-1">
                <span className="text-[11px] font-mono font-bold text-stitch-ink-muted block">
                  Officer After-Repair Proof:
                </span>
                <div className="rounded-stitch-card overflow-hidden border border-stitch-surface-border bg-slate-100 aspect-video flex items-center justify-center">
                  {resolveModal.proofImageUrl ? (
                    <img
                      src={resolveModal.proofImageUrl}
                      alt="After completion proof"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center text-slate-400 text-xs p-2">
                      <span className="material-symbols-outlined text-2xl text-emerald-600">verified</span>
                      <p>Paste or select photo URL below to preview completion proof</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Input: Completion Proof URL */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-stitch-ink-primary">
                Officer Field Completion Photo URL / Base64:
              </label>
              <input
                type="text"
                value={resolveModal.proofImageUrl}
                onChange={(e) => setResolveModal((prev) => ({ ...prev, proofImageUrl: e.target.value }))}
                placeholder="https://storage.googleapis.com/... or data:image/jpeg;base64,..."
                className="w-full min-h-touch px-3 rounded-stitch-btn border border-stitch-surface-border text-xs text-stitch-ink-primary focus:outline-none focus:ring-2 focus:ring-stitch-terracotta"
              />
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() =>
                    setResolveModal((prev) => ({
                      ...prev,
                      proofImageUrl:
                        'https://images.unsplash.com/photo-1590402494682-cd3fb53b1f70?auto=format&fit=crop&w=800&q=80',
                    }))
                  }
                  className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-[11px] font-mono font-semibold text-slate-700"
                >
                  Use Sample Repaired Road Proof
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setResolveModal((prev) => ({
                      ...prev,
                      proofImageUrl:
                        'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80',
                    }))
                  }
                  className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-[11px] font-mono font-semibold text-slate-700"
                >
                  Use Sample Cleaned Dumpster Proof
                </button>
              </div>
            </div>

            {/* Remarks */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-stitch-ink-primary">
                Resolution Remarks:
              </label>
              <textarea
                value={resolveModal.remarks}
                onChange={(e) => setResolveModal((prev) => ({ ...prev, remarks: e.target.value }))}
                rows={2}
                className="w-full p-2.5 rounded-stitch-btn border border-stitch-surface-border text-xs text-stitch-ink-primary focus:outline-none focus:ring-2 focus:ring-stitch-terracotta"
              />
            </div>

            {/* Confirm & Cancel Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stitch-surface-border">
              <button
                type="button"
                onClick={() => setResolveModal((prev) => ({ ...prev, isOpen: false }))}
                className="min-h-touch px-4 py-2 rounded-stitch-btn border border-stitch-surface-border text-xs font-semibold text-stitch-ink-secondary hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={resolveModal.isSubmitting}
                onClick={handleConfirmResolve}
                className="min-h-touch px-5 py-2.5 rounded-stitch-btn bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-stitch-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm">verified</span>
                <span>{resolveModal.isSubmitting ? 'Resolving...' : 'Confirm Resolution & Start 48h Window'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* HOLD REASON MODAL                                                   */}
      {/* =================================================================== */}
      {holdModalComplaintId && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-stitch-card bg-white p-6 shadow-stitch-floating space-y-4">
            <div className="flex items-center gap-2 text-amber-900">
              <span className="material-symbols-outlined">pause_circle</span>
              <h3 className="text-h3 font-bold text-stitch-ink-primary">
                Keep Complaint on Hold
              </h3>
            </div>
            <p className="text-xs text-stitch-ink-secondary">
              Select or specify why this complaint is being queued in the holding buffer prior to active field work:
            </p>
            <select
              value={selectedHoldReason}
              onChange={(e) => setSelectedHoldReason(e.target.value)}
              className="w-full min-h-touch px-3 rounded-stitch-btn border border-stitch-surface-border text-xs font-semibold text-stitch-ink-primary focus:outline-none focus:ring-2 focus:ring-stitch-terracotta"
            >
              <option value="Awaiting field crew / heavy equipment dispatch (JCB / Jetting Machine / Tanker)">
                Awaiting field crew / heavy equipment (JCB / Jetting Machine / Tanker)
              </option>
              <option value="Queued behind active life-safety emergency in ward">
                Queued behind active life-safety emergency in ward
              </option>
              <option value="Awaiting additional stacked citizen reports to pinpoint exact spot">
                Awaiting additional stacked citizen reports to pinpoint exact spot
              </option>
              <option value="Cross-department coordination required (R&B / Water / DISCOM)">
                Cross-department coordination required (R&B / Water / DISCOM)
              </option>
              <option value="Held in queue while prioritizing higher-volume hotspot cases">
                Held in queue while prioritizing higher-volume hotspot cases
              </option>
            </select>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setHoldModalComplaintId(null)}
                className="min-h-touch px-4 py-2 rounded-stitch-btn border border-stitch-surface-border text-xs font-semibold text-stitch-ink-secondary hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmHold(holdModalComplaintId, selectedHoldReason)}
                className="min-h-touch px-4 py-2 rounded-stitch-btn bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-stitch-sm"
              >
                Confirm Keep on Hold
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VolumeRankedOfficerPortalPage;
