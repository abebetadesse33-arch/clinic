import { z } from "zod";

// ==========================================
// EXPANDED HEALTHCARE ROLES & USERS
// ==========================================

export type Role =
  | "guest"
  | "system_admin"
  | "tenant_admin"
  | "physician"
  | "nurse_practitioner"
  | "nurse"
  | "triage_staff"
  | "pharmacist"
  | "physiotherapist"
  | "occupational_therapist"
  | "dietitian"
  | "social_worker"
  | "radiologist"
  | "pathologist"
  | "lab_technician"
  | "genetic_counselor"
  | "respiratory_therapist"
  | "psychologist"
  | "biologist"
  | "care_coordinator"
  | "patient"
  | "auditor";

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  licenseNumber?: string;
  specialty?: string;
  department?: string;
  avatarUrl?: string;
  scopeOfPractice?: Record<string, boolean>;
  isAdminGrantedBySuperAdmin?: boolean;
}

export interface Allergy {
  substance: string;
  severity: "mild" | "moderate" | "severe" | "anaphylactic";
  reaction: string;
}

export interface Patient {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string; // YYYY-MM-DD
  age: number;
  gender: "male" | "female" | "other";
  bloodType: string;
  phone: string;
  email: string;
  allergies: Allergy[];
  emergencyContact: string;
  primaryDoctor: string;
  triagePriority: "routine" | "urgent" | "critical";
  avatar?: string;
  registeredDate: string;
}

// ==========================================
// MULTIMODAL MEDIA ASSETS
// ==========================================

export type MediaAssetType = "image" | "audio" | "video" | "signal" | "genomic" | "document";

export type ClinicalModality =
  | "xray"
  | "ct"
  | "mri"
  | "ultrasound"
  | "pathology_slide"
  | "dermatology_photo"
  | "retinal_scan"
  | "auscultation_heart"
  | "auscultation_lung"
  | "speech_audio"
  | "gait_video"
  | "movement_video"
  | "ecg_signal"
  | "eeg_signal"
  | "wearable_timeseries"
  | "vcf_genomic"
  | "clinical_document";

export interface MediaAssetRecord {
  id: string;
  patientId: string;
  encounterId?: string;
  type: MediaAssetType;
  modality: ClinicalModality;
  title: string;
  fileUrl: string;
  mimeType: string;
  fileSizeKb?: number;
  metadata?: Record<string, any>;
  preprocessedSummary?: string;
  confidenceScore?: number;
  uploadedBy?: string;
  createdAt: string;
}

// ==========================================
// MULTIDISCIPLINARY ASSESSMENTS
// ==========================================

export interface VitalsRecord {
  id: string;
  patientId: string;
  recordedAt: string;
  heightCm: number;
  weightKg: number;
  bmi: number;
  systolicBp: number;
  diastolicBp: number;
  heartRate: number;
  respiratoryRate: number;
  temperatureC: number;
  oxygenSaturation: number;
  ecgSummary?: string;
}

export interface SymptomRecord {
  id: string;
  patientId: string;
  name: string;
  severity: "mild" | "moderate" | "severe";
  onsetDate: string;
  duration: string;
  bodyLocation?: string;
  description: string;
  isPrimary?: boolean;
}

export interface LabResultRecord {
  id: string;
  patientId: string;
  testName: string;
  category: string;
  value: string;
  unit: string;
  referenceRangeLow: number;
  referenceRangeHigh: number;
  isAbnormal: boolean;
  interpretation: "Normal" | "High" | "Low" | "Critical High" | "Critical Low";
  performedAt: string;
}

export interface GeneticProfileRecord {
  id: string;
  patientId: string;
  gene: string;
  variant: string;
  phenotype: string;
  clinicalSignificance: string;
  sourcePanel: string;
  vcfAssetId?: string;
  testedAt: string;
}

