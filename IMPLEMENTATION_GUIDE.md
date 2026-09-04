# Clinic Platform: Dynamic Dashboards + Referral System + Patient Portal
## Comprehensive Technical Implementation Guide

**Status**: Planning Phase  
**Target Launch**: Q3-Q4 2025  
**Team Size**: 5-7 engineers  

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Database Schema Additions](#database-schema-additions)
3. [API Specifications](#api-specifications)
4. [Frontend Implementation Strategy](#frontend-implementation-strategy)
5. [Real-Time Infrastructure](#real-time-infrastructure)
6. [Security & Compliance](#security--compliance)
7. [Deployment & DevOps](#deployment--devops)
8. [Testing Strategy](#testing-strategy)
9. [Phase-by-Phase Breakdown](#phase-by-phase-breakdown)

---

## Architecture Overview

### Current State Assessment
```
✅ EXISTING:
  - Multi-tenant database (organizations, facilities)
  - 19 healthcare roles defined
  - Patient and care team management
  - Widget framework with lazy loading
  - 13 role-specific dashboard shells
  - AI integration (Gemini API)

❌ MISSING:
  - Real API endpoints for widgets
  - Dashboard layout persistence
  - WebSocket/real-time infrastructure
  - Patient portal & self-registration
  - Referral system & automation
  - Admin workflow configuration
  - Row-level security (RLS)
```

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│  Role Dashboards  │  Patient Portal  │  Admin Console           │
│  (React Components)  (Public + Auth)   (Workflow Config)        │
└──────────────────┬──────────────────┬──────────────────────────┘
                   │                  │
┌──────────────────┴──────────────────┴──────────────────────────┐
│                  API GATEWAY & AUTH LAYER                       │
├────────────────────────────────────────────────────────────────┤
│  NextAuth.js  │  Role-Based Access Control (RBAC)             │
│  JWT Token    │  Attribute-Based Access Control (ABAC)        │
└──────────────┬──────────────────────────────────────────────────┘
               │
  ┌────────────┴────────────────┬─────────────────────┐
  │                             │                     │
┌─┴──────────────────┐ ┌────────┴─────────┐ ┌────────┴──────────┐
│   REST API         │ │  WebSocket       │ │  Background Jobs  │
│   (/api/v1/*)      │ │  Gateway         │ │  (BullMQ/Kafka)   │
├────────────────────┤ ├──────────────────┤ ├───────────────────┤
│ - Dashboard        │ │ Socket.IO or     │ │ - Automation      │
│ - Patient Portal   │ │ ws library       │ │   rule triggers   │
│ - Referrals        │ │ Real-time events │ │ - Notifications   │
│ - Workflows        │ │ Role-based sub   │ │ - Report gen      │
│ - Admin Config     │ │                  │ │ - Data sync       │
└────────────────────┘ └──────────────────┘ └───────────────────┘
       │                       │                      │
   ┌───┴───────────────────────┴──────────────────────┴────────┐
   │                  SERVICES LAYER                           │
   ├──────────────────────────────────────────────────────────┤
   │ - Auth Service      - Widget Service                     │
   │ - Patient Service   - Referral Service                   │
   │ - Notification Svc  - Workflow Automation Svc            │
   │ - Cache Service     - Audit Service                      │
   └──────────────────────────────────────────────────────────┘
       │
   ┌───┴────────────────────────────────────────────────────────┐
   │              DATA ACCESS LAYER (Drizzle ORM)              │
   ├────────────────────────────────────────────────────────────┤
   │ - Query builders                                          │
   │ - PostgreSQL adapter                                      │
   │ - Row-level security enforcement                          │
   └─────────────────────────────────────────────────────────────┘
       │
┌──────┴──────────────────────────────────────────────────────────┐
│                    DATA LAYER                                   │
├───────────────────────────────────────────────────────────────┤
│  PostgreSQL 16  │  Redis Cache  │  S3 (Media)  │  Gemini AI   │
│  (Primary DB)   │  (Sessions,   │  (Documents) │  (Analysis)  │
│                 │   Events,     │              │              │
│                 │   Pub/Sub)    │              │              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Schema Additions

### 1. Referral System

```typescript
// referrals.ts
export const referrals = pgTable("referrals", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  patientId: uuid("patient_id").references(() => patients.id, { onDelete: "cascade" }).notNull(),
  encounterId: uuid("encounter_id").references(() => encounters.id),
  careplanId: uuid("careplan_id").references(() => carePlans.id),
  
  // Referral metadata
  type: text("type", { enum: ["internal", "external", "patient_self"] }).notNull(),
  source: text("source", { enum: ["manual", "ai_suggested", "patient_requested"] }).notNull(),
  
  // Referrer information
  referrerId: uuid("referrer_id").references(() => users.id).notNull(),
  referrerRole: text("referrer_role").notNull(),
  
  // Target information
  targetType: text("target_type", { enum: ["professional", "department", "facility", "external_provider"] }).notNull(),
  targetId: text("target_id"), // For professional: user_id, for facility: facility_id, for external: provider_id
  targetRole: text("target_role"), // e.g., "physiotherapist", "dietitian"
  
  // Clinical information
  reason: text("reason").notNull(),
  clinicalSummary: text("clinical_summary"),
  urgency: text("urgency", { enum: ["routine", "urgent", "stat"] }).default("routine").notNull(),
  priority: integer("priority").default(0), // 0=routine, 1=urgent, 2=stat
  
  // Status & workflow
  status: text("status", { 
    enum: ["draft", "pending_review", "approved", "scheduled", "in_progress", "completed", "cancelled", "rejected", "no_show"] 
  }).default("draft").notNull(),
  
  // Insurance & authorization
  insuranceAuthRequired: boolean("insurance_auth_required").default(false),
  insuranceAuthNumber: text("insurance_auth_number"),
  insuranceAuthExpiresAt: timestamp("insurance_auth_expires_at"),
  
  // Linked data
  scheduledAppointmentId: uuid("scheduled_appointment_id"),
  completionNotes: text("completion_notes"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: uuid("created_by").references(() => users.id).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: uuid("updated_by").references(() => users.id).notNull(),
  completedAt: timestamp("completed_at"),
  approvedAt: timestamp("approved_at"),
});

// referral_logs.ts - Audit trail
export const referralLogs = pgTable("referral_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  referralId: uuid("referral_id").references(() => referrals.id, { onDelete: "cascade" }).notNull(),
  action: text("action").notNull(), // "created", "approved", "scheduled", "completed", "rejected", etc.
  fromStatus: text("from_status"),
  toStatus: text("to_status"),
  performedBy: uuid("performed_by").references(() => users.id).notNull(),
  notes: text("notes"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// external_providers.ts - External referral targets
export const externalProviders = pgTable("external_providers", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  specialty: text("specialty").notNull(),
  type: text("type", { enum: ["specialist", "lab", "imaging", "hospital", "clinic", "community_service"] }).notNull(),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  phone: text("phone"),
  email: text("email"),
  fax: text("fax"),
  npi: text("npi"), // National Provider Identifier (US)
  
  // Integration endpoints
  fhirEndpoint: text("fhir_endpoint"),
  hl7Endpoint: text("hl7_endpoint"),
  emailSecure: boolean("email_secure").default(true),
  
  // Contact person
  contactName: text("contact_name"),
  contactTitle: text("contact_title"),
  contactPhone: text("contact_phone"),
  contactEmail: text("contact_email"),
  
  // Configuration
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

### 2. Dashboard Layout Persistence

```typescript
// dashboard_layouts.ts
export const dashboardLayouts = pgTable("dashboard_layouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  role: text("role").notNull(), // "physician", "nurse", etc.
  userId: uuid("user_id").references(() => users.id), // null = role default, set = user override
  
  // Layout configuration
  layout: jsonb("layout").notNull(), // [{ widgetId, x, y, width, height, visible }]
  gridColumns: integer("grid_columns").default(12),
  rowHeight: integer("row_height").default(40),
  
  // Customization options
  visibleWidgets: jsonb("visible_widgets").default([]), // Array of widgetIds
  hiddenWidgets: jsonb("hidden_widgets").default([]),
  widgetSettings: jsonb("widget_settings").default({}), // { widgetId: { refreshInterval, filters, etc. } }
  
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  
  indexes: {
    unique: ["tenantId", "role", "userId"], // Unique per tenant/role/user
  },
});
```

### 3. Patient Registration & Portal

```typescript
// patient_registrations.ts
export const patientRegistrations = pgTable("patient_registrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  
  // Contact information
  email: text("email").notNull(),
  phone: text("phone"),
  
  // Registration status
  status: text("status", { 
    enum: ["invited", "started", "submitted", "verified", "active", "rejected"] 
  }).default("invited").notNull(),
  
  // Verification
  verificationToken: text("verification_token"),
  verificationExpiresAt: timestamp("verification_expires_at"),
  verifiedAt: timestamp("verified_at"),
  
  // Submitted form data (before account creation)
  submittedData: jsonb("submitted_data").default({}), // Demographics, insurance, medical history, allergies, medications
  
  // Duplicate detection
  duplicatePatientId: uuid("duplicate_patient_id").references(() => patients.id),
  duplicateScore: numeric("duplicate_score"), // 0-100
  
  // Consent
  consents: jsonb("consents").default({}), // { treatment: true, data_sharing: false, ai_processing: true, research: false }
  
  // Link to patient account (after verification)
  patientId: uuid("patient_id").references(() => patients.id, { onDelete: "cascade" }),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  
  indexes: {
    unique: ["tenantId", "email"], // Ensure unique registrations per tenant
  },
});

// patient_consent_forms.ts
export const patientConsentForms = pgTable("patient_consent_forms", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id").references(() => patients.id, { onDelete: "cascade" }).notNull(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  
  formType: text("form_type").notNull(), // "treatment", "data_sharing", "ai_processing", "research", "specific_professional"
  formVersion: text("form_version").notNull(), // e.g., "1.0", "2.0"
  
  // Consent status
  status: text("status", { enum: ["pending", "signed", "withdrawn"] }).default("pending").notNull(),
  signedAt: timestamp("signed_at"),
  withdrawnAt: timestamp("withdrawn_at"),
  
  // Document
  formContent: text("form_content"), // HTML or markdown
  signatureUrl: text("signature_url"),
  ipAddress: text("ip_address"),
  
  // Related data
  professionalId: uuid("professional_id").references(() => users.id), // If consent is for specific professional access
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// patient_messages.ts
export const patientMessages = pgTable("patient_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id").references(() => patients.id, { onDelete: "cascade" }).notNull(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  
  senderId: uuid("sender_id").references(() => users.id).notNull(),
  senderType: text("sender_type", { enum: ["patient", "professional"] }).notNull(),
  
  subject: text("subject"),
  body: text("body").notNull(),
  
  // Message thread
  threadId: uuid("thread_id"), // Null for first message, set for replies
  inReplyToId: uuid("in_reply_to_id").references(() => patientMessages.id),
  
  // Read status
  readAt: timestamp("read_at"),
  
  // Attachments
  attachmentIds: jsonb("attachment_ids").default([]), // Array of mediaAsset IDs
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// patient_notifications.ts
export const patientNotifications = pgTable("patient_notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id").references(() => patients.id, { onDelete: "cascade" }).notNull(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  
  type: text("type").notNull(), // "lab_result", "appointment_reminder", "referral_status", "message", "task", "care_plan_update"
  title: text("title").notNull(),
  body: text("body"),
  
  // Payload for deep linking
  payload: jsonb("payload").default({}), // { resource_type, resource_id, action_url }
  
  // Delivery channels
  deliveredVia: jsonb("delivered_via").default([]), // ["email", "sms", "in_app", "push"]
  
  // Read/Action status
  readAt: timestamp("read_at"),
  actionTaken: boolean("action_taken").default(false),
  actionTakenAt: timestamp("action_taken_at"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

### 4. Workflow Automation

```typescript
// workflow_templates.ts
export const workflowTemplates = pgTable("workflow_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  
  name: text("name").notNull(),
  description: text("description"),
  processType: text("process_type").notNull(), // "referral", "consultation", "lab_order", "medication_order", "discharge"
  
  // Workflow steps
  steps: jsonb("steps").notNull(), // [{ stepId, name, assignedRole, requiredFields, reviewRequired, timeLimit }]
  
  // Configuration
  version: text("version").default("1.0").notNull(),
  isActive: boolean("is_active").default(true),
  isDefault: boolean("is_default").default(false),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// automation_rules.ts
export const automationRules = pgTable("automation_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  
  name: text("name").notNull(),
  description: text("description"),
  
  // Trigger definition
  triggerType: text("trigger_type").notNull(), // "lab_value", "vital_sign", "assessment_score", "diagnosis", "medication", "sdoh_flag", "risk_score"
  triggerCondition: jsonb("trigger_condition").notNull(), // { field, operator, value, threshold }
  
  // Action definition
  actionType: text("action_type").notNull(), // "create_referral", "create_task", "send_notification", "escalate", "update_care_plan"
  actionPayload: jsonb("action_payload").notNull(), // { targetRole, urgency, message }
  
  // Scope & priority
  appliesToRoles: jsonb("applies_to_roles").default([]), // Empty = all roles
  priority: integer("priority").default(0), // Higher = execute first
  
  // Execution
  isActive: boolean("is_active").default(true),
  executionCount: integer("execution_count").default(0),
  lastExecutedAt: timestamp("last_executed_at"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// automation_audit.ts - Track automation triggers
export const automationAudit = pgTable("automation_audit", {
  id: uuid("id").primaryKey().defaultRandom(),
  ruleId: uuid("rule_id").references(() => automationRules.id).notNull(),
  patientId: uuid("patient_id").references(() => patients.id).notNull(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  
  triggerData: jsonb("trigger_data").notNull(), // { field, value, threshold, operator_result }
  actionTaken: text("action_taken"),
  result: text("result", { enum: ["success", "skipped", "error"] }).notNull(),
  errorMessage: text("error_message"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

### 5. Admin Audit Logging

```typescript
// config_audit_logs.ts
export const configAuditLogs = pgTable("config_audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  adminId: uuid("admin_id").references(() => users.id).notNull(),
  
  entityType: text("entity_type").notNull(), // "workflow_template", "automation_rule", "dashboard_layout", "external_provider"
  entityId: text("entity_id").notNull(),
  action: text("action").notNull(), // "create", "update", "delete", "activate", "deactivate"
  
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value"),
  
  reason: text("reason"),
  ipAddress: text("ip_address"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

### SQL Migration Script

```sql
-- Add new tables (to be generated by Drizzle Kit)
-- Key indexes for performance:

CREATE INDEX idx_referrals_patient_id ON referrals(patient_id);
CREATE INDEX idx_referrals_status ON referrals(status);
CREATE INDEX idx_referrals_urgency ON referrals(urgency);
CREATE INDEX idx_referrals_created_at ON referrals(created_at DESC);

CREATE INDEX idx_dashboard_layouts_tenant_role ON dashboard_layouts(tenant_id, role);
CREATE INDEX idx_dashboard_layouts_user_id ON dashboard_layouts(user_id);

CREATE INDEX idx_patient_registrations_email ON patient_registrations(tenant_id, email);
CREATE INDEX idx_patient_registrations_status ON patient_registrations(status);

CREATE INDEX idx_automation_rules_tenant_active ON automation_rules(tenant_id, is_active);
CREATE INDEX idx_automation_audit_patient ON automation_audit(patient_id, created_at DESC);

-- Row-Level Security (RLS) - PostgreSQL security policy
-- Enable RLS on sensitive tables:
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_layouts ENABLE ROW LEVEL SECURITY;

-- Example RLS policy for referrals (simplified):
-- Users can only view referrals for their tenant AND
-- If they're the referrer, recipient, or administrator
```

---

## API Specifications

### Widget Data Endpoints (Phase 1A)

Each widget requires a dedicated, optimized endpoint returning only necessary data.

```typescript
// Type definitions
interface WidgetDataRequest {
  role: Role;
  userId: string;
  tenantId: string;
  filters?: Record<string, any>; // role-specific filters
  limit?: number;
  offset?: number;
}

interface WidgetDataResponse<T> {
  data: T[];
  total: number;
  timestamp: ISO8601;
  refreshAfterSeconds: number;
  events?: string[]; // WebSocket channels to subscribe to
}

// ============================================
// PHYSICIAN DASHBOARD WIDGETS
// ============================================

// GET /api/v1/dashboards/physician/widgets/my-patients
// Returns: { data: Patient[], total, timestamp, refreshAfterSeconds: 300 }
interface MyPatientsWidgetData {
  patientId: string;
  mrn: string;
  name: string;
  age: number;
  triagePriority: "routine" | "urgent" | "critical";
  primaryDiagnosis: string;
  lastEncounter: ISO8601;
  activeAlerts: number;
  criticalAlerts: string[]; // e.g., ["High EWS", "Abnormal Labs"]
}

// GET /api/v1/dashboards/physician/widgets/pending-ai-reviews
// Returns: AI suggestions pending physician review
interface PendingAIReviewsWidgetData {
  suggestionId: string;
  patientName: string;
  patientId: string;
  suggestType: "diagnosis" | "referral" | "medication" | "intervention";
  confidence: number; // 0-100
  rationale: string;
  linkedDataPoints: string[];
  createdAt: ISO8601;
  actions: ["accept", "reject", "modify"];
}

// GET /api/v1/dashboards/physician/widgets/new-lab-results
interface NewLabResultsWidgetData {
  resultId: string;
  patientName: string;
  patientId: string;
  testName: string;
  value: string;
  unit: string;
  referenceRange: { low: string; high: string };
  isAbnormal: boolean;
  interpretation: string;
  performedAt: ISO8601;
  source: string;
}

// GET /api/v1/dashboards/physician/widgets/prescription-approvals
interface PrescriptionApprovalsWidgetData {
  prescriptionId: string;
  patientName: string;
  patientId: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  flags: string[]; // e.g., ["Drug Interaction", "Renal Dosing", "PGx Flag"]
  requestedBy: string;
  requestedAt: ISO8601;
}

// ============================================
// NURSE DASHBOARD WIDGETS
// ============================================

// GET /api/v1/dashboards/nurse/widgets/vitals-due
interface VitalsDueWidgetData {
  patientId: string;
  patientName: string;
  roomNumber: string;
  lastVitalsTaken: ISO8601;
  isDue: boolean;
  dueIn: string; // "5 minutes", "now", "overdue by 10 minutes"
  vitalsSigns: string[]; // e.g., ["BP", "HR", "Temp", "RR", "O2Sat"]
}

// GET /api/v1/dashboards/nurse/widgets/medication-administration
interface MedicationAdministrationWidgetData {
  medicationId: string;
  patientId: string;
  patientName: string;
  medicationName: string;
  dosage: string;
  route: string;
  scheduledTime: ISO8601;
  status: "pending" | "administered" | "held" | "refused";
  administeredAt?: ISO8601;
  administeredBy?: string;
}

// ============================================
// PHARMACIST DASHBOARD WIDGETS
// ============================================

// GET /api/v1/dashboards/pharmacist/widgets/medication-orders-to-review
interface MedicationOrdersReviewWidgetData {
  orderId: string;
  patientName: string;
  patientId: string;
  medicationName: string;
  dosage: string;
  route: string;
  indication: string;
  prescribedBy: string;
  prescribedAt: ISO8601;
  alerts: string[]; // e.g., ["Drug Interaction", "Allergy", "Renal Dosing"]
}

// GET /api/v1/dashboards/pharmacist/widgets/drug-interactions
interface DrugInteractionsWidgetData {
  interactionId: string;
  patientId: string;
  patientName: string;
  drug1: { name: string; dosage: string };
  drug2: { name: string; dosage: string };
  severity: "minor" | "moderate" | "major" | "contraindicated";
  mechanism: string;
  recommendation: string;
  references: string[];
}

// ============================================
// ADMIN DASHBOARD - REFERRAL ANALYTICS
// ============================================

// GET /api/v1/admin/dashboards/referral-analytics
interface ReferralAnalyticsData {
  totalReferrals: number;
  byStatus: { [status]: number }; // { "pending_review": 5, "approved": 12, ... }
  byUrgency: { [urgency]: number }; // { "routine": 20, "urgent": 10, "stat": 2 }
  averageApprovalTime: string; // e.g., "2.5 hours"
  averageCompletionTime: string;
  acceptanceRate: number; // 0-100
  noShowRate: number;
  trend: Array<{ date: ISO8601; count: number }>; // Last 30 days
}

// Generic endpoint for paginated lists
// GET /api/v1/dashboards/:role/widgets/:widgetId?page=1&limit=20&sort=createdAt&order=desc
```

### Patient Portal Endpoints (Phase 3)

```typescript
// ============================================
// PUBLIC REGISTRATION (No auth required)
// ============================================

// POST /api/v1/public/register
// Start patient registration
interface RegisterRequest {
  tenantId: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  dateOfBirth: ISO8601;
}
// Returns: { registrationId, verificationToken, nextStep: "verify_email" }

// POST /api/v1/public/register/verify-otp
interface VerifyOTPRequest {
  registrationId: string;
  otp: string; // 6-digit code
}
// Returns: { verified: true, nextStep: "complete_profile" }

// POST /api/v1/public/register/submit
// Submit full registration form
interface RegisterSubmitRequest {
  registrationId: string;
  demographics: { /* address, gender, etc. */ };
  medical: { allergies: string[], medications: string[] };
  insurance: { provider: string; policyNumber: string };
  consents: { treatment: boolean; dataSharing: boolean; aiProcessing: boolean };
}
// Returns: { success: true, patientId, status: "pending_verification" }

// ============================================
// PATIENT DASHBOARD (Auth required - patient role)
// ============================================

// GET /api/v1/patient/me
interface PatientProfileResponse {
  patientId: string;
  name: string;
  dateOfBirth: ISO8601;
  mrn: string;
  primaryPhysician: { name: string; specialty: string };
  conditions: string[];
  allergies: string[];
  medications: Medication[];
  lastEncounter: ISO8601;
}

// GET /api/v1/patient/records
interface PatientRecordsResponse {
  labs: LabResult[];
  imaging: ImagingReport[];
  documents: Document[];
  vitals: VitalSign[];
  immunizations: Immunization[];
}

// GET /api/v1/patient/appointments
interface PatientAppointmentsResponse {
  upcoming: Appointment[];
  past: Appointment[];
}

// GET /api/v1/patient/referrals
interface PatientReferralsResponse {
  active: Referral[];
  completed: Referral[];
  pending: Referral[];
}

// POST /api/v1/patient/referrals/request
// Patient requests referral to specialist
interface PatientReferralRequest {
  targetRole: string; // "physiotherapist", "dietitian"
  reason: string;
  symptoms?: string[];
}
// Returns: { referralId, status: "pending_review" }

// GET /api/v1/patient/messages
// GET /api/v1/patient/notifications
// PUT /api/v1/patient/consents
```

### Referral System Endpoints (Phase 4)

```typescript
// ============================================
// REFERRAL MANAGEMENT
// ============================================

// POST /api/v1/patients/:patientId/referrals
// Create a new referral
interface CreateReferralRequest {
  type: "internal" | "external";
  targetRole?: string; // For internal
  targetProviderId?: string; // For external
  reason: string;
  urgency: "routine" | "urgent" | "stat";
  clinicalSummary?: string;
  attachmentIds?: string[];
}

// GET /api/v1/referrals?status=pending&recipient=me&role=physiotherapist
// List referrals for current user

// GET /api/v1/referrals/:referralId
// Get referral details with full linked data

// PUT /api/v1/referrals/:referralId/status
// Update referral status
interface UpdateReferralStatusRequest {
  status: "approved" | "rejected" | "scheduled" | "completed";
  notes?: string;
  reason?: string;
}

// POST /api/v1/referrals/:referralId/schedule
// Schedule appointment from referral
interface ScheduleReferralRequest {
  appointmentDateTime: ISO8601;
  location: string;
}

// GET /api/v1/admin/referrals/analytics
// Referral analytics dashboard
```

### Admin Workflow Configuration Endpoints (Phase 5)

```typescript
// ============================================
// WORKFLOW TEMPLATES
// ============================================

// GET /api/v1/admin/workflow-templates
// LIST workflow templates for admin configuration

// POST /api/v1/admin/workflow-templates
// CREATE new workflow template

// PUT /api/v1/admin/workflow-templates/:templateId
// UPDATE workflow template

// ============================================
// AUTOMATION RULES
// ============================================

// GET /api/v1/admin/automation-rules
// LIST active automation rules

// POST /api/v1/admin/automation-rules
// CREATE new automation rule
interface CreateAutomationRuleRequest {
  name: string;
  triggerType: "lab_value" | "vital_sign" | "assessment_score";
  triggerCondition: {
    field: string; // e.g., "lab_hba1c"
    operator: ">" | "<" | "=" | "between";
    value: number | string;
    threshold?: number;
  };
  actionType: "create_referral" | "create_task" | "send_notification";
  actionPayload: Record<string, any>;
  priority: number;
}

// ============================================
// PROCESS MAP
// ============================================

// GET /api/v1/admin/process-map/:patientId
// View all linked clinical processes for a patient
interface ProcessMapResponse {
  patient: { id: string; name: string };
  timeline: Array<{
    timestamp: ISO8601;
    type: "encounter" | "referral" | "order" | "task" | "result";
    status: string;
    description: string;
    linkedIds: { encounterID?: string; referralId?: string };
  }>;
  activeReferrals: Referral[];
  activeCareplan: CarePlan;
}
```

---

## Frontend Implementation Strategy

### Phase 1: Widget Data Layer Refactor

**Current State**: Widgets fetch from `ClinicContext` (demo data)

**Target State**: Widgets fetch from API endpoints with React Query

```typescript
// hooks/useWidgetData.ts
import { useQuery } from '@tanstack/react-query';

export function useWidgetData<T>(
  widgetId: string,
  role: Role,
  options?: {
    filters?: Record<string, any>;
    enabled?: boolean;
    refetchInterval?: number;
  }
) {
  return useQuery({
    queryKey: ['widget', widgetId, role, options?.filters],
    queryFn: async () => {
      const response = await fetch(`/api/v1/dashboards/${role}/widgets/${widgetId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to fetch widget data');
      return response.json();
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: options?.refetchInterval || 60000, // 1 minute
    refetchOnWindowFocus: true,
  });
}

// Example widget using the hook
export function MyPatientsWidget() {
  const { data, isLoading, error } = useWidgetData('my_patients', 'physician');

  if (isLoading) return <WidgetSkeleton />;
  if (error) return <WidgetError onRetry={() => {}} />;
  if (!data?.data?.length) return <WidgetEmpty message="No patients assigned" />;

  return (
    <div className="space-y-2">
      {data.data.map((patient) => (
        <PatientRow key={patient.patientId} patient={patient} />
      ))}
    </div>
  );
}
```

### Phase 2: Dashboard Layout Persistence

```typescript
// components/DynamicDashboardGrid.tsx
import GridLayout, { Layouts } from 'react-grid-layout';

interface DynamicDashboardGridProps {
  role: Role;
  editable?: boolean;
}

export function DynamicDashboardGrid({ role, editable = false }: DynamicDashboardGridProps) {
  const [layouts, setLayouts] = React.useState<Layouts>({});
  const [visibleWidgets, setVisibleWidgets] = React.useState<string[]>([]);
  
  // Fetch current layout from database
  const { data: layoutConfig } = useQuery({
    queryKey: ['dashboard-layout', role],
    queryFn: async () => {
      const response = await fetch(`/api/v1/dashboards/${role}/layout`);
      return response.json();
    },
  });

  // Save layout when changed
  const handleLayoutChange = async (newLayout: Layout[]) => {
    setLayouts({ lg: newLayout });
    
    if (editable) {
      await fetch(`/api/v1/dashboards/${role}/layout`, {
        method: 'PUT',
        body: JSON.stringify({ layout: newLayout }),
      });
    }
  };

  return (
    <GridLayout
      className="layout"
      layout={layouts.lg}
      onLayoutChange={handleLayoutChange}
      isDraggable={editable}
      isResizable={editable}
      cols={12}
      rowHeight={50}
    >
      {visibleWidgets.map((widgetId) => (
        <div key={widgetId}>
          <WidgetRenderer widgetId={widgetId} role={role} />
        </div>
      ))}
    </GridLayout>
  );
}
```

### Phase 3: Real-Time WebSocket Integration

```typescript
// hooks/useWebSocket.ts
import { useEffect, useRef } from 'react';

export function useWebSocket(
  channel: string,
  onMessage: (data: any) => void,
  options?: { autoConnect?: boolean }
) {
  const ws = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const MAX_RECONNECT = 5;

  useEffect(() => {
    if (options?.autoConnect === false) return;

    const connectWebSocket = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws.current = new WebSocket(`${protocol}//${window.location.host}/api/ws?channel=${channel}`);

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.current.onclose = () => {
        if (reconnectAttempts.current < MAX_RECONNECT) {
          reconnectAttempts.current += 1;
          setTimeout(connectWebSocket, 2000 * reconnectAttempts.current); // Exponential backoff
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    };

    connectWebSocket();

    return () => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.close();
      }
    };
  }, [channel, onMessage]);

  return ws.current;
}

// Example: Widget that updates in real-time
export function CriticalAlertsWidget() {
  const [alerts, setAlerts] = React.useState<Alert[]>([]);

  // Initial load
  const { data: initialAlerts } = useWidgetData('critical_alerts', 'physician');

  // Real-time updates
  useWebSocket('critical_alerts', (newAlert) => {
    setAlerts((prev) => [newAlert, ...prev.slice(0, 9)]);
  });

  return (
    <div>
      {alerts.map((alert) => (
        <AlertCard key={alert.id} alert={alert} />
      ))}
    </div>
  );
}
```

### Phase 4: Patient Portal UI

```typescript
// app/patient/dashboard/page.tsx
'use client';

import { useSession } from 'next-auth/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function PatientDashboard() {
  const { data: session } = useSession();

  return (
    <div className="space-y-6 p-6">
      <h1>My Health Portal</h1>
      
      <Tabs defaultValue="records">
        <TabsList>
          <TabsTrigger value="records">My Records</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="care-plan">Care Plan</TabsTrigger>
        </TabsList>

        <TabsContent value="records">
          <PatientRecordsView />
        </TabsContent>

        <TabsContent value="appointments">
          <PatientAppointmentsView />
        </TabsContent>

        <TabsContent value="referrals">
          <PatientReferralsView />
        </TabsContent>

        {/* Other tabs */}
      </Tabs>
    </div>
  );
}
```

---

## Real-Time Infrastructure

### WebSocket Gateway Architecture

```typescript
// server/websocket-gateway.ts
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import Redis from 'ioredis';
import jwt from 'jsonwebtoken';

const redis = new Redis();
const wss = new WebSocketServer({ noServer: true });

// Client subscriptions: Map<clientId, Set<channels>>
const subscriptions = new Map<string, Set<string>>();

// WebSocket connection handler
wss.on('connection', async (ws, req) => {
  const clientId = generateClientId();
  const token = extractTokenFromQuery(req.url);
  
  // Authenticate
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    const { userId, role, tenantId } = decoded;

    // Auto-subscribe to role-based channels
    const channels = getChannelsForRole(role, userId, tenantId);
    subscribeToChannels(clientId, channels, ws);

    // Handle custom subscriptions
    ws.on('message', (message: string) => {
      const { action, channel } = JSON.parse(message);
      
      if (action === 'subscribe') {
        subscribeToChannels(clientId, [channel], ws);
      } else if (action === 'unsubscribe') {
        unsubscribeFromChannel(clientId, channel);
      }
    });

    ws.on('close', () => {
      subscriptions.delete(clientId);
    });
  } catch (error) {
    ws.close(1008, 'Unauthorized');
  }
});

// Redis pub/sub listener
redis.on('message', (channel: string, message: string) => {
  const data = JSON.parse(message);
  
  // Forward to all subscribed clients
  for (const [clientId, clientChannels] of subscriptions.entries()) {
    if (clientChannels.has(channel)) {
      const ws = getWebSocketForClient(clientId);
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ channel, data, timestamp: Date.now() }));
      }
    }
  }
});

redis.subscribe('lab_results', 'new_referrals', 'task_updates', 'prescription_approvals');

function getChannelsForRole(role: string, userId: string, tenantId: string): string[] {
  return [
    `tenant:${tenantId}`,
    `role:${role}`,
    `user:${userId}`,
  ];
}

function subscribeToChannels(clientId: string, channels: string[], ws: WebSocket) {
  if (!subscriptions.has(clientId)) {
    subscriptions.set(clientId, new Set());
  }
  channels.forEach((ch) => subscriptions.get(clientId)?.add(ch));
}
```

### Event Publishing

```typescript
// services/event-emitter.ts
import Redis from 'ioredis';

const redis = new Redis();

export async function publishReferralCreated(referral: Referral) {
  const channel = `referrals:${referral.tenantId}`;
  await redis.publish(channel, JSON.stringify({
    type: 'referral_created',
    referral,
    timestamp: Date.now(),
  }));
}

export async function publishLabResultReceived(labResult: LabResult) {
  const channel = `labs:${labResult.tenantId}`;
  await redis.publish(channel, JSON.stringify({
    type: 'lab_result_received',
    labResult,
    timestamp: Date.now(),
  }));
}

// Called from API handlers
export async function handleNewReferral(req: Request) {
  // Create referral in database
  const referral = await db.insert(referrals).values({...}).returning().one();
  
  // Publish event to WebSocket clients
  await publishReferralCreated(referral);
  
  return referral;
}
```

---

## Security & Compliance

### Authentication & Authorization

```typescript
// middleware/auth.ts
import { getToken } from 'next-auth/jwt';

export async function authMiddleware(req: Request) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  
  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Attach to request context
  (req as any).user = token;
  return null;
}

// middleware/rbac.ts
export function requireRole(...allowedRoles: string[]) {
  return async (req: Request) => {
    const user = (req as any).user;
    
    if (!allowedRoles.includes(user.role)) {
      return new Response('Forbidden', { status: 403 });
    }

    return null;
  };
}

// Usage:
// export async function GET(req: Request) {
//   const authError = await authMiddleware(req);
//   if (authError) return authError;
//
//   const rbacError = requireRole('physician', 'nurse_practitioner')(req);
//   if (rbacError) return rbacError;
//   ...
// }
```

### Data Access Control

```typescript
// services/data-access.ts
export async function getPatientsForPhysician(physicianId: string, tenantId: string) {
  // Verify physician exists and belongs to tenant
  const physician = await db.query.users.findFirst({
    where: and(eq(users.id, physicianId), eq(users.organizationId, tenantId)),
  });

  if (!physician) throw new UnauthorizedError();

  // Fetch patients assigned to this physician
  return db.query.patients.findMany({
    where: and(
      eq(patients.tenantId, tenantId),
      eq(patients.primaryDoctorId, physicianId)
    ),
  });
}

// Row-Level Security via PostgreSQL policies
export async function initializeRLS() {
  const queries = [
    `ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;`,
    `CREATE POLICY tenant_isolation_referrals ON referrals
      USING (tenant_id = current_setting('app.tenant_id')::uuid);`,
    
    `ALTER TABLE patient_registrations ENABLE ROW LEVEL SECURITY;`,
    `CREATE POLICY tenant_isolation_registrations ON patient_registrations
      USING (tenant_id = current_setting('app.tenant_id')::uuid);`,
  ];

  for (const query of queries) {
    await db.execute(query);
  }
}
```

### Audit Logging

```typescript
// services/audit.ts
export async function logDashboardInteraction(
  userId: string,
  tenantId: string,
  action: string,
  data: any
) {
  await db.insert(dashboardAuditLogs).values({
    userId,
    tenantId,
    action, // "view_widget", "click_patient", "export_data"
    data: JSON.stringify(data),
    timestamp: new Date(),
  });
}

// Middleware to auto-log widget access
export async function widgetAuditMiddleware(req: Request, widgetId: string) {
  const user = (req as any).user;
  await logDashboardInteraction(user.id, user.tenantId, `view_widget:${widgetId}`, {
    userAgent: req.headers.get('user-agent'),
    ip: req.headers.get('x-forwarded-for'),
  });
}
```

### Encryption & Compliance

```typescript
// HIPAA Compliance Checklist:
// - ✅ Authentication (NextAuth.js with MFA support)
// - ✅ Authorization (RBAC/ABAC)
// - ✅ Encryption in transit (TLS 1.2+)
// - ✅ Encryption at rest (PostgreSQL native encryption options)
// - ✅ Audit logging (all patient data access)
// - ✅ Data integrity (JWT signatures, API request signing)
// - ✅ Access controls (role-based permissions)
// - ✅ Minimum necessary (API responses include only required fields)
// - ✅ Data retention (implement purge policies)

// Sensitive field encryption
import crypto from 'crypto';

export function encryptSensitiveField(value: string, key: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
  let encrypted = cipher.update(value);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decryptSensitiveField(encrypted: string, key: string): string {
  const parts = encrypted.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
  let decrypted = decipher.update(Buffer.from(parts[1], 'hex'));
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}
```

---

## Deployment & DevOps

### Docker Configuration Updates

```dockerfile
# Dockerfile.prod
FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Build application
COPY . .
RUN npm run build

# Production image
FROM node:20-alpine
WORKDIR /app
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/.next ./.next
COPY --from=base /app/public ./public
COPY --from=base /app/package.json ./package.json

EXPOSE 3000
CMD ["npm", "start"]
```

```yaml
# docker-compose.yml (updated)
version: '3.8'

services:
  web:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://user:password@postgres:5432/clinic
      - REDIS_URL=redis://redis:6379
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - NEXTAUTH_URL=http://localhost:3000
      - GEMINI_API_KEY=${GEMINI_API_KEY}
    depends_on:
      - postgres
      - redis
    networks:
      - clinic-network

  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=clinic_user
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=clinic_prod
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./docker/init-db.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - clinic-network

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - clinic-network

  # WebSocket Server (optional separate service for scalability)
  websocket:
    build:
      context: .
      dockerfile: Dockerfile.websocket
    ports:
      - "8080:8080"
    environment:
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
    networks:
      - clinic-network

volumes:
  postgres_data:
  redis_data:

networks:
  clinic-network:
    driver: bridge
```

---

## Testing Strategy

### Unit Tests

```typescript
// __tests__/services/referral.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as referralService from '@/services/referral';
import * as db from '@/db';

describe('Referral Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create an internal referral', async () => {
    const result = await referralService.createReferral({
      patientId: 'patient-1',
      type: 'internal',
      targetRole: 'physiotherapist',
      reason: 'Fall risk assessment',
      urgency: 'routine',
    });

    expect(result.id).toBeDefined();
    expect(result.status).toBe('draft');
    expect(result.type).toBe('internal');
  });

  it('should validate automation rule conditions', () => {
    const rule = {
      triggerType: 'lab_value',
      triggerCondition: { field: 'lab_hba1c', operator: '>', value: 9 },
    };

    const labResult = { testName: 'HbA1c', value: '9.5' };
    const matches = referralService.evaluateAutomationRule(rule, labResult);

    expect(matches).toBe(true);
  });
});
```

### Integration Tests

```typescript
// __tests__/api/referrals.integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient, TestClient } from '@/test-utils';

