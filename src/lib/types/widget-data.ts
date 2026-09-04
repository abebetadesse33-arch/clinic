/**
 * PHASE 1A: Widget Data Layer Starter
 * 
 * This file contains the TypeScript types and interfaces for all widget data endpoints.
 * These should be imported by API handlers to ensure type safety across the backend.
 * 
 * Structure:
 * - WidgetDataRequest: Common query parameters for widget endpoints
 * - WidgetDataResponse: Standard response wrapper
 * - Role-specific widget data types
 */

// ============================================
// COMMON TYPES
// ============================================

export type Role = 
  | 'physician'
  | 'nurse_practitioner'
  | 'nurse'
  | 'pharmacist'
  | 'physiotherapist'
  | 'occupational_therapist'
  | 'dietitian'
  | 'social_worker'
  | 'radiologist'
  | 'pathologist'
  | 'lab_technician'
  | 'genetic_counselor'
  | 'respiratory_therapist'
  | 'psychologist'
  | 'care_coordinator'
  | 'patient'
  | 'auditor'
  | 'system_admin'
  | 'tenant_admin';

export interface WidgetDataRequest {
  // Standard pagination
  limit?: number;          // Default: 20, Max: 100
  offset?: number;         // Default: 0
  cursor?: string;         // For cursor-based pagination
  
  // Filtering
  status?: string;
  urgency?: string;
  dateFrom?: string;       // ISO 8601
  dateTo?: string;         // ISO 8601
  
  // Sorting
  sortBy?: string;         // e.g., 'createdAt', 'name'
  sortOrder?: 'asc' | 'desc';
  
  // Additional role-specific filters
  [key: string]: any;
}

export interface WidgetDataResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  timestamp: string;        // ISO 8601
  refreshAfterSeconds: number;
  events?: {
    channels: string[];     // WebSocket channels to subscribe to
    eventTypes: string[];   // e.g., ['lab_result_received', 'referral_created']
  };
}

