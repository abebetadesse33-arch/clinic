import {
  pgTable,
  uuid,
  text,
  timestamp,
  numeric,
  integer,
  boolean,
  jsonb,
  date,
  bigserial,
  varchar,
  decimal,
} from "drizzle-orm/pg-core";

// ==========================================
// 1. ORGANIZATIONS & MULTI-TENANCY
// ==========================================
export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  status: text("status", { enum: ["active", "suspended", "deleted"] }).default("active"),
  settings: jsonb("settings").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const facilities = pgTable("facilities", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  address: text("address"),
  timezone: text("timezone").default("UTC"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==========================================
// 2. USERS & MULTIDISCIPLINARY HEALTHCARE ROLES
// ==========================================
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  fullName: text("full_name").notNull(),
  role: text("role", {
    enum: [
      "system_admin",
      "tenant_admin",
      "physician",
      "nurse_practitioner",
      "nurse",
      "pharmacist",
      "physiotherapist",
      "occupational_therapist",
      "dietitian",
      "social_worker",
      "radiologist",
      "pathologist",
      "lab_technician",
      "genetic_counselor",
      "respiratory_therapist",
      "psychologist",
      "biologist",
      "care_coordinator",
      "patient",
      "auditor",
    ],
  }).notNull(),
  avatarUrl: text("avatar_url"),
  phone: text("phone"),
  nationalId: text("national_id"),
  department: text("department"),
  licenseNumber: text("license_number"),
  scopeOfPractice: jsonb("scope_of_practice").default({}), // e.g. { prescribe_controlled: false, can_order_diagnostics: true }
  isAdminGrantedBySuperAdmin: boolean("is_admin_granted_by_super_admin").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const professionalProfiles = pgTable("professional_profiles", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  professionalType: text("professional_type").notNull(),
  licenseNumber: text("license_number"),
  specialty: text("specialty"),
  certifications: jsonb("certifications").default([]),
  hospitalAffiliation: text("hospital_affiliation"),
  deaNumber: text("dea_number"),
  digitalSignatureRef: text("digital_signature_ref"),
  scopeOfPractice: jsonb("scope_of_practice").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==========================================
// 3. PATIENTS & CARE TEAMS
// ==========================================
export const patients = pgTable("patients", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  userId: uuid("user_id").references(() => users.id),
  mrn: text("mrn").notNull().unique(),
  nationalId: text("national_id"),
  nationalIdVerified: boolean("national_id_verified").default(false),
  digitalCardNumber: text("digital_card_number"),
  preferredClinicBranch: text("preferred_clinic_branch").default("habitat-main"),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  dateOfBirth: date("date_of_birth").notNull(),
  gender: text("gender", { enum: ["male", "female", "other", "undisclosed"] }).notNull(),
  bloodType: text("blood_type"),
  phone: text("phone"),
  email: text("email"),
  allergies: jsonb("allergies").default([]),
  emergencyContact: text("emergency_contact"),
  primaryDoctorId: uuid("primary_doctor_id").references(() => users.id),
  triagePriority: text("triage_priority", { enum: ["routine", "urgent", "critical"] }).default("routine"),
  avatar: text("avatar"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const careTeams = pgTable("care_teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  patientId: uuid("patient_id").references(() => patients.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const careTeamMembers = pgTable("care_team_members", {
  careTeamId: uuid("care_team_id").references(() => careTeams.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  role: text("role").notNull(), // physician, nurse, pharmacist, physiotherapist, dietitian, social_worker, etc.
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
});

export const encounters = pgTable("encounters", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  patientId: uuid("patient_id").references(() => patients.id, { onDelete: "cascade" }).notNull(),
  clinicianId: uuid("clinician_id").references(() => users.id).notNull(),
  encounterType: text("encounter_type", {
    enum: ["in_person", "telehealth", "emergency", "consultation", "follow_up", "multidisciplinary_case_conference"],
  }).notNull(),
  status: text("status", {
    enum: ["planned", "in_progress", "finished", "cancelled"],
  }).default("planned").notNull(),
  admissionStatus: text("admission_status", {
    enum: ["admitted", "observation", "outpatient", "emergency"],
  }).default("outpatient").notNull(),
  currentStep: text("current_step", {
    enum: [
      "front_desk",
      "nurse_assessment",
      "physician_review",
      "pharmacy_review",
      "dietitian_assessment",
      "social_work_assessment",
      "therapy_assessment",
      "discharge_planning",
      "completed",
    ],
  }).default("front_desk").notNull(),
  assignedNurseId: uuid("assigned_nurse_id").references(() => users.id),
  assignedPhysicianId: uuid("assigned_physician_id").references(() => users.id),
  assignedCareCoordinatorId: uuid("assigned_care_coordinator_id").references(() => users.id),
  workflowProgress: jsonb("workflow_progress").default({
    frontDesk: { status: "pending" },
    nurse: { status: "pending" },
    physician: { status: "pending" },
    pharmacist: { status: "pending" },
    dietitian: { status: "pending" },
    socialWork: { status: "pending" },
    therapy: { status: "pending" },
    careCoordinator: { status: "pending" },
  }),
  chiefComplaint: text("chief_complaint"),
  clinicalNotes: text("clinical_notes"),
  startTime: timestamp("start_time").defaultNow(),
  endTime: timestamp("end_time"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==========================================
// 4. MULTIMODAL MEDIA ASSETS
// ==========================================
export const mediaAssets = pgTable("media_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  patientId: uuid("patient_id").references(() => patients.id, { onDelete: "cascade" }).notNull(),
  encounterId: uuid("encounter_id").references(() => encounters.id),
  type: text("type", { enum: ["image", "audio", "video", "signal", "genomic", "document"] }).notNull(),
  modality: text("modality").notNull(),
  title: text("title").notNull(),
  fileUrl: text("file_url").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSizeKb: integer("file_size_kb"),
  metadata: jsonb("metadata").default({}),
  preprocessedSummary: text("preprocessed_summary"),
  confidenceScore: numeric("confidence_score"),
  uploadedBy: uuid("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==========================================
// 5. MULTIDISCIPLINARY CLINICAL ASSESSMENTS
// ==========================================

// --- Biological: Vitals & Symptoms ---
export const vitals = pgTable("vitals", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  patientId: uuid("patient_id").references(() => patients.id, { onDelete: "cascade" }).notNull(),
  encounterId: uuid("encounter_id").references(() => encounters.id),
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
  heightCm: numeric("height_cm"),
  weightKg: numeric("weight_kg"),
  bmi: numeric("bmi"),
  systolicBp: integer("systolic_bp"),
  diastolicBp: integer("diastolic_bp"),
  heartRate: integer("heart_rate"),
  respiratoryRate: integer("respiratory_rate"),
  temperatureC: numeric("temperature_c"),
  oxygenSaturation: numeric("oxygen_saturation"),
  ecgSummary: text("ecg_summary"),
  recordedBy: uuid("recorded_by").references(() => users.id),
});

export const symptoms = pgTable("symptoms", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  patientId: uuid("patient_id").references(() => patients.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  severity: text("severity", { enum: ["mild", "moderate", "severe"] }).notNull(),
  onsetDate: date("onset_date"),
  duration: text("duration"),
  bodyLocation: text("body_location"),
  description: text("description"),
  isPrimary: boolean("is_primary").default(false),
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
});

// --- Biological: Biochemistry & Labs ---
export const labResults = pgTable("lab_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  patientId: uuid("patient_id").references(() => patients.id, { onDelete: "cascade" }).notNull(),
  testName: text("test_name").notNull(),
  category: text("category").notNull(),
  value: text("value").notNull(),
  unit: text("unit").notNull(),
  referenceRangeLow: numeric("reference_range_low"),
  referenceRangeHigh: numeric("reference_range_high"),
  isAbnormal: boolean("is_abnormal").default(false).notNull(),
  interpretation: text("interpretation"),
  performedAt: timestamp("performed_at").defaultNow().notNull(),
  sourceLab: text("source_lab"),
  reportUrl: text("report_url"),
});

// --- Biological: Pharmacogenomics ---
export const geneticProfiles = pgTable("genetic_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  patientId: uuid("patient_id").references(() => patients.id, { onDelete: "cascade" }).notNull(),
  gene: text("gene").notNull(),
  variant: text("variant").notNull(),
  phenotype: text("phenotype").notNull(),
  clinicalSignificance: text("clinical_significance").notNull(),
  sourcePanel: text("source_panel"),
  vcfAssetId: uuid("vcf_asset_id").references(() => mediaAssets.id),
  testedAt: timestamp("tested_at").defaultNow().notNull(),
});

// --- Biological: Imaging Findings ---
export const imagingFindings = pgTable("imaging_findings", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  patientId: uuid("patient_id").references(() => patients.id, { onDelete: "cascade" }).notNull(),
  mediaAssetId: uuid("media_asset_id").references(() => mediaAssets.id),
  modality: text("modality").notNull(),
  bodySite: text("body_site").notNull(),
  findingSummary: text("finding_summary").notNull(),
  impression: text("impression").notNull(),
  imageUrl: text("image_url"),
  radiologistName: text("radiologist_name"),
  performedAt: timestamp("performed_at").defaultNow().notNull(),
});

// --- Role: Nursing Assessments ---
export const nursingAssessments = pgTable("nursing_assessments", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  patientId: uuid("patient_id").references(() => patients.id, { onDelete: "cascade" }).notNull(),
  encounterId: uuid("encounter_id").references(() => encounters.id),
  morseFallScore: integer("morse_fall_score"),
  fallRiskCategory: text("fall_risk_category", { enum: ["low", "moderate", "high"] }),
  bradenPressureScore: integer("braden_pressure_score"),
  painScore: integer("pain_score"), // 0-10
  intakeOutputMl: jsonb("intake_output_ml").default({ intake: 0, output: 0 }),
  nursingCareNotes: text("nursing_care_notes"),
  assessedBy: uuid("assessed_by").references(() => users.id).notNull(),
  assessedAt: timestamp("assessed_at").defaultNow().notNull(),
});

// --- Role: Physiotherapy & Physical Therapy ---
export const physiotherapyAssessments = pgTable("physiotherapy_assessments", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  patientId: uuid("patient_id").references(() => patients.id, { onDelete: "cascade" }).notNull(),
  bergBalanceScore: integer("berg_balance_score"), // 0-56
  gaitSpeedMetersPerSec: numeric("gait_speed_meters_per_sec"),
  mobilityStatus: text("mobility_status"), // Independent, Assistive Device, Dependent
  strengthGrading: jsonb("strength_grading").default({}), // e.g. { quadriceps: "4/5", hamstrings: "4/5" }
  rehabGoals: text("rehab_goals"),
  exercisePlan: jsonb("exercise_plan").default({}),
  assessedBy: uuid("assessed_by").references(() => users.id).notNull(),
  assessedAt: timestamp("assessed_at").defaultNow().notNull(),
});

// --- Role: Occupational Therapy ---
export const occupationalTherapyAssessments = pgTable("occupational_therapy_assessments", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  patientId: uuid("patient_id").references(() => patients.id, { onDelete: "cascade" }).notNull(),
  barthelIndexScore: integer("barthel_index_score"), // 0-100 ADL
  homeSafetyRisk: text("home_safety_risk", { enum: ["low", "moderate", "high"] }),
  adaptiveEquipmentNeeds: jsonb("adaptive_equipment_needs").default([]),
  cognitiveSupportNotes: text("cognitive_support_notes"),
  assessedBy: uuid("assessed_by").references(() => users.id).notNull(),
  assessedAt: timestamp("assessed_at").defaultNow().notNull(),
});

// --- Role: Dietitian & Nutritionist ---
export const nutritionAssessments = pgTable("nutrition_assessments", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  patientId: uuid("patient_id").references(() => patients.id, { onDelete: "cascade" }).notNull(),
  nutritionalRiskScore: text("nutritional_risk_score", { enum: ["low", "moderate", "high_malnutrition"] }),
  dailyCalorieTarget: integer("daily_calorie_target"),
  proteinTargetGrams: integer("protein_target_grams"),
  sodiumLimitMg: integer("sodium_limit_mg"),
  dietType: text("diet_type"), // Mediterranean, Renal Diabetic, Low Sodium
  foodInsecurityAccommodation: text("food_insecurity_accommodation"),
  mealPlanDetails: jsonb("meal_plan_details").default({}),
  assessedBy: uuid("assessed_by").references(() => users.id).notNull(),
  assessedAt: timestamp("assessed_at").defaultNow().notNull(),
});

// --- Role: Social Work & SDOH ---
export const socialHistory = pgTable("social_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  patientId: uuid("patient_id").references(() => patients.id, { onDelete: "cascade" }).notNull(),
  category: text("category").notNull(),
  indicator: text("indicator").notNull(),
  severityLevel: text("severity_level", { enum: ["low", "medium", "high"] }).notNull(),
  description: text("description").notNull(),
  recommendedAction: text("recommended_action"),
  communityResourcesConnected: jsonb("community_resources_connected").default([]),
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
});

// --- Role: Respiratory Therapy ---
export const respiratoryAssessments = pgTable("respiratory_assessments", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  patientId: uuid("patient_id").references(() => patients.id, { onDelete: "cascade" }).notNull(),
  abgPh: numeric("abg_ph"),
  abgPaco2: numeric("abg_paco2"),
  abgPao2: numeric("abg_pao2"),
  abgHco3: numeric("abg_hco3"),
  abgSao2: numeric("abg_sao2"),
  ventilatorSettings: jsonb("ventilator_settings").default({}),
  airwayClearanceRegimen: text("airway_clearance_regimen"),
  assessedBy: uuid("assessed_by").references(() => users.id).notNull(),
  assessedAt: timestamp("assessed_at").defaultNow().notNull(),
});

// --- Role: Psychological Assessments ---
export const psychologicalAssessments = pgTable("psychological_assessments", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  patientId: uuid("patient_id").references(() => patients.id, { onDelete: "cascade" }).notNull(),
  testName: text("test_name").notNull(),
  score: integer("score").notNull(),
  severity: text("severity").notNull(),
  breakdown: jsonb("breakdown"),
  clinicalNotes: text("clinical_notes"),
  adherenceRisk: text("adherence_risk", { enum: ["low", "moderate", "high"] }).default("low"),
  assessedBy: uuid("assessed_by").references(() => users.id),
  assessedAt: timestamp("assessed_at").defaultNow().notNull(),
});