describe('Referral API Integration', () => {
  let client: TestClient;

  beforeAll(async () => {
    client = await createTestClient();
  });

  afterAll(async () => {
    await client.teardown();
  });

  it('should create a referral end-to-end', async () => {
    const patientId = await client.createPatient();
    const physicianId = await client.createUser({ role: 'physician' });

    const result = await client.post('/api/v1/patients/:patientId/referrals', {
      type: 'internal',
      targetRole: 'physiotherapist',
      reason: 'PT evaluation',
      urgency: 'routine',
    });

    expect(result.status).toBe(201);
    expect(result.body.id).toBeDefined();
  });
});
```

### End-to-End Tests

```typescript
// e2e/referral-workflow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Referral Workflow', () => {
  test('should complete internal referral from creation to completion', async ({ page }) => {
    // 1. Physician logs in
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', 'physician@clinic.local');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button:has-text("Sign In")');

    // 2. Navigate to create referral
    await page.click('text="My Patients"');
    await page.click('button:has-text("Create Referral")');

    // 3. Fill referral form
    await page.selectOption('select[name="targetRole"]', 'physiotherapist');
    await page.fill('textarea[name="reason"]', 'Mobility assessment');
    await page.click('button:has-text("Create")');

    // 4. Verify referral created
    await expect(page.locator('text="Referral created successfully"')).toBeVisible();

    // 5. Logout and login as physiotherapist
    await page.click('button:has-text("Logout")');
    await page.fill('input[name="email"]', 'pt@clinic.local');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button:has-text("Sign In")');

    // 6. Accept referral
    await page.click('text="Pending Referrals"');
    await page.click('button:has-text("Accept")');

    // 7. Verify acceptance
    await expect(page.locator('text="Referral accepted"')).toBeVisible();
  });
});
```

---

## Phase-by-Phase Breakdown

### Phase 1A: Widget Data Layer (Weeks 1-4)

**Deliverables:**
- API endpoints for all widget data sources (one per role/widget type)
- React Query integration in all widgets
- Polling mechanism with configurable intervals
- Error/loading/empty states for all widgets

**Tasks:**
```
Week 1:
  - Set up React Query in Next.js
  - Create generic `useWidgetData` hook
  - Implement API endpoint structure (/api/v1/dashboards/:role/widgets/:widgetId)
  - Create first 3 widget endpoints (my-patients, pending-ai-reviews, critical-alerts)