export interface PaginatedItem {
  id: string;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================
// PHYSICIAN DASHBOARD WIDGETS
// ============================================

export interface MyPatientsWidgetData extends PaginatedItem {
  patientId: string;
  mrn: string;
  firstName: string;
  lastName: string;
  age: number;
  gender: string;
  triagePriority: 'routine' | 'urgent' | 'critical';
  primaryDiagnosis: string;
  lastEncounterDate: string;        // ISO 8601
  lastEncounterType: string;        // 'in_person', 'telehealth', etc.
  activeConditions: number;
  activeAlerts: number;
  criticalAlerts: string[];         // e.g., ['High EWS = 7', 'Abnormal HbA1c']
  alertSeverity: 'low' | 'medium' | 'high' | 'critical';
  nextAppointment?: {
    date: string;
    type: string;
  };
}

export interface PendingAIReviewsWidgetData extends PaginatedItem {
  suggestionId: string;
  patientId: string;
  patientName: string;
  suggestType: 'diagnosis' | 'referral' | 'medication' | 'intervention' | 'lifestyle_plan';
  confidence: number;               // 0-100
  summary: string;
  rationale: string;
  linkedDataPoints: Array<{
    type: string;                   // 'lab', 'vital', 'assessment'
    name: string;
    value: string;
    timestamp: string;
  }>;
  clnicalRisk: 'low' | 'medium' | 'high';
  createdAt: string;
  expiresAt?: string;               // When suggestion expires
}

export interface CriticalAlertsWidgetData extends PaginatedItem {
  alertId: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  type: 'lab' | 'vital' | 'imaging' | 'pgx' | 'infection' | 'ews' | 'sepsis';
  severity: 'warning' | 'alert' | 'critical';
  title: string;
  description: string;
  values: Record<string, string | number>;
  referenceRange?: { low: string; high: string };
  timestamp: string;
  requiresImmediateAction: boolean;
  suggestedAction?: string;
}

export interface NewLabResultsWidgetData extends PaginatedItem {
  resultId: string;
  patientId: string;
  patientName: string;
  testName: string;
  category: string;                 // 'chemistry', 'hematology', 'immunology'
  value: string;
  unit: string;
  referenceRange: { low: string; high: string };
  isAbnormal: boolean;
  abnormalityFlag?: 'L' | 'H' | 'LL' | 'HH'; // Low, High, etc.
  interpretation: string;
  performedAt: string;
  receivedAt: string;
  source: string;                   // Lab name
  reviewed: boolean;
  reviewedAt?: string;
  linkedInterpretation?: string;    // AI interpretation
}

export interface PrescriptionApprovalsWidgetData extends PaginatedItem {
  prescriptionId: string;
  patientId: string;
  patientName: string;
  patientAge: number;
  patientAllergies?: string[];
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  route: string;
  indication: string;
  flags: Array<{
    type: 'drug_interaction' | 'renal_dosing' | 'pgx' | 'allergy' | 'duplicate' | 'controlled';
    severity: 'minor' | 'moderate' | 'major' | 'contraindicated';
    message: string;
    recommendation?: string;
  }>;
  prescribedBy: string;
  prescribedAt: string;
  requestStatus: 'pending' | 'under_review' | 'approved' | 'rejected';
}

export interface ReferralRequestsWidgetData extends PaginatedItem {
  referralId: string;
  patientId: string;
  patientName: string;
  targetRole: string;               // e.g., 'physiotherapist', 'dietitian'
  reason: string;
  urgency: 'routine' | 'urgent' | 'stat';
  status: 'pending' | 'accepted' | 'rejected' | 'scheduled';
  createdAt: string;
  createdBy: string;
  expiresAt?: string;
}

export interface TodaysAppointmentsWidgetData extends PaginatedItem {
  appointmentId: string;
  patientId: string;
  patientName: string;
  consultationType: 'in_person' | 'telehealth' | 'phone';
  status: 'scheduled' | 'completed' | 'no_show' | 'cancelled';
  startTime: string;                // ISO 8601
  duration: number;                 // minutes
  location?: string;
  notes?: string;
  telehealth?: {
    joinUrl: string;
    platform: 'zoom' | 'teams' | 'custom';
  };
}

// ============================================
// NURSE DASHBOARD WIDGETS
// ============================================

export interface MyPatientsWardWidgetData extends PaginatedItem {
  patientId: string;
  mrn: string;
  name: string;
  age: number;
  roomNumber: string;
  bedNumber: string;
  triageCategory: 'routine' | 'urgent' | 'critical';
  activeConditions: string[];
  vitalsDue: boolean;
  medicationsDue: number;
  assessmentsDue: string[];
  fallRiskScore?: number;
  pressureUlcerRisk?: string;
  lastVitalTime?: string;
}

export interface VitalsDueWidgetData extends PaginatedItem {
  recordId: string;
  patientId: string;
  patientName: string;
  roomNumber: string;
  lastVitalsTaken?: string;         // ISO 8601, null if never
  isDue: boolean;
  overdueBy?: number;               // minutes, if overdue
  scheduleFrequency: string;        // e.g., 'q4h', 'q6h', 'daily'
  nextDueTime: string;              // ISO 8601
  vitalSigns: Array<'BP' | 'HR' | 'Temp' | 'RR' | 'O2Sat' | 'Weight' | 'Pain'>;
  recentValues?: {
    BP?: string;
    HR?: number;
    Temp?: number;
    O2Sat?: number;
  };
}

export interface MedicationAdministrationWidgetData extends PaginatedItem {
  marId: string;                    // Medication Administration Record ID
  patientId: string;
  patientName: string;
  medicationName: string;
  dosage: string;
  route: string;                    // 'IV', 'PO', 'IM', 'SC'
  frequency: string;
  scheduledTime: string;            // ISO 8601
  timeWindow: {
    start: string;
    end: string;
  };
  status: 'pending' | 'administered' | 'held' | 'refused' | 'not_available';
  administeredAt?: string;
  administeredBy?: string;
  notes?: string;
  requiresDualCheck: boolean;
  dualCheckCompletedBy?: string;
}

export interface PendingAssessmentsWidgetData extends PaginatedItem {
  assessmentId: string;
  patientId: string;
  patientName: string;
  assessmentType: 'admission' | 'daily' | 'discharge' | 'fall_risk' | 'pressure_ulcer';
  assignedTo?: string;
  dueAt: string;
  overdueBy?: number;               // minutes
  priority: 'routine' | 'urgent';
}

export interface FallRiskWidgetData extends PaginatedItem {
  patientId: string;
  patientName: string;
  roomNumber: string;
  morseFallScore?: number;          // 0-125, >50 = high risk
  riskLevel: 'low' | 'moderate' | 'high';
  riskFactors: string[];
  interventionsInPlace: string[];
  lastAssessmentDate: string;
}

// ============================================
// PHARMACIST DASHBOARD WIDGETS
// ============================================

export interface MedicationOrdersReviewWidgetData extends PaginatedItem {
  orderId: string;
  patientId: string;
  patientName: string;
  patientAge: number;
  patientWeight?: number;
  patientHeight?: number;
  patientAllergies: string[];
  medicationName: string;
  medicationClass: string;
  dosage: string;
  route: string;
  frequency: string;
  indication: string;
  prescribedBy: string;
  prescribedAt: string;
  alerts: Array<{
    type: 'drug_interaction' | 'allergy' | 'renal_dosing' | 'hepatic_dosing' | 'duplicate' | 'controlled_substance' | 'pgx';
    severity: 'minor' | 'moderate' | 'major' | 'contraindicated';
    message: string;
    recommendation?: string;
  }>;
  status: 'pending_review' | 'approved' | 'rejected' | 'modified';
}

export interface DrugInteractionsWidgetData extends PaginatedItem {
  interactionId: string;
  patientId: string;
  patientName: string;
  drug1: {
    name: string;
    dosage: string;
    route: string;
    startDate: string;
  };
  drug2: {
    name: string;
    dosage: string;
    route: string;
    startDate?: string;               // null if new order
  };
  severity: 'minor' | 'moderate' | 'major' | 'contraindicated';
  mechanism: string;
  clinicalEffect: string;
  recommendation: string;
  alternatives?: string[];
  references: Array<{
    source: string;
    url?: string;
  }>;
}

export interface HighRiskMedicationsWidgetData extends PaginatedItem {
  patientId: string;
  patientName: string;
  medicationName: string;
  reason: string;                   // e.g., 'Narrow therapeutic index', 'High risk of adverse effects'
  monitoring: {
    parameter: string;               // e.g., 'INR', 'Digoxin level'
    frequency: string;               // e.g., 'weekly', 'monthly'
    lastChecked?: string;
    nextDue: string;
  }[];
  labsOverdue: boolean;
  notes?: string;
}

export interface PharmacogenomicsAlertsWidgetData extends PaginatedItem {
  alertId: string;
  patientId: string;
  patientName: string;
  gene: string;                     // e.g., 'CYP2D6'
  variant: string;                  // e.g., '*4/*4'
  phenotype: string;                // e.g., 'poor metabolizer'
  relevantMedications: Array<{
    name: string;
    currentlyPrescribed: boolean;
    recommendation: string;
  }>;
  clinicalSignificance: string;
}

export interface MedicationReconciliationWidgetData extends PaginatedItem {
  patientId: string;
  patientName: string;
  reconciliationType: 'admission' | 'discharge' | 'transfer';
  status: 'pending' | 'in_progress' | 'completed';
  dueSince?: string;
  homemedications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    reason?: string;
  }>;
  discrepancies?: Array<{
    homemedication: string;
    inpatientmedication?: string;
    discrepancyType: string;         // 'omission', 'dose_change', etc.
  }>;
}

