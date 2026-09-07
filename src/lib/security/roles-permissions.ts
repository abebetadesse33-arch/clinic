import { Role } from "../types/clinical";

// ============================================================================
// CLINICAL PERMISSIONS DEFINITIONS (RBAC / ABAC)
// ============================================================================

export type ClinicalPermission =
  // Diagnostic & Clinical Core
  | "view_clinical_cdss"
  | "validate_ai_triage"
  | "author_clinical_notes"
  | "use_voice_scribe"
  | "sign_21cfr11_audit"
  | "authorize_patient_admission"
  | "authorize_patient_discharge"
  
  // Prescribing & Pharmacotherapy
  | "prescribe_legend_drugs"
  | "prescribe_controlled_substances"
  | "sign_electronic_prescriptions"
  | "override_ddi_alerts"
  | "dispense_medications"
  | "manage_formulary_stock"
  
  // Orders & Diagnostics
  | "order_lab_tests"
  | "order_imaging_studies"
  | "order_genetic_sequencing"
  | "input_lab_results"
  | "sign_radiology_reports"
  | "sign_pathology_biopsies"
  | "interpret_abg_spirometry"
  
  // Multidisciplinary Specialties
  | "order_medical_nutrition"
  | "design_nutrition_protocols"
  | "prescribe_pt_exercises"
  | "score_berg_balance"
  | "conduct_psychological_eval"
  | "conduct_sdoh_screening"
  | "manage_social_resources"
  | "curate_biological_rules"
  | "conduct_genetic_counseling"
  | "execute_care_plan_tasks"
  | "execute_nursing_mar"
  
  // Communication & Encounters
  | "host_telemedicine_session"
  | "host_case_conference"
  | "send_clinical_team_messages"
  | "manage_closed_loop_referrals"
  | "operate_mobile_clinic"
  
  // Administrative & Governance
  | "manage_tenant_users"
  | "manage_hospital_operations"
  | "view_population_analytics"
  | "view_financial_rcm"
  | "inspect_audit_cryptochain"
  | "manage_system_encryption"
  
  // Patient Portal
  | "access_patient_portal"
  | "view_personal_health_records"
  | "schedule_patient_appointment"
  | "message_care_team";

// ============================================================================
// ROLE SCOPE & CAPABILITY DEFINITION
// ============================================================================

export interface RoleScopeDefinition {
  role: Role;
  label: string;
  category: "clinical" | "specialist" | "nursing" | "diagnostic" | "operations" | "patient" | "public";
  credentialBadge: string;
  prescribingLevel: "Full Schedule II-V" | "Collaborative Schedule III-V" | "Non-Controlled / Formulary" | "None";
  clinicalPrivilegesSummary: string;
  allowedPermissions: ClinicalPermission[];
  primaryNavRoutes: Array<{ label: string; path: string; iconName: string }>;
  accentColor: string;
  badgeBg: string;
  borderColor: string;
}

