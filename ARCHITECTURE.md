# TRIAGEDX High-Level Architecture

## Technology Stack
- **Frontend**: Next.js 14+ (App Router) with TypeScript, React
- **Backend**: Next.js API Routes + Server Actions
- **Database**: PostgreSQL with Prisma ORM
- **Real-time**: WebSockets (via Socket.io or native WebSocket API)
- **File Storage**: AWS S3 / Cloudflare R2 / Local storage (for ID/insurance images)
- **Authentication**: NextAuth.js or similar for staff authentication

---

## Architecture Layers

### 1. Frontend (Next.js App Router)

**Public Routes (`/app`):**
- `/` - Landing/QR redirect page
- `/checkin` - P-Portal (Patient self-check-in)
  - `/checkin/demographics`
  - `/checkin/insurance`
  - `/checkin/complaint`
  - `/checkin/symptoms`
  - `/checkin/confirmation`
- `/checkin/staff` - Staff-assisted quick-check mode
- `/checkin/kiosk` - Kiosk-optimized variant

**Authenticated Routes (`/app/dashboard`):**
- `/dashboard` - S-Dashboard (Staff Dashboard)
  - `/dashboard/queue` - Main patient queue view
  - `/dashboard/patient/[visitId]` - Patient detail card
  - `/dashboard/verify/[visitId]` - Registrar quick-verify mode
- `/dashboard/admin` - Admin/Analytics panel
  - `/dashboard/admin/analytics`
  - `/dashboard/admin/config` - EWS thresholds, question flows

**Components:**
- `PPortal/` - Patient portal components (forms, multi-language support)
- `SDashboard/` - Staff dashboard components (queue, patient cards, filters)
- `Shared/` - Reusable UI components (buttons, inputs, modals)
- `EwsDisplay/` - EWS visualization components (color-coded badges, flags)

---

### 2. Backend (Next.js API Routes + Server Actions)

**API Routes (`/app/api`):**
- `/api/intake` - POST: Submit intake form (from P-Portal)
- `/api/visits` - GET: List visits (filtered/sorted), POST: Create visit
- `/api/visits/[visitId]` - GET: Visit details, PATCH: Update visit status
- `/api/visits/[visitId]/vitals` - POST: Record vitals
- `/api/visits/[visitId]/ews` - GET: EWS assessment, POST: Update verified EWS
- `/api/visits/[visitId]/verify` - POST: Registrar verification + EPIC push
- `/api/patients` - GET: Search patients, POST: Create/update patient profile
- `/api/upload` - POST: Upload ID/insurance images
- `/api/ws` - WebSocket endpoint for real-time dashboard updates

**Server Actions (`/app/actions`):**
- `intakeActions.ts` - Submit intake, calculate provisional EWS
- `visitActions.ts` - Update visit status, create visits
- `vitalsActions.ts` - Record vitals, trigger EWS recalculation
- `epicActions.ts` - Sync to EPIC (wraps integration layer)

**Services (`/lib/services`):**
- `EwsEngine.ts` - Pure function: `computeProvisionalEws(intakePayload) => EwsResult`
- `EwsConfig.ts` - Configurable thresholds, weights, question flows
- `RealtimeService.ts` - WebSocket manager for dashboard updates
- `NotificationService.ts` - Push updates to connected dashboard clients

**Business Logic (`/lib/business`):**
- `IntakeProcessor.ts` - Process intake submission, trigger EWS, create visit
- `VisitWorkflow.ts` - Status transitions, validation rules
- `DuplicateDetection.ts` - Check for existing patients (DOB + name matching)

---

### 3. Database (PostgreSQL + Prisma)

**Schema (`/prisma/schema.prisma`):**

```prisma
// Core entities as defined in context
model PatientProfile { ... }
model Visit { ... }
model IntakeForm { ... }
model EwsAssessment { ... }
model Vitals { ... }
model InsuranceProfile { ... }
model IdDocument { ... }
model StaffUser { ... }

// Additional supporting models
model QuestionFlow { ... } // Configurable symptom questions
model EwsConfig { ... } // EWS thresholds/weights
model AuditLog { ... } // PHI access logging for HIPAA
```

