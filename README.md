# NiniMed Enterprise CDSS v3.0 (Multidisciplinary & Multimodal AI Edition)
### Enterprise Multimodal Clinical Decision Support, Multidisciplinary Collaboration & E-Prescribing Platform

⚠️ **NEW: Implementation Documentation** ⚠️

This repository now includes a **complete technical specification** for building enhanced dynamic dashboards, a referral system, patient portal, and admin workflows.

📚 **Start Here:**
- [**SUMMARY.md**](SUMMARY.md) - Visual overview (5 min)
- [**DOCUMENTATION_INDEX.md**](DOCUMENTATION_INDEX.md) - Navigation by role (5 min)
- [**IMPLEMENTATION_KICKOFF.md**](IMPLEMENTATION_KICKOFF.md) - Executive summary (5 min)
- [**IMPLEMENTATION_GUIDE.md**](IMPLEMENTATION_GUIDE.md) - Complete technical spec (2-3 hours)
- [**QUICK_START_PHASE1A.md**](QUICK_START_PHASE1A.md) - Week 1-2 execution (30 min)

**Current Status**: Phase 1A (Widget Data Layer) ready to start immediately. Timeline: 12-15 months (6 phases).

---

## Current Platfor

NiniMed Enterprise is a production-ready, multi-tenant Clinical Decision Support System (CDSS) built on **Next.js 14+ (App Router)**, **Bun**, **Docker**, **Drizzle ORM**, **PostgreSQL 16 (pgvector)**, and **Google Gemini 1.5 Pro**.

It unites the entire **multidisciplinary healthcare team** (Physicians, Nurse Practitioners, Nurses, Pharmacists, Physiotherapists, Occupational Therapists, Dietitians, Social Workers, Radiologists, Pathologists, Genetic Counselors, and Respiratory Therapists) with **multimodal AI reasoning** across text, images, audio, 12-lead ECG signals, and genomic VCF panels.

---

## 👥 Multidisciplinary Healthcare Roles & Workstations

| Healthcare Role | Specialized Functionality & Dashboard | AI Decision Support Features |
|---|---|---|
| **Physician (MD/DO) / NP** | Triage, diagnostics, electronic prescribing, diagnostic orders, referrals | Differential diagnoses, cardiorenal drug selection, cross-modal evidence attribution |
| **Registered Nurse (RN)** | Vitals entry, nursing care directives, Braden/Morse risk scales | Nursing diagnoses, vitals monitoring protocols, fall risk precautions, patient education |
| **Clinical Pharmacist (PharmD)** | Medication reconciliation, DDI safety, renal dosing adjustments | Real-time DDI screening, eGFR renal dosing caps, CPIC Level 1A PGx antiplatelet warnings |
| **Physiotherapist (PT)** | Berg balance score (0-56), gait speed (m/s), mobility rehab | Cardiopulmonary conditioning regimens, progressive resistance exercises, fall prevention |
| **Clinical Dietitian (RD)** | Medical Nutrition Therapy (MNT), calorie/sodium/potassium caps | Renal-diabetic meal planning, low-cost pantry staple strategies for food deserts |
| **Medical Social Worker (LCSW)** | SDOH vulnerability screening, community resources, discharge prep | Social risk factor identification, expedited SNAP enrollment, medical transit cards |
| **Genetic Counselor (CGC)** | Genomic VCF variant interpretation, pedigree analysis | CPIC guideline counseling points, patient-friendly variant explanations |
| **Respiratory Therapist (RRT)** | Arterial Blood Gas (ABG) panels, ventilator settings, PFTs | ABG parameter interpretation, airway clearance regimens, pulmonary rehabilitation |
| **Clinical Psychologist (PsyD)** | PHQ-9, GAD-7, MoCA psychometric screening, adherence risk | Behavioral activation protocols, CBT strategies for chronic illness adaptation |
| **Molecular Biologist (PhD)** | Biomarker reference ranges, CPIC guideline curation | Evidence-grade biological rule authoring and pharmacogenomic curation |

---

## 🌟 Core Collaborative Modules

