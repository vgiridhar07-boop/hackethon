# Civic Helpline India: Pan-India Civic Grievance Helpline Directory & AI Triage Platform

"Report • Track • Resolve - A Cleaner, Safer, and Better India"

Production-grade, offline-first civic grievance helpline directory and AI triage application engineered for all 36 States/UTs and 170 Districts of India, fully compliant with DPDP Act 2023, GIGW 3.0, and WCAG 2.1 AA standards.

---

## 1. Core Architecture & System Specifications

- **Design System Source of Truth:** Google Stitch Project ID `17261693919896871574`
  - High-contrast government authority palette: Sovereign Navy (`#1B365D`), Terracotta Accent (`#C84B31`), Emergency Red (`#DC2626`), SLA Status tokens (`#059669`, `#2563EB`, `#D97706`).
  - Typography: Plus Jakarta Sans (Headings & Authority titles), Inter (Interface typography), JetBrains Mono (Ticket numbers & telemetry).
  - Ergonomics: Strict 48x48dp minimum touch target bounding boxes.
- **Administrative Directory Coverage:**
  - 36 States and Union Territories with ISO 3166-2:IN codes, nodal helplines (e.g., 1902 AP Spandana, 181 CM Helplines, 112 ERSS), and grievance portals.
  - 170 Districts from the 87-page Pan-India directory, mapped to Mandals, Villages, and local administrative bodies (Panchayat Raj Dept, PR Engineering, Municipal Corporations, Municipalities).
  - 680 lateral department grievance routing endpoints covering Roads, Water, Garbage, and Electricity.
- **National Emergency Switchboards:**
  - 112: Emergency Response Support System (ERSS - Police, Fire, Ambulance, Disaster)
  - 14420: NAMASTE National Sewer and Septic Tank Worker Safety Helpline
  - 1969: Swachhata National Sanitation & Cleanliness Desk
  - 1915: National Consumer Helpline (NCH - Essential commodities, metering)
  - CPGRAMS: Department of Administrative Reforms and Public Grievances (Central Govt)
  - 181: Women in Distress & Unified CM Citizen Desks
  - 1902: State Nodal Grievance Redressal Switchboard
- **Dual-Stage AI Triage Engine:**
  - MobileNetV3 / ResNet50 Computer Vision simulation with confidence score (0.0 to 1.0) and automated issue classification.
  - Transformer NLP Urgency Classifier (Urgency score 1 to 5):
    - Hazard Level 5: Hazardous situations, live wires, chemical spills (<4 hour SLA)
    - High Urgency Level 4: Burst mains, road collapse, deep sinkholes (<24 hour SLA)
    - Routine Level 1-3: Potholes, uncollected garbage, streetlight out (<72 hour SLA)
  - PostGIS Spatial Duplicate Detection: Flags pre-existing open tickets within 50-meter radius and 48-hour time window.
  - DPDP Act 2023 Compliance: Automatic PII face and vehicle registration plate blurring pre-check before cloud transit.
- **Deterministic 5-Stage Lifecycle:**
  - Submitted -> Under Review -> Assigned -> In Progress -> Resolved.
  - Includes a mandatory 48-hour Citizen Satisfaction Window upon reaching 'Resolved' status, enabling citizen re-opening if issues persist.
- **Offline-First Resilience:**
  - Client-side IndexedDB persistence (`civic_helpline_db`) for zero-connectivity ticket drafts, directory search, and offline-first queue syncing.
  - Telephony launcher with automatic dual-tier failover: Primary local line -> State nodal helpline (`1902`/`181`) -> National ERSS (`112`).

---

## 2. Directory Structure