**Key Relationships:**
- `PatientProfile` 1:N `Visit`
- `Visit` 1:1 `IntakeForm`
- `Visit` 1:N `EwsAssessment` (provisional + verified)
- `Visit` 1:N `Vitals`
- `PatientProfile` 1:N `InsuranceProfile`
- `PatientProfile` 1:N `IdDocument`

**Indexes:**
- `Visit.arrivalTimestamp` (for sorting)
- `Visit.status` (for filtering)
- `EwsAssessment.level` (for risk-sorted queue)
- `PatientProfile.dob + firstName + lastName` (for duplicate detection)

---

### 4. Integration Layer (`/lib/integrations`)

**FHIR/EPIC Abstraction:**
- `EpicIntegrationService.ts` - Interface for EPIC sync
  - `syncPatientProfile(patientProfile): Promise<EpicPatientId>`
  - `syncVisit(visit, intake, ews, vitals): Promise<EpicEncounterId>`
  - `createCoverage(insuranceProfile): Promise<void>`
- `FhirMapper.ts` - Maps internal models to FHIR resources
  - `toFhirPatient(patientProfile): fhir.Patient`
  - `toFhirEncounter(visit): fhir.Encounter`
  - `toFhirObservation(ews): fhir.Observation`
- `EpicClient.ts` - Actual HTTP client for EPIC FHIR API (mockable for dev)

**File Storage:**
- `StorageService.ts` - Abstract interface for ID/insurance image storage
  - `uploadImage(file, patientId): Promise<url>`
  - `getImageUrl(id): Promise<url>`
- Implementations: `S3StorageService.ts`, `LocalStorageService.ts`

**External Services (Future):**
- `SmsService.ts` - Patient notifications (optional)
- `TranslationService.ts` - Multi-language support (if not client-side)

---

## Data Flow Examples

### Patient Self-Check-In Flow:
1. Patient scans QR → Frontend loads `/checkin`
2. Patient completes forms → Frontend calls `/api/intake` (POST)
3. Backend: `IntakeProcessor` creates `Visit`, `IntakeForm`, triggers `EwsEngine`
4. `EwsEngine` calculates provisional EWS → creates `EwsAssessment`
5. Backend emits WebSocket event → S-Dashboard updates in real-time
6. Response to patient: confirmation page

### Registrar Verification Flow:
1. Registrar opens `/dashboard/verify/[visitId]`
2. Frontend loads visit data via `/api/visits/[visitId]`
3. Registrar verifies ID/insurance → Frontend calls `/api/visits/[visitId]/verify`
4. Backend: `EpicIntegrationService.syncPatientProfile()` + `syncVisit()`
5. Visit status updated → WebSocket broadcast → Dashboard refreshes

### Nurse Triage Flow:
1. Nurse views queue on `/dashboard/queue` (sorted by EWS risk)
2. Nurse clicks patient card → Opens `/dashboard/patient/[visitId]`
3. Nurse enters vitals → Frontend calls `/api/visits/[visitId]/vitals`
4. Backend: Creates `Vitals` record, recalculates EWS (verified), updates `EwsAssessment`
5. Nurse marks "Roomed" → Visit status updated → EPIC sync triggered

---

## Security & Compliance

- **Authentication**: NextAuth.js for staff (JWT sessions)
- **Authorization**: Role-based access (NURSE, REGISTRAR, ADMIN)
- **PHI Encryption**: Encrypt sensitive fields at rest (Prisma field-level encryption or DB-level)
- **Audit Logging**: All PHI access logged to `AuditLog` table
- **HTTPS**: Enforced for all routes
- **File Upload**: Validate file types, scan for malware, store in secure bucket

---

## Real-time Updates

**WebSocket Strategy:**
- Server maintains WebSocket connections per dashboard client
- On visit creation/update, broadcast to all connected staff
- Client-side: React hooks (`useRealtimeVisits`) subscribe to updates
- Fallback: Polling if WebSocket unavailable

---

## Configuration & Flexibility

- **EWS Config**: Stored in DB (`EwsConfig` table) or environment variables
- **Question Flows**: JSON stored in `QuestionFlow` table, loaded dynamically
- **Language Support**: i18n config files, patient preference stored in `PatientProfile.languagePreference`