1. **Unified Shared Care Plan** ([care-plan/page.tsx](file:///c:/Users/abebe/Desktop/Clinic/src/app/care-plan/page.tsx)):
   - Single, synchronized care plan where all team members view and sign off on role-tagged clinical directives.
2. **Interdisciplinary Task Delegation Board** ([tasks/page.tsx](file:///c:/Users/abebe/Desktop/Clinic/src/app/tasks/page.tsx)):
   - Cross-functional task assignment for consults (e.g. Physician orders Dietitian MNT assessment and Social Work SNAP enrollment).
3. **Clinical Team Messaging Channel** ([messages/page.tsx](file:///c:/Users/abebe/Desktop/Clinic/src/app/messages/page.tsx)):
   - Real-time, HIPAA-compliant patient consultation threads with urgent consult flags.
4. **Specialist Role Suites**:
   - **Pharmacy Hub** ([pharmacy/page.tsx](file:///c:/Users/abebe/Desktop/Clinic/src/app/pharmacy/page.tsx)): DDI screener, eGFR renal calculator, and PGx antiplatelet guidance.
   - **Physiotherapy Studio** ([physiotherapy/page.tsx](file:///c:/Users/abebe/Desktop/Clinic/src/app/physiotherapy/page.tsx)): Berg balance score and progressive resistance exercise builder.
   - **Nutrition Suite** ([nutrition/page.tsx](file:///c:/Users/abebe/Desktop/Clinic/src/app/nutrition/page.tsx)): MNT meal structure with food desert budget accommodations.
   - **Social Work Hub** ([social-work/page.tsx](file:///c:/Users/abebe/Desktop/Clinic/src/app/social-work/page.tsx)): Community aid, SNAP, and transportation vouchers.
5. **Multimodal Media & Signals Inspector** ([MultimodalMediaViewer.tsx](file:///c:/Users/abebe/Desktop/Clinic/src/components/MultimodalMediaViewer.tsx)):
   - High-precision 12-lead ECG grid, audio lung crackles waveform player, PA Chest X-ray viewer, and targeted VCF variant table.
6. **Physician Sign-Off Console** ([review/[suggestionId]/page.tsx](file:///c:/Users/abebe/Desktop/Clinic/src/app/review/%5BsuggestionId%5D/page.tsx)):
   - 21 CFR Part 11 electronic signature authorization with side-by-side multimodal evidence verification.

---

## 🧩 Dynamic Role-Based Dashboards & Modular Widget Registry

NiniMed features a **fully dynamic, data-driven widget registry** ([WidgetRegistry.tsx](file:///c:/Users/abebe/Desktop/Clinic/src/components/widgets/WidgetRegistry.tsx)) powering customized workspaces for each clinical role:

1. **`MyPatientsWidget`**: Cohort search, live triage priority indicators (`critical`, `urgent`, `routine`), and allergy count.
2. **`PendingAiReviewsWidget`**: Biopsychosocial AI review queue with 1-click `Accept Full`, `Modify`, and `Reject` actions.
3. **`CriticalAlertsWidget`**: Live alert monitor for `eGFR < 45`, `HbA1c > 8.5%`, `CYP2C19 *2/*2` Warfarin/Clopidogrel PGx flags, and Stage 2 HTN.
4. **`VitalsDueWidget`**: Nursing shift vitals schedule with overdue pulsing beacon and rapid modal recording.
5. **`MedicationAdministrationWidget`**: 5-Right MAR schedule with `Give` and `Hold` actions and clinical hold reasons.
6. **`DrugInteractionsWidget`**: Live candidate DDI screener, eGFR renal dosing calculator, and PGx genotype warnings.
7. **`PhysiotherapyRehabWidget`**: 14-item Berg Balance Scale interactive scorer with automatic fall risk calculation and progressive exercise builder.
8. **`NutritionPlanWidget`**: Renal MNT macronutrient bars (< 2,000 mg Na, K limits) and Food Desert resource locator.
9. **`SdohMatrixWidget`**: Social determinants of health evaluation across 5 domains with SNAP, housing, and transport trackers.
10. **`ImagingWorklistWidget`**: DICOM/X-ray worklist with radiologist findings, impressions, and quick sign-off.
11. **`AbgAnalysisWidget`**: Arterial Blood Gas automated interpretation (acidemia, hypoxemia, alkalemia) and O₂ delivery titrator.
12. **`PsychometricsWidget`**: Longitudinal PHQ-9 and GAD-7 bar chart trends with personalized CBT directives.
13. **`BiologicalRulesWidget`**: CPIC guideline and pharmacogenomic rule authoring with Level 1A evidence badges.
14. **`CareGapsWidget`**: Closed-loop referral management for outpatient follow-up.
15. **`AuditStreamWidget`**: Live 21 CFR Part 11 immutable audit ledger with SHA-256 digital signature hashes and role filters.
16. **`PatientPortalOverviewWidget`**: Patient-friendly summary with health goals, medications, lab trends, and upcoming appointments.

### 🎛️ Admin Dashboard Layout Customizer
- **Interactive Drawer**: Drag-and-drop widget reordering, column span adjustments (1-3 cols), and refresh interval configurator (10s to 10m).
- **Audit-Logged Persistence**: Layout modifications are tracked with 21 CFR Part 11 audit records.

---

## 🔄 Cross-Role Clinical Workflows

1. **Patient Admission Workflow** ([admission/page.tsx](file:///c:/Users/abebe/Desktop/Clinic/src/app/workflows/admission/page.tsx)):
   - 6-step gated pipeline: Triage → Vitals → Physician AI Workup → Pharmacy Clearance → SDOH Assessment → Interdisciplinary Care Plan.
2. **Multidisciplinary Case Conference Hub** ([case-conference/page.tsx](file:///c:/Users/abebe/Desktop/Clinic/src/app/workflows/case-conference/page.tsx)):
   - Collapsible AI Pre-Conference Clinical Synthesis (94.2% confidence).
   - Live multi-specialist discussion with presence indicators.
   - Cross-role action item distributor with priority tagging and completion tracking.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Runtime & Tooling** | **Bun** (Ultra-fast JavaScript runtime & package manager) |
| **Containerization** | **Docker & Docker Compose** (Multi-stage Alpine image, pgvector, Redis) |
| **Framework** | Next.js 14 (App Router, Standalone Output, Server Actions) |
| **Database & ORM** | Drizzle ORM + PostgreSQL 16 (with `pgvector`, `uuid-ossp`, `pgcrypto`) |
| **AI Orchestration** | Google Gemini 1.5 Pro (`@google/generative-ai`) + Multidisciplinary Rule Engine |
| **PDF Generation** | jsPDF + jsPDF-AutoTable (Printable E-Prescriptions & Lab Orders) |
| **Design & UI** | Tailwind CSS, Lucide React, Glassmorphism design tokens |

---

## 🚀 Quick Start with Bun

### 1. Install Dependencies
```bash
bun install
```

### 2. Run Local Development Server
```bash
bun run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### CI and Database Commands

```bash
bun run typecheck
bun run ci
bun run db:migrate
bun run db:seed                 # local/test data only by default
bun run healthcheck             # requires HEALTHCHECK_URL
```

The GitHub Actions CI workflow runs type checking, strict database migration,
idempotent seed validation, the production build, and a Docker build using a
temporary PostgreSQL/pgvector service. Production deployment is handled only by
`.github/workflows/deploy-plesk.yml` and is serialized with a production
environment approval gate.

Required production Actions secrets include `DATABASE_URL`,
`NEXT_PUBLIC_APP_URL`, `PLESK_HOST`, `PLESK_USERNAME`, `PLESK_DEPLOY_PATH`,
`PLESK_DOMAIN`, and one of `PLESK_WEBHOOK_URL`, `PLESK_SSH_KEY`, or
`PLESK_PASSWORD`. Production seed data requires an explicit manual workflow
dispatch with `seed_enabled` enabled.

---

## 🐳 Quick Start with Docker

### Production Multi-Container Stack
```bash
docker compose up --build -d
```

### Development with Bun Hot-Reloading
```bash
docker compose -f docker-compose.dev.yml up --build
```

---

## 🔒 Regulatory Compliance
- **FDA SaMD Advisory CDSS**: Human-in-the-loop verification required for all clinical orders.
- **21 CFR Part 11**: Cryptographic timestamps, digital signature hashes (`DIGISIG`), and immutable audit logs.
- **HIPAA Security Rule**: Organization-level isolation, encrypted media storage, and comprehensive event tracking.
