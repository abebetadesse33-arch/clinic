# NiniMed — End-to-End Patient Workflow Note
**Scope**: Full Patient Journey · Registration → Discharge  
**Source**: Codebase analysis of `central-state-machine.ts`, `payment-gate-service.ts`, `notification-service.ts`, `case-workflow-service.ts`, `saga-orchestrator.ts`, `admission-workflow-service.ts`, `workflow-definitions.ts`  
**Date**: September 2026

---

## Architecture Overview

NiniMed's workflow engine is built on three interlocking systems:

| System | Purpose |
|---|---|
| **Central State Machine** (`CentralStateMachineService`) | Event-driven parallel workflow engine. Each encounter has one parent state and N parallel sub-workflow states (clinical, lab, pharmacy, imaging, etc.) |
| **Saga Orchestrator** (`SagaOrchestrator`) | Distributed transaction coordinator. Handles multi-step atomic operations with compensation rollback (e.g., if payment fails, cancel lab order) |
| **Notification Service** (`dispatchNotification`) | Real-time multi-channel dispatcher: in-app SSE (Server-Sent Events), Telegram Bot, push, and email. Respects role-based notification privilege matrix |

**Payment Gate Types** (configured per tenant via `PaymentGateService`):

| Gate | Default Fee (ETB) | Mode | Emergency Bypass |
|---|---|---|---|
| `registration` | 150 | **waived** (free by default) | ✅ |
| `case_intake` | 300 | soft_billing | ✅ |
| `appointment` | 500 | soft_billing | ✅ |
| `telehealth` | 600 | **hard_gate** | ✅ |
| `lab_analysis` | 850 | **hard_gate** | ✅ |
| `medication_dispense` | 450 | **hard_gate** | ❌ |
| `bed_admission` | 3,500 | **hard_gate** | ✅ |

**Payment Modes**:
- `hard_gate` — Service is **blocked** until payment confirmed. The state machine cannot advance.
- `soft_billing` — Service proceeds; invoice issued for post-care collection.
- `waived` — Free (zero fee or covered by subscription).
- `subscription_covered` — 100% benefit; system auto-confirms payment and advances state.

**Notification Channels**: In-app bell (SSE) · Telegram Bot · Push notification · SMS · Email

---

## Phase 1 — Patient Self-Registration

### Actors: Patient, System

```
Patient → Fills registration form (portal / mobile app / kiosk)
       → System triggers: PATIENT_SELF_REGISTERED or PATIENT_REGISTERED (staff-assisted)
```

### Steps

1. **Form Submission** — Patient provides: full name, DOB, gender, phone, email, emergency contact, allergies, insurance details.
2. **Duplicate Check** — System runs fuzzy match on name + DOB + phone to detect existing MRN. If match ≥ 80%, staff is prompted to confirm merge.
3. **Account Creation** — User account created in DB; Medical Record Number (MRN) auto-generated.
4. **Email/SMS Verification** (configurable):
   - Email verification: required by default
   - SMS/OTP: optional (toggled in Admin → Payment Workflow Settings)
   - Two-Factor Login: optional
5. **Registration Payment Gate** (`registration` gate):
   - Default: **waived** (ETB 150 — free)
   - If admin changes to `hard_gate`: patient must pay ETB 150 before proceeding
   - Emergency bypass: always allowed
6. **Digital Identity Issued** — QR code registration pass generated (`CREATE_REGISTRATION_PASS` action)
7. **Consent Collection** — HIPAA/clinical treatment digital consent signed and timestamped (`PATIENT_CONSENT_SIGNED`)

### 📣 Notifications Dispatched

| Recipient | Channel | Message |
|---|---|---|
| Patient | App + Email | "Welcome to NiniMed. Your account is ready. MRN: XXXX" |
| Care Coordinator | In-app | "New patient registered. Intake active." |
| System Admin | Audit log | Registration event with timestamp |

---

## Phase 2 — Appointment / Case Booking

### Actors: Patient, Front Desk, Care Coordinator

```
Trigger: APPOINTMENT_BOOKED or CASE_CREATED
```

### 2A — Booking an Outpatient Appointment

1. Patient selects: service type, preferred physician, date/time.
2. **Payment Gate** (`appointment` gate, `soft_billing`):
   - ETB 500 appointment fee — Service **proceeds immediately**; invoice generated for later collection.
   - If `hard_gate` mode configured by admin: patient must pay upfront (Telebirr / Chapa Card / Bank Transfer / Cash / Insurance).