export const ROLE_CAPABILITIES_MATRIX: Record<Role, RoleScopeDefinition> = {
  physician: {
    role: "physician",
    label: "Physician (MD / DO)",
    category: "clinical",
    credentialBadge: "Attending Medical Doctor",
    prescribingLevel: "Full Schedule II-V",
    clinicalPrivilegesSummary: "Full clinical authority, 21 CFR Part 11 sign-offs, e-prescribing, AI triage validation, admissions & discharge orders.",
    allowedPermissions: [
      "view_clinical_cdss",
      "validate_ai_triage",
      "author_clinical_notes",
      "use_voice_scribe",
      "sign_21cfr11_audit",
      "authorize_patient_admission",
      "authorize_patient_discharge",
      "prescribe_legend_drugs",
      "prescribe_controlled_substances",
      "sign_electronic_prescriptions",
      "override_ddi_alerts",
      "order_lab_tests",
      "order_imaging_studies",
      "order_genetic_sequencing",
      "order_medical_nutrition",
      "prescribe_pt_exercises",
      "host_telemedicine_session",
      "host_case_conference",
      "send_clinical_team_messages",
      "manage_closed_loop_referrals",
      "execute_care_plan_tasks",
      "operate_mobile_clinic",
    ],
    primaryNavRoutes: [
      { label: "Clinical CDSS", path: "/", iconName: "Stethoscope" },
      { label: "Patient 360", path: "/patients", iconName: "Users" },
      { label: "E-Prescriptions", path: "/prescriptions", iconName: "FileCheck" },
      { label: "AI Voice Scribe", path: "/clinical/voice-scribe", iconName: "Mic" },
      { label: "AI Orchestrator", path: "/clinical/ai-orchestrator", iconName: "Sparkles" },
      { label: "Care Plans", path: "/care-plan", iconName: "ClipboardList" },
    ],
    accentColor: "text-teal-400",
    badgeBg: "bg-teal-500/15",
    borderColor: "border-teal-500/30",
  },

  nurse_practitioner: {
    role: "nurse_practitioner",
    label: "Nurse Practitioner (NP / DNP)",
    category: "clinical",
    credentialBadge: "Advanced Practice Clinician",
    prescribingLevel: "Collaborative Schedule III-V",
    clinicalPrivilegesSummary: "Primary care diagnostic evaluations, prescriptive practice within collaborative scope, care plan development.",
    allowedPermissions: [
      "view_clinical_cdss",
      "validate_ai_triage",
      "author_clinical_notes",
      "use_voice_scribe",
      "sign_21cfr11_audit",
      "prescribe_legend_drugs",
      "sign_electronic_prescriptions",
      "override_ddi_alerts",
      "order_lab_tests",
      "order_imaging_studies",
      "order_medical_nutrition",
      "prescribe_pt_exercises",
      "host_telemedicine_session",
      "host_case_conference",
      "send_clinical_team_messages",
      "manage_closed_loop_referrals",
      "execute_care_plan_tasks",
    ],
    primaryNavRoutes: [
      { label: "Clinical CDSS", path: "/", iconName: "Stethoscope" },
      { label: "Patient 360", path: "/patients", iconName: "Users" },
      { label: "E-Prescriptions", path: "/prescriptions", iconName: "FileCheck" },
      { label: "AI Voice Scribe", path: "/clinical/voice-scribe", iconName: "Mic" },
      { label: "Care Plans", path: "/care-plan", iconName: "ClipboardList" },
    ],
    accentColor: "text-teal-300",
    badgeBg: "bg-teal-500/15",
    borderColor: "border-teal-500/30",
  },

  triage_staff: {
    role: "triage_staff",
    label: "Triage Specialist / Intake Coordinator",
    category: "clinical",
    credentialBadge: "Clinical Triage & Patient Routing",
    prescribingLevel: "None",
    clinicalPrivilegesSummary: "Symptom assessment, severity scoring, priority triage tagging, provider/department routing, appointment scheduling.",
    allowedPermissions: [
      "view_clinical_cdss",
      "validate_ai_triage",
      "author_clinical_notes",
      "send_clinical_team_messages",
      "manage_closed_loop_referrals",
      "execute_care_plan_tasks",
      "host_telemedicine_session",
    ],
    primaryNavRoutes: [
      { label: "Triage Workspace", path: "/triage", iconName: "Sparkles" },
      { label: "Appointments Hub", path: "/appointments", iconName: "Calendar" },
      { label: "Patient Directory", path: "/patients", iconName: "Users" },
      { label: "Clinical Cases", path: "/cases", iconName: "FolderOpen" },
    ],
    accentColor: "text-amber-300",
    badgeBg: "bg-amber-500/15",
    borderColor: "border-amber-500/30",
  },

  nurse: {
    role: "nurse",
    label: "Registered Nurse (RN / BSN)",
    category: "nursing",
    credentialBadge: "Inpatient / Ambulatory RN",
    prescribingLevel: "None",
    clinicalPrivilegesSummary: "Vitals acquisition, MAR medication administration, wound care, inpatient bedside care, triage scoring.",
    allowedPermissions: [
      "view_clinical_cdss",
      "author_clinical_notes",
      "execute_nursing_mar",
      "execute_care_plan_tasks",
      "send_clinical_team_messages",
      "host_case_conference",
      "operate_mobile_clinic",
    ],
    primaryNavRoutes: [
      { label: "Nursing Workstation", path: "/", iconName: "HeartPulse" },
      { label: "Patient Queue", path: "/patients", iconName: "Users" },
      { label: "Clinical Tasks", path: "/tasks", iconName: "CheckSquare" },
      { label: "Care Plans", path: "/care-plan", iconName: "ClipboardList" },
      { label: "Team Messages", path: "/messages", iconName: "MessageSquare" },
    ],
    accentColor: "text-rose-400",
    badgeBg: "bg-rose-500/15",
    borderColor: "border-rose-500/30",
  },

  pharmacist: {
    role: "pharmacist",
    label: "Clinical Pharmacist (PharmD, BCPS)",
    category: "specialist",
    credentialBadge: "Doctor of Pharmacy",
    prescribingLevel: "Non-Controlled / Formulary",
    clinicalPrivilegesSummary: "Pharmacotherapy management, Drug-Drug Interaction overrides, renal dose adjustments, dispensing, CPIC guidelines.",
    allowedPermissions: [
      "view_clinical_cdss",
      "override_ddi_alerts",
      "dispense_medications",
      "manage_formulary_stock",
      "author_clinical_notes",
      "send_clinical_team_messages",
      "host_case_conference",
      "execute_care_plan_tasks",
    ],
    primaryNavRoutes: [
      { label: "Pharmacy & DDI Suite", path: "/pharmacy", iconName: "Pill" },
      { label: "Catalog Management Hub", path: "/clinical/catalog", iconName: "Database" },
      { label: "Prescription Queue", path: "/prescriptions", iconName: "FileCheck" },
      { label: "Patient 360", path: "/patients", iconName: "Users" },
      { label: "Clinical CDSS", path: "/", iconName: "Activity" },
      { label: "Care Plans", path: "/care-plan", iconName: "ClipboardList" },
    ],
    accentColor: "text-cyan-400",
    badgeBg: "bg-cyan-500/15",
    borderColor: "border-cyan-500/30",
  },

  dietitian: {
    role: "dietitian",
    label: "Clinical Dietitian (RD, CDCES)",
    category: "specialist",
    credentialBadge: "Registered Dietitian Nutritionist",
    prescribingLevel: "None",
    clinicalPrivilegesSummary: "Medical Nutrition Therapy (MNT), diabetic renal macronutrient planning, food security accommodations.",
    allowedPermissions: [
      "view_clinical_cdss",
      "order_medical_nutrition",
      "design_nutrition_protocols",
      "author_clinical_notes",
      "send_clinical_team_messages",
      "host_case_conference",
      "execute_care_plan_tasks",
    ],
    primaryNavRoutes: [
      { label: "MNT Nutrition Studio", path: "/nutrition", iconName: "Utensils" },
      { label: "Lifestyle Protocols", path: "/lifestyle", iconName: "HeartPulse" },
      { label: "Patient 360", path: "/patients", iconName: "Users" },
      { label: "Care Plans", path: "/care-plan", iconName: "ClipboardList" },
      { label: "Tasks", path: "/tasks", iconName: "CheckSquare" },
    ],
    accentColor: "text-lime-400",
    badgeBg: "bg-lime-500/15",
    borderColor: "border-lime-500/30",
  },

  physiotherapist: {
    role: "physiotherapist",
    label: "Physiotherapist (DPT, PT)",
    category: "specialist",
    credentialBadge: "Doctor of Physical Therapy",
    prescribingLevel: "None",
    clinicalPrivilegesSummary: "Functional mobility diagnostics, Berg Balance assessment, Range of Motion exercises, fall risk mitigation.",
    allowedPermissions: [
      "view_clinical_cdss",
      "prescribe_pt_exercises",
      "score_berg_balance",
      "author_clinical_notes",
      "send_clinical_team_messages",
      "host_case_conference",
      "execute_care_plan_tasks",
    ],
    primaryNavRoutes: [
      { label: "Physiotherapy Rehab", path: "/physiotherapy", iconName: "Activity" },
      { label: "Patient 360", path: "/patients", iconName: "Users" },
      { label: "Care Plans", path: "/care-plan", iconName: "ClipboardList" },
      { label: "Tasks", path: "/tasks", iconName: "CheckSquare" },
      { label: "Tele-Rehab", path: "/telemedicine/room-pt-01", iconName: "Video" },
    ],
    accentColor: "text-emerald-400",
    badgeBg: "bg-emerald-500/15",
    borderColor: "border-emerald-500/30",
  },

  occupational_therapist: {
    role: "occupational_therapist",
    label: "Occupational Therapist (OTD, OTR/L)",
    category: "specialist",
    credentialBadge: "Licensed Occupational Therapist",
    prescribingLevel: "None",
    clinicalPrivilegesSummary: "Activities of Daily Living (ADL) ergonomic evaluation, adaptive equipment prescriptions, home safety audits.",
    allowedPermissions: [
      "view_clinical_cdss",
      "prescribe_pt_exercises",
      "author_clinical_notes",
      "send_clinical_team_messages",
      "host_case_conference",
      "execute_care_plan_tasks",
    ],
    primaryNavRoutes: [
      { label: "OT & Rehab Studio", path: "/physiotherapy", iconName: "Activity" },
      { label: "Patient 360", path: "/patients", iconName: "Users" },
      { label: "Care Plans", path: "/care-plan", iconName: "ClipboardList" },
      { label: "Tasks", path: "/tasks", iconName: "CheckSquare" },
    ],
    accentColor: "text-amber-400",
    badgeBg: "bg-amber-500/15",
    borderColor: "border-amber-500/30",
  },

  social_worker: {
    role: "social_worker",
    label: "Medical Social Worker (MSW, LCSW)",
    category: "specialist",
    credentialBadge: "Licensed Clinical Social Worker",
    prescribingLevel: "None",
    clinicalPrivilegesSummary: "Social Determinants of Health (PRAPARE) screening, housing and food assistance coordination, community referrals.",
    allowedPermissions: [
      "view_clinical_cdss",
      "conduct_sdoh_screening",
      "manage_social_resources",
      "author_clinical_notes",
      "manage_closed_loop_referrals",
      "send_clinical_team_messages",
      "host_case_conference",
      "execute_care_plan_tasks",
    ],
    primaryNavRoutes: [
      { label: "SDOH Navigation", path: "/social-work", iconName: "HeartHandshake" },
      { label: "Closed-Loop Referrals", path: "/referrals", iconName: "Workflow" },
      { label: "Patient 360", path: "/patients", iconName: "Users" },
      { label: "Care Plans", path: "/care-plan", iconName: "ClipboardList" },
    ],
    accentColor: "text-orange-400",
    badgeBg: "bg-orange-500/15",
    borderColor: "border-orange-500/30",
  },

  psychologist: {
    role: "psychologist",
    label: "Clinical Psychologist (PsyD, PhD)",
    category: "specialist",
    credentialBadge: "Licensed Clinical Psychologist",
    prescribingLevel: "None",
    clinicalPrivilegesSummary: "PHQ-9, GAD-7 psychometrics, behavioral health interventions, adherence counseling, mindfulness protocols.",
    allowedPermissions: [
      "view_clinical_cdss",
      "conduct_psychological_eval",
      "author_clinical_notes",
      "send_clinical_team_messages",
      "host_case_conference",
      "host_telemedicine_session",
      "execute_care_plan_tasks",
    ],
    primaryNavRoutes: [
      { label: "Psychology Studio", path: "/psychologist", iconName: "Brain" },
      { label: "Lifestyle Mind-Body", path: "/lifestyle", iconName: "HeartPulse" },
      { label: "Patient 360", path: "/patients", iconName: "Users" },
      { label: "Tele-Mental Health", path: "/telemedicine/room-psych-01", iconName: "Video" },
      { label: "Care Plans", path: "/care-plan", iconName: "ClipboardList" },
    ],
    accentColor: "text-fuchsia-400",
    badgeBg: "bg-fuchsia-500/15",
    borderColor: "border-fuchsia-500/30",
  },

  biologist: {
    role: "biologist",
    label: "Molecular Biologist (PhD)",
    category: "specialist",
    credentialBadge: "Doctor of Molecular Biology",
    prescribingLevel: "None",
    clinicalPrivilegesSummary: "Biochemical pathway modeling, enzyme kinetic validation, pharmacogenomic rule engine management.",
    allowedPermissions: [
      "view_clinical_cdss",
      "curate_biological_rules",
      "author_clinical_notes",
      "send_clinical_team_messages",
      "host_case_conference",
    ],
    primaryNavRoutes: [
      { label: "Biochemical Rules", path: "/biologist", iconName: "Sparkles" },
      { label: "Genomic Profiles", path: "/patients", iconName: "Dna" },
      { label: "AI Orchestrator", path: "/clinical/ai-orchestrator", iconName: "Cpu" },
      { label: "Case Conference", path: "/workflows/case-conference", iconName: "Users" },
    ],
    accentColor: "text-teal-400",
    badgeBg: "bg-teal-500/15",
    borderColor: "border-teal-500/30",
  },

  genetic_counselor: {
    role: "genetic_counselor",
    label: "Genetic Counselor (MS, CGC)",
    category: "specialist",
    credentialBadge: "Certified Genetic Counselor",
    prescribingLevel: "None",
    clinicalPrivilegesSummary: "Pharmacogenomics (PGx), CPIC level A/B interpretation, hereditary risk pedigree analysis.",
    allowedPermissions: [
      "view_clinical_cdss",
      "conduct_genetic_counseling",
      "curate_biological_rules",
      "author_clinical_notes",
      "send_clinical_team_messages",
      "host_case_conference",
    ],
    primaryNavRoutes: [
      { label: "Genomics & PGx", path: "/biologist", iconName: "Dna" },
      { label: "Patient 360", path: "/patients", iconName: "Users" },
      { label: "Case Conference", path: "/workflows/case-conference", iconName: "Users" },
      { label: "Telehealth", path: "/telemedicine/room-gen-01", iconName: "Video" },
    ],
    accentColor: "text-violet-400",
    badgeBg: "bg-violet-500/15",
    borderColor: "border-violet-500/30",
  },

  radiologist: {
    role: "radiologist",
    label: "Diagnostic Radiologist (MD)",
    category: "diagnostic",
    credentialBadge: "Board Certified Radiologist",
    prescribingLevel: "None",
    clinicalPrivilegesSummary: "PACS diagnostic imaging interpretation (X-Ray, CT, MRI), critical image alerts, radiomics reports.",
    allowedPermissions: [
      "view_clinical_cdss",
      "sign_radiology_reports",
      "author_clinical_notes",
      "send_clinical_team_messages",
      "host_case_conference",
    ],
    primaryNavRoutes: [
      { label: "Imaging PACS Worklist", path: "/patients", iconName: "FileImage" },
      { label: "Clinical CDSS", path: "/", iconName: "Activity" },
      { label: "AI Orchestrator", path: "/clinical/ai-orchestrator", iconName: "Sparkles" },
      { label: "Case Conference", path: "/workflows/case-conference", iconName: "Users" },
    ],
    accentColor: "text-indigo-400",
    badgeBg: "bg-indigo-500/15",
    borderColor: "border-indigo-500/30",
  },

  pathologist: {
    role: "pathologist",
    label: "Pathologist (MD)",
    category: "diagnostic",
    credentialBadge: "Anatomic & Clinical Pathologist",
    prescribingLevel: "None",
    clinicalPrivilegesSummary: "Histopathology slide reviews, tissue biopsy evaluations, tumor board clinical reporting.",
    allowedPermissions: [
      "view_clinical_cdss",
      "sign_pathology_biopsies",
      "author_clinical_notes",
      "send_clinical_team_messages",
      "host_case_conference",
    ],
    primaryNavRoutes: [
      { label: "Pathology & Biopsies", path: "/patients", iconName: "Dna" },
      { label: "Clinical CDSS", path: "/", iconName: "Activity" },
      { label: "Case Conference", path: "/workflows/case-conference", iconName: "Users" },
    ],
    accentColor: "text-purple-400",
    badgeBg: "bg-purple-500/15",
    borderColor: "border-purple-500/30",
  },

  lab_technician: {
    role: "lab_technician",
    label: "Medical Lab Scientist (MLS / MLT)",
    category: "diagnostic",
    credentialBadge: "Medical Laboratory Scientist",
    prescribingLevel: "None",
    clinicalPrivilegesSummary: "Analyzer verification, chemistry / hematology result entry, critical alert flagging.",
    allowedPermissions: [
      "view_clinical_cdss",
      "input_lab_results",
      "send_clinical_team_messages",
    ],
    primaryNavRoutes: [
      { label: "LIS Lab Workstation", path: "/patients", iconName: "TestTube" },
      { label: "Catalog Management Hub", path: "/clinical/catalog", iconName: "Database" },
      { label: "Lab Orders Queue", path: "/prescriptions", iconName: "FileCheck" },
      { label: "Clinical Tasks", path: "/tasks", iconName: "CheckSquare" },
    ],
    accentColor: "text-sky-400",
    badgeBg: "bg-sky-500/15",
    borderColor: "border-sky-500/30",
  },

  respiratory_therapist: {
    role: "respiratory_therapist",
    label: "Respiratory Therapist (RRT-ACCS)",
    category: "specialist",
    credentialBadge: "Adult Critical Care Specialist",
    prescribingLevel: "None",
    clinicalPrivilegesSummary: "Arterial Blood Gas (ABG) interpretation, mechanical ventilation titration, spirometry.",
    allowedPermissions: [
      "view_clinical_cdss",
      "interpret_abg_spirometry",
      "author_clinical_notes",
      "send_clinical_team_messages",
      "host_case_conference",
    ],
    primaryNavRoutes: [
      { label: "Pulmonary Suite", path: "/", iconName: "Activity" },
      { label: "Patient 360", path: "/patients", iconName: "Users" },
      { label: "Care Plans", path: "/care-plan", iconName: "ClipboardList" },
      { label: "Tasks", path: "/tasks", iconName: "CheckSquare" },
    ],
    accentColor: "text-blue-400",
    badgeBg: "bg-blue-500/15",
    borderColor: "border-blue-500/30",
  },

  care_coordinator: {
    role: "care_coordinator",
    label: "Care Coordinator (RN-BC, CCM)",
    category: "clinical",
    credentialBadge: "Certified Case Manager",
    prescribingLevel: "None",
    clinicalPrivilegesSummary: "Care gap closures, transition of care protocols, post-discharge follow-ups, referral loops.",
    allowedPermissions: [
      "view_clinical_cdss",
      "manage_closed_loop_referrals",
      "execute_care_plan_tasks",
      "author_clinical_notes",
      "send_clinical_team_messages",
      "host_case_conference",
    ],
    primaryNavRoutes: [
      { label: "Care Transitions Hub", path: "/care-plan", iconName: "ClipboardList" },
      { label: "Closed-Loop Referrals", path: "/referrals", iconName: "Workflow" },
      { label: "Patient Cohort", path: "/patients", iconName: "Users" },
      { label: "Tasks & Handoffs", path: "/tasks", iconName: "CheckSquare" },
    ],
    accentColor: "text-emerald-400",
    badgeBg: "bg-emerald-500/15",
    borderColor: "border-emerald-500/30",
  },

  system_admin: {
    role: "system_admin",
    label: "Enterprise System Administrator",
    category: "operations",
    credentialBadge: "Root Infrastructure Admin",
    prescribingLevel: "None",
    clinicalPrivilegesSummary: "Tenant provisioning, database encryption, cryptographic ledger audit, server health telemetry.",
    allowedPermissions: [
      "manage_tenant_users",
      "manage_hospital_operations",
      "view_population_analytics",
      "view_financial_rcm",
      "inspect_audit_cryptochain",
      "manage_system_encryption",
      "view_clinical_cdss",
    ],
    primaryNavRoutes: [
      { label: "Enterprise Command", path: "/admin", iconName: "ShieldAlert" },
      { label: "Catalog Management Hub", path: "/clinical/catalog", iconName: "Database" },
      { label: "Workflow Operations & Gates", path: "/admin/workflows", iconName: "Workflow" },
      { label: "21 CFR 11 Audit Trail", path: "/audit", iconName: "ShieldCheck" },
      { label: "Population Health", path: "/admin/population-health", iconName: "BarChart3" },
      { label: "Live Hospital Beds", path: "/admin/live-operations", iconName: "Bed" },
    ],
    accentColor: "text-purple-400",
    badgeBg: "bg-purple-500/15",
    borderColor: "border-purple-500/30",
  },

  tenant_admin: {
    role: "tenant_admin",
    label: "Operations Administrator",
    category: "operations",
    credentialBadge: "Hospital Operations Director",
    prescribingLevel: "None",
    clinicalPrivilegesSummary: "Clinical staff onboarding, department allocations, bed occupancy telemetry, RCM claims tracking.",
    allowedPermissions: [
      "manage_tenant_users",
      "manage_hospital_operations",
      "view_population_analytics",
      "view_financial_rcm",
      "inspect_audit_cryptochain",
      "view_clinical_cdss",
    ],
    primaryNavRoutes: [
      { label: "Command Operations", path: "/admin", iconName: "Building2" },
      { label: "Workflows & Gates", path: "/admin/workflows", iconName: "Workflow" },
      { label: "Bed Telemetry", path: "/admin/live-operations", iconName: "Bed" },
      { label: "Population Health", path: "/admin/population-health", iconName: "BarChart3" },
      { label: "Audit Log", path: "/audit", iconName: "ShieldCheck" },
    ],
    accentColor: "text-blue-400",
    badgeBg: "bg-blue-500/15",
    borderColor: "border-blue-500/30",
  },

  auditor: {
    role: "auditor",
    label: "Compliance & Regulatory Auditor",
    category: "operations",
    credentialBadge: "HIPAA / 21 CFR Part 11 Auditor",
    prescribingLevel: "None",
    clinicalPrivilegesSummary: "Immutable SHA-256 hash-chain inspection, electronic signature validation, access log auditing.",
    allowedPermissions: [
      "inspect_audit_cryptochain",
      "view_population_analytics",
      "view_clinical_cdss",
    ],
    primaryNavRoutes: [
      { label: "Audit Trail Ledger", path: "/audit", iconName: "ShieldCheck" },
      { label: "Workflows & Gates", path: "/admin/workflows", iconName: "Workflow" },
      { label: "Regulatory Overview", path: "/admin", iconName: "Shield" },
      { label: "Population Health", path: "/admin/population-health", iconName: "BarChart3" },
    ],
    accentColor: "text-amber-400",
    badgeBg: "bg-amber-500/15",
    borderColor: "border-amber-500/30",
  },

  patient: {
    role: "patient",
    label: "Patient Account",
    category: "patient",
    credentialBadge: "Verified Patient Account",
    prescribingLevel: "None",
    clinicalPrivilegesSummary: "Personal health record access, lab reports, active prescriptions, appointments, direct messaging.",
    allowedPermissions: [
      "access_patient_portal",
      "view_personal_health_records",
      "schedule_patient_appointment",
      "message_care_team",
    ],
    primaryNavRoutes: [
      { label: "My Health Portal", path: "/patient/dashboard", iconName: "User" },
      { label: "My Submitted Cases", path: "/patient/cases", iconName: "FolderOpen" },
      { label: "Submit Health Case", path: "/patient/submit-case", iconName: "FileText" },
      { label: "Telehealth Room", path: "/telemedicine/room-pt-01", iconName: "Video" },
    ],
    accentColor: "text-teal-400",
    badgeBg: "bg-teal-500/15",
    borderColor: "border-teal-500/30",
  },

  guest: {
    role: "guest",
    label: "Public Visitor",
    category: "public",
    credentialBadge: "Public Guest",
    prescribingLevel: "None",
    clinicalPrivilegesSummary: "Public clinic directory, online self check-in kiosk, guest doctor booking.",
    allowedPermissions: [],
    primaryNavRoutes: [
      { label: "Home & Clinic Info", path: "/", iconName: "Home" },
      { label: "Online Check-In", path: "/register", iconName: "UserPlus" },
      { label: "Waiting Room Kiosk", path: "/kiosk", iconName: "Monitor" },
    ],
    accentColor: "text-slate-400",
    badgeBg: "bg-slate-800",
    borderColor: "border-slate-700",
  },
};

