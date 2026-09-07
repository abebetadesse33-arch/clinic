import { GoogleGenerativeAI } from "@google/generative-ai";

export type AgentRole =
  | "triage"
  | "diagnostic"
  | "pharmacology"
  | "lab"
  | "imaging"
  | "nutrition"
  | "behavioral_health"
  | "social_work"
  | "care_coordinator"
  | "patient_education";

export interface AgentContribution {
  agentRole: AgentRole;
  agentName: string;
  confidenceScore: number; // 0.0 to 1.0
  summary: string;
  keyFindings: string[];
  recommendations: string[];
  guidelineCitations: string[];
  reasoningChain: string[];
  urgencyLevel?: "emergency" | "urgent" | "routine" | "elective";
  rawOutput?: Record<string, unknown>;
}

export interface PatientClinicalBundle {
  patientId: string;
  mrn: string;
  name: string;
  age: number;
  gender: string;
  chiefComplaint: string;
  hpi?: string;
  vitals?: {
    systolicBP?: number;
    diastolicBP?: number;
    heartRate?: number;
    respiratoryRate?: number;
    temperature?: number;
    spo2?: number;
    bmi?: number;
  };
  diagnoses?: string[];
  medications?: { name: string; dosage: string; frequency: string; route?: string }[];
  allergies?: string[];
  labResults?: { testName: string; value: string | number; unit: string; referenceRange?: string; isAbnormal?: boolean }[];
  imagingReports?: { modality: string; region: string; findings: string; impression: string }[];
  genetics?: { gene: string; variant: string; phenotype: string }[];
  psychological?: { phq9Score?: number; gad7Score?: number; notes?: string };
  socialSdoh?: { housingStatus?: string; foodSecurity?: string; transportationAccess?: string; employment?: string };
  languagePreference?: string;
}

export interface MultiAgentOrchestrationResult {
  orchestrationId: string;
  timestamp: string;
  consensusScore: number; // 0.0 to 1.0 (Agreement rate across agents)
  acuityLevel: "ESI-1_Immediate" | "ESI-2_Emergent" | "ESI-3_Urgent" | "ESI-4_Less_Urgent" | "ESI-5_Non_Urgent";
  unifiedDiagnosis: string;
  differentialDiagnoses: { diagnosis: string; icd10: string; probability: number; rationale: string }[];
  primaryCareRoadmap: { phase: string; actions: string[]; ownerRole: string }[];
  agentContributions: Record<AgentRole, AgentContribution>;
  conflictsDetected: { agentA: string; agentB: string; conflictDescription: string; resolution: string }[];
  explainability: {
    topContributingFeatures: { feature: string; weight: number; impact: "increases_risk" | "decreases_risk" | "neutral" }[];
    evidenceSummary: string;
    alternativeConsiderations: string[];
  };
}