// ==========================================
// 6. MEDICATIONS, PRESCRIPTIONS, & ORDERS
// ==========================================
export const medications = pgTable("medications", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  patientId: uuid("patient_id").references(() => patients.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  dosage: text("dosage").notNull(),
  frequency: text("frequency").notNull(),
  route: text("route").default("Oral"),
  indication: text("indication"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  isActive: boolean("is_active").default(true).notNull(),
  prescribedBy: uuid("prescribed_by").references(() => users.id),
  pharmacistVerified: boolean("pharmacist_verified").default(false),
  notes: text("notes"),
});

export const prescriptions = pgTable("prescriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  patientId: uuid("patient_id").references(() => patients.id, { onDelete: "cascade" }).notNull(),
  encounterId: uuid("encounter_id").references(() => encounters.id),
  doctorId: uuid("doctor_id").references(() => users.id).notNull(),
  aiSuggestionId: uuid("ai_suggestion_id"),
  status: text("status", { enum: ["draft", "signed", "pending_payment", "payment_cleared", "dispensed", "discontinued", "rejected", "cancelled"] }).default("draft").notNull(),
  medicationName: text("medication_name").notNull(),
  dosage: text("dosage").notNull(),
  frequency: text("frequency").notNull(),
  route: text("route").default("Oral"),
  indication: text("indication"),
  durationDays: integer("duration_days").notNull(),
  quantity: integer("quantity").notNull(),
  dispenseQuantity: integer("dispense_quantity"),
  refillsAllowed: integer("refills_allowed").default(0).notNull(),
  instructions: text("instructions").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).default("0.00"),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).default("0.00"),
  currency: varchar("currency", { length: 10 }).default("ETB").notNull(),
  paymentStatus: text("payment_status", { enum: ["unpaid", "paid", "waived", "free"] }).default("unpaid").notNull(),
  invoiceId: uuid("invoice_id").references(() => invoices.id),
  transactionRef: text("transaction_ref"),
  paidAt: timestamp("paid_at"),
  prescriberSignature: text("prescriber_signature"),
  signedAt: timestamp("signed_at"),
  pharmacistId: uuid("pharmacist_id").references(() => users.id),
  dispensedAt: timestamp("dispensed_at"),
  nurseId: uuid("nurse_id").references(() => users.id),
  wardId: text("ward_id"),
  bedNumber: text("bed_number"),
  deliveryMethod: text("delivery_method", { enum: ["pickup", "nurse_delivery", "bedside"] }).default("pickup"),
  patientNotifiedAt: timestamp("patient_notified_at"),
  doctorNotifiedAt: timestamp("doctor_notified_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});


export const labOrders = pgTable("lab_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  patientId: uuid("patient_id").references(() => patients.id, { onDelete: "cascade" }).notNull(),
  encounterId: uuid("encounter_id").references(() => encounters.id),
  doctorId: uuid("doctor_id").references(() => users.id).notNull(),
  aiSuggestionId: uuid("ai_suggestion_id"),
  testName: text("test_name").notNull(),
  clinicalReason: text("clinical_reason").notNull(),
  priority: text("priority", { enum: ["routine", "urgent", "stat"] }).default("routine").notNull(),
  status: text("status", { enum: ["ordered", "pending_payment", "payment_cleared", "sample_collected", "processing", "completed", "cancelled"] }).default("ordered").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).default("0.00"),
  currency: varchar("currency", { length: 10 }).default("ETB").notNull(),
  paymentStatus: text("payment_status", { enum: ["unpaid", "paid", "waived", "free"] }).default("unpaid").notNull(),
  invoiceId: uuid("invoice_id").references(() => invoices.id),
  transactionRef: text("transaction_ref"),
  paidAt: timestamp("paid_at"),
  sampleCollectedAt: timestamp("sample_collected_at"),
  sampleCollectedBy: uuid("sample_collected_by").references(() => users.id),
  orderedAt: timestamp("ordered_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

// ==========================================
// 6B. CLINICAL ORDERS (UNIFIED ENTERPRISE PIPELINE)
// ==========================================
export const clinicalOrders = pgTable("clinical_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  patientId: uuid("patient_id").references(() => patients.id, { onDelete: "cascade" }).notNull(),
  encounterId: uuid("encounter_id").references(() => encounters.id, { onDelete: "restrict" }).notNull(),
  orderingDoctorId: uuid("ordering_doctor_id").references(() => users.id).notNull(),
  orderType: text("order_type", { enum: ["laboratory", "pharmacy", "imaging", "procedure"] }).notNull(),
  status: text("status", {
    enum: [
      "draft",
      "ordered",
      "pending_collection",
      "specimen_received",
      "in_analysis",
      "preliminary",
      "final_verified",
      "reviewed_by_provider",
      "closed",
      "cancelled"
    ]
  }).default("ordered").notNull(),
  clinicalIndication: text("clinical_indication").notNull(),
  priority: text("priority", { enum: ["routine", "urgent", "stat"] }).default("routine").notNull(),
  isSensitive: boolean("is_sensitive").default(false).notNull(), // Biopsy, HIV, oncology holding staged release
  releaseAt: timestamp("release_at"), // Staged patient portal release time
  isReleasedEarly: boolean("is_released_early").default(false).notNull(),
  specimenBarcode: text("specimen_barcode"),
  collectedBy: uuid("collected_by").references(() => users.id),
  collectedAt: timestamp("collected_at"),
  cancellationReason: text("cancellation_reason"),
  cancelledBy: uuid("cancelled_by").references(() => users.id),
  cancelledAt: timestamp("cancelled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Critical / Panic Value Alerts
export const criticalAlerts = pgTable("critical_alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  orderId: uuid("order_id").references(() => clinicalOrders.id, { onDelete: "cascade" }).notNull(),
  encounterId: uuid("encounter_id").references(() => encounters.id).notNull(),
  patientId: uuid("patient_id").references(() => patients.id).notNull(),
  testName: text("test_name").notNull(),
  criticalValue: text("critical_value").notNull(),
  tier: text("tier", { enum: ["tier_1_physician", "tier_2_charge_nurse", "tier_3_medical_director"] }).default("tier_1_physician").notNull(),
  acknowledgedBy: uuid("acknowledged_by").references(() => users.id),
  acknowledgedAt: timestamp("acknowledged_at"),
  escalatedAt: timestamp("escalated_at"),
  acknowledgmentNote: text("acknowledgment_note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Transactional Outbox Pattern for Order Workflow Events
export const orderOutboxEvents = pgTable("order_outbox_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  orderId: uuid("order_id").references(() => clinicalOrders.id, { onDelete: "cascade" }).notNull(),
  eventType: text("event_type").notNull(),
  payload: text("payload").notNull(), // JSON serialized
  status: text("status", { enum: ["pending", "processing", "completed", "failed"] }).default("pending").notNull(),
  retryCount: integer("retry_count").default(0).notNull(),
  errorMessage: text("error_message"),
  idempotencyKey: text("idempotency_key").unique().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
});

// ==========================================
// 7. MULTIDISCIPLINARY UNIFIED CARE PLAN & TASKS
// ==========================================
export const carePlans = pgTable("care_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  patientId: uuid("patient_id").references(() => patients.id, { onDelete: "cascade" }).notNull(),
  createdBy: uuid("created_by").references(() => users.id).notNull(),
  status: text("status", { enum: ["draft", "active", "under_review", "completed"] }).default("active").notNull(),
  primaryDiagnosis: text("primary_diagnosis").notNull(),
  goals: jsonb("goals").default([]), // array of { id, title, targetDate, status, assignedRole }
  interventions: jsonb("interventions").default([]), // array of { id, role, description, frequency, status, signedBy }
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  patientId: uuid("patient_id").references(() => patients.id, { onDelete: "cascade" }).notNull(),
  encounterId: uuid("encounter_id").references(() => encounters.id),
  taskType: text("task_type", {
    enum: [
      "vitals_assessment",
      "nursing_assessment",
      "physician_review",
      "pharmacy_review",
      "nutrition_assessment",
      "social_work_assessment",
      "therapy_assessment",
      "discharge_planning",
      "general",
    ],
  }).default("general").notNull(),
  assignedToRole: text("assigned_to_role").notNull(), // e.g. "nurse", "physician", "pharmacist", "dietitian", "social_worker", "physiotherapist", "care_coordinator"
  assignedToUserId: uuid("assigned_to_user_id").references(() => users.id),
  assignedByUserId: uuid("assigned_by_user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  priority: text("priority", { enum: ["routine", "urgent", "stat"] }).default("routine").notNull(),
  status: text("status", { enum: ["pending", "in_progress", "completed", "cancelled"] }).default("pending").notNull(),
  slaMinutes: integer("sla_minutes").default(60).notNull(),
  isEscalated: boolean("is_escalated").default(false).notNull(),
  dueDate: date("due_date"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const teamMessages = pgTable("team_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  patientId: uuid("patient_id").references(() => patients.id, { onDelete: "cascade" }).notNull(),
  senderId: uuid("sender_id").references(() => users.id).notNull(),
  senderRole: text("sender_role").notNull(),
  content: text("content").notNull(),
  isUrgentConsult: boolean("is_urgent_consult").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==========================================
// 8. CLINICAL DECISION SUPPORT & MULTIMODAL AI
// ==========================================
export const aiSuggestions = pgTable("ai_suggestions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  patientId: uuid("patient_id").references(() => patients.id, { onDelete: "cascade" }).notNull(),
  sessionId: uuid("session_id").references(() => encounters.id),
  analysisType: text("analysis_type").default("comprehensive_multidisciplinary").notNull(),
  modelName: text("model_name").default("gemini-1.5-pro").notNull(),
  modelVersion: text("model_version").default("2026.2-multidisciplinary"),
  inputSummary: jsonb("input_summary").notNull(),
  rawDataRefs: jsonb("raw_data_refs").default([]).notNull(),
  aiResponse: jsonb("ai_response").notNull(), // Multidisciplinary bundle
  status: text("status", { enum: ["pending_review", "accepted_full", "accepted_modified", "rejected"] }).default("pending_review").notNull(),
  reviewNotes: text("review_notes"),
  reviewedBy: uuid("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==========================================
// 9. DOCUMENTS, CONSENTS, & RAG KNOWLEDGE BASE
// ==========================================
export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  patientId: uuid("patient_id").references(() => patients.id, { onDelete: "cascade" }).notNull(),
  encounterId: uuid("encounter_id").references(() => encounters.id),
  type: text("type").notNull(),
  fileUrl: text("file_url").notNull(),
  mimeType: text("mime_type"),
  uploadedBy: uuid("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const consents = pgTable("consents", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  patientId: uuid("patient_id").references(() => patients.id, { onDelete: "cascade" }).notNull(),
  type: text("type").notNull(),
  status: text("status", { enum: ["active", "withdrawn", "expired"] }).default("active").notNull(),
  scope: jsonb("scope").default({}),
  signedAt: timestamp("signed_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
});

export const knowledgeDocuments = pgTable("knowledge_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  source: text("source").notNull(),
  category: text("category").notNull(),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const biologicalRules = pgTable("biological_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  curatedBy: uuid("curated_by").references(() => users.id).notNull(),
  category: text("category").notNull(),
  ruleTitle: text("rule_title").notNull(),
  description: text("description").notNull(),
  evidenceGrade: text("evidence_grade").notNull(),
  sourceCitation: text("source_citation").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==========================================
// 10. IMMUTABLE AUDIT LOG (HIPAA / GDPR / 21 CFR)
// ==========================================
export const auditLogs = pgTable("audit_logs", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  tenantId: uuid("tenant_id").references(() => organizations.id),
  userId: uuid("user_id").references(() => users.id),
  userRole: text("user_role"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  summary: text("summary"),
  diff: jsonb("diff"),
  ipAddress: text("ip_address").default("127.0.0.1"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==========================================
// 11. MULTI-ROLE USER MEMBERSHIPS
// ==========================================
export const userRoles = pgTable("user_roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  role: text("role").notNull(),
  isPrimary: boolean("is_primary").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  grantedBy: uuid("granted_by").references(() => users.id),
  grantedAt: timestamp("granted_at").defaultNow().notNull(),
  revokedAt: timestamp("revoked_at"),
});

// ==========================================
// 12. DYNAMIC DASHBOARD WIDGET REGISTRY & LAYOUTS
// ==========================================
export const legacyDashboardWidgets = pgTable("legacy_dashboard_widgets", {
  id: uuid("id").primaryKey().defaultRandom(),
  widgetId: text("widget_id").notNull().unique(), // e.g. "my_patients", "critical_alerts"
  displayName: text("display_name").notNull(),
  description: text("description"),
  category: text("category").notNull(), // "clinical", "pharmacy", "admin", etc.
  defaultColSpan: integer("default_col_span").default(1).notNull(),
  defaultRowSpan: integer("default_row_span").default(1).notNull(),
  allowedRoles: jsonb("allowed_roles").default([]).notNull(), // array of Role strings
  refreshIntervalSeconds: integer("refresh_interval_seconds").default(60),
  isSystemWidget: boolean("is_system_widget").default(false).notNull(),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const dashboardLayouts = pgTable("dashboard_layouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  role: text("role").notNull(),
  widgetId: text("widget_id").notNull(),
  displayOrder: integer("display_order").notNull(),
  colSpan: integer("col_span").default(1).notNull(),
  rowSpan: integer("row_span").default(1).notNull(),
  isEnabled: boolean("is_enabled").default(true).notNull(),
  refreshIntervalSeconds: integer("refresh_interval_seconds").default(60),
  customConfig: jsonb("custom_config").default({}),
  updatedBy: uuid("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ==========================================
// 13. AUTOMATED CLINICAL REFERRALS
// ==========================================
export const referrals = pgTable("referrals", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  patientId: uuid("patient_id").references(() => patients.id).notNull(),
  encounterId: uuid("encounter_id"),
  carePlanId: uuid("care_plan_id"),
  type: text("type", { enum: ["internal", "external", "self"] }).default("internal").notNull(),
  source: text("source", { enum: ["manual", "ai", "patient"] }).default("manual").notNull(),
  referringUserId: uuid("referring_user_id").references(() => users.id).notNull(),
  referringRole: text("referring_role").notNull(),
  receivingRole: text("receiving_role").notNull(),
  receivingUserId: uuid("receiving_user_id").references(() => users.id),
  targetType: text("target_type", { enum: ["professional", "department", "facility", "external_provider"] }).default("professional").notNull(),
  targetId: text("target_id"),
  externalProviderId: uuid("external_provider_id"),
  priority: text("priority", { enum: ["routine", "urgent", "stat"] }).default("routine").notNull(),
  status: text("status", {
    enum: [
      "draft",
      "pending_review",
      "approved",
      "accepted",
      "scheduled",
      "in_progress",
      "completed",
      "cancelled",
      "rejected",
      "no_show",
    ],
  }).default("pending_review").notNull(),
  clinicalReason: text("clinical_reason").notNull(),
  clinicalSummary: text("clinical_summary"),
  notes: text("notes"),
  insuranceAuthNumber: text("insurance_auth_number"),
  scheduledAppointmentId: text("scheduled_appointment_id"),
  attachedDataRefs: jsonb("attached_data_refs").default([]),
  dueBy: timestamp("due_by"),
  acceptedAt: timestamp("accepted_at"),
  completedAt: timestamp("completed_at"),
  responseNotes: text("response_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const referralLogs = pgTable("referral_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  referralId: uuid("referral_id").references(() => referrals.id, { onDelete: "cascade" }).notNull(),
  action: text("action").notNull(),
  fromStatus: text("from_status"),
  toStatus: text("to_status").notNull(),
  performedBy: uuid("performed_by").references(() => users.id).notNull(),
  performerRole: text("performer_role").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const externalProviders = pgTable("external_providers", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  specialty: text("specialty").notNull(),
  facilityName: text("facility_name"),
  address: text("address"),
  email: text("email"),
  phone: text("phone"),
  fax: text("fax"),
  npi: text("npi"),
  fhirEndpoint: text("fhir_endpoint"),
  preferredTransport: text("preferred_transport", { enum: ["fhir", "email", "fax"] }).default("email").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==========================================
// 14. REAL-TIME NOTIFICATIONS
// ==========================================
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  userId: uuid("user_id").references(() => users.id),
  recipientUserId: uuid("recipient_user_id").references(() => users.id),
  senderUserId: uuid("sender_user_id").references(() => users.id),
  type: text("type", {
    enum: [
      "critical_alert",
      "task_assigned",
      "referral_received",
      "referral_accepted",
      "referral_completed",
      "medication_due",
      "lab_result_ready",
      "ai_analysis_complete",
      "consult_request",
      "discharge_ready",
      "message_received",
      "role_switch",
      "system_alert",
      "appointment_booked",
      "treat_me_now",
      "order_placed",
      "payment_pending",
      "payment_received",
      "clinician_signed_in",
      "clinician_signed_out",
      "patient_registered",
    ],
  }).notNull(),
  title: text("title").notNull(),
  message: text("message"),
  body: text("body").notNull(),
  priority: text("priority", { enum: ["low", "normal", "high", "critical"] }).default("normal").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  actionUrl: text("action_url"),
  actionText: text("action_text"),
  targetRole: text("target_role"),
  targetDepartment: text("target_department"),
  relatedEntityType: text("related_entity_type"),
  relatedEntityId: text("related_entity_id"),
  metadata: jsonb("metadata").default({}),
  readAt: timestamp("read_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notificationPrivileges = pgTable("notification_privileges", {
  id: uuid("id").primaryKey().defaultRandom(),
  role: text("role").notNull(),
  category: text("category").notNull(), // 'appointments' | 'orders' | 'billing' | 'clinical_alerts' | 'auth_shifts' | 'system'
  isEnabled: boolean("is_enabled").default(true).notNull(),
  channels: jsonb("channels").default({ inApp: true, telegram: true }).notNull(),
  updatedBy: uuid("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==========================================
// 15. PATIENT SELF-REGISTRATION & PORTAL
// ==========================================
export const patientRegistrations = pgTable("patient_registrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  status: text("status", { enum: ["invited", "started", "submitted", "verified", "active", "rejected"] }).default("started").notNull(),
  verificationToken: text("verification_token"),
  verificationExpiresAt: timestamp("verification_expires_at"),
  submittedData: jsonb("submitted_data").default({}).notNull(),
  duplicatePatientId: uuid("duplicate_patient_id").references(() => patients.id),
  invitedByUserId: uuid("invited_by_user_id").references(() => users.id),
  activatedPatientId: uuid("activated_patient_id").references(() => patients.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const patientConsents = pgTable("patient_consents", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  patientId: uuid("patient_id").references(() => patients.id, { onDelete: "cascade" }).notNull(),
  consentType: text("consent_type").notNull(), // treatment, ai_processing, data_sharing, research, specialist_access
  isGranted: boolean("is_granted").default(true).notNull(),
  version: text("version").default("1.0").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  signatureUrl: text("signature_url"),
  grantedAt: timestamp("granted_at").defaultNow().notNull(),
  revokedAt: timestamp("revoked_at"),
});

export const patientMessages = pgTable("patient_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  patientId: uuid("patient_id").references(() => patients.id, { onDelete: "cascade" }).notNull(),
  senderId: uuid("sender_id").notNull(), // can be user or patient
  senderType: text("sender_type", { enum: ["patient", "clinician", "system"] }).notNull(),
  recipientId: uuid("recipient_id").notNull(),
  recipientType: text("recipient_type", { enum: ["patient", "clinician"] }).notNull(),
  subject: text("subject"),
  body: text("body").notNull(),
  attachments: jsonb("attachments").default([]),
  isRead: boolean("is_read").default(false).notNull(),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const patientQuestionnaires = pgTable("patient_questionnaires", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  patientId: uuid("patient_id").references(() => patients.id, { onDelete: "cascade" }).notNull(),
  questionnaireType: text("questionnaire_type").notNull(), // phq9, gad7, sdoh, pre_visit
  title: text("title").notNull(),
  responses: jsonb("responses").default({}).notNull(),
  totalScore: integer("total_score"),
  riskCategory: text("risk_category"),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
});

// ==========================================
// 16. ADMIN WORKFLOW TEMPLATES & AUTOMATION RULES
// ==========================================
export const workflowTemplates = pgTable("workflow_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  processType: text("process_type", {
    enum: [
      "referral",
      "consultation",
      "lab_order",
      "medication_order",
      "discharge",
      "care_plan",
      "patient_registration",
    ],
  }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  steps: jsonb("steps").default([]).notNull(),
  version: integer("version").default(1).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const automationRules = pgTable("automation_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  triggerType: text("trigger_type", {
    enum: [
      "lab_value",
      "vital",
      "assessment",
      "diagnosis",
      "medication",
      "sdoh",
      "risk_score",
    ],
  }).notNull(),
  condition: jsonb("condition").notNull(), // e.g. { metric: "hba1c", operator: ">", threshold: 9.0 }
  action: jsonb("action").notNull(), // e.g. { type: "suggest_referral", targetRole: "dietitian", reason: "Elevated HbA1c" }
  priority: integer("priority").default(1).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  escalationTimeoutMinutes: integer("escalation_timeout_minutes").default(1440),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const configAuditLogs = pgTable("config_audit_logs", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id).notNull(),
  adminId: uuid("admin_id").references(() => users.id).notNull(),
  adminName: text("admin_name").notNull(),
  entityType: text("entity_type").notNull(), // workflow_template, automation_rule, external_provider, registration_config
  entityId: text("entity_id").notNull(),
  action: text("action").notNull(), // create, update, delete, activate, deactivate
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value"),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==========================================
// 17. SUBSCRIPTION PLANS & PRICING
// ==========================================
export const subscriptionPlans = pgTable("subscription_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  type: text("type", { enum: ["individual", "family", "company"] }).notNull(),
  billingCycle: text("billing_cycle", { enum: ["monthly", "quarterly", "yearly"] }).notNull(),
  basePrice: numeric("base_price").notNull(),
  currency: text("currency").default("ETB").notNull(),
  maxMembers: integer("max_members"), // null = unlimited (for corporate custom)
  additionalMemberPrice: numeric("additional_member_price").default("0"),
  includedServices: jsonb("included_services").default({
    consultations: 0,
    labTests: 0,
    discountPercent: 0,
    coveredCategories: [],
  }).notNull(),
  trialPeriodDays: integer("trial_period_days").default(0),
  isActive: boolean("is_active").default(true).notNull(),
  version: integer("version").default(1).notNull(),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ==========================================
// 18. FAMILY GROUPS (B2C ENTITIES)
// ==========================================
export const familyGroups = pgTable("family_groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  primaryPatientId: uuid("primary_patient_id").references(() => patients.id, { onDelete: "restrict" }).notNull(),
  name: text("name").notNull(), // e.g. "The Abebe Family"
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const familyMembers = pgTable("family_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  familyGroupId: uuid("family_group_id").references(() => familyGroups.id, { onDelete: "cascade" }).notNull(),
  patientId: uuid("patient_id").references(() => patients.id, { onDelete: "cascade" }).notNull(),
  relationship: text("relationship", { enum: ["primary", "spouse", "child", "parent", "other"] }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  canViewSharedBilling: boolean("can_view_shared_billing").default(false).notNull(),
  addedAt: timestamp("added_at").defaultNow().notNull(),
});

// ==========================================
// 19. CORPORATE CLIENTS / COMPANIES (B2B ENTITIES)
// ==========================================
export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  tinNumber: text("tin_number"),
  industry: text("industry"),
  contactPerson: text("contact_person").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  billingAddress: text("billing_address"),
  billingEmail: text("billing_email"),
  preferredPaymentMethod: text("preferred_payment_method", { enum: ["telebirr", "chapa", "bank_transfer"] }).default("bank_transfer"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const companyAdmins = pgTable("company_admins", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  role: text("role", { enum: ["owner", "hr_manager", "finance_viewer"] }).default("hr_manager").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const companyEmployeeInvitations = pgTable("company_employee_invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  employeeIdNumber: text("employee_id_number"),
  department: text("department"),
  status: text("status", { enum: ["pending", "accepted", "expired", "revoked"] }).default("pending").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  claimedPatientId: uuid("claimed_patient_id").references(() => patients.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==========================================
// 20. ACTIVE SUBSCRIPTIONS & SEATS
// ==========================================
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  planId: uuid("plan_id").references(() => subscriptionPlans.id).notNull(),
  subscriberType: text("subscriber_type", { enum: ["individual", "family", "company"] }).notNull(),
  familyGroupId: uuid("family_group_id").references(() => familyGroups.id),
  companyId: uuid("company_id").references(() => companies.id),
  patientId: uuid("patient_id").references(() => patients.id),
  seatCount: integer("seat_count").default(1).notNull(),
  status: text("status", {
    enum: ["active", "past_due", "cancelled", "expired", "trial", "paused"],
  }).default("active").notNull(),
  currentPeriodStart: timestamp("current_period_start").notNull(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(),
  cancelledAt: timestamp("cancelled_at"),
  trialEndsAt: timestamp("trial_ends_at"),
  pausedAt: timestamp("paused_at"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const subscriptionMembers = pgTable("subscription_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  subscriptionId: uuid("subscription_id").references(() => subscriptions.id, { onDelete: "cascade" }).notNull(),
  patientId: uuid("patient_id").references(() => patients.id, { onDelete: "cascade" }).notNull(),
  role: text("role", { enum: ["primary", "dependent", "employee"] }).default("employee").notNull(),
  department: text("department"),
  employeeIdNumber: text("employee_id_number"),
  isActive: boolean("is_active").default(true).notNull(),
  addedAt: timestamp("added_at").defaultNow().notNull(),
  removedAt: timestamp("removed_at"),
});

// ==========================================
// 21. USAGE TRACKING & BENEFIT LEDGER
// ==========================================
export const subscriptionUsage = pgTable("subscription_usage", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  subscriptionId: uuid("subscription_id").references(() => subscriptions.id, { onDelete: "cascade" }).notNull(),
  patientId: uuid("patient_id").references(() => patients.id).notNull(),
  serviceType: text("service_type", {
    enum: ["consultation", "lab_test", "medication", "procedure", "telehealth", "physiotherapy"],
  }).notNull(),
  serviceId: uuid("service_id"),
  quantity: integer("quantity").default(1).notNull(),
  nominalPrice: numeric("nominal_price").notNull(),
  coveredAmount: numeric("covered_amount").notNull(),
  patientCopayAmount: numeric("patient_copay_amount").default("0").notNull(),
  billingPeriodStart: timestamp("billing_period_start").notNull(),
  billingPeriodEnd: timestamp("billing_period_end").notNull(),
  consumedAt: timestamp("consumed_at").defaultNow().notNull(),
});

// ==========================================
// 22. SUBSCRIPTION INVOICES & PAYMENTS
// ==========================================
export const subscriptionInvoices = pgTable("subscription_invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  subscriptionId: uuid("subscription_id").references(() => subscriptions.id, { onDelete: "cascade" }).notNull(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  baseAmount: numeric("base_amount").notNull(),
  additionalSeatsAmount: numeric("additional_seats_amount").default("0").notNull(),
  discountAmount: numeric("discount_amount").default("0").notNull(),
  taxAmount: numeric("tax_amount").default("0").notNull(),
  totalAmount: numeric("total_amount").notNull(),
  currency: text("currency").default("ETB").notNull(),
  status: text("status", { enum: ["draft", "open", "paid", "void", "uncollectible", "past_due"] }).default("open").notNull(),
  paymentMethod: text("payment_method", { enum: ["telebirr", "chapa", "bank_transfer", "cash"] }),
  paymentReference: text("payment_reference"),
  gatewayTransactionId: text("gateway_transaction_id"),
  dueDate: timestamp("due_date").notNull(),
  paidAt: timestamp("paid_at"),
  pdfUrl: text("pdf_url"),
  dunningAttempts: integer("dunning_attempts").default(0).notNull(),
  lastDunningAt: timestamp("last_dunning_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ==========================================
// 23. AI PATIENT EDUCATION & CONSULTATION VIDEOS
// ==========================================
export const patientEducationVideos = pgTable("patient_education_videos", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  patientId: uuid("patient_id").references(() => patients.id, { onDelete: "cascade" }).notNull(),
  encounterId: uuid("encounter_id").references(() => encounters.id),
  title: text("title").notNull(),
  conditionName: text("condition_name").notNull(),
  script: text("script").notNull(),
  language: text("language").default("en").notNull(), // en, am, om, ti, so
  videoType: text("video_type", { enum: ["condition_explainer", "medication_counseling", "lifestyle_guide", "post_op_care"] }).default("condition_explainer").notNull(),
  videoUrl: text("video_url"),
  thumbnailUrl: text("thumbnail_url"),
  durationSeconds: integer("duration_seconds").default(60),
  animationConfig: jsonb("animation_config").default({}),
  status: text("status", { enum: ["draft", "generating", "ready", "failed"] }).default("draft").notNull(),
  generatedBy: uuid("generated_by").references(() => users.id),
  reviewedBy: uuid("reviewed_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ==========================================
// 24. MEDICATION EDUCATION & INTERACTION KNOWLEDGE
// ==========================================
export const medicationEducation = pgTable("medication_education", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  medicationId: uuid("medication_id").references(() => medications.id, { onDelete: "cascade" }).notNull(),
  patientId: uuid("patient_id").references(() => patients.id, { onDelete: "cascade" }).notNull(),
  plainLanguageSummary: text("plain_language_summary").notNull(),
  dosageInstructions: text("dosage_instructions").notNull(),
  sideEffects: jsonb("side_effects").default({
    common: [],
    serious: [],
    rare: [],
  }).notNull(),
  interactions: jsonb("interactions").default({
    drugs: [],
    foods: [],
    conditions: [],
    pharmacogenomics: [],
  }).notNull(),
  lifestyleAdvice: jsonb("lifestyle_advice").default([]),
  videoId: uuid("video_id").references(() => patientEducationVideos.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==========================================
// 25. CURATED VIDEO RECOMMENDATIONS (YOUTUBE / TIKTOK)
// ==========================================
export const videoRecommendations = pgTable("video_recommendations", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  platform: text("platform", { enum: ["youtube", "tiktok", "vimeo", "custom"] }).notNull(),
  videoUrl: text("video_url").notNull(),
  embedId: text("embed_id").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  durationSeconds: integer("duration_seconds"),
  category: text("category", { enum: ["condition", "medication", "lifestyle", "nutrition", "exercise", "procedure"] }).notNull(),
  relatedIcd10: jsonb("related_icd10").default([]),
  relatedMedications: jsonb("related_medications").default([]),
  language: text("language").default("en").notNull(),
  sourceChannel: text("source_channel"),
  isVerifiedMedicalSource: boolean("is_verified_medical_source").default(true).notNull(),
  isApproved: boolean("is_approved").default(true).notNull(),
  approvedBy: uuid("approved_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const patientVideoRecommendations = pgTable("patient_video_recommendations", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  patientId: uuid("patient_id").references(() => patients.id, { onDelete: "cascade" }).notNull(),
  videoRecommendationId: uuid("video_recommendation_id").references(() => videoRecommendations.id, { onDelete: "cascade" }).notNull(),
  encounterId: uuid("encounter_id").references(() => encounters.id),
  recommendedBy: uuid("recommended_by").references(() => users.id),
  relevanceScore: numeric("relevance_score").default("1.0"),
  status: text("status", { enum: ["recommended", "viewed", "bookmarked", "completed"] }).default("recommended").notNull(),
  patientRating: integer("patient_rating"),
  feedbackNotes: text("feedback_notes"),
  recommendedAt: timestamp("recommended_at").defaultNow().notNull(),
  viewedAt: timestamp("viewed_at"),
});

// ==========================================
// 26. ENHANCED TELEMEDICINE SESSIONS
// ==========================================
export const telemedicineSessions = pgTable("telemedicine_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  encounterId: uuid("encounter_id").references(() => encounters.id, { onDelete: "cascade" }).notNull(),
  patientId: uuid("patient_id").references(() => patients.id, { onDelete: "cascade" }).notNull(),
  doctorId: uuid("doctor_id").references(() => users.id).notNull(),
  platform: text("platform", { enum: ["livekit", "twilio", "agora", "in_app"] }).default("livekit").notNull(),
  roomId: text("room_id").notNull().unique(),
  status: text("status", { enum: ["scheduled", "waiting", "in_progress", "completed", "cancelled", "no_show"] }).default("scheduled").notNull(),
  recordingUrl: text("recording_url"),
  transcriptText: text("transcript_text"),
  aiLiveSuggestions: jsonb("ai_live_suggestions").default([]),
  aiConsultationSummary: jsonb("ai_consultation_summary").default({}),
  remoteDeviceReadings: jsonb("remote_device_readings").default([]),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==========================================
// 27. MOBILE CLINIC & COMMUNITY OUTREACH SESSIONS
// ==========================================
export const mobileClinicSessions = pgTable("mobile_clinic_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  locationName: text("location_name").notNull(),
  gpsLatitude: numeric("gps_latitude"),
  gpsLongitude: numeric("gps_longitude"),
  scheduledDate: date("scheduled_date").notNull(),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  services: jsonb("services").default(["consultation", "point_of_care_lab", "pharmacy_dispensation"]).notNull(),
  assignedStaff: jsonb("assigned_staff").default([]),
  inventoryKit: jsonb("inventory_kit").default({}),
  status: text("status", { enum: ["planned", "en_route", "in_progress", "completed", "cancelled"] }).default("planned").notNull(),
  patientsRegisteredCount: integer("patients_registered_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const mobileClinicEncounters = pgTable("mobile_clinic_encounters", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id),
  sessionId: uuid("session_id").references(() => mobileClinicSessions.id, { onDelete: "cascade" }).notNull(),
  encounterId: uuid("encounter_id").references(() => encounters.id, { onDelete: "cascade" }),
  patientId: uuid("patient_id").references(() => patients.id),
  isOfflineCreated: boolean("is_offline_created").default(true).notNull(),
  offlineSyncId: text("offline_sync_id").unique(),
  chiefComplaint: text("chief_complaint"),
  clinicalNotes: text("clinical_notes"),
  vitals: jsonb("vitals").default({}),
  pocLabResults: jsonb("poc_lab_results").default([]),
  dispensedMedications: jsonb("dispensed_medications").default([]),
  clientTimestamp: timestamp("client_timestamp"),
  syncedAt: timestamp("synced_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==========================================
// 28. ADVANCED AI ORCHESTRATION & CONTINUOUS LEARNING
// ==========================================
export const aiModels = pgTable("ai_models", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  version: text("version").notNull(),
  type: text("type", { enum: ["llm", "ml", "rule_based", "ensemble"] }).notNull(),
  purpose: text("purpose").notNull(),
  performance: jsonb("performance").default({}),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const modelFeedback = pgTable("model_feedback", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  modelId: uuid("model_id").references(() => aiModels.id),
  suggestionId: uuid("suggestion_id"),
  clinicianId: uuid("clinician_id").references(() => users.id).notNull(),
  action: text("action", { enum: ["accepted", "modified", "rejected"] }).notNull(),
  agentName: text("agent_name"),
  originalOutput: jsonb("original_output"),
  clinicianModification: jsonb("clinician_modification"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==========================================
// 29. PROACTIVE HEALTH INSIGHTS
// ==========================================
export const healthInsights = pgTable("health_insights", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  patientId: uuid("patient_id").references(() => patients.id, { onDelete: "cascade" }).notNull(),
  type: text("type", { enum: ["risk", "trend", "care_gap", "adherence", "drug_safety"] }).notNull(),
  severity: text("severity", { enum: ["info", "warning", "critical"] }).default("info").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  suggestedAction: text("suggested_action"),
  actionType: text("action_type", { enum: ["order_lab", "adjust_medication", "schedule_visit", "lifestyle_nudge", "care_manager_outreach"] }),
  status: text("status", { enum: ["new", "viewed", "acted_upon", "dismissed"] }).default("new").notNull(),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  actedAt: timestamp("acted_at"),
});

// ==========================================
// 30. PREDICTIVE RISK SCORES & EARLY WARNING
// ==========================================
export const riskScores = pgTable("risk_scores", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  patientId: uuid("patient_id").references(() => patients.id, { onDelete: "cascade" }).notNull(),
  riskType: text("risk_type", {
    enum: ["ascvd_10yr", "diabetes_type2", "ckd_progression", "readmission_30d", "readmission_90d", "news2_early_warning", "mental_health_decompensation"]
  }).notNull(),
  score: numeric("score").notNull(),
  category: text("category", { enum: ["low", "borderline", "intermediate", "high", "critical"] }).notNull(),
  factors: jsonb("factors").default({}).notNull(),
  calculatedAt: timestamp("calculated_at").defaultNow().notNull(),
});

// ==========================================
// 31. BLOCKCHAIN AUDIT TRAIL & ANCHORS
// ==========================================
export const blockchainAnchors = pgTable("blockchain_anchors", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  batchStartAt: timestamp("batch_start_at").notNull(),
  batchEndAt: timestamp("batch_end_at").notNull(),
  logCount: integer("log_count").notNull(),
  merkleRootHash: text("merkle_root_hash").notNull(),
  previousBlockHash: text("previous_block_hash").notNull(),
  blockHash: text("block_hash").notNull(),
  transactionHash: text("transaction_hash").notNull(),
  network: text("network").default("private_hyperledger_simulated").notNull(),
  anchoredAt: timestamp("anchored_at").defaultNow().notNull(),
});

// ==========================================
// 32. PATIENT DATA OWNERSHIP & SMART CONSENTS
// ==========================================
export const smartConsents = pgTable("smart_consents", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  patientId: uuid("patient_id").references(() => patients.id, { onDelete: "cascade" }).notNull(),
  consentType: text("consent_type", { enum: ["clinical_care", "research_genomics", "third_party_telehealth", "hie_data_exchange", "ai_model_training"] }).notNull(),
  status: text("status", { enum: ["granted", "revoked", "expired", "pending"] }).default("granted").notNull(),
  allowedDepartments: jsonb("allowed_departments").default([]),
  permittedDataTypes: jsonb("permitted_data_types").default(["vitals", "labs", "medications", "imaging", "notes"]).notNull(),
  validUntil: timestamp("valid_until"),
  digitalSignature: text("digital_signature").notNull(),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ==========================================
// 33. REVENUE CYCLE MANAGEMENT & CLAIMS
// ==========================================
export const billingClaims = pgTable("billing_claims", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  patientId: uuid("patient_id").references(() => patients.id).notNull(),
  encounterId: uuid("encounter_id").references(() => encounters.id).notNull(),
  claimNumber: text("claim_number").notNull().unique(),
  payerName: text("payer_name").notNull(),
  payerType: text("payer_type", { enum: ["insurance", "corporate", "government", "self_pay"] }).notNull(),
  totalAmount: numeric("total_amount").notNull(),
  status: text("status", { enum: ["draft", "validated", "submitted", "adjudicated", "paid", "denied", "appealed"] }).default("draft").notNull(),
  diagnosisCodes: jsonb("diagnosis_codes").default([]).notNull(), // ICD-10
  procedureCodes: jsonb("procedure_codes").default([]).notNull(), // CPT/HCPCS
  aiDenialRiskScore: numeric("ai_denial_risk_score").default("0.0"), // 0.0 - 1.0
  aiDenialRiskFactors: jsonb("ai_denial_risk_factors").default([]),
  submissionDate: timestamp("submission_date"),
  adjudicationDate: timestamp("adjudication_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ==========================================
// 34. ZERO TRUST SECURITY THREAT LOGS
// ==========================================
export const securityThreatLogs = pgTable("security_threat_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  userId: uuid("user_id").references(() => users.id),
  threatType: text("threat_type", { enum: ["anomalous_record_access", "bulk_phi_exfiltration", "after_hours_login", "geo_velocity_anomaly", "privilege_escalation_attempt"] }).notNull(),
  severity: text("severity", { enum: ["low", "medium", "high", "critical"] }).notNull(),
  description: text("description").notNull(),
  metadata: jsonb("metadata").default({}),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  isMitigated: boolean("is_mitigated").default(false).notNull(),
  detectedAt: timestamp("detected_at").defaultNow().notNull(),
});

// ==========================================
// 35. ENHANCED CENTRAL STATE MACHINE & SAGAS
// ==========================================

export const encounterStates = pgTable("encounter_states", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  encounterId: uuid("encounter_id").references(() => encounters.id, { onDelete: "cascade" }).notNull(),
  workflow: text("workflow").notNull(), // 'clinical', 'lab', 'pharmacy', 'payment', 'referral', 'nutrition', 'genetics', 'imaging', 'psychological', 'social_work', 'therapy', 'respiratory'
  state: text("state").notNull(),
  enteredAt: timestamp("entered_at").defaultNow().notNull(),
  exitedAt: timestamp("exited_at"),
  isActive: boolean("is_active").default(true).notNull(),
  metadata: jsonb("metadata").default({}),
});

export const encounterEvents = pgTable("encounter_events", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  encounterId: uuid("encounter_id").references(() => encounters.id, { onDelete: "cascade" }).notNull(),
  eventName: text("event_name").notNull(),
  payload: jsonb("payload").default({}).notNull(),
  occurredAt: timestamp("occurred_at").defaultNow().notNull(),
  actorId: uuid("actor_id").references(() => users.id),
  actorRole: text("actor_role"),
  correlationId: text("correlation_id"),
});

export const stateSlas = pgTable("state_slas", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  workflow: text("workflow").notNull(),
  state: text("state").notNull(),
  maxDurationSeconds: integer("max_duration_seconds").notNull(),
  escalationAction: text("escalation_action", { enum: ["notify_supervisor", "notify_manager", "auto_transition", "flag_critical"] }).default("notify_supervisor").notNull(),
  escalationTargetRole: text("escalation_target_role"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const stateSlaViolations = pgTable("state_sla_violations", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  encounterId: uuid("encounter_id").references(() => encounters.id, { onDelete: "cascade" }).notNull(),
  workflow: text("workflow").notNull(),
  state: text("state").notNull(),
  maxDurationSeconds: integer("max_duration_seconds").notNull(),
  actualDurationSeconds: integer("actual_duration_seconds").notNull(),
  escalatedTo: uuid("escalated_to").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sagaTransactions = pgTable("saga_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  encounterId: uuid("encounter_id").references(() => encounters.id, { onDelete: "cascade" }).notNull(),
  sagaType: text("saga_type").notNull(), // 'lab_order_payment_saga', 'pharmacy_payment_dispense_saga'
  status: text("status", { enum: ["in_progress", "completed", "compensated", "failed"] }).default("in_progress").notNull(),
  steps: jsonb("steps").default([]).notNull(),
  errorDetails: text("error_details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const workflowStateHistory = pgTable("workflow_state_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  encounterId: uuid("encounter_id").references(() => encounters.id, { onDelete: "cascade" }).notNull(),
  workflow: text("workflow").notNull(),
  state: text("state").notNull(),
  enteredAt: timestamp("entered_at").defaultNow().notNull(),
  exitedAt: timestamp("exited_at"),
  durationSeconds: integer("duration_seconds"),
  enteredBy: uuid("entered_by").references(() => users.id),
  exitReason: text("exit_reason"),
  metadata: jsonb("metadata").default({}),
});

// ==========================================
// 36. PHARMACY INVENTORY & BATCH MANAGEMENT
// ==========================================
export const suppliers = pgTable("suppliers", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  contactPerson: text("contact_person"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  leadTimeDays: integer("lead_time_days").default(3),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const drugCatalog = pgTable("drug_catalog", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  genericName: text("generic_name").notNull(),
  brandName: text("brand_name"),
  strength: text("strength").notNull(),
  dosageForm: text("dosage_form").notNull(),
  route: text("route").default("oral").notNull(),
  atcCode: text("atc_code"),
  barcode: text("barcode"),
  packageSize: text("package_size").default("30 tablets"),
  reorderLevel: integer("reorder_level").default(50).notNull(),
  maxStock: integer("max_stock").default(500).notNull(),
  defaultUnitCost: numeric("default_unit_cost").default("10.00").notNull(),
  defaultSellingPrice: numeric("default_selling_price").default("15.00").notNull(),
  storageCondition: text("storage_condition", { enum: ["ambient", "refrigerated", "frozen", "controlled"] }).default("ambient").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const drugBatches = pgTable("drug_batches", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  drugId: uuid("drug_id").references(() => drugCatalog.id, { onDelete: "cascade" }).notNull(),
  supplierId: uuid("supplier_id").references(() => suppliers.id),
  batchNumber: text("batch_number").notNull(),
  expiryDate: date("expiry_date").notNull(),
  receivedDate: date("received_date").notNull(),
  quantityReceived: integer("quantity_received").notNull(),
  quantityRemaining: integer("quantity_remaining").notNull(),
  costPerUnit: numeric("cost_per_unit").notNull(),
  sellingPrice: numeric("selling_price").notNull(),
  locationBin: text("location_bin").default("Shelf A-1"),
  status: text("status", { enum: ["active", "near_expiry", "quarantined", "expired", "depleted"] }).default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const stockMovements = pgTable("stock_movements", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  batchId: uuid("batch_id").references(() => drugBatches.id, { onDelete: "cascade" }).notNull(),
  movementType: text("movement_type", { enum: ["receive", "dispense", "transfer", "return", "adjustment", "quarantine_disposal"] }).notNull(),
  quantity: integer("quantity").notNull(),
  previousQuantity: integer("previous_quantity").notNull(),
  newQuantity: integer("new_quantity").notNull(),
  referenceType: text("reference_type"),
  referenceId: text("reference_id"),
  performedBy: uuid("performed_by").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const purchaseOrders = pgTable("purchase_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  supplierId: uuid("supplier_id").references(() => suppliers.id).notNull(),
  poNumber: text("po_number").notNull().unique(),
  status: text("status", { enum: ["draft", "submitted", "approved", "shipped", "received", "cancelled"] }).default("draft").notNull(),
  items: jsonb("items").default([]).notNull(),
  totalAmount: numeric("total_amount").notNull(),
  orderedBy: uuid("ordered_by").references(() => users.id),
  orderedAt: timestamp("ordered_at").defaultNow().notNull(),
  receivedAt: timestamp("received_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==========================================
// 37. LABORATORY INFORMATION SYSTEM (LIS)
// ==========================================
export const labInstruments = pgTable("lab_instruments", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  model: text("model").notNull(),
  analyzerType: text("analyzer_type", { enum: ["hematology", "chemistry", "immunoassay", "urinalysis", "coagulation", "molecular"] }).notNull(),
  connectionType: text("connection_type", { enum: ["astm_e1394", "hl7_oru", "tcp_ip", "serial_rs232", "file_drop"] }).default("hl7_oru").notNull(),
  status: text("status", { enum: ["online", "running_qc", "offline", "maintenance", "error_lockout"] }).default("online").notNull(),
  lastMaintenanceAt: timestamp("last_maintenance_at"),
  lastConnectedAt: timestamp("last_connected_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const labQcRuns = pgTable("lab_qc_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  instrumentId: uuid("instrument_id").references(() => labInstruments.id, { onDelete: "cascade" }).notNull(),
  analyte: text("analyte").notNull(),
  level: text("level", { enum: ["level_1_low", "level_2_normal", "level_3_high"] }).default("level_2_normal").notNull(),
  measuredValue: numeric("measured_value").notNull(),
  expectedMean: numeric("expected_mean").notNull(),
  standardDeviation: numeric("standard_deviation").notNull(),
  referenceRangeLow: numeric("reference_range_low").notNull(),
  referenceRangeHigh: numeric("reference_range_high").notNull(),
  passed: boolean("passed").default(true).notNull(),
  zScore: numeric("z_score"),
  runAt: timestamp("run_at").defaultNow().notNull(),
  performedBy: uuid("performed_by").references(() => users.id),
  notes: text("notes"),
});

export const labTurnaround = pgTable("lab_turnaround", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  labOrderId: uuid("lab_order_id").references(() => labOrders.id, { onDelete: "cascade" }).notNull(),
  step: text("step", {
    enum: ["order_received", "sample_collected", "sample_received_in_lab", "processing_started", "result_entered", "result_validated", "result_released"]
  }).notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  performedBy: uuid("performed_by").references(() => users.id),
});

// ==========================================
// 38. RADIOLOGY INFORMATION SYSTEM (RIS)
// ==========================================
export const imagingTemplates = pgTable("imaging_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  modality: text("modality").notNull(),
  bodyPart: text("body_part").notNull(),
  title: text("title").notNull(),
  defaultTechnique: text("default_technique"),
  defaultFindings: text("default_findings"),
  defaultImpression: text("default_impression"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const imagingStudies = pgTable("imaging_studies", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  patientId: uuid("patient_id").references(() => patients.id, { onDelete: "cascade" }).notNull(),
  encounterId: uuid("encounter_id").references(() => encounters.id),
  accessionNumber: text("accession_number").notNull().unique(),
  modality: text("modality", { enum: ["X-Ray", "CT", "MRI", "Ultrasound", "Mammography", "PET-CT"] }).notNull(),
  bodyPart: text("body_part").notNull(),
  studyUid: text("study_uid").notNull(),
  priority: text("priority", { enum: ["routine", "urgent", "stat"] }).default("routine").notNull(),
  status: text("status", { enum: ["ordered", "scheduled", "arrived", "in_progress", "dictated", "reported", "signed"] }).default("ordered").notNull(),
  isCriticalFinding: boolean("is_critical_finding").default(false).notNull(),
  scheduledAt: timestamp("scheduled_at"),
  performedAt: timestamp("performed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const imagingReports = pgTable("imaging_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  studyId: uuid("study_id").references(() => imagingStudies.id, { onDelete: "cascade" }).notNull(),
  templateId: uuid("template_id").references(() => imagingTemplates.id),
  technique: text("technique").notNull(),
  findings: text("findings").notNull(),
  impression: text("impression").notNull(),
  recommendations: text("recommendations"),
  dictationRaw: text("dictation_raw"),
  signedBy: uuid("signed_by").references(() => users.id),
  signedAt: timestamp("signed_at"),
  peerReviewStatus: text("peer_review_status", { enum: ["none", "assigned", "agreed", "minor_revision", "major_discrepancy"] }).default("none").notNull(),
  peerReviewedBy: uuid("peer_reviewed_by").references(() => users.id),
  peerReviewedAt: timestamp("peer_reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==========================================
// 39. REMOTE PATIENT MONITORING (RPM) & DEVICES
// ==========================================
export const rpmPrograms = pgTable("rpm_programs", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  condition: text("condition").notNull(),
  targetMetrics: jsonb("target_metrics").default([]).notNull(),
  frequencyRequiredDays: integer("frequency_required_days").default(1),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const devices = pgTable("devices", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  patientId: uuid("patient_id").references(() => patients.id, { onDelete: "cascade" }),
  deviceType: text("device_type", { enum: ["blood_pressure_cuff", "glucometer", "cgm", "pulse_oximeter", "weight_scale", "ecg_patch", "spirometer"] }).notNull(),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  serialNumber: text("serial_number").notNull().unique(),
  macAddress: text("mac_address"),
  batteryLevelPercent: integer("battery_level_percent").default(100),
  status: text("status", { enum: ["assigned", "active", "syncing", "disconnected", "returned", "maintenance"] }).default("active").notNull(),
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const deviceReadings = pgTable("device_readings", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  deviceId: uuid("device_id").references(() => devices.id, { onDelete: "cascade" }).notNull(),
  patientId: uuid("patient_id").references(() => patients.id, { onDelete: "cascade" }).notNull(),
  metricType: text("metric_type").notNull(),
  numericValue: numeric("numeric_value").notNull(),
  unit: text("unit").notNull(),
  isAnomaly: boolean("is_anomaly").default(false).notNull(),
  anomalySeverity: text("anomaly_severity", { enum: ["normal", "warning", "critical"] }).default("normal"),
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==========================================
// 40. APPOINTMENTS & SCHEDULING
// ==========================================
export const appointments = pgTable("appointments", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  patientId: uuid("patient_id").references(() => patients.id, { onDelete: "cascade" }).notNull(),
  clinicianId: uuid("clinician_id").references(() => users.id),
  facilityId: uuid("facility_id").references(() => facilities.id),
  appointmentType: text("appointment_type", { enum: ["in_person", "telehealth", "mobile_clinic", "home_visit", "follow_up"] }).default("in_person").notNull(),
  specialty: text("specialty").default("Internal Medicine").notNull(),
  scheduledDate: date("scheduled_date").notNull(),
  scheduledTime: text("scheduled_time").notNull(),
  durationMinutes: integer("duration_minutes").default(30).notNull(),
  queueToken: text("queue_token"),
  status: text("status", { enum: ["scheduled", "confirmed", "checked_in", "in_consultation", "completed", "cancelled", "no_show"] }).default("scheduled").notNull(),
  reason: text("reason").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ==========================================
// 41. INVOICING & PAYMENTS
// ==========================================
export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  patientId: uuid("patient_id").references(() => patients.id, { onDelete: "cascade" }).notNull(),
  encounterId: uuid("encounter_id").references(() => encounters.id),
  invoiceNumber: text("invoice_number").notNull().unique(),
  lineItems: jsonb("line_items").default([]).notNull(),
  subtotal: numeric("subtotal").notNull(),
  discountAmount: numeric("discount_amount").default("0").notNull(),
  taxAmount: numeric("tax_amount").default("0").notNull(),
  totalAmount: numeric("total_amount").notNull(),
  paidAmount: numeric("paid_amount").default("0").notNull(),
  currency: text("currency").default("ETB").notNull(),
  status: text("status", { enum: ["draft", "issued", "paid", "partially_paid", "cancelled", "refunded", "unpaid", "waived"] }).default("issued").notNull(),
  paymentMethod: text("payment_method"),
  transactionRef: text("transaction_ref"),
  dueDate: date("due_date"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  invoiceId: uuid("invoice_id").references(() => invoices.id, { onDelete: "cascade" }).notNull(),
  patientId: uuid("patient_id").references(() => patients.id).notNull(),
  paymentNumber: text("payment_number").notNull().unique(),
  amount: numeric("amount").notNull(),
  currency: text("currency").default("ETB").notNull(),
  paymentMethod: text("payment_method", { enum: ["telebirr", "chapa", "bank_transfer", "cash", "insurance_copay", "paypal"] }).notNull(),
  transactionReference: text("transaction_reference"),
  receiptNumber: text("receipt_number"),
  status: text("status", { enum: ["pending", "completed", "failed", "refunded"] }).default("completed").notNull(),
  collectedBy: uuid("collected_by").references(() => users.id),
  paidAt: timestamp("paid_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==========================================
// 42. CUSTOMER & CLINICAL SUPPORT TICKETS
// ==========================================
export const supportTickets = pgTable("support_tickets", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  reporterUserId: uuid("reporter_user_id").references(() => users.id),
  patientId: uuid("patient_id").references(() => patients.id),
  ticketNumber: text("ticket_number").notNull().unique(),
  category: text("category", { enum: ["it_system", "clinical_cdss", "billing_payment", "pharmacy_dispensing", "telehealth_audio_video", "patient_portal"] }).notNull(),
  priority: text("priority", { enum: ["low", "normal", "high", "critical_urgent"] }).default("normal").notNull(),
  status: text("status", { enum: ["open", "in_progress", "waiting_on_clinician", "resolved", "closed"] }).default("open").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  assignedTo: uuid("assigned_to").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  resolutionSummary: text("resolution_summary"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const supportTicketComments = pgTable("support_ticket_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  ticketId: uuid("ticket_id").references(() => supportTickets.id, { onDelete: "cascade" }).notNull(),
  authorId: uuid("author_id").references(() => users.id).notNull(),
  message: text("message").notNull(),
  isInternalNote: boolean("is_internal_note").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==========================================
// 43. CUSTOM REPORT BUILDER & SAVED TEMPLATES
// ==========================================
export const customReports = pgTable("custom_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  category: text("category", { enum: ["financial", "clinical", "operational", "compliance_quality", "population_health"] }).notNull(),
  dataSource: text("data_source").notNull(),
  filters: jsonb("filters").default({}).notNull(),
  groupings: jsonb("groupings").default([]).notNull(),
  selectedColumns: jsonb("selected_columns").default([]).notNull(),
  scheduleCron: text("schedule_cron"),
  lastRunAt: timestamp("last_run_at"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==========================================
// 44. PATIENT SUBMITTED CASES & AI TRIAGE
// ==========================================
export const cases = pgTable("cases", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: text("case_id").notNull().unique(),
  caseNumber: text("case_number"),
  tenantId: uuid("tenant_id").references(() => organizations.id),
  patientId: uuid("patient_id").references(() => patients.id, { onDelete: "set null" }),
  encounterId: uuid("encounter_id").references(() => encounters.id),
  status: text("status", {
    enum: [
      "registered",
      "triaged",
      "assigned",
      "waiting",
      "in_consultation",
      "labs_ordered",
      "results_ready",
      "treatment_planned",
      "completed",
      "follow_up_scheduled",
      "cancelled",
      "pending_ai_analysis",
      "ai_analyzed",
      "under_review",
      "awaiting_tests",
      "escalated",
      "active",
      "resolved",
      "closed",
    ],
  }).default("registered").notNull(),
  priority: text("priority", { enum: ["routine", "urgent", "emergency"] }).default("routine").notNull(),
  assignedProviderId: uuid("assigned_provider_id").references(() => users.id),
  chiefComplaint: text("chief_complaint"),
  severity: text("severity", { enum: ["mild", "moderate", "severe", "very_severe"] }).default("moderate").notNull(),
  assignedHandlerId: text("assigned_handler_id"),
  assignedHandlerName: text("assigned_handler_name"),
  assignedRole: text("assigned_role"),
  personal: jsonb("personal").default({}),
  patientInfo: jsonb("patient_info").default({}),
  complaint: jsonb("complaint").default({}),
  complaintDetails: jsonb("complaint_details").default({}),
  history: jsonb("history").default({}),
  medicalHistory: jsonb("medical_history").default({}),
  symptoms: jsonb("symptoms").default({}),
  filesAttached: jsonb("files_attached").default([]),
  aiSummary: text("ai_summary"),
  aiRecommendations: jsonb("ai_recommendations").default({}),
  aiAnalysis: jsonb("ai_analysis").default({}),
  handlerNotes: jsonb("handler_notes").default([]),
  handlerNote: text("handler_note"),
  conferenceNotes: text("conference_notes"),
  timeline: jsonb("timeline").default([]),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ==========================================
// 45. DYNAMIC PRICING & HEALTHCARE BILLING ENGINE
// ==========================================

// 1. Service Pricing Catalog
export const servicePricingCatalog = pgTable("service_pricing_catalog", {
  id: uuid("id").defaultRandom().primaryKey(),
  serviceCode: varchar("service_code", { length: 64 }).unique().notNull(), // e.g., 'REGISTRATION_3MO', 'LAB_HBA1C', 'CONSULT_SPECIALIST', 'PHYSIO_SESSION'
  category: varchar("category", { length: 64 }).notNull(), // 'registration' | 'consultation' | 'laboratory' | 'pharmacy' | 'therapy' | 'nursing'
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).default("ETB").notNull(),
  isFree: boolean("is_free").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  validityDays: integer("validity_days"), // 90 for registration
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 2. Invoice Line Items
export const invoiceItems = pgTable("invoice_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoiceId: uuid("invoice_id").references(() => invoices.id, { onDelete: "cascade" }).notNull(),
  serviceCode: varchar("service_code", { length: 64 }).notNull(),
  description: text("description").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").default(1).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
});

// 3. Patient Registration Validity Tracker (3-Month Renewable Registration)
export const patientRegistrationPasses = pgTable("patient_registration_passes", {
  id: uuid("id").defaultRandom().primaryKey(),
  patientId: uuid("patient_id").references(() => patients.id, { onDelete: "cascade" }).notNull(),
  invoiceId: uuid("invoice_id").references(() => invoices.id),
  startsAt: timestamp("starts_at").notNull(),
  expiresAt: timestamp("expires_at").notNull(), // startsAt + 90 days
  status: varchar("status", { length: 32 }).default("active").notNull(), // 'active' | 'expired' | 'waived'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 4. System Payment Settings & Global Master Switch
export const systemPaymentSettings = pgTable("system_payment_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  globalFreeMode: boolean("global_free_mode").default(false).notNull(),
  registrationValidityDays: integer("registration_validity_days").default(90).notNull(),
  gracePeriodDays: integer("grace_period_days").default(7).notNull(),
  allowCashReconciliation: boolean("allow_cash_reconciliation").default(true).notNull(),
  enforceLabPaymentGate: boolean("enforce_lab_payment_gate").default(true).notNull(),
  enforcePharmacyPaymentGate: boolean("enforce_pharmacy_payment_gate").default(true).notNull(),
  autoNotifyLabOnPayment: boolean("auto_notify_lab_on_payment").default(true).notNull(),
  autoNotifyPharmacyOnPayment: boolean("auto_notify_pharmacy_on_payment").default(true).notNull(),
  allowEmergencyOverride: boolean("allow_emergency_override").default(true).notNull(),
  rolePermissions: jsonb("role_permissions").default({
    waiveFees: ["system_admin", "tenant_admin"],
    emergencyOverride: ["system_admin", "tenant_admin", "physician"],
    cashCollection: ["system_admin", "tenant_admin", "pharmacist", "nurse", "cashier"],
  }).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ==========================================
// 46. CLINIC LOCATIONS & GEOLOCATION NETWORK
// ==========================================
export const clinicLocations = pgTable("clinic_locations", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => organizations.id).default("00000000-0000-0000-0000-000000000001"),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  branchType: text("branch_type", {
    enum: ["main", "branch", "diagnostic_hub", "pharmacy_clinic", "mobile_unit"],
  }).default("branch").notNull(),
  neighborhood: text("neighborhood").notNull(),
  city: text("city").default("Debre Birhan").notNull(),
  region: text("region").default("Amhara, Ethiopia").notNull(),
  address: text("address").notNull(),
  latitude: numeric("latitude").notNull(),
  longitude: numeric("longitude").notNull(),
  phone: text("phone").notNull(),
  email: text("email").default("info@ninimed.org"),
  hours: text("hours").notNull(),
  services: jsonb("services").default([]).notNull(),
  amenities: jsonb("amenities").default([]).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  isMain: boolean("is_main").default(false).notNull(),
  nextOpenSlot: text("next_open_slot").default("Open Today"),
  googleMapsUrl: text("google_maps_url"),
  osmUrl: text("osm_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ==========================================
// 47. AUTHENTICATION, OTP VERIFICATION & SECURITY
// ==========================================
export const authVerificationCodes = pgTable("auth_verification_codes", {
  id: uuid("id").defaultRandom().primaryKey(),
  identifier: text("identifier").notNull(), // email address or phone number
  channel: text("channel", { enum: ["email", "sms"] }).notNull(),
  codeHash: text("code_hash").notNull(),
  rawCode: text("raw_code"), // sandbox / audit copy
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  purpose: text("purpose", { enum: ["account_registration", "login_mfa", "password_reset", "phone_verification"] }).default("account_registration").notNull(),
  status: text("status", { enum: ["pending", "verified", "expired", "max_attempts_exceeded"] }).default("pending").notNull(),
  attempts: integer("attempts").default(0).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  verifiedAt: timestamp("verified_at"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const systemAuthSettings = pgTable("system_auth_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  requireEmailVerification: boolean("require_email_verification").default(true).notNull(),
  requireSmsVerification: boolean("require_sms_verification").default(false).notNull(),
  enableTwoFactorLogin: boolean("enable_two_factor_login").default(false).notNull(),
  twoFactorTargetRoles: jsonb("two_factor_target_roles").default(["system_admin", "tenant_admin", "physician", "pharmacist"]).notNull(),
  requireNationalIdVerification: boolean("require_national_id_verification").default(true).notNull(),
  allowDemoBypass: boolean("allow_demo_bypass").default(true).notNull(),
  smsGatewayProvider: text("sms_gateway_provider").default("simulator").notNull(),
  otpExpiryMinutes: integer("otp_expiry_minutes").default(10).notNull(),
  maxAttempts: integer("max_attempts").default(5).notNull(),
  lockoutDurationMinutes: integer("lockout_duration_minutes").default(15).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ==========================================
// 48. SECURE QR MEDICAL RECORD SHARING & QR CROSS-DEVICE LOGIN
// ==========================================
export const sharedMedicalRecords = pgTable("shared_medical_records", {
  id: uuid("id").defaultRandom().primaryKey(),
  patientId: uuid("patient_id").references(() => patients.id, { onDelete: "cascade" }).notNull(),
  shareToken: text("share_token").unique().notNull(),
  accessScope: jsonb("access_scope").default(["allergies", "medications", "lab_results", "conditions", "emergency_contacts"]).notNull(),
  passcode: text("passcode"), // Optional 4-digit PIN protection
  doctorName: text("doctor_name"), // Target consulting physician/hospital
  status: text("status", { enum: ["active", "revoked", "expired"] }).default("active").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  viewCount: integer("view_count").default(0).notNull(),
  lastViewedAt: timestamp("last_viewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const qrLoginSessions = pgTable("qr_login_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionChallenge: text("session_challenge").unique().notNull(),
  status: text("status", { enum: ["pending", "authorized", "consumed", "expired"] }).default("pending").notNull(),
  authenticatedUserId: uuid("authenticated_user_id").references(() => users.id, { onDelete: "cascade" }),
  deviceInfo: text("device_info"),
  ipAddress: text("ip_address"),
  expiresAt: timestamp("expires_at").notNull(),
  authorizedAt: timestamp("authorized_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});



// ==========================================
// HRM MODULE — PART 1: STAFF LIFECYCLE & CREDENTIALING
// ==========================================

export const staffProfiles = pgTable("staff_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  employeeCode: text("employee_code").notNull().unique(),
  department: text("department").notNull(),
  designation: text("designation").notNull(),
  specialization: text("specialization"),
  licenseNumber: text("license_number"),
  licenseIssuingBody: text("license_issuing_body"),
  licenseExpiryDate: date("license_expiry_date"),
  cmePoints: integer("cme_points").default(0).notNull(),
  employmentType: text("employment_type", {
    enum: ["full_time", "part_time", "contract", "locum", "intern"],
  }).default("full_time").notNull(),
  baseSalaryEtb: decimal("base_salary_etb", { precision: 12, scale: 2 }).default("0.00"),
  onCallAllowanceRate: decimal("on_call_allowance_rate", { precision: 10, scale: 2 }).default("0.00"),
  consultationRevenueSharePct: decimal("consultation_revenue_share_pct", { precision: 5, scale: 2 }).default("0.00"),
  bankAccountNumber: text("bank_account_number"),
  bankName: text("bank_name"),
  mobileWalletNumber: text("mobile_wallet_number"),
  mobileWalletProvider: text("mobile_wallet_provider", { enum: ["telebirr", "cbe_birr", "m_pesa", "none"] }).default("none"),
  status: text("status", {
    enum: ["active", "on_leave", "probation", "suspended", "terminated"],
  }).default("active").notNull(),
  onboardingCompletedAt: timestamp("onboarding_completed_at"),
  hiredAt: date("hired_at").notNull(),
  terminatedAt: date("terminated_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const staffCertifications = pgTable("staff_certifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  staffId: uuid("staff_id").references(() => staffProfiles.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(), // e.g. "BLS", "ACLS", "ATLS", "Board Certification"
  certType: text("cert_type", {
    enum: ["bls", "acls", "atls", "pals", "board_cert", "subspecialty", "cme", "malpractice_insurance", "other"],
  }).notNull(),
  issuingBody: text("issuing_body").notNull(),
  issueDate: date("issue_date").notNull(),
  expiryDate: date("expiry_date"),
  documentUrl: text("document_url"),
  verificationStatus: text("verification_status", {
    enum: ["verified", "pending", "expiring_soon", "expired", "suspended"],
  }).default("pending").notNull(),
  verifiedBy: uuid("verified_by").references(() => users.id),
  verifiedAt: timestamp("verified_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==========================================
// HRM MODULE — PART 2: DUTY ROSTER & SHIFT MANAGEMENT
// ==========================================

export const dutyRosters = pgTable("duty_rosters", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  department: text("department").notNull(),
  shiftName: text("shift_name").notNull(),
  shiftTemplate: text("shift_template", {
    enum: ["morning", "evening", "night", "on_call_24h", "ward_rounds", "custom"],
  }).notNull(),
  startTime: text("start_time").notNull(), // e.g. "07:00"
  endTime: text("end_time").notNull(),     // e.g. "15:00"
  requiredDoctors: integer("required_doctors").default(1).notNull(),
  requiredNurses: integer("required_nurses").default(2).notNull(),
  requiredSupportStaff: integer("required_support_staff").default(1).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: uuid("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const staffShifts = pgTable("staff_shifts", {
  id: uuid("id").primaryKey().defaultRandom(),
  rosterId: uuid("roster_id").references(() => dutyRosters.id, { onDelete: "cascade" }).notNull(),
  staffId: uuid("staff_id").references(() => staffProfiles.id, { onDelete: "cascade" }).notNull(),
  shiftDate: date("shift_date").notNull(),
  status: text("status", {
    enum: ["scheduled", "confirmed", "completed", "absent", "cancelled"],
  }).default("scheduled").notNull(),
  swapStatus: text("swap_status", {
    enum: ["none", "requested", "approved", "rejected"],
  }).default("none").notNull(),
  swapRequestedWithStaffId: uuid("swap_requested_with_staff_id").references(() => staffProfiles.id),
  swapApprovedBy: uuid("swap_approved_by").references(() => users.id),
  swapApprovedAt: timestamp("swap_approved_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ==========================================
// HRM MODULE — PART 3: ATTENDANCE & OVERTIME
// ==========================================

export const staffAttendance = pgTable("staff_attendance", {
  id: uuid("id").primaryKey().defaultRandom(),
  staffId: uuid("staff_id").references(() => staffProfiles.id, { onDelete: "cascade" }).notNull(),
  shiftId: uuid("shift_id").references(() => staffShifts.id),
  attendanceDate: date("attendance_date").notNull(),
  clockIn: timestamp("clock_in"),
  clockOut: timestamp("clock_out"),
  regularHours: decimal("regular_hours", { precision: 5, scale: 2 }).default("0.00"),
  overtimeHours: decimal("overtime_hours", { precision: 5, scale: 2 }).default("0.00"),
  overtimeMultiplier: decimal("overtime_multiplier", { precision: 4, scale: 2 }).default("1.00"),
  // 1.00 = regular, 1.50 = standard OT, 1.75 = night differential, 2.00 = public holiday
  verificationMethod: text("verification_method", {
    enum: ["pin", "biometric", "geolocation", "manual", "kiosk"],
  }).default("pin").notNull(),
  status: text("status", {
    enum: ["present", "absent", "late", "half_day", "excused"],
  }).default("present").notNull(),
  deviationNotes: text("deviation_notes"),
  recordedBy: uuid("recorded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==========================================
// HRM MODULE — PART 4: LEAVE MANAGEMENT
// ==========================================

export const leaveRequests = pgTable("leave_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  staffId: uuid("staff_id").references(() => staffProfiles.id, { onDelete: "cascade" }).notNull(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  leaveType: text("leave_type", {
    enum: ["annual", "clinical_cme", "sick", "maternity_paternity", "emergency_bereavement", "unpaid", "compensatory"],
  }).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  totalDays: integer("total_days").notNull(),
  reason: text("reason").notNull(),
  supportingDocumentUrl: text("supporting_document_url"),
  status: text("status", {
    enum: ["pending", "approved_by_hod", "approved_by_hr", "rejected", "cancelled"],
  }).default("pending").notNull(),
  hodApprovedBy: uuid("hod_approved_by").references(() => users.id),
  hodApprovedAt: timestamp("hod_approved_at"),
  hrApprovedBy: uuid("hr_approved_by").references(() => users.id),
  hrApprovedAt: timestamp("hr_approved_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ==========================================
// HRM MODULE — PART 5: PAYROLL ENGINE
// ==========================================

export const payrollRuns = pgTable("payroll_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  periodMonth: integer("period_month").notNull(), // 1–12
  periodYear: integer("period_year").notNull(),
  totalGrossEtb: decimal("total_gross_etb", { precision: 14, scale: 2 }).default("0.00"),
  totalNetEtb: decimal("total_net_etb", { precision: 14, scale: 2 }).default("0.00"),
  totalPayeTaxEtb: decimal("total_paye_tax_etb", { precision: 14, scale: 2 }).default("0.00"),
  totalPensionEmployeeEtb: decimal("total_pension_employee_etb", { precision: 14, scale: 2 }).default("0.00"),
  totalPensionEmployerEtb: decimal("total_pension_employer_etb", { precision: 14, scale: 2 }).default("0.00"),
  totalOnCallAllowanceEtb: decimal("total_on_call_allowance_etb", { precision: 14, scale: 2 }).default("0.00"),
  totalOvertimePaidEtb: decimal("total_overtime_paid_etb", { precision: 14, scale: 2 }).default("0.00"),
  staffCount: integer("staff_count").default(0),
  status: text("status", {
    enum: ["draft", "calculated", "approved", "disbursed", "void"],
  }).default("draft").notNull(),
  processedBy: uuid("processed_by").references(() => users.id),
  approvedBy: uuid("approved_by").references(() => users.id),
  processedAt: timestamp("processed_at"),
  approvedAt: timestamp("approved_at"),
  disbursedAt: timestamp("disbursed_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const payrollItems = pgTable("payroll_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  payrollRunId: uuid("payroll_run_id").references(() => payrollRuns.id, { onDelete: "cascade" }).notNull(),
  staffId: uuid("staff_id").references(() => staffProfiles.id).notNull(),
  baseSalaryEtb: decimal("base_salary_etb", { precision: 12, scale: 2 }).default("0.00"),
  onCallAllowanceEtb: decimal("on_call_allowance_etb", { precision: 10, scale: 2 }).default("0.00"),
  overtimePayEtb: decimal("overtime_pay_etb", { precision: 10, scale: 2 }).default("0.00"),
  revenueShareEtb: decimal("revenue_share_etb", { precision: 10, scale: 2 }).default("0.00"),
  bonusEtb: decimal("bonus_etb", { precision: 10, scale: 2 }).default("0.00"),
  otherAllowancesEtb: decimal("other_allowances_etb", { precision: 10, scale: 2 }).default("0.00"),
  grossPayEtb: decimal("gross_pay_etb", { precision: 12, scale: 2 }).default("0.00"),
  payeTaxEtb: decimal("paye_tax_etb", { precision: 10, scale: 2 }).default("0.00"),
  pensionEmployeeEtb: decimal("pension_employee_etb", { precision: 10, scale: 2 }).default("0.00"),
  pensionEmployerEtb: decimal("pension_employer_etb", { precision: 10, scale: 2 }).default("0.00"),
  voluntaryDeductionsEtb: decimal("voluntary_deductions_etb", { precision: 10, scale: 2 }).default("0.00"),
  totalDeductionsEtb: decimal("total_deductions_etb", { precision: 10, scale: 2 }).default("0.00"),
  netPayEtb: decimal("net_pay_etb", { precision: 12, scale: 2 }).default("0.00"),
  payslipPdfUrl: text("payslip_pdf_url"),
  disbursementMethod: text("disbursement_method", { enum: ["bank_transfer", "mobile_wallet", "cash"] }).default("bank_transfer"),
  disbursementRef: text("disbursement_ref"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const staffPerformanceReviews = pgTable("staff_performance_reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  staffId: uuid("staff_id").references(() => staffProfiles.id, { onDelete: "cascade" }).notNull(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  reviewPeriodStart: date("review_period_start").notNull(),
  reviewPeriodEnd: date("review_period_end").notNull(),
  reviewType: text("review_type", { enum: ["quarterly", "annual", "probation", "pip"] }).default("quarterly"),
  csatScore: decimal("csat_score", { precision: 4, scale: 2 }), // 0–5
  avgConsultationMins: decimal("avg_consultation_mins", { precision: 6, scale: 2 }),
  diagnosticTurnaroundAdherencePct: decimal("diagnostic_turnaround_adherence_pct", { precision: 5, scale: 2 }),
  protocolCompliancePct: decimal("protocol_compliance_pct", { precision: 5, scale: 2 }),
  prescriptionAuditScore: decimal("prescription_audit_score", { precision: 4, scale: 2 }),
  selfReviewScore: decimal("self_review_score", { precision: 4, scale: 2 }),
  peerReviewScore: decimal("peer_review_score", { precision: 4, scale: 2 }),
  hodReviewScore: decimal("hod_review_score", { precision: 4, scale: 2 }),
  overallScore: decimal("overall_score", { precision: 4, scale: 2 }),
  bonusRecommendationEtb: decimal("bonus_recommendation_etb", { precision: 10, scale: 2 }).default("0.00"),
  goals: jsonb("goals").default([]),
  reviewedBy: uuid("reviewed_by").references(() => users.id).notNull(),
  status: text("status", { enum: ["draft", "submitted", "acknowledged"] }).default("draft"),
  comments: text("comments"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ==========================================
// FINANCE MODULE — PART 1: CHART OF ACCOUNTS & DOUBLE-ENTRY LEDGER
// ==========================================

export const chartOfAccounts = pgTable("chart_of_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  accountCode: text("account_code").notNull(),
  accountName: text("account_name").notNull(),
  accountType: text("account_type", {
    enum: ["asset", "liability", "equity", "revenue", "cogs", "expense"],
  }).notNull(),
  parentAccountId: uuid("parent_account_id"),
  isHeader: boolean("is_header").default(false).notNull(),
  isSystem: boolean("is_system").default(false).notNull(),
  currentBalance: decimal("current_balance", { precision: 16, scale: 2 }).default("0.00"),
  currency: varchar("currency", { length: 10 }).default("ETB"),
  department: text("department"), // cost center
  isActive: boolean("is_active").default(true).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const journalEntries = pgTable("journal_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  entryNumber: text("entry_number").notNull().unique(),
  entryDate: date("entry_date").notNull(),
  description: text("description").notNull(),
  referenceType: text("reference_type", {
    enum: ["pos_billing", "insurance_claim", "pharmacy_cogs", "payroll_disbursement", "vendor_ap", "manual_adjustment", "subscription", "refund"],
  }).notNull(),
  referenceId: uuid("reference_id"),
  totalDebit: decimal("total_debit", { precision: 16, scale: 2 }).default("0.00"),
  totalCredit: decimal("total_credit", { precision: 16, scale: 2 }).default("0.00"),
  status: text("status", { enum: ["draft", "posted", "voided"] }).default("draft").notNull(),
  postedBy: uuid("posted_by").references(() => users.id),
  postedAt: timestamp("posted_at"),
  voidedBy: uuid("voided_by").references(() => users.id),
  voidReason: text("void_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const journalEntryLines = pgTable("journal_entry_lines", {
  id: uuid("id").primaryKey().defaultRandom(),
  journalEntryId: uuid("journal_entry_id").references(() => journalEntries.id, { onDelete: "cascade" }).notNull(),
  accountId: uuid("account_id").references(() => chartOfAccounts.id).notNull(),
  debit: decimal("debit", { precision: 16, scale: 2 }).default("0.00"),
  credit: decimal("credit", { precision: 16, scale: 2 }).default("0.00"),
  department: text("department"),
  memo: text("memo"),
  lineOrder: integer("line_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==========================================
// FINANCE MODULE — PART 2: INSURANCE CLAIMS & PAYERS
// ==========================================

export const insurancePayers = pgTable("insurance_payers", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  payerCode: text("payer_code").notNull().unique(),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  claimsEndpoint: text("claims_endpoint"),
  defaultCopayPercent: decimal("default_copay_percent", { precision: 5, scale: 2 }).default("20.00"),
  // 20.00 means patient pays 20%, payer pays 80%
  defaultCoveragePercent: decimal("default_coverage_percent", { precision: 5, scale: 2 }).default("80.00"),
  currency: varchar("currency", { length: 10 }).default("ETB"),
  requiresPreAuth: boolean("requires_pre_auth").default(false),
  preAuthThresholdEtb: decimal("pre_auth_threshold_etb", { precision: 12, scale: 2 }).default("10000.00"),
  contractDetails: jsonb("contract_details").default({}),
  status: text("status", { enum: ["active", "inactive", "suspended"] }).default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insuranceClaims = pgTable("insurance_claims", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  claimNumber: text("claim_number").notNull().unique(),
  invoiceId: uuid("invoice_id").references(() => invoices.id),
  patientId: uuid("patient_id").references(() => patients.id).notNull(),
  payerId: uuid("payer_id").references(() => insurancePayers.id).notNull(),
  encounterId: uuid("encounter_id").references(() => encounters.id),
  preAuthCode: text("pre_auth_code"),
  icd10Codes: jsonb("icd10_codes").default([]), // ["I10", "E11.9"]
  cptCodes: jsonb("cpt_codes").default([]),     // ["99213", "80053"]
  totalClaimAmountEtb: decimal("total_claim_amount_etb", { precision: 14, scale: 2 }).default("0.00"),
  approvedAmountEtb: decimal("approved_amount_etb", { precision: 14, scale: 2 }).default("0.00"),
  patientCopayAmountEtb: decimal("patient_copay_amount_etb", { precision: 14, scale: 2 }).default("0.00"),
  reimbursedAmountEtb: decimal("reimbursed_amount_etb", { precision: 14, scale: 2 }).default("0.00"),
  denialCode: text("denial_code"),
  denialReason: text("denial_reason"),
  appealNotes: text("appeal_notes"),
  appealDocumentUrl: text("appeal_document_url"),
  status: text("status", {
    enum: ["draft", "submitted", "under_review", "approved", "partially_approved", "rejected", "reimbursed", "appealed", "written_off"],
  }).default("draft").notNull(),
  submittedAt: timestamp("submitted_at"),
  adjudicatedAt: timestamp("adjudicated_at"),
  reimbursedAt: timestamp("reimbursed_at"),
  processedBy: uuid("processed_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ==========================================
// FINANCE MODULE — PART 3: POS CASH DRAWER & CASHIER SESSIONS
// ==========================================

export const cashDrawers = pgTable("cash_drawers", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  cashierId: uuid("cashier_id").references(() => users.id).notNull(),
  shiftLabel: text("shift_label").notNull(), // e.g. "Morning Shift – Cashier A"
  openingCashEtb: decimal("opening_cash_etb", { precision: 12, scale: 2 }).default("0.00"),
  totalCollectedCashEtb: decimal("total_collected_cash_etb", { precision: 12, scale: 2 }).default("0.00"),
  totalCollectedMobileEtb: decimal("total_collected_mobile_etb", { precision: 12, scale: 2 }).default("0.00"),
  totalCollectedCardEtb: decimal("total_collected_card_etb", { precision: 12, scale: 2 }).default("0.00"),
  totalCollectedInsuranceEtb: decimal("total_collected_insurance_etb", { precision: 12, scale: 2 }).default("0.00"),
  closingCashExpectedEtb: decimal("closing_cash_expected_etb", { precision: 12, scale: 2 }).default("0.00"),
  closingCashActualEtb: decimal("closing_cash_actual_etb", { precision: 12, scale: 2 }),
  discrepancyEtb: decimal("discrepancy_etb", { precision: 10, scale: 2 }).default("0.00"),
  denominationBreakdown: jsonb("denomination_breakdown").default({}),
  // { "1000": 5, "500": 10, "100": 20, "50": 15, "10": 30 }
  transactionCount: integer("transaction_count").default(0),
  status: text("status", { enum: ["open", "closed", "audited"] }).default("open").notNull(),
  supervisorApprovedBy: uuid("supervisor_approved_by").references(() => users.id),
  supervisorApprovedAt: timestamp("supervisor_approved_at"),
  discrepancyNotes: text("discrepancy_notes"),
  openedAt: timestamp("opened_at").defaultNow().notNull(),
  closedAt: timestamp("closed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==========================================
// FINANCE MODULE — PART 4: ACCOUNTS PAYABLE — VENDOR INVOICES
// ==========================================

export const vendorInvoices = pgTable("vendor_invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  vendorName: text("vendor_name").notNull(),
  vendorContact: text("vendor_contact"),
  invoiceNumber: text("invoice_number").notNull(),
  poReference: text("po_reference"),
  description: text("description").notNull(),
  category: text("category", {
    enum: ["pharmaceuticals", "medical_equipment", "lab_supplies", "ict", "maintenance", "utilities", "other"],
  }).notNull(),
  amountEtb: decimal("amount_etb", { precision: 14, scale: 2 }).default("0.00"),
  vatAmountEtb: decimal("vat_amount_etb", { precision: 10, scale: 2 }).default("0.00"),
  totalAmountEtb: decimal("total_amount_etb", { precision: 14, scale: 2 }).default("0.00"),
  currency: varchar("currency", { length: 10 }).default("ETB"),
  dueDate: date("due_date").notNull(),
  goodsReceivedAt: timestamp("goods_received_at"),
  threeWayMatchStatus: text("three_way_match_status", {
    enum: ["pending_match", "matched", "discrepancy"],
  }).default("pending_match"),
  paymentStatus: text("payment_status", {
    enum: ["unpaid", "partial", "paid", "overdue", "disputed"],
  }).default("unpaid").notNull(),
  paidAmountEtb: decimal("paid_amount_etb", { precision: 14, scale: 2 }).default("0.00"),
  paidAt: timestamp("paid_at"),
  paymentMethod: text("payment_method", { enum: ["bank_transfer", "cheque", "mobile_wallet", "cash"] }),
  paymentReference: text("payment_reference"),
  documentUrl: text("document_url"),
  approvedBy: uuid("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdBy: uuid("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ==========================================
// 46. AI-DRIVEN PATIENT & STAFF FEEDBACK RECORDS
// ==========================================

export const feedbackRecords = pgTable("feedback_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  submitterType: text("submitter_type", {
    enum: ["patient", "family", "staff_physician", "staff_nurse", "staff_admin", "anonymous"],
  }).default("patient").notNull(),
  submitterUserId: uuid("submitter_user_id").references(() => users.id),
  submitterName: text("submitter_name"),
  submitterContact: text("submitter_contact"),
  encounterId: uuid("encounter_id").references(() => encounters.id),
  department: text("department"),
  rating: integer("rating"),
  feedbackText: text("feedback_text").notNull(),
  category: text("category", {
    enum: ["general", "consultation", "nursing", "pharmacy", "laboratory", "radiology", "billing", "facilities", "telehealth"],
  }).default("general").notNull(),
  sentiment: text("sentiment", { enum: ["positive", "neutral", "negative"] }).default("neutral").notNull(),
  sentimentScore: decimal("sentiment_score", { precision: 4, scale: 2 }).default("0.00"),
  confidenceScore: decimal("confidence_score", { precision: 4, scale: 2 }).default("0.85"),
  extractedThemes: jsonb("extracted_themes").default([]),
  actionRecommendations: jsonb("action_recommendations").default([]),
  urgencyLevel: text("urgency_level", {
    enum: ["low", "normal", "elevated", "critical_safety"],
  }).default("normal").notNull(),
  isSafetyHazard: boolean("is_safety_hazard").default(false).notNull(),
  resolutionStatus: text("resolution_status", {
    enum: ["open", "under_investigation", "action_taken", "closed", "dismissed"],
  }).default("open").notNull(),
  assignedAdminId: uuid("assigned_admin_id").references(() => users.id),
  resolutionNotes: text("resolution_notes"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ==========================================
// 47. TAMPER-EVIDENT ADMIN AUDIT LOGS (HMAC CHAINED)
// ==========================================

export const adminAuditLogs = pgTable("admin_audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  actorUserId: uuid("actor_user_id").references(() => users.id).notNull(),
  actorRole: text("actor_role").notNull(),
  actorIpAddress: text("actor_ip_address"),
  actorUserAgent: text("actor_user_agent"),
  actionType: text("action_type", {
    enum: [
      "decrypt_sensitive_field",
      "rotate_encryption_key",
      "override_security_gate",
      "bulk_phi_export",
      "modify_rbac_permission",
      "grant_temporary_elevation",
      "revoke_user_access",
      "view_unmasked_record",
      "system_configuration_change",
      "emergency_break_glass",
    ],
  }).notNull(),
  targetResourceType: text("target_resource_type").notNull(),
  targetResourceId: text("target_resource_id"),
  details: jsonb("details").default({}),
  previousEntryHash: text("previous_entry_hash"),
  entryHash: text("entry_hash").notNull(),
  isTamperFlagged: boolean("is_tamper_flagged").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==========================================
// 48. ENCRYPTION KEY REGISTRY & METADATA
// ==========================================

export const encryptionKeyRegistry = pgTable("encryption_key_registry", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  keyAlias: text("key_alias").notNull().unique(),
  keyVersion: integer("key_version").default(1).notNull(),
  algorithm: text("algorithm").default("AES-256-GCM").notNull(),
  status: text("status", { enum: ["active", "rotated", "revoked", "compromised"] }).default("active").notNull(),
  createdBy: uuid("created_by").references(() => users.id).notNull(),
  rotatedBy: uuid("rotated_by").references(() => users.id),
  rotatedAt: timestamp("rotated_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==========================================
// 49. REAL-TIME PATIENT JOURNEY EVENTS
// ==========================================

export const patientJourneyEvents = pgTable("patient_journey_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  patientId: uuid("patient_id").references(() => patients.id, { onDelete: "cascade" }).notNull(),
  encounterId: uuid("encounter_id").references(() => encounters.id),
  currentStage: text("current_stage", {
    enum: ["triage", "waiting", "consultation", "lab_pending", "lab_ready", "radiology_pending", "pharmacy", "ward_admission", "discharged"],
  }).notNull(),
  previousStage: text("previous_stage"),
  locationRoom: text("location_room"),
  attendingStaffId: uuid("attending_staff_id").references(() => users.id),
  transitDurationSeconds: integer("transit_duration_seconds").default(0),
  stageStatus: text("stage_status", {
    enum: ["pending", "in_progress", "completed", "escalated", "on_hold"],
  }).default("in_progress").notNull(),
  notes: text("notes"),
  enteredAt: timestamp("entered_at").defaultNow().notNull(),
  exitedAt: timestamp("exited_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==========================================
// 50. CLINICAL WARD ROUNDS & HANDOVER
// ==========================================

export const clinicalRounds = pgTable("clinical_rounds", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  patientId: uuid("patient_id").references(() => patients.id, { onDelete: "cascade" }).notNull(),
  encounterId: uuid("encounter_id").references(() => encounters.id),
  bedNumber: text("bed_number").notNull(),
  wardDepartment: text("ward_department").default("General Inpatient").notNull(),
  roundingClinicianId: uuid("rounding_clinician_id").references(() => users.id).notNull(),
  acuityScore: text("acuity_score", {
    enum: ["stable", "monitoring", "deteriorating", "critical", "discharge_ready"],
  }).default("stable").notNull(),
  vitalSummary: jsonb("vital_summary").default({}),
  clinicalNotes: text("clinical_notes").notNull(),
  activeConcerns: text("active_concerns"),
  planOfCare: text("plan_of_care").notNull(),
  criticalAlerts: jsonb("critical_alerts").default([]),
  acknowledgedBy: uuid("acknowledged_by").references(() => users.id),
  acknowledgedAt: timestamp("acknowledged_at"),
  isEscalated: boolean("is_escalated").default(false).notNull(),
  nextRoundScheduledAt: timestamp("next_round_scheduled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ==========================================
// 51. PATIENT WAYFINDING & QUEUE NOTIFICATIONS
// ==========================================

export const patientWayfindingNotifications = pgTable("patient_wayfinding_notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  patientId: uuid("patient_id").references(() => patients.id, { onDelete: "cascade" }).notNull(),
  encounterId: uuid("encounter_id").references(() => encounters.id),
  ticketNumber: text("ticket_number").notNull(),
  targetLocation: text("target_location").notNull(),
  floorLevel: text("floor_level").default("Ground Floor"),
  directionGuidance: text("direction_guidance"),
  estimatedWaitMinutes: integer("estimated_wait_minutes").default(5),
  channel: text("channel", {
    enum: ["sms", "whatsapp", "in_app", "digital_signage", "audio_call"],
  }).default("in_app").notNull(),
  recipientPhone: text("recipient_phone"),
  messageContent: text("message_content").notNull(),
  deliveryStatus: text("delivery_status", {
    enum: ["queued", "sent", "delivered", "failed", "read"],
  }).default("sent").notNull(),
  dispatchedAt: timestamp("dispatched_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});


// ==========================================
// PHARMACY AUTOMATION TABLES
// ==========================================
export const pharmacyDispensingQueue = pgTable("pharmacy_dispensing_queue", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  prescriptionId: uuid("prescription_id").references(() => prescriptions.id, { onDelete: "cascade" }).notNull(),
  patientId: uuid("patient_id").references(() => patients.id, { onDelete: "cascade" }).notNull(),
  doctorId: uuid("doctor_id").references(() => users.id).notNull(),
  pharmacistId: uuid("pharmacist_id").references(() => users.id),
  nurseId: uuid("nurse_id").references(() => users.id),
  status: text("status", {
    enum: ["awaiting_payment", "payment_verified", "being_dispensed", "ready_for_pickup", "dispatched_to_nurse", "nurse_received", "administered", "completed", "cancelled"],
  }).default("awaiting_payment").notNull(),
  deliveryMethod: text("delivery_method", { enum: ["pickup", "nurse_delivery", "bedside"] }).default("pickup").notNull(),
  wardId: text("ward_id"),
  bedNumber: text("bed_number"),
  priority: text("priority", { enum: ["routine", "urgent", "stat"] }).default("routine").notNull(),
  medicationName: text("medication_name").notNull(),
  dosage: text("dosage").notNull(),
  quantity: integer("quantity").notNull().default(1),
  totalPrice: numeric("total_price", { precision: 10, scale: 2 }).notNull().default("0.00"),
  currency: varchar("currency", { length: 10 }).notNull().default("ETB"),
  paymentVerifiedAt: timestamp("payment_verified_at"),
  dispensedAt: timestamp("dispensed_at"),
  dispatchedAt: timestamp("dispatched_at"),
  nurseReceivedAt: timestamp("nurse_received_at"),
  completedAt: timestamp("completed_at"),
  pharmacistNotes: text("pharmacist_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const pharmacyNotifications = pgTable("pharmacy_notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  queueItemId: uuid("queue_item_id").references(() => pharmacyDispensingQueue.id, { onDelete: "cascade" }),
  prescriptionId: uuid("prescription_id").references(() => prescriptions.id, { onDelete: "cascade" }),
  recipientId: uuid("recipient_id").references(() => users.id).notNull(),
  recipientRole: text("recipient_role", { enum: ["patient", "pharmacist", "nurse", "doctor", "admin"] }).notNull(),
  channel: text("channel", { enum: ["in_app", "sms", "whatsapp", "email"] }).default("in_app").notNull(),
  eventType: text("event_type", {
    enum: ["prescription_signed", "payment_requested", "payment_confirmed", "dispense_started", "ready_for_pickup", "dispatched_to_nurse", "nurse_received", "medicine_administered", "low_stock_alert", "expiry_alert"],
  }).notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  metadata: jsonb("metadata").default({}),
  readAt: timestamp("read_at"),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pharmacyInventoryAlerts = pgTable("pharmacy_inventory_alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  drugId: uuid("drug_id").references(() => drugCatalog.id, { onDelete: "cascade" }),
  batchId: uuid("batch_id").references(() => drugBatches.id, { onDelete: "cascade" }),
  alertType: text("alert_type", { enum: ["low_stock", "near_expiry", "expired", "out_of_stock"] }).notNull(),
  threshold: integer("threshold"),
  currentValue: integer("current_value"),
  acknowledged: boolean("acknowledged").default(false).notNull(),
  acknowledgedBy: uuid("acknowledged_by").references(() => users.id),
  acknowledgedAt: timestamp("acknowledged_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==========================================
// DYNAMIC RBAC & CUSTOM ROLES
// ==========================================
export const customRoles = pgTable("custom_roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 64 }).notNull().default("clinical"),
  permissions: jsonb("permissions").notNull().default([]),
  isSystem: boolean("is_system").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userCustomRoles = pgTable("user_custom_roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  roleId: uuid("role_id").references(() => customRoles.id, { onDelete: "cascade" }).notNull(),
  assignedBy: uuid("assigned_by").references(() => users.id),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==========================================
// CUSTOM WORKFLOW DEFINITIONS
// ==========================================
export const workflowDefinitions = pgTable("workflow_definitions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  triggerEvent: varchar("trigger_event", { length: 64 }).notNull(),
  conditions: jsonb("conditions").default({}),
  steps: jsonb("steps").notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ==========================================
// POS CASHIER SHIFTS & TRANSACTIONS
// ==========================================
export const posCashierShifts = pgTable("pos_cashier_shifts", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  cashierId: uuid("cashier_id").references(() => users.id).notNull(),
  terminalId: varchar("terminal_id", { length: 64 }).default("POS-TERM-01"),
  openedAt: timestamp("opened_at").defaultNow().notNull(),
  closedAt: timestamp("closed_at"),
  openingFloat: numeric("opening_float", { precision: 10, scale: 2 }).notNull().default("1000.00"),
  expectedCash: numeric("expected_cash", { precision: 10, scale: 2 }).notNull().default("1000.00"),
  actualCash: numeric("actual_cash", { precision: 10, scale: 2 }),
  cashVariance: numeric("cash_variance", { precision: 10, scale: 2 }).default("0.00"),
  totalCashSales: numeric("total_cash_sales", { precision: 10, scale: 2 }).default("0.00"),
  totalTelebirrSales: numeric("total_telebirr_sales", { precision: 10, scale: 2 }).default("0.00"),
  totalCardSales: numeric("total_card_sales", { precision: 10, scale: 2 }).default("0.00"),
  totalInsuranceSales: numeric("total_insurance_sales", { precision: 10, scale: 2 }).default("0.00"),
  totalTransactions: integer("total_transactions").default(0),
  status: text("status", { enum: ["open", "closed", "audited"] }).notNull().default("open"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const posTransactions = pgTable("pos_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  shiftId: uuid("shift_id").references(() => posCashierShifts.id),
  invoiceId: uuid("invoice_id").references(() => invoices.id),
  patientId: uuid("patient_id").references(() => patients.id).notNull(),
  cashierId: uuid("cashier_id").references(() => users.id).notNull(),
  receiptNumber: varchar("receipt_number", { length: 64 }).notNull().unique(),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull().default("0.00"),
  discountAmount: numeric("discount_amount", { precision: 10, scale: 2 }).notNull().default("0.00"),
  taxAmount: numeric("tax_amount", { precision: 10, scale: 2 }).notNull().default("0.00"),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull().default("0.00"),
  paymentMethod: varchar("payment_method", { length: 64 }).notNull(),
  paymentBreakdown: jsonb("payment_breakdown").default({}),
  itemsSnapshot: jsonb("items_snapshot").notNull().default([]),
  cashTendered: numeric("cash_tendered", { precision: 10, scale: 2 }),
  changeReturned: numeric("change_returned", { precision: 10, scale: 2 }),
  transactionRef: varchar("transaction_ref", { length: 128 }),
  qrCodePayload: text("qr_code_payload"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==========================================
// 64. PATIENT ASSIGNMENTS & MATCHING
// ==========================================
export const patientAssignments = pgTable("patient_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  patientId: uuid("patient_id").references(() => patients.id).notNull(),
  encounterId: uuid("encounter_id").references(() => encounters.id),
  caseId: uuid("case_id").references(() => cases.id),
  providerId: uuid("provider_id").references(() => users.id).notNull(),
  providerType: text("provider_type"), // 'physician', 'nurse_practitioner', etc.
  specialty: text("specialty"),
  assignmentType: text("assignment_type", { enum: ["automatic", "manual", "patient_choice"] }).default("automatic").notNull(),
  status: text("status", { enum: ["assigned", "accepted", "declined", "completed", "cancelled"] }).default("assigned").notNull(),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  acceptedAt: timestamp("accepted_at"),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ==========================================
// 65. QUEUE MANAGEMENT & REAL-TIME FLOW
// ==========================================
export const queueEntries = pgTable("queue_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  caseId: uuid("case_id").references(() => cases.id),
  patientId: uuid("patient_id").references(() => patients.id).notNull(),
  providerId: uuid("provider_id").references(() => users.id),
  queueType: text("queue_type", { enum: ["walk_in", "telehealth", "treat_me_now", "scheduled"] }).default("treat_me_now").notNull(),
  position: integer("position").default(1).notNull(),
  priority: text("priority", { enum: ["routine", "urgent", "emergency"] }).default("routine").notNull(),
  status: text("status", { enum: ["waiting", "called", "in_service", "completed", "cancelled", "no_show"] }).default("waiting").notNull(),
  calledAt: timestamp("called_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  estimatedWaitMinutes: integer("estimated_wait_minutes").default(5),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ==========================================
// 66. CASE MESSAGES & THREADED CARE COMMUNICATIONS
// ==========================================
export const caseMessages = pgTable("case_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  caseId: uuid("case_id").references(() => cases.id).notNull(),
  senderId: uuid("sender_id").references(() => users.id),
  senderName: text("sender_name"),
  senderType: text("sender_type", { enum: ["patient", "provider", "care_coordinator", "system"] }).default("patient").notNull(),
  message: text("message").notNull(),
  attachments: jsonb("attachments").default([]),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==========================================
// 67. PROVIDER PROFILES & PUBLIC CREDENTIALS
// ==========================================
export const providerProfiles = pgTable("provider_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tenantId: uuid("tenant_id").notNull(),
  bio: text("bio"),
  specialties: jsonb("specialties").$type<string[]>().default([]),
  languages: jsonb("languages").$type<string[]>().default(["English", "Amharic"]),
  licenseNumber: varchar("license_number", { length: 100 }),
  licenseIssuingBody: varchar("license_issuing_body", { length: 255 }),
  licenseVerified: boolean("license_verified").default(false),
  consultationFeeEtb: decimal("consultation_fee_etb", { precision: 10, scale: 2 }).default("500.00"),
  approvalStatus: varchar("approval_status", { length: 50 }).default("draft"), // 'draft' | 'pending_hr' | 'approved' | 'rejected'
  hrReviewerId: uuid("hr_reviewer_id").references(() => users.id),
  hrFeedback: text("hr_feedback"),
  metadata: jsonb("metadata").default({}),
  submittedAt: timestamp("submitted_at"),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ==========================================
// 68. PROVIDER SCHEDULES & RECURRING SHIFTS
// ==========================================
export const providerSchedules = pgTable("provider_schedules", {
  id: uuid("id").defaultRandom().primaryKey(),
  providerId: uuid("provider_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(), // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  startTime: varchar("start_time", { length: 10 }).notNull(), // "09:00"
  endTime: varchar("end_time", { length: 10 }).notNull(), // "17:00"
  slotDurationMinutes: integer("slot_duration_minutes").default(30),
  isTelehealthAvailable: boolean("is_telehealth_available").default(true),
  isInPersonAvailable: boolean("is_in_person_available").default(true),
  isApprovedByHr: boolean("is_approved_by_hr").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==========================================
// 69. TELEGRAM BOT & MINI APP INTEGRATIONS
// ==========================================
export const telegramIntegrations = pgTable("telegram_integrations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  telegramChatId: varchar("telegram_chat_id", { length: 100 }).notNull().unique(),
  telegramUsername: varchar("telegram_username", { length: 100 }),
  isNotificationsEnabled: boolean("is_notifications_enabled").default(true),
  authLinkToken: varchar("auth_link_token", { length: 64 }),
  tokenExpiresAt: timestamp("token_expires_at"),
  linkedAt: timestamp("linked_at").defaultNow().notNull(),
});

// ==========================================
// 70. PATIENT ACTIVITY & LIFECYCLE AUDIT LOGS
// ==========================================
export const patientActivities = pgTable("patient_activities", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull(),
  patientId: uuid("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  actorUserId: uuid("actor_user_id").references(() => users.id),
  actorName: varchar("actor_name", { length: 255 }).notNull(),
  actorRole: varchar("actor_role", { length: 50 }).notNull(), // 'patient' | 'physician' | 'nurse' | 'system' | 'triage_staff'
  activityType: varchar("activity_type", { length: 100 }).notNull(), // 'appointment_booked' | 'prescription_issued' | 'lab_uploaded' | 'triage_performed' | 'vitals_logged' | 'consultation_completed'
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  severity: varchar("severity", { length: 20 }).default("info"), // 'info' | 'warning' | 'critical'
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==========================================
// 71. CLINICAL FILES & MEDICAL VAULT
// ==========================================
export const clinicalFiles = pgTable("clinical_files", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull(),
  patientId: uuid("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  uploadedByUserId: uuid("uploaded_by_user_id").references(() => users.id),
  encounterId: uuid("encounter_id").references(() => encounters.id),
  category: varchar("category", { length: 50 }).notNull(), // 'prescription' | 'lab_report' | 'imaging' | 'clinical_note' | 'invoice'
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileUrl: text("file_url").notNull(),
  fileSize: integer("file_size").default(102400), // in bytes
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  tags: jsonb("tags").$type<string[]>().default([]),
  verificationStatus: varchar("verification_status", { length: 50 }).default("verified"), // 'unverified' | 'verified' | 'flagged'
  isConfidential: boolean("is_confidential").default(false),
  archived: boolean("archived").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ==========================================
// 72. DOCUMENT ACCESS AUDIT LOGS
// ==========================================
export const documentAccessLogs = pgTable("document_access_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  fileId: uuid("file_id").notNull().references(() => clinicalFiles.id, { onDelete: "cascade" }),
  accessedByUserId: uuid("accessed_by_user_id").notNull().references(() => users.id),
  accessType: varchar("access_type", { length: 50 }).notNull(), // 'preview' | 'download' | 'delete' | 'reclassify'
  ipAddress: varchar("ip_address", { length: 50 }),
  accessedAt: timestamp("accessed_at").defaultNow().notNull(),
});

// ==========================================
// 73. IMMUNIZATION RECORDS
// ==========================================
export const immunizations = pgTable("immunizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull(),
  patientId: uuid("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  vaccineName: varchar("vaccine_name", { length: 255 }).notNull(),
  dateGiven: timestamp("date_given").defaultNow().notNull(),
  doseNumber: varchar("dose_number", { length: 50 }),
  lotNumber: varchar("lot_number", { length: 100 }),
  manufacturer: varchar("manufacturer", { length: 100 }),
  administeringProvider: varchar("administering_provider", { length: 150 }),
  status: varchar("status", { length: 50 }).default("completed").notNull(), // 'completed' | 'due' | 'overdue'
  nextDueDate: timestamp("next_due_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
// ==========================================
// 74. DYNAMIC NAVIGATION ITEMS
// ==========================================
export const navigationItems = pgTable("navigation_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id, { onDelete: "cascade" }),
  role: text("role"), // null = all roles, or specific role like 'physician', 'patient', 'guest'
  label: text("label").notNull(),
  href: text("href").notNull(),
  icon: text("icon"),
  parentId: uuid("parent_id"),
  order: integer("order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  requiresAuth: boolean("requires_auth").default(true).notNull(),
  badgeKey: text("badge_key"), // e.g. 'unread_messages', 'pending_reviews'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ==========================================
// 75. DYNAMIC PAGE CONTENTS (CMS)
// ==========================================
export const pageContents = pgTable("page_contents", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id, { onDelete: "cascade" }),
  pageKey: text("page_key").notNull(), // e.g. 'landing', 'patient-dashboard', 'about'
  sectionKey: text("section_key").notNull(), // e.g. 'hero', 'services', 'pricing'
  contentType: text("content_type").default("json").notNull(), // 'text' | 'html' | 'markdown' | 'json'
  content: jsonb("content").notNull(),
  language: text("language").default("en").notNull(),
  version: integer("version").default(1).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ==========================================
// 76. DYNAMIC SERVICE PRICING
// ==========================================
export const servicePricing = pgTable("service_pricing", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id, { onDelete: "cascade" }),
  serviceName: text("service_name").notNull(),
  serviceType: text("service_type").default("subscription").notNull(), // 'consultation' | 'lab_test' | 'imaging' | 'medication' | 'procedure' | 'subscription'
  planCode: text("plan_code"), // e.g. 'individual', 'family', 'corporate'
  basePrice: numeric("base_price").notNull(),
  yearlyPrice: numeric("yearly_price"),
  currency: text("currency").default("ETB").notNull(),
  discountPercent: numeric("discount_percent").default("0").notNull(),
  badge: text("badge"),
  description: text("description"),
  features: jsonb("features").default([]).notNull(),
  popular: boolean("popular").default(false).notNull(),
  ctaText: text("cta_text").default("Get Started").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ==========================================
// 77. DYNAMIC DASHBOARD WIDGETS
// ==========================================
export const dashboardWidgets = pgTable("dashboard_widgets", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // 'physician', 'patient', 'system_admin', 'nurse', etc.
  widgetName: text("widget_name").notNull(),
  widgetType: text("widget_type").default("stats").notNull(), // 'stats' | 'list' | 'chart' | 'table' | 'timeline' | 'custom'
  title: text("title"),
  description: text("description"),
  config: jsonb("config").default({}).notNull(),
  position: integer("position").default(0).notNull(),
  gridSpan: integer("grid_span").default(1).notNull(), // 1, 2, or 3 columns
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ==========================================
// 78. DYNAMIC TAB CONFIGURATIONS
// ==========================================
export const tabConfigurations = pgTable("tab_configurations", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id, { onDelete: "cascade" }),
  pageKey: text("page_key").notNull(), // e.g. 'patient_health', 'admin_portal', 'clinical_station'
  tabKey: text("tab_key").notNull(), // e.g. 'timeline', 'documents', 'labs', 'medications'
  label: text("label").notNull(),
  icon: text("icon"),
  badgeKey: text("badge_key"), // e.g. 'labsCount', 'activeMedsCount'
  order: integer("order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  requiredPermission: text("required_permission"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==========================================
// 79. DYNAMIC ACTION CONFIGURATIONS
// ==========================================
export const actionConfigurations = pgTable("action_configurations", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id, { onDelete: "cascade" }),
  pageKey: text("page_key").notNull(),
  actionKey: text("action_key").notNull(),
  label: text("label").notNull(),
  icon: text("icon"),
  actionType: text("action_type").default("link").notNull(), // 'link' | 'api_call' | 'modal' | 'download' | 'webhook'
  href: text("href"),
  apiEndpoint: text("api_endpoint"),
  method: text("method").default("GET"), // 'GET' | 'POST' | 'PUT' | 'DELETE'
  variant: text("variant").default("default"), // 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive'
  requiredPermission: text("required_permission"),
  order: integer("order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==========================================
// 80. DYNAMIC FORM CONFIGURATIONS & FIELDS
// ==========================================
export const formConfigurations = pgTable("form_configurations", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id, { onDelete: "cascade" }),
  formKey: text("form_key").notNull().unique(), // e.g. 'patient_intake', 'appointment_booking', 'vitals_entry'
  title: text("title").notNull(),
  description: text("description"),
  submitLabel: text("submit_label").default("Submit").notNull(),
  actionEndpoint: text("action_endpoint"), // optional custom submission URL
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const formFields = pgTable("form_fields", {
  id: uuid("id").primaryKey().defaultRandom(),
  formId: uuid("form_id").references(() => formConfigurations.id, { onDelete: "cascade" }).notNull(),
  fieldName: text("field_name").notNull(),
  label: text("label").notNull(),
  fieldType: text("field_type").default("text").notNull(), // 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'textarea' | 'checkbox' | 'radio' | 'file' | 'phone' | 'email'
  placeholder: text("placeholder"),
  required: boolean("required").default(false).notNull(),
  options: jsonb("options").default([]), // for select/radio: [{ value: string, label: string }]
  validation: jsonb("validation").default({}), // min, max, pattern, message
  order: integer("order").default(0).notNull(),
  defaultValue: text("default_value"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const formSubmissions = pgTable("form_submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id, { onDelete: "cascade" }),
  formKey: text("form_key").notNull(),
  submittedByUserId: uuid("submitted_by_user_id").references(() => users.id),
  data: jsonb("data").notNull(),
  status: text("status").default("submitted").notNull(), // 'submitted' | 'processed' | 'rejected'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==========================================
// 81. DYNAMIC LANDING SECTIONS
// ==========================================
export const landingSections = pgTable("landing_sections", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id, { onDelete: "cascade" }),
  sectionKey: text("section_key").notNull(), // 'hero' | 'trust' | 'services' | 'how_it_works' | 'why_choose_us' | 'pricing' | 'doctors' | 'faq' | 'cta' | 'footer'
  title: text("title"),
  subtitle: text("subtitle"),
  content: jsonb("content").default({}).notNull(),
  order: integer("order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ==========================================
// 82. DYNAMIC NOTIFICATION TEMPLATES
// ==========================================
export const notificationTemplates = pgTable("notification_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id, { onDelete: "cascade" }),
  templateKey: text("template_key").notNull().unique(), // e.g. 'appointment_reminder', 'lab_ready'
  title: text("title").notNull(),
  body: text("body").notNull(),
  type: text("type").default("info").notNull(), // 'info' | 'success' | 'warning' | 'error'
  channels: jsonb("channels").default(["in_app"]).notNull(), // ['email', 'sms', 'push', 'in_app']
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ==========================================
// 83. DYNAMIC TRANSLATIONS (i18n)
// ==========================================
export const translations = pgTable("translations", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id, { onDelete: "cascade" }),
  key: text("key").notNull(), // e.g. 'nav.dashboard', 'common.search'
  language: text("language").notNull(), // 'en' | 'am' | 'om' | 'ti'
  value: text("value").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
