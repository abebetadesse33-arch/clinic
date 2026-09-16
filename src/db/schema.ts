import { randomUUID } from "crypto";
import {
  mysqlTable,
  varchar,
  text,
  datetime,
  decimal,
  int,
  boolean,
  json,
  date,
  serial,
  unique,
} from "drizzle-orm/mysql-core";

// ==========================================
// 1. ORGANIZATIONS & MULTI-TENANCY
// ==========================================
export const organizations = mysqlTable("organizations", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  name: text("name").notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  status: text("status", { enum: ["active", "suspended", "deleted"] }).default("active"),
  settings: json("settings").default({}),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()).notNull(),
});

export const facilities = mysqlTable("facilities", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  organizationId: varchar("organization_id", { length: 36 }).references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  address: text("address"),
  timezone: text("timezone").default("UTC"),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 2. USERS & MULTIDISCIPLINARY HEALTHCARE ROLES
// ==========================================
export const users = mysqlTable("users", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  organizationId: varchar("organization_id", { length: 36 }).references(() => organizations.id).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash"),
  fullName: text("full_name").notNull(),
  role: text("role", {
    enum: [
      "system_admin",
      "tenant_admin",
      "physician",
      "nurse_practitioner",
      "nurse",
      "triage_staff",
      "pharmacist",
      "physiotherapist",
      "occupational_therapist",
      "dietitian",
      "social_worker",
      "radiologist",
      "pathologist",
      "lab_technician",
      "laboratorist",
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
  scopeOfPractice: json("scope_of_practice").default({}), // e.g. { prescribe_controlled: false, can_order_diagnostics: true }
  isAdminGrantedBySuperAdmin: boolean("is_admin_granted_by_super_admin").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()).notNull(),
});

export const professionalProfiles = mysqlTable("professional_profiles", {
  userId: varchar("user_id", { length: 36 }).primaryKey().references(() => users.id, { onDelete: "cascade" }),
  professionalType: text("professional_type").notNull(),
  licenseNumber: text("license_number"),
  specialty: text("specialty"),
  certifications: json("certifications").default([]),
  hospitalAffiliation: text("hospital_affiliation"),
  deaNumber: text("dea_number"),
  digitalSignatureRef: text("digital_signature_ref"),
  scopeOfPractice: json("scope_of_practice").default({}),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 3. PATIENTS & CARE TEAMS
// ==========================================
export const patients = mysqlTable("patients", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  userId: varchar("user_id", { length: 36 }).references(() => users.id),
  mrn: varchar("mrn", { length: 255 }).notNull().unique(),
  nationalId: text("national_id"),
  nationalIdVerified: boolean("national_id_verified").default(false),
  digitalCardNumber: text("digital_card_number"),
  preferredClinicBranch: text("preferred_clinic_branch").default("habitat-main"),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  dateOfBirth: date("date_of_birth", { mode: "string" }).notNull(),
  gender: text("gender", { enum: ["male", "female", "other", "undisclosed"] }).notNull(),
  bloodType: text("blood_type"),
  phone: text("phone"),
  email: text("email"),
  allergies: json("allergies").default([]),
  emergencyContact: text("emergency_contact"),
  primaryDoctorId: varchar("primary_doctor_id", { length: 36 }).references(() => users.id),
  triagePriority: text("triage_priority", { enum: ["routine", "urgent", "critical"] }).default("routine"),
  avatar: text("avatar"),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()).notNull(),
});

export const careTeams = mysqlTable("care_teams", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  patientId: varchar("patient_id", { length: 36 }).references(() => patients.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

export const careTeamMembers = mysqlTable("care_team_members", {
  careTeamId: varchar("care_team_id", { length: 36 }).references(() => careTeams.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id", { length: 36 }).references(() => users.id).notNull(),
  role: text("role").notNull(), // physician, nurse, pharmacist, physiotherapist, dietitian, social_worker, etc.
  assignedAt: datetime("assigned_at").$defaultFn(() => new Date()).notNull(),
});

export const encounters = mysqlTable("encounters", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  patientId: varchar("patient_id", { length: 36 }).references(() => patients.id, { onDelete: "cascade" }).notNull(),
  clinicianId: varchar("clinician_id", { length: 36 }).references(() => users.id).notNull(),
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
  assignedNurseId: varchar("assigned_nurse_id", { length: 36 }).references(() => users.id),
  assignedPhysicianId: varchar("assigned_physician_id", { length: 36 }).references(() => users.id),
  assignedCareCoordinatorId: varchar("assigned_care_coordinator_id", { length: 36 }).references(() => users.id),
  workflowProgress: json("workflow_progress").default({
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
  startTime: datetime("start_time").$defaultFn(() => new Date()),
  endTime: datetime("end_time"),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 4. MULTIMODAL MEDIA ASSETS
// ==========================================
export const mediaAssets = mysqlTable("media_assets", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  patientId: varchar("patient_id", { length: 36 }).references(() => patients.id, { onDelete: "cascade" }).notNull(),
  encounterId: varchar("encounter_id", { length: 36 }).references(() => encounters.id),
  type: text("type", { enum: ["image", "audio", "video", "signal", "genomic", "document"] }).notNull(),
  modality: text("modality").notNull(),
  title: text("title").notNull(),
  fileUrl: text("file_url").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSizeKb: int("file_size_kb"),
  metadata: json("metadata").default({}),
  preprocessedSummary: text("preprocessed_summary"),
  confidenceScore: decimal("confidence_score", { precision: 12, scale: 4 }),
  uploadedBy: varchar("uploaded_by", { length: 36 }).references(() => users.id),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 5. MULTIDISCIPLINARY CLINICAL ASSESSMENTS
// ==========================================

// --- Biological: Vitals & Symptoms ---
export const vitals = mysqlTable("vitals", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  patientId: varchar("patient_id", { length: 36 }).references(() => patients.id, { onDelete: "cascade" }).notNull(),
  encounterId: varchar("encounter_id", { length: 36 }).references(() => encounters.id),
  recordedAt: datetime("recorded_at").$defaultFn(() => new Date()).notNull(),
  heightCm: decimal("height_cm", { precision: 12, scale: 4 }),
  weightKg: decimal("weight_kg", { precision: 12, scale: 4 }),
  bmi: decimal("bmi", { precision: 12, scale: 4 }),
  systolicBp: int("systolic_bp"),
  diastolicBp: int("diastolic_bp"),
  heartRate: int("heart_rate"),
  respiratoryRate: int("respiratory_rate"),
  temperatureC: decimal("temperature_c", { precision: 12, scale: 4 }),
  oxygenSaturation: decimal("oxygen_saturation", { precision: 12, scale: 4 }),
  ecgSummary: text("ecg_summary"),
  recordedBy: varchar("recorded_by", { length: 36 }).references(() => users.id),
});

export const symptoms = mysqlTable("symptoms", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  patientId: varchar("patient_id", { length: 36 }).references(() => patients.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  severity: text("severity", { enum: ["mild", "moderate", "severe"] }).notNull(),
  onsetDate: date("onset_date", { mode: "string" }),
  duration: text("duration"),
  bodyLocation: text("body_location"),
  description: text("description"),
  isPrimary: boolean("is_primary").default(false),
  recordedAt: datetime("recorded_at").$defaultFn(() => new Date()).notNull(),
});

// --- Biological: Biochemistry & Labs ---
export const labResults = mysqlTable("lab_results", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  patientId: varchar("patient_id", { length: 36 }).references(() => patients.id, { onDelete: "cascade" }).notNull(),
  testName: text("test_name").notNull(),
  category: text("category").notNull(),
  value: text("value").notNull(),
  unit: text("unit").notNull(),
  referenceRangeLow: decimal("reference_range_low", { precision: 12, scale: 4 }),
  referenceRangeHigh: decimal("reference_range_high", { precision: 12, scale: 4 }),
  isAbnormal: boolean("is_abnormal").default(false).notNull(),
  interpretation: text("interpretation"),
  performedAt: datetime("performed_at").$defaultFn(() => new Date()).notNull(),
  sourceLab: text("source_lab"),
  reportUrl: text("report_url"),
});

// --- Biological: Pharmacogenomics ---
export const geneticProfiles = mysqlTable("genetic_profiles", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  patientId: varchar("patient_id", { length: 36 }).references(() => patients.id, { onDelete: "cascade" }).notNull(),
  gene: text("gene").notNull(),
  variant: text("variant").notNull(),
  phenotype: text("phenotype").notNull(),
  clinicalSignificance: text("clinical_significance").notNull(),
  sourcePanel: text("source_panel"),
  vcfAssetId: varchar("vcf_asset_id", { length: 36 }).references(() => mediaAssets.id),
  testedAt: datetime("tested_at").$defaultFn(() => new Date()).notNull(),
});

// --- Biological: Imaging Findings ---
export const imagingFindings = mysqlTable("imaging_findings", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  patientId: varchar("patient_id", { length: 36 }).references(() => patients.id, { onDelete: "cascade" }).notNull(),
  mediaAssetId: varchar("media_asset_id", { length: 36 }).references(() => mediaAssets.id),
  modality: text("modality").notNull(),
  bodySite: text("body_site").notNull(),
  findingSummary: text("finding_summary").notNull(),
  impression: text("impression").notNull(),
  imageUrl: text("image_url"),
  radiologistName: text("radiologist_name"),
  performedAt: datetime("performed_at").$defaultFn(() => new Date()).notNull(),
});

// --- Role: Nursing Assessments ---
export const nursingAssessments = mysqlTable("nursing_assessments", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  patientId: varchar("patient_id", { length: 36 }).references(() => patients.id, { onDelete: "cascade" }).notNull(),
  encounterId: varchar("encounter_id", { length: 36 }).references(() => encounters.id),
  morseFallScore: int("morse_fall_score"),
  fallRiskCategory: text("fall_risk_category", { enum: ["low", "moderate", "high"] }),
  bradenPressureScore: int("braden_pressure_score"),
  painScore: int("pain_score"), // 0-10
  intakeOutputMl: json("intake_output_ml").default({ intake: 0, output: 0 }),
  nursingCareNotes: text("nursing_care_notes"),
  assessedBy: varchar("assessed_by", { length: 36 }).references(() => users.id).notNull(),
  assessedAt: datetime("assessed_at").$defaultFn(() => new Date()).notNull(),
});

// --- Role: Physiotherapy & Physical Therapy ---
export const physiotherapyAssessments = mysqlTable("physiotherapy_assessments", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  patientId: varchar("patient_id", { length: 36 }).references(() => patients.id, { onDelete: "cascade" }).notNull(),
  bergBalanceScore: int("berg_balance_score"), // 0-56
  gaitSpeedMetersPerSec: decimal("gait_speed_meters_per_sec", { precision: 12, scale: 4 }),
  mobilityStatus: text("mobility_status"), // Independent, Assistive Device, Dependent
  strengthGrading: json("strength_grading").default({}), // e.g. { quadriceps: "4/5", hamstrings: "4/5" }
  rehabGoals: text("rehab_goals"),
  exercisePlan: json("exercise_plan").default({}),
  assessedBy: varchar("assessed_by", { length: 36 }).references(() => users.id).notNull(),
  assessedAt: datetime("assessed_at").$defaultFn(() => new Date()).notNull(),
});

// --- Role: Occupational Therapy ---
export const occupationalTherapyAssessments = mysqlTable("occupational_therapy_assessments", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  patientId: varchar("patient_id", { length: 36 }).references(() => patients.id, { onDelete: "cascade" }).notNull(),
  barthelIndexScore: int("barthel_index_score"), // 0-100 ADL
  homeSafetyRisk: text("home_safety_risk", { enum: ["low", "moderate", "high"] }),
  adaptiveEquipmentNeeds: json("adaptive_equipment_needs").default([]),
  cognitiveSupportNotes: text("cognitive_support_notes"),
  assessedBy: varchar("assessed_by", { length: 36 }).references(() => users.id).notNull(),
  assessedAt: datetime("assessed_at").$defaultFn(() => new Date()).notNull(),
});

// --- Role: Dietitian & Nutritionist ---
export const nutritionAssessments = mysqlTable("nutrition_assessments", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  patientId: varchar("patient_id", { length: 36 }).references(() => patients.id, { onDelete: "cascade" }).notNull(),
  nutritionalRiskScore: text("nutritional_risk_score", { enum: ["low", "moderate", "high_malnutrition"] }),
  dailyCalorieTarget: int("daily_calorie_target"),
  proteinTargetGrams: int("protein_target_grams"),
  sodiumLimitMg: int("sodium_limit_mg"),
  dietType: text("diet_type"), // Mediterranean, Renal Diabetic, Low Sodium
  foodInsecurityAccommodation: text("food_insecurity_accommodation"),
  mealPlanDetails: json("meal_plan_details").default({}),
  assessedBy: varchar("assessed_by", { length: 36 }).references(() => users.id).notNull(),
  assessedAt: datetime("assessed_at").$defaultFn(() => new Date()).notNull(),
});

// --- Role: Social Work & SDOH ---
export const socialHistory = mysqlTable("social_history", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  patientId: varchar("patient_id", { length: 36 }).references(() => patients.id, { onDelete: "cascade" }).notNull(),
  category: text("category").notNull(),
  indicator: text("indicator").notNull(),
  severityLevel: text("severity_level", { enum: ["low", "medium", "high"] }).notNull(),
  description: text("description").notNull(),
  recommendedAction: text("recommended_action"),
  communityResourcesConnected: json("community_resources_connected").default([]),
  recordedAt: datetime("recorded_at").$defaultFn(() => new Date()).notNull(),
});

// --- Role: Respiratory Therapy ---
export const respiratoryAssessments = mysqlTable("respiratory_assessments", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  patientId: varchar("patient_id", { length: 36 }).references(() => patients.id, { onDelete: "cascade" }).notNull(),
  abgPh: decimal("abg_ph", { precision: 12, scale: 4 }),
  abgPaco2: decimal("abg_paco2"),
  abgPao2: decimal("abg_pao2"),
  abgHco3: decimal("abg_hco3"),
  abgSao2: decimal("abg_sao2"),
  ventilatorSettings: json("ventilator_settings").default({}),
  airwayClearanceRegimen: text("airway_clearance_regimen"),
  assessedBy: varchar("assessed_by", { length: 36 }).references(() => users.id).notNull(),
  assessedAt: datetime("assessed_at").$defaultFn(() => new Date()).notNull(),
});

// --- Role: Psychological Assessments ---
export const psychologicalAssessments = mysqlTable("psychological_assessments", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  patientId: varchar("patient_id", { length: 36 }).references(() => patients.id, { onDelete: "cascade" }).notNull(),
  testName: text("test_name").notNull(),
  score: int("score").notNull(),
  severity: text("severity").notNull(),
  breakdown: json("breakdown"),
  clinicalNotes: text("clinical_notes"),
  adherenceRisk: text("adherence_risk", { enum: ["low", "moderate", "high"] }).default("low"),
  assessedBy: varchar("assessed_by", { length: 36 }).references(() => users.id),
  assessedAt: datetime("assessed_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 6. MEDICATIONS, PRESCRIPTIONS, & ORDERS
// ==========================================
export const medications = mysqlTable("medications", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  patientId: varchar("patient_id", { length: 36 }).references(() => patients.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  dosage: text("dosage").notNull(),
  frequency: text("frequency").notNull(),
  route: text("route").default("Oral"),
  indication: text("indication"),
  startDate: date("start_date", { mode: "string" }),
  endDate: date("end_date", { mode: "string" }),
  isActive: boolean("is_active").default(true).notNull(),
  prescribedBy: varchar("prescribed_by", { length: 36 }).references(() => users.id),
  pharmacistVerified: boolean("pharmacist_verified").default(false),
  notes: text("notes"),
});

export const prescriptions = mysqlTable("prescriptions", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  patientId: varchar("patient_id", { length: 36 }).references(() => patients.id, { onDelete: "cascade" }).notNull(),
  encounterId: varchar("encounter_id", { length: 36 }).references(() => encounters.id),
  doctorId: varchar("doctor_id", { length: 36 }).references(() => users.id).notNull(),
  aiSuggestionId: varchar("ai_suggestion_id", { length: 36 }),
  status: text("status", { enum: ["draft", "signed", "pending_payment", "payment_cleared", "dispensed", "discontinued", "rejected", "cancelled"] }).default("draft").notNull(),
  medicationName: text("medication_name").notNull(),
  dosage: text("dosage").notNull(),
  frequency: text("frequency").notNull(),
  route: text("route").default("Oral"),
  indication: text("indication"),
  durationDays: int("duration_days").notNull(),
  quantity: int("quantity").notNull(),
  dispenseQuantity: int("dispense_quantity"),
  refillsAllowed: int("refills_allowed").default(0).notNull(),
  instructions: text("instructions").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).default("0.00"),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).default("0.00"),
  currency: varchar("currency", { length: 10 }).default("ETB").notNull(),
  paymentStatus: text("payment_status", { enum: ["unpaid", "paid", "waived", "free"] }).default("unpaid").notNull(),
  invoiceId: varchar("invoice_id", { length: 36 }).references(() => invoices.id),
  transactionRef: text("transaction_ref"),
  paidAt: datetime("paid_at"),
  prescriberSignature: text("prescriber_signature"),
  signedAt: datetime("signed_at"),
  pharmacistId: varchar("pharmacist_id", { length: 36 }).references(() => users.id),
  dispensedAt: datetime("dispensed_at"),
  nurseId: varchar("nurse_id", { length: 36 }).references(() => users.id),
  wardId: text("ward_id"),
  bedNumber: text("bed_number"),
  deliveryMethod: text("delivery_method", { enum: ["pickup", "nurse_delivery", "bedside"] }).default("pickup"),
  patientNotifiedAt: datetime("patient_notified_at"),
  doctorNotifiedAt: datetime("doctor_notified_at"),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});


