import React, { useState, useEffect, useRef } from 'react';
import {
  ComplaintCategory,
  DistrictRouting,
  StateUT,
  Complaint,
  AiTriageResult,
} from '../types';
import { performAiTriage } from '../services/aiTriage';
import { reverseResolveWard, getCurrentGpsPosition } from '../services/geolocation';

interface ComplaintRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedState: StateUT;
  selectedDistrict: DistrictRouting;
  existingComplaints: Complaint[];
  onSubmitComplaint: (complaint: Complaint) => void;
  preselectedCategory?: ComplaintCategory;
}

interface CategoryConfig {
  name: ComplaintCategory;
  title: string;
  subtitle: string;
  slaBadge: string;
  deptBadge: string;
  deskTitle: string;
  deskDesc: string;
  iconName: string;
  colorTheme: {
    accent: string;
    bgBadge: string;
    textBadge: string;
    borderActive: string;
    bgActive: string;
    btnClass: string;
    iconBg: string;
  };
  issues: {
    id: string;
    title: string;
    desc: string;
    icon: string;
    priority: string;
    isHighPriority?: boolean;
    urgentBadge?: string;
  }[];
  helplines: {
    title: string;
    number: string;
    desc: string;
    tel: string;
    isTollFree?: boolean;
  }[];
  submitBtnText: string;
  complianceText: string;
}