```text
├── dist/                             # Production-compiled client bundle (Vite)
├── mobile/                           # Native Flutter / Dart mobile architecture
│   ├── android/                      # AndroidManifest with CALL_PHONE & GPS permissions
│   ├── ios/                          # Runner Info.plist with LSApplicationQueriesSchemes
│   ├── lib/services/                 # HelplineDialerService with E.164 and short-code failover
│   └── pubspec.yaml                  # Flutter package definition
├── scripts/                          # Automated verification and test harnesses
│   └── test-api.ts                   # End-to-end backend API test runner
├── src/
│   ├── components/                   # React 18 UI components (Stitch ID 17261693919896871574)
│   │   ├── AuditFlagModal.tsx        # Crowd-sourced helpline discrepancy audit queue
│   │   ├── CitizenAuthModal.tsx      # DPDP OTP verification & Resident ID generator
│   │   ├── CivicServicesHub.tsx      # Welcome hero, 3 action pathway cards, department grid
│   │   ├── ComplaintRegistrationModal.tsx # 5-step sub-90-sec registration engine with AI Triage
│   │   ├── ComplaintTracker.tsx      # 5-stage lifecycle stepper with Before/After image proof
│   │   ├── EmergencyQuickAccessBar.tsx # Persistent floating SOS bar & switchboard sheet
│   │   ├── Header.tsx                # Sovereign kicker, authority crest, Resident ID badge
│   │   ├── HelplineDirectory.tsx     # Fuse.js fuzzy search, department pills, one-tap dialer
│   │   ├── JurisdictionSelector.tsx  # GPS auto-lock badge, cascading State & District picker
│   │   ├── LanguageModal.tsx         # 22 Scheduled Indian languages (Bhashini Indic AI)
│   │   ├── NavigationTabs.tsx        # Tab bar with badge indicators
│   │   └── SlaScorecard.tsx          # Open civic data compliance metrics (<4h, <24h, <72h)
│   ├── data/
│   │   ├── districtRouting170.ts     # 170 districts across all 36 States/UTs verbatim from PDF
│   │   ├── initialComplaints.ts      # Multi-stage transactional grievance seeds
│   │   ├── nationalHelplines.ts      # National switchboard descriptors (112, 14420, 1969, etc.)
│   │   └── statesUts.ts              # 36 States & UTs with ISO codes and nodal numbers
│   ├── server/                       # Node.js / Express API Gateway & PostGIS schema
│   │   ├── db/
│   │   │   └── schema.sql            # PostgreSQL 16 + PostGIS 3.4 DDL schema
│   │   ├── routes/
│   │   │   ├── complaints.ts         # Grievance registration, lookup, and lifecycle PATCH
│   │   │   ├── directory.ts          # Helplines query, offline sync bundle, audit flags
│   │   │   └── geo.ts                # PostGIS reverse ward & point-in-polygon resolution
│   │   └── index.ts                  # Main Express application gateway
│   ├── services/
│   │   ├── aiTriage.ts               # MobileNetV3 CV, Transformer NLP urgency, spatial dupes
│   │   ├── db.ts                     # IndexedDB offline storage layer (idb)
│   │   ├── dialer.ts                 # Cross-platform telephony launcher
│   │   └── geolocation.ts            # High-accuracy GPS hardware lock & reverse ward resolution
│   ├── types/
│   │   └── index.ts                  # Core TypeScript domain models & data contracts
│   ├── App.tsx                       # Master application state coordinator
│   ├── index.css                     # Tailwind directives, safe-area insets, touch-target bounds
│   └── main.tsx                      # Vite React entrypoint
├── package.json
├── tailwind.config.ts                # Stitch theme configuration
├── tsconfig.json
├── tsconfig.app.json
└── vite.config.ts
```

---

## 3. Installation & Getting Started

### Prerequisites
- Node.js 18.x or 20.x
- npm 9.x or later

### Install Dependencies
```bash
npm install
```

### Start Development Server
```bash
npm run dev
```
The Vite development server will start on `http://localhost:5173`.

### Run Production Build
```bash
npm run build
```
Compiles TypeScript and outputs the production bundle to `dist/`.

### Launch Backend Express API Gateway
```bash
npm run server
```
Runs the Express API Gateway on `http://localhost:3001`.

### Execute Backend Automated Test Suite
```bash
$env:NODE_ENV="test"; npx tsx scripts/test-api.ts   # Windows PowerShell
NODE_ENV=test npx tsx scripts/test-api.ts          # Linux / macOS
```

---

## 4. Database Schema (PostgreSQL 16 + PostGIS 3.4)

The database schema is defined in `src/server/db/schema.sql`. It includes spatial geometry columns and performance indexes:
- `states_uts`: Sovereign states and union territories.
- `district_grievance_routing`: 170 districts with local governance and 4-department routing.
- `helplines`: National, state, and district phone helplines with operating hours and E.164 sanitization.
- `complaints`: Grievance transactional log with `location_coordinates` (`GEOMETRY(Point, 4326)`), AI triage scores, and SLA target deadlines.
- `complaint_images`: Before/After images with EXIF coordinate extraction and DPDP privacy blurring flags.
- `complaint_status_logs`: Immutable audit trail for every status transition.
- `helpline_audit_flags`: Crowd-sourced discrepancy queue with 24-hour verification SLA.
- Spatial Index: `CREATE INDEX idx_complaints_location ON complaints USING GIST (location_coordinates);`

---

## 5. Security, Privacy, and Standards Compliance

- **DPDP Act 2023:** Citizen PII is sanitized. Image uploads trigger automated blurring flags for human faces and vehicle registration marks. Citizen mobile numbers require explicit 6-digit OTP verification.
- **GIGW 3.0:** High-contrast government authority header, bilingual indicators, accessible modal dialogs, and clear typographic hierarchy.
- **WCAG 2.1 AA:** Minimum 48x48dp touch targets on all interactive buttons, keyboard navigable controls, and semantic ARIA attributes.