export interface ImagingFindingRecord {
  id: string;
  patientId: string;
  mediaAssetId?: string;
  modality: "X-Ray" | "MRI" | "CT" | "Ultrasound" | "Echo" | "DEXA" | "Dermatology" | "Pathology";
  bodySite: string;
  findingSummary: string;
  impression: string;
  imageUrl?: string;
  performedAt: string;
  radiologistName: string;
}

export interface NursingAssessmentRecord {
  id: string;
  patientId: string;
  morseFallScore: number;
  fallRiskCategory: "low" | "moderate" | "high";
  bradenPressureScore: number;
  painScore: number; // 0-10
  intakeOutputMl: { intake: number; output: number };
  nursingCareNotes: string;
  assessedBy: string;
  assessedAt: string;
}

export interface PhysiotherapyAssessmentRecord {
  id: string;
  patientId: string;
  bergBalanceScore: number; // 0-56
  gaitSpeedMetersPerSec: number;
  mobilityStatus: string;
  strengthGrading: Record<string, string>;
  rehabGoals: string;
  exercisePlan: {
    aerobicRegimen: string;
    resistanceExercises: string[];
    balanceTraining: string;
    frequency: string;
  };
  assessedBy: string;
  assessedAt: string;
}

export interface NutritionAssessmentRecord {
  id: string;
  patientId: string;
  nutritionalRiskScore: "low" | "moderate" | "high_malnutrition";
  dailyCalorieTarget: number;
  proteinTargetGrams: number;
  sodiumLimitMg: number;
  dietType: string;
  foodInsecurityAccommodation: string;
  mealPlanDetails: {
    breakfast: string;
    lunch: string;
    dinner: string;
    snacks: string;
  };
  assessedBy: string;
  assessedAt: string;
}

export interface SocialHistoryRecord {
  id: string;
  patientId: string;
  category: "housing" | "food_security" | "income_employment" | "transportation" | "social_support" | "environment_stress";
  indicator: string;
  severityLevel: "low" | "medium" | "high";
  description: string;
  recommendedAction: string;
  communityResourcesConnected?: string[];
  recordedAt: string;
}

export interface RespiratoryAssessmentRecord {
  id: string;
  patientId: string;
  abgPh: number;
  abgPaco2: number;
  abgPao2: number;
  abgHco3: number;
  abgSao2: number;
  ventilatorSettings?: Record<string, any>;
  airwayClearanceRegimen: string;
  assessedBy: string;
  assessedAt: string;
}

export interface PsychologicalAssessmentRecord {
  id: string;
  patientId: string;
  testName: "PHQ-9" | "GAD-7" | "HADS" | "MoCA" | "Audit-C";
  score: number;
  severity: string;
  breakdown?: Record<string, number>;
  speechAssetId?: string;
  clinicalNotes: string;
  adherenceRisk: "low" | "moderate" | "high";
  assessedAt: string;
}

export interface MedicationRecord {
  id: string;
  patientId: string;
  name: string;
  dosage: string;
  frequency: string;
  route: string;
  indication: string;
  startDate: string;
  isActive: boolean;
  prescribedBy: string;
  pharmacistVerified?: boolean;
}

export interface PrescriptionRecord {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  doctorLicense?: string;
  aiSuggestionId?: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  route?: string;
  durationDays: number;
  quantity?: number;
  dispenseQuantity?: number;
  refillsAllowed?: number;
  refills?: number;
  indication?: string;
  instructions?: string;
  status: "draft" | "signed" | "dispensed" | "rejected";
  prescriberSignature?: string;
  signedAt?: string;
  createdAt: string;
}

export interface LabOrderRecord {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  aiSuggestionId?: string;
  testName: string;
  category?: string;
  clinicalReason: string;
  priority: "routine" | "urgent" | "stat";
  status: "ordered" | "sample_collected" | "processing" | "completed" | "cancelled";
  orderedAt: string;
}

// ==========================================
// UNIFIED CARE PLAN, TASKS, & MESSAGES
// ==========================================

export interface CarePlanGoal {
  id: string;
  title: string;
  targetDate: string;
  status: "in_progress" | "achieved" | "deferred";
  assignedRole: Role;
}