3. Appointment confirmed; slot blocked in physician calendar.
4. **Smart Scheduling Optimizer** runs to minimize wait times and physician idle time.

### 📣 Notifications — Appointment Booking

| Recipient | Channel | Message |
|---|---|---|
| Patient | App + SMS | "Appointment confirmed for [Date/Time] with Dr. [Name]." |
| Physician | In-app | "New appointment scheduled: [Patient Name] — [Chief Complaint]." |
| Care Coordinator | In-app | "Appointment booked. Track on dashboard." |
| Patient (reminder) | App + SMS | Reminder sent at **T-24h** and **T-2h** before visit |

### 2B — Submitting a Clinical Case

1. Patient submits chief complaint, symptoms, and intake questionnaire (`PATIENT_QUESTIONNAIRE_SUBMITTED`).
2. **AI Triage** fires immediately (`AI_TRIAGE_COMPLETED`):
   - Gemini Clinical CDSS analyzes symptoms
   - Assigns priority: `routine` / `urgent` / `emergency`
   - Assigns severity: `mild` / `moderate` / `severe` / `very_severe`
3. **Case Record Created** in DB:
   - Case number: `CASE-XXXXXX-YYY`
   - Timeline initialized with "Case Registered" event
   - Status set to `triaged` if AI analysis provided
4. **Case Intake Payment Gate** (`case_intake`, `soft_billing`): ETB 300 — proceeds, bills later.

### 📣 Notifications — Case Submission

| Recipient | Channel | Message |
|---|---|---|
| Care Coordinator | In-app (high priority) | "📋 New Clinical Case: CASE-XXXXXX — URGENT priority. Triage active." |
| Patient | App | "Case submitted. AI triage complete. You will be assigned to a physician shortly." |

---

## Phase 3 — Patient Check-In & Provider Assignment

### Actors: Front Desk / Reception, Care Coordinator, Physician

### State: `NONE → CHECKED_IN`
**Event**: `PATIENT_CHECKED_IN`  
**SLA**: 15 minutes to be called by physician before supervisor is notified

1. Front desk confirms patient arrival at clinic.
2. Patient placed in provider queue (`queue-service.ts`).
3. Care Coordinator assigns physician based on:
   - Specialty match
   - Queue length optimization
   - Patient preference
4. **Provider Assignment** (`CaseWorkflowService.assignProvider`):
   - Assignment record created in DB
   - Case status → `assigned`

### State: `CHECKED_IN → WITH_DOCTOR`
**Event**: `DOCTOR_CALLED_PATIENT`  
**SLA**: 30 minutes for consultation before supervisor is notified

5. Physician opens patient chart and calls patient into examination room.
6. Case status → `in_consultation`

### 📣 Notifications — Check-In & Assignment

| Recipient | Channel | Message |
|---|---|---|
| Patient | App | "You have been assigned to Dr. [Name]. Please proceed to Room [X]." |
| Physician | In-app | "Patient [Name] is ready for consultation. Chief complaint: [...]." |
| Nurse | In-app | "New patient arriving in examination room [X]. Prepare vitals station." |

---

## Phase 4 — Physician Examination (Clinical Sub-Workflow)

### Actors: Physician, Nurse

### Sub-states (parallel clinical workflow):

```
CONSULTATION_STARTED
  → SYMPTOMS_RECORDED
    → VITALS_RECORDED (Nurse)
      → PHYSICAL_EXAM_RECORDED
        → AI_SUGGESTIONS_REVIEWED
          → DIAGNOSIS_RECORDED
            → TREATMENT_PLAN_CREATED
              → PLAN_APPROVED
```

### Step-by-Step

**Step 4.1 — Consultation Started**
- Event: `CONSULTATION_STARTED`
- Physician opens encounter; clinical encounter timer starts.
- SLA: 30 minutes

**Step 4.2 — Nurse Records Vitals**
- Event: `VITALS_RECORDED`
- Nurse enters: BP, HR, RR, Temperature, SpO₂, Weight, Height
- Morse Fall Scale + Braden Pressure Score recorded
- Pain score (0–10) documented
- SLA: 5 minutes
- AI auto-suggests nursing diagnoses