Week 2:
  - Implement remaining Physician widget endpoints (6 total)
  - Implement Nurse widget endpoints (4 total)
  - Implement Pharmacist widget endpoints (3 total)
  - Add error handling and retry logic

Week 3:
  - Implement all remaining role widget endpoints
  - Add loading skeletons and empty states
  - Performance optimization (pagination, cursor-based)
  - API caching (Redis for 30-60 seconds)

Week 4:
  - Dashboard-wide error boundary
  - Widget refresh interval configuration
  - Manual refresh button on each widget
  - Testing and documentation
```

### Phase 1B: Dashboard Layout Persistence (Weeks 3-4)

**Deliverables:**
- `dashboard_layouts` table
- Drag-and-drop layout editor
- Save/load layout endpoints
- Layout reset to default

**Tasks:**
```
Week 3:
  - Add dashboard_layouts table to schema
  - Implement GET /api/v1/dashboards/:role/layout
  - Implement PUT /api/v1/dashboards/:role/layout

Week 4:
  - Integrate react-grid-layout
  - Add edit mode toggle
  - Support user overrides (save per user)
  - Add "Reset to Default" button
```

### Phase 2A: Real-Time Infrastructure (Weeks 5-7)

**Deliverables:**
- WebSocket server
- Redis pub/sub integration
- Client-side WebSocket hook
- Event publishing from API handlers

**Tasks:**
```
Week 5:
  - Set up WebSocket server (Socket.IO or ws)
  - Implement authentication for WebSocket connections
  - Create Redis pub/sub integration
  - Define event schema

