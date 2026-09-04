// ============================================================================
// ENTERPRISE CLINICAL WORKFLOW AUTOMATION CONSTANTS & END-TO-END TEMPLATES
// ============================================================================
// This module defines the foundational building blocks for a visual, automated
// healthcare workflow engine. It orchestrates data across clinical, 
// administrative, revenue cycle management (RCM), and operational domains.
// By leveraging these triggers and actions, organizations can construct pipelines 
// that integrate AI-driven natural language processing, medical necessity 
// validation, remote telemetry, and patient communication.
// ============================================================================

export type TriggerCategory =
  | "AI & Decision Support"
  | "Patient Engagement & Self-Service"
  | "Telemedicine & Virtual Care"
  | "Remote Patient Monitoring & Devices"
  | "Laboratory & Diagnostics"
  | "Pharmacy & Therapeutics"
  | "Specialist Consultations & Referrals"
  | "Billing, RCM & Subscriptions"
  | "Compliance & Quality Assurance"
  | "Operational & Bed Management"
  | "Surgical & Perioperative"
  | "Population Health & Chronic Care";

export interface TriggerOption {
  value: string;
  label: string;
  category: TriggerCategory;
  color: string;
  iconName: string;
  description: string;
}

export type StepActionCategory =
  | "AI & Decision Support"
  | "Patient Engagement & Self-Service"
  | "Telemedicine & Virtual Care"
  | "Remote Patient Monitoring & Devices"
  | "Laboratory & Diagnostics"
  | "Pharmacy & Therapeutics"
  | "Specialist Referrals & MDT"
  | "Billing, RCM & Payments"
  | "Notifications & Communication"
  | "Documentation & Compliance"
  | "Operational & Case Management"
  | "Surgical & Perioperative"
  | "Population Health & Chronic Care";

export interface StepActionOption {
  value: string;
  label: string;
  category: StepActionCategory;
  description: string;
  iconName: string;
}

export interface WorkflowTemplateStep {
  step: number;
  action: string;
  label?: string;
  description?: string;
}

export interface PrebuiltWorkflowTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  triggerEvent: string;
  conditions: Record<string, unknown>;
  steps: WorkflowTemplateStep[];
}