**Step 4.3 — Symptoms Recorded**
- Event: `SYMPTOMS_RECORDED`
- Physician or nurse records structured chief complaint + symptoms
- AI differential suggestions surface alongside

**Step 4.4 — Physical Examination**
- Event: `PHYSICAL_EXAM_RECORDED`
- Organ-system findings documented (CNS, Cardiovascular, Respiratory, etc.)

**Step 4.5 — AI Clinical Copilot Review**
- Event: `AI_SUGGESTIONS_REVIEWED`
- AI Copilot (`ENGAGE_AI_COPILOT` action) generates:
  - Ranked differential diagnoses (ICD-10 / SNOMED coded)
  - Evidence-based treatment protocol suggestions (WHO / CPIC guidelines)
  - Drug interaction pre-check
  - Lab test suggestions
  - Imaging suggestions
- Physician reviews and accepts/modifies
- SLA: 15 minutes to review before supervisor notified
- Voice-to-text NLP scribe running simultaneously → SOAP note auto-drafted

**Step 4.6 — Diagnosis Recorded**
- Event: `DIAGNOSIS_RECORDED`
- Physician confirms ICD-10/SNOMED diagnosis
- SLA: 5 minutes

**Step 4.7 — Treatment Plan Created & Approved**
- Events: `TREATMENT_PLAN_CREATED` → `PLAN_APPROVED`
- Physician drafts care plan goals and multidisciplinary orders:
  - Lab orders
  - Imaging orders
  - Medication orders
  - Dietitian / physiotherapy / psychology referrals
  - Nursing orders
- Electronic signature applied → orders released

### 📣 Notifications — Clinical Examination

| Recipient | Channel | Message |
|---|---|---|
| Patient | App | "Your doctor has reviewed your case and created a care plan. Check your patient portal." |
| Care Coordinator | In-app | "Treatment plan approved for [Patient]. Lab/pharmacy orders active." |
| Nurse | In-app | "Care plan approved. Nursing orders assigned." |

---

## Phase 5 — Laboratory Order (with Payment Gate)

### Actors: Physician, Patient, Front Desk, Lab Technician, System

This phase runs as a **parallel workflow** alongside clinical work — the patient can have lab, pharmacy, and imaging workflows all running simultaneously.

### Lab Saga: `SagaOrchestrator.executeLabOrderPaymentSaga()`

```
PLAN_APPROVED
  → LAB_ORDERED (SLA: 5 min to phlebotomy)
    → LAB_PAYMENT_PENDING (SLA: 10 min)
      → LAB_PAID ──────────────────────── (payment gate clears)
        → SAMPLE_COLLECTION_PREPARED (SLA: 5 min)
          → SAMPLE_COLLECTED (SLA: 10 min)   [PARENT: LAB_IN_PROGRESS]
            → SAMPLE_PROCESSING (SLA: 40 min)
              → LAB_RESULTED
                → AI_ANALYSIS_COMPLETED      [PARENT: WITH_DOCTOR]
```

### Step-by-Step

**Step 5.1 — Physician Orders Labs**
- Event: `LAB_ORDER_CREATED`
- Physician selects test panel(s): CBC, Metabolic Panel, Lipid Profile, LFT, RFT, etc.
- Lab order record created in DB, linked to encounter
- Parent state → `LAB_PENDING`

**Step 5.2 — Lab Payment Gate (CONCURRENT with patient notification)**

> [!IMPORTANT]
> The lab payment gate is a **`hard_gate`** by default (ETB 850). The lab technician is **BLOCKED** from collecting samples or submitting results until payment is confirmed.

**Two things happen CONCURRENTLY:**

| Stream A — Patient Payment Request | Stream B — Lab Technician Notified |
|---|---|
| System generates invoice | Lab technician receives lab order on their worklist |
| Patient notified of payment due | Lab technician sees order **LOCKED** (🔒 payment pending) |
| Patient opens payment UI | Lab tech cannot collect sample or submit result |
| Patient selects method: Telebirr / Chapa / Bank / Cash / Insurance | System shows: "⚠️ Payment not confirmed. Collection blocked." |
| Patient confirms payment | — |

**Payment methods accepted**: Telebirr · Chapa Card · Bank Transfer · Cash (with front desk receipt) · Insurance