Week 6:
  - Implement client-side WebSocket hook
  - Test reconnection and error handling
  - Add fallback to polling if WebSocket unavailable

Week 7:
  - Integration tests for real-time events
  - Load testing (1000+ concurrent connections)
  - Documentation and runbooks
```

### Phase 2B: Complete All Widgets (Weeks 8-13)

**Deliverables:**
- All 15+ role dashboards fully functional
- Real-time updates for critical events
- Navigation/action handlers

**Tasks:**
```
Weeks 8-13:
  - For each role (in parallel across team):
    - Implement all dashboard widgets
    - Wire up real-time WebSocket subscriptions
    - Add click handlers and navigation
    - Add role-based permission checks
    - E2E testing
```

### Phase 3: Patient Portal & Registration (Weeks 14-21)

**Deliverables:**
- Public registration page
- Patient dashboard with 8+ sections
- Consent management
- Insurance/financial data

**Tasks:**
```
Weeks 14-16:
  - Build public registration page
  - OTP verification
  - Duplicate detection

Weeks 17-19:
  - Implement patient dashboard UI
  - Medical records view
  - Appointments management
  - Referral status view

Weeks 20-21:
  - Consent form builder
  - Insurance verification (if available)
  - Testing and refinement
```

### Phase 4: Referral System (Weeks 22-31)

**Deliverables:**
- Referral data model and APIs
- Complete referral workflows
- External provider integration
- Automation rules engine

**Tasks:**
```
Weeks 22-23:
  - Add referral tables to schema
  - Implement referral CRUD APIs

