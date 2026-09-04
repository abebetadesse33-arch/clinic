"use client";

import React, { lazy, Suspense } from "react";
import type { DashboardWidgetConfig, WidgetId, Role } from "@/lib/types/clinical";

// ==========================================
// LAZY-LOADED WIDGET COMPONENTS
// ==========================================
const MyPatientsWidget = lazy(() => import("./MyPatientsWidget"));
const PendingAiReviewsWidget = lazy(() => import("./PendingAiReviewsWidget"));
const CriticalAlertsWidget = lazy(() => import("./CriticalAlertsWidget"));
const VitalsDueWidget = lazy(() => import("./VitalsDueWidget"));
const MedicationAdministrationWidget = lazy(() => import("./MedicationAdministrationWidget"));
const DrugInteractionsWidget = lazy(() => import("./DrugInteractionsWidget"));
const PhysiotherapyRehabWidget = lazy(() => import("./PhysiotherapyRehabWidget"));
const NutritionPlanWidget = lazy(() => import("./NutritionPlanWidget"));
const SdohMatrixWidget = lazy(() => import("./SdohMatrixWidget"));
const ImagingWorklistWidget = lazy(() => import("./ImagingWorklistWidget"));
const AbgAnalysisWidget = lazy(() => import("./AbgAnalysisWidget"));
const PsychometricsWidget = lazy(() => import("./PsychometricsWidget"));
const BiologicalRulesWidget = lazy(() => import("./BiologicalRulesWidget"));
const CareGapsWidget = lazy(() => import("./CareGapsWidget"));
const AuditStreamWidget = lazy(() => import("./AuditStreamWidget"));
const PatientPortalOverviewWidget = lazy(() => import("./PatientPortalOverviewWidget"));

// ==========================================
// WIDGET REGISTRY DEFINITION
// ==========================================
export const WIDGET_REGISTRY: DashboardWidgetConfig[] = [
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
    description: "Abnormal labs, PGx flags, sepsis criteria",
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
    description: "Shift MAR tracker with dual-check workflow",
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
    description: "Live DDI checker, renal dosing calculator, PGx alerts",
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
    description: "MNT macronutrient targets and food desert strategies",
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
    description: "Social determinants grid with SNAP, housing, transport assistance",
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
    description: "DICOM / X-ray pending reads and radiologist impressions",
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
    description: "Arterial Blood Gas panel and ventilator interpretation",
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
    description: "PHQ-9 & GAD-7 trends and CBT planning",
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
    description: "Real-time 21 CFR Part 11 immutable audit ledger",
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
    description: "Patient-facing prescriptions, appointments, test results, care plan",
    category: "patient",
    defaultColSpan: 3,
    defaultRowSpan: 2,
    allowedRoles: ["patient"],
    refreshIntervalSeconds: 300,
    isSystemWidget: true,
  },
];

// Map widget IDs to their React components
export const WIDGET_COMPONENT_MAP: Record<WidgetId, React.LazyExoticComponent<React.ComponentType<WidgetProps>>> = {
  my_patients: MyPatientsWidget as React.LazyExoticComponent<React.ComponentType<WidgetProps>>,
  pending_ai_reviews: PendingAiReviewsWidget as React.LazyExoticComponent<React.ComponentType<WidgetProps>>,
  critical_alerts: CriticalAlertsWidget as React.LazyExoticComponent<React.ComponentType<WidgetProps>>,
  vitals_due: VitalsDueWidget as React.LazyExoticComponent<React.ComponentType<WidgetProps>>,
  medication_administration: MedicationAdministrationWidget as React.LazyExoticComponent<React.ComponentType<WidgetProps>>,
  drug_interactions: DrugInteractionsWidget as React.LazyExoticComponent<React.ComponentType<WidgetProps>>,
  physiotherapy_rehab: PhysiotherapyRehabWidget as React.LazyExoticComponent<React.ComponentType<WidgetProps>>,
  nutrition_plan: NutritionPlanWidget as React.LazyExoticComponent<React.ComponentType<WidgetProps>>,
  sdoh_matrix: SdohMatrixWidget as React.LazyExoticComponent<React.ComponentType<WidgetProps>>,
  imaging_worklist: ImagingWorklistWidget as React.LazyExoticComponent<React.ComponentType<WidgetProps>>,
  abg_analysis: AbgAnalysisWidget as React.LazyExoticComponent<React.ComponentType<WidgetProps>>,
  psychometrics: PsychometricsWidget as React.LazyExoticComponent<React.ComponentType<WidgetProps>>,
  biological_rules: BiologicalRulesWidget as React.LazyExoticComponent<React.ComponentType<WidgetProps>>,
  care_gaps: CareGapsWidget as React.LazyExoticComponent<React.ComponentType<WidgetProps>>,
  audit_stream: AuditStreamWidget as React.LazyExoticComponent<React.ComponentType<WidgetProps>>,
  patient_portal_overview: PatientPortalOverviewWidget as React.LazyExoticComponent<React.ComponentType<WidgetProps>>,
};

// Default layouts per role
export const ROLE_DEFAULT_WIDGET_ORDER: Record<string, WidgetId[]> = {
  physician: ["critical_alerts", "my_patients", "pending_ai_reviews", "imaging_worklist", "care_gaps"],
  nurse_practitioner: ["critical_alerts", "my_patients", "pending_ai_reviews", "care_gaps"],
  nurse: ["critical_alerts", "my_patients", "vitals_due", "medication_administration"],
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

// ==========================================
// SHARED WIDGET PROPS INTERFACE
// ==========================================
export interface WidgetProps {
  widgetId: WidgetId;
  title: string;
  refreshInterval?: number;
}

// ==========================================
// WIDGET SHELL (handles loading + error states)
// ==========================================
interface WidgetShellProps {
  config: DashboardWidgetConfig & { isEnabled: boolean; displayOrder: number };
}

function WidgetLoadingFallback({ title }: { title: string }) {
  return (
    <div className="widget-shell animate-pulse">
      <div className="widget-header">
        <div className="h-4 w-32 bg-white/10 rounded" />
      </div>
      <div className="widget-body flex items-center justify-center">
        <div className="text-white/30 text-sm">Loading {title}…</div>
      </div>
    </div>
  );
}

export function WidgetShell({ config }: WidgetShellProps) {
  const WidgetComponent = WIDGET_COMPONENT_MAP[config.widgetId];

  if (!WidgetComponent || !config.isEnabled) return null;

  return (
    <div
      className="widget-container"
      style={{
        gridColumn: `span ${config.defaultColSpan}`,
        gridRow: `span ${config.defaultRowSpan}`,
      }}
    >
      <Suspense fallback={<WidgetLoadingFallback title={config.displayName} />}>
        <WidgetComponent
          widgetId={config.widgetId}
          title={config.displayName}
          refreshInterval={config.refreshIntervalSeconds}
        />
      </Suspense>
    </div>
  );
}