**Special cases:**
- **Subscription covered** → System auto-dispatches `LAB_PAYMENT_CONFIRMED`, skipping patient action
- **Emergency** → `allowEmergencyBypass: true` → state advances immediately; bill deferred
- **Bank transfer** → Requires admin verification → front desk manually confirms receipt

Event: `LAB_PAYMENT_INITIATED` → state: `LAB_PAYMENT_PENDING`  
Event: `LAB_PAYMENT_CONFIRMED` → state: `LAB_PAID`

**Step 5.3 — Payment Confirmed → Lab Technician Unlocked**

> [!NOTE]
> Upon `LAB_PAYMENT_CONFIRMED`, the lab technician's order card **unlocks** in the LIS worklist. They can now proceed.

**Step 5.4 — Specimen Collection**
- Event: `SAMPLE_COLLECTION_PREPARED` — Tubes, vacutainers, barcode labels prepared
- Event: `SAMPLE_COLLECTED` — Specimen drawn; barcode scanned against patient MRN
- `requiresPaymentClearance: true` — system enforces gate on this transition
- Parent state → `LAB_IN_PROGRESS` (SLA: 60 minutes total)

**Step 5.5 — Sample Processing**
- Event: `SAMPLE_PROCESSING_STARTED`
- Specimen loaded into analyzer / incubator
- SLA: 40 minutes for lab technician

**Step 5.6 — Lab Results Ready**
- Event: `LAB_RESULT_ENTERED`
- Lab technician verifies analytical values against biological reference ranges
- Abnormal/critical values flagged automatically
- If **CRITICAL value** detected: `BIOCHEMICAL_CRITICAL_VALUE` trigger fires → escalation pipeline:
  - STAT alert to attending physician
  - STAT alert to bedside nurse  
  - Page on-call staff
  - Emergency telehealth room created
- Parent state → `AI_ANALYSIS_PENDING`

**Step 5.7 — AI Lab Analysis**
- Event: `AI_LAB_ANALYSIS_COMPLETED`
- AI performs: delta checks, anion gap calculation, organ function interpretation, drug level review, pharmacogenomic alerts
- Results sent to physician chart
- Parent state → `WITH_DOCTOR` (physician can now review results)

### 📣 Notifications — Lab Workflow

| Event | Recipient | Channel | Message |
|---|---|---|---|
| Lab ordered | Patient | App + SMS | "Lab tests ordered by Dr. [Name]. Invoice: ETB 850. Please pay to proceed." |
| Lab ordered | Lab Technician | In-app | "New lab order received: [Tests]. Status: 🔒 Payment Pending." |
| Payment confirmed | Lab Technician | In-app (high priority) | "✅ Payment confirmed for [Patient]. Collection unlocked. Proceed." |
| Payment confirmed | Patient | App | "Lab payment received. Phlebotomist will collect your sample shortly." |
| Payment failed | Patient | App + SMS | "⚠️ Lab payment failed. Please retry to proceed with testing." |
| Sample collected | Patient | App | "Sample collected. Results expected in ~40 minutes." |
| Results ready | Physician | In-app (high priority) | "📊 Lab results ready for [Patient]. AI analysis complete. Review now." |
| Results ready | Patient | App | "Your lab results are available. Your doctor will review them shortly." |
| Critical value | Physician | In-app (CRITICAL) + Push | "🚨 CRITICAL lab value for [Patient]: [Value]. Immediate review required." |
| Critical value | Nurse | In-app (CRITICAL) | "🚨 STAT: Critical lab value. Bedside reassessment required." |

---

## Phase 6 — Physician Consults Patient (AI-Supported)

### Actors: Physician, Patient, AI Copilot

**Trigger**: `AI_LAB_ANALYSIS_COMPLETED` → Parent state returns to `WITH_DOCTOR`

1. Physician opens lab result review screen with AI interpretations.
2. **AI Clinical Copilot** provides:
   - Natural language explanation of abnormal values
   - Differential diagnosis revision based on new data
   - Evidence-based treatment adjustment suggestions
   - Drug interaction cross-check with any proposed medications
   - Pharmacogenomic allele alerts (if genetic testing done)
3. Physician reviews results with patient (in-person or via telemedicine video).
4. **Telemedicine option** (`hard_gate`, ETB 600):
   - WebRTC room created → patient sent access link
   - Voice-to-text scribe runs during consultation
   - Post-visit SOAP note auto-generated