export const labOrders = mysqlTable("lab_orders", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  patientId: varchar("patient_id", { length: 36 }).references(() => patients.id, { onDelete: "cascade" }).notNull(),
  encounterId: varchar("encounter_id", { length: 36 }).references(() => encounters.id),
  doctorId: varchar("doctor_id", { length: 36 }).references(() => users.id).notNull(),
  aiSuggestionId: varchar("ai_suggestion_id", { length: 36 }),
  testName: text("test_name").notNull(),
  clinicalReason: text("clinical_reason").notNull(),
  priority: text("priority", { enum: ["routine", "urgent", "stat"] }).default("routine").notNull(),
  status: text("status", { enum: ["ordered", "pending_payment", "payment_cleared", "sample_collected", "processing", "completed", "cancelled"] }).default("ordered").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).default("0.00"),
  currency: varchar("currency", { length: 10 }).default("ETB").notNull(),
  paymentStatus: text("payment_status", { enum: ["unpaid", "paid", "waived", "free"] }).default("unpaid").notNull(),
  invoiceId: varchar("invoice_id", { length: 36 }).references(() => invoices.id),
  transactionRef: text("transaction_ref"),
  paidAt: datetime("paid_at"),
  sampleCollectedAt: datetime("sample_collected_at"),
  sampleCollectedBy: varchar("sample_collected_by", { length: 36 }).references(() => users.id),
  orderedAt: datetime("ordered_at").$defaultFn(() => new Date()).notNull(),
  completedAt: datetime("completed_at"),
});

// ==========================================
// 6B. CLINICAL ORDERS (UNIFIED ENTERPRISE PIPELINE)
// ==========================================
export const clinicalOrders = mysqlTable("clinical_orders", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  patientId: varchar("patient_id", { length: 36 }).references(() => patients.id, { onDelete: "cascade" }).notNull(),
  encounterId: varchar("encounter_id", { length: 36 }).references(() => encounters.id, { onDelete: "restrict" }).notNull(),
  orderingDoctorId: varchar("ordering_doctor_id", { length: 36 }).references(() => users.id).notNull(),
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
  releaseAt: datetime("release_at"), // Staged patient portal release time
  isReleasedEarly: boolean("is_released_early").default(false).notNull(),
  specimenBarcode: text("specimen_barcode"),
  collectedBy: varchar("collected_by", { length: 36 }).references(() => users.id),
  collectedAt: datetime("collected_at"),
  cancellationReason: text("cancellation_reason"),
  cancelledBy: varchar("cancelled_by", { length: 36 }).references(() => users.id),
  cancelledAt: datetime("cancelled_at"),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()).notNull(),
});

// Critical / Panic Value Alerts
export const criticalAlerts = mysqlTable("critical_alerts", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  orderId: varchar("order_id", { length: 36 }).references(() => clinicalOrders.id, { onDelete: "cascade" }).notNull(),
  encounterId: varchar("encounter_id", { length: 36 }).references(() => encounters.id).notNull(),
  patientId: varchar("patient_id", { length: 36 }).references(() => patients.id).notNull(),
  testName: text("test_name").notNull(),
  criticalValue: text("critical_value").notNull(),
  tier: text("tier", { enum: ["tier_1_physician", "tier_2_charge_nurse", "tier_3_medical_director"] }).default("tier_1_physician").notNull(),
  acknowledgedBy: varchar("acknowledged_by", { length: 36 }).references(() => users.id),
  acknowledgedAt: datetime("acknowledged_at"),
  escalatedAt: datetime("escalated_at"),
  acknowledgmentNote: text("acknowledgment_note"),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

// Transactional Outbox Pattern for Order Workflow Events
export const orderOutboxEvents = mysqlTable("order_outbox_events", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  orderId: varchar("order_id", { length: 36 }).references(() => clinicalOrders.id, { onDelete: "cascade" }).notNull(),
  eventType: text("event_type").notNull(),
  payload: text("payload").notNull(), // JSON serialized
  status: text("status", { enum: ["pending", "processing", "completed", "failed"] }).default("pending").notNull(),
  retryCount: int("retry_count").default(0).notNull(),
  errorMessage: text("error_message"),
  idempotencyKey: varchar("idempotency_key", { length: 255 }).unique().notNull(),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
  processedAt: datetime("processed_at"),
});

// ==========================================
// 7. MULTIDISCIPLINARY UNIFIED CARE PLAN & TASKS
// ==========================================
export const carePlans = mysqlTable("care_plans", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  patientId: varchar("patient_id", { length: 36 }).references(() => patients.id, { onDelete: "cascade" }).notNull(),
  createdBy: varchar("created_by", { length: 36 }).references(() => users.id).notNull(),
  status: text("status", { enum: ["draft", "active", "under_review", "completed"] }).default("active").notNull(),
  primaryDiagnosis: text("primary_diagnosis").notNull(),
  goals: json("goals").default([]), // array of { id, title, targetDate, status, assignedRole }
  interventions: json("interventions").default([]), // array of { id, role, description, frequency, status, signedBy }
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()).notNull(),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