export interface CarePlanIntervention {
  id: string;
  role: Role;
  roleTitle: string;
  description: string;
  frequency: string;
  status: "active" | "completed" | "revised";
  signedBy?: string;
}

export interface CarePlanRecord {
  id: string;
  patientId: string;
  createdBy: string;
  status: "draft" | "active" | "under_review" | "completed";
  primaryDiagnosis: string;
  goals: CarePlanGoal[];
  interventions: CarePlanIntervention[];
  updatedAt: string;
}

export interface TaskRecord {
  id: string;
  patientId: string;
  patientName: string;
  assignedToRole: Role;
  assignedRole?: Role;
  assignedByUserName?: string;
  title: string;
  description: string;
  priority: "routine" | "urgent" | "stat" | "low" | "medium" | "high";
  status: "pending" | "in_progress" | "completed" | "cancelled";
  dueDate?: string;
  completedAt?: string;
  createdAt: string;
}

export interface TeamMessageRecord {
  id: string;
  patientId: string;
  senderId: string;
  senderName: string;
  senderRole: Role;
  content: string;
  isUrgentConsult?: boolean;
  isUrgent?: boolean;
  timestamp?: string;
  createdAt?: string;
}

export interface BiologicalRuleRecord {
  id: string;
  category: "pharmacogenomics" | "biomarker_cutoff" | "metabolic_pathway" | "interaction";
  ruleTitle: string;
  description: string;
  evidenceGrade: string;
  sourceCitation: string;
  isActive: boolean;
  curatedBy: string;
  createdAt: string;
}

export interface AuditLogRecord {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  timestamp: string;
  ipAddress: string;
  digitalSignature?: string;
}

// ==========================================
// MULTIDISCIPLINARY AI OUTPUT SCHEMAS
// ==========================================

export const ModalityAttributionSchema = z.object({
  modalityType: z.string(),
  label: z.string(),
  mediaAssetId: z.string().optional(),
  findingSummary: z.string(),
  confidenceContribution: z.number().min(0).max(100),
});

export const MultidisciplinaryRoleRecommendationsSchema = z.object({
  physician: z.object({
    clinicalDiagnoses: z.array(z.string()),
    primaryActions: z.array(z.string()),
    referralsNeeded: z.array(z.string()),
  }),
  nurse: z.object({
    nursingDiagnoses: z.array(z.string()),
    monitoringProtocols: z.array(z.string()),
    fallPrecautions: z.string(),
    patientEducationFocus: z.array(z.string()),
  }),
  pharmacist: z.object({
    interactionWarnings: z.array(z.string()),
    renalDoseAdjustments: z.array(z.string()),
    pharmacogenomicNotes: z.string(),
    counselingPoints: z.array(z.string()),
  }),
  physiotherapist: z.object({
    mobilityGoal: z.string(),
    prescribedExercises: z.array(z.string()),
    balanceFallPrevention: z.string(),
    intensityFrequency: z.string(),
  }),
  dietitian: z.object({
    medicalNutritionTherapy: z.string(),
    sodiumPotassiumLimits: z.string(),
    glycemicTargets: z.string(),
    foodInsecurityStrategy: z.string(),
  }),
  socialWorker: z.object({
    identifiedSdohRisks: z.array(z.string()),
    communityResourcesToConnect: z.array(z.string()),
    caregiverAndSupportPlan: z.string(),
  }),
  respiratoryTherapist: z.object({
    airwayClearance: z.string(),
    oxygenationStrategy: z.string(),
  }).optional(),
  geneticCounselor: z.object({
    variantInterpretation: z.string(),
    counselingGuidance: z.string(),
  }).optional(),
});

export const DifferentialDiagnosisSchema = z.object({
  condition: z.string(),
  probability: z.enum(["High", "Moderate", "Low"]),
  confidenceScore: z.number().min(0).max(100),
  reasoning: z.string(),
  modalitySources: z.array(z.string()).default([]),
  icd10: z.string().optional(),
});