5. Physician updates diagnosis if needed → `DIAGNOSIS_RECORDED`
6. Physician creates/updates treatment plan.

### 📣 Notifications — AI-Supported Consult

| Recipient | Channel | Message |
|---|---|---|
| Patient | App + SMS | "Dr. [Name] is ready to discuss your results. Join your video consultation: [link]" |
| Patient (10 min warning) | App | "Your consultation starts in 10 minutes." |

---

## Phase 7 — Physician Orders Medication

### Actors: Physician, Patient, Pharmacist, Nurse

### Pharmacy Saga: `SagaOrchestrator.executeMedicationSaga()` (inferred)

```
DIAGNOSIS_RECORDED / AI_ANALYSIS_COMPLETED
  → MEDICATION_ORDERED            [PARENT: MEDICATION_PENDING, SLA: 5 min]
    → MEDICATION_PAYMENT_PENDING  (SLA: 10 min)
      → MEDICATION_PAID ──────── (payment gate clears)
        → PHARMACIST_REVIEW_STARTED  (SLA: 10 min)
          → PHARMACIST_REVIEW_COMPLETED  [PARENT: PHARMACY_IN_PROGRESS, SLA: 15 min]
            → DISPENSING  (SLA: 10 min, requires payment clearance)
              → DISPENSED
                → MEDICATION_ADMINISTERED (Nurse, inpatient only)
```

### Step-by-Step

**Step 7.1 — Physician Signs Prescription**
- Event: `MEDICATION_ORDER_CREATED` (trigger: `PRESCRIPTION_SIGNED`)
- Physician orders: drug name, dose, route, frequency, duration
- AI drug interaction check runs automatically
- If **controlled substance**: dual sign-off required
- E-prescription transmitted to pharmacy system
- Parent state → `MEDICATION_PENDING`

**Step 7.2 — CONCURRENT: Patient and Pharmacist Notified**

Two things happen simultaneously:

| Stream A — Patient | Stream B — Pharmacist |
|---|---|
| Patient receives payment notification | Pharmacist receives prescription on worklist |
| Invoice generated: ETB 450 | Order shows: 🔒 Payment Pending |
| Patient selects payment method | Pharmacist cannot dispense |

**Step 7.3 — Medication Payment Gate (HARD GATE)**

> [!IMPORTANT]
> `medication_dispense` gate has `allowEmergencyBypass: false`. This is the **only gate with no emergency bypass**. Payment is always mandatory before dispensing.

- Patient pays via Telebirr / Chapa / Bank / Cash / Insurance
- Event: `MEDICATION_PAYMENT_CONFIRMED` → state: `MEDICATION_PAID`

**Step 7.4 — Patient Confirms Payment**
- Payment webhook received (Telebirr/Chapa) or front desk confirms cash
- State: `MEDICATION_PAID` → Pharmacist worklist **unlocks**

**Step 7.5 — Pharmacist Review**
- Event: `PHARMACIST_REVIEW_STARTED`
- Pharmacist performs:
  - Drug interaction check (DDI screening)
  - Renal/hepatic dose adjustment review
  - Allergy profile cross-reference
  - Barcode verification (5 Rights: patient, drug, dose, route, time)
  - Medication reconciliation with home medications
- SLA: 10 minutes before supervisor notified

- Event: `PHARMACIST_REVIEW_COMPLETED`
- Pharmacist approves or modifies prescription with safety clearance
- Parent state → `PHARMACY_IN_PROGRESS`
- SLA: 15 minutes before manager notified

**Step 7.6 — Dispensing**
- Event: `DISPENSING_STARTED`
- Medications picked, packaged, labeled with instructions
- `requiresPaymentClearance: true` enforced by state machine
- SLA: 10 minutes

- Event: `MEDICATION_DISPENSED`
- Medications handed to:
  - **Outpatient**: directly to patient with oral counseling
  - **Inpatient**: transferred to floor nurse for bedside administration

**Step 7.7 — Nurse Administration (Inpatient)**
- Event: `MEDICATION_ADMINISTERED`
- Nurse scans barcode at bedside; dose, time, and nurse ID recorded
- Actors: nurse / doctor

### 📣 Notifications — Pharmacy Workflow