Weeks 24-25:
  - Build referral creation UI
  - Internal workflow (accept/reject/schedule)

Weeks 26-27:
  - External referral generation (PDF/email/FHIR)
  - Automation rules engine

Weeks 28-29:
  - AI-suggested referrals integration
  - Referral analytics dashboard

Weeks 30-31:
  - Testing, security audit, refinement
```

### Phase 5: Admin Console (Weeks 32-39)

**Deliverables:**
- Workflow template builder
- Automation rules configuration UI
- Process map viewer
- Central monitoring dashboard

**Tasks:**
```
Weeks 32-35:
  - Build workflow template builder
  - Implement automation rules configuration

Weeks 36-37:
  - Build process map viewer
  - Central monitoring dashboard

Weeks 38-39:
  - Audit logging for admin actions
  - Testing and documentation
```

### Phase 6: Testing & Go-Live (Weeks 40-47)

**Deliverables:**
- Complete test suite
- Security audit report
- Performance baseline
- Production deployment

**Tasks:**
```
Weeks 40-42:
  - E2E testing for all workflows
  - Security penetration testing
  - Performance optimization

Weeks 43-45:
  - HIPAA/GDPR compliance validation
  - User acceptance testing
  - Clinical validation

Weeks 46-47:
  - Production deployment
  - Monitoring and alerting setup
  - Post-launch support