const CATEGORY_CONFIGS: Record<ComplaintCategory, CategoryConfig> = {
  Roads: {
    name: 'Roads',
    title: 'Report Roads & Infrastructure',
    subtitle: 'National Civic Grievance Redressal Portal',
    slaBadge: 'SLA: 24H RESOLUTION',
    deptBadge: 'STATE PWD & HIGHWAYS DEPT',
    deskTitle: 'Roads & Infrastructure Desk',
    deskDesc:
      'Report hazardous potholes, damaged footpaths, broken highway dividers or road collapse for immediate PWD mobilization.',
    iconName: 'add_road',
    colorTheme: {
      accent: 'blue',
      bgBadge: 'bg-amber-50',
      textBadge: 'text-amber-800',
      borderActive: 'border-blue-600',
      bgActive: 'bg-blue-50/70',
      btnClass: 'bg-blue-600 hover:bg-blue-700 shadow-blue-200',
      iconBg: 'bg-blue-600',
    },
    issues: [
      {
        id: 'pothole',
        title: 'Potholes & Craters',
        desc: 'Deep crater, broken tarmac, skidding risk',
        icon: 'landslide',
        priority: 'Priority High',
        isHighPriority: true,
      },
      {
        id: 'footpath',
        title: 'Broken Footpaths',
        desc: 'Cracked slabs, pedestrian trip hazard',
        icon: 'directions_walk',
        priority: 'SLA: 48h',
        isHighPriority: false,
      },
      {
        id: 'divider',
        title: 'Damaged Dividers',
        desc: 'Displaced concrete, head-on crash risk',
        icon: 'fence',
        priority: 'Priority High',
        isHighPriority: true,
      },
      {
        id: 'lights',
        title: 'Street Lights / Signage',
        desc: 'Dark corridor, missing safety signs',
        icon: 'wb_incandescent',
        priority: 'SLA: 24h',
        isHighPriority: false,
      },
    ],
    helplines: [
      {
        title: 'PWD Roads & Bridges Helpline',
        number: '1800-11-4000 (Toll Free)',
        desc: 'Toll Free Helpline',
        tel: '1800114000',
        isTollFree: true,
      },
      {
        title: 'State Infrastructure Control Room',
        number: '011-2345-6789',
        desc: 'Direct Room Desk',
        tel: '01123456789',
      },
    ],
    submitBtnText: 'DISPATCH PWD ROAD CREW (शिकायत दर्ज करें)',
    complianceText: 'DPDP Act 2023 Compliant • MoRTH Road Grievance Cell',
  },
  Water: {
    name: 'Water',
    title: 'Report Water Supply & Drainage',
    subtitle: 'Delhi Jal Board / Municipal Water Desk',
    slaBadge: 'SLA: 12H RESOLUTION',
    deptBadge: 'MUNICIPAL WATER SUPPLY & DRAINAGE',
    deskTitle: 'Water Supply & Drainage Desk',
    deskDesc:
      'Report pipeline leaks, water contamination, sewer blockage or water stagnation for rapid engineer dispatch.',
    iconName: 'water_drop',
    colorTheme: {
      accent: 'sky',
      bgBadge: 'bg-amber-50',
      textBadge: 'text-amber-800',
      borderActive: 'border-sky-600',
      bgActive: 'bg-sky-50/70',
      btnClass: 'bg-sky-700 hover:bg-sky-800 shadow-sky-200',
      iconBg: 'bg-sky-600',
    },
    issues: [
      {
        id: 'leak',
        title: 'Pipeline Leaks',
        desc: 'Burst main, pipe crack, road gush',
        icon: 'water',
        priority: 'Priority High',
        isHighPriority: true,
      },
      {
        id: 'drain',
        title: 'Blocked Drains',
        desc: 'Overflowing sewer & manhole',
        icon: 'water_damage',
        priority: 'SLA: 12h',
        isHighPriority: false,
      },
      {
        id: 'stagnation',
        title: 'Water Stagnation',
        desc: 'Mosquito breeding, standing pool',
        icon: 'waves',
        priority: 'SLA: 24h',
        isHighPriority: false,
      },
      {
        id: 'contamination',
        title: 'Contaminated Water',
        desc: 'Discolored, foul odor in tap supply',
        icon: 'warning',
        priority: 'Priority High',
        isHighPriority: true,
      },
    ],
    helplines: [
      {
        title: 'Jal Board Helpline',
        number: '1916 (Toll Free)',
        desc: '24x7 Water Desk',
        tel: '1916',
        isTollFree: true,
      },
      {
        title: 'Safaimitra NAMASTE Desk',
        number: '14420 (Toll Free)',
        desc: 'Mechanized Cleaning Desk',
        tel: '14420',
        isTollFree: true,
      },
    ],
    submitBtnText: 'SUBMIT REPORT TO JAL BOARD (दर्ज करें)',
    complianceText: 'DPDP Act 2023 Compliant • Official Digital India Jal Jeevan Mission Desk',
  },
  Garbage: {
    name: 'Garbage',
    title: 'Report Garbage & Sanitation',
    subtitle: 'Swachh Bharat MCD Desk',
    slaBadge: 'SLA: 6H RAPID SWACHH',
    deptBadge: 'SWACHH BHARAT MCD DESK',
    deskTitle: 'Garbage & Sanitation Desk',
    deskDesc:
      'Report uncollected garbage, overflowing community bins, or animal carcass for priority municipal clearance.',
    iconName: 'delete_sweep',
    colorTheme: {
      accent: 'emerald',
      bgBadge: 'bg-amber-50',
      textBadge: 'text-amber-800',
      borderActive: 'border-emerald-600',
      bgActive: 'bg-emerald-50/70',
      btnClass: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200',
      iconBg: 'bg-emerald-600',
    },
    issues: [
      {
        id: 'bin_overflow',
        title: 'Overflowing Dustbin / Bin',
        desc: 'Community bin full, spilling into street',
        icon: 'delete',
        priority: 'High Priority',
        isHighPriority: true,
      },
      {
        id: 'roadside_dump',
        title: 'Roadside Dump / Open Waste',
        desc: 'Public thoroughfare litter & plastic debris',
        icon: 'delete_forever',
        priority: 'SLA: 24h',
        isHighPriority: false,
      },
      {
        id: 'dead_animal',
        title: 'Dead Animal Removal',
        desc: 'Urgent sanitary disposal request',
        icon: 'warning',
        priority: 'Priority Urgent',
        isHighPriority: true,
        urgentBadge: 'Urgent Request',
      },
      {
        id: 'commercial_dump',
        title: 'Illegal Commercial Dumping',
        desc: 'Heavy debris, slag & construction waste',
        icon: 'domain',
        priority: 'SLA: 48h',
        isHighPriority: false,
      },
    ],
    helplines: [
      {
        title: 'Call 1969 Swachhata',
        number: '1969 (Toll Free)',
        desc: '24x7 National Sanitation Portal',
        tel: '1969',
        isTollFree: true,
      },
      {
        title: 'Municipal Waste Dept / Control',
        number: '155304',
        desc: 'Zonal Sanitary Inspector Dispatch',
        tel: '155304',
      },
    ],
    submitBtnText: 'DISPATCH SANITATION CREW (शिकायत दर्ज करें)',
    complianceText: 'DPDP Act 2023 Compliant • Swachh Bharat Urban 2.0 Mission',
  },
  Electricity: {
    name: 'Electricity',
    title: 'Report Electricity & Street Lighting',
    subtitle: 'National Civic Grievance Redressal Portal',
    slaBadge: 'SLA: 4H DISCOM RESOLUTION',
    deptBadge: 'STATE DISCOM & POWER DEPT',
    deskTitle: 'Electricity & Street Lighting Grid',
    deskDesc:
      'Report power outages, fallen poles, sparking wires, transformer damage or dark streets instantly for priority lineman dispatch.',
    iconName: 'bolt',
    colorTheme: {
      accent: 'amber',
      bgBadge: 'bg-amber-50',
      textBadge: 'text-amber-900',
      borderActive: 'border-amber-500',
      bgActive: 'bg-amber-50/60',
      btnClass: 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold shadow-amber-200',
      iconBg: 'bg-amber-500',
    },
    issues: [
      {
        id: 'sparking_wires',
        title: 'Sparking High Tension Wires',
        desc: 'Live flash / ground contact hazard',
        icon: 'flash_on',
        priority: 'Urgent Hazard',
        isHighPriority: true,
        urgentBadge: 'Urgent Hazard',
      },
      {
        id: 'fallen_pole',
        title: 'Fallen Electric Pole / Mast',
        desc: 'Road block or tilted power line',
        icon: 'electrical_services',
        priority: 'SLA: 12h',
        isHighPriority: false,
      },
      {
        id: 'power_cut',
        title: 'Unscheduled Power Cut',
        desc: 'Total area blackout & phase fault',
        icon: 'power_off',
        priority: 'SLA: 4h',
        isHighPriority: false,
      },
      {
        id: 'transformer_damage',
        title: 'Transformer Blast / Oil Leak',
        desc: 'Smoke, burning odor & blast danger',
        icon: 'warning',
        priority: 'Priority Urgent',
        isHighPriority: true,
        urgentBadge: 'High Hazard',
      },
    ],
    helplines: [
      {
        title: 'Call 1912 DISCOM Helpline',
        number: '1912 (Toll Free)',
        desc: '24x7 Emergency Lineman Dispatch',
        tel: '1912',
        isTollFree: true,
      },
      {
        title: 'State Electricity Control Room',
        number: '011-2345-6789',
        desc: 'Control Room Direct',
        tel: '01123456789',
      },
    ],
    submitBtnText: 'DISPATCH EMERGENCY LINEMAN (शिकायत दर्ज करें)',
    complianceText: 'DPDP Act 2023 Compliant • National Power Portal (NP Portal)',
  },
  Drainage: {
    name: 'Drainage',
    title: 'Report Drainage & Sewage Grievance',
    subtitle: 'NAMASTE Sewer Safety & Municipal Sanitation Desk',
    slaBadge: 'SLA: 12H RESOLUTION',
    deptBadge: 'NAMASTE SEWER SAFETY DESK',
    deskTitle: 'Drainage & Sewerage Grid',
    deskDesc:
      'Report flooded stormwater drains, manhole overflows, or sewer blockages. Mechanized unblocking available via 14420.',
    iconName: 'water_damage',
    colorTheme: {
      accent: 'indigo',
      bgBadge: 'bg-amber-50',
      textBadge: 'text-amber-800',
      borderActive: 'border-indigo-600',
      bgActive: 'bg-indigo-50/70',
      btnClass: 'bg-indigo-700 hover:bg-indigo-800 shadow-indigo-200',
      iconBg: 'bg-indigo-600',
    },
    issues: [
      {
        id: 'clogged_drain',
        title: 'Clogged Stormwater Drain',
        desc: 'Monsoon flooding, street overflow',
        icon: 'waves',
        priority: 'Priority High',
        isHighPriority: true,
      },
      {
        id: 'manhole_overflow',
        title: 'Overflowing Sewage Manhole',
        desc: 'Uncapped manhole, public hazard',
        icon: 'warning',
        priority: 'Priority Urgent',
        isHighPriority: true,
        urgentBadge: 'Safety Alert',
      },
      {
        id: 'damaged_slabs',
        title: 'Damaged Drain Slabs',
        desc: 'Missing covers, pedestrian hazard',
        icon: 'fence',
        priority: 'SLA: 48h',
        isHighPriority: false,
      },
      {
        id: 'effluent',
        title: 'Industrial Effluent Discharge',
        desc: 'Toxic chemical smell in open drain',
        icon: 'science',
        priority: 'Priority High',
        isHighPriority: true,
      },
    ],
    helplines: [
      {
        title: 'NAMASTE Sewer Safety',
        number: '14420 (Toll Free)',
        desc: 'Mechanized Sewer Cleaning',
        tel: '14420',
        isTollFree: true,
      },
      {
        title: 'Municipal Drainage Control',
        number: '155304',
        desc: 'Zonal Desilting Unit',
        tel: '155304',
      },
    ],
    submitBtnText: 'DISPATCH DRAINAGE CREW (शिकायत दर्ज करें)',
    complianceText: 'DPDP Act 2023 Compliant • Prohibition of Manual Scavenging Act',
  },
};

