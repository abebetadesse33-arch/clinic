import { NextResponse } from "next/server";
import type { DashboardWidgetConfig, WidgetId } from "@/lib/types/clinical";
import type { Role } from "@/lib/types/clinical";

// ==========================================
// WIDGET DEFINITIONS PER ROLE
// ==========================================
const WIDGET_REGISTRY: DashboardWidgetConfig[] = [
  {
    widgetId: "my_patients",
    displayName: "My Patients",
    description: "Searchable patient cohort with triage status and priority flags",
    category: "clinical",
    defaultColSpan: 2,
    defaultRowSpan: 2,
    allowedRoles: ["physician", "nurse_practitioner", "nurse", "care_coordinator"],
    refreshIntervalSeconds: 30,
    isSystemWidget: true,
  },
  {
    widgetId: "pending_ai_reviews",
    displayName: "Pending AI Reviews",
    description: "AI suggestion review queue with 1-click accept/reject workflow",
    category: "clinical",
    defaultColSpan: 2,
    defaultRowSpan: 1,
    allowedRoles: ["physician", "nurse_practitioner"],
    refreshIntervalSeconds: 60,
    isSystemWidget: false,
  },
  {
    widgetId: "critical_alerts",
    displayName: "Critical Alerts",
    description: "Abnormal labs (eGFR < 45), PGx flags (CYP2C19 *2/*2), sepsis criteria",
    category: "clinical",
    defaultColSpan: 1,
    defaultRowSpan: 1,
    allowedRoles: ["physician", "nurse_practitioner", "nurse", "pharmacist"],
    refreshIntervalSeconds: 15,
    isSystemWidget: true,
  },
  {
    widgetId: "vitals_due",
    displayName: "Vitals Due",
    description: "Shift vitals recording schedule with rapid entry modal",
    category: "clinical",
    defaultColSpan: 1,
    defaultRowSpan: 1,
    allowedRoles: ["nurse", "nurse_practitioner"],
    refreshIntervalSeconds: 60,
    isSystemWidget: false,
  },
  {
    widgetId: "medication_administration",
    displayName: "Medication Administration (MAR)",
    description: "Shift Medication Administration Record tracker with dual-check workflow",
    category: "clinical",
    defaultColSpan: 2,
    defaultRowSpan: 1,
    allowedRoles: ["nurse", "nurse_practitioner"],
    refreshIntervalSeconds: 60,
    isSystemWidget: false,
  },
  {
    widgetId: "drug_interactions",
    displayName: "Drug Interactions & DDI Screen",
    description: "Live candidate DDI checker, renal dosing calculator, and PGx alerts",
    category: "pharmacy",
    defaultColSpan: 2,
    defaultRowSpan: 2,
    allowedRoles: ["pharmacist"],
    refreshIntervalSeconds: 120,
    isSystemWidget: false,
  },
  {
    widgetId: "physiotherapy_rehab",
    displayName: "Physiotherapy & Rehab",
    description: "Berg balance scale (0-56) and progressive exercise regimen builder",
    category: "therapy",
    defaultColSpan: 2,
    defaultRowSpan: 2,
    allowedRoles: ["physiotherapist", "occupational_therapist"],
    refreshIntervalSeconds: 300,
    isSystemWidget: false,
  },
  {
    widgetId: "nutrition_plan",
    displayName: "Nutrition Plan (MNT)",
    description: "MNT macronutrient targets (< 2,000 mg sodium) and food desert strategies",
    category: "therapy",
    defaultColSpan: 2,
    defaultRowSpan: 2,
    allowedRoles: ["dietitian"],
    refreshIntervalSeconds: 300,
    isSystemWidget: false,
  },
  {
    widgetId: "sdoh_matrix",
    displayName: "SDOH Matrix",
    description: "Social determinants of health grid with SNAP, housing, transport assistance",
    category: "social",
    defaultColSpan: 2,
    defaultRowSpan: 2,
    allowedRoles: ["social_worker", "care_coordinator"],
    refreshIntervalSeconds: 300,
    isSystemWidget: false,
  },
  {
    widgetId: "imaging_worklist",
    displayName: "Imaging Worklist",
    description: "DICOM / X-ray pending reads, findings, and radiologist impression",
    category: "diagnostics",
    defaultColSpan: 2,
    defaultRowSpan: 2,
    allowedRoles: ["radiologist", "physician", "nurse_practitioner"],
    refreshIntervalSeconds: 60,
    isSystemWidget: false,
  },
  {
    widgetId: "abg_analysis",
    displayName: "ABG & Respiratory",
    description: "Arterial Blood Gas panel interpretation and ventilator settings",
    category: "diagnostics",
    defaultColSpan: 2,
    defaultRowSpan: 2,
    allowedRoles: ["respiratory_therapist", "physician"],
    refreshIntervalSeconds: 120,
    isSystemWidget: false,
  },
  {
    widgetId: "psychometrics",
    displayName: "Psychometrics",
    description: "PHQ-9 & GAD-7 trend analysis and CBT directive planning",
    category: "clinical",
    defaultColSpan: 2,
    defaultRowSpan: 2,
    allowedRoles: ["psychologist", "physician", "nurse_practitioner"],
    refreshIntervalSeconds: 300,
    isSystemWidget: false,
  },
  {
    widgetId: "biological_rules",
    displayName: "Biological Rules Engine",
    description: "CPIC guideline authoring and biological rule builder",
    category: "diagnostics",
    defaultColSpan: 2,
    defaultRowSpan: 2,
    allowedRoles: ["biologist", "genetic_counselor", "pathologist", "lab_technician"],
    refreshIntervalSeconds: 600,
    isSystemWidget: false,
  },
  {
    widgetId: "care_gaps",
    displayName: "Care Gaps & Referrals",
    description: "Closed-loop referral tracker and care gap registry",
    category: "clinical",
    defaultColSpan: 2,
    defaultRowSpan: 1,
    allowedRoles: ["care_coordinator", "physician", "nurse_practitioner"],
    refreshIntervalSeconds: 120,
    isSystemWidget: false,
  },
  {
    widgetId: "audit_stream",
    displayName: "Audit Stream",
    description: "Real-time 21 CFR Part 11 immutable audit ledger with signature verification",
    category: "admin",
    defaultColSpan: 3,
    defaultRowSpan: 2,
    allowedRoles: ["auditor", "tenant_admin", "system_admin"],
    refreshIntervalSeconds: 10,
    isSystemWidget: true,
  },
  {
    widgetId: "patient_portal_overview",
    displayName: "My Health Overview",
    description: "Patient-facing prescriptions, appointments, test results, and care plan",
    category: "patient",
    defaultColSpan: 3,
    defaultRowSpan: 2,
    allowedRoles: ["patient"],
    refreshIntervalSeconds: 300,
    isSystemWidget: true,
  },
];