// ─────────────────────────────────────────────────────────────
// 1. ENTERPRISE TRIGGER OPTIONS
// ─────────────────────────────────────────────────────────────
export const TRIGGER_OPTIONS: TriggerOption[] = [
  // ── AI & Decision Support
  { value: "AI_TRIAGE_COMPLETED", label: "AI Triage Completed", category: "AI & Decision Support", color: "text-violet-400", iconName: "BrainCircuit", description: "Fires when algorithmic acuity scoring and symptom analysis completes." },
  { value: "AI_CLINICAL_COPILOT_ENGAGED", label: "AI Clinical Copilot Engaged", category: "AI & Decision Support", color: "text-violet-400", iconName: "BrainCircuit", description: "Triggered during provider-AI interactive consultation review." },
  { value: "AI_RISK_SCORE_CALCULATED", label: "AI Risk Score Calculated", category: "AI & Decision Support", color: "text-blue-400", iconName: "BarChart3", description: "Automated risk stratification (e.g., LACE, TIMI, APACHE II)." },
  { value: "AI_DIAGNOSIS_SUGGESTED", label: "AI Diagnosis Suggested", category: "AI & Decision Support", color: "text-emerald-400", iconName: "Stethoscope", description: "Machine learning differential diagnosis ranked suggestions generated." },
  { value: "AI_TREATMENT_PLAN_PROPOSED", label: "AI Treatment Plan Proposed", category: "AI & Decision Support", color: "text-teal-400", iconName: "ClipboardList", description: "Guideline-concordant therapy protocol recommendation posted." },
  { value: "AI_DRUG_INTERACTION_FLAGGED", label: "AI Drug Interaction Flagged", category: "AI & Decision Support", color: "text-red-500", iconName: "ShieldAlert", description: "Severe contraindication or metabolic pathway clash detected." },
  { value: "AI_PHARMACOGENOMIC_ALERT", label: "AI Pharmacogenomic Alert", category: "AI & Decision Support", color: "text-purple-400", iconName: "Dna", description: "CYP450 / HLA allele high-risk gene-drug pair identified." },
  { value: "AI_CARE_GAP_IDENTIFIED", label: "AI Care Gap Identified", category: "AI & Decision Support", color: "text-orange-400", iconName: "BrainCircuit", description: "Overdue screening, vaccine, or chronic illness monitoring gap found." },
  { value: "AI_PROACTIVE_INSIGHT_GENERATED", label: "AI Proactive Insight Generated", category: "AI & Decision Support", color: "text-blue-400", iconName: "BrainCircuit", description: "Longitudinal health trend or subtle decompensation warning derived from ambient data." },
  { value: "AI_NLP_DOCUMENTATION_COMPLETE", label: "AI NLP Documentation Complete", category: "AI & Decision Support", color: "text-violet-500", iconName: "FileText", description: "Ambient voice recording transformed into structured SOAP note via NLP." },
  { value: "AI_MISTRAL_NODE_FIRED", label: "Mistral AI Lightweight Routing", category: "AI & Decision Support", color: "text-blue-500", iconName: "BrainCircuit", description: "Lightweight LLM node fired for rapid classification and deterministic routing." },

  // ── Patient Engagement & Self-Service
  { value: "PATIENT_SELF_REGISTERED", label: "Patient Self-Registered", category: "Patient Engagement & Self-Service", color: "text-teal-400", iconName: "UserPlus", description: "New patient created an account via portal or mobile app." },
  { value: "PATIENT_REGISTERED", label: "Patient Registered (Staff/Admin)", category: "Patient Engagement & Self-Service", color: "text-teal-400", iconName: "UserCheck", description: "Patient intake processed at hospital front desk or kiosk." },
  { value: "PATIENT_DASHBOARD_ACCESSED", label: "Patient Dashboard Accessed", category: "Patient Engagement & Self-Service", color: "text-blue-400", iconName: "MonitorSmartphone", description: "Patient authenticated into personal health records." },
  { value: "PATIENT_CONSENT_SIGNED", label: "Patient Consent Signed", category: "Patient Engagement & Self-Service", color: "text-emerald-400", iconName: "ShieldCheck", description: "Digital HIPAA/clinical treatment consent signed." },
  { value: "PATIENT_CONSENT_REVOKED", label: "Patient Consent Revoked", category: "Patient Engagement & Self-Service", color: "text-red-500", iconName: "Lock", description: "Patient opted out or revoked medical record sharing." },
  { value: "PATIENT_QUESTIONNAIRE_SUBMITTED", label: "Patient Questionnaire Submitted", category: "Patient Engagement & Self-Service", color: "text-teal-400", iconName: "ClipboardCheck", description: "Pre-visit intake or standardized assessment (PHQ-9/GAD-7) returned." },
  { value: "PATIENT_GOAL_SET", label: "Patient Goal Set", category: "Patient Engagement & Self-Service", color: "text-emerald-400", iconName: "Target", description: "Wellness, glycemic, or physical rehabilitation milestone created." },
  { value: "PATIENT_GOAL_ACHIEVED", label: "Patient Goal Achieved", category: "Patient Engagement & Self-Service", color: "text-emerald-400", iconName: "Trophy", description: "Patient hit target biometric or compliance threshold." },
  { value: "PATIENT_SURVEY_COMPLETED", label: "Patient Survey Completed", category: "Patient Engagement & Self-Service", color: "text-emerald-400", iconName: "ClipboardCheck", description: "Post-consultation satisfaction or CAHPS score collected." },
  { value: "PATIENT_MESSAGE_RECEIVED", label: "Patient Message Received", category: "Patient Engagement & Self-Service", color: "text-blue-400", iconName: "MessageSquare", description: "Inbound secure chat or telehealth question from patient." },
  { value: "PATIENT_NO_SHOW", label: "Patient No-show", category: "Patient Engagement & Self-Service", color: "text-amber-400", iconName: "CalendarClock", description: "Missed scheduled appointment window." },
  { value: "CONVERSATIONAL_AI_HANDOFF_COMPLETED", label: "Conversational AI Handoff Completed", category: "Patient Engagement & Self-Service", color: "text-purple-500", iconName: "MessageSquare", description: "Patient completed a multi-turn conversation with an autonomous AI agent for intake." },

  // ── Telemedicine & Virtual Care
  { value: "TELEHEALTH_SESSION_SCHEDULED", label: "Telehealth Session Scheduled", category: "Telemedicine & Virtual Care", color: "text-blue-400", iconName: "Video", description: "Virtual video consultation booked on provider calendar." },
  { value: "TELEHEALTH_SESSION_STARTED", label: "Telehealth Session Started", category: "Telemedicine & Virtual Care", color: "text-emerald-400", iconName: "Video", description: "Provider and patient connected in WebRTC room." },
  { value: "TELEHEALTH_SESSION_COMPLETED", label: "Telehealth Session Completed", category: "Telemedicine & Virtual Care", color: "text-slate-400", iconName: "Video", description: "Virtual encounter concluded and call finalized." },
  { value: "TELEHEALTH_NO_SHOW", label: "Telehealth No-show", category: "Telemedicine & Virtual Care", color: "text-amber-400", iconName: "Video", description: "Patient did not connect to virtual room within tolerance window." },
  { value: "REMOTE_CONSULTATION_REQUESTED", label: "Remote Consultation Requested", category: "Telemedicine & Virtual Care", color: "text-teal-400", iconName: "PhoneCall", description: "On-demand or urgent virtual triage requested." },
  { value: "VIRTUAL_WAITING_ROOM_JOINED", label: "Virtual Waiting Room Joined", category: "Telemedicine & Virtual Care", color: "text-blue-400", iconName: "MonitorSmartphone", description: "Patient entered encrypted virtual waiting room." },
  { value: "TELEHEALTH_RECORDING_READY", label: "Telehealth Recording Ready", category: "Telemedicine & Virtual Care", color: "text-violet-400", iconName: "FileVideo", description: "Clinical video recording/transcription ready for review." },
  { value: "E_PRESCRIPTION_SENT", label: "E-Prescription Sent", category: "Telemedicine & Virtual Care", color: "text-emerald-400", iconName: "Pill", description: "Digital prescription transmitted during or after video visit." },

  // ── Remote Patient Monitoring & Devices
  { value: "DEVICE_CONNECTED", label: "Device Connected", category: "Remote Patient Monitoring & Devices", color: "text-blue-400", iconName: "Radio", description: "Cellular/Bluetooth medical sensor paired to patient account." },
  { value: "DEVICE_DISCONNECTED", label: "Device Disconnected", category: "Remote Patient Monitoring & Devices", color: "text-amber-400", iconName: "WifiOff", description: "Continuous biometric monitor telemetry dropped offline." },
  { value: "DEVICE_READING_CRITICAL", label: "Device Reading Critical", category: "Remote Patient Monitoring & Devices", color: "text-red-500", iconName: "Thermometer", description: "Severe glucose, SpO2, or blood pressure outlier reported." },
  { value: "REMOTE_MONITORING_ALERT", label: "Remote Monitoring Alert", category: "Remote Patient Monitoring & Devices", color: "text-red-500", iconName: "Radio", description: "Automated physiologic sensor threshold violation." },
  { value: "RPM_COMPLIANCE_BREACH", label: "RPM Compliance Breach", category: "Remote Patient Monitoring & Devices", color: "text-orange-400", iconName: "AlarmClock", description: "Patient missed mandatory daily telemetry readings." },
  { value: "RPM_ENROLLMENT_CREATED", label: "RPM Enrollment Created", category: "Remote Patient Monitoring & Devices", color: "text-teal-400", iconName: "Users", description: "Patient enrolled in chronic disease remote monitoring program." },
  { value: "RPM_PROGRAM_COMPLETED", label: "RPM Program Completed", category: "Remote Patient Monitoring & Devices", color: "text-emerald-400", iconName: "BadgeCheck", description: "Successful completion of longitudinal remote telemetry cycle." },
  { value: "DEVICE_SYNC_FAILED", label: "Device Sync Failed", category: "Remote Patient Monitoring & Devices", color: "text-amber-400", iconName: "Globe", description: "API gateway transmission failure from third-party hub." },
  { value: "RPM_DAILY_CHECKIN_SUBMITTED", label: "RPM Check-in Submitted", category: "Remote Patient Monitoring & Devices", color: "text-teal-500", iconName: "Activity", description: "Patient completed daily voice/chat health update via RPMCheck AI." },

  // ── Laboratory & Diagnostics
  { value: "LAB_ORDER_SUBMITTED", label: "Lab Order Submitted", category: "Laboratory & Diagnostics", color: "text-amber-400", iconName: "FlaskConical", description: "Diagnostic workup ordered by clinician." },
  { value: "LAB_RESULT_READY", label: "Lab Result Ready", category: "Laboratory & Diagnostics", color: "text-amber-400", iconName: "FlaskConical", description: "Specimen analysis verified and entered into LIS." },
  { value: "LAB_RESULT_CRITICAL", label: "Lab Result Critical", category: "Laboratory & Diagnostics", color: "text-red-500", iconName: "AlertTriangle", description: "Life-threatening panic value requiring immediate STAT response." },
  { value: "LAB_RESULT_ABNORMAL", label: "Lab Result Abnormal", category: "Laboratory & Diagnostics", color: "text-orange-400", iconName: "AlertTriangle", description: "Biochemical result outside biological reference interval." },
  { value: "BIOCHEMICAL_PANEL_ORDERED", label: "Biochemical Panel Ordered", category: "Laboratory & Diagnostics", color: "text-amber-400", iconName: "FlaskRound", description: "Comprehensive metabolic, cardiac, or hepatic panel ordered." },
  { value: "BIOCHEMICAL_RESULT_READY", label: "Biochemical Result Ready", category: "Laboratory & Diagnostics", color: "text-amber-400", iconName: "FlaskRound", description: "Spectrophotometric / immuno-assay results finalized." },
  { value: "BIOCHEMICAL_CRITICAL_VALUE", label: "Biochemical Critical Value", category: "Laboratory & Diagnostics", color: "text-red-500", iconName: "AlertTriangle", description: "Extreme electrolyte, troponin, or lactate deviation." },
  { value: "METABOLIC_PANEL_ABNORMAL", label: "Metabolic Panel Abnormal", category: "Laboratory & Diagnostics", color: "text-orange-400", iconName: "Activity", description: "Disrupted creatinine, BUN, or glucose homeostasis." },
  { value: "ELECTROLYTE_IMBALANCE", label: "Electrolyte Imbalance", category: "Laboratory & Diagnostics", color: "text-red-500", iconName: "FlaskRound", description: "Critical potassium (K+) or sodium (Na+) disturbance." },
  { value: "DRUG_LEVEL_OUT_OF_RANGE", label: "Drug Level Out of Range", category: "Laboratory & Diagnostics", color: "text-red-500", iconName: "TestTube", description: "Therapeutic drug monitoring sub-therapeutic or toxic level." },
  { value: "TOXICOLOGY_SCREEN_POSITIVE", label: "Toxicology Screen Positive", category: "Laboratory & Diagnostics", color: "text-red-600", iconName: "TestTube", description: "Immunoassay detection of controlled substance or poison." },
  { value: "GENETIC_TEST_ORDERED", label: "Genetic Test Ordered", category: "Laboratory & Diagnostics", color: "text-purple-400", iconName: "Dna", description: "Next-generation sequencing or PCR target requested." },
  { value: "GENETIC_RESULT_READY", label: "Genetic Result Ready", category: "Laboratory & Diagnostics", color: "text-purple-400", iconName: "Dna", description: "Variant calling and molecular pathology report signed." },
  { value: "NUTRITIONAL_BIOCHEMISTRY_FLAG", label: "Nutritional Biochemistry Flag", category: "Laboratory & Diagnostics", color: "text-orange-400", iconName: "HeartPulse", description: "Severe albumin, prealbumin, or micronutrient deficit." },
  { value: "LIPID_PROFILE_ABNORMAL", label: "Lipid Profile Abnormal", category: "Laboratory & Diagnostics", color: "text-amber-400", iconName: "Activity", description: "Severe hypertriglyceridemia or LDL elevation." },
  { value: "LIVER_FUNCTION_ABNORMAL", label: "Liver Function Abnormal", category: "Laboratory & Diagnostics", color: "text-red-500", iconName: "Activity", description: "Acute transaminitis (ALT/AST) or elevated bilirubin." },
  { value: "RENAL_FUNCTION_DECLINE", label: "Renal Function Decline", category: "Laboratory & Diagnostics", color: "text-red-500", iconName: "Activity", description: "Acute kidney injury (eGFR drop > 30% or creatinine spike)." },
  { value: "BIOCHEMICAL_CONSULT_REQUESTED", label: "Biochemical Consult Requested", category: "Laboratory & Diagnostics", color: "text-teal-400", iconName: "Microscope", description: "Physician requested formal clinical biochemistry expert review." },
  { value: "BIOCHEMICAL_CONSULT_COMPLETED", label: "Biochemical Consult Completed", category: "Laboratory & Diagnostics", color: "text-emerald-400", iconName: "Microscope", description: "Biochemical interpretation signed with clinical advisory." },
  { value: "PATHOLOGY_RESULT_READY", label: "Pathology Result Ready", category: "Laboratory & Diagnostics", color: "text-purple-400", iconName: "Microscope", description: "Histopathology biopsy diagnosis completed." },
  { value: "PATHOLOGY_RESULT_MALIGNANT", label: "Pathology Result Malignant", category: "Laboratory & Diagnostics", color: "text-red-500", iconName: "AlertTriangle", description: "Confirmed cellular malignancy requiring tumor board escalation." },
  { value: "IMAGING_ORDER_SUBMITTED", label: "Imaging Order Submitted", category: "Laboratory & Diagnostics", color: "text-pink-400", iconName: "Activity", description: "X-ray, CT, MRI, or ultrasound requisition filed." },
  { value: "IMAGING_RESULT_READY", label: "Imaging Result Ready", category: "Laboratory & Diagnostics", color: "text-pink-400", iconName: "Activity", description: "Radiologist finalized study interpretation." },
  { value: "IMAGING_RESULT_CRITICAL", label: "Imaging Result Critical", category: "Laboratory & Diagnostics", color: "text-red-500", iconName: "AlertTriangle", description: "Acute stroke, pulmonary embolism, or pneumothorax identified." },

  // ── Pharmacy & Therapeutics
  { value: "PRESCRIPTION_SIGNED", label: "Prescription Signed", category: "Pharmacy & Therapeutics", color: "text-emerald-400", iconName: "Pill", description: "Physician authorized prescription order." },
  { value: "MEDICATION_ORDER_MODIFIED", label: "Medication Order Modified", category: "Pharmacy & Therapeutics", color: "text-amber-400", iconName: "Pill", description: "Dosage, frequency, or route updated." },
  { value: "MEDICATION_DISPENSED", label: "Medication Dispensed", category: "Pharmacy & Therapeutics", color: "text-emerald-400", iconName: "PackageCheck", description: "Pharmacist completed bottle fill and patient counseling." },
  { value: "MEDICATION_ADMINISTERED", label: "Medication Administered", category: "Pharmacy & Therapeutics", color: "text-blue-400", iconName: "Syringe", description: "Bedside nursing barcode medication scan recorded." },
  { value: "CONTROLLED_SUBSTANCE_ORDERED", label: "Controlled Substance Ordered", category: "Pharmacy & Therapeutics", color: "text-violet-400", iconName: "Lock", description: "Schedule II-V narcotic requires dual sign-off." },
  { value: "MEDICATION_REFILL_REQUESTED", label: "Medication Refill Requested", category: "Pharmacy & Therapeutics", color: "text-blue-400", iconName: "Pill", description: "Patient or community pharmacy renewal request." },
  { value: "MEDICATION_STOCK_LOW", label: "Medication Stock Low", category: "Pharmacy & Therapeutics", color: "text-amber-400", iconName: "PackageCheck", description: "Hospital dispensary inventory dropped below minimum reorder point." },
  { value: "ADHERENCE_MISSED_DOSE", label: "Missed Dose Flagged", category: "Pharmacy & Therapeutics", color: "text-red-500", iconName: "AlertTriangle", description: "MedAdhere AI flagged a missed dose based on tracking metrics." },

  // ── Specialist Consultations & Referrals
  { value: "SPECIALIST_REFERRAL_CREATED", label: "Specialist Referral Created", category: "Specialist Consultations & Referrals", color: "text-teal-400", iconName: "Users", description: "Patient referred to tertiary or specialist department." },
  { value: "SPECIALIST_REFERRAL_ACCEPTED", label: "Specialist Referral Accepted", category: "Specialist Consultations & Referrals", color: "text-emerald-400", iconName: "Users", description: "Receiving specialist confirmed clinic intake." },
  { value: "SPECIALIST_REFERRAL_COMPLETED", label: "Specialist Referral Completed", category: "Specialist Consultations & Referrals", color: "text-slate-400", iconName: "Users", description: "Specialist consult closed with consultation report." },
  { value: "MULTIDISCIPLINARY_TEAM_MEETING_SCHEDULED", label: "MDT Meeting Scheduled", category: "Specialist Consultations & Referrals", color: "text-blue-400", iconName: "CalendarClock", description: "Cross-functional case conference placed on calendar." },
  { value: "MULTIDISCIPLINARY_TEAM_MEETING_COMPLETED", label: "MDT Meeting Completed", category: "Specialist Consultations & Referrals", color: "text-slate-400", iconName: "CalendarClock", description: "Multidisciplinary consensus treatment plan recorded." },
  { value: "SECOND_OPINION_REQUESTED", label: "Second Opinion Requested", category: "Specialist Consultations & Referrals", color: "text-violet-400", iconName: "Stethoscope", description: "External expert second opinion docket initialized." },
  { value: "SECOND_OPINION_RECEIVED", label: "Second Opinion Received", category: "Specialist Consultations & Referrals", color: "text-emerald-400", iconName: "Stethoscope", description: "Independent expert evaluation returned." },
  { value: "EXTERNAL_REFERRAL_RECEIVED", label: "External Referral Received", category: "Specialist Consultations & Referrals", color: "text-teal-400", iconName: "Users", description: "Inbound transfer or referral from external clinic." },

  // ── Billing, RCM & Subscriptions
  { value: "PAYMENT_COMPLETED", label: "Payment Completed", category: "Billing, RCM & Subscriptions", color: "text-blue-400", iconName: "CreditCard", description: "Successful cash, wallet, or card transaction." },
  { value: "PAYMENT_FAILED", label: "Payment Failed", category: "Billing, RCM & Subscriptions", color: "text-red-500", iconName: "CreditCard", description: "Declined card or failed mobile wallet push." },
  { value: "PAYMENT_REFUNDED", label: "Payment Refunded", category: "Billing, RCM & Subscriptions", color: "text-slate-400", iconName: "CreditCard", description: "Finance reversed transaction and credited patient." },
  { value: "INVOICE_GENERATED", label: "Invoice Generated", category: "Billing, RCM & Subscriptions", color: "text-blue-400", iconName: "Receipt", description: "Itemized billing document drafted." },
  { value: "INSURANCE_PREAUTH_REQUIRED", label: "Insurance Pre-auth Required", category: "Billing, RCM & Subscriptions", color: "text-amber-400", iconName: "ShieldCheck", description: "High-cost procedure necessitates payer prior authorization." },
  { value: "INSURANCE_CLAIM_DENIED", label: "Insurance Claim Denied", category: "Billing, RCM & Subscriptions", color: "text-red-500", iconName: "ShieldAlert", description: "Payer adjudication returned claim rejection code." },
  { value: "BILLING_DISCREPANCY", label: "Billing Discrepancy", category: "Billing, RCM & Subscriptions", color: "text-orange-400", iconName: "Banknote", description: "Variance between clinical order and financial ledger." },
  { value: "SUBSCRIPTION_RENEWAL_DUE", label: "Subscription Renewal Due", category: "Billing, RCM & Subscriptions", color: "text-blue-400", iconName: "CalendarClock", description: "Chronic care monthly membership renewal upcoming." },
  { value: "SUBSCRIPTION_CANCELLED", label: "Subscription Cancelled", category: "Billing, RCM & Subscriptions", color: "text-slate-400", iconName: "CalendarX", description: "Membership terminated or expired." },
  { value: "INSURANCE_ELIGIBILITY_VERIFIED", label: "Insurance Eligibility Verified", category: "Billing, RCM & Subscriptions", color: "text-emerald-500", iconName: "ShieldCheck", description: "InsureVerify AI confirmed policy validity ahead of appointment." },

  // ── Compliance & Quality Assurance
  { value: "STAFF_LICENSE_EXPIRING", label: "Staff License Expiring", category: "Compliance & Quality Assurance", color: "text-red-400", iconName: "FileText", description: "Medical licensure expires within 90/30 days." },
  { value: "STAFF_CREDENTIAL_VERIFIED", label: "Staff Credential Verified", category: "Compliance & Quality Assurance", color: "text-emerald-400", iconName: "BadgeCheck", description: "HR validated medical council board certificate." },
  { value: "AUDIT_LOG_ANOMALY", label: "Audit Log Anomaly", category: "Compliance & Quality Assurance", color: "text-red-500", iconName: "FileWarning", description: "Suspicious chart access or security policy breach." },
  { value: "DATA_BREACH_SUSPECTED", label: "Data Breach Suspected", category: "Compliance & Quality Assurance", color: "text-red-600", iconName: "ShieldAlert", description: "High-volume data export or anomalous IP traffic." },
  { value: "REGULATORY_REPORT_DUE", label: "Regulatory Report Due", category: "Compliance & Quality Assurance", color: "text-amber-400", iconName: "FileText", description: "Ministry of Health or public health statutory report due." },
  { value: "MEDICAL_NECESSITY_FLAG", label: "Medical Necessity Flag", category: "Compliance & Quality Assurance", color: "text-orange-500", iconName: "ShieldAlert", description: "Clinical documentation missing medical necessity for inpatient status." },
  { value: "CLINICAL_VARIATION_DETECTED", label: "Clinical Variation Detected", category: "Compliance & Quality Assurance", color: "text-amber-500", iconName: "Activity", description: "Treatment methodology deviated from standardized harmonized guidelines." },

  // ── Operational & Bed Management
  { value: "CARE_PLAN_UPDATED", label: "Care Plan Updated", category: "Operational & Bed Management", color: "text-blue-400", iconName: "ClipboardList", description: "Interdisciplinary team revised goals and medications." },
  { value: "TASK_OVERDUE", label: "Task Overdue", category: "Operational & Bed Management", color: "text-red-500", iconName: "Clock", description: "Nursing or laboratory turnaround SLA breached." },
  { value: "WAIT_TIME_EXCEEDED", label: "Wait Time Exceeded", category: "Operational & Bed Management", color: "text-orange-400", iconName: "Clock", description: "Triage waiting queue exceeded maximum allowance." },
  { value: "CASE_CREATED", label: "Case Created", category: "Operational & Bed Management", color: "text-teal-400", iconName: "FilePlus", description: "New acute or chronic clinical case docket opened." },
  { value: "CASE_CLOSED", label: "Case Closed", category: "Operational & Bed Management", color: "text-slate-400", iconName: "FileDown", description: "Clinical episode successfully concluded." },
  { value: "APPOINTMENT_BOOKED", label: "Appointment Booked", category: "Operational & Bed Management", color: "text-orange-400", iconName: "CalendarClock", description: "Scheduled clinic appointment reserved." },
  { value: "APPOINTMENT_CANCELLED", label: "Appointment Cancelled", category: "Operational & Bed Management", color: "text-red-400", iconName: "CalendarClock", description: "Scheduled appointment voided." },
  { value: "APPOINTMENT_RESCHEDULED", label: "Appointment Rescheduled", category: "Operational & Bed Management", color: "text-amber-400", iconName: "CalendarClock", description: "Appointment moved to alternative timeslot." },
  { value: "WALK_IN_CHECKED_IN", label: "Walk-in Checked In", category: "Operational & Bed Management", color: "text-teal-400", iconName: "UserCheck", description: "Unscheduled walk-in patient queued for triage." },
  { value: "INPATIENT_ADMISSION", label: "Inpatient Admission", category: "Operational & Bed Management", color: "text-violet-400", iconName: "BedDouble", description: "Physician issued inpatient ward bed admission order." },
  { value: "DISCHARGE_INITIATED", label: "Discharge Initiated", category: "Operational & Bed Management", color: "text-slate-400", iconName: "ArrowRight", description: "Discharge planning summary started." },
  { value: "DISCHARGE_COMPLETED", label: "Discharge Completed", category: "Operational & Bed Management", color: "text-slate-400", iconName: "ArrowRight", description: "Patient cleared ward and exited facility." },
  { value: "TRANSFER_TO_ICU", label: "Transfer to ICU", category: "Operational & Bed Management", color: "text-red-500", iconName: "HeartPulse", description: "Critical deterioration transfer to Intensive Care." },
  { value: "TRANSFER_TO_WARD", label: "Transfer to Ward", category: "Operational & Bed Management", color: "text-blue-400", iconName: "BedDouble", description: "Step-down transfer from ICU/ED to general medical ward." },
  { value: "VITALS_OUT_OF_RANGE", label: "Vitals Out of Range", category: "Operational & Bed Management", color: "text-red-500", iconName: "HeartPulse", description: "Systolic BP, heart rate, or respiratory rate out of bounds." },
  { value: "NEWS2_SCORE_HIGH", label: "NEWS2 Score High", category: "Operational & Bed Management", color: "text-red-500", iconName: "Activity", description: "National Early Warning Score >= 5 (moderate/high risk)." },
  { value: "FALL_RISK_HIGH", label: "Fall Risk High", category: "Operational & Bed Management", color: "text-orange-400", iconName: "AlertTriangle", description: "Morse Fall Scale assessment flags high hazard." },
  { value: "SEPSIS_ALERT", label: "Sepsis Alert", category: "Operational & Bed Management", color: "text-red-600", iconName: "AlertTriangle", description: "qSOFA / SIRS criteria met; trigger immediate fluid/antibiotic protocol." },
  { value: "LOS_VARIATION_DETECTED", label: "Length of Stay Variation", category: "Operational & Bed Management", color: "text-amber-500", iconName: "Clock", description: "Predictive model flags probable hospitalization duration overrun." },

  // ── Surgical & Perioperative
  { value: "SURGERY_SCHEDULED", label: "Surgery Scheduled", category: "Surgical & Perioperative", color: "text-blue-400", iconName: "CalendarClock", description: "Perioperative case booked in operating theater." },
  { value: "PRE_OP_CLEARANCE_OBTAINED", label: "Pre-Op Clearance Obtained", category: "Surgical & Perioperative", color: "text-emerald-400", iconName: "ShieldCheck", description: "Anesthesia and cardiac clearance finalized." },
  { value: "PACU_TRANSFER", label: "Transfer to PACU", category: "Surgical & Perioperative", color: "text-violet-400", iconName: "ArrowRight", description: "Patient moved to Post-Anesthesia Care Unit." },

  // ── Population Health & Chronic Care
  { value: "POST_DISCHARGE_FOLLOWUP_DUE", label: "Post-Discharge Follow-Up Due", category: "Population Health & Chronic Care", color: "text-orange-400", iconName: "PhoneCall", description: "DischargeFollow AI triggers automated post-discharge engagement." },
];