```

---

## Success Metrics & KPIs

- **Dashboard Load Time**: < 2 seconds (target: 1.5s)
- **Widget Update Latency**: < 500ms (real-time events)
- **API Response Time**: < 200ms (p95)
- **Uptime**: 99.9%
- **Test Coverage**: > 80% (unit + integration)
- **Security**: Zero critical vulnerabilities (penetration test)
- **User Adoption**: 80% of roles using dashboards within 3 months
- **Referral Completion Time**: Reduced by 30% vs manual process
- **Patient Registration Completion Rate**: > 70%

---

## Communication Plan

- **Weekly**: Demo to stakeholders (30 min)
- **Bi-weekly**: Team sync on blockers (60 min)
- **Monthly**: Executive update on progress (15 min)
- **Async**: GitHub issues, PRs, documentation updates
- **On-Demand**: Escalations and security concerns

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Data migration complexity | Medium | High | Start DB design early, test migrations |
| WebSocket scalability | Medium | High | Load test early, Redis pub/sub proven at scale |
| Clinician adoption | Medium | Medium | Weekly demos, user feedback loop |
| Compliance delays | Low | High | Security audit in parallel, not at end |
| Team capacity | Medium | Medium | Cross-training, clear prioritization |

---

## Next Steps

1. **Immediate** (This Week):
   - Confirm team composition and assign leads
   - Schedule kick-off meeting with stakeholders
   - Begin DB schema design review

2. **Short Term** (Next 2 Weeks):
   - Set up development environment
   - Create API specification document
   - Assign work packages to team members

3. **Start Development** (Week 3):
   - Phase 1A begins (widget data layer)
   - Parallel: Database schema implementation

---

*Document Version: 1.0*  
*Last Updated: 2026-08-24*  
*Next Review: 2026-09-07*