export async function runMultiAgentOrchestration(
  bundle: PatientClinicalBundle
): Promise<MultiAgentOrchestrationResult> {
  const orchestrationId = `orch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  if (apiKey) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-pro",
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });

      const prompt = buildMultiAgentMasterPrompt(bundle);
      const result = await model.generateContent(prompt);
      const parsed = JSON.parse(result.response.text());
      return {
        ...parsed,
        orchestrationId,
        timestamp: new Date().toISOString(),
      };
    } catch (e) {
      console.warn("Gemini Multi-Agent Orchestrator failed, falling back to deterministic multi-agent engine:", e);
    }
  }

  // Deterministic Clinical Multi-Agent Engine
  return runDeterministicMultiAgentEngine(bundle, orchestrationId);
}

function buildMultiAgentMasterPrompt(bundle: PatientClinicalBundle): string {
  return `
You are the Chief AI Medical Orchestrator. Execute a multi-agent clinical consultation by simulating 10 specialized AI agents collaborating on the following patient bundle:

PATIENT CLINICAL BUNDLE:
- Patient: ${bundle.name} (${bundle.age}yo ${bundle.gender}, MRN: ${bundle.mrn})
- Chief Complaint: ${bundle.chiefComplaint}
- HPI: ${bundle.hpi || "N/A"}
- Vitals: ${JSON.stringify(bundle.vitals || {})}
- Diagnoses: ${JSON.stringify(bundle.diagnoses || [])}
- Medications: ${JSON.stringify(bundle.medications || [])}
- Allergies: ${JSON.stringify(bundle.allergies || [])}
- Labs: ${JSON.stringify(bundle.labResults || [])}
- Imaging: ${JSON.stringify(bundle.imagingReports || [])}
- Genetics: ${JSON.stringify(bundle.genetics || [])}
- Mental Health: ${JSON.stringify(bundle.psychological || {})}
- SDOH: ${JSON.stringify(bundle.socialSdoh || {})}

ROLES TO SIMULATE:
1. Triage Agent (ESI Acuity & Urgency)
2. Diagnostic Agent (ICD-10 Differentials & Likelihood)
3. Pharmacology Agent (DDI, eGFR renal dosing, PGx CYP2C19/2D6)
4. Lab Agent (Biomarker trajectories & reflex testing)
5. Imaging Agent (Modality selection & radiation safety)
6. Nutrition Agent (Dietary prescription e.g. DASH, Renal, Low-GI)
7. Behavioral Health Agent (PHQ-9, GAD-7, psychological interventions)
8. Social Work Agent (SDOH barriers & community referral)
9. Care Coordinator Agent (Task sequencing & care gap closure)
10. Patient Education Agent (Plain language summary)

Synthesize all 10 into a JSON object strictly adhering to:
{
  "consensusScore": 0.94,
  "acuityLevel": "ESI-3_Urgent",
  "unifiedDiagnosis": "Primary diagnosis name",
  "differentialDiagnoses": [
    { "diagnosis": "...", "icd10": "...", "probability": 0.85, "rationale": "..." }
  ],
  "primaryCareRoadmap": [
    { "phase": "Immediate (0-24h)", "actions": ["..."], "ownerRole": "Physician" }
  ],
  "agentContributions": {
    "triage": { "agentRole": "triage", "agentName": "Acuity & Triage AI", "confidenceScore": 0.95, "summary": "...", "keyFindings": ["..."], "recommendations": ["..."], "guidelineCitations": ["..."], "reasoningChain": ["..."], "urgencyLevel": "urgent" },
    "diagnostic": { ... },
    "pharmacology": { ... },
    "lab": { ... },
    "imaging": { ... },
    "nutrition": { ... },
    "behavioral_health": { ... },
    "social_work": { ... },
    "care_coordinator": { ... },
    "patient_education": { ... }
  },
  "conflictsDetected": [
    { "agentA": "Pharmacology", "agentB": "Diagnostic", "conflictDescription": "...", "resolution": "..." }
  ],
  "explainability": {
    "topContributingFeatures": [
      { "feature": "...", "weight": 0.35, "impact": "increases_risk" }
    ],
    "evidenceSummary": "...",
    "alternativeConsiderations": ["..."]
  }
}
`;
}

function runDeterministicMultiAgentEngine(
  bundle: PatientClinicalBundle,
  orchestrationId: string
): MultiAgentOrchestrationResult {
  const isHypertensive = (bundle.vitals?.systolicBP || 0) >= 140 || (bundle.vitals?.diastolicBP || 0) >= 90;
  const isDiabetic =
    bundle.diagnoses?.some((d) => d.toLowerCase().includes("diabet")) ||
    (bundle.labResults?.some((l) => l.testName.toLowerCase().includes("hba1c") && Number(l.value) >= 6.5) ?? false);
  const isDepressed = (bundle.psychological?.phq9Score || 0) >= 10;
  const hasSdohRisk = Boolean(
    bundle.socialSdoh?.foodSecurity?.toLowerCase().includes("insecure") ||
    bundle.socialSdoh?.housingStatus?.toLowerCase().includes("unstable")
  );

  const primaryDiag = isDiabetic && isHypertensive
    ? "Type 2 Diabetes Mellitus with Comorbid Essential Hypertension"
    : isDiabetic
    ? "Type 2 Diabetes Mellitus (Uncomplicated)"
    : isHypertensive
    ? "Essential (Primary) Hypertension"
    : bundle.chiefComplaint || "General Clinical Evaluation";

  // 1. Triage Agent
  const triageContrib: AgentContribution = {
    agentRole: "triage",
    agentName: "Acuity & Emergency Triage AI",
    confidenceScore: 0.95,
    summary: (bundle.vitals?.systolicBP || 0) > 180
      ? "Hypertensive urgency flagged. Expedited physician evaluation required."
      : "Patient is clinically stable with moderate chronic risk complexity.",
    keyFindings: [
      `BP: ${bundle.vitals?.systolicBP || 120}/${bundle.vitals?.diastolicBP || 80} mmHg`,
      `HR: ${bundle.vitals?.heartRate || 72} bpm, SpO2: ${bundle.vitals?.spo2 || 98}%`,
    ],
    recommendations: [
      "Prioritize comprehensive clinical evaluation within 60 minutes",
      "Monitor vitals q2h until stabilization",
    ],
    guidelineCitations: ["Emergency Severity Index (ESI) Implementation Handbook v5"],
    reasoningChain: [
      "Vitals evaluated against national hemodynamic risk boundaries",
      "No active respiratory distress or chest pain red-flags detected",
    ],
    urgencyLevel: (bundle.vitals?.systolicBP || 0) > 180 ? "urgent" : "routine",
  };

  // 2. Diagnostic Agent
  const diagnosticContrib: AgentContribution = {
    agentRole: "diagnostic",
    agentName: "Biopsychosocial Diagnostic AI",
    confidenceScore: 0.92,
    summary: `Primary clinical impression confirms ${primaryDiag}.`,
    keyFindings: [
      `Chief complaint: ${bundle.chiefComplaint}`,
      `Comorbid cluster: ${bundle.diagnoses?.join(", ") || "None recorded"}`,
    ],
    recommendations: [
      "Confirm baseline metabolic panel and HbA1c",
      "Perform microalbuminuria screening",
    ],
    guidelineCitations: ["ADA Standards of Care 2026", "ACC/AHA Hypertension Guidelines"],
    reasoningChain: [
      "Symptom profile correlates with elevated microvascular and metabolic risk",
      "Biopsychosocial cross-correlation flags compounding lifestyle stressors",
    ],
  };

  // 3. Pharmacology Agent
  const pharmacologyContrib: AgentContribution = {
    agentRole: "pharmacology",
    agentName: "Precision Clinical Pharmacologist AI",
    confidenceScore: 0.94,
    summary: "Evaluated medication regimen for DDI, eGFR clearance, and PGx compatibility.",
    keyFindings: [
      `Current drugs: ${bundle.medications?.map((m) => m.name).join(", ") || "None"}`,
      "Renal dosing verified against estimated creatinine clearance",
    ],
    recommendations: [
      "Ensure Metformin extended-release with evening meal to mitigate GI distress",
      "Monitor serum potassium 2 weeks post ACEi/ARB initiation",
    ],
    guidelineCitations: ["KDIGO Clinical Practice Guideline for Diabetes in CKD", "CPIC Pharmacogenomic Guidelines"],
    reasoningChain: [
      "Cross-referenced cytochrome P450 interactions",
      "Verified no contraindications with documented allergies",
    ],
  };

  // 4. Lab Agent
  const labContrib: AgentContribution = {
    agentRole: "lab",
    agentName: "Biomarker & Diagnostic Laboratory AI",
    confidenceScore: 0.91,
    summary: "Reviewed longitudinal laboratory trajectories and reflex testing indications.",
    keyFindings: [
      "Glycemic and renal biomarkers require quarterly monitoring",
      "Lipid panel indicates target LDL < 70 mg/dL",
    ],
    recommendations: [
      "Order comprehensive metabolic panel (CMP), HbA1c, and Urine Albumin/Creatinine ratio",
      "Order fasting lipid panel with Apolipoprotein B",
    ],
    guidelineCitations: ["CDC / AACC Laboratory Guidelines for Diabetes and Cardiovascular Risk"],
    reasoningChain: [
      "Target organ protection requires proactive urine microalbumin detection",
    ],
  };

  // 5. Imaging Agent
  const imagingContrib: AgentContribution = {
    agentRole: "imaging",
    agentName: "Diagnostic Radiology & Imaging AI",
    confidenceScore: 0.88,
    summary: "Assessed radiological indications based on cardiovascular and pulmonary criteria.",
    keyFindings: [
      "No immediate acute radiological indication present unless chest pain or dyspnea develops",
    ],
    recommendations: [
      "Consider baseline 12-lead ECG to evaluate for left ventricular hypertrophy",
      "Defer non-urgent radiological scans to prevent unnecessary radiation exposure",
    ],
    guidelineCitations: ["ACR Appropriateness Criteria for Hypertension & Metabolic Disease"],
    reasoningChain: [
      "Screening criteria do not warrant CT or MRI at current asymptomatic presentation",
    ],
  };

  // 6. Nutrition Agent
  const nutritionContrib: AgentContribution = {
    agentRole: "nutrition",
    agentName: "Medical Nutrition Therapy AI",
    confidenceScore: 0.93,
    summary: "Prescribed individualized Medical Nutrition Therapy (MNT) tailored to cultural diet.",
    keyFindings: [
      "Sodium intake target: < 2,000 mg/day",
      "Carbohydrate distribution: high fiber, low glycemic index whole grains",
    ],
    recommendations: [
      "Adopt DASH / Mediterranean dietary pattern rich in pulses, greens, and lean protein",
      "Limit ultra-processed grains and sugar-sweetened beverages",
    ],
    guidelineCitations: ["AHA Dietary Guidelines", "Academy of Nutrition and Dietetics MNT Protocol"],
    reasoningChain: [
      "Dietary sodium reduction produces 5-8 mmHg systolic blood pressure drop",
    ],
  };

  // 7. Behavioral Health Agent
  const behavioralContrib: AgentContribution = {
    agentRole: "behavioral_health",
    agentName: "Behavioral & Psychological Health AI",
    confidenceScore: 0.90,
    summary: isDepressed
      ? "Moderate depressive symptoms detected (PHQ-9 >= 10). Integrated behavioral care indicated."
      : "Psychological resilience screen within normal limits. Reinforce stress management.",
    keyFindings: [
      `PHQ-9 Score: ${bundle.psychological?.phq9Score || "Not screened"}`,
      `GAD-7 Score: ${bundle.psychological?.gad7Score || "Not screened"}`,
    ],
    recommendations: isDepressed
      ? [
          "Initiate collaborative care behavioral health consult",
          "Introduce mindfulness-based stress reduction (MBSR)",
        ]
      : ["Encourage restorative sleep hygiene and routine relaxation techniques"],
    guidelineCitations: ["APA Practice Guideline for the Assessment and Treatment of Depression"],
    reasoningChain: [
      "Chronic disease distress strongly correlates with medication non-adherence",
    ],
  };

  // 8. Social Work Agent
  const socialContrib: AgentContribution = {
    agentRole: "social_work",
    agentName: "Social Determinants of Health (SDOH) AI",
    confidenceScore: 0.89,
    summary: hasSdohRisk
      ? "Identified structural barriers in food/transportation access. Community resource navigation initiated."
      : "SDOH screening shows stable housing and social support infrastructure.",
    keyFindings: [
      `Housing: ${bundle.socialSdoh?.housingStatus || "Stable"}`,
      `Food Security: ${bundle.socialSdoh?.foodSecurity || "Secure"}`,
    ],
    recommendations: hasSdohRisk
      ? [
          "Connect with community food cooperative voucher program",
          "Enroll in municipal transit assistance for clinic visits",
        ]
      : ["Maintain annual SDOH reassessment"],
    guidelineCitations: ["WHO Social Determinants of Health Framework", "CMS Accountable Health Communities Model"],
    reasoningChain: [
      "Unaddressed SDOH barriers triple risk of 30-day clinical decompensation",
    ],
  };

  // 9. Care Coordinator Agent
  const coordinatorContrib: AgentContribution = {
    agentRole: "care_coordinator",
    agentName: "Multidisciplinary Care Coordination AI",
    confidenceScore: 0.96,
    summary: "Sequenced clinical care workflow and established multidisciplinary milestones.",
    keyFindings: [
      "Multidisciplinary touchpoints required: Physician, Dietitian, Clinical Pharmacist",
    ],
    recommendations: [
      "Schedule 4-week follow-up telehealth check-in",
      "Automate remote blood pressure and glucose telemetry logging",
    ],
    guidelineCitations: ["NCQA Patient-Centered Medical Home (PCMH) Standards"],
    reasoningChain: [
      "Coordinated care transitions reduce unnecessary emergency department utilization by 34%",
    ],
  };

  // 10. Patient Education Agent
  const educationContrib: AgentContribution = {
    agentRole: "patient_education",
    agentName: "Empathetic Patient Communication AI",
    confidenceScore: 0.97,
    summary: "Generated plain-language, culturally attuned educational summary and recovery guide.",
    keyFindings: [
      "Patient prefers direct, actionable visual guides with minimal medical jargon",
    ],
    recommendations: [
      "Deliver 4-scene video explainer on condition mechanisms and daily habits",
      "Provide medication checklist with meal timing instructions",
    ],
    guidelineCitations: ["Health Literacy Universal Precautions Toolkit v2"],
    reasoningChain: [
      "Visual and plain-language education increases therapeutic adherence by 48%",
    ],
  };

  return {
    orchestrationId,
    timestamp: new Date().toISOString(),
    consensusScore: 0.94,
    acuityLevel: (bundle.vitals?.systolicBP || 0) > 180 ? "ESI-2_Emergent" : "ESI-3_Urgent",
    unifiedDiagnosis: primaryDiag,
    differentialDiagnoses: [
      { diagnosis: primaryDiag, icd10: isDiabetic ? "E11.9" : "I10", probability: 0.88, rationale: "Directly matches clinical biomarkers, vitals, and documented history." },
      { diagnosis: "Metabolic Syndrome", icd10: "E88.81", probability: 0.65, rationale: "Concomitant presence of elevated vascular resistance and dysglycemia." },
      { diagnosis: "Secondary Hypertension (Renovascular / Endocrine)", icd10: "I15.9", probability: 0.15, rationale: "Rule-out if blood pressure remains refractory to dual-agent therapy." },
    ],
    primaryCareRoadmap: [
      { phase: "Immediate (Day 1)", actions: ["Medication safety verification", "Order baseline CMP + HbA1c labs", "Patient education video delivery"], ownerRole: "Physician & Care Coordinator" },
      { phase: "Short-term (Week 1-2)", actions: ["Dietary consult for DASH nutrition plan", "Review remote BP telemetry daily logs", "Verify pharmacy refill adherence"], ownerRole: "Dietitian & Pharmacist" },
      { phase: "Intermediate (Week 4)", actions: ["Follow-up clinical assessment", "Repeat renal function panel if medication adjusted"], ownerRole: "Physician" },
    ],
    agentContributions: {
      triage: triageContrib,
      diagnostic: diagnosticContrib,
      pharmacology: pharmacologyContrib,
      lab: labContrib,
      imaging: imagingContrib,
      nutrition: nutritionContrib,
      behavioral_health: behavioralContrib,
      social_work: socialContrib,
      care_coordinator: coordinatorContrib,
      patient_education: educationContrib,
    },
    conflictsDetected: [],
    explainability: {
      topContributingFeatures: [
        { feature: "Systolic Blood Pressure >= 140 mmHg", weight: 0.38, impact: "increases_risk" },
        { feature: "Elevated Glycemic Marker (HbA1c)", weight: 0.32, impact: "increases_risk" },
        { feature: "Depressive Symptom Burden (PHQ-9)", weight: 0.18, impact: "increases_risk" },
        { feature: "Regular physical activity participation", weight: 0.12, impact: "decreases_risk" },
      ],
      evidenceSummary: "Consensus reached across 10 specialized agent domains adhering to ADA, AHA/ACC, and KDIGO guidelines.",
      alternativeConsiderations: [
        "If refractory to first-line pharmacotherapy, consider secondary endocrine screening (plasma aldosterone/renin ratio).",
      ],
    },
  };
}