export const tasks = mysqlTable("tasks", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  patientId: varchar("patient_id", { length: 36 }).references(() => patients.id, { onDelete: "cascade" }).notNull(),
  encounterId: varchar("encounter_id", { length: 36 }).references(() => encounters.id),
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
  assignedToUserId: varchar("assigned_to_user_id", { length: 36 }).references(() => users.id),
  assignedByUserId: varchar("assigned_by_user_id", { length: 36 }).references(() => users.id).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  priority: text("priority", { enum: ["routine", "urgent", "stat"] }).default("routine").notNull(),
  status: text("status", { enum: ["pending", "in_progress", "completed", "cancelled"] }).default("pending").notNull(),
  slaMinutes: int("sla_minutes").default(60).notNull(),
  isEscalated: boolean("is_escalated").default(false).notNull(),
  dueDate: date("due_date", { mode: "string" }),
  completedAt: datetime("completed_at"),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

export const teamMessages = mysqlTable("team_messages", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  patientId: varchar("patient_id", { length: 36 }).references(() => patients.id, { onDelete: "cascade" }).notNull(),
  senderId: varchar("sender_id", { length: 36 }).references(() => users.id).notNull(),
  senderRole: text("sender_role").notNull(),
  content: text("content").notNull(),
  isUrgentConsult: boolean("is_urgent_consult").default(false),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 8. CLINICAL DECISION SUPPORT & MULTIMODAL AI
// ==========================================
export const aiSuggestions = mysqlTable("ai_suggestions", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  patientId: varchar("patient_id", { length: 36 }).references(() => patients.id, { onDelete: "cascade" }).notNull(),
  sessionId: varchar("session_id", { length: 36 }).references(() => encounters.id),
  analysisType: text("analysis_type").default("comprehensive_multidisciplinary").notNull(),
  modelName: text("model_name").default("gemini-1.5-pro").notNull(),
  modelVersion: text("model_version").default("2026.2-multidisciplinary"),
  inputSummary: json("input_summary").notNull(),
  rawDataRefs: json("raw_data_refs").default([]).notNull(),
  aiResponse: json("ai_response").notNull(), // Multidisciplinary bundle
  status: text("status", { enum: ["pending_review", "accepted_full", "accepted_modified", "rejected"] }).default("pending_review").notNull(),
  reviewNotes: text("review_notes"),
  reviewedBy: varchar("reviewed_by", { length: 36 }).references(() => users.id),
  reviewedAt: datetime("reviewed_at"),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 9. DOCUMENTS, CONSENTS, & RAG KNOWLEDGE BASE
// ==========================================
export const documents = mysqlTable("documents", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  patientId: varchar("patient_id", { length: 36 }).references(() => patients.id, { onDelete: "cascade" }).notNull(),
  encounterId: varchar("encounter_id", { length: 36 }).references(() => encounters.id),
  type: text("type").notNull(),
  fileUrl: text("file_url").notNull(),
  mimeType: text("mime_type"),
  uploadedBy: varchar("uploaded_by", { length: 36 }).references(() => users.id),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

export const consents = mysqlTable("consents", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  patientId: varchar("patient_id", { length: 36 }).references(() => patients.id, { onDelete: "cascade" }).notNull(),
  type: text("type").notNull(),
  status: text("status", { enum: ["active", "withdrawn", "expired"] }).default("active").notNull(),
  scope: json("scope").default({}),
  signedAt: datetime("signed_at").$defaultFn(() => new Date()).notNull(),
  expiresAt: datetime("expires_at"),
});

export const knowledgeDocuments = mysqlTable("knowledge_documents", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  source: text("source").notNull(),
  category: text("category").notNull(),
  metadata: json("metadata").default({}),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

export const biologicalRules = mysqlTable("biological_rules", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  curatedBy: varchar("curated_by", { length: 36 }).references(() => users.id).notNull(),
  category: text("category").notNull(),
  ruleTitle: text("rule_title").notNull(),
  description: text("description").notNull(),
  evidenceGrade: text("evidence_grade").notNull(),
  sourceCitation: text("source_citation").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 10. IMMUTABLE AUDIT LOG (HIPAA / GDPR / 21 CFR)
// ==========================================
export const auditLogs = mysqlTable("audit_logs", {
  id: serial("id").primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id),
  userId: varchar("user_id", { length: 36 }).references(() => users.id),
  userRole: text("user_role"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  summary: text("summary"),
  diff: json("diff"),
  ipAddress: text("ip_address").default("127.0.0.1"),
  userAgent: text("user_agent"),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 11. MULTI-ROLE USER MEMBERSHIPS
// ==========================================
export const userRoles = mysqlTable("user_roles", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  userId: varchar("user_id", { length: 36 }).references(() => users.id, { onDelete: "cascade" }).notNull(),
  organizationId: varchar("organization_id", { length: 36 }).references(() => organizations.id).notNull(),
  role: text("role").notNull(),
  isPrimary: boolean("is_primary").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  grantedBy: varchar("granted_by", { length: 36 }).references(() => users.id),
  grantedAt: datetime("granted_at").$defaultFn(() => new Date()).notNull(),
  revokedAt: datetime("revoked_at"),
});

// ==========================================
// 12. DYNAMIC DASHBOARD WIDGET REGISTRY & LAYOUTS
// ==========================================
export const legacyDashboardWidgets = mysqlTable("legacy_dashboard_widgets", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  widgetId: varchar("widget_id", { length: 255 }).notNull().unique(), // e.g. "my_patients", "critical_alerts"
  displayName: text("display_name").notNull(),
  description: text("description"),
  category: text("category").notNull(), // "clinical", "pharmacy", "admin", etc.
  defaultColSpan: int("default_col_span").default(1).notNull(),
  defaultRowSpan: int("default_row_span").default(1).notNull(),
  allowedRoles: json("allowed_roles").default([]).notNull(), // array of Role strings
  refreshIntervalSeconds: int("refresh_interval_seconds").default(60),
  isSystemWidget: boolean("is_system_widget").default(false).notNull(),
  metadata: json("metadata").default({}),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

export const dashboardLayouts = mysqlTable("dashboard_layouts", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  organizationId: varchar("organization_id", { length: 36 }).references(() => organizations.id).notNull(),
  role: text("role").notNull(),
  widgetId: text("widget_id").notNull(),
  displayOrder: int("display_order").notNull(),
  colSpan: int("col_span").default(1).notNull(),
  rowSpan: int("row_span").default(1).notNull(),
  isEnabled: boolean("is_enabled").default(true).notNull(),
  refreshIntervalSeconds: int("refresh_interval_seconds").default(60),
  customConfig: json("custom_config").default({}),
  updatedBy: varchar("updated_by", { length: 36 }).references(() => users.id),
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 13. AUTOMATED CLINICAL REFERRALS
// ==========================================
export const referrals = mysqlTable("referrals", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  organizationId: varchar("organization_id", { length: 36 }).references(() => organizations.id).notNull(),
  patientId: varchar("patient_id", { length: 36 }).references(() => patients.id).notNull(),
  encounterId: varchar("encounter_id", { length: 36 }),
  carePlanId: varchar("care_plan_id", { length: 36 }),
  type: text("type", { enum: ["internal", "external", "self"] }).default("internal").notNull(),
  source: text("source", { enum: ["manual", "ai", "patient"] }).default("manual").notNull(),
  referringUserId: varchar("referring_user_id", { length: 36 }).references(() => users.id).notNull(),
  referringRole: text("referring_role").notNull(),
  receivingRole: text("receiving_role").notNull(),
  receivingUserId: varchar("receiving_user_id", { length: 36 }).references(() => users.id),
  targetType: text("target_type", { enum: ["professional", "department", "facility", "external_provider"] }).default("professional").notNull(),
  targetId: text("target_id"),
  externalProviderId: varchar("external_provider_id", { length: 36 }),
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
  attachedDataRefs: json("attached_data_refs").default([]),
  dueBy: datetime("due_by"),
  acceptedAt: datetime("accepted_at"),
  completedAt: datetime("completed_at"),
  responseNotes: text("response_notes"),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()).notNull(),
});

export const referralLogs = mysqlTable("referral_logs", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  referralId: varchar("referral_id", { length: 36 }).references(() => referrals.id, { onDelete: "cascade" }).notNull(),
  action: text("action").notNull(),
  fromStatus: text("from_status"),
  toStatus: text("to_status").notNull(),
  performedBy: varchar("performed_by", { length: 36 }).references(() => users.id).notNull(),
  performerRole: text("performer_role").notNull(),
  notes: text("notes"),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

export const externalProviders = mysqlTable("external_providers", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  organizationId: varchar("organization_id", { length: 36 }).references(() => organizations.id).notNull(),
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
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 14. REAL-TIME NOTIFICATIONS
// ==========================================
export const notifications = mysqlTable("notifications", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  organizationId: varchar("organization_id", { length: 36 }).references(() => organizations.id).notNull(),
  userId: varchar("user_id", { length: 36 }).references(() => users.id),
  recipientUserId: varchar("recipient_user_id", { length: 36 }).references(() => users.id),
  senderUserId: varchar("sender_user_id", { length: 36 }).references(() => users.id),
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
  metadata: json("metadata").default({}),
  readAt: datetime("read_at"),
  expiresAt: datetime("expires_at"),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

export const notificationPrivileges = mysqlTable("notification_privileges", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  role: varchar("role", { length: 64 }).notNull(),
  category: varchar("category", { length: 64 }).notNull(), // 'appointments' | 'orders' | 'billing' | 'clinical_alerts' | 'auth_shifts' | 'system'
  isEnabled: boolean("is_enabled").default(true).notNull(),
  channels: json("channels").default({ inApp: true, telegram: true }).notNull(),
  updatedBy: varchar("updated_by", { length: 36 }).references(() => users.id),
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()).notNull(),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
}, (table) => ({
  roleCategoryUnique: unique("notification_privileges_role_category_unique").on(table.role, table.category),
}));

// ==========================================
// 15. PATIENT SELF-REGISTRATION & PORTAL
// ==========================================
export const patientRegistrations = mysqlTable("patient_registrations", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  organizationId: varchar("organization_id", { length: 36 }).references(() => organizations.id).notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  status: text("status", { enum: ["invited", "started", "submitted", "verified", "active", "rejected"] }).default("started").notNull(),
  verificationToken: text("verification_token"),
  verificationExpiresAt: datetime("verification_expires_at"),
  submittedData: json("submitted_data").default({}).notNull(),
  duplicatePatientId: varchar("duplicate_patient_id", { length: 36 }).references(() => patients.id),
  invitedByUserId: varchar("invited_by_user_id", { length: 36 }).references(() => users.id),
  activatedPatientId: varchar("activated_patient_id", { length: 36 }).references(() => patients.id),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()).notNull(),
});

export const patientConsents = mysqlTable("patient_consents", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  organizationId: varchar("organization_id", { length: 36 }).references(() => organizations.id).notNull(),
  patientId: varchar("patient_id", { length: 36 }).references(() => patients.id, { onDelete: "cascade" }).notNull(),
  consentType: text("consent_type").notNull(), // treatment, ai_processing, data_sharing, research, specialist_access
  isGranted: boolean("is_granted").default(true).notNull(),
  version: text("version").default("1.0").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  signatureUrl: text("signature_url"),
  grantedAt: datetime("granted_at").$defaultFn(() => new Date()).notNull(),
  revokedAt: datetime("revoked_at"),
});

export const patientMessages = mysqlTable("patient_messages", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  organizationId: varchar("organization_id", { length: 36 }).references(() => organizations.id).notNull(),
  patientId: varchar("patient_id", { length: 36 }).references(() => patients.id, { onDelete: "cascade" }).notNull(),
  senderId: varchar("sender_id", { length: 36 }).notNull(), // can be user or patient
  senderType: text("sender_type", { enum: ["patient", "clinician", "system"] }).notNull(),
  recipientId: varchar("recipient_id", { length: 36 }).notNull(),
  recipientType: text("recipient_type", { enum: ["patient", "clinician"] }).notNull(),
  subject: text("subject"),
  body: text("body").notNull(),
  attachments: json("attachments").default([]),
  isRead: boolean("is_read").default(false).notNull(),
  readAt: datetime("read_at"),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

export const patientQuestionnaires = mysqlTable("patient_questionnaires", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  organizationId: varchar("organization_id", { length: 36 }).references(() => organizations.id).notNull(),
  patientId: varchar("patient_id", { length: 36 }).references(() => patients.id, { onDelete: "cascade" }).notNull(),
  questionnaireType: text("questionnaire_type").notNull(), // phq9, gad7, sdoh, pre_visit
  title: text("title").notNull(),
  responses: json("responses").default({}).notNull(),
  totalScore: int("total_score"),
  riskCategory: text("risk_category"),
  completedAt: datetime("completed_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 16. ADMIN WORKFLOW TEMPLATES & AUTOMATION RULES
// ==========================================
export const workflowTemplates = mysqlTable("workflow_templates", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  organizationId: varchar("organization_id", { length: 36 }).references(() => organizations.id).notNull(),
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
  steps: json("steps").default([]).notNull(),
  version: int("version").default(1).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: varchar("created_by", { length: 36 }).references(() => users.id),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()).notNull(),
});

export const automationRules = mysqlTable("automation_rules", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  organizationId: varchar("organization_id", { length: 36 }).references(() => organizations.id).notNull(),
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
  condition: json("condition").notNull(), // e.g. { metric: "hba1c", operator: ">", threshold: 9.0 }
  action: json("action").notNull(), // e.g. { type: "suggest_referral", targetRole: "dietitian", reason: "Elevated HbA1c" }
  priority: int("priority").default(1).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  escalationTimeoutMinutes: int("escalation_timeout_minutes").default(1440),
  createdBy: varchar("created_by", { length: 36 }).references(() => users.id),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()).notNull(),
});

export const configAuditLogs = mysqlTable("config_audit_logs", {
  id: serial("id").primaryKey(),
  organizationId: varchar("organization_id", { length: 36 }).references(() => organizations.id).notNull(),
  adminId: varchar("admin_id", { length: 36 }).references(() => users.id).notNull(),
  adminName: text("admin_name").notNull(),
  entityType: text("entity_type").notNull(), // workflow_template, automation_rule, external_provider, registration_config
  entityId: text("entity_id").notNull(),
  action: text("action").notNull(), // create, update, delete, activate, deactivate
  oldValue: json("old_value"),
  newValue: json("new_value"),
  reason: text("reason"),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 17. SUBSCRIPTION PLANS & PRICING
// ==========================================
export const subscriptionPlans = mysqlTable("subscription_plans", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  type: text("type", { enum: ["individual", "family", "company"] }).notNull(),
  billingCycle: text("billing_cycle", { enum: ["monthly", "quarterly", "yearly"] }).notNull(),
  basePrice: decimal("base_price", { precision: 12, scale: 4 }).notNull(),
  currency: text("currency").default("ETB").notNull(),
  maxMembers: int("max_members"), // null = unlimited (for corporate custom)
  additionalMemberPrice: decimal("additional_member_price", { precision: 12, scale: 4 }).default("0"),
  includedServices: json("included_services").default({
    consultations: 0,
    labTests: 0,
    discountPercent: 0,
    coveredCategories: [],
  }).notNull(),
  trialPeriodDays: int("trial_period_days").default(0),
  isActive: boolean("is_active").default(true).notNull(),
  version: int("version").default(1).notNull(),
  metadata: json("metadata").default({}),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 18. FAMILY GROUPS (B2C ENTITIES)
// ==========================================
export const familyGroups = mysqlTable("family_groups", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  primaryPatientId: varchar("primary_patient_id", { length: 36 }).references(() => patients.id, { onDelete: "restrict" }).notNull(),
  name: text("name").notNull(), // e.g. "The Abebe Family"
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()).notNull(),
});

export const familyMembers = mysqlTable("family_members", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  familyGroupId: varchar("family_group_id", { length: 36 }).references(() => familyGroups.id, { onDelete: "cascade" }).notNull(),
  patientId: varchar("patient_id", { length: 36 }).references(() => patients.id, { onDelete: "cascade" }).notNull(),
  relationship: text("relationship", { enum: ["primary", "spouse", "child", "parent", "other"] }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  canViewSharedBilling: boolean("can_view_shared_billing").default(false).notNull(),
  addedAt: datetime("added_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 19. CORPORATE CLIENTS / COMPANIES (B2B ENTITIES)
// ==========================================
export const companies = mysqlTable("companies", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
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
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()).notNull(),
});

export const companyAdmins = mysqlTable("company_admins", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  companyId: varchar("company_id", { length: 36 }).references(() => companies.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id", { length: 36 }).references(() => users.id, { onDelete: "cascade" }).notNull(),
  role: text("role", { enum: ["owner", "hr_manager", "finance_viewer"] }).default("hr_manager").notNull(),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

export const companyEmployeeInvitations = mysqlTable("company_employee_invitations", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  companyId: varchar("company_id", { length: 36 }).references(() => companies.id, { onDelete: "cascade" }).notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  employeeIdNumber: text("employee_id_number"),
  department: text("department"),
  status: text("status", { enum: ["pending", "accepted", "expired", "revoked"] }).default("pending").notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: datetime("expires_at").notNull(),
  claimedPatientId: varchar("claimed_patient_id", { length: 36 }).references(() => patients.id),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 20. ACTIVE SUBSCRIPTIONS & SEATS
// ==========================================
export const subscriptions = mysqlTable("subscriptions", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  planId: varchar("plan_id", { length: 36 }).references(() => subscriptionPlans.id).notNull(),
  subscriberType: text("subscriber_type", { enum: ["individual", "family", "company"] }).notNull(),
  familyGroupId: varchar("family_group_id", { length: 36 }).references(() => familyGroups.id),
  companyId: varchar("company_id", { length: 36 }).references(() => companies.id),
  patientId: varchar("patient_id", { length: 36 }).references(() => patients.id),
  seatCount: int("seat_count").default(1).notNull(),
  status: text("status", {
    enum: ["active", "past_due", "cancelled", "expired", "trial", "paused"],
  }).default("active").notNull(),
  currentPeriodStart: datetime("current_period_start").notNull(),
  currentPeriodEnd: datetime("current_period_end").notNull(),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(),
  cancelledAt: datetime("cancelled_at"),
  trialEndsAt: datetime("trial_ends_at"),
  pausedAt: datetime("paused_at"),
  metadata: json("metadata").default({}),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()).notNull(),
});

export const subscriptionMembers = mysqlTable("subscription_members", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  subscriptionId: varchar("subscription_id", { length: 36 }).references(() => subscriptions.id, { onDelete: "cascade" }).notNull(),
  patientId: varchar("patient_id", { length: 36 }).references(() => patients.id, { onDelete: "cascade" }).notNull(),
  role: text("role", { enum: ["primary", "dependent", "employee"] }).default("employee").notNull(),
  department: text("department"),
  employeeIdNumber: text("employee_id_number"),
  isActive: boolean("is_active").default(true).notNull(),
  addedAt: datetime("added_at").$defaultFn(() => new Date()).notNull(),
  removedAt: datetime("removed_at"),
});

// ==========================================
// 21. USAGE TRACKING & BENEFIT LEDGER
// ==========================================
export const subscriptionUsage = mysqlTable("subscription_usage", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  subscriptionId: varchar("subscription_id", { length: 36 }).references(() => subscriptions.id, { onDelete: "cascade" }).notNull(),
  patientId: varchar("patient_id", { length: 36 }).references(() => patients.id).notNull(),
  serviceType: text("service_type", {
    enum: ["consultation", "lab_test", "medication", "procedure", "telehealth", "physiotherapy"],
  }).notNull(),
  serviceId: varchar("service_id", { length: 36 }),
  quantity: int("quantity").default(1).notNull(),
  nominalPrice: decimal("nominal_price", { precision: 12, scale: 4 }).notNull(),
  coveredAmount: decimal("covered_amount", { precision: 12, scale: 4 }).notNull(),
  patientCopayAmount: decimal("patient_copay_amount", { precision: 12, scale: 4 }).default("0").notNull(),
  billingPeriodStart: datetime("billing_period_start").notNull(),
  billingPeriodEnd: datetime("billing_period_end").notNull(),
  consumedAt: datetime("consumed_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 22. SUBSCRIPTION INVOICES & PAYMENTS
// ==========================================
export const subscriptionInvoices = mysqlTable("subscription_invoices", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  subscriptionId: varchar("subscription_id", { length: 36 }).references(() => subscriptions.id, { onDelete: "cascade" }).notNull(),
  invoiceNumber: varchar("invoice_number", { length: 255 }).notNull().unique(),
  periodStart: datetime("period_start").notNull(),
  periodEnd: datetime("period_end").notNull(),
  baseAmount: decimal("base_amount", { precision: 12, scale: 4 }).notNull(),
  additionalSeatsAmount: decimal("additional_seats_amount", { precision: 12, scale: 4 }).default("0").notNull(),
  discountAmount: decimal("discount_amount", { precision: 12, scale: 4 }).default("0").notNull(),
  taxAmount: decimal("tax_amount", { precision: 12, scale: 4 }).default("0").notNull(),
  totalAmount: decimal("total_amount", { precision: 12, scale: 4 }).notNull(),
  currency: text("currency").default("ETB").notNull(),
  status: text("status", { enum: ["draft", "open", "paid", "void", "uncollectible", "past_due"] }).default("open").notNull(),
  paymentMethod: text("payment_method", { enum: ["telebirr", "chapa", "bank_transfer", "cash"] }),
  paymentReference: text("payment_reference"),
  gatewayTransactionId: text("gateway_transaction_id"),
  dueDate: datetime("due_date").notNull(),
  paidAt: datetime("paid_at"),
  pdfUrl: text("pdf_url"),
  dunningAttempts: int("dunning_attempts").default(0).notNull(),
  lastDunningAt: datetime("last_dunning_at"),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 23. AI PATIENT EDUCATION & CONSULTATION VIDEOS
// ==========================================
export const patientEducationVideos = mysqlTable("patient_education_videos", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  patientId: varchar("patient_id", { length: 36 }).references(() => patients.id, { onDelete: "cascade" }).notNull(),
  encounterId: varchar("encounter_id", { length: 36 }).references(() => encounters.id),
  title: text("title").notNull(),
  conditionName: text("condition_name").notNull(),
  script: text("script").notNull(),
  language: text("language").default("en").notNull(), // en, am, om, ti, so
  videoType: text("video_type", { enum: ["condition_explainer", "medication_counseling", "lifestyle_guide", "post_op_care"] }).default("condition_explainer").notNull(),
  videoUrl: text("video_url"),
  thumbnailUrl: text("thumbnail_url"),
  durationSeconds: int("duration_seconds").default(60),
  animationConfig: json("animation_config").default({}),
  status: text("status", { enum: ["draft", "generating", "ready", "failed"] }).default("draft").notNull(),
  generatedBy: varchar("generated_by", { length: 36 }).references(() => users.id),
  reviewedBy: varchar("reviewed_by", { length: 36 }).references(() => users.id),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 24. MEDICATION EDUCATION & INTERACTION KNOWLEDGE
// ==========================================
export const medicationEducation = mysqlTable("medication_education", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  medicationId: varchar("medication_id", { length: 36 }).references(() => medications.id, { onDelete: "cascade" }).notNull(),
  patientId: varchar("patient_id", { length: 36 }).references(() => patients.id, { onDelete: "cascade" }).notNull(),
  plainLanguageSummary: text("plain_language_summary").notNull(),
  dosageInstructions: text("dosage_instructions").notNull(),
  sideEffects: json("side_effects").default({
    common: [],
    serious: [],
    rare: [],
  }).notNull(),
  interactions: json("interactions").default({
    drugs: [],
    foods: [],
    conditions: [],
    pharmacogenomics: [],
  }).notNull(),
  lifestyleAdvice: json("lifestyle_advice").default([]),
  videoId: varchar("video_id", { length: 36 }).references(() => patientEducationVideos.id),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 25. CURATED VIDEO RECOMMENDATIONS (YOUTUBE / TIKTOK)
// ==========================================
export const videoRecommendations = mysqlTable("video_recommendations", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  platform: text("platform", { enum: ["youtube", "tiktok", "vimeo", "custom"] }).notNull(),
  videoUrl: text("video_url").notNull(),
  embedId: text("embed_id").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  durationSeconds: int("duration_seconds"),
  category: text("category", { enum: ["condition", "medication", "lifestyle", "nutrition", "exercise", "procedure"] }).notNull(),
  relatedIcd10: json("related_icd10").default([]),
  relatedMedications: json("related_medications").default([]),
  language: text("language").default("en").notNull(),
  sourceChannel: text("source_channel"),
  isVerifiedMedicalSource: boolean("is_verified_medical_source").default(true).notNull(),
  isApproved: boolean("is_approved").default(true).notNull(),
  approvedBy: varchar("approved_by", { length: 36 }).references(() => users.id),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

export const patientVideoRecommendations = mysqlTable("patient_video_recommendations", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  patientId: varchar("patient_id", { length: 36 }).references(() => patients.id, { onDelete: "cascade" }).notNull(),
  videoRecommendationId: varchar("video_recommendation_id", { length: 36 }).references(() => videoRecommendations.id, { onDelete: "cascade" }).notNull(),
  encounterId: varchar("encounter_id", { length: 36 }).references(() => encounters.id),
  recommendedBy: varchar("recommended_by", { length: 36 }).references(() => users.id),
  relevanceScore: decimal("relevance_score", { precision: 12, scale: 4 }).default("1.0"),
  status: text("status", { enum: ["recommended", "viewed", "bookmarked", "completed"] }).default("recommended").notNull(),
  patientRating: int("patient_rating"),
  feedbackNotes: text("feedback_notes"),
  recommendedAt: datetime("recommended_at").$defaultFn(() => new Date()).notNull(),
  viewedAt: datetime("viewed_at"),
});

// ==========================================
// 26. ENHANCED TELEMEDICINE SESSIONS
// ==========================================
export const telemedicineSessions = mysqlTable("telemedicine_sessions", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  encounterId: varchar("encounter_id", { length: 36 }).references(() => encounters.id, { onDelete: "cascade" }).notNull(),
  patientId: varchar("patient_id", { length: 36 }).references(() => patients.id, { onDelete: "cascade" }).notNull(),
  doctorId: varchar("doctor_id", { length: 36 }).references(() => users.id).notNull(),
  platform: text("platform", { enum: ["livekit", "twilio", "agora", "in_app"] }).default("livekit").notNull(),
  roomId: varchar("room_id", { length: 255 }).notNull().unique(),
  status: text("status", { enum: ["scheduled", "waiting", "in_progress", "completed", "cancelled", "no_show"] }).default("scheduled").notNull(),
  recordingUrl: text("recording_url"),
  transcriptText: text("transcript_text"),
  aiLiveSuggestions: json("ai_live_suggestions").default([]),
  aiConsultationSummary: json("ai_consultation_summary").default({}),
  remoteDeviceReadings: json("remote_device_readings").default([]),
  startedAt: datetime("started_at"),
  endedAt: datetime("ended_at"),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 27. MOBILE CLINIC & COMMUNITY OUTREACH SESSIONS
// ==========================================
export const mobileClinicSessions = mysqlTable("mobile_clinic_sessions", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  locationName: text("location_name").notNull(),
  gpsLatitude: decimal("gps_latitude", { precision: 12, scale: 4 }),
  gpsLongitude: decimal("gps_longitude", { precision: 12, scale: 4 }),
  scheduledDate: date("scheduled_date", { mode: "string" }).notNull(),
  startTime: datetime("start_time"),
  endTime: datetime("end_time"),
  services: json("services").default(["consultation", "point_of_care_lab", "pharmacy_dispensation"]).notNull(),
  assignedStaff: json("assigned_staff").default([]),
  inventoryKit: json("inventory_kit").default({}),
  status: text("status", { enum: ["planned", "en_route", "in_progress", "completed", "cancelled"] }).default("planned").notNull(),
  patientsRegisteredCount: int("patients_registered_count").default(0).notNull(),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()).notNull(),
});

export const mobileClinicEncounters = mysqlTable("mobile_clinic_encounters", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id),
  sessionId: varchar("session_id", { length: 36 }).references(() => mobileClinicSessions.id, { onDelete: "cascade" }).notNull(),
  encounterId: varchar("encounter_id", { length: 36 }).references(() => encounters.id, { onDelete: "cascade" }),
  patientId: varchar("patient_id", { length: 36 }).references(() => patients.id),
  isOfflineCreated: boolean("is_offline_created").default(true).notNull(),
  offlineSyncId: varchar("offline_sync_id", { length: 255 }).unique(),
  chiefComplaint: text("chief_complaint"),
  clinicalNotes: text("clinical_notes"),
  vitals: json("vitals").default({}),
  pocLabResults: json("poc_lab_results").default([]),
  dispensedMedications: json("dispensed_medications").default([]),
  clientTimestamp: datetime("client_timestamp"),
  syncedAt: datetime("synced_at").$defaultFn(() => new Date()),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 28. ADVANCED AI ORCHESTRATION & CONTINUOUS LEARNING
// ==========================================
export const aiModels = mysqlTable("ai_models", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  name: text("name").notNull(),
  version: text("version").notNull(),
  type: text("type", { enum: ["llm", "ml", "rule_based", "ensemble"] }).notNull(),
  purpose: text("purpose").notNull(),
  performance: json("performance").default({}),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

export const modelFeedback = mysqlTable("model_feedback", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  modelId: varchar("model_id", { length: 36 }).references(() => aiModels.id),
  suggestionId: varchar("suggestion_id", { length: 36 }),
  clinicianId: varchar("clinician_id", { length: 36 }).references(() => users.id).notNull(),
  action: text("action", { enum: ["accepted", "modified", "rejected"] }).notNull(),
  agentName: text("agent_name"),
  originalOutput: json("original_output"),
  clinicianModification: json("clinician_modification"),
  notes: text("notes"),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 29. PROACTIVE HEALTH INSIGHTS
// ==========================================
export const healthInsights = mysqlTable("health_insights", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  patientId: varchar("patient_id", { length: 36 }).references(() => patients.id, { onDelete: "cascade" }).notNull(),
  type: text("type", { enum: ["risk", "trend", "care_gap", "adherence", "drug_safety"] }).notNull(),
  severity: text("severity", { enum: ["info", "warning", "critical"] }).default("info").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  suggestedAction: text("suggested_action"),
  actionType: text("action_type", { enum: ["order_lab", "adjust_medication", "schedule_visit", "lifestyle_nudge", "care_manager_outreach"] }),
  status: text("status", { enum: ["new", "viewed", "acted_upon", "dismissed"] }).default("new").notNull(),
  metadata: json("metadata").default({}),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
  actedAt: datetime("acted_at"),
});

// ==========================================
// 30. PREDICTIVE RISK SCORES & EARLY WARNING
// ==========================================
export const riskScores = mysqlTable("risk_scores", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  patientId: varchar("patient_id", { length: 36 }).references(() => patients.id, { onDelete: "cascade" }).notNull(),
  riskType: text("risk_type", {
    enum: ["ascvd_10yr", "diabetes_type2", "ckd_progression", "readmission_30d", "readmission_90d", "news2_early_warning", "mental_health_decompensation"]
  }).notNull(),
  score: decimal("score", { precision: 12, scale: 4 }).notNull(),
  category: text("category", { enum: ["low", "borderline", "intermediate", "high", "critical"] }).notNull(),
  factors: json("factors").default({}).notNull(),
  calculatedAt: datetime("calculated_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 31. BLOCKCHAIN AUDIT TRAIL & ANCHORS
// ==========================================
export const blockchainAnchors = mysqlTable("blockchain_anchors", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  batchStartAt: datetime("batch_start_at").notNull(),
  batchEndAt: datetime("batch_end_at").notNull(),
  logCount: int("log_count").notNull(),
  merkleRootHash: text("merkle_root_hash").notNull(),
  previousBlockHash: text("previous_block_hash").notNull(),
  blockHash: text("block_hash").notNull(),
  transactionHash: text("transaction_hash").notNull(),
  network: text("network").default("private_hyperledger_simulated").notNull(),
  anchoredAt: datetime("anchored_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 32. PATIENT DATA OWNERSHIP & SMART CONSENTS
// ==========================================
export const smartConsents = mysqlTable("smart_consents", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  patientId: varchar("patient_id", { length: 36 }).references(() => patients.id, { onDelete: "cascade" }).notNull(),
  consentType: text("consent_type", { enum: ["clinical_care", "research_genomics", "third_party_telehealth", "hie_data_exchange", "ai_model_training"] }).notNull(),
  status: text("status", { enum: ["granted", "revoked", "expired", "pending"] }).default("granted").notNull(),
  allowedDepartments: json("allowed_departments").default([]),
  permittedDataTypes: json("permitted_data_types").default(["vitals", "labs", "medications", "imaging", "notes"]).notNull(),
  validUntil: datetime("valid_until"),
  digitalSignature: text("digital_signature").notNull(),
  revokedAt: datetime("revoked_at"),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 33. REVENUE CYCLE MANAGEMENT & CLAIMS
// ==========================================
export const billingClaims = mysqlTable("billing_claims", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  patientId: varchar("patient_id", { length: 36 }).references(() => patients.id).notNull(),
  encounterId: varchar("encounter_id", { length: 36 }).references(() => encounters.id).notNull(),
  claimNumber: varchar("claim_number", { length: 255 }).notNull().unique(),
  payerName: text("payer_name").notNull(),
  payerType: text("payer_type", { enum: ["insurance", "corporate", "government", "self_pay"] }).notNull(),
  totalAmount: decimal("total_amount", { precision: 12, scale: 4 }).notNull(),
  status: text("status", { enum: ["draft", "validated", "submitted", "adjudicated", "paid", "denied", "appealed"] }).default("draft").notNull(),
  diagnosisCodes: json("diagnosis_codes").default([]).notNull(), // ICD-10
  procedureCodes: json("procedure_codes").default([]).notNull(), // CPT/HCPCS
  aiDenialRiskScore: decimal("ai_denial_risk_score", { precision: 12, scale: 4 }).default("0.0"), // 0.0 - 1.0
  aiDenialRiskFactors: json("ai_denial_risk_factors").default([]),
  submissionDate: datetime("submission_date"),
  adjudicationDate: datetime("adjudication_date"),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 34. ZERO TRUST SECURITY THREAT LOGS
// ==========================================
export const securityThreatLogs = mysqlTable("security_threat_logs", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  userId: varchar("user_id", { length: 36 }).references(() => users.id),
  threatType: text("threat_type", { enum: ["anomalous_record_access", "bulk_phi_exfiltration", "after_hours_login", "geo_velocity_anomaly", "privilege_escalation_attempt"] }).notNull(),
  severity: text("severity", { enum: ["low", "medium", "high", "critical"] }).notNull(),
  description: text("description").notNull(),
  metadata: json("metadata").default({}),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  isMitigated: boolean("is_mitigated").default(false).notNull(),
  detectedAt: datetime("detected_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 35. ENHANCED CENTRAL STATE MACHINE & SAGAS
// ==========================================

export const encounterStates = mysqlTable("encounter_states", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  encounterId: varchar("encounter_id", { length: 36 }).references(() => encounters.id, { onDelete: "cascade" }).notNull(),
  workflow: text("workflow").notNull(), // 'clinical', 'lab', 'pharmacy', 'payment', 'referral', 'nutrition', 'genetics', 'imaging', 'psychological', 'social_work', 'therapy', 'respiratory'
  state: text("state").notNull(),
  enteredAt: datetime("entered_at").$defaultFn(() => new Date()).notNull(),
  exitedAt: datetime("exited_at"),
  isActive: boolean("is_active").default(true).notNull(),
  metadata: json("metadata").default({}),
});

export const encounterEvents = mysqlTable("encounter_events", {
  id: serial("id").primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  encounterId: varchar("encounter_id", { length: 36 }).references(() => encounters.id, { onDelete: "cascade" }).notNull(),
  eventName: text("event_name").notNull(),
  payload: json("payload").default({}).notNull(),
  occurredAt: datetime("occurred_at").$defaultFn(() => new Date()).notNull(),
  actorId: varchar("actor_id", { length: 36 }).references(() => users.id),
  actorRole: text("actor_role"),
  correlationId: text("correlation_id"),
});

export const stateSlas = mysqlTable("state_slas", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  workflow: text("workflow").notNull(),
  state: text("state").notNull(),
  maxDurationSeconds: int("max_duration_seconds").notNull(),
  escalationAction: text("escalation_action", { enum: ["notify_supervisor", "notify_manager", "auto_transition", "flag_critical"] }).default("notify_supervisor").notNull(),
  escalationTargetRole: text("escalation_target_role"),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

export const stateSlaViolations = mysqlTable("state_sla_violations", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  encounterId: varchar("encounter_id", { length: 36 }).references(() => encounters.id, { onDelete: "cascade" }).notNull(),
  workflow: text("workflow").notNull(),
  state: text("state").notNull(),
  maxDurationSeconds: int("max_duration_seconds").notNull(),
  actualDurationSeconds: int("actual_duration_seconds").notNull(),
  escalatedTo: varchar("escalated_to", { length: 36 }).references(() => users.id),
  resolvedAt: datetime("resolved_at"),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

export const sagaTransactions = mysqlTable("saga_transactions", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  encounterId: varchar("encounter_id", { length: 36 }).references(() => encounters.id, { onDelete: "cascade" }).notNull(),
  sagaType: text("saga_type").notNull(), // 'lab_order_payment_saga', 'pharmacy_payment_dispense_saga'
  status: text("status", { enum: ["in_progress", "completed", "compensated", "failed"] }).default("in_progress").notNull(),
  steps: json("steps").default([]).notNull(),
  errorDetails: text("error_details"),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()).notNull(),
});

export const workflowStateHistory = mysqlTable("workflow_state_history", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  encounterId: varchar("encounter_id", { length: 36 }).references(() => encounters.id, { onDelete: "cascade" }).notNull(),
  workflow: text("workflow").notNull(),
  state: text("state").notNull(),
  enteredAt: datetime("entered_at").$defaultFn(() => new Date()).notNull(),
  exitedAt: datetime("exited_at"),
  durationSeconds: int("duration_seconds"),
  enteredBy: varchar("entered_by", { length: 36 }).references(() => users.id),
  exitReason: text("exit_reason"),
  metadata: json("metadata").default({}),
});

// ==========================================
// 36. PHARMACY INVENTORY & BATCH MANAGEMENT
// ==========================================
export const suppliers = mysqlTable("suppliers", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  contactPerson: text("contact_person"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  leadTimeDays: int("lead_time_days").default(3),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

export const drugCatalog = mysqlTable("drug_catalog", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  genericName: text("generic_name").notNull(),
  brandName: text("brand_name"),
  strength: text("strength").notNull(),
  dosageForm: text("dosage_form").notNull(),
  route: text("route").default("oral").notNull(),
  atcCode: text("atc_code"),
  barcode: text("barcode"),
  packageSize: text("package_size").default("30 tablets"),
  reorderLevel: int("reorder_level").default(50).notNull(),
  maxStock: int("max_stock").default(500).notNull(),
  defaultUnitCost: decimal("default_unit_cost", { precision: 12, scale: 4 }).default("10.00").notNull(),
  defaultSellingPrice: decimal("default_selling_price", { precision: 12, scale: 4 }).default("15.00").notNull(),
  itemCode: varchar("item_code", { length: 100 }),
  category: text("category"),
  sectionNumber: int("section_number"),
  sectionName: text("section_name"),
  isControlled: boolean("is_controlled").default(false).notNull(),
  rxOtc: text("rx_otc").default("Rx").notNull(),
  storageCondition: text("storage_condition", { enum: ["ambient", "refrigerated", "frozen", "controlled"] }).default("ambient").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()).notNull(),
}, (table) => ({
  tenantItemUnique: unique("idx_drug_catalog_tenant_item_code").on(table.tenantId, table.itemCode),
}));

export const clinicalCatalogProtocols = mysqlTable("clinical_catalog_protocols", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  kind: text("kind", { enum: ["protocol", "formulary"] }).notNull(),
  departmentId: varchar("department_id", { length: 100 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  indication: text("indication").notNull(),
  items: json("items").default([]).notNull(),
  metadata: json("metadata").default({}).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: varchar("created_by", { length: 36 }).references(() => users.id),
  updatedBy: varchar("updated_by", { length: 36 }).references(() => users.id),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()).notNull(),
}, (table) => ({
  tenantDeptNameUnique: unique("idx_clinical_catalog_protocols_tenant_name").on(table.tenantId, table.departmentId, table.name),
}));

export const drugBatches = mysqlTable("drug_batches", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  drugId: varchar("drug_id", { length: 36 }).references(() => drugCatalog.id, { onDelete: "cascade" }).notNull(),
  supplierId: varchar("supplier_id", { length: 36 }).references(() => suppliers.id),
  batchNumber: text("batch_number").notNull(),
  expiryDate: date("expiry_date", { mode: "string" }).notNull(),
  receivedDate: date("received_date", { mode: "string" }).notNull(),
  quantityReceived: int("quantity_received").notNull(),
  quantityRemaining: int("quantity_remaining").notNull(),
  costPerUnit: decimal("cost_per_unit", { precision: 12, scale: 4 }).notNull(),
  sellingPrice: decimal("selling_price", { precision: 12, scale: 4 }).notNull(),
  locationBin: text("location_bin").default("Shelf A-1"),
  status: text("status", { enum: ["active", "near_expiry", "quarantined", "expired", "depleted"] }).default("active").notNull(),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()).notNull(),
});

export const stockMovements = mysqlTable("stock_movements", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  batchId: varchar("batch_id", { length: 36 }).references(() => drugBatches.id, { onDelete: "cascade" }).notNull(),
  movementType: text("movement_type", { enum: ["receive", "dispense", "transfer", "return", "adjustment", "quarantine_disposal"] }).notNull(),
  quantity: int("quantity").notNull(),
  previousQuantity: int("previous_quantity").notNull(),
  newQuantity: int("new_quantity").notNull(),
  referenceType: text("reference_type"),
  referenceId: text("reference_id"),
  performedBy: varchar("performed_by", { length: 36 }).references(() => users.id),
  notes: text("notes"),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

export const purchaseOrders = mysqlTable("purchase_orders", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  supplierId: varchar("supplier_id", { length: 36 }).references(() => suppliers.id).notNull(),
  poNumber: varchar("po_number", { length: 255 }).notNull().unique(),
  status: text("status", { enum: ["draft", "submitted", "approved", "shipped", "received", "cancelled"] }).default("draft").notNull(),
  items: json("items").default([]).notNull(),
  totalAmount: decimal("total_amount", { precision: 12, scale: 4 }).notNull(),
  orderedBy: varchar("ordered_by", { length: 36 }).references(() => users.id),
  orderedAt: datetime("ordered_at").$defaultFn(() => new Date()).notNull(),
  receivedAt: datetime("received_at"),
  notes: text("notes"),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 37. LABORATORY INFORMATION SYSTEM (LIS)
// ==========================================
export const labInstruments = mysqlTable("lab_instruments", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  model: text("model").notNull(),
  analyzerType: text("analyzer_type", { enum: ["hematology", "chemistry", "immunoassay", "urinalysis", "coagulation", "molecular"] }).notNull(),
  connectionType: text("connection_type", { enum: ["astm_e1394", "hl7_oru", "tcp_ip", "serial_rs232", "file_drop"] }).default("hl7_oru").notNull(),
  status: text("status", { enum: ["online", "running_qc", "offline", "maintenance", "error_lockout"] }).default("online").notNull(),
  lastMaintenanceAt: datetime("last_maintenance_at"),
  lastConnectedAt: datetime("last_connected_at").$defaultFn(() => new Date()).notNull(),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

export const labQcRuns = mysqlTable("lab_qc_runs", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  instrumentId: varchar("instrument_id", { length: 36 }).references(() => labInstruments.id, { onDelete: "cascade" }).notNull(),
  analyte: text("analyte").notNull(),
  level: text("level", { enum: ["level_1_low", "level_2_normal", "level_3_high"] }).default("level_2_normal").notNull(),
  measuredValue: decimal("measured_value", { precision: 12, scale: 4 }).notNull(),
  expectedMean: decimal("expected_mean", { precision: 12, scale: 4 }).notNull(),
  standardDeviation: decimal("standard_deviation", { precision: 12, scale: 4 }).notNull(),
  referenceRangeLow: decimal("reference_range_low", { precision: 12, scale: 4 }).notNull(),
  referenceRangeHigh: decimal("reference_range_high", { precision: 12, scale: 4 }).notNull(),
  passed: boolean("passed").default(true).notNull(),
  zScore: decimal("z_score", { precision: 12, scale: 4 }),
  runAt: datetime("run_at").$defaultFn(() => new Date()).notNull(),
  performedBy: varchar("performed_by", { length: 36 }).references(() => users.id),
  notes: text("notes"),
});

export const labTurnaround = mysqlTable("lab_turnaround", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  labOrderId: varchar("lab_order_id", { length: 36 }).references(() => labOrders.id, { onDelete: "cascade" }).notNull(),
  step: text("step", {
    enum: ["order_received", "sample_collected", "sample_received_in_lab", "processing_started", "result_entered", "result_validated", "result_released"]
  }).notNull(),
  timestamp: datetime("timestamp").$defaultFn(() => new Date()).notNull(),
  performedBy: varchar("performed_by", { length: 36 }).references(() => users.id),
});

// ==========================================
// 38. RADIOLOGY INFORMATION SYSTEM (RIS)
// ==========================================
export const imagingTemplates = mysqlTable("imaging_templates", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  modality: text("modality").notNull(),
  bodyPart: text("body_part").notNull(),
  title: text("title").notNull(),
  defaultTechnique: text("default_technique"),
  defaultFindings: text("default_findings"),
  defaultImpression: text("default_impression"),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

export const imagingStudies = mysqlTable("imaging_studies", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  patientId: varchar("patient_id", { length: 36 }).references(() => patients.id, { onDelete: "cascade" }).notNull(),
  encounterId: varchar("encounter_id", { length: 36 }).references(() => encounters.id),
  accessionNumber: varchar("accession_number", { length: 255 }).notNull().unique(),
  modality: text("modality", { enum: ["X-Ray", "CT", "MRI", "Ultrasound", "Mammography", "PET-CT"] }).notNull(),
  bodyPart: text("body_part").notNull(),
  studyUid: text("study_uid").notNull(),
  priority: text("priority", { enum: ["routine", "urgent", "stat"] }).default("routine").notNull(),
  status: text("status", { enum: ["ordered", "scheduled", "arrived", "in_progress", "dictated", "reported", "signed"] }).default("ordered").notNull(),
  isCriticalFinding: boolean("is_critical_finding").default(false).notNull(),
  scheduledAt: datetime("scheduled_at"),
  performedAt: datetime("performed_at"),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

export const imagingReports = mysqlTable("imaging_reports", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  studyId: varchar("study_id", { length: 36 }).references(() => imagingStudies.id, { onDelete: "cascade" }).notNull(),
  templateId: varchar("template_id", { length: 36 }).references(() => imagingTemplates.id),
  technique: text("technique").notNull(),
  findings: text("findings").notNull(),
  impression: text("impression").notNull(),
  recommendations: text("recommendations"),
  dictationRaw: text("dictation_raw"),
  signedBy: varchar("signed_by", { length: 36 }).references(() => users.id),
  signedAt: datetime("signed_at"),
  peerReviewStatus: text("peer_review_status", { enum: ["none", "assigned", "agreed", "minor_revision", "major_discrepancy"] }).default("none").notNull(),
  peerReviewedBy: varchar("peer_reviewed_by", { length: 36 }).references(() => users.id),
  peerReviewedAt: datetime("peer_reviewed_at"),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 39. REMOTE PATIENT MONITORING (RPM) & DEVICES
// ==========================================
export const rpmPrograms = mysqlTable("rpm_programs", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  condition: text("condition").notNull(),
  targetMetrics: json("target_metrics").default([]).notNull(),
  frequencyRequiredDays: int("frequency_required_days").default(1),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

export const devices = mysqlTable("devices", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  patientId: varchar("patient_id", { length: 36 }).references(() => patients.id, { onDelete: "cascade" }),
  deviceType: text("device_type", { enum: ["blood_pressure_cuff", "glucometer", "cgm", "pulse_oximeter", "weight_scale", "ecg_patch", "spirometer"] }).notNull(),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  serialNumber: varchar("serial_number", { length: 255 }).notNull().unique(),
  macAddress: text("mac_address"),
  batteryLevelPercent: int("battery_level_percent").default(100),
  status: text("status", { enum: ["assigned", "active", "syncing", "disconnected", "returned", "maintenance"] }).default("active").notNull(),
  lastSyncedAt: datetime("last_synced_at"),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

export const deviceReadings = mysqlTable("device_readings", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  deviceId: varchar("device_id", { length: 36 }).references(() => devices.id, { onDelete: "cascade" }).notNull(),
  patientId: varchar("patient_id", { length: 36 }).references(() => patients.id, { onDelete: "cascade" }).notNull(),
  metricType: text("metric_type").notNull(),
  numericValue: decimal("numeric_value", { precision: 12, scale: 4 }).notNull(),
  unit: text("unit").notNull(),
  isAnomaly: boolean("is_anomaly").default(false).notNull(),
  anomalySeverity: text("anomaly_severity", { enum: ["normal", "warning", "critical"] }).default("normal"),
  recordedAt: datetime("recorded_at").$defaultFn(() => new Date()).notNull(),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 40. APPOINTMENTS & SCHEDULING
// ==========================================
export const appointments = mysqlTable("appointments", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  patientId: varchar("patient_id", { length: 36 }).references(() => patients.id, { onDelete: "cascade" }).notNull(),
  clinicianId: varchar("clinician_id", { length: 36 }).references(() => users.id),
  facilityId: varchar("facility_id", { length: 36 }).references(() => facilities.id),
  appointmentType: text("appointment_type", { enum: ["in_person", "telehealth", "mobile_clinic", "home_visit", "follow_up"] }).default("in_person").notNull(),
  specialty: text("specialty").default("Internal Medicine").notNull(),
  scheduledDate: date("scheduled_date", { mode: "string" }).notNull(),
  scheduledTime: text("scheduled_time").notNull(),
  durationMinutes: int("duration_minutes").default(30).notNull(),
  queueToken: text("queue_token"),
  status: text("status", { enum: ["scheduled", "confirmed", "checked_in", "in_consultation", "completed", "cancelled", "no_show"] }).default("scheduled").notNull(),
  reason: text("reason").notNull(),
  notes: text("notes"),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 41. INVOICING & PAYMENTS
// ==========================================
export const invoices = mysqlTable("invoices", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).notNull(),
  patientId: varchar("patient_id", { length: 36 }).references(() => patients.id, { onDelete: "cascade" }).notNull(),
  encounterId: varchar("encounter_id", { length: 36 }).references(() => encounters.id),
  invoiceNumber: varchar("invoice_number", { length: 255 }).notNull().unique(),
  lineItems: json("line_items").default([]).notNull(),
  subtotal: decimal("subtotal", { precision: 12, scale: 4 }).notNull(),
  discountAmount: decimal("discount_amount", { precision: 12, scale: 4 }).default("0").notNull(),
  taxAmount: decimal("tax_amount", { precision: 12, scale: 4 }).default("0").notNull(),
  totalAmount: decimal("total_amount", { precision: 12, scale: 4 }).notNull(),
  paidAmount: decimal("paid_amount", { precision: 12, scale: 4 }).default("0").notNull(),
  currency: text("currency").default("ETB").notNull(),
  status: text("status", { enum: ["draft", "issued", "paid", "partially_paid", "cancelled", "refunded", "unpaid", "waived"] }).default("issued").notNull(),
  paymentMethod: text("payment_method"),
  transactionRef: text("transaction_ref"),
  dueDate: date("due_date", { mode: "string" }),
  paidAt: datetime("paid_at"),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()).notNull(),
});

export const payments = mysqlTable("payments", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  invoiceId: varchar("invoice_id", { length: 36 }).references(() => invoices.id, { onDelete: "cascade" }).notNull(),
  patientId: varchar("patient_id", { length: 36 }).references(() => patients.id).notNull(),
  paymentNumber: varchar("payment_number", { length: 255 }).notNull().unique(),
  amount: decimal("amount", { precision: 12, scale: 4 }).notNull(),
  currency: text("currency").default("ETB").notNull(),
  paymentMethod: text("payment_method", { enum: ["telebirr", "chapa", "bank_transfer", "cash", "insurance_copay", "paypal"] }).notNull(),
  transactionReference: text("transaction_reference"),
  receiptNumber: text("receipt_number"),
  status: text("status", { enum: ["pending", "completed", "failed", "refunded"] }).default("completed").notNull(),
  collectedBy: varchar("collected_by", { length: 36 }).references(() => users.id),
  paidAt: datetime("paid_at").$defaultFn(() => new Date()).notNull(),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 42. CUSTOMER & CLINICAL SUPPORT TICKETS
// ==========================================
export const supportTickets = mysqlTable("support_tickets", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  reporterUserId: varchar("reporter_user_id", { length: 36 }).references(() => users.id),
  patientId: varchar("patient_id", { length: 36 }).references(() => patients.id),
  ticketNumber: varchar("ticket_number", { length: 255 }).notNull().unique(),
  category: text("category", { enum: ["it_system", "clinical_cdss", "billing_payment", "pharmacy_dispensing", "telehealth_audio_video", "patient_portal"] }).notNull(),
  priority: text("priority", { enum: ["low", "normal", "high", "critical_urgent"] }).default("normal").notNull(),
  status: text("status", { enum: ["open", "in_progress", "waiting_on_clinician", "resolved", "closed"] }).default("open").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  assignedTo: varchar("assigned_to", { length: 36 }).references(() => users.id),
  resolvedAt: datetime("resolved_at"),
  resolutionSummary: text("resolution_summary"),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()).notNull(),
});

export const supportTicketComments = mysqlTable("support_ticket_comments", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  ticketId: varchar("ticket_id", { length: 36 }).references(() => supportTickets.id, { onDelete: "cascade" }).notNull(),
  authorId: varchar("author_id", { length: 36 }).references(() => users.id).notNull(),
  message: text("message").notNull(),
  isInternalNote: boolean("is_internal_note").default(false).notNull(),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 43. CUSTOM REPORT BUILDER & SAVED TEMPLATES
// ==========================================
export const customReports = mysqlTable("custom_reports", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  category: text("category", { enum: ["financial", "clinical", "operational", "compliance_quality", "population_health"] }).notNull(),
  dataSource: text("data_source").notNull(),
  filters: json("filters").default({}).notNull(),
  groupings: json("groupings").default([]).notNull(),
  selectedColumns: json("selected_columns").default([]).notNull(),
  scheduleCron: text("schedule_cron"),
  lastRunAt: datetime("last_run_at"),
  createdBy: varchar("created_by", { length: 36 }).references(() => users.id),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 44. PATIENT SUBMITTED CASES & AI TRIAGE
// ==========================================
export const cases = mysqlTable("cases", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  caseId: varchar("case_id", { length: 255 }).notNull().unique(),
  caseNumber: text("case_number"),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id),
  patientId: varchar("patient_id", { length: 36 }).references(() => patients.id, { onDelete: "set null" }),
  encounterId: varchar("encounter_id", { length: 36 }).references(() => encounters.id),
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
  assignedProviderId: varchar("assigned_provider_id", { length: 36 }).references(() => users.id),
  chiefComplaint: text("chief_complaint"),
  severity: text("severity", { enum: ["mild", "moderate", "severe", "very_severe"] }).default("moderate").notNull(),
  assignedHandlerId: text("assigned_handler_id"),
  assignedHandlerName: text("assigned_handler_name"),
  assignedRole: text("assigned_role"),
  personal: json("personal").default({}),
  patientInfo: json("patient_info").default({}),
  complaint: json("complaint").default({}),
  complaintDetails: json("complaint_details").default({}),
  history: json("history").default({}),
  medicalHistory: json("medical_history").default({}),
  symptoms: json("symptoms").default({}),
  filesAttached: json("files_attached").default([]),
  aiSummary: text("ai_summary"),
  aiRecommendations: json("ai_recommendations").default({}),
  aiAnalysis: json("ai_analysis").default({}),
  handlerNotes: json("handler_notes").default([]),
  handlerNote: text("handler_note"),
  conferenceNotes: text("conference_notes"),
  timeline: json("timeline").default([]),
  submittedAt: datetime("submitted_at").$defaultFn(() => new Date()).notNull(),
  resolvedAt: datetime("resolved_at"),
  completedAt: datetime("completed_at"),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 45. DYNAMIC PRICING & HEALTHCARE BILLING ENGINE
// ==========================================

// 1. Service Pricing Catalog
export const servicePricingCatalog = mysqlTable("service_pricing_catalog", {
  id: varchar("id", { length: 36 }).$defaultFn(() => randomUUID()).primaryKey(),
  serviceCode: varchar("service_code", { length: 64 }).unique().notNull(), // e.g., 'REGISTRATION_3MO', 'LAB_HBA1C', 'CONSULT_SPECIALIST', 'PHYSIO_SESSION'
  category: varchar("category", { length: 64 }).notNull(), // 'registration' | 'consultation' | 'laboratory' | 'pharmacy' | 'therapy' | 'nursing'
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).default("ETB").notNull(),
  isFree: boolean("is_free").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  validityDays: int("validity_days"), // 90 for registration
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()).notNull(),
});

// 2. Invoice Line Items
export const invoiceItems = mysqlTable("invoice_items", {
  id: varchar("id", { length: 36 }).$defaultFn(() => randomUUID()).primaryKey(),
  invoiceId: varchar("invoice_id", { length: 36 }).references(() => invoices.id, { onDelete: "cascade" }).notNull(),
  serviceCode: varchar("service_code", { length: 64 }).notNull(),
  description: text("description").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  quantity: int("quantity").default(1).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
});

// 3. Patient Registration Validity Tracker (3-Month Renewable Registration)
export const patientRegistrationPasses = mysqlTable("patient_registration_passes", {
  id: varchar("id", { length: 36 }).$defaultFn(() => randomUUID()).primaryKey(),
  patientId: varchar("patient_id", { length: 36 }).references(() => patients.id, { onDelete: "cascade" }).notNull(),
  invoiceId: varchar("invoice_id", { length: 36 }).references(() => invoices.id),
  startsAt: datetime("starts_at").notNull(),
  expiresAt: datetime("expires_at").notNull(), // startsAt + 90 days
  status: varchar("status", { length: 32 }).default("active").notNull(), // 'active' | 'expired' | 'waived'
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

// 4. System Payment Settings & Global Master Switch
export const systemPaymentSettings = mysqlTable("system_payment_settings", {
  id: varchar("id", { length: 36 }).$defaultFn(() => randomUUID()).primaryKey(),
  globalFreeMode: boolean("global_free_mode").default(false).notNull(),
  billingModel: varchar("billing_model", { length: 32 }).default("hybrid").notNull(), // 'unified_encounter_tab' | 'per_order_gate' | 'hybrid'
  defaultDepositAmountEtb: decimal("default_deposit_amount_etb", { precision: 10, scale: 2 }).default("2500.00").notNull(),
  enablePoCQRPayments: boolean("enable_poc_qr_payments").default(true).notNull(),
  allowPharmacyEmergencyBypass: boolean("allow_pharmacy_emergency_bypass").default(true).notNull(),
  softGateLabCollection: boolean("soft_gate_lab_collection").default(true).notNull(),
  softGatePharmacyReview: boolean("soft_gate_pharmacy_review").default(true).notNull(),
  registrationValidityDays: int("registration_validity_days").default(90).notNull(),
  gracePeriodDays: int("grace_period_days").default(7).notNull(),
  allowCashReconciliation: boolean("allow_cash_reconciliation").default(true).notNull(),
  enforceLabPaymentGate: boolean("enforce_lab_payment_gate").default(true).notNull(),
  enforcePharmacyPaymentGate: boolean("enforce_pharmacy_payment_gate").default(true).notNull(),
  autoNotifyLabOnPayment: boolean("auto_notify_lab_on_payment").default(true).notNull(),
  autoNotifyPharmacyOnPayment: boolean("auto_notify_pharmacy_on_payment").default(true).notNull(),
  allowEmergencyOverride: boolean("allow_emergency_override").default(true).notNull(),
  rolePermissions: json("role_permissions").default({
    waiveFees: ["system_admin", "tenant_admin"],
    emergencyOverride: ["system_admin", "tenant_admin", "physician"],
    cashCollection: ["system_admin", "tenant_admin", "pharmacist", "nurse", "cashier"],
  }).notNull(),
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()).notNull(),
});

// 4B. Unified Encounter Tabs (Running Tab & Discharge Reconciliation)
export const encounterTabs = mysqlTable("encounter_tabs", {
  id: varchar("id", { length: 36 }).$defaultFn(() => randomUUID()).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).default("00000000-0000-0000-0000-000000000001").notNull(),
  encounterId: varchar("encounter_id", { length: 36 }).references(() => encounters.id, { onDelete: "cascade" }).notNull(),
  patientId: varchar("patient_id", { length: 36 }).references(() => patients.id, { onDelete: "cascade" }).notNull(),
  status: text("status", { enum: ["active", "settled", "refunded"] }).default("active").notNull(),
  depositAmountEtb: decimal("deposit_amount_etb", { precision: 12, scale: 2 }).default("0.00").notNull(),
  depositMethod: text("deposit_method").default("cash").notNull(), // telebirr, cbe_birr, chapa_card, cash, insurance
  depositTxRef: text("deposit_tx_ref"),
  totalChargesEtb: decimal("total_charges_etb", { precision: 12, scale: 2 }).default("0.00").notNull(),
  balanceDueEtb: decimal("balance_due_etb", { precision: 12, scale: 2 }).default("0.00").notNull(),
  refundDueEtb: decimal("refund_due_etb", { precision: 12, scale: 2 }).default("0.00").notNull(),
  chargesList: json("charges_list").default([]).notNull(),
  settledAt: datetime("settled_at"),
  settledBy: varchar("settled_by", { length: 36 }).references(() => users.id),
  settlementNotes: text("settlement_notes"),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 46. CLINIC LOCATIONS & GEOLOCATION NETWORK
// ==========================================
export const clinicLocations = mysqlTable("clinic_locations", {
  id: varchar("id", { length: 36 }).$defaultFn(() => randomUUID()).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).default("00000000-0000-0000-0000-000000000001"),
  name: text("name").notNull(),
  slug: varchar("slug", { length: 255 }).unique().notNull(),
  branchType: text("branch_type", {
    enum: ["main", "branch", "diagnostic_hub", "pharmacy_clinic", "mobile_unit"],
  }).default("branch").notNull(),
  neighborhood: text("neighborhood").notNull(),
  city: text("city").default("Debre Birhan").notNull(),
  region: text("region").default("Amhara, Ethiopia").notNull(),
  address: text("address").notNull(),
  latitude: decimal("latitude", { precision: 12, scale: 4 }).notNull(),
  longitude: decimal("longitude", { precision: 12, scale: 4 }).notNull(),
  phone: text("phone").notNull(),
  email: text("email").default("info@ninimed.org"),
  hours: text("hours").notNull(),
  services: json("services").default([]).notNull(),
  amenities: json("amenities").default([]).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  isMain: boolean("is_main").default(false).notNull(),
  nextOpenSlot: text("next_open_slot").default("Open Today"),
  googleMapsUrl: text("google_maps_url"),
  osmUrl: text("osm_url"),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 47. AUTHENTICATION, OTP VERIFICATION & SECURITY
// ==========================================
export const authVerificationCodes = mysqlTable("auth_verification_codes", {
  id: varchar("id", { length: 36 }).$defaultFn(() => randomUUID()).primaryKey(),
  identifier: text("identifier").notNull(), // email address or phone number
  channel: text("channel", { enum: ["email", "sms"] }).notNull(),
  codeHash: text("code_hash").notNull(),
  rawCode: text("raw_code"), // sandbox / audit copy
  userId: varchar("user_id", { length: 36 }).references(() => users.id, { onDelete: "cascade" }),
  purpose: text("purpose", { enum: ["account_registration", "login_mfa", "password_reset", "phone_verification"] }).default("account_registration").notNull(),
  status: text("status", { enum: ["pending", "verified", "expired", "max_attempts_exceeded"] }).default("pending").notNull(),
  attempts: int("attempts").default(0).notNull(),
  expiresAt: datetime("expires_at").notNull(),
  verifiedAt: datetime("verified_at"),
  metadata: json("metadata").default({}),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

export const systemAuthSettings = mysqlTable("system_auth_settings", {
  id: varchar("id", { length: 36 }).$defaultFn(() => randomUUID()).primaryKey(),
  requireEmailVerification: boolean("require_email_verification").default(false).notNull(),
  requireSmsVerification: boolean("require_sms_verification").default(false).notNull(),
  enableTwoFactorLogin: boolean("enable_two_factor_login").default(false).notNull(),
  twoFactorTargetRoles: json("two_factor_target_roles").default(["system_admin", "tenant_admin", "physician", "pharmacist"]).notNull(),
  requireNationalIdVerification: boolean("require_national_id_verification").default(true).notNull(),
  allowDemoBypass: boolean("allow_demo_bypass").default(true).notNull(),
  smsGatewayProvider: text("sms_gateway_provider").default("simulator").notNull(),
  otpExpiryMinutes: int("otp_expiry_minutes").default(10).notNull(),
  maxAttempts: int("max_attempts").default(5).notNull(),
  lockoutDurationMinutes: int("lockout_duration_minutes").default(15).notNull(),
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 48. SECURE QR MEDICAL RECORD SHARING & QR CROSS-DEVICE LOGIN
// ==========================================
export const sharedMedicalRecords = mysqlTable("shared_medical_records", {
  id: varchar("id", { length: 36 }).$defaultFn(() => randomUUID()).primaryKey(),
  patientId: varchar("patient_id", { length: 36 }).references(() => patients.id, { onDelete: "cascade" }).notNull(),
  shareToken: varchar("share_token", { length: 255 }).unique().notNull(),
  accessScope: json("access_scope").default(["allergies", "medications", "lab_results", "conditions", "emergency_contacts"]).notNull(),
  passcode: text("passcode"), // Optional 4-digit PIN protection
  doctorName: text("doctor_name"), // Target consulting physician/hospital
  status: text("status", { enum: ["active", "revoked", "expired"] }).default("active").notNull(),
  expiresAt: datetime("expires_at").notNull(),
  viewCount: int("view_count").default(0).notNull(),
  lastViewedAt: datetime("last_viewed_at"),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

// Server-side login sessions. The browser cookie holds a random token; only its
// SHA-256 hash is stored here, so a database leak cannot be replayed as a session.
export const authSessions = mysqlTable("auth_sessions", {
  id: varchar("id", { length: 36 }).$defaultFn(() => randomUUID()).primaryKey(),
  userId: varchar("user_id", { length: 36 }).references(() => users.id, { onDelete: "cascade" }).notNull(),
  tokenHash: varchar("token_hash", { length: 255 }).unique().notNull(),
  expiresAt: datetime("expires_at").notNull(),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
  lastSeenAt: datetime("last_seen_at").$defaultFn(() => new Date()).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
});

export const qrLoginSessions = mysqlTable("qr_login_sessions", {
  id: varchar("id", { length: 36 }).$defaultFn(() => randomUUID()).primaryKey(),
  sessionChallenge: varchar("session_challenge", { length: 255 }).unique().notNull(),
  status: text("status", { enum: ["pending", "authorized", "consumed", "expired"] }).default("pending").notNull(),
  authenticatedUserId: varchar("authenticated_user_id", { length: 36 }).references(() => users.id, { onDelete: "cascade" }),
  deviceInfo: text("device_info"),
  ipAddress: text("ip_address"),
  expiresAt: datetime("expires_at").notNull(),
  authorizedAt: datetime("authorized_at"),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});



// ==========================================
// HRM MODULE — PART 1: STAFF LIFECYCLE & CREDENTIALING
// ==========================================

export const staffProfiles = mysqlTable("staff_profiles", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  userId: varchar("user_id", { length: 36 }).references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  employeeCode: varchar("employee_code", { length: 255 }).notNull().unique(),
  department: text("department").notNull(),
  designation: text("designation").notNull(),
  specialization: text("specialization"),
  licenseNumber: text("license_number"),
  licenseIssuingBody: text("license_issuing_body"),
  licenseExpiryDate: date("license_expiry_date", { mode: "string" }),
  cmePoints: int("cme_points").default(0).notNull(),
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
  onboardingCompletedAt: datetime("onboarding_completed_at"),
  hiredAt: date("hired_at", { mode: "string" }).notNull(),
  terminatedAt: date("terminated_at", { mode: "string" }),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()).notNull(),
});

export const staffCertifications = mysqlTable("staff_certifications", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  staffId: varchar("staff_id", { length: 36 }).references(() => staffProfiles.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(), // e.g. "BLS", "ACLS", "ATLS", "Board Certification"
  certType: text("cert_type", {
    enum: ["bls", "acls", "atls", "pals", "board_cert", "subspecialty", "cme", "malpractice_insurance", "other"],
  }).notNull(),
  issuingBody: text("issuing_body").notNull(),
  issueDate: date("issue_date", { mode: "string" }).notNull(),
  expiryDate: date("expiry_date", { mode: "string" }),
  documentUrl: text("document_url"),
  verificationStatus: text("verification_status", {
    enum: ["verified", "pending", "expiring_soon", "expired", "suspended"],
  }).default("pending").notNull(),
  verifiedBy: varchar("verified_by", { length: 36 }).references(() => users.id),
  verifiedAt: datetime("verified_at"),
  notes: text("notes"),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// HRM MODULE — PART 2: DUTY ROSTER & SHIFT MANAGEMENT
// ==========================================

export const dutyRosters = mysqlTable("duty_rosters", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  department: text("department").notNull(),
  shiftName: text("shift_name").notNull(),
  shiftTemplate: text("shift_template", {
    enum: ["morning", "evening", "night", "on_call_24h", "ward_rounds", "custom"],
  }).notNull(),
  startTime: text("start_time").notNull(), // e.g. "07:00"
  endTime: text("end_time").notNull(),     // e.g. "15:00"
  requiredDoctors: int("required_doctors").default(1).notNull(),
  requiredNurses: int("required_nurses").default(2).notNull(),
  requiredSupportStaff: int("required_support_staff").default(1).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: varchar("created_by", { length: 36 }).references(() => users.id).notNull(),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()).notNull(),
});

export const staffShifts = mysqlTable("staff_shifts", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  rosterId: varchar("roster_id", { length: 36 }).references(() => dutyRosters.id, { onDelete: "cascade" }).notNull(),
  staffId: varchar("staff_id", { length: 36 }).references(() => staffProfiles.id, { onDelete: "cascade" }).notNull(),
  shiftDate: date("shift_date", { mode: "string" }).notNull(),
  status: text("status", {
    enum: ["scheduled", "confirmed", "completed", "absent", "cancelled"],
  }).default("scheduled").notNull(),
  swapStatus: text("swap_status", {
    enum: ["none", "requested", "approved", "rejected"],
  }).default("none").notNull(),
  swapRequestedWithStaffId: varchar("swap_requested_with_staff_id", { length: 36 }).references(() => staffProfiles.id),
  swapApprovedBy: varchar("swap_approved_by", { length: 36 }).references(() => users.id),
  swapApprovedAt: datetime("swap_approved_at"),
  notes: text("notes"),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// HRM MODULE — PART 3: ATTENDANCE & OVERTIME
// ==========================================

export const staffAttendance = mysqlTable("staff_attendance", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  staffId: varchar("staff_id", { length: 36 }).references(() => staffProfiles.id, { onDelete: "cascade" }).notNull(),
  shiftId: varchar("shift_id", { length: 36 }).references(() => staffShifts.id),
  attendanceDate: date("attendance_date", { mode: "string" }).notNull(),
  clockIn: datetime("clock_in"),
  clockOut: datetime("clock_out"),
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
  recordedBy: varchar("recorded_by", { length: 36 }).references(() => users.id),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// HRM MODULE — PART 4: LEAVE MANAGEMENT
// ==========================================

export const leaveRequests = mysqlTable("leave_requests", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  staffId: varchar("staff_id", { length: 36 }).references(() => staffProfiles.id, { onDelete: "cascade" }).notNull(),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  leaveType: text("leave_type", {
    enum: ["annual", "clinical_cme", "sick", "maternity_paternity", "emergency_bereavement", "unpaid", "compensatory"],
  }).notNull(),
  startDate: date("start_date", { mode: "string" }).notNull(),
  endDate: date("end_date", { mode: "string" }).notNull(),
  totalDays: int("total_days").notNull(),
  reason: text("reason").notNull(),
  supportingDocumentUrl: text("supporting_document_url"),
  status: text("status", {
    enum: ["pending", "approved_by_hod", "approved_by_hr", "rejected", "cancelled"],
  }).default("pending").notNull(),
  hodApprovedBy: varchar("hod_approved_by", { length: 36 }).references(() => users.id),
  hodApprovedAt: datetime("hod_approved_at"),
  hrApprovedBy: varchar("hr_approved_by", { length: 36 }).references(() => users.id),
  hrApprovedAt: datetime("hr_approved_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// HRM MODULE — PART 5: PAYROLL ENGINE
// ==========================================

export const payrollRuns = mysqlTable("payroll_runs", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  periodMonth: int("period_month").notNull(), // 1–12
  periodYear: int("period_year").notNull(),
  totalGrossEtb: decimal("total_gross_etb", { precision: 14, scale: 2 }).default("0.00"),
  totalNetEtb: decimal("total_net_etb", { precision: 14, scale: 2 }).default("0.00"),
  totalPayeTaxEtb: decimal("total_paye_tax_etb", { precision: 14, scale: 2 }).default("0.00"),
  totalPensionEmployeeEtb: decimal("total_pension_employee_etb", { precision: 14, scale: 2 }).default("0.00"),
  totalPensionEmployerEtb: decimal("total_pension_employer_etb", { precision: 14, scale: 2 }).default("0.00"),
  totalOnCallAllowanceEtb: decimal("total_on_call_allowance_etb", { precision: 14, scale: 2 }).default("0.00"),
  totalOvertimePaidEtb: decimal("total_overtime_paid_etb", { precision: 14, scale: 2 }).default("0.00"),
  staffCount: int("staff_count").default(0),
  status: text("status", {
    enum: ["draft", "calculated", "approved", "disbursed", "void"],
  }).default("draft").notNull(),
  processedBy: varchar("processed_by", { length: 36 }).references(() => users.id),
  approvedBy: varchar("approved_by", { length: 36 }).references(() => users.id),
  processedAt: datetime("processed_at"),
  approvedAt: datetime("approved_at"),
  disbursedAt: datetime("disbursed_at"),
  notes: text("notes"),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

export const payrollItems = mysqlTable("payroll_items", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  payrollRunId: varchar("payroll_run_id", { length: 36 }).references(() => payrollRuns.id, { onDelete: "cascade" }).notNull(),
  staffId: varchar("staff_id", { length: 36 }).references(() => staffProfiles.id).notNull(),
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
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

export const staffPerformanceReviews = mysqlTable("staff_performance_reviews", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  staffId: varchar("staff_id", { length: 36 }).references(() => staffProfiles.id, { onDelete: "cascade" }).notNull(),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  reviewPeriodStart: date("review_period_start", { mode: "string" }).notNull(),
  reviewPeriodEnd: date("review_period_end", { mode: "string" }).notNull(),
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
  goals: json("goals").default([]),
  reviewedBy: varchar("reviewed_by", { length: 36 }).references(() => users.id).notNull(),
  status: text("status", { enum: ["draft", "submitted", "acknowledged"] }).default("draft"),
  comments: text("comments"),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// FINANCE MODULE — PART 1: CHART OF ACCOUNTS & DOUBLE-ENTRY LEDGER
// ==========================================

export const chartOfAccounts = mysqlTable("chart_of_accounts", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  accountCode: varchar("account_code", { length: 100 }).notNull(),
  accountName: text("account_name").notNull(),
  accountType: text("account_type", {
    enum: ["asset", "liability", "equity", "revenue", "cogs", "expense"],
  }).notNull(),
  parentAccountId: varchar("parent_account_id", { length: 36 }),
  isHeader: boolean("is_header").default(false).notNull(),
  isSystem: boolean("is_system").default(false).notNull(),
  currentBalance: decimal("current_balance", { precision: 16, scale: 2 }).default("0.00"),
  currency: varchar("currency", { length: 10 }).default("ETB"),
  department: text("department"), // cost center
  isActive: boolean("is_active").default(true).notNull(),
  description: text("description"),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()).notNull(),
}, (table) => ({
  tenantAccountCodeUnique: unique("chart_of_accounts_tenant_account_code_unique").on(table.tenantId, table.accountCode),
}));

export const journalEntries = mysqlTable("journal_entries", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  entryNumber: varchar("entry_number", { length: 255 }).notNull().unique(),
  entryDate: date("entry_date", { mode: "string" }).notNull(),
  description: text("description").notNull(),
  referenceType: text("reference_type", {
    enum: ["pos_billing", "insurance_claim", "pharmacy_cogs", "payroll_disbursement", "vendor_ap", "manual_adjustment", "subscription", "refund"],
  }).notNull(),
  referenceId: varchar("reference_id", { length: 36 }),
  totalDebit: decimal("total_debit", { precision: 16, scale: 2 }).default("0.00"),
  totalCredit: decimal("total_credit", { precision: 16, scale: 2 }).default("0.00"),
  status: text("status", { enum: ["draft", "posted", "voided"] }).default("draft").notNull(),
  postedBy: varchar("posted_by", { length: 36 }).references(() => users.id),
  postedAt: datetime("posted_at"),
  voidedBy: varchar("voided_by", { length: 36 }).references(() => users.id),
  voidReason: text("void_reason"),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

export const journalEntryLines = mysqlTable("journal_entry_lines", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  journalEntryId: varchar("journal_entry_id", { length: 36 }).references(() => journalEntries.id, { onDelete: "cascade" }).notNull(),
  accountId: varchar("account_id", { length: 36 }).references(() => chartOfAccounts.id).notNull(),
  debit: decimal("debit", { precision: 16, scale: 2 }).default("0.00"),
  credit: decimal("credit", { precision: 16, scale: 2 }).default("0.00"),
  department: text("department"),
  memo: text("memo"),
  lineOrder: int("line_order").default(0),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// FINANCE MODULE — PART 2: INSURANCE CLAIMS & PAYERS
// ==========================================

export const insurancePayers = mysqlTable("insurance_payers", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  payerCode: varchar("payer_code", { length: 255 }).notNull().unique(),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  claimsEndpoint: text("claims_endpoint"),
  defaultCopayPercent: decimal("default_copay_percent", { precision: 5, scale: 2 }).default("20.00"),
  // 20.00 means patient pays 20%, payer pays 80%
  defaultCoveragePercent: decimal("default_coverage_percent", { precision: 5, scale: 2 }).default("80.00"),
  currency: varchar("currency", { length: 10 }).default("ETB"),
  requiresPreAuth: boolean("requires_pre_auth").default(false),
  preAuthThresholdEtb: decimal("pre_auth_threshold_etb", { precision: 12, scale: 2 }).default("10000.00"),
  contractDetails: json("contract_details").default({}),
  status: text("status", { enum: ["active", "inactive", "suspended"] }).default("active").notNull(),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()).notNull(),
});

export const insuranceClaims = mysqlTable("insurance_claims", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  claimNumber: varchar("claim_number", { length: 255 }).notNull().unique(),
  invoiceId: varchar("invoice_id", { length: 36 }).references(() => invoices.id),
  patientId: varchar("patient_id", { length: 36 }).references(() => patients.id).notNull(),
  payerId: varchar("payer_id", { length: 36 }).references(() => insurancePayers.id).notNull(),
  encounterId: varchar("encounter_id", { length: 36 }).references(() => encounters.id),
  preAuthCode: text("pre_auth_code"),
  icd10Codes: json("icd10_codes").default([]), // ["I10", "E11.9"]
  cptCodes: json("cpt_codes").default([]),     // ["99213", "80053"]
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
  submittedAt: datetime("submitted_at"),
  adjudicatedAt: datetime("adjudicated_at"),
  reimbursedAt: datetime("reimbursed_at"),
  processedBy: varchar("processed_by", { length: 36 }).references(() => users.id),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// FINANCE MODULE — PART 3: POS CASH DRAWER & CASHIER SESSIONS
// ==========================================

export const cashDrawers = mysqlTable("cash_drawers", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  cashierId: varchar("cashier_id", { length: 36 }).references(() => users.id).notNull(),
  shiftLabel: text("shift_label").notNull(), // e.g. "Morning Shift – Cashier A"
  openingCashEtb: decimal("opening_cash_etb", { precision: 12, scale: 2 }).default("0.00"),
  totalCollectedCashEtb: decimal("total_collected_cash_etb", { precision: 12, scale: 2 }).default("0.00"),
  totalCollectedMobileEtb: decimal("total_collected_mobile_etb", { precision: 12, scale: 2 }).default("0.00"),
  totalCollectedCardEtb: decimal("total_collected_card_etb", { precision: 12, scale: 2 }).default("0.00"),
  totalCollectedInsuranceEtb: decimal("total_collected_insurance_etb", { precision: 12, scale: 2 }).default("0.00"),
  closingCashExpectedEtb: decimal("closing_cash_expected_etb", { precision: 12, scale: 2 }).default("0.00"),
  closingCashActualEtb: decimal("closing_cash_actual_etb", { precision: 12, scale: 2 }),
  discrepancyEtb: decimal("discrepancy_etb", { precision: 10, scale: 2 }).default("0.00"),
  denominationBreakdown: json("denomination_breakdown").default({}),
  // { "1000": 5, "500": 10, "100": 20, "50": 15, "10": 30 }
  transactionCount: int("transaction_count").default(0),
  status: text("status", { enum: ["open", "closed", "audited"] }).default("open").notNull(),
  supervisorApprovedBy: varchar("supervisor_approved_by", { length: 36 }).references(() => users.id),
  supervisorApprovedAt: datetime("supervisor_approved_at"),
  discrepancyNotes: text("discrepancy_notes"),
  openedAt: datetime("opened_at").$defaultFn(() => new Date()).notNull(),
  closedAt: datetime("closed_at"),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// FINANCE MODULE — PART 4: ACCOUNTS PAYABLE — VENDOR INVOICES
// ==========================================

export const vendorInvoices = mysqlTable("vendor_invoices", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
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
  dueDate: date("due_date", { mode: "string" }).notNull(),
  goodsReceivedAt: datetime("goods_received_at"),
  threeWayMatchStatus: text("three_way_match_status", {
    enum: ["pending_match", "matched", "discrepancy"],
  }).default("pending_match"),
  paymentStatus: text("payment_status", {
    enum: ["unpaid", "partial", "paid", "overdue", "disputed"],
  }).default("unpaid").notNull(),
  paidAmountEtb: decimal("paid_amount_etb", { precision: 14, scale: 2 }).default("0.00"),
  paidAt: datetime("paid_at"),
  paymentMethod: text("payment_method", { enum: ["bank_transfer", "cheque", "mobile_wallet", "cash"] }),
  paymentReference: text("payment_reference"),
  documentUrl: text("document_url"),
  approvedBy: varchar("approved_by", { length: 36 }).references(() => users.id),
  approvedAt: datetime("approved_at"),
  createdBy: varchar("created_by", { length: 36 }).references(() => users.id).notNull(),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 46. AI-DRIVEN PATIENT & STAFF FEEDBACK RECORDS
// ==========================================

export const feedbackRecords = mysqlTable("feedback_records", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  submitterType: text("submitter_type", {
    enum: ["patient", "family", "staff_physician", "staff_nurse", "staff_admin", "anonymous"],
  }).default("patient").notNull(),
  submitterUserId: varchar("submitter_user_id", { length: 36 }).references(() => users.id),
  submitterName: text("submitter_name"),
  submitterContact: text("submitter_contact"),
  encounterId: varchar("encounter_id", { length: 36 }).references(() => encounters.id),
  department: text("department"),
  rating: int("rating"),
  feedbackText: text("feedback_text").notNull(),
  category: text("category", {
    enum: ["general", "consultation", "nursing", "pharmacy", "laboratory", "radiology", "billing", "facilities", "telehealth"],
  }).default("general").notNull(),
  sentiment: text("sentiment", { enum: ["positive", "neutral", "negative"] }).default("neutral").notNull(),
  sentimentScore: decimal("sentiment_score", { precision: 4, scale: 2 }).default("0.00"),
  confidenceScore: decimal("confidence_score", { precision: 4, scale: 2 }).default("0.85"),
  extractedThemes: json("extracted_themes").default([]),
  actionRecommendations: json("action_recommendations").default([]),
  urgencyLevel: text("urgency_level", {
    enum: ["low", "normal", "elevated", "critical_safety"],
  }).default("normal").notNull(),
  isSafetyHazard: boolean("is_safety_hazard").default(false).notNull(),
  resolutionStatus: text("resolution_status", {
    enum: ["open", "under_investigation", "action_taken", "closed", "dismissed"],
  }).default("open").notNull(),
  assignedAdminId: varchar("assigned_admin_id", { length: 36 }).references(() => users.id),
  resolutionNotes: text("resolution_notes"),
  resolvedAt: datetime("resolved_at"),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 47. TAMPER-EVIDENT ADMIN AUDIT LOGS (HMAC CHAINED)
// ==========================================

export const adminAuditLogs = mysqlTable("admin_audit_logs", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  actorUserId: varchar("actor_user_id", { length: 36 }).references(() => users.id).notNull(),
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
  details: json("details").default({}),
  previousEntryHash: text("previous_entry_hash"),
  entryHash: text("entry_hash").notNull(),
  isTamperFlagged: boolean("is_tamper_flagged").default(false).notNull(),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 48. ENCRYPTION KEY REGISTRY & METADATA
// ==========================================

export const encryptionKeyRegistry = mysqlTable("encryption_key_registry", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  keyAlias: varchar("key_alias", { length: 255 }).notNull().unique(),
  keyVersion: int("key_version").default(1).notNull(),
  algorithm: text("algorithm").default("AES-256-GCM").notNull(),
  status: text("status", { enum: ["active", "rotated", "revoked", "compromised"] }).default("active").notNull(),
  createdBy: varchar("created_by", { length: 36 }).references(() => users.id).notNull(),
  rotatedBy: varchar("rotated_by", { length: 36 }).references(() => users.id),
  rotatedAt: datetime("rotated_at"),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 49. REAL-TIME PATIENT JOURNEY EVENTS
// ==========================================

export const patientJourneyEvents = mysqlTable("patient_journey_events", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  patientId: varchar("patient_id", { length: 36 }).references(() => patients.id, { onDelete: "cascade" }).notNull(),
  encounterId: varchar("encounter_id", { length: 36 }).references(() => encounters.id),
  currentStage: text("current_stage", {
    enum: ["triage", "waiting", "consultation", "lab_pending", "lab_ready", "radiology_pending", "pharmacy", "ward_admission", "discharged"],
  }).notNull(),
  previousStage: text("previous_stage"),
  locationRoom: text("location_room"),
  attendingStaffId: varchar("attending_staff_id", { length: 36 }).references(() => users.id),
  transitDurationSeconds: int("transit_duration_seconds").default(0),
  stageStatus: text("stage_status", {
    enum: ["pending", "in_progress", "completed", "escalated", "on_hold"],
  }).default("in_progress").notNull(),
  notes: text("notes"),
  enteredAt: datetime("entered_at").$defaultFn(() => new Date()).notNull(),
  exitedAt: datetime("exited_at"),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 50. CLINICAL WARD ROUNDS & HANDOVER
// ==========================================

export const clinicalRounds = mysqlTable("clinical_rounds", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  patientId: varchar("patient_id", { length: 36 }).references(() => patients.id, { onDelete: "cascade" }).notNull(),
  encounterId: varchar("encounter_id", { length: 36 }).references(() => encounters.id),
  bedNumber: text("bed_number").notNull(),
  wardDepartment: text("ward_department").default("General Inpatient").notNull(),
  roundingClinicianId: varchar("rounding_clinician_id", { length: 36 }).references(() => users.id).notNull(),
  acuityScore: text("acuity_score", {
    enum: ["stable", "monitoring", "deteriorating", "critical", "discharge_ready"],
  }).default("stable").notNull(),
  vitalSummary: json("vital_summary").default({}),
  clinicalNotes: text("clinical_notes").notNull(),
  activeConcerns: text("active_concerns"),
  planOfCare: text("plan_of_care").notNull(),
  criticalAlerts: json("critical_alerts").default([]),
  acknowledgedBy: varchar("acknowledged_by", { length: 36 }).references(() => users.id),
  acknowledgedAt: datetime("acknowledged_at"),
  isEscalated: boolean("is_escalated").default(false).notNull(),
  nextRoundScheduledAt: datetime("next_round_scheduled_at"),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 51. PATIENT WAYFINDING & QUEUE NOTIFICATIONS
// ==========================================

export const patientWayfindingNotifications = mysqlTable("patient_wayfinding_notifications", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  patientId: varchar("patient_id", { length: 36 }).references(() => patients.id, { onDelete: "cascade" }).notNull(),
  encounterId: varchar("encounter_id", { length: 36 }).references(() => encounters.id),
  ticketNumber: text("ticket_number").notNull(),
  targetLocation: text("target_location").notNull(),
  floorLevel: text("floor_level").default("Ground Floor"),
  directionGuidance: text("direction_guidance"),
  estimatedWaitMinutes: int("estimated_wait_minutes").default(5),
  channel: text("channel", {
    enum: ["sms", "whatsapp", "in_app", "digital_signage", "audio_call"],
  }).default("in_app").notNull(),
  recipientPhone: text("recipient_phone"),
  messageContent: text("message_content").notNull(),
  deliveryStatus: text("delivery_status", {
    enum: ["queued", "sent", "delivered", "failed", "read"],
  }).default("sent").notNull(),
  dispatchedAt: datetime("dispatched_at").$defaultFn(() => new Date()).notNull(),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});


// ==========================================
// PHARMACY AUTOMATION TABLES
// ==========================================
export const pharmacyDispensingQueue = mysqlTable("pharmacy_dispensing_queue", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).notNull(),
  prescriptionId: varchar("prescription_id", { length: 36 }).references(() => prescriptions.id, { onDelete: "cascade" }).notNull(),
  patientId: varchar("patient_id", { length: 36 }).references(() => patients.id, { onDelete: "cascade" }).notNull(),
  doctorId: varchar("doctor_id", { length: 36 }).references(() => users.id).notNull(),
  pharmacistId: varchar("pharmacist_id", { length: 36 }).references(() => users.id),
  nurseId: varchar("nurse_id", { length: 36 }).references(() => users.id),
  status: text("status", {
    enum: ["awaiting_payment", "payment_verified", "being_dispensed", "ready_for_pickup", "dispatched_to_nurse", "nurse_received", "administered", "completed", "cancelled"],
  }).default("awaiting_payment").notNull(),
  deliveryMethod: text("delivery_method", { enum: ["pickup", "nurse_delivery", "bedside"] }).default("pickup").notNull(),
  wardId: text("ward_id"),
  bedNumber: text("bed_number"),
  priority: text("priority", { enum: ["routine", "urgent", "stat"] }).default("routine").notNull(),
  medicationName: text("medication_name").notNull(),
  dosage: text("dosage").notNull(),
  quantity: int("quantity").notNull().default(1),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull().default("0.00"),
  currency: varchar("currency", { length: 10 }).notNull().default("ETB"),
  paymentVerifiedAt: datetime("payment_verified_at"),
  dispensedAt: datetime("dispensed_at"),
  dispatchedAt: datetime("dispatched_at"),
  nurseReceivedAt: datetime("nurse_received_at"),
  completedAt: datetime("completed_at"),
  pharmacistNotes: text("pharmacist_notes"),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()).notNull(),
});

export const pharmacyNotifications = mysqlTable("pharmacy_notifications", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).notNull(),
  queueItemId: varchar("queue_item_id", { length: 36 }).references(() => pharmacyDispensingQueue.id, { onDelete: "cascade" }),
  prescriptionId: varchar("prescription_id", { length: 36 }).references(() => prescriptions.id, { onDelete: "cascade" }),
  recipientId: varchar("recipient_id", { length: 36 }).references(() => users.id).notNull(),
  recipientRole: text("recipient_role", { enum: ["patient", "pharmacist", "nurse", "doctor", "admin"] }).notNull(),
  channel: text("channel", { enum: ["in_app", "sms", "whatsapp", "email"] }).default("in_app").notNull(),
  eventType: text("event_type", {
    enum: ["prescription_signed", "payment_requested", "payment_confirmed", "dispense_started", "ready_for_pickup", "dispatched_to_nurse", "nurse_received", "medicine_administered", "low_stock_alert", "expiry_alert"],
  }).notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  metadata: json("metadata").default({}),
  readAt: datetime("read_at"),
  sentAt: datetime("sent_at").$defaultFn(() => new Date()).notNull(),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

export const pharmacyInventoryAlerts = mysqlTable("pharmacy_inventory_alerts", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).notNull(),
  drugId: varchar("drug_id", { length: 36 }).references(() => drugCatalog.id, { onDelete: "cascade" }),
  batchId: varchar("batch_id", { length: 36 }).references(() => drugBatches.id, { onDelete: "cascade" }),
  alertType: text("alert_type", { enum: ["low_stock", "near_expiry", "expired", "out_of_stock"] }).notNull(),
  threshold: int("threshold"),
  currentValue: int("current_value"),
  acknowledged: boolean("acknowledged").default(false).notNull(),
  acknowledgedBy: varchar("acknowledged_by", { length: 36 }).references(() => users.id),
  acknowledgedAt: datetime("acknowledged_at"),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// DYNAMIC RBAC & CUSTOM ROLES
// ==========================================
export const customRoles = mysqlTable("custom_roles", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).notNull(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 64 }).notNull().default("clinical"),
  permissions: json("permissions").notNull().default([]),
  isSystem: boolean("is_system").notNull().default(false),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()).notNull(),
});

export const userCustomRoles = mysqlTable("user_custom_roles", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).notNull(),
  userId: varchar("user_id", { length: 36 }).references(() => users.id, { onDelete: "cascade" }).notNull(),
  roleId: varchar("role_id", { length: 36 }).references(() => customRoles.id, { onDelete: "cascade" }).notNull(),
  assignedBy: varchar("assigned_by", { length: 36 }).references(() => users.id),
  expiresAt: datetime("expires_at"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// CUSTOM WORKFLOW DEFINITIONS
// ==========================================
export const workflowDefinitions = mysqlTable("workflow_definitions", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  triggerEvent: varchar("trigger_event", { length: 64 }).notNull(),
  conditions: json("conditions").default({}),
  steps: json("steps").notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: varchar("created_by", { length: 36 }).references(() => users.id),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// POS CASHIER SHIFTS & TRANSACTIONS
// ==========================================
export const posCashierShifts = mysqlTable("pos_cashier_shifts", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).notNull(),
  cashierId: varchar("cashier_id", { length: 36 }).references(() => users.id).notNull(),
  terminalId: varchar("terminal_id", { length: 64 }).default("POS-TERM-01"),
  openedAt: datetime("opened_at").$defaultFn(() => new Date()).notNull(),
  closedAt: datetime("closed_at"),
  openingFloat: decimal("opening_float", { precision: 10, scale: 2 }).notNull().default("1000.00"),
  expectedCash: decimal("expected_cash", { precision: 10, scale: 2 }).notNull().default("1000.00"),
  actualCash: decimal("actual_cash", { precision: 10, scale: 2 }),
  cashVariance: decimal("cash_variance", { precision: 10, scale: 2 }).default("0.00"),
  totalCashSales: decimal("total_cash_sales", { precision: 10, scale: 2 }).default("0.00"),
  totalTelebirrSales: decimal("total_telebirr_sales", { precision: 10, scale: 2 }).default("0.00"),
  totalCardSales: decimal("total_card_sales", { precision: 10, scale: 2 }).default("0.00"),
  totalInsuranceSales: decimal("total_insurance_sales", { precision: 10, scale: 2 }).default("0.00"),
  totalTransactions: int("total_transactions").default(0),
  status: text("status", { enum: ["open", "closed", "audited"] }).notNull().default("open"),
  notes: text("notes"),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

export const posTransactions = mysqlTable("pos_transactions", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).notNull(),
  shiftId: varchar("shift_id", { length: 36 }).references(() => posCashierShifts.id),
  invoiceId: varchar("invoice_id", { length: 36 }).references(() => invoices.id),
  patientId: varchar("patient_id", { length: 36 }).references(() => patients.id).notNull(),
  cashierId: varchar("cashier_id", { length: 36 }).references(() => users.id).notNull(),
  receiptNumber: varchar("receipt_number", { length: 64 }).notNull().unique(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull().default("0.00"),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).notNull().default("0.00"),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).notNull().default("0.00"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull().default("0.00"),
  paymentMethod: varchar("payment_method", { length: 64 }).notNull(),
  paymentBreakdown: json("payment_breakdown").default({}),
  itemsSnapshot: json("items_snapshot").notNull().default([]),
  cashTendered: decimal("cash_tendered", { precision: 10, scale: 2 }),
  changeReturned: decimal("change_returned", { precision: 10, scale: 2 }),
  transactionRef: varchar("transaction_ref", { length: 128 }),
  qrCodePayload: text("qr_code_payload"),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 64. PATIENT ASSIGNMENTS & MATCHING
// ==========================================
export const patientAssignments = mysqlTable("patient_assignments", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  patientId: varchar("patient_id", { length: 36 }).references(() => patients.id).notNull(),
  encounterId: varchar("encounter_id", { length: 36 }).references(() => encounters.id),
  caseId: varchar("case_id", { length: 36 }).references(() => cases.id),
  providerId: varchar("provider_id", { length: 36 }).references(() => users.id).notNull(),
  providerType: text("provider_type"), // 'physician', 'nurse_practitioner', etc.
  specialty: text("specialty"),
  assignmentType: text("assignment_type", { enum: ["automatic", "manual", "patient_choice"] }).default("automatic").notNull(),
  status: text("status", { enum: ["assigned", "accepted", "declined", "completed", "cancelled"] }).default("assigned").notNull(),
  assignedAt: datetime("assigned_at").$defaultFn(() => new Date()).notNull(),
  acceptedAt: datetime("accepted_at"),
  completedAt: datetime("completed_at"),
  notes: text("notes"),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 65. QUEUE MANAGEMENT & REAL-TIME FLOW
// ==========================================
export const queueEntries = mysqlTable("queue_entries", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  caseId: varchar("case_id", { length: 36 }).references(() => cases.id),
  patientId: varchar("patient_id", { length: 36 }).references(() => patients.id).notNull(),
  providerId: varchar("provider_id", { length: 36 }).references(() => users.id),
  queueType: text("queue_type", { enum: ["walk_in", "telehealth", "treat_me_now", "scheduled"] }).default("treat_me_now").notNull(),
  position: int("position").default(1).notNull(),
  priority: text("priority", { enum: ["routine", "urgent", "emergency"] }).default("routine").notNull(),
  status: text("status", { enum: ["waiting", "called", "in_service", "completed", "cancelled", "no_show"] }).default("waiting").notNull(),
  queueNumber: text("queue_number"),
  servicePoint: text("service_point"),
  department: text("department"),
  calledByUserId: varchar("called_by_user_id", { length: 36 }).references(() => users.id),
  calledAt: datetime("called_at"),
  startedAt: datetime("started_at"),
  completedAt: datetime("completed_at"),
  estimatedWaitMinutes: int("estimated_wait_minutes").default(5),
  metadata: json("metadata").default({}),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 65B. WAITING ROOM TV DISPLAYS & DIGITAL SIGNAGE
// ==========================================
export const waitingRoomDisplays = mysqlTable("waiting_room_displays", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  name: text("name").notNull(), // e.g. "Main Waiting Room"
  location: text("location"), // e.g. "Ground Floor"
  displayToken: varchar("display_token", { length: 255 }).unique(),
  isActive: boolean("is_active").default(true).notNull(),
  settings: json("settings").default({
    displayMode: "rotation",
    rotationIntervalSeconds: 20,
    enabledScreens: {
      nowServing: true,
      queueStatus: true,
      availableStaff: true,
      announcements: true,
    },
    departmentFilter: [],
    audioEnabled: true,
    audioVoice: "en",
    audioVolume: 80,
    theme: "dark",
  }),
  lastHeartbeatAt: datetime("last_heartbeat_at"),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()).notNull(),
});

export const displayAnnouncements = mysqlTable("display_announcements", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  displayId: varchar("display_id", { length: 36 }).references(() => waitingRoomDisplays.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  type: text("type", { enum: ["info", "important", "critical", "health_tip"] }).default("info").notNull(),
  audience: text("audience", { enum: ["all", "queue", "staff", "custom"] }).default("all").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  startsAt: datetime("starts_at"),
  endsAt: datetime("ends_at"),
  createdBy: varchar("created_by", { length: 36 }).references(() => users.id),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 66. CASE MESSAGES & THREADED CARE COMMUNICATIONS
// ==========================================
export const caseMessages = mysqlTable("case_messages", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id).notNull(),
  caseId: varchar("case_id", { length: 36 }).references(() => cases.id).notNull(),
  senderId: varchar("sender_id", { length: 36 }).references(() => users.id),
  senderName: text("sender_name"),
  senderType: text("sender_type", { enum: ["patient", "provider", "care_coordinator", "system"] }).default("patient").notNull(),
  message: text("message").notNull(),
  attachments: json("attachments").default([]),
  readAt: datetime("read_at"),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 67. PROVIDER PROFILES & PUBLIC CREDENTIALS
// ==========================================
export const providerProfiles = mysqlTable("provider_profiles", {
  id: varchar("id", { length: 36 }).$defaultFn(() => randomUUID()).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  tenantId: varchar("tenant_id", { length: 36 }).notNull(),
  bio: text("bio"),
  specialties: json("specialties").$type<string[]>().default([]),
  languages: json("languages").$type<string[]>().default(["English", "Amharic"]),
  licenseNumber: varchar("license_number", { length: 100 }),
  licenseIssuingBody: varchar("license_issuing_body", { length: 255 }),
  licenseVerified: boolean("license_verified").default(false),
  consultationFeeEtb: decimal("consultation_fee_etb", { precision: 10, scale: 2 }).default("500.00"),
  approvalStatus: varchar("approval_status", { length: 50 }).default("draft"), // 'draft' | 'pending_hr' | 'approved' | 'rejected'
  hrReviewerId: varchar("hr_reviewer_id", { length: 36 }).references(() => users.id),
  hrFeedback: text("hr_feedback"),
  metadata: json("metadata").default({}),
  submittedAt: datetime("submitted_at"),
  approvedAt: datetime("approved_at"),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 68. PROVIDER SCHEDULES & RECURRING SHIFTS
// ==========================================
export const providerSchedules = mysqlTable("provider_schedules", {
  id: varchar("id", { length: 36 }).$defaultFn(() => randomUUID()).primaryKey(),
  providerId: varchar("provider_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  dayOfWeek: int("day_of_week").notNull(), // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  startTime: varchar("start_time", { length: 10 }).notNull(), // "09:00"
  endTime: varchar("end_time", { length: 10 }).notNull(), // "17:00"
  slotDurationMinutes: int("slot_duration_minutes").default(30),
  isTelehealthAvailable: boolean("is_telehealth_available").default(true),
  isInPersonAvailable: boolean("is_in_person_available").default(true),
  isApprovedByHr: boolean("is_approved_by_hr").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 69. TELEGRAM BOT & MINI APP INTEGRATIONS
// ==========================================
export const telegramIntegrations = mysqlTable("telegram_integrations", {
  id: varchar("id", { length: 36 }).$defaultFn(() => randomUUID()).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  telegramChatId: varchar("telegram_chat_id", { length: 100 }).notNull().unique(),
  telegramUsername: varchar("telegram_username", { length: 100 }),
  isNotificationsEnabled: boolean("is_notifications_enabled").default(true),
  authLinkToken: varchar("auth_link_token", { length: 64 }),
  tokenExpiresAt: datetime("token_expires_at"),
  linkedAt: datetime("linked_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 70. PATIENT ACTIVITY & LIFECYCLE AUDIT LOGS
// ==========================================
export const patientActivities = mysqlTable("patient_activities", {
  id: varchar("id", { length: 36 }).$defaultFn(() => randomUUID()).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull(),
  patientId: varchar("patient_id", { length: 36 }).notNull().references(() => patients.id, { onDelete: "cascade" }),
  actorUserId: varchar("actor_user_id", { length: 36 }).references(() => users.id),
  actorName: varchar("actor_name", { length: 255 }).notNull(),
  actorRole: varchar("actor_role", { length: 50 }).notNull(), // 'patient' | 'physician' | 'nurse' | 'system' | 'triage_staff'
  activityType: varchar("activity_type", { length: 100 }).notNull(), // 'appointment_booked' | 'prescription_issued' | 'lab_uploaded' | 'triage_performed' | 'vitals_logged' | 'consultation_completed'
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  severity: varchar("severity", { length: 20 }).default("info"), // 'info' | 'warning' | 'critical'
  metadata: json("metadata").default({}),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 71. CLINICAL FILES & MEDICAL VAULT
// ==========================================
export const clinicalFiles = mysqlTable("clinical_files", {
  id: varchar("id", { length: 36 }).$defaultFn(() => randomUUID()).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull(),
  patientId: varchar("patient_id", { length: 36 }).notNull().references(() => patients.id, { onDelete: "cascade" }),
  uploadedByUserId: varchar("uploaded_by_user_id", { length: 36 }).references(() => users.id),
  encounterId: varchar("encounter_id", { length: 36 }).references(() => encounters.id),
  category: varchar("category", { length: 50 }).notNull(), // 'prescription' | 'lab_report' | 'imaging' | 'clinical_note' | 'invoice'
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileUrl: text("file_url").notNull(),
  fileSize: int("file_size").default(102400), // in bytes
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  tags: json("tags").$type<string[]>().default([]),
  verificationStatus: varchar("verification_status", { length: 50 }).default("verified"), // 'unverified' | 'verified' | 'flagged'
  isConfidential: boolean("is_confidential").default(false),
  archived: boolean("archived").default(false),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 72. DOCUMENT ACCESS AUDIT LOGS
// ==========================================
export const documentAccessLogs = mysqlTable("document_access_logs", {
  id: varchar("id", { length: 36 }).$defaultFn(() => randomUUID()).primaryKey(),
  fileId: varchar("file_id", { length: 36 }).notNull().references(() => clinicalFiles.id, { onDelete: "cascade" }),
  accessedByUserId: varchar("accessed_by_user_id", { length: 36 }).notNull().references(() => users.id),
  accessType: varchar("access_type", { length: 50 }).notNull(), // 'preview' | 'download' | 'delete' | 'reclassify'
  ipAddress: varchar("ip_address", { length: 50 }),
  accessedAt: datetime("accessed_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 73. IMMUNIZATION RECORDS
// ==========================================
export const immunizations = mysqlTable("immunizations", {
  id: varchar("id", { length: 36 }).$defaultFn(() => randomUUID()).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull(),
  patientId: varchar("patient_id", { length: 36 }).notNull().references(() => patients.id, { onDelete: "cascade" }),
  vaccineName: varchar("vaccine_name", { length: 255 }).notNull(),
  dateGiven: datetime("date_given").$defaultFn(() => new Date()).notNull(),
  doseNumber: varchar("dose_number", { length: 50 }),
  lotNumber: varchar("lot_number", { length: 100 }),
  manufacturer: varchar("manufacturer", { length: 100 }),
  administeringProvider: varchar("administering_provider", { length: 150 }),
  status: varchar("status", { length: 50 }).default("completed").notNull(), // 'completed' | 'due' | 'overdue'
  nextDueDate: datetime("next_due_date"),
  notes: text("notes"),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()).notNull(),
});
// ==========================================
// 74. DYNAMIC NAVIGATION ITEMS
// ==========================================
export const navigationItems = mysqlTable("navigation_items", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id, { onDelete: "cascade" }),
  role: text("role"), // null = all roles, or specific role like 'physician', 'patient', 'guest'
  label: text("label").notNull(),
  href: text("href").notNull(),
  icon: text("icon"),
  parentId: varchar("parent_id", { length: 36 }),
  order: int("order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  requiresAuth: boolean("requires_auth").default(true).notNull(),
  badgeKey: text("badge_key"), // e.g. 'unread_messages', 'pending_reviews'
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 75. DYNAMIC PAGE CONTENTS (CMS)
// ==========================================
export const pageContents = mysqlTable("page_contents", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id, { onDelete: "cascade" }),
  pageKey: text("page_key").notNull(), // e.g. 'landing', 'patient-dashboard', 'about'
  sectionKey: text("section_key").notNull(), // e.g. 'hero', 'services', 'pricing'
  contentType: text("content_type").default("json").notNull(), // 'text' | 'html' | 'markdown' | 'json'
  content: json("content").notNull(),
  language: text("language").default("en").notNull(),
  version: int("version").default(1).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 76. DYNAMIC SERVICE PRICING
// ==========================================
export const servicePricing = mysqlTable("service_pricing", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id, { onDelete: "cascade" }),
  serviceName: text("service_name").notNull(),
  serviceType: text("service_type").default("subscription").notNull(), // 'consultation' | 'lab_test' | 'imaging' | 'medication' | 'procedure' | 'subscription'
  planCode: text("plan_code"), // e.g. 'individual', 'family', 'corporate'
  basePrice: decimal("base_price", { precision: 12, scale: 4 }).notNull(),
  yearlyPrice: decimal("yearly_price", { precision: 12, scale: 4 }),
  currency: text("currency").default("ETB").notNull(),
  discountPercent: decimal("discount_percent", { precision: 12, scale: 4 }).default("0").notNull(),
  badge: text("badge"),
  description: text("description"),
  features: json("features").default([]).notNull(),
  popular: boolean("popular").default(false).notNull(),
  ctaText: text("cta_text").default("Get Started").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  metadata: json("metadata").default({}),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 77. DYNAMIC DASHBOARD WIDGETS
// ==========================================
export const dashboardWidgets = mysqlTable("dashboard_widgets", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // 'physician', 'patient', 'system_admin', 'nurse', etc.
  widgetName: text("widget_name").notNull(),
  widgetType: text("widget_type").default("stats").notNull(), // 'stats' | 'list' | 'chart' | 'table' | 'timeline' | 'custom'
  title: text("title"),
  description: text("description"),
  config: json("config").default({}).notNull(),
  position: int("position").default(0).notNull(),
  gridSpan: int("grid_span").default(1).notNull(), // 1, 2, or 3 columns
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 78. DYNAMIC TAB CONFIGURATIONS
// ==========================================
export const tabConfigurations = mysqlTable("tab_configurations", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id, { onDelete: "cascade" }),
  pageKey: text("page_key").notNull(), // e.g. 'patient_health', 'admin_portal', 'clinical_station'
  tabKey: text("tab_key").notNull(), // e.g. 'timeline', 'documents', 'labs', 'medications'
  label: text("label").notNull(),
  icon: text("icon"),
  badgeKey: text("badge_key"), // e.g. 'labsCount', 'activeMedsCount'
  order: int("order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  requiredPermission: text("required_permission"),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 79. DYNAMIC ACTION CONFIGURATIONS
// ==========================================
export const actionConfigurations = mysqlTable("action_configurations", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id, { onDelete: "cascade" }),
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
  order: int("order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 80. DYNAMIC FORM CONFIGURATIONS & FIELDS
// ==========================================
export const formConfigurations = mysqlTable("form_configurations", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id, { onDelete: "cascade" }),
  formKey: varchar("form_key", { length: 255 }).notNull().unique(), // e.g. 'patient_intake', 'appointment_booking', 'vitals_entry'
  title: text("title").notNull(),
  description: text("description"),
  submitLabel: text("submit_label").default("Submit").notNull(),
  actionEndpoint: text("action_endpoint"), // optional custom submission URL
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()).notNull(),
});

export const formFields = mysqlTable("form_fields", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  formId: varchar("form_id", { length: 36 }).references(() => formConfigurations.id, { onDelete: "cascade" }).notNull(),
  fieldName: text("field_name").notNull(),
  label: text("label").notNull(),
  fieldType: text("field_type").default("text").notNull(), // 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'textarea' | 'checkbox' | 'radio' | 'file' | 'phone' | 'email'
  placeholder: text("placeholder"),
  required: boolean("required").default(false).notNull(),
  options: json("options").default([]), // for select/radio: [{ value: string, label: string }]
  validation: json("validation").default({}), // min, max, pattern, message
  order: int("order").default(0).notNull(),
  defaultValue: text("default_value"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

export const formSubmissions = mysqlTable("form_submissions", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id, { onDelete: "cascade" }),
  formKey: text("form_key").notNull(),
  submittedByUserId: varchar("submitted_by_user_id", { length: 36 }).references(() => users.id),
  data: json("data").notNull(),
  status: text("status").default("submitted").notNull(), // 'submitted' | 'processed' | 'rejected'
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 81. DYNAMIC LANDING SECTIONS
// ==========================================
export const landingSections = mysqlTable("landing_sections", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id, { onDelete: "cascade" }),
  sectionKey: text("section_key").notNull(), // 'hero' | 'trust' | 'services' | 'how_it_works' | 'why_choose_us' | 'pricing' | 'doctors' | 'faq' | 'cta' | 'footer'
  title: text("title"),
  subtitle: text("subtitle"),
  content: json("content").default({}).notNull(),
  order: int("order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 82. DYNAMIC NOTIFICATION TEMPLATES
// ==========================================
export const notificationTemplates = mysqlTable("notification_templates", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id, { onDelete: "cascade" }),
  templateKey: varchar("template_key", { length: 255 }).notNull().unique(), // e.g. 'appointment_reminder', 'lab_ready'
  title: text("title").notNull(),
  body: text("body").notNull(),
  type: text("type").default("info").notNull(), // 'info' | 'success' | 'warning' | 'error'
  channels: json("channels").default(["in_app"]).notNull(), // ['email', 'sms', 'push', 'in_app']
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()).notNull(),
});

// ==========================================
// 83. DYNAMIC TRANSLATIONS (i18n)
// ==========================================
export const translations = mysqlTable("translations", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }).references(() => organizations.id, { onDelete: "cascade" }),
  key: text("key").notNull(), // e.g. 'nav.dashboard', 'common.search'
  language: text("language").notNull(), // 'en' | 'am' | 'om' | 'ti'
  value: text("value").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: datetime("created_at").$defaultFn(() => new Date()).notNull(),
  updatedAt: datetime("updated_at").$defaultFn(() => new Date()).notNull(),
});