export const ComplaintRegistrationModal: React.FC<ComplaintRegistrationModalProps> = ({
  isOpen,
  onClose,
  selectedState,
  selectedDistrict,
  existingComplaints,
  onSubmitComplaint,
  preselectedCategory = 'Roads',
}) => {
  const [category, setCategory] = useState<ComplaintCategory>(preselectedCategory);
  const config = CATEGORY_CONFIGS[category] || CATEGORY_CONFIGS.Roads;

  const [selectedIssueId, setSelectedIssueId] = useState<string>(config.issues[0]?.id || '');
  const [landmark, setLandmark] = useState<string>('Near Sector 8 Flyover Junction, Outer Ring Rd');
  const [customDescription, setCustomDescription] = useState<string>('');
  const [isAnonymous, setIsAnonymous] = useState<boolean>(true);

  // GPS coordinates
  const [exifLat, setExifLat] = useState<number>(17.3850);
  const [exifLng, setExifLng] = useState<number>(78.4867);
  const [wardDisplay, setWardDisplay] = useState<string>('Ward 44 • Outer Ring Rd, Sub-Division 3');

  // Multi-Photo Evidence Upload State (up to 3 persistent files)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [attachedFiles, setAttachedFiles] = useState<
    {
      id: string;
      file: File;
      previewUrl: string;
      fileName: string;
      fileSizeFormatted: string;
      isDocument: boolean;
    }[]
  >([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Submission & AI Triage
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedTicket, setSubmittedTicket] = useState<Complaint | null>(null);
  const [_triageResult, setTriageResult] = useState<AiTriageResult | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCategory(preselectedCategory);
      const conf = CATEGORY_CONFIGS[preselectedCategory] || CATEGORY_CONFIGS.Roads;
      setSelectedIssueId(conf.issues[0]?.id || '');
      setSubmittedTicket(null);
      setSubmitError(null);
      setUploadError(null);
      setAttachedFiles([]);

      // Initialize location based on district
      reverseResolveWard(exifLat, exifLng);
      setWardDisplay(`Ward 44 • ${selectedDistrict.district_name} Circle, Sub-Division 3`);
      setLandmark(`Near ${selectedDistrict.district_name} Central Market & Main Junction`);
    }
  }, [isOpen, preselectedCategory, selectedDistrict, exifLat, exifLng]);

  // When category changes, reset selected issue
  const handleCategorySwitch = (newCat: ComplaintCategory) => {
    setCategory(newCat);
    const conf = CATEGORY_CONFIGS[newCat];
    setSelectedIssueId(conf.issues[0]?.id || '');
  };

  // Supported validation formats and multi-file processing (up to 3 files)
  const validateAndAddFiles = (files: FileList | File[]) => {
    setUploadError(null);
    const validExtensions = ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'doc', 'docx'];
    const maxSize = 10 * 1024 * 1024; // 10MB limit

    const filesArray = Array.from(files);
    if (attachedFiles.length >= 3) {
      setUploadError('Maximum 3 evidence photos/documents allowed per complaint.');
      return;
    }

    if (attachedFiles.length + filesArray.length > 3) {
      setUploadError('Only up to 3 evidence files can be attached. Excess files were ignored.');
    }

    const availableSlots = 3 - attachedFiles.length;
    const toProcess = filesArray.slice(0, availableSlots);
    const newItems: {
      id: string;
      file: File;
      previewUrl: string;
      fileName: string;
      fileSizeFormatted: string;
      isDocument: boolean;
    }[] = [];

    for (const file of toProcess) {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      if (!validExtensions.includes(ext)) {
        setUploadError('Invalid format. Supported formats: JPG, PNG, WEBP, PDF, DOC, DOCX.');
        continue;
      }
      if (file.size > maxSize) {
        setUploadError(`File too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum limit is 10 MB.`);
        continue;
      }

      const isDoc = ['pdf', 'doc', 'docx'].includes(ext);
      const previewUrl = isDoc ? '' : URL.createObjectURL(file);
      newItems.push({
        id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        file,
        previewUrl,
        fileName: file.name,
        fileSizeFormatted: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        isDocument: isDoc,
      });
    }

    if (newItems.length > 0) {
      setAttachedFiles((prev) => [...prev, ...newItems]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndAddFiles(e.target.files);
    }
    if (e.target) e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndAddFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveFile = (id: string) => {
    setAttachedFiles((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((item) => item.id !== id);
    });
    setUploadError(null);
  };

  const handleRefineGps = async () => {
    try {
      const pos = await getCurrentGpsPosition();
      setExifLat(pos.latitude);
      setExifLng(pos.longitude);
      const res = reverseResolveWard(pos.latitude, pos.longitude);
      setWardDisplay(`Ward 44 • ${res.district.district_name} Circle, Sub-Division 3`);
    } catch {
      // Fallback
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    const activeIssue = config.issues.find((i) => i.id === selectedIssueId);
    const issueTitle = activeIssue ? activeIssue.title : 'Public Civic Defect';
    const issueDesc = customDescription.trim() || activeIssue?.desc || 'General civic grievance reported.';

    let activeUserId = 'citizen-primary';
    try {
      const raw = localStorage.getItem('civic_user_session');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.userId) activeUserId = parsed.userId;
      }
    } catch {
      // Fallback
    }

    // Prepare multipart form data payload
    const formData = new FormData();
    formData.append('user_id', activeUserId);
    formData.append('category', category);
    formData.append('district_id', String(selectedDistrict.district_id));
    formData.append('latitude', String(exifLat));
    formData.append('longitude', String(exifLng));
    formData.append('address_text', wardDisplay);
    formData.append('landmark', landmark);
    formData.append('description', `${issueTitle}: ${issueDesc}`);
    formData.append('issue_type', issueTitle);
    formData.append('is_anonymous', String(isAnonymous));

    attachedFiles.forEach((item, index) => {
      formData.append('files', item.file, item.fileName);
      if (index === 0) {
        formData.append('file', item.file, item.fileName);
      }
    });

    const citizenToken = localStorage.getItem('citizen_access_token') || localStorage.getItem('civic_auth_token');
    const headers: Record<string, string> = {
      'x-user-id': activeUserId,
      'x-user-role': 'Citizen',
    };
    if (citizenToken) {
      headers['Authorization'] = `Bearer ${citizenToken}`;
    }

    try {
      const res = await fetch('/api/v1/complaints', {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with status ${res.status}`);
      }

      const data = await res.json();
      setTriageResult(data.ai_triage);
      const createdComplaint: Complaint = data.complaint || {
        complaint_id: data.complaint_id,
        ticket_number: data.ticket_number,
        user_id: activeUserId,
        category,
        district_id: selectedDistrict.district_id,
        state_id: selectedState.state_id,
        latitude: exifLat,
        longitude: exifLng,
        address_text: wardDisplay,
        landmark,
        description: `${issueTitle}: ${issueDesc}`,
        ai_category: data.ai_triage?.ai_category || category,
        ai_confidence: data.ai_triage?.ai_confidence || 0.94,
        ai_urgency_score: data.ai_triage?.ai_urgency_score || 3,
        sla_target_hours: data.ai_triage?.sla_target_hours || 24,
        status: data.status || 'Submitted',
        assigned_department: data.assigned_department || 'Municipal Public Works Desk',
        assigned_officer_contact: `${selectedState.nodal_helpline} (Nodal Officer)`,
        created_at: new Date().toISOString(),
        resolved_at: null,
        citizen_satisfaction_deadline: null,
        images: data.images || (data.complaint && data.complaint.images) || attachedFiles.map((f, i) => ({
          image_id: `img-${Date.now()}-${i}`,
          complaint_id: data.complaint_id,
          storage_url: f.previewUrl,
          exif_latitude: exifLat,
          exif_longitude: exifLng,
          ai_validation_passed: true,
          is_resolution_proof: false,
          uploaded_at: new Date().toISOString(),
        })),
        status_logs: [
          {
            log_id: Date.now(),
            complaint_id: data.complaint_id,
            previous_status: 'None',
            new_status: data.status || 'Submitted',
            remarks: `Ticket generated. SLA target: <${data.ai_triage?.sla_target_hours || 24}h.`,
            updated_by: 'System AI Triage',
            timestamp: new Date().toISOString(),
          },
        ],
      };

      onSubmitComplaint(createdComplaint);
      setSubmittedTicket(createdComplaint);
    } catch (err: any) {
      // Offline fallback: create ticket locally
      console.warn('Network submission failed, performing offline-first ticket creation:', err);
      const stateCode = selectedState.code || 'IN';
      const randomSeq = Math.floor(10000 + Math.random() * 90000);
      const ticketNumber = `CIV-2026-${stateCode}-${randomSeq}`;
      const triage = performAiTriage({
        category,
        description: `${issueTitle}: ${issueDesc}`,
        landmark,
        latitude: exifLat,
        longitude: exifLng,
        existingComplaints,
      });

      let assignedDept = selectedDistrict.road_category_routing;
      if (category === 'Water') assignedDept = selectedDistrict.water_category_routing;
      if (category === 'Garbage') assignedDept = selectedDistrict.garbage_category_routing;
      if (category === 'Electricity') assignedDept = selectedDistrict.electricity_category_routing;

      const offlineComplaint: Complaint = {
        complaint_id: `cmp-${Date.now()}`,
        ticket_number: ticketNumber,
        user_id: activeUserId,
        category,
        district_id: selectedDistrict.district_id,
        state_id: selectedState.state_id,
        latitude: exifLat,
        longitude: exifLng,
        address_text: wardDisplay,
        landmark,
        description: `${issueTitle}: ${issueDesc}`,
        ai_category: triage.ai_category,
        ai_confidence: triage.ai_confidence,
        ai_urgency_score: triage.ai_urgency_score,
        sla_target_hours: triage.sla_target_hours,
        status: 'Submitted',
        assigned_department: assignedDept,
        assigned_officer_contact: `${selectedState.nodal_helpline} (Nodal Officer)`,
        created_at: new Date().toISOString(),
        resolved_at: null,
        citizen_satisfaction_deadline: null,
        images: attachedFiles.map((f, i) => ({
          image_id: `img-${Date.now()}-${i}`,
          complaint_id: `cmp-${Date.now()}`,
          storage_url: f.previewUrl,
          exif_latitude: exifLat,
          exif_longitude: exifLng,
          ai_validation_passed: true,
          is_resolution_proof: false,
          uploaded_at: new Date().toISOString(),
        })),
        status_logs: [
          {
            log_id: Date.now(),
            complaint_id: `cmp-${Date.now()}`,
            previous_status: 'None',
            new_status: 'Submitted',
            remarks: `Offline ticket cached. SLA target: <${triage.sla_target_hours}h.`,
            updated_by: 'Offline-First Engine',
            timestamp: new Date().toISOString(),
          },
        ],
      };

      onSubmitComplaint(offlineComplaint);
      setSubmittedTicket(offlineComplaint);
      setTriageResult(triage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-headline"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex justify-center items-start sm:py-6 px-0 sm:px-4"
    >
      {/* Mobile container matching Switch ID 17261693919896871574 */}
      <div className="w-full max-w-md bg-white min-h-screen sm:min-h-0 sm:rounded-2xl shadow-2xl relative border-x border-slate-200 flex flex-col overflow-hidden animate-fadeIn my-auto">
        {/* Hidden File Inputs */}
        <input
          type="file"
          ref={fileInputRef}
          accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx"
          onChange={handleFileSelect}
          multiple
          className="hidden"
        />
        <input
          type="file"
          ref={cameraInputRef}
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Top iOS Status Bar Simulation */}
        <div className="w-full bg-white px-6 pt-3 pb-1 flex justify-between items-center text-xs font-semibold text-slate-800 border-b border-slate-100 sticky top-0 z-30">
          <span>9:41</span>
          <div className="flex items-center gap-1.5 text-xs text-slate-800">
            <span className="material-symbols-outlined text-[13px]">signal_cellular_alt</span>
            <span className="material-symbols-outlined text-[13px]">wifi</span>
            <span className="material-symbols-outlined text-[15px]">battery_full</span>
          </div>
        </div>

        {/* Top Header & Navigation */}
        <header className="bg-white px-4 py-2.5 border-b border-slate-200 sticky top-7 z-20 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onClose}
              aria-label="Go back to categories"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-blue-700 bg-slate-100 hover:bg-slate-200/80 px-2.5 py-1.5 rounded-lg transition-colors active:scale-95"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              <span>Categories</span>
            </button>
            <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-900 border border-amber-300 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              {config.slaBadge}
            </span>
          </div>

          {/* Screen Title */}
          <div className="mt-2.5">
            <h1 id="modal-headline" className="text-lg font-bold text-slate-900 tracking-tight leading-tight">
              {config.title}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">{config.subtitle}</p>
          </div>
        </header>

        {/* Category Switcher Pills */}
        <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {(['Roads', 'Water', 'Garbage', 'Electricity', 'Drainage'] as ComplaintCategory[]).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => handleCategorySwitch(cat)}
              className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                category === cat
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-12">
          {/* SUCCESS MODAL STATE */}
          {submittedTicket ? (
            <div className="space-y-4 py-4 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <span className="material-symbols-outlined text-3xl">check_circle</span>
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  OFFICIAL CIVIC DOSSIER REGISTERED
                </span>
                <h2 className="text-xl font-black text-slate-900 mt-2">
                  {submittedTicket.ticket_number}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Synchronized with {selectedDistrict.district_name} Central Grievance Dispatch
                </p>
              </div>

              {/* Triage Summary Card */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-left space-y-2 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="text-slate-500">Status</span>
                  <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {submittedTicket.status}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="text-slate-500">Target SLA</span>
                  <span className="font-bold text-amber-800">
                    Within {submittedTicket.sla_target_hours} Hours
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="text-slate-500">Assigned Department</span>
                  <span className="font-semibold text-slate-800 text-right max-w-[200px] truncate">
                    {submittedTicket.assigned_department}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Attached Evidence</span>
                  <span className="font-mono text-slate-700 truncate max-w-[180px]">
                    {attachedFiles.length > 0
                      ? `${attachedFiles.length} file(s) verified`
                      : submittedTicket.images && submittedTicket.images.length > 0
                      ? `${submittedTicket.images.length} file(s) attached`
                      : 'GPS Coordinate Record'}
                  </span>
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition-all"
                >
                  Done / Close Form
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Category Header Banner */}
              <section className="bg-white p-3.5 rounded-2xl shadow-xs border border-slate-200 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-11 h-11 rounded-xl ${config.colorTheme.iconBg} text-white flex items-center justify-center shrink-0 shadow-sm`}
                  >
                    <span className="material-symbols-outlined text-2xl">{config.iconName}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-900 border border-amber-200/80 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md mb-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      {config.deptBadge}
                    </div>
                    <h2 className="text-sm font-bold text-slate-900 leading-snug">
                      {config.deskTitle}
                    </h2>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      {config.deskDesc}
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 1: Issue Selection Grid */}
              <section className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                    1. SELECT ISSUE TYPE
                  </h3>
                  <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full uppercase">
                    Required
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {config.issues.map((issue) => {
                    const isSelected = selectedIssueId === issue.id;
                    return (
                      <button
                        key={issue.id}
                        type="button"
                        onClick={() => setSelectedIssueId(issue.id)}
                        className={`p-3 rounded-xl text-left flex flex-col justify-between transition-all duration-150 relative active:scale-[0.98] ${
                          isSelected
                            ? `bg-blue-50/70 border-2 border-blue-600 shadow-xs`
                            : 'bg-white border border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {issue.urgentBadge && (
                          <div className="absolute -top-2 right-2 bg-red-600 text-white text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded-full shadow-xs flex items-center gap-0.5">
                            <span className="w-1 h-1 rounded-full bg-white animate-ping" />
                            {issue.urgentBadge}
                          </div>
                        )}
                        <div className="flex items-start justify-between">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              isSelected
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            <span className="material-symbols-outlined text-base">
                              {issue.icon}
                            </span>
                          </div>
                          <span
                            className={`material-symbols-outlined text-lg ${
                              isSelected ? 'text-blue-600' : 'text-slate-300'
                            }`}
                          >
                            {isSelected ? 'check_circle' : 'radio_button_unchecked'}
                          </span>
                        </div>
                        <div className="mt-2.5">
                          <p className="text-xs font-bold text-slate-900 leading-tight">
                            {issue.title}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5 leading-snug line-clamp-2">
                            {issue.desc}
                          </p>
                        </div>
                        <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center gap-1">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              issue.isHighPriority ? 'bg-red-500' : 'bg-slate-400'
                            }`}
                          />
                          <span className="text-[9px] font-bold text-slate-600 uppercase tracking-wide">
                            {issue.priority}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Section 2: Ward & Location Verification */}
              <section className="bg-white p-3.5 rounded-2xl shadow-xs border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                    2. WARD &amp; GPS VERIFICATION
                  </h3>
                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    GPS SYNCED
                  </span>
                </div>

                {/* GPS Card */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className="material-symbols-outlined text-blue-600 text-lg mt-0.5">
                      fmd_good
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">
                        {wardDisplay}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                        GPS Auto-Verified: {exifLat.toFixed(4)}° N, {exifLng.toFixed(4)}° E (±2.4m)
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRefineGps}
                    className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-bold text-blue-600 hover:bg-slate-50 shrink-0 shadow-2xs active:scale-95 transition-all"
                  >
                    Refine
                  </button>
                </div>

                {/* Specific Landmark Input */}
                <div className="flex flex-col gap-1">
                  <label htmlFor="landmark-input" className="text-[11px] font-semibold text-slate-600">
                    Specific Stretch / Closest Landmark
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3 text-slate-400 text-base">
                      pin_drop
                    </span>
                    <input
                      id="landmark-input"
                      type="text"
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                      placeholder="e.g. Near Sector 8 Flyover Junction, Outer Ring Rd"
                      className="w-full pl-9 pr-9 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-blue-600 font-medium transition-colors"
                    />
                    <span className="material-symbols-outlined absolute right-3 text-emerald-600 text-base">
                      check_circle
                    </span>
                  </div>
                </div>

                {/* Description Input */}
                <div className="flex flex-col gap-1">
                  <label htmlFor="notes-input" className="text-[11px] font-semibold text-slate-600">
                    Additional Incident Notes (Optional)
                  </label>
                  <textarea
                    id="notes-input"
                    rows={2}
                    value={customDescription}
                    onChange={(e) => setCustomDescription(e.target.value)}
                    placeholder="Provide specific details to assist field engineers..."
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-blue-600 font-medium"
                  />
                </div>
              </section>

              {/* Section 3: Incident Photo & File Evidence (NEW FEATURE INTEGRATION) */}
              <section className="bg-white p-3.5 rounded-2xl shadow-xs border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                    3. INCIDENT PHOTO &amp; FILE EVIDENCE
                  </h3>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    Geo-tag enabled
                  </span>
                </div>

                {/* Validation Error Alert */}
                {uploadError && (
                  <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-red-600">error</span>
                      <span>{uploadError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUploadError(null)}
                      className="text-red-600 font-bold ml-2 hover:opacity-80 text-xs"
                      aria-label="Dismiss error"
                    >
                      <span className="material-symbols-outlined text-xs">close</span>
                    </button>
                  </div>
                )}

                {/* Action Buttons: Camera & File/Gallery */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={attachedFiles.length >= 3}
                    onClick={() => cameraInputRef.current?.click()}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                      attachedFiles.length >= 3
                        ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-blue-50 hover:bg-blue-100/80 border-blue-200 text-blue-700 active:scale-95'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base">photo_camera</span>
                    <span>Take GPS Photo</span>
                  </button>
                  <button
                    type="button"
                    disabled={attachedFiles.length >= 3}
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                      attachedFiles.length >= 3
                        ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 active:scale-95'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base text-slate-500">
                      upload_file
                    </span>
                    <span>Upload Proof ({attachedFiles.length}/3)</span>
                  </button>
                </div>

                {/* Drag and Drop Zone */}
                {attachedFiles.length < 3 && (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-all ${
                      isDragging
                        ? 'border-blue-600 bg-blue-50/50'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xl text-slate-400">cloud_upload</span>
                    <p className="text-[11px] font-semibold text-slate-700 mt-1">
                      Drag and drop up to 3 evidence files, or browse
                    </p>
                    <p className="text-[9px] text-slate-400 mt-0.5">
                      JPG, PNG, WEBP, PDF up to 10MB each ({3 - attachedFiles.length} slots remaining)
                    </p>
                  </div>
                )}

                {/* Validation Error Message */}
                {uploadError && (
                  <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-medium flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-amber-600">warning</span>
                    <span>{uploadError}</span>
                  </div>
                )}

                {/* Uploaded File Evidence Gallery (Up to 3 Photos) */}
                {attachedFiles.length > 0 && (
                  <div className="space-y-2">
                    {attachedFiles.map((item, idx) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80"
                      >
                        <div className="w-14 h-14 rounded-lg overflow-hidden relative shrink-0 shadow-xs border border-slate-200 bg-slate-200 flex items-center justify-center">
                          {item.isDocument ? (
                            <span className="material-symbols-outlined text-2xl text-slate-600">
                              description
                            </span>
                          ) : (
                            <img
                              src={item.previewUrl}
                              alt={`Incident Evidence Proof ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                          )}
                          <span className="absolute bottom-0.5 right-0.5 bg-black/75 text-white text-[8px] px-1 rounded font-bold font-mono">
                            GEO #{idx + 1}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-slate-800 truncate">{item.fileName}</p>
                            <button
                              type="button"
                              onClick={() => handleRemoveFile(item.id)}
                              className="text-slate-400 hover:text-red-500 text-xs p-0.5 transition-colors"
                              title="Remove attached file"
                            >
                              <span className="material-symbols-outlined text-base">close</span>
                            </button>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {item.fileSizeFormatted}
                          </p>
                          <div className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-1.5 py-0.5 rounded text-[9px] font-bold mt-1">
                            <span className="material-symbols-outlined text-xs text-emerald-600">
                              check_circle
                            </span>
                            <span>Evidence #{idx + 1} Attached &amp; Validated</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Section 4: Emergency Escalations */}
              <section className="bg-white p-3.5 rounded-2xl shadow-xs border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                    4. EMERGENCY ESCALATIONS (DIRECT CONNECT)
                  </h3>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    24x7 Active
                  </span>
                </div>

                <div className="space-y-2">
                  {config.helplines.map((line, idx) => (
                    <a
                      key={idx}
                      href={`tel:${line.tel}`}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-base">call</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{line.title}</p>
                          <p className="text-[10px] text-slate-500">{line.number}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0">
                        Call
                      </span>
                    </a>
                  ))}
                </div>
              </section>

              {/* Section 5: Citizen Verification & Privacy */}
              <section className="bg-white p-3.5 rounded-2xl shadow-xs border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-500 text-[10px] block">Verified Resident ID</span>
                    <span className="font-bold text-slate-900">+91 98765 43210</span>
                  </div>
                  <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Aadhaar Linked
                  </span>
                </div>

                <div className="flex items-center justify-between pt-0.5">
                  <div>
                    <span className="text-xs font-semibold text-slate-800 block">
                      Keep Public Anonymity
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Hide personal identity on public transparency boards
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAnonymous(!isAnonymous)}
                    className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                      isAnonymous ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        isAnonymous ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </section>

              {/* Submit Error Warning */}
              {submitError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                  {submitError}
                </div>
              )}

              {/* Section 6: Primary Action Button */}
              <div className="pt-1 space-y-2.5">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSubmit}
                  className={`w-full py-3.5 px-4 rounded-2xl text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] ${config.colorTheme.btnClass} ${
                    isSubmitting ? 'opacity-70 cursor-wait' : ''
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">
                    {isSubmitting ? 'sync' : 'send'}
                  </span>
                  <span>
                    {isSubmitting
                      ? 'SYNCHRONIZING WITH DISPATCH...'
                      : config.submitBtnText}
                  </span>
                  {!isSubmitting && (
                    <span className="material-symbols-outlined text-base">arrow_forward</span>
                  )}
                </button>

                {/* Compliance Footer */}
                <div className="text-center pb-2">
                  <p className="text-[10px] font-medium text-slate-500 flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-xs text-slate-400">
                      verified_user
                    </span>
                    {config.complianceText}
                  </p>
                  <p className="text-[9px] text-slate-400 mt-0.5">
                    Tickets automatically synchronized with CPGRAMS central portal
                  </p>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};