| Event | Recipient | Channel | Message |
|---|---|---|---|
| Prescription signed | Patient | App + SMS | "Dr. [Name] prescribed [Medication]. Invoice: ETB 450. Pay to proceed." |
| Prescription signed | Pharmacist | In-app | "New prescription received: [Medication] for [Patient]. 🔒 Payment Pending." |
| Payment confirmed | Pharmacist | In-app (high priority) | "✅ Payment confirmed for [Patient]. Dispense authorized. Proceed." |
| Payment confirmed | Patient | App | "Pharmacy payment received. Your medication is being prepared." |
| Payment failed | Patient | App + SMS | "⚠️ Pharmacy payment failed. Please retry. Your prescription is on hold." |
| Review complete | Patient | App | "Your medication is ready for pickup at the pharmacy counter." |
| Dispensed | Patient | App + SMS | "💊 [Medication] dispensed. Pickup at Pharmacy Counter [X]. Dose instructions attached." |
| Dispensed (inpatient) | Nurse | In-app | "Medication ready for [Patient] in Room [X]. Administer as ordered." |
| Administered | Physician | In-app | "Medication administered to [Patient] at [Time]. Charted." |

---

## Phase 8 — Results Return to Patient and Physician

Both lab results (Phase 5) and prescription status (Phase 7) flow back to:
- **Patient** — results visible in Patient Portal → Health Records
- **Physician** — lab results card in Clinical Dashboard with AI interpretation overlay
- **Care Team** — entire care team notified via `dispatchParticipantNotification` which auto-resolves to patient's primary doctor + all careTeamMembers in DB

---

## Phase 9 — Allied Health & Parallel Specialty Workflows

After `PLAN_APPROVED`, additional parallel workflows may be running simultaneously:

| Specialty | Trigger Event | Workflow |
|---|---|---|
| Dietitian | `NUTRITION_ASSESSMENT_ORDERED` | Nutrition assessment → meal plan → approved |
| Physiotherapy | `THERAPY_ASSESSMENT_ORDERED` | Assessment → therapy plan |
| Psychologist | `PSYCHOLOGICAL_ASSESSMENT_ORDERED` | Assessment → therapy sessions |
| Imaging / Radiology | `IMAGING_ORDERED` → `IMAGING_REPORT_SIGNED` | DICOM study → radiologist report |
| Social Work | `SOCIAL_WORK_ASSESSMENT_ORDERED` | Psychosocial assessment |
| Genetics | `GENETIC_TEST_ORDERED` → `GENETIC_RESULT_READY` | Sequencing → pharmacogenomic advisory |

All parallel workflows:
- Run in their own sub-state within the encounter
- Have independent payment gates (where applicable)
- Generate their own notifications
- Contribute to the unified patient timeline

---

## Phase 10 — Encounter Completion & Discharge

### Actors: Physician, Care Coordinator, Admin

**Condition to close encounter**: All parallel workflows completed (or explicitly waived).

**Event**: `ENCOUNTER_COMPLETED`  
**Allowed from**: `WITH_DOCTOR`, `PLAN_APPROVED`, `DISPENSED`, `AI_ANALYSIS_COMPLETED`  
**Allowed roles**: `doctor`, `care_coordinator`, `admin`  
**Parent state** → `COMPLETED`

### Outpatient Discharge Steps

1. Physician generates discharge summary + patient education materials.
2. Prescription summary sent to patient.
3. Follow-up appointment scheduled (if needed).
4. Post-visit satisfaction survey dispatched (`SEND_SATISFACTION_SURVEY`).
5. Revenue Cycle Management (RCM) claim engine runs:
   - Itemized invoice finalized
   - Insurance claim submitted (EDI 837)
   - Patient ledger updated

### Inpatient Discharge Steps (Full Admission)

1. `DISCHARGE_INITIATED` — Discharge planning summary started.
2. Medication reconciliation — home meds harmonized with inpatient orders.
3. Patient education session (disease, meds, follow-up).
4. Billing clearance check.
5. Bed released from census board.
6. `DISCHARGE_COMPLETED` — Patient exits facility.
7. If chronic condition requiring home monitoring:
   - RPM enrollment triggered (`ENROLL_IN_RPM_PROGRAM`)
   - Bluetooth devices provisioned + linked
   - Day-3 AI follow-up voice call scheduled (`TRIGGER_DISCHARGE_FOLLOW_AI`)