// ─────────────────────────────────────────────────────────────
// 2. ENTERPRISE STEP ACTIONS
// ─────────────────────────────────────────────────────────────
export const STEP_ACTIONS: StepActionOption[] = [
  // ── AI & Decision Support
  { value: "TRIGGER_AI_TRIAGE", label: "Trigger AI Triage Analysis", category: "AI & Decision Support", description: "Execute machine-learning triage acuity and protocol assignment.", iconName: "BrainCircuit" },
  { value: "ENGAGE_AI_COPILOT", label: "Engage AI Clinical Copilot", category: "AI & Decision Support", description: "Generate contextual differential and diagnostic workup suggestions.", iconName: "BrainCircuit" },
  { value: "CALCULATE_RISK_SCORE", label: "Calculate Clinical Risk Score", category: "AI & Decision Support", description: "Compute Framingham, CHA2DS2-VASc, or ASCVD risk metrics.", iconName: "BarChart3" },
  { value: "SUGGEST_DIAGNOSIS", label: "Suggest Differential Diagnosis", category: "AI & Decision Support", description: "Post ranked diagnostic possibilities into EHR chart draft.", iconName: "Stethoscope" },
  { value: "SUGGEST_TREATMENT_PLAN", label: "Suggest Evidence-Based Treatment", category: "AI & Decision Support", description: "Pull CPIC/WHO therapy guideline recommendations.", iconName: "ClipboardList" },
  { value: "RUN_DRUG_INTERACTION_CHECK", label: "Run Drug Interaction Check", category: "AI & Decision Support", description: "Cross-reference all active medications for pharmacokinetic clashes.", iconName: "AlertTriangle" },
  { value: "RUN_PHARMACOGENOMIC_CHECK", label: "Run Pharmacogenomic Allele Check", category: "AI & Decision Support", description: "Match patient genome variants to drug metabolism risks.", iconName: "Dna" },
  { value: "IDENTIFY_CARE_GAPS", label: "Identify Care Gaps", category: "AI & Decision Support", description: "Highlight missing preventive interventions or diabetic eye/foot exams.", iconName: "BrainCircuit" },
  { value: "GENERATE_PROACTIVE_INSIGHT", label: "Generate Proactive Care Insight", category: "AI & Decision Support", description: "Surface longitudinal biometric pattern shifts to physician.", iconName: "BrainCircuit" },
  { value: "RUN_NEWS2_SCORE", label: "Run NEWS2 Deterioration Score", category: "AI & Decision Support", description: "Calculate standardized clinical acuity deterioration index.", iconName: "Activity" },
  { value: "SUGGEST_LAB_TESTS", label: "Suggest Diagnostic Lab Tests", category: "AI & Decision Support", description: "Recommend target biomarker panels based on symptoms.", iconName: "FlaskConical" },
  { value: "SUGGEST_IMAGING", label: "Suggest Imaging Studies", category: "AI & Decision Support", description: "Recommend appropriate imaging modality based on ACR criteria.", iconName: "Activity" },
  { value: "GENERATE_AI_EMAIL", label: "Draft AI-Personalized Email", category: "AI & Decision Support", description: "Draft email referencing patient history, last visit, and chief complaint.", iconName: "MessageSquare" },
  { value: "HANDOFF_TO_CONVERSATIONAL_AI", label: "Handoff to Conversational AI", category: "AI & Decision Support", description: "Hand conversation to an autonomous AI agent for qualification or recall.", iconName: "BrainCircuit" },
  { value: "GENERATE_CUSTOM_CODE_AI", label: "Generate Inline Custom Code via AI", category: "AI & Decision Support", description: "Execute AI-generated custom deterministic script transformation.", iconName: "FileText" },

  // ── Patient Engagement & Self-Service
  { value: "SEND_PATIENT_EDUCATION", label: "Send Patient Educational Material", category: "Patient Engagement & Self-Service", description: "Deliver condition-specific leaflets and lifestyle guides.", iconName: "FileText" },
  { value: "SEND_GOAL_REMINDER", label: "Send Health Goal Reminder", category: "Patient Engagement & Self-Service", description: "Nudge patient regarding daily physical activity or hydration targets.", iconName: "Target" },
  { value: "SEND_SATISFACTION_SURVEY", label: "Send Patient Satisfaction Survey", category: "Patient Engagement & Self-Service", description: "Request post-encounter feedback via SMS or app push.", iconName: "ClipboardCheck" },
  { value: "SEND_QUESTIONNAIRE", label: "Send Pre-Visit Questionnaire", category: "Patient Engagement & Self-Service", description: "Dispatch digital medical history form prior to consultation.", iconName: "ClipboardCheck" },
  { value: "CREATE_PATIENT_GOAL", label: "Create Patient Care Milestone", category: "Patient Engagement & Self-Service", description: "Establish structured target (e.g. HbA1c < 7.0%) in patient portal.", iconName: "Target" },
  { value: "TRACK_GOAL_PROGRESS", label: "Track Goal Progress", category: "Patient Engagement & Self-Service", description: "Record biometric advancement toward established targets.", iconName: "Trophy" },
  { value: "CREATE_REGISTRATION_PASS", label: "Create Digital Registration Pass", category: "Patient Engagement & Self-Service", description: "Generate QR code check-in pass for clinic turnstiles.", iconName: "BadgeCheck" },
  { value: "UPDATE_PATIENT_JOURNEY", label: "Update Patient Journey Milestone", category: "Patient Engagement & Self-Service", description: "Advance patient progress state on digital care timeline.", iconName: "ArrowRight" },
  { value: "SEND_REFILL_REMINDER", label: "Send Medication Refill Reminder", category: "Patient Engagement & Self-Service", description: "Prompt patient before prescription supplies run out.", iconName: "Pill" },
  { value: "SEND_APPOINTMENT_REMINDER", label: "Send Appointment Reminder", category: "Patient Engagement & Self-Service", description: "Dispatch 24h & 2h advance appointment notice.", iconName: "CalendarClock" },
  { value: "ADD_TO_SMART_LIST", label: "Add Patient to Smart List", category: "Patient Engagement & Self-Service", description: "Filter and segment patient into dynamic Smart List for bulk processing.", iconName: "ClipboardList" },

  // ── Telemedicine & Virtual Care
  { value: "INITIATE_VIDEO_CALL", label: "Initiate WebRTC Video Consultation", category: "Telemedicine & Virtual Care", description: "Establish secure high-definition clinical video session.", iconName: "Video" },
  { value: "SEND_TELEHEALTH_LINK", label: "Send Telehealth Access Link", category: "Telemedicine & Virtual Care", description: "Send encrypted one-time room link via SMS/email.", iconName: "Video" },
  { value: "CREATE_TELEHEALTH_ROOM", label: "Create Encrypted Telehealth Room", category: "Telemedicine & Virtual Care", description: "Spin up dedicated WebRTC peer-to-peer consultation space.", iconName: "Video" },
  { value: "START_TELEHEALTH_SESSION", label: "Start Telehealth Session", category: "Telemedicine & Virtual Care", description: "Mark room active and begin clinical encounter timer.", iconName: "Video" },
  { value: "END_TELEHEALTH_SESSION", label: "End Telehealth Session", category: "Telemedicine & Virtual Care", description: "Close video bridge, archive telemetry, and prompt summary.", iconName: "Video" },
  { value: "RECORD_CONSULTATION", label: "Record Consultation Audio/Video", category: "Telemedicine & Virtual Care", description: "Securely capture compliant encounter media with consent.", iconName: "FileVideo" },
  { value: "TRANSCRIBE_CONSULTATION", label: "Transcribe Consultation (Voice-to-Text)", category: "Telemedicine & Virtual Care", description: "Run automated clinical speech-to-text transcription.", iconName: "Mic" },
  { value: "GENERATE_TELEHEALTH_SUMMARY", label: "Generate Telehealth Visit Summary", category: "Telemedicine & Virtual Care", description: "Compile AI-assisted encounter summary and patient discharge plan.", iconName: "FileText" },
  { value: "PRESCRIBE_DURING_TELEHEALTH", label: "Issue E-Prescription in Telehealth", category: "Telemedicine & Virtual Care", description: "Directly authorize medications during video encounter.", iconName: "Pill" },
  { value: "ORDER_LAB_FROM_TELEHEALTH", label: "Order Lab from Telehealth", category: "Telemedicine & Virtual Care", description: "Submit lab requisition during virtual visit for home or clinic draw.", iconName: "FlaskConical" },
  { value: "SCHEDULE_FOLLOW_UP_TELEHEALTH", label: "Schedule Follow-up Telehealth Call", category: "Telemedicine & Virtual Care", description: "Book next virtual touchpoint before ending consultation.", iconName: "CalendarClock" },
  { value: "SEND_REMOTE_MONITORING_ALERT", label: "Send Remote Telemetry Alert", category: "Telemedicine & Virtual Care", description: "Notify clinical team of wearable biometric spikes.", iconName: "Radio" },
  { value: "SYNC_REMOTE_DEVICE_DATA", label: "Sync Remote Device Data", category: "Telemedicine & Virtual Care", description: "Ingest blood glucose meter or smart BP cuff logs.", iconName: "Radio" },
  { value: "SEND_E_PRESCRIPTION", label: "Transmit Digital E-Prescription", category: "Telemedicine & Virtual Care", description: "Dispatch e-script directly to hospital or partner pharmacy.", iconName: "Pill" },
  { value: "SEND_VIRTUAL_WAITING_ROOM_LINK", label: "Send Virtual Waiting Room Link", category: "Telemedicine & Virtual Care", description: "Queue patient into digital waiting lobby.", iconName: "MonitorSmartphone" },
  { value: "ENABLE_SCREEN_SHARING", label: "Enable Clinical Screen Sharing", category: "Telemedicine & Virtual Care", description: "Allow provider to review lab results or imaging on video.", iconName: "MonitorSmartphone" },
  { value: "ENABLE_DEVICE_CAMERA", label: "Enable Patient Device Camera", category: "Telemedicine & Virtual Care", description: "Request patient camera switch for dermatology inspection.", iconName: "Camera" },
  { value: "CAPTURE_PATIENT_PHOTO", label: "Capture Clinical Photo for Chart", category: "Telemedicine & Virtual Care", description: "Take high-res image of lesion or wound for EHR attachment.", iconName: "Camera" },

  // ── Remote Patient Monitoring & Devices
  { value: "CONNECT_DEVICE", label: "Pair & Connect Medical Device", category: "Remote Patient Monitoring & Devices", description: "Establish Bluetooth or cellular API bridge to patient sensor.", iconName: "Radio" },
  { value: "DISCONNECT_DEVICE", label: "Disconnect Medical Device", category: "Remote Patient Monitoring & Devices", description: "Unpair sensor at completion of monitoring cycle.", iconName: "WifiOff" },
  { value: "READ_DEVICE_DATA", label: "Read Device Telemetry Stream", category: "Remote Patient Monitoring & Devices", description: "Poll continuous vital signs from wearable sensor.", iconName: "Activity" },
  { value: "ENROLL_IN_RPM_PROGRAM", label: "Enroll in RPM Care Program", category: "Remote Patient Monitoring & Devices", description: "Set up protocol parameters for 30/90 day telemetry.", iconName: "Users" },
  { value: "COMPLETE_RPM_PROGRAM", label: "Complete RPM Care Program", category: "Remote Patient Monitoring & Devices", description: "Generate final monitoring outcome report and discharge.", iconName: "BadgeCheck" },
  { value: "SEND_RPM_REMINDER", label: "Send RPM Reading Reminder", category: "Remote Patient Monitoring & Devices", description: "Prompt patient to take morning fasting glucose/BP measurement.", iconName: "AlarmClock" },
  { value: "TRIGGER_RPM_CHECK_AI", label: "Trigger RPMCheck AI Chatbot", category: "Remote Patient Monitoring & Devices", description: "Deploy conversational AI to collect daily health updates and warn clinical teams.", iconName: "MessageSquare" },

  // ── Laboratory & Diagnostics
  { value: "CREATE_LAB_ORDER", label: "Create Clinical Lab Order", category: "Laboratory & Diagnostics", description: "Generate diagnostic requisition linked to patient encounter.", iconName: "FlaskConical" },
  { value: "CREATE_LAB_REQUEST", label: "Route Request to Laboratory", category: "Laboratory & Diagnostics", description: "Send order to LIS worklist for phlebotomy / accessioning.", iconName: "FlaskConical" },
  { value: "RECEIVE_SPECIMEN", label: "Receive & Log Specimen (Accessioning)", category: "Laboratory & Diagnostics", description: "Verify specimen container, volume, and integrity.", iconName: "TestTube" },
  { value: "VERIFY_BARCODE", label: "Scan & Verify Specimen Barcode", category: "Laboratory & Diagnostics", description: "Match primary specimen barcode to patient medical record.", iconName: "ScanLine" },
  { value: "ORDER_METABOLIC_PANEL", label: "Execute Metabolic Panel (BMP/CMP)", category: "Laboratory & Diagnostics", description: "Trigger comprehensive electrolytes, glucose, BUN, and creatinine test.", iconName: "FlaskRound" },
  { value: "ORDER_LIPID_PROFILE", label: "Execute Lipid Profile Panel", category: "Laboratory & Diagnostics", description: "Measure total cholesterol, HDL, LDL, and triglycerides.", iconName: "Activity" },
  { value: "ORDER_LIVER_FUNCTION_TEST", label: "Execute Liver Function Panel (LFT)", category: "Laboratory & Diagnostics", description: "Analyze ALT, AST, alkaline phosphatase, and total bilirubin.", iconName: "Activity" },
  { value: "ORDER_RENAL_FUNCTION_TEST", label: "Execute Renal Function Panel (RFT)", category: "Laboratory & Diagnostics", description: "Calculate serum creatinine, eGFR, and urea clearance.", iconName: "Activity" },
  { value: "ORDER_ELECTROLYTE_PANEL", label: "Execute Serum Electrolyte Panel", category: "Laboratory & Diagnostics", description: "Determine exact serum Na+, K+, Cl-, and CO2 levels.", iconName: "FlaskRound" },
  { value: "ORDER_TOXICOLOGY_SCREEN", label: "Execute Clinical Toxicology Screen", category: "Laboratory & Diagnostics", description: "Screen urine/blood for illicit drugs, acetaminophen, salicylates.", iconName: "TestTube" },
  { value: "ORDER_GENETIC_TEST", label: "Execute Molecular Genetic Analysis", category: "Laboratory & Diagnostics", description: "Send DNA specimen for targeted Sanger sequencing or qPCR.", iconName: "Dna" },
  { value: "VALIDATE_LAB_RESULT", label: "Validate Laboratory Test Result", category: "Laboratory & Diagnostics", description: "Medical technologist review and sign-off on analytical values.", iconName: "ShieldCheck" },
  { value: "FLAG_CRITICAL_LAB_VALUE", label: "Flag STAT Critical Lab Value", category: "Laboratory & Diagnostics", description: "Highlight life-threatening panic threshold in red across EHR.", iconName: "AlertTriangle" },
  { value: "FLAG_CRITICAL_BIOCHEMICAL_VALUE", label: "Flag Critical Biochemical Value", category: "Laboratory & Diagnostics", description: "Raise immediate biochemical alert requiring physician callback.", iconName: "AlertTriangle" },
  { value: "INTERPRET_BIOCHEMICAL_RESULTS", label: "Interpret Biochemical Profiles", category: "Laboratory & Diagnostics", description: "Apply biochemical algorithms to detect underlying metabolic derangements.", iconName: "Microscope" },
  { value: "CALCULATE_ANION_GAP", label: "Calculate Serum Anion Gap", category: "Laboratory & Diagnostics", description: "Compute [Na+] - ([Cl-] + [HCO3-]) to diagnose metabolic acidosis.", iconName: "BarChart3" },
  { value: "CALCULATE_OSMOLALITY", label: "Calculate Serum Osmolality & Gap", category: "Laboratory & Diagnostics", description: "Estimate serum tonicity for toxicology and hyponatremia evaluation.", iconName: "BarChart3" },
  { value: "CHECK_DRUG_LEVELS", label: "Check Therapeutic Drug Monitoring", category: "Laboratory & Diagnostics", description: "Verify digoxin, vancomycin, or lithium levels against therapeutic index.", iconName: "TestTube" },
  { value: "SUGGEST_BIOCHEMICAL_FOLLOWUP", label: "Suggest Biochemical Follow-up Testing", category: "Laboratory & Diagnostics", description: "Recommend repeat electrolytes or arterial blood gas (ABG).", iconName: "FlaskRound" },
  { value: "SEND_BIOCHEMICAL_ALERT", label: "Dispatch Biochemical Alert", category: "Laboratory & Diagnostics", description: "Send immediate push notification to attending medical team.", iconName: "Bell" },
  { value: "REFER_TO_BIOCHEMIST", label: "Refer to Clinical Biochemist", category: "Laboratory & Diagnostics", description: "Escalate complex metabolic pattern to specialist biochemist.", iconName: "Microscope" },
  { value: "CREATE_BIOCHEMICAL_CONSULT", label: "Create Biochemical Consult Report", category: "Laboratory & Diagnostics", description: "Draft formal expert interpretation into patient health record.", iconName: "FileText" },
  { value: "UPLOAD_IMAGING_STUDY", label: "Upload DICOM Imaging Study", category: "Laboratory & Diagnostics", description: "Link PACS radiographic images to radiology order.", iconName: "Activity" },
  { value: "CREATE_RADIOLOGY_REPORT", label: "Create Radiology Report", category: "Laboratory & Diagnostics", description: "Draft diagnostic imaging findings, impression, and BI-RADS score.", iconName: "FileText" },
  { value: "FLAG_CRITICAL_IMAGING_FINDING", label: "Flag Critical Imaging Finding", category: "Laboratory & Diagnostics", description: "Immediate notification for aortic dissection, hemorrhage, or perforation.", iconName: "AlertTriangle" },

  // ── Pharmacy & Therapeutics
  { value: "CREATE_PRESCRIPTION", label: "Draft Electronic Prescription", category: "Pharmacy & Therapeutics", description: "Formulate medication, dosage, route, frequency, and duration.", iconName: "Pill" },
  { value: "ENQUEUE_PHARMACY", label: "Enqueue in Pharmacy Dispensary Queue", category: "Pharmacy & Therapeutics", description: "Route verified order to dispensary fulfillment carousel.", iconName: "PackageCheck" },
  { value: "MARK_PRESCRIPTION_CLEARED", label: "Mark Prescription Safety Cleared", category: "Pharmacy & Therapeutics", description: "Pharmacist verifies allergy, renal dosing, and drug interaction safety.", iconName: "ShieldCheck" },
  { value: "ALERT_PHARMACIST_DISPENSE", label: "Alert Pharmacist to Dispense", category: "Pharmacy & Therapeutics", description: "Priority notification to pharmacy tech for rapid fill.", iconName: "Bell" },
  { value: "DISPENSE_MEDICATION", label: "Dispense Medication to Patient", category: "Pharmacy & Therapeutics", description: "Hand off medication with patient counseling instructions.", iconName: "PackageCheck" },
  { value: "ADMINISTER_MEDICATION", label: "Record Inpatient Administration", category: "Pharmacy & Therapeutics", description: "Log bedside administration time, dose, and nurse signature.", iconName: "Syringe" },
  { value: "CHECK_DRUG_INVENTORY", label: "Check Pharmacy Drug Inventory", category: "Pharmacy & Therapeutics", description: "Verify on-hand stock and lot availability in dispensary.", iconName: "PackageCheck" },
  { value: "REORDER_DRUG", label: "Initiate Drug Restock Purchase Order", category: "Pharmacy & Therapeutics", description: "Trigger wholesale order for low-inventory pharmaceutical item.", iconName: "Truck" },
  { value: "TRACK_BATCH_EXPIRY", label: "Track Batch & Expiration Date", category: "Pharmacy & Therapeutics", description: "Log batch serial number and enforce FEFO expiration management.", iconName: "CalendarClock" },
  { value: "VERIFY_BARCODE", label: "Verify Medication Barcode Scan", category: "Pharmacy & Therapeutics", description: "Five Rights verification (right patient, drug, dose, route, time).", iconName: "ScanLine" },
  { value: "RECONCILE_MEDICATION", label: "Perform Medication Reconciliation", category: "Pharmacy & Therapeutics", description: "Harmonize home prescriptions with inpatient hospital orders.", iconName: "ClipboardList" },

  // ── Specialist Referrals & MDT
  { value: "CREATE_SPECIALIST_REFERRAL", label: "Create Specialist Referral Requisition", category: "Specialist Referrals & MDT", description: "Draft referral packet with clinical summary, lab results, and imaging.", iconName: "Users" },
  { value: "ACCEPT_SPECIALIST_REFERRAL", label: "Accept Specialist Referral Intake", category: "Specialist Referrals & MDT", description: "Receiving department confirms patient suitability and triages urgency.", iconName: "UserCheck" },
  { value: "SCHEDULE_SPECIALIST_APPOINTMENT", label: "Schedule Specialist Appointment", category: "Specialist Referrals & MDT", description: "Book patient into specialist clinic calendar.", iconName: "CalendarClock" },
  { value: "COMPLETE_SPECIALIST_CONSULT", label: "Complete Specialist Consultation", category: "Specialist Referrals & MDT", description: "Attach formal consultation letter to patient health record.", iconName: "BadgeCheck" },
  { value: "SCHEDULE_MDT_MEETING", label: "Schedule Multidisciplinary Team Meeting", category: "Specialist Referrals & MDT", description: "Organize tumor board or complex case conference.", iconName: "CalendarClock" },
  { value: "INVITE_MDT_MEMBERS", label: "Invite MDT Clinicians & Specialists", category: "Specialist Referrals & MDT", description: "Send secure invitations to oncology, surgery, pathology, and radiology leads.", iconName: "Users" },
  { value: "GENERATE_MDT_SUMMARY", label: "Generate MDT Consensus Summary", category: "Specialist Referrals & MDT", description: "Document board recommendations and collaborative care pathway.", iconName: "FileText" },
  { value: "REQUEST_SECOND_OPINION", label: "Request Independent Second Opinion", category: "Specialist Referrals & MDT", description: "Transmit de-identified case docket to external subspecialist.", iconName: "Stethoscope" },
  { value: "UPLOAD_SECOND_OPINION_REPORT", label: "Upload Second Opinion Evaluation", category: "Specialist Referrals & MDT", description: "Attach outside expert evaluation into primary EHR chart.", iconName: "FileText" },
  { value: "CREATE_SHARED_CARE_PLAN", label: "Create Interdisciplinary Shared Care Plan", category: "Specialist Referrals & MDT", description: "Establish collaborative goals between primary and specialty teams.", iconName: "ClipboardList" },

  // ── Billing, RCM & Payments
  { value: "AUTO_CALCULATE_PRICE", label: "Auto-Calculate Order Pricing", category: "Billing, RCM & Payments", description: "Apply hospital fee schedule, tier discounts, and membership benefits.", iconName: "CreditCard" },
  { value: "CREATE_INVOICE", label: "Generate Itemized Invoice", category: "Billing, RCM & Payments", description: "Draft formal bill with procedure codes and tax breakdown.", iconName: "Receipt" },
  { value: "GENERATE_FISCAL_RECEIPT", label: "Generate Government Fiscal Receipt", category: "Billing, RCM & Payments", description: "Issue tax-compliant fiscal receipt for auditing.", iconName: "Receipt" },
  { value: "POST_GENERAL_LEDGER", label: "Post Transaction to General Ledger", category: "Billing, RCM & Payments", description: "Debit accounts receivable and credit departmental revenue center.", iconName: "Banknote" },
  { value: "PROCESS_PAYMENT", label: "Process Payment (Cash / Wallet / Card)", category: "Billing, RCM & Payments", description: "Authorize and settle payment through payment gateway.", iconName: "CreditCard" },
  { value: "ISSUE_REFUND", label: "Issue Refund to Patient", category: "Billing, RCM & Payments", description: "Reverse payment for cancelled service or overpayment.", iconName: "Wallet" },
  { value: "SEND_PAYMENT_LINK", label: "Send Payment Link", category: "Billing, RCM & Payments", description: "Dispatch SMS/email link for remote bill settlement.", iconName: "Send" },
  { value: "VERIFY_INSURANCE_ELIGIBILITY", label: "Verify Real-Time Insurance Eligibility", category: "Billing, RCM & Payments", description: "Query insurance carrier API for active co-pay and coverage policy.", iconName: "ShieldCheck" },
  { value: "SUBMIT_INSURANCE_CLAIM", label: "Submit Electronic Insurance Claim", category: "Billing, RCM & Payments", description: "Transmit EDI 837 healthcare claim to third-party administrator.", iconName: "Send" },
  { value: "CHECK_PRIOR_AUTHORIZATION", label: "Check Prior Authorization Status", category: "Billing, RCM & Payments", description: "Verify insurer pre-approval code for surgery, MRI, or specialty drugs.", iconName: "ShieldCheck" },
  { value: "UPDATE_PATIENT_BALANCE", label: "Update Patient Account Balance", category: "Billing, RCM & Payments", description: "Recalculate patient ledger after copayments or write-offs.", iconName: "Banknote" },
  { value: "CANCEL_SUBSCRIPTION", label: "Cancel Healthcare Subscription", category: "Billing, RCM & Payments", description: "Terminate monthly membership benefits and stop automated renewal.", iconName: "CalendarX" },
  { value: "TRIGGER_INSUREVERIFY_AI", label: "Trigger InsureVerify AI Verification", category: "Billing, RCM & Payments", description: "Deploy AI agent to contact patients prior to visit to collect and authenticate insurance.", iconName: "ShieldCheck" },

  // ── Notifications & Communication
  { value: "NOTIFY_PATIENT_PAYMENT_DUE", label: "Notify Patient of Payment Due", category: "Notifications & Communication", description: "Dispatch invoice notice via SMS, app notification, and email.", iconName: "Bell" },
  { value: "SEND_SMS_NOTIFICATION", label: "Send HIPAA-Aware SMS Notification", category: "Notifications & Communication", description: "Deliver direct mobile text alert compliant with privacy rules.", iconName: "Send" },
  { value: "SEND_EMAIL_NOTIFICATION", label: "Send Email Notification", category: "Notifications & Communication", description: "Dispatch formal HTML clinical or administrative email.", iconName: "Send" },
  { value: "SEND_PUSH_NOTIFICATION", label: "Send Mobile App Push Notification", category: "Notifications & Communication", description: "Deliver urgent native push alert to smartphone app.", iconName: "Bell" },
  { value: "SEND_WHATSAPP_MESSAGE", label: "Send WhatsApp Clinical Notification", category: "Notifications & Communication", description: "Transmit appointment or lab notification over WhatsApp API.", iconName: "MessageSquare" },
  { value: "NOTIFY_CARE_TEAM", label: "Notify Multidisciplinary Care Team", category: "Notifications & Communication", description: "Broadcast notification to all clinicians assigned to patient chart.", iconName: "Users" },
  { value: "ALERT_ATTENDING_PHYSICIAN", label: "Alert Attending Physician (STAT)", category: "Notifications & Communication", description: "Send immediate high-priority alert to primary attending doctor.", iconName: "Stethoscope" },
  { value: "ALERT_ATTENDING_NURSE", label: "Alert Attending Nurse", category: "Notifications & Communication", description: "Deliver audible bedside nursing station alert.", iconName: "Activity" },
  { value: "ESCALATE_TO_SUPERVISOR", label: "Escalate to Department Head (HOD)", category: "Notifications & Communication", description: "Notify clinical supervisor of protocol breach or safety hazard.", iconName: "ShieldAlert" },
  { value: "PAGE_ON_CALL_STAFF", label: "Page On-Call Emergency Staff", category: "Notifications & Communication", description: "Trigger hospital on-call paging system for immediate bedside response.", iconName: "Bell" },
  { value: "SEND_REMINDER", label: "Send Generic Care Reminder", category: "Notifications & Communication", description: "Dispatch scheduled check-in or protocol instruction reminder.", iconName: "Clock" },
  { value: "SEND_TELEHEALTH_REMINDER", label: "Send Telehealth Link Reminder", category: "Notifications & Communication", description: "Notify patient 10 minutes prior to virtual consultation.", iconName: "Video" },
  { value: "SEND_POST_CONSULT_SURVEY", label: "Send Post-Consultation Survey", category: "Notifications & Communication", description: "Collect patient feedback following telemedicine visit.", iconName: "ClipboardCheck" },
  { value: "SEND_EDUCATIONAL_VIDEO", label: "Send Educational Video Link", category: "Notifications & Communication", description: "Share dietary, insulin administration, or wound care video.", iconName: "FileVideo" },
  { value: "SEND_BIOCHEMICAL_EXPLANATION", label: "Send Biochemical Explanation Leaflet", category: "Notifications & Communication", description: "Deliver easy-to-understand explanation of abnormal lab values.", iconName: "FlaskRound" },
  { value: "NOTIFY_BIOCHEMIST", label: "Notify Clinical Biochemist", category: "Notifications & Communication", description: "Alert laboratory director to examine anomalous specimen results.", iconName: "Microscope" },
  { value: "NOTIFY_SPECIALIST", label: "Notify On-Duty Specialist", category: "Notifications & Communication", description: "Alert cardiologist, nephrologist, or endocrinologist on duty.", iconName: "Users" },
  { value: "ESCALATE_TO_BIOCHEMICAL_EXPERT", label: "Escalate to Laboratory Director", category: "Notifications & Communication", description: "High-tier escalation for rare metabolic/genetic diagnostic findings.", iconName: "Microscope" },

  // ── Documentation & Compliance
  { value: "CREATE_AUDIT_LOG", label: "Create Immutable Audit Log", category: "Documentation & Compliance", description: "Record cryptographically tamper-evident event in audit ledger.", iconName: "FileWarning" },
  { value: "CREATE_CLINICAL_NOTE", label: "Create Clinical Progress Note", category: "Documentation & Compliance", description: "Draft timestamped encounter entry into medical record.", iconName: "FileText" },
  { value: "GENERATE_SOAP_NOTE", label: "Generate Structured SOAP Note", category: "Documentation & Compliance", description: "Format Subjective, Objective, Assessment, and Plan documentation.", iconName: "FileText" },
  { value: "UPDATE_CARE_PLAN", label: "Update Clinical Care Plan", category: "Documentation & Compliance", description: "Revise active nursing and medical problem list in chart.", iconName: "ClipboardList" },
  { value: "RECORD_CONSENT", label: "Record Patient Medical Consent", category: "Documentation & Compliance", description: "Log signed consent with timestamp, witness, and signature metadata.", iconName: "ShieldCheck" },
  { value: "REVOKE_CONSENT", label: "Record Consent Revocation", category: "Documentation & Compliance", description: "Archive withdrawal of consent and restrict downstream data sharing.", iconName: "Lock" },
  { value: "FLAG_FOR_REVIEW", label: "Flag Record for Clinical Peer Review", category: "Documentation & Compliance", description: "Queue encounter chart for QA / morbidity and mortality review.", iconName: "FileWarning" },
  { value: "ESCALATE_TO_COMPLIANCE", label: "Escalate to Hospital Compliance Officer", category: "Documentation & Compliance", description: "Notify risk management of protocol violation or breach.", iconName: "ShieldAlert" },
  { value: "GENERATE_COMPLIANCE_REPORT", label: "Generate Regulatory Compliance Report", category: "Documentation & Compliance", description: "Compile statutory data export for healthcare regulatory audit.", iconName: "FileText" },
  { value: "LOCK_RECORD", label: "Lock & Seal Medical Record", category: "Documentation & Compliance", description: "Finalize document to prevent post-signature alterations.", iconName: "Lock" },
  { value: "DOCUMENT_MEDICAL_NECESSITY", label: "Document Medical Necessity", category: "Documentation & Compliance", description: "Generate structured justification verifying inpatient/observation level of care.", iconName: "FileText" },

  // ── Operational & Case Management
  { value: "ASSIGN_CARE_COORDINATOR", label: "Assign Dedicated Care Coordinator", category: "Operational & Case Management", description: "Designate nurse case manager to supervise patient trajectory.", iconName: "UserCheck" },
  { value: "CREATE_TASK", label: "Create Operational Workflow Task", category: "Operational & Case Management", description: "Assign specific clinical or administrative action to staff member.", iconName: "ClipboardList" },
  { value: "COMPLETE_TASK", label: "Mark Workflow Task Completed", category: "Operational & Case Management", description: "Update task status in department operational kanban board.", iconName: "BadgeCheck" },
  { value: "ESCALATE_TASK", label: "Escalate Overdue Workflow Task", category: "Operational & Case Management", description: "Bump priority and alert charge nurse of delayed milestone.", iconName: "AlertTriangle" },
  { value: "UPDATE_DASHBOARD", label: "Refresh Department Operational Board", category: "Operational & Case Management", description: "Broadcast real-time census and bed status update.", iconName: "BarChart3" },
  { value: "SEND_DAILY_REPORT", label: "Send Daily Operations Briefing", category: "Operational & Case Management", description: "Deliver daily census, throughput, and revenue summary to admin.", iconName: "Send" },
  { value: "SYNC_WITH_EHR", label: "Synchronize Data with Core EHR", category: "Operational & Case Management", description: "Commit FHIR/HL7 data payload into core hospital records.", iconName: "Globe" },
  { value: "EXPORT_DATA", label: "Export Clinical Dataset", category: "Operational & Case Management", description: "Generate encrypted patient data export for research or transfer.", iconName: "FileDown" },
  { value: "CREATE_CASE", label: "Open Clinical Episode Case", category: "Operational & Case Management", description: "Create formal incident or episode docket in hospital system.", iconName: "FilePlus" },
  { value: "CLOSE_CASE", label: "Close Clinical Episode Case", category: "Operational & Case Management", description: "Archive case file upon full clinical resolution and billing clearance.", iconName: "FileDown" },
  { value: "ASSIGN_PROVIDER", label: "Assign Attending Clinical Provider", category: "Operational & Case Management", description: "Designate primary physician or nurse practitioner to case.", iconName: "UserCheck" },
  { value: "CHANGE_PROVIDER", label: "Reassign Attending Provider", category: "Operational & Case Management", description: "Transfer case responsibility during shift handoff or escalation.", iconName: "UserCheck" },
  { value: "CREATE_IMAGING_ORDER", label: "Create Diagnostic Imaging Order", category: "Operational & Case Management", description: "Order radiographic or sonographic exam.", iconName: "Activity" },
  { value: "CREATE_REFERRAL", label: "Create Internal Department Referral", category: "Operational & Case Management", description: "Refer patient across internal outpatient or specialty departments.", iconName: "Users" },
  { value: "SCHEDULE_APPOINTMENT", label: "Schedule Patient Appointment", category: "Operational & Case Management", description: "Place appointment in clinic booking schedule.", iconName: "CalendarClock" },
  { value: "ADMIT_PATIENT", label: "Admit Patient to Facility", category: "Operational & Case Management", description: "Formally transition patient status to Inpatient.", iconName: "BedDouble" },
  { value: "ASSIGN_WARD_BED", label: "Assign Inpatient Bed & Ward Room", category: "Operational & Case Management", description: "Reserve physical inpatient bed and notify ward charge nurse.", iconName: "BedDouble" },
  { value: "INITIATE_DISCHARGE", label: "Initiate Inpatient Discharge Protocol", category: "Operational & Case Management", description: "Start medication reconciliation, patient education, and billing clearance.", iconName: "ArrowRight" },
  { value: "COMPLETE_DISCHARGE", label: "Finalize Inpatient Discharge", category: "Operational & Case Management", description: "Release bed occupancy and transition patient to post-discharge care.", iconName: "ArrowRight" },
  { value: "TRANSFER_PATIENT", label: "Transfer Patient Between Units", category: "Operational & Case Management", description: "Handoff patient between Emergency, ICU, and Medical Wards.", iconName: "ArrowRight" },
  { value: "UPDATE_CONTACT", label: "Update CRM Contact Record", category: "Operational & Case Management", description: "Synchronize patient demographics and pipeline stage in CRM.", iconName: "UserCog" },

  // ── Surgical & Perioperative
  { value: "SCHEDULE_SURGERY", label: "Schedule Operative Procedure", category: "Surgical & Perioperative", description: "Allocate operating theater and schedule surgical staff.", iconName: "CalendarClock" },
  { value: "REQUEST_PRE_OP_CLEARANCE", label: "Request Pre-Op Clearance", category: "Surgical & Perioperative", description: "Order EKG, labs, and anesthesia consult for surgical clearance.", iconName: "ClipboardList" },
  { value: "INITIATE_PACU_TRANSFER", label: "Initiate PACU Transfer", category: "Surgical & Perioperative", description: "Coordinate handoff from operating room to recovery unit.", iconName: "BedDouble" },

  // ── Population Health & Chronic Care
  { value: "TRIGGER_DISCHARGE_FOLLOW_AI", label: "Trigger DischargeFollow AI Call", category: "Population Health & Chronic Care", description: "Launch automated voice or chat check-in post-discharge to catch readmission risks.", iconName: "PhoneCall" },
];