// ============================================================================
// ENTERPRISE MODULES CATALOG FOR THE MEGA-MENU
// ============================================================================

export interface EnterpriseModuleItem {
  id: string;
  title: string;
  description: string;
  path: string;
  iconName: string;
  category: "clinical" | "specialties" | "diagnostics" | "encounters" | "operations";
  requiredRoles?: Role[];
}

export const ENTERPRISE_MODULES_CATALOG: EnterpriseModuleItem[] = [
  // 1. Clinical & Diagnostics
  {
    id: "cdss",
    title: "Clinical Decision Support (CDSS)",
    description: "Multimodal AI diagnostic reasoning & biopsychosocial synthesis",
    path: "/",
    iconName: "Stethoscope",
    category: "clinical",
  },
  {
    id: "patients_360",
    title: "Patient 360 Directory",
    description: "Comprehensive patient charts, vitals, labs, and multimodal media",
    path: "/patients",
    iconName: "Users",
    category: "clinical",
  },
  {
    id: "ai_orchestrator",
    title: "Multi-Agent AI Orchestrator",
    description: "Collaborative multi-specialist LLM diagnostic consensus panel",
    path: "/clinical/ai-orchestrator",
    iconName: "Sparkles",
    category: "clinical",
  },
  {
    id: "voice_scribe",
    title: "Ambient Voice Scribe",
    description: "Real-time clinical encounter transcription with ICD-10 & SOAP notes",
    path: "/clinical/voice-scribe",
    iconName: "Mic",
    category: "clinical",
  },

  // 2. Multidisciplinary Specialized Studios
  {
    id: "nutrition_mnt",
    title: "Medical Nutrition Therapy (MNT)",
    description: "Diabetic renal dietetics, macro/micronutrients & sodium limits",
    path: "/nutrition",
    iconName: "Utensils",
    category: "specialties",
  },
  {
    id: "physiotherapy",
    title: "Physiotherapy & Rehab",
    description: "Berg Balance scoring, ROM tracking, and progressive exercise builders",
    path: "/physiotherapy",
    iconName: "Activity",
    category: "specialties",
  },
  {
    id: "psychology",
    title: "Psychology & Behavioral Health",
    description: "PHQ-9, GAD-7 psychometrics, CBT plans & mindfulness counseling",
    path: "/psychologist",
    iconName: "Brain",
    category: "specialties",
  },
  {
    id: "social_work",
    title: "Social Work & SDOH Studio",
    description: "PRAPARE screener, food/housing navigation & community grants",
    path: "/social-work",
    iconName: "HeartHandshake",
    category: "specialties",
  },
  {
    id: "biologist_rules",
    title: "Molecular Biology & PGx Rules",
    description: "Biochemical enzyme pathways, CYP450 metabolizer rules & kinetics",
    path: "/biologist",
    iconName: "Sparkles",
    category: "specialties",
  },
  {
    id: "lifestyle",
    title: "Lifestyle Medicine Studio",
    description: "Non-pharmacological sleep, exercise, and circadian health protocols",
    path: "/lifestyle",
    iconName: "HeartPulse",
    category: "specialties",
  },

  // 3. Pharmacy & Prescribing
  {
    id: "prescriptions",
    title: "E-Prescriptions Hub",
    description: "21 CFR Part 11 digital signatures & laboratory order generation",
    path: "/prescriptions",
    iconName: "FileCheck",
    category: "diagnostics",
  },
  {
    id: "pharmacy",
    title: "Clinical Pharmacotherapy & DDI",
    description: "Drug-Drug Interaction screener, renal adjustments & stock inventory",
    path: "/pharmacy",
    iconName: "Pill",
    category: "diagnostics",
  },

  // 4. Encounters & Care Coordination
  {
    id: "care_plan",
    title: "Multidisciplinary Care Plans",
    description: "Cross-functional care team goals, SLAs & chronic condition paths",
    path: "/care-plan",
    iconName: "ClipboardList",
    category: "encounters",
  },
  {
    id: "tasks",
    title: "Clinical Tasks & Handoffs",
    description: "Interdisciplinary task queue, role delegation & priority alerts",
    path: "/tasks",
    iconName: "CheckSquare",
    category: "encounters",
  },
  {
    id: "referrals",
    title: "Closed-Loop Referrals (FHIR R4)",
    description: "Specialist outbound referrals with FHIR JSON export & SLA tracking",
    path: "/referrals",
    iconName: "Workflow",
    category: "encounters",
  },
  {
    id: "telemedicine",
    title: "Telemedicine Video Rooms",
    description: "Encrypted WebRTC telehealth rooms with live AI vital telemetry",
    path: "/telemedicine/room-clinician-01",
    iconName: "Video",
    category: "encounters",
  },
  {
    id: "case_conference",
    title: "Case Conference Workflow",
    description: "Real-time interdisciplinary team case conference with AI briefs",
    path: "/workflows/case-conference",
    iconName: "Users",
    category: "encounters",
  },
  {
    id: "admission",
    title: "Inpatient Admission Workflow",
    description: "Automated bed assignment, rapid orders & initial triage state machine",
    path: "/workflows/admission",
    iconName: "Bed",
    category: "encounters",
  },
  {
    id: "messages",
    title: "Team Messaging Channel",
    description: "HIPAA-compliant direct and group care team communication",
    path: "/messages",
    iconName: "MessageSquare",
    category: "encounters",
  },

  // 5. Operations & Enterprise Portals
  {
    id: "admin_command",
    title: "Operations Command Center",
    description: "Hospital staff provisioning, occupancy telemetry & RCM claims",
    path: "/admin",
    iconName: "Building2",
    category: "operations",
    requiredRoles: ["system_admin", "tenant_admin", "auditor"],
  },
  {
    id: "live_operations",
    title: "Live Bed Telemetry",
    description: "Real-time ICU/Ward bed monitor, acuity scoring & discharge forecasts",
    path: "/admin/live-operations",
    iconName: "Bed",
    category: "operations",
    requiredRoles: ["system_admin", "tenant_admin", "auditor", "physician", "nurse"],
  },
  {
    id: "admin_workflows",
    title: "Workflow Operations & Payment Gates",
    description: "Multi-dimensional oversight of Cases, Prescriptions, Labs, Subscriptions & Payment Gates",
    path: "/admin/workflows",
    iconName: "Workflow",
    category: "operations",
    requiredRoles: ["system_admin", "tenant_admin", "auditor"],
  },
  {
    id: "cases_hub",
    title: "Patient Cases & AI Triage Hub",
    description: "Incoming patient self-submitted cases, AI decision support briefs, and clinical routing",
    path: "/cases",
    iconName: "FolderOpen",
    category: "clinical",
    requiredRoles: ["physician", "nurse_practitioner", "nurse", "care_coordinator", "system_admin", "tenant_admin", "auditor"],
  },
  {
    id: "pop_health",
    title: "Population Health Analytics",
    description: "Epidemiological risk stratification & chronic disease registries",
    path: "/admin/population-health",
    iconName: "BarChart3",
    category: "operations",
    requiredRoles: ["system_admin", "tenant_admin", "auditor", "care_coordinator"],
  },
  {
    id: "audit_trail",
    title: "21 CFR Part 11 Audit Trail",
    description: "Cryptographic SHA-256 tamper-evident log of all clinical actions",
    path: "/audit",
    iconName: "ShieldCheck",
    category: "operations",
    requiredRoles: ["auditor", "system_admin", "tenant_admin"],
  },
  {
    id: "mobile_clinic",
    title: "Mobile Van Clinic (Offline Sync)",
    description: "IndexedDB offline field triage & satellite batch synchronization",
    path: "/mobile-clinic",
    iconName: "MapPin",
    category: "operations",
  },
  {
    id: "kiosk",
    title: "Waiting Room Check-In Kiosk",
    description: "Patient self-service symptom triage & copay processing terminal",
    path: "/kiosk",
    iconName: "Monitor",
    category: "operations",
  },
  {
    id: "company_portal",
    title: "Corporate Wellness Portal",
    description: "Employer occupational health benefits & biometric screenings",
    path: "/company/portal",
    iconName: "Building2",
    category: "operations",
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function hasPermission(role: Role, permission: ClinicalPermission): boolean {
  const scope = ROLE_CAPABILITIES_MATRIX[role];
  if (!scope) return false;
  return scope.allowedPermissions.includes(permission);
}

export function canAccessRoute(role: Role, path: string): boolean {
  if (role === "system_admin" || role === "tenant_admin") return true;

  // Patient access restrictions
  if (role === "patient") {
    return (
      path.startsWith("/patient") ||
      path.startsWith("/telemedicine") ||
      path === "/kiosk" ||
      path.startsWith("/patient/submit-case")
    );
  }

  // Guest access restrictions
  if (role === "guest") {
    return (
      path === "/" ||
      path === "/register" ||
      path === "/signin" ||
      path === "/signup" ||
      path === "/kiosk" ||
      path.startsWith("/patient/submit-case")
    );
  }

  // Admin and Audit specific restrictions
  if (path.startsWith("/admin") || path.startsWith("/audit")) {
    return role === "auditor";
  }

  // Case handler dashboard — restricted to clinical staff & coordinators
  if (path.startsWith("/cases")) {
    const caseHandlerRoles: Role[] = [
      "physician", "nurse_practitioner", "nurse", "care_coordinator",
      "social_worker", "psychologist", "auditor",
    ];
    return caseHandlerRoles.includes(role);
  }

  // Clinicians can access standard clinical routes
  return true;
}

export function getRoleScopeDetails(role: Role): RoleScopeDefinition {
  return ROLE_CAPABILITIES_MATRIX[role] || ROLE_CAPABILITIES_MATRIX.physician;
}

export function getRolePrimaryNav(role: Role) {
  const scope = ROLE_CAPABILITIES_MATRIX[role];
  return scope?.primaryNavRoutes || ROLE_CAPABILITIES_MATRIX.physician.primaryNavRoutes;
}