### 📣 Notifications — Discharge

| Recipient | Channel | Message |
|---|---|---|
| Patient | App + Email | "Your visit summary and prescription are available. Next appointment: [Date]." |
| Patient | App | "📝 Please rate your experience with Dr. [Name]." (survey) |
| Care Coordinator | In-app | "Encounter [ID] closed. Billing submitted." |
| Patient (Day 3, inpatient) | Phone/Chat (AI) | AI DischargeFollow agent calls: "How are you feeling? Any concerns?" |

---

## SLA Monitoring & Escalation Matrix

All states have defined SLA timers. When a state exceeds its SLA, the system automatically escalates:

| State | SLA | Escalation Action |
|---|---|---|
| `CHECKED_IN` | 15 min | Notify supervisor → assigns next available physician |
| `WITH_DOCTOR` | 30 min | Notify supervisor |
| `LAB_PAYMENT_PENDING` | 10 min | Front desk alert → offer cash reconciliation |
| `LAB_IN_PROGRESS` (total) | 60 min | Notify lab manager |
| `SAMPLE_PROCESSING` | 40 min | Notify lab manager |
| `MEDICATION_PAYMENT_PENDING` | 10 min | Front desk alert |
| `PHARMACY_IN_PROGRESS` | 15 min | Notify supervisor |
| `DISPENSING` | 10 min | Notify supervisor |
| `CONSULTATION_STARTED` | 30 min | Notify supervisor |
| `AI_SUGGESTIONS_REVIEWED` | 15 min | Notify supervisor |

**SLA Breach Record**: Stored in `stateSlaViolations` table for audit.

---

## Edge Cases & Special Flows

### A — Payment Failure (Lab or Pharmacy)

```
PAYMENT_FAILED trigger fires
  → Invoice re-generated
  → Patient re-notified (retry link)
  → Lab tech / Pharmacist ORDER REMAINS LOCKED
  → Front desk notified to assist
  → If 3 failed attempts: escalated to Finance team
```

### B — Emergency Override

```
isEmergency = true OR globalPolicy = "emergency_override"
  → ALL payment gates bypassed immediately
  → bypassReason logged: "Emergency clinical protocol override. Payment deferred to post-care billing."
  → Services proceed without waiting for payment
  → Post-care consolidated invoice generated
```

### C — Subscription Coverage

```
hasActiveSubscription = true
  → System automatically dispatches LAB_PAYMENT_CONFIRMED / MEDICATION_PAYMENT_CONFIRMED
  → No patient action required
  → bypassReason: "Covered 100% under active NiniMed Health Shield Subscription."
  → Lab tech / Pharmacist immediately unlocked
```

### D — Critical Lab Value

```
BIOCHEMICAL_CRITICAL_VALUE / LAB_RESULT_CRITICAL trigger fires
  → FLAG_CRITICAL_BIOCHEMICAL_VALUE: Red STAT indicator in EHR
  → ALERT_ATTENDING_PHYSICIAN (CRITICAL push notification)
  → ALERT_ATTENDING_NURSE (STAT)
  → PAGE_ON_CALL_STAFF
  → REFER_TO_BIOCHEMIST (clinical biochemist notified)
  → CREATE_TELEHEALTH_ROOM (emergency video bridge)
  → SEND_TELEHEALTH_LINK (to patient / emergency contact)
  → Compliance audit log: timestamp of critical value communication (<15 min)
```

### E — No-Show Recovery

```
PATIENT_NO_SHOW / TELEHEALTH_NO_SHOW trigger
  → Provider calendar slot cleared
  → Reschedule SMS link sent automatically
  → AI-personalized follow-up email drafted
  → No-show fee invoice generated (if policy enabled)
  → Patient navigator task assigned if 2+ consecutive no-shows
```

### F — Drug Interaction Detected

```
AI_DRUG_INTERACTION_FLAGGED trigger
  → Prescription BLOCKED from signing
  → Alert to prescribing physician
  → AI suggests safer alternative drug
  → Pharmacist notified for reconciliation review
  → Event logged in patient lifetime medication record
```

---

## Notification System Architecture

All notifications flow through `dispatchNotification()`:

```
dispatchNotification(payload)
  │
  ├── 1. Resolve Recipients
  │     ├── Direct userId (explicit)
  │     ├── participantPatientId → patient + primaryDoctor + careTeam members
  │     ├── targetRole → all users with that role (e.g., all "lab_technician")
  │     └── Fallback: system_admin if no recipient resolved
  │
  ├── 2. Check Role Privileges
  │     └── notificationPrivileges table: can admin disable category per role?
  │
  ├── 3. Insert DB Records (notifications table)
  │     └── SSE broadcast via notificationBus EventEmitter
  │
  └── 4. Multi-Channel Delivery
        ├── Telegram Bot (if user linked Telegram account + notifications enabled)
        └── (Future: Push / SMS / Email via external gateway)
```

**Notification Categories**: `appointments` · `orders` · `billing` · `clinical_alerts` · `auth_shifts` · `system`

**Priority Levels**: `low` · `normal` · `high` · `critical`

---

## Complete State Summary (Linear View)

```
[Patient]
  ↓ REGISTRATION (waived/hard gate)
  ↓ PATIENT_SELF_REGISTERED
  ↓ Consent signed
  ↓ APPOINTMENT BOOKED (soft billing)
  ↓ CASE SUBMITTED → AI Triage → TRIAGED
  ↓ CHECK-IN → CHECKED_IN
  ↓ DOCTOR CALLED → WITH_DOCTOR
  ↓
  ├── [Clinical Sub-workflow]
  │   CONSULTATION_STARTED
  │   → VITALS_RECORDED (Nurse)
  │   → SYMPTOMS_RECORDED
  │   → PHYSICAL_EXAM_RECORDED
  │   → AI_SUGGESTIONS_REVIEWED (AI Copilot)
  │   → DIAGNOSIS_RECORDED
  │   → TREATMENT_PLAN_CREATED
  │   → PLAN_APPROVED ──────────────────────────────────────────────────┐
  │                                                                      │
  ├── [Lab Sub-workflow, runs in parallel] ←──────────────────────────── ┘
  │   LAB_ORDERED → LAB_PAYMENT_PENDING ← Patient pays ← Lab tech locked
  │   → LAB_PAID → SAMPLE_COLLECTION_PREPARED → SAMPLE_COLLECTED
  │   → SAMPLE_PROCESSING → LAB_RESULTED → AI_ANALYSIS_COMPLETED
  │                                                                      │
  ├── [Pharmacy Sub-workflow, runs in parallel] ←─────────────────────── ┘
  │   MEDICATION_ORDERED → MEDICATION_PAYMENT_PENDING ← Patient pays
  │   → MEDICATION_PAID → PHARMACIST_REVIEW_STARTED
  │   → PHARMACIST_REVIEW_COMPLETED → DISPENSING → DISPENSED
  │   → MEDICATION_ADMINISTERED (Nurse, inpatient)
  │
  ├── [Imaging, Nutrition, Therapy, Genetics — parallel, as ordered]
  │
  ↓ All parallel workflows complete
  ↓ ENCOUNTER_COMPLETED → COMPLETED
  ↓ Post-visit survey + billing + RCM claim
  ↓ (Inpatient) DISCHARGE_INITIATED → DISCHARGE_COMPLETED
  ↓ (Chronic) RPM enrollment + AI Day-3 follow-up
```

---

## Admin Controls (Payment Workflow Settings)

Accessible at `/admin/payment-workflow` (system_admin / tenant_admin only):

| Setting | Default | Effect |
|---|---|---|
| `enforceLabPaymentGate` | ✅ ON | Lab tech blocked until payment |
| `enforcePharmacyPaymentGate` | ✅ ON | Pharmacist blocked until payment |
| `autoNotifyLabOnPayment` | ✅ ON | Auto-push to lab tech when patient pays |
| `autoNotifyPharmacyOnPayment` | ✅ ON | Auto-push to pharmacist when patient pays |
| `allowEmergencyOverride` | ✅ ON | All gates bypassed in emergency |
| `globalFreeMode` | ❌ OFF | All gates waived (demo/sandbox) |
| `allowCashReconciliation` | ✅ ON | Front desk can mark cash as paid |
| `requireEmailVerification` | ✅ ON | Patient must verify email on registration |
| `requireSmsVerification` | ❌ OFF | OTP via SMS (optional) |
| `enableTwoFactorLogin` | ❌ OFF | 2FA for staff login |