// ─────────────────────────────────────────────────────────────
// 3. PRE-CONFIGURED END-TO-END WORKFLOW TEMPLATES
// ─────────────────────────────────────────────────────────────
// Pre-built "recipes" spanning multiple domains to handle the most 
// common complex clinical automations.
export const PREBUILT_WORKFLOW_TEMPLATES: PrebuiltWorkflowTemplate[] = [
  // ── LABORATORY & BIOCHEMICAL
  {
    id: "template-lab-end-to-end",
    name: "End-to-End Clinical Laboratory Diagnostic Pipeline",
    category: "Laboratory & Diagnostics",
    description: "Complete laboratory workflow covering order placement, price calculation, specimen accessioning, barcode verification, metabolic analysis, biochemical interpretation, and EHR updates.",
    triggerEvent: "LAB_ORDER_SUBMITTED",
    conditions: { department: "Laboratory", priority: "routine_or_stat" },
    steps: [
      { step: 1, action: "AUTO_CALCULATE_PRICE", label: "Calculate Lab Pricing", description: "Check laboratory fee catalog and membership coverage." },
      { step: 2, action: "CREATE_INVOICE", label: "Generate Lab Invoice", description: "Create itemized billing slip for ordered test panels." },
      { step: 3, action: "VERIFY_INSURANCE_ELIGIBILITY", label: "Verify Insurance", description: "Check third-party payer diagnostic coverage via InsureVerify API." },
      { step: 4, action: "CREATE_LAB_REQUEST", label: "Route to Lab Worklist", description: "Transmit requisition to phlebotomy & specimen collection station." },
      { step: 5, action: "RECEIVE_SPECIMEN", label: "Specimen Accessioning", description: "Phlebotomy logs sample collection tube, volume, and draw time." },
      { step: 6, action: "VERIFY_BARCODE", label: "Scan Sample Barcode", description: "Validate physical specimen barcode matches patient requisition." },
      { step: 7, action: "ORDER_METABOLIC_PANEL", label: "Execute Analyzer Assay", description: "Run automated biochemical / hematology analyzer assay." },
      { step: 8, action: "VALIDATE_LAB_RESULT", label: "Technologist Validation", description: "Medical technologist reviews raw values against biological reference ranges." },
      { step: 9, action: "INTERPRET_BIOCHEMICAL_RESULTS", label: "Biochemical Interpretation", description: "Algorithmic review of metabolic ratios and organ function markers." },
      { step: 10, action: "CALCULATE_ANION_GAP", label: "Calculate Anion Gap", description: "Compute metabolic parameters for acid-base equilibrium." },
      { step: 11, action: "UPDATE_PATIENT_JOURNEY", label: "Update Patient Journey", description: "Advance patient progress status to 'Diagnostics Complete'." },
      { step: 12, action: "CREATE_AUDIT_LOG", label: "CLIA / ISO Compliance Log", description: "Record complete chain-of-custody and analytical timestamp in audit ledger." },
    ],
  },
  {
    id: "template-critical-biochem-telehealth",
    name: "Critical Biochemical Alert & Rapid Telehealth Escalation",
    category: "Laboratory & Diagnostics",
    description: "Instantaneous emergency escalation pipeline triggered by panic lab values (severe hyperkalemia, profound hypoglycemia), triggering STAT notifications, chemist review, and virtual consultation.",
    triggerEvent: "BIOCHEMICAL_CRITICAL_VALUE",
    conditions: { severity: "critical", alertImmediate: true },
    steps: [
      { step: 1, action: "FLAG_CRITICAL_BIOCHEMICAL_VALUE", label: "Flag Panic Value in Red", description: "Set urgent flashing STAT indicator across all EHR interfaces." },
      { step: 2, action: "ALERT_ATTENDING_PHYSICIAN", label: "Alert Attending Physician (STAT)", description: "Dispatch audio/visual alarm and urgent push alert to primary doctor." },
      { step: 3, action: "ALERT_ATTENDING_NURSE", label: "Alert Bedside Nurse", description: "Trigger nursing station alarm for immediate bedside patient reassessment." },
      { step: 4, action: "PAGE_ON_CALL_STAFF", label: "Page On-Call Hospitalist", description: "Broadcast code notification to on-call emergency hospitalist." },
      { step: 5, action: "REFER_TO_BIOCHEMIST", label: "Clinical Chemist Consult", description: "Notify clinical biochemist for analytical verification & differential." },
      { step: 6, action: "CREATE_TELEHEALTH_ROOM", label: "Create Emergency Virtual Room", description: "Launch encrypted video bridge for urgent remote clinician consultation." },
      { step: 7, action: "SEND_TELEHEALTH_LINK", label: "Dispatch Telehealth Access Link", description: "Send video consultation bridge link to physician and patient emergency contact." },
      { step: 8, action: "INITIATE_VIDEO_CALL", label: "Initiate Emergency Video Call", description: "Connect on-call doctor with bedside clinician or remote patient." },
      { step: 9, action: "SEND_SMS_NOTIFICATION", label: "Dispatch STAT SMS", description: "Send immediate notification to patient emergency contact." },
      { step: 10, action: "CREATE_AUDIT_LOG", label: "Critical Escalation Audit", description: "Log compliance timestamp verifying critical value was communicated within 15 min." },
    ],
  },
  {
    id: "template-pharmacogenomic-advisory",
    name: "Molecular Genomics & Pharmacogenomics Advisory",
    category: "Laboratory & Diagnostics",
    description: "End-to-end pipeline connecting genetic variant detection with biochemist review, drug safety reconciliation, attending physician alerts, and clinical documentation.",
    triggerEvent: "PHARMACOGENOMIC_ALERT",
    conditions: { riskLevel: "high_toxicity_or_inefficacy" },
    steps: [
      { step: 1, action: "RUN_PHARMACOGENOMIC_CHECK", label: "CPIC Allele Verification", description: "Cross-reference detected CYP2C19, CYP2D6, or SLCO1B1 alleles with CPIC guidelines." },
      { step: 2, action: "REFER_TO_BIOCHEMIST", label: "Refer to Molecular Biologist", description: "Route profile to molecular laboratory director for expert clinical sign-off." },
      { step: 3, action: "CREATE_BIOCHEMICAL_CONSULT", label: "Draft Pharmacogenomic Report", description: "Generate formal precision medicine consult letter detailing variant implications." },
      { step: 4, action: "ALERT_ATTENDING_PHYSICIAN", label: "Alert Prescribing Physician", description: "Prompt clinician with alternative medication and dosing recommendations." },
      { step: 5, action: "RECONCILE_MEDICATION", label: "Reconcile Drug Regimen", description: "Substitute contra-indicated medication with genetically compatible alternative." },
      { step: 6, action: "NOTIFY_CARE_TEAM", label: "Notify Clinical Pharmacist", description: "Inform dispensing pharmacist of safety clearance and amended dosing." },
      { step: 7, action: "UPDATE_CARE_PLAN", label: "Update Precision Care Plan", description: "Add permanent pharmacogenomic contraindication to patient lifetime record." },
    ],
  },

  // ── TELEMEDICINE & VIRTUAL CARE
  {
    id: "template-telehealth-triage-intake",
    name: "Remote Telemedicine On-Demand Triage & E-Prescription",
    category: "Telemedicine & Virtual Care",
    description: "Automated virtual clinic journey from patient remote consultation request through virtual waiting room, video consult, NLP documentation, and e-prescribing.",
    triggerEvent: "REMOTE_CONSULTATION_REQUESTED",
    conditions: { channel: "telehealth_virtual_urgent_care" },
    steps: [
      { step: 1, action: "HANDOFF_TO_CONVERSATIONAL_AI", label: "Conversational Intake", description: "Autonomous AI agent conducts initial symptom collection and qualification." },
      { step: 2, action: "TRIGGER_AI_TRIAGE", label: "Virtual AI Triage", description: "Assess chief complaint, acuity, and contraindications for virtual care." },
      { step: 3, action: "CREATE_TELEHEALTH_ROOM", label: "Create WebRTC Virtual Room", description: "Spin up secure encrypted clinical video bridge." },
      { step: 4, action: "SEND_VIRTUAL_WAITING_ROOM_LINK", label: "Queue into Waiting Room", description: "Send patient link to virtual waiting room with queue position." },
      { step: 5, action: "ALERT_ATTENDING_PHYSICIAN", label: "Alert Available Provider", description: "Notify on-duty telemedicine physician of queued patient." },
      { step: 6, action: "INITIATE_VIDEO_CALL", label: "Launch Video Encounter", description: "Connect provider and patient in real-time video session." },
      { step: 7, action: "TRANSCRIBE_CONSULTATION", label: "Real-time Voice Scribe", description: "AI clinical transcription converts conversation to draft SOAP note." },
      { step: 8, action: "SEND_E_PRESCRIPTION", label: "Transmit E-Prescription", description: "Directly route authorized prescription to pharmacy fulfillment queue." },
      { step: 9, action: "AUTO_CALCULATE_PRICE", label: "Settle Visit Charges", description: "Calculate consultation fee and process digital payment." },
      { step: 10, action: "SEND_SATISFACTION_SURVEY", label: "Post-Visit Patient Survey", description: "Request feedback on video quality and provider care." },
    ],
  },
  {
    id: "template-no-show-recovery",
    name: "Virtual & In-Person No-Show Recovery Protocol",
    category: "Telemedicine & Virtual Care",
    description: "Recoups lost clinic time by engaging no-show patients with automated rescheduling links, financial invoicing for missed time, and care team alerts.",
    triggerEvent: "TELEHEALTH_NO_SHOW",
    conditions: { strictCancellationPolicy: true },
    steps: [
      { step: 1, action: "UPDATE_DASHBOARD", label: "Update Schedule Board", description: "Clear provider calendar slot for walk-in availability." },
      { step: 2, action: "SEND_QUESTIONNAIRE", label: "Send Reschedule Link", description: "Send automated SMS allowing patient to re-book easily." },
      { step: 3, action: "GENERATE_AI_EMAIL", label: "Draft Personalized Follow-up", description: "Draft email referencing missed appointment history via AI." },
      { step: 4, action: "CREATE_INVOICE", label: "Generate No-Show Fee", description: "Bill patient account for standard missed-appointment fee." },
      { step: 5, action: "NOTIFY_PATIENT_PAYMENT_DUE", label: "Send Fee Notification", description: "Inform patient of penalty and outline cancellation policy." },
      { step: 6, action: "CREATE_TASK", label: "Task Patient Navigator", description: "Assign staff task to call patient if they miss 2+ consecutive visits." },
    ],
  },

  // ── REMOTE PATIENT MONITORING & AI
  {
    id: "template-rpm-vitals-emergency",
    name: "RPM Vitals Critical Decompensation Escalation",
    category: "Remote Patient Monitoring & Devices",
    description: "Monitors continuous wearable telemetry; when critical vitals thresholds are breached, automatically triggers AI triage, nurse alerting, and immediate telehealth video outreach.",
    triggerEvent: "DEVICE_READING_CRITICAL",
    conditions: { alertTier: "tier_1_life_critical" },
    steps: [
      { step: 1, action: "SEND_REMOTE_MONITORING_ALERT", label: "Log Sensor Violation", description: "Capture exact biometric values and baseline divergence." },
      { step: 2, action: "TRIGGER_AI_TRIAGE", label: "AI Decompensation Analysis", description: "Analyze trend data to estimate immediate hospitalization risk." },
      { step: 3, action: "ALERT_ATTENDING_NURSE", label: "Alert Care Coordinator Nurse", description: "Route priority alert to assigned remote monitoring nurse." },
      { step: 4, action: "CREATE_TELEHEALTH_ROOM", label: "Generate Video Room", description: "Create immediate virtual outreach bridge." },
      { step: 5, action: "SEND_TELEHEALTH_LINK", label: "Send Outreach Link via SMS", description: "Urgent SMS link prompting patient to connect with nurse." },
      { step: 6, action: "INITIATE_VIDEO_CALL", label: "Conduct Video Assessment", description: "Visual inspection of patient respiratory effort, color, and mentation." },
      { step: 7, action: "CREATE_AUDIT_LOG", label: "Compliance & Safety Log", description: "Record RPM emergency intervention into clinical audit log." },
    ],
  },
  {
    id: "template-ai-chronic-care-gap",
    name: "AI Chronic Care Gap Identification & Outreach",
    category: "AI & Decision Support",
    description: "Detects missed screenings (e.g., HbA1c, retinopathy) in diabetic/hypertensive patients, auto-generating insights and initiating patient outreach to book labs/appointments.",
    triggerEvent: "AI_CARE_GAP_IDENTIFIED",
    conditions: { conditionType: "chronic_disease", severity: "moderate" },
    steps: [
      { step: 1, action: "GENERATE_PROACTIVE_INSIGHT", label: "Draft Insight Report", description: "Document missing care elements in patient's chart." },
      { step: 2, action: "CREATE_TASK", label: "Alert Care Coordinator", description: "Assign task to nurse to review AI-flagged care gap." },
      { step: 3, action: "SEND_PATIENT_EDUCATION", label: "Send Condition Material", description: "Dispatch tailored educational content via SMS/App." },
      { step: 4, action: "SCHEDULE_APPOINTMENT", label: "Propose Appointment", description: "Send automated scheduling link for preventative visit." },
      { step: 5, action: "CREATE_LAB_ORDER", label: "Pre-order Required Labs", description: "Queue routine screening labs (e.g., Lipid Panel, HbA1c)." },
      { step: 6, action: "ADD_TO_SMART_LIST", label: "Add to Outreach Smart List", description: "Filter patient into the diabetic recall workflow list." },
    ],
  },

  // ── INPATIENT, OPERATIONAL & MDT
  {
    id: "template-multidisciplinary-case-conference",
    name: "Specialist MDT & Second Opinion Routing",
    category: "Specialist Referrals & MDT",
    description: "Complex case referral pipeline triggering multidisciplinary conference scheduling, dossier distribution, video conference recording, and shared care plan creation.",
    triggerEvent: "SECOND_OPINION_REQUESTED",
    conditions: { caseComplexity: "tertiary_specialist_review" },
    steps: [
      { step: 1, action: "CREATE_SPECIALIST_REFERRAL", label: "Compile Clinical Dossier", description: "Aggregate chart, histopathology, and imaging for expert panel." },
      { step: 2, action: "SCHEDULE_MDT_MEETING", label: "Schedule Case Conference", description: "Coordinate multi-provider calendar availability." },
      { step: 3, action: "INVITE_MDT_MEMBERS", label: "Invite Specialist Panel", description: "Send secure invitations to oncology, surgery, pathology, and radiology leads." },
      { step: 4, action: "CREATE_TELEHEALTH_ROOM", label: "Create Virtual Boardroom", description: "Launch secure high-definition multi-party consultation bridge." },
      { step: 5, action: "RECORD_CONSULTATION", label: "Record Conference Deliberation", description: "Record clinical panel discussion for medical records." },
      { step: 6, action: "GENERATE_MDT_SUMMARY", label: "Draft Consensus Document", description: "Synthesize specialist consensus into actionable care strategy." },
      { step: 7, action: "CREATE_SHARED_CARE_PLAN", label: "Publish Shared Care Plan", description: "Commit unified multidisciplinary protocol to patient EHR." },
      { step: 8, action: "UPDATE_CARE_PLAN", label: "Notify Primary Care Clinician", description: "Update referring doctor with completed second opinion report." },
    ],
  },
  {
    id: "template-inpatient-admission-discharge",
    name: "Inpatient Admission to Discharge Lifecycle",
    category: "Operational & Case Management",
    description: "Orchestrates medical necessity logic, ward assignment, provider mapping, and the eventual discharge clearance and medication reconciliation process.",
    triggerEvent: "INPATIENT_ADMISSION",
    conditions: { wardType: "general_medical" },
    steps: [
      { step: 1, action: "CREATE_CASE", label: "Open Inpatient Episode", description: "Initialize formal inpatient DRG tracking record." },
      { step: 2, action: "DOCUMENT_MEDICAL_NECESSITY", label: "Verify Medical Necessity", description: "Auto-generate required justification for inpatient level of care." },
      { step: 3, action: "ASSIGN_WARD_BED", label: "Allocate Ward Bed", description: "Map patient to physical room and update census board." },
      { step: 4, action: "ASSIGN_PROVIDER", label: "Assign Hospitalist", description: "Link attending physician to the new case." },
      { step: 5, action: "RECONCILE_MEDICATION", label: "Admission Med-Rec", description: "Convert home medications to inpatient orders." },
      { step: 6, action: "UPDATE_DASHBOARD", label: "Update Nursing Dashboard", description: "Broadcast new patient arrival to nursing station screen." },
    ],
  },
  {
    id: "template-walk-in-triage",
    name: "Outpatient Walk-In Fast Triage & Billing",
    category: "Operational & Case Management",
    description: "Accelerates walk-in clinical flow from kiosk registration through AI vital sign triage, assigning a provider, and handling upfront self-pay/insurance copays.",
    triggerEvent: "WALK_IN_CHECKED_IN",
    conditions: { registrationSource: "clinic_kiosk" },
    steps: [
      { step: 1, action: "CREATE_REGISTRATION_PASS", label: "Issue Clinic Pass", description: "Print or text QR code for patient routing." },
      { step: 2, action: "TRIGGER_AI_TRIAGE", label: "Analyze Intake Symptoms", description: "Determine wait-time priority based on reported symptoms." },
      { step: 3, action: "VERIFY_INSURANCE_ELIGIBILITY", label: "Verify Active Coverage", description: "Check eligibility for copay vs self-pay routing." },
      { step: 4, action: "AUTO_CALCULATE_PRICE", label: "Calculate Triage Fee", description: "Generate upfront consultation charge." },
      { step: 5, action: "ASSIGN_PROVIDER", label: "Queue to Next Available", description: "Route patient to the shortest provider queue." },
    ],
  },
  {
    id: "template-stroke-imaging-protocol",
    name: "Code Stroke / Critical Imaging Protocol",
    category: "Laboratory & Diagnostics",
    description: "High-alert workflow for critical radiology findings (e.g. hemorrhage, ischemia), immediately paging neurology, organizing ICU transfer, and locking diagnostic records.",
    triggerEvent: "IMAGING_RESULT_CRITICAL",
    conditions: { findingType: "stroke_or_hemorrhage" },
    steps: [
      { step: 1, action: "FLAG_CRITICAL_IMAGING_FINDING", label: "Flag PACS Record", description: "Visually lock and highlight the critical scan in PACS." },
      { step: 2, action: "PAGE_ON_CALL_STAFF", label: "Page Code Stroke Team", description: "Immediate hospital-wide page to neurology and interventional team." },
      { step: 3, action: "ALERT_ATTENDING_PHYSICIAN", label: "Alert ED Attending", description: "Push critical images directly to ED doctor's mobile device." },
      { step: 4, action: "TRANSFER_TO_ICU", label: "Initiate ICU Transfer", description: "Prep neuro-ICU bed and request patient transport." },
      { step: 5, action: "CREATE_AUDIT_LOG", label: "Log JCAHO Timestamps", description: "Record exact door-to-read and read-to-alert timings." },
    ],
  },

  // ── PHARMACY, POST-DISCHARGE & BILLING
  {
    id: "template-prescription-dispense",
    name: "Automated Prescription-to-Dispense Pipeline",
    category: "Pharmacy & Therapeutics",
    description: "Standard hospital pharmacy automation executing price calculation, clinical drug interaction verification, electronic invoicing, and bedside dispensing notification.",
    triggerEvent: "PRESCRIPTION_SIGNED",
    conditions: { source: "outpatient_or_inpatient" },
    steps: [
      { step: 1, action: "AUTO_CALCULATE_PRICE", label: "Calculate Drug Price", description: "Compute cost based on dosage, unit packaging, and insurance tier." },
      { step: 2, action: "RUN_DRUG_INTERACTION_CHECK", label: "Verify Drug Safety", description: "Automated check against patient allergy list and current medications." },
      { step: 3, action: "CREATE_INVOICE", label: "Generate Dispensary Invoice", description: "Generate pharmacy billing ticket for cashier or insurance claim." },
      { step: 4, action: "ENQUEUE_PHARMACY", label: "Enqueue in Dispensary Carousel", description: "Transmit order to pharmacy dispensing queue." },
      { step: 5, action: "ALERT_PHARMACIST_DISPENSE", label: "Alert Pharmacy Technician", description: "Notify technician to pick, count, and label medication." },
      { step: 6, action: "NOTIFY_PATIENT_PAYMENT_DUE", label: "Notify Patient to Collect", description: "Send SMS or app notice when prescription is ready for pickup." },
    ],
  },
  {
    id: "template-post-discharge-rpm",
    name: "Post-Discharge Device Setup & AI RPM Enrollment",
    category: "Population Health & Chronic Care",
    description: "Transitions a patient from inpatient to home care, deploying devices, enrolling them in RPM, and utilizing conversational AI for day-3 follow-up.",
    triggerEvent: "DISCHARGE_COMPLETED",
    conditions: { requiresHomeMonitoring: true },
    steps: [
      { step: 1, action: "ENROLL_IN_RPM_PROGRAM", label: "Activate 30-Day RPM", description: "Enroll in post-discharge congestive heart failure / COPD tracking." },
      { step: 2, action: "CONNECT_DEVICE", label: "Provision Medical Devices", description: "Link mailed Bluetooth scale/BP cuff to patient profile." },
      { step: 3, action: "SEND_EDUCATIONAL_VIDEO", label: "Send Device Setup Guide", description: "Dispatch multimedia SMS explaining how to use home devices." },
      { step: 4, action: "SEND_RPM_REMINDER", label: "Setup Daily Prompts", description: "Schedule recurring morning SMS reminders for readings." },
      { step: 5, action: "TRIGGER_DISCHARGE_FOLLOW_AI", label: "Deploy Day-3 AI Call", description: "DischargeFollow AI voice agent checks on recovery and flags readmission risks." },
    ],
  },
  {
    id: "template-subscription-billing-recovery",
    name: "Concierge / Chronic Care Dunning & Churn Recovery",
    category: "Billing, RCM & Payments",
    description: "Financial workflow responding to a failed membership or remote monitoring subscription payment, triggering automated dunning, ledger updates, and eventual access suspension.",
    triggerEvent: "PAYMENT_FAILED",
    conditions: { paymentType: "recurring_subscription" },
    steps: [
      { step: 1, action: "SEND_PAYMENT_LINK", label: "Send Grace Period Link", description: "Email digital invoice with a 5-day grace period notice." },
      { step: 2, action: "SEND_SMS_NOTIFICATION", label: "Send Dunning SMS", description: "Text patient advising of failed transaction." },
      { step: 3, action: "UPDATE_PATIENT_BALANCE", label: "Mark Account Arrears", description: "Update ledger to reflect unpaid current month status." },
      { step: 4, action: "CREATE_TASK", label: "Task Billing Support", description: "Prompt financial counselor to call patient if unpaid after 3 days." },
      { step: 5, action: "CANCEL_SUBSCRIPTION", label: "Suspend Services", description: "Auto-suspend premium portal access if unpaid after 14 days." },
    ],
  },
];