export const MedicationSuggestionSchema = z.object({
  drug: z.string(),
  dosage: z.string(),
  frequency: z.string(),
  route: z.string().default("Oral"),
  clinicalRationale: z.string(),
  precautions: z.string(),
  modalitySources: z.array(z.string()).default([]),
  pharmacogenomicNote: z.string().optional(),
  renalHepaticAdjustment: z.string().optional(),
});

export const DrugInteractionAlertSchema = z.object({
  severity: z.enum(["Critical", "Major", "Moderate", "Minor"]),
  interactingSubstances: z.array(z.string()),
  clinicalEffect: z.string(),
  actionRequired: z.string(),
});

export const SuggestedTestSchema = z.object({
  testName: z.string(),
  category: z.string(),
  clinicalReason: z.string(),
  priority: z.enum(["Routine", "Urgent", "STAT"]),
});

export const BiopsychosocialAiOutputSchema = z.object({
  patientSummaryInsight: z.string(),
  differentialDiagnoses: z.array(DifferentialDiagnosisSchema),
  redFlagsUrgentAlerts: z.array(z.string()),
  drugInteractionsSafety: z.array(DrugInteractionAlertSchema),
  medicationSuggestions: z.array(MedicationSuggestionSchema),
  suggestedLabAndImaging: z.array(SuggestedTestSchema),
  lifestyleAndDietaryInterventions: z.object({
    dietaryGuidance: z.array(z.string()),
    exercisePhysiology: z.array(z.string()),
    sleepAndStressProtocol: z.array(z.string()),
    economicAccessibilityNotes: z.string(),
  }),
  psychologicalSupportStrategies: z.array(z.string()),
  socialInterventions: z.array(z.string()),
  guidelineEvidenceCitations: z.array(z.string()),
  modalityAttributions: z.array(ModalityAttributionSchema).default([]),
  multidisciplinaryCarePlan: MultidisciplinaryRoleRecommendationsSchema.optional(),
  aiConfidenceIndex: z.number().min(0).max(100),
  modelVersion: z.string(),
});

export type BiopsychosocialAiOutput = z.infer<typeof BiopsychosocialAiOutputSchema>;

export interface AISuggestionRecord {
  id: string;
  patientId: string;
  createdAt: string;
  modelName: string;
  analysisType: string;
  status: "pending_review" | "accepted_full" | "accepted_modified" | "rejected";
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  inputSummary?: Record<string, any>;
  rawDataRefs?: string[];
  aiResponse: BiopsychosocialAiOutput;
}

// ==========================================
// DYNAMIC DASHBOARD WIDGET SYSTEM
// ==========================================

export type WidgetId =
  | "my_patients"
  | "pending_ai_reviews"
  | "critical_alerts"
  | "vitals_due"
  | "medication_administration"
  | "drug_interactions"
  | "physiotherapy_rehab"
  | "nutrition_plan"
  | "sdoh_matrix"
  | "imaging_worklist"
  | "abg_analysis"
  | "psychometrics"
  | "biological_rules"
  | "care_gaps"
  | "audit_stream"
  | "patient_portal_overview";

export interface DashboardWidgetConfig {
  widgetId: WidgetId;
  displayName: string;
  description: string;
  category: "clinical" | "pharmacy" | "therapy" | "diagnostics" | "social" | "admin" | "patient";
  defaultColSpan: 1 | 2 | 3;
  defaultRowSpan: 1 | 2;
  allowedRoles: Role[];
  refreshIntervalSeconds: number;
  isSystemWidget: boolean;
}

export interface DashboardLayoutRecord {
  id: string;
  organizationId: string;
  role: Role;
  widgetId: WidgetId;
  displayOrder: number;
  colSpan: 1 | 2 | 3;
  rowSpan: 1 | 2;
  isEnabled: boolean;
  refreshIntervalSeconds: number;
  customConfig: Record<string, unknown>;
}

// ==========================================
// AUTOMATED CLINICAL REFERRALS & WORKFLOWS
// ==========================================

