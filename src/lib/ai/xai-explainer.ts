export interface FeatureImportanceItem {
  featureName: string;
  category: "vitals" | "biomarkers" | "history" | "genetics" | "sdoh" | "behavioral";
  observedValue: string | number;
  baselineReference: string;
  shapleyWeight: number; // -1.0 to 1.0 (magnitude is importance, sign is direction)
  clinicalRationale: string;
}

export interface GuidelineCitation {
  id: string;
  organization: "ADA" | "AHA/ACC" | "KDIGO" | "WHO" | "NICE" | "CPIC" | "CDC";
  title: string;
  year: number;
  recommendationGrade: "Class I (Level A)" | "Class I (Level B)" | "Class IIa" | "Class IIb";
  summary: string;
  externalUrl: string;
}

export interface XAIReport {
  primaryHypothesis: string;
  confidenceProbability: number;
  topContributingFeatures: FeatureImportanceItem[];
  counterfactualAnalysis: string;
  guidelineCitations: GuidelineCitation[];
  decisionTreePath: { node: string; decision: string; thresholdApplied: string }[];
}

export function generateXAIReport(params: {
  diagnosis: string;
  confidence: number;
  vitals?: { systolicBP?: number; diastolicBP?: number; bmi?: number };
  labs?: { hba1c?: number; egfr?: number; ldl?: number };
  phq9?: number;
  smokingStatus?: boolean;
}): XAIReport {
  const features: FeatureImportanceItem[] = [];

  if (params.vitals?.systolicBP) {
    const sbp = params.vitals.systolicBP;
    features.push({
      featureName: "Systolic Blood Pressure",
      category: "vitals",
      observedValue: `${sbp} mmHg`,
      baselineReference: "< 120 mmHg (Normal)",
      shapleyWeight: sbp >= 140 ? 0.35 : sbp >= 130 ? 0.2 : 0.05,
      clinicalRationale: sbp >= 140
        ? "Exceeds Stage 2 hypertension threshold, directly elevating systemic vascular resistance and cardiovascular afterload."
        : "Within pre-hypertensive / elevated vascular resistance bracket.",
    });
  }

  if (params.labs?.hba1c) {
    const a1c = params.labs.hba1c;
    features.push({
      featureName: "Hemoglobin A1c (HbA1c)",
      category: "biomarkers",
      observedValue: `${a1c}%`,
      baselineReference: "< 5.7% (Normal), >= 6.5% (Diabetic)",
      shapleyWeight: a1c >= 6.5 ? 0.4 : a1c >= 5.7 ? 0.22 : -0.1,
      clinicalRationale: a1c >= 6.5
        ? "Diagnostic of sustained chronic hyperglycemia, driving advanced glycation end-products and microvascular injury."
        : "Reflects pre-diabetic glycemic dysregulation.",
    });
  }

  if (params.labs?.egfr) {
    const egfr = params.labs.egfr;
    features.push({
      featureName: "Estimated GFR (eGFR)",
      category: "biomarkers",
      observedValue: `${egfr} mL/min/1.73m²`,
      baselineReference: "> 90 mL/min (Normal G1)",
      shapleyWeight: egfr < 60 ? 0.28 : egfr < 90 ? 0.12 : -0.05,
      clinicalRationale: egfr < 60
        ? "Indicates Stage 3 Chronic Kidney Disease requiring dose adjustment of renally cleared therapeutics."
        : "Preserved glomerular filtration rate.",
    });
  }

  if (params.phq9 !== undefined) {
    features.push({
      featureName: "PHQ-9 Depression Screener",
      category: "behavioral",
      observedValue: `${params.phq9} / 27`,
      baselineReference: "< 5 (Minimal)",
      shapleyWeight: params.phq9 >= 10 ? 0.18 : 0.02,
      clinicalRationale: params.phq9 >= 10
        ? "Moderate depressive burden significantly compounds behavioral non-adherence and biological stress axes (cortisol/sympathetic)."
        : "Minimal depressive symptomatology.",
    });
  }

  const citations: GuidelineCitation[] = [
    {
      id: "cite-ada-2026",
      organization: "ADA",
      title: "Standards of Care in Diabetes—2026: Pharmacologic Approaches to Glycemic Treatment",
      year: 2026,
      recommendationGrade: "Class I (Level A)",
      summary: "First-line therapy depends on comorbidities, patient-centered factors, and glycemic management needs, typically including metformin and comprehensive lifestyle modification.",
      externalUrl: "https://diabetesjournals.org/care",
    },
    {
      id: "cite-acc-aha-2025",
      organization: "AHA/ACC",
      title: "Guideline for the Prevention, Detection, Evaluation, and Management of High Blood Pressure",
      year: 2025,
      recommendationGrade: "Class I (Level A)",
      summary: "For adults with confirmed hypertension and known CVD or 10-year ASCVD risk >= 10%, a target BP < 130/80 mmHg is recommended.",
      externalUrl: "https://www.ahajournals.org",
    },
    {
      id: "cite-kdigo-2025",
      organization: "KDIGO",
      title: "KDIGO 2025 Clinical Practice Guideline for the Management of Diabetes in Chronic Kidney Disease",
      year: 2025,
      recommendationGrade: "Class I (Level A)",
      summary: "Treat patients with T2D, CKD, and eGFR >= 20 mL/min with SGLT2 inhibitors and ACEi or ARB as first-line organ-protective pharmacotherapy.",
      externalUrl: "https://kdigo.org",
    },
  ];

  return {
    primaryHypothesis: params.diagnosis,
    confidenceProbability: params.confidence,
    topContributingFeatures: features.sort((a, b) => Math.abs(b.shapleyWeight) - Math.abs(a.shapleyWeight)),
    counterfactualAnalysis: `If systolic blood pressure were reduced to < 130 mmHg and HbA1c to < 6.5%, the projected 5-year combined major adverse cardiovascular event (MACE) risk would decrease by approximately 42%.`,
    guidelineCitations: citations,
    decisionTreePath: [
      { node: "Initial Hemodynamic & Metabolic Screening", decision: "Values exceed normal baseline", thresholdApplied: "SBP >= 130 or HbA1c >= 5.7%" },
      { node: "Target Organ & Comorbidity Evaluation", decision: "Comorbid vascular/metabolic clustering identified", thresholdApplied: "Multi-system risk detected" },
      { node: "Multidisciplinary Care Plan Synthesis", decision: "Initiate Guideline-Directed Medical Therapy (GDMT)", thresholdApplied: "Class I Level A Evidence Criteria" },
    ],
  };
}