// ============================================
// PHYSIOTHERAPIST DASHBOARD WIDGETS
// ============================================

export interface ActivePTOrdersWidgetData extends PaginatedItem {
  referralId: string;
  patientId: string;
  patientName: string;
  primaryDiagnosis: string;
  mobility: string;                 // 'Independent', 'Assistive', 'Dependent'
  referredBy: string;
  priority: 'routine' | 'urgent';
  status: 'pending' | 'accepted' | 'assessment_pending' | 'in_treatment' | 'discharged';
  receivedDate: string;
  expiresDate?: string;
}

export interface UpcomingPTSessionsWidgetData extends PaginatedItem {
  sessionId: string;
  patientId: string;
  patientName: string;
  scheduledDateTime: string;        // ISO 8601
  type: string;                     // 'Assessment', 'Treatment', 'Discharge'
  location: string;
  duration: number;                 // minutes
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
}

export interface PendingPTAssessmentsWidgetData extends PaginatedItem {
  assessmentId: string;
  patientId: string;
  patientName: string;
  assessmentType: string;
  dueDate: string;
  priority: 'routine' | 'urgent';
}

export interface FallRiskPatientsWidgetData extends PaginatedItem {
  patientId: string;
  patientName: string;
  bergBalanceScore?: number;        // 0-56
  fallRiskLevel: 'low' | 'moderate' | 'high';
  riskFactors: string[];
  recommendedInterventions: string[];
  carePlanStatus: 'pending' | 'active' | 'completed';
}