// Role → widget IDs in display order
const ROLE_DEFAULT_LAYOUTS: Record<string, WidgetId[]> = {
  physician: ["my_patients", "critical_alerts", "pending_ai_reviews", "imaging_worklist", "care_gaps"],
  nurse_practitioner: ["my_patients", "critical_alerts", "pending_ai_reviews", "care_gaps"],
  nurse: ["my_patients", "critical_alerts", "vitals_due", "medication_administration"],
  pharmacist: ["critical_alerts", "drug_interactions"],
  physiotherapist: ["my_patients", "physiotherapy_rehab"],
  occupational_therapist: ["my_patients", "physiotherapy_rehab"],
  dietitian: ["my_patients", "nutrition_plan"],
  social_worker: ["my_patients", "sdoh_matrix"],
  radiologist: ["imaging_worklist"],
  pathologist: ["biological_rules"],
  lab_technician: ["biological_rules"],
  genetic_counselor: ["biological_rules"],
  respiratory_therapist: ["my_patients", "abg_analysis"],
  psychologist: ["my_patients", "psychometrics"],
  biologist: ["biological_rules"],
  care_coordinator: ["my_patients", "sdoh_matrix", "care_gaps"],
  patient: ["patient_portal_overview"],
  tenant_admin: ["audit_stream", "care_gaps"],
  system_admin: ["audit_stream"],
  auditor: ["audit_stream"],
};

export async function GET(
  _request: Request,
  { params }: { params: { role: string } }
) {
  const role = params.role as Role;
  const widgetIds = ROLE_DEFAULT_LAYOUTS[role] ?? ["my_patients"];

  const widgets = widgetIds
    .map((wid, idx) => {
      const config = WIDGET_REGISTRY.find((w) => w.widgetId === wid);
      if (!config) return null;
      return {
        ...config,
        displayOrder: idx,
        isEnabled: true,
        colSpan: config.defaultColSpan,
        rowSpan: config.defaultRowSpan,
      };
    })
    .filter(Boolean);

  return NextResponse.json({
    success: true,
    data: {
      role,
      widgets,
      totalWidgets: widgets.length,
      generatedAt: new Date().toISOString(),
    },
  });
}