export type ReferralPriority = "routine" | "urgent" | "stat";
export type ReferralType = "internal" | "external" | "self";
export type ReferralSource = "manual" | "ai" | "patient";
export type ReferralTargetType = "professional" | "department" | "facility" | "external_provider";

export type ReferralStatus =
  | "draft"
  | "pending"
  | "pending_review"
  | "approved"
  | "accepted"
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "rejected"
  | "no_show";

export interface ReferralRecord {
  id: string;
  organizationId: string;
  patientId: string;
  patientName: string;
  encounterId?: string;
  carePlanId?: string;
  type?: ReferralType;
  source?: ReferralSource;
  referringUserId: string;
  referringUserName: string;
  referringRole: Role;
  receivingRole: Role;
  receivingUserId?: string;
  receivingUserName?: string;
  targetType?: ReferralTargetType;
  targetId?: string;
  externalProviderId?: string;
  externalProviderName?: string;
  priority: ReferralPriority;
  status: ReferralStatus;
  clinicalReason: string;
  clinicalSummary?: string;
  notes?: string;
  insuranceAuthNumber?: string;
  scheduledAppointmentId?: string;
  scheduledDate?: string;
  attachedDataRefs?: string[];
  dueBy?: string;
  acceptedAt?: string;
  completedAt?: string;
  responseNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReferralLogRecord {
  id: string;
  referralId: string;
  action: string;
  fromStatus?: string;
  toStatus: string;
  performedBy: string;
  performerName: string;
  performerRole: string;
  notes?: string;
  createdAt: string;
}

export interface ExternalProviderRecord {
  id: string;
  organizationId: string;
  name: string;
  specialty: string;
  facilityName?: string;
  address?: string;
  email?: string;
  phone?: string;
  fax?: string;
  npi?: string;
  fhirEndpoint?: string;
  preferredTransport: "fhir" | "email" | "fax";
  isActive: boolean;
  createdAt: string;
}

// ==========================================
// REAL-TIME NOTIFICATION FEED
// ==========================================

export type NotificationType =
  | "critical_alert"
  | "task_assigned"
  | "referral_received"
  | "referral_accepted"
  | "referral_completed"
  | "medication_due"
  | "lab_result_ready"
  | "ai_analysis_complete"
  | "consult_request"
  | "discharge_ready"
  | "message_received"
  | "role_switch"
  | "system_alert";

export type NotificationPriority = "low" | "normal" | "high" | "critical";

export interface NotificationRecord {
  id: string;
  organizationId: string;
  recipientUserId: string;
  senderUserId?: string;
  senderName?: string;
  type: NotificationType;
  title: string;
  body: string;
  priority: NotificationPriority;
  isRead: boolean;
  actionUrl?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  metadata?: Record<string, unknown>;
  readAt?: string;
  expiresAt?: string;
  createdAt: string;
}

// ==========================================
// PATIENT SELF-REGISTRATION & PORTAL TYPES
// ==========================================

export type RegistrationStatus =
  | "invited"
  | "started"
  | "submitted"
  | "verified"
  | "active"
  | "rejected";

export interface PatientRegistrationData {
  // Identity & Demographics
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: "male" | "female" | "other";
  email: string;
  phone: string;
  address: string;
  emergencyContact: string;
  emergencyPhone: string;

  // Insurance Details
  insuranceProvider: string;
  policyNumber: string;
  groupNumber?: string;
  subscriberName?: string;
  subscriberRelationship?: string;

  // Medical & Lifestyle Intake
  knownAllergies: string[];
  chronicConditions: string[];
  currentMedications: string[];
  primaryConcerns: string;
  socialHistoryNotes?: string;