// ============================================
// DIETITIAN DASHBOARD WIDGETS
// ============================================

export interface NutritionConsultsWidgetData extends PaginatedItem {
  referralId: string;
  patientId: string;
  patientName: string;
  reason: string;
  urgency: 'routine' | 'urgent';
  status: 'pending' | 'scheduled' | 'in_progress' | 'completed';
  receivedDate: string;
  priority: number;
}

export interface MalnutritionRiskWidgetData extends PaginatedItem {
  patientId: string;
  patientName: string;
  riskScore: number;
  riskLevel: 'low' | 'moderate' | 'high';
  bmi?: number;
  unintentionalWeightLoss?: boolean;
  assessmentDate: string;
}

// ============================================
// RADIOLOGIST DASHBOARD WIDGETS
// ============================================

export interface ImagingWorklistWidgetData extends PaginatedItem {
  studyId: string;
  patientId: string;
  patientName: string;
  patientAge: number;
  modality: string;                 // 'CT', 'MR', 'X-ray', 'US'
  bodySite: string;
  indication: string;
  status: 'arrived' | 'in_progress' | 'preliminary' | 'signed';
  priority: 'routine' | 'urgent' | 'stat';
  arrivalTime: string;
  preliminaryReport?: string;
}

export interface STATPriorityImagingWidgetData extends PaginatedItem {
  studyId: string;
  patientId: string;
  patientName: string;
  modality: string;
  status: 'unread' | 'preliminary' | 'signed';
  receivedTime: string;
  timeToInterpretation?: number;    // minutes, if already interpreted
}

// ============================================
// ADMIN DASHBOARDS
// ============================================

export interface ReferralAnalyticsWidgetData {
  totalReferrals: number;
  referralsByStatus: Record<string, number>;
  referralsByUrgency: Record<string, number>;
  averageApprovalTimeHours: number;
  averageCompletionTimeHours: number;
  acceptanceRate: number;           // 0-100
  noShowRate: number;
  trend: Array<{
    date: string;
    count: number;
  }>;
}

export interface ProcessMapData {
  patientId: string;
  patientName: string;
  timeline: Array<{
    timestamp: string;
    type: 'encounter' | 'referral' | 'lab_order' | 'medication_order' | 'task' | 'lab_result' | 'imaging_result';
    status: string;
    description: string;
    linkedIds: Record<string, string>;
    actor: string;
  }>;
  activeReferrals: Array<{
    id: string;
    targetRole: string;
    status: string;
  }>;
  activeCareplan?: {
    id: string;
    goals: number;
    completionPercentage: number;
  };
}