  // Consent Preferences
  consents: {
    treatment: boolean;
    aiProcessing: boolean;
    dataSharing: boolean;
    research: boolean;
    psychologistAccess: boolean;
    dietitianAccess: boolean;
  };
}

export interface PatientRegistrationRecord {
  id: string;
  organizationId: string;
  email: string;
  phone?: string;
  status: RegistrationStatus;
  verificationToken?: string;
  verificationExpiresAt?: string;
  submittedData: Partial<PatientRegistrationData>;
  duplicatePatientId?: string;
  duplicateScore?: number;
  invitedByUserId?: string;
  activatedPatientId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PatientConsentRecord {
  id: string;
  organizationId: string;
  patientId: string;
  consentType: string;
  isGranted: boolean;
  version: string;
  ipAddress?: string;
  signatureUrl?: string;
  grantedAt: string;
  revokedAt?: string;
}

export interface PatientMessageRecord {
  id: string;
  organizationId: string;
  patientId: string;
  senderId: string;
  senderName: string;
  senderType: "patient" | "clinician" | "system";
  recipientId: string;
  recipientName: string;
  recipientType: "patient" | "clinician";
  subject?: string;
  body: string;
  attachments?: string[];
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface PatientQuestionnaireRecord {
  id: string;
  organizationId: string;
  patientId: string;
  questionnaireType: "phq9" | "gad7" | "sdoh" | "pre_visit";
  title: string;
  responses: Record<string, any>;
  totalScore?: number;
  riskCategory?: string;
  completedAt: string;
}

// ==========================================
// ADMIN WORKFLOW & AUTOMATION RULES
// ==========================================

export type ProcessType =
  | "referral"
  | "consultation"
  | "lab_order"
  | "medication_order"
  | "discharge"
  | "care_plan"
  | "patient_registration";

export interface WorkflowStepConfig {
  id: string;
  name: string;
  responsibleRole: Role | "patient" | "system";
  description: string;
  requiredFields: string[];
  requiredDocuments: string[];
  timeLimitMinutes: number;
  escalateToRole?: Role;
  enableAiSuggestion?: boolean;
}

export interface WorkflowTemplateRecord {
  id: string;
  organizationId: string;
  processType: ProcessType;
  name: string;
  description?: string;
  steps: WorkflowStepConfig[];
  version: number;
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export type TriggerMetricType =
  | "lab_value"
  | "vital"
  | "assessment"
  | "diagnosis"
  | "medication"
  | "sdoh"
  | "risk_score";

export interface AutomationRuleCondition {
  metric: string; // e.g. "hba1c", "egfr", "berg_balance", "phq9"
  operator: ">" | "<" | ">=" | "<=" | "==" | "!=" | "contains";
  threshold: string | number;
  secondaryCondition?: {
    metric: string;
    operator: string;
    threshold: string | number;
  };
}

export interface AutomationRuleAction {
  type: "suggest_referral" | "create_task" | "send_alert" | "order_protocol";
  targetRole: Role;
  urgency: ReferralPriority;
  reason: string;
  autoApprove?: boolean;
}

export interface AutomationRuleRecord {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  triggerType: TriggerMetricType;
  condition: AutomationRuleCondition;
  action: AutomationRuleAction;
  priority: number;
  isActive: boolean;
  escalationTimeoutMinutes: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConfigAuditLogRecord {
  id: string;
  organizationId: string;
  adminId: string;
  adminName: string;
  entityType: "workflow_template" | "automation_rule" | "external_provider" | "registration_config";
  entityId: string;
  action: "create" | "update" | "delete" | "activate" | "deactivate";
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
  reason?: string;
  createdAt: string;
}

// ==========================================
// PATIENT PROCESS MAP (Graph Nodes & Edges)
// ==========================================

export interface ProcessMapNode {
  id: string;
  type: "encounter" | "diagnosis" | "ai_suggestion" | "order" | "referral" | "care_plan" | "task" | "questionnaire";
  title: string;
  subtitle: string;
  status: string;
  assignedRole?: string;
  assignedPerson?: string;
  timestamp: string;
  iconName: string;
  colorTheme: "blue" | "emerald" | "violet" | "amber" | "rose" | "teal" | "sky" | "pink";
  metadata?: Record<string, any>;
}

export interface ProcessMapEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  label?: string;
  isCompleted?: boolean;
}


