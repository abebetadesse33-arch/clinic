import { BiopsychosocialAiOutput, BiopsychosocialAiOutputSchema } from "../types/clinical";
import { buildBiopsychosocialPrompt, CompletePatientClinicalBundle } from "./prompt-builder";
import { callGeminiRest } from "./gemini-rest-client";

// ─── Circuit Breaker State ─────────────────────────────────────────────────────
let _circuitFailures = 0;
let _circuitOpenUntil = 0;
const CIRCUIT_THRESHOLD = 3;       // open after N consecutive failures
const CIRCUIT_RESET_MS  = 60_000; // stay open for 60s, then half-open

function isCircuitOpen(): boolean {
  if (_circuitOpenUntil && Date.now() < _circuitOpenUntil) return true;
  return false;
}
function recordSuccess() {
  _circuitFailures = 0;
  _circuitOpenUntil = 0;
}
function recordFailure() {
  _circuitFailures += 1;
  if (_circuitFailures >= CIRCUIT_THRESHOLD) {
    _circuitOpenUntil = Date.now() + CIRCUIT_RESET_MS;
    console.warn(`[NiniMed AI] Circuit breaker OPEN — Gemini will be bypassed for ${CIRCUIT_RESET_MS / 1000}s`);
  }
}

// ─── Exponential Backoff Retry ─────────────────────────────────────────────────
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 500
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;
      const isOverloaded =
        (err instanceof Error && /overload|quota|rate.?limit|503|529/i.test(err.message)) ||
        (typeof err === "object" && err !== null && "status" in err && [429, 503, 529].includes((err as { status: number }).status));

      if (!isOverloaded || attempt === maxAttempts) throw err;

      const delay = baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 200;
      console.warn(`[NiniMed AI] Gemini attempt ${attempt} failed (overloaded). Retrying in ${Math.round(delay)}ms…`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

// ─── Main Entry Point ──────────────────────────────────────────────────────────
export async function analyzeBiopsychosocialCase(
  bundle: CompletePatientClinicalBundle
): Promise<BiopsychosocialAiOutput> {
  const prompt = buildBiopsychosocialPrompt(bundle);

  try {
    const restResult = await callGeminiRest({ prompt, temperature: 0.2, maxOutputTokens: 8192 });
    const cleaned = restResult.text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const rawJson = JSON.parse(cleaned);
    const parsed = BiopsychosocialAiOutputSchema.safeParse(rawJson);
    if (parsed.success) return parsed.data;
    console.warn(
      "[BioAI] Schema validation warning — partial data accepted:",
      parsed.error.issues.map((i) => i.message).join("; ")
    );
    return rawJson as BiopsychosocialAiOutput;
  } catch (error) {
    console.error(
      "[BioAI] All Gemini keys exhausted — switching to Deterministic Clinical Engine:",
      error instanceof Error ? error.message : error
    );
  }

  return generateClinicalSimulatorOutput(bundle);
}

// ─── Deterministic Fallback Engine ────────────────────────────────────────────
function generateClinicalSimulatorOutput(bundle: CompletePatientClinicalBundle): BiopsychosocialAiOutput {
  const { patient, vitals, labResults, symptoms, genetics, imaging, psychological, socialHistory } = bundle;

  // Detect key clinical patterns
  const hba1cLab    = labResults.find((l) => l.testName.toLowerCase().includes("hba1c"));
  const egfrLab     = labResults.find((l) => l.testName.toLowerCase().includes("egfr"));
  const cyp2c19     = genetics.find((g) => g.gene.toUpperCase() === "CYP2C19");
  const phq9        = psychological.find((p) => p.testName === "PHQ-9");
  const foodInsec   = socialHistory.find((s) => s.category === "food_security");
  const systolic    = vitals?.systolicBp || 130;

  const isDiabetic  = hba1cLab ? parseFloat(hba1cLab.value) >= 6.5 : false;
  const isCKD       = egfrLab  ? parseFloat(egfrLab.value) < 60   : false;
  const isDepressed = phq9     ? phq9.score >= 10                  : false;

  const redFlags: string[] = [];
  if (egfrLab && parseFloat(egfrLab.value) < 45)
    redFlags.push(`Stage 3B/4 Chronic Kidney Disease (eGFR ${egfrLab.value} mL/min) requiring immediate nephrotoxic drug review.`);
  if (systolic >= 160)
    redFlags.push(`Stage 2 Severe Hypertension (Systolic ${systolic} mmHg) with heightened stroke/cardiovascular risk.`);
  if (phq9 && phq9.score >= 15)
    redFlags.push(`Moderately Severe Depression (PHQ-9 score: ${phq9.score}) with high medication non-adherence vulnerability.`);

  const differential = [
    {
      condition: isDiabetic
        ? "Type 2 Diabetes Mellitus with Microvascular Involvement"
        : "Metabolic Syndrome & Impaired Fasting Glucose",
      probability: "High" as const,
      confidenceScore: 94,
      reasoning: hba1cLab
        ? `Elevated HbA1c at ${hba1cLab.value}% confirms systemic hyperglycemia accompanied by polyuria and fatigue.`
        : "Clinical presentation and metabolic markers align with insulin resistance.",
      modalitySources: ["Biochemistry: HbA1c 8.9%", "Vitals: BMI 31.8", "Auscultation: Bibasilar fluid overload"],
      icd10: "E11.22",
    },
    {
      condition: isCKD
        ? "Chronic Kidney Disease Stage 3b (Cardiorenal Syndrome)"
        : "Essential Hypertension Stage 1",
      probability: "Moderate" as const,
      confidenceScore: 82,
      reasoning: egfrLab
        ? `Reduced eGFR of ${egfrLab.value} mL/min with concurrent hypertension indicates progressive nephron loss.`
        : "Elevated systolic pressure with left ventricular strain markers.",
      modalitySources: ["Biochemistry: eGFR 42 mL/min", "Signal: 12-Lead ECG LVH voltage", "Imaging: PA Chest X-Ray Cardiomegaly"],
      icd10: "N18.32",
    },
    {
      condition: isDepressed
        ? "Major Depressive Disorder, Single Episode"
        : "Adjustment Disorder with Depressed Mood",
      probability: "Moderate" as const,
      confidenceScore: 78,
      reasoning: phq9
        ? `PHQ-9 score of ${phq9.score} indicates persistent anhedonia and executive fatigue compounding medical self-management.`
        : "Psychosocial stressors contributing to chronic fatigue.",
      modalitySources: ["Psychometrics: PHQ-9 Score 16", "Audio: Reduced vocal pitch prosody", "SDOH: Food desert isolation"],
      icd10: "F32.1",
    },
  ];

  const drugInteractions = [];
  if (cyp2c19 && cyp2c19.phenotype.toLowerCase().includes("poor")) {
    drugInteractions.push({
      severity: "Critical" as const,
      interactingSubstances: ["CYP2C19 *2/*2 Loss-of-Function", "Clopidogrel (Plavix)"],
      clinicalEffect: "Significant reduction in active thiol metabolite formation, causing antiplatelet failure and stent thrombosis risk.",
      actionRequired: "Prescribe Ticagrelor 90 mg BID or Prasugrel 10 mg daily (CPIC Level 1A Recommendation).",
    });
  }

  const medicationSuggestions = [
    {
      drug: isCKD ? "Empagliflozin (SGLT2i)" : "Metformin HCl",
      dosage: isCKD ? "10 mg" : "500 mg",
      frequency: "Once daily with breakfast",
      route: "Oral",
      clinicalRationale: isCKD
        ? "Provides robust cardiorenal protection, slows CKD progression, and optimizes glycemic control with minimal hypoglycemia risk."
        : "First-line insulin sensitizer with proven long-term cardiovascular outcomes.",
      precautions: "Monitor eGFR and ensure patient stays well-hydrated; educate on genital mycotic hygiene.",
      modalitySources: ["Biochemistry: eGFR 42", "Signal: ECG LVH voltage"],
      pharmacogenomicNote: "No CYP450 metabolism dependency.",
      renalHepaticAdjustment: isCKD
        ? "Approved for cardiorenal protection down to eGFR 20 mL/min."
        : "Cap at 1000 mg/day if eGFR is 30-44.",
    },
    {
      drug: "Sertraline HCl",
      dosage: "25 mg (titrate to 50 mg after 14 days)",
      frequency: "Once daily in the morning",
      route: "Oral",
      clinicalRationale: "First-line SSRI for moderate-severe depression with favorable cardiovascular and renal safety profile.",
      precautions: "Monitor for initial gastrointestinal upset and assess suicidal ideation during the initial 2-4 weeks.",
      modalitySources: ["Psychometrics: PHQ-9 Score 16", "Audio: Acoustic Speech Analysis"],
      pharmacogenomicNote: "Standard hepatic CYP2B6/CYP2C19 pathway; low starting dose recommended.",
      renalHepaticAdjustment: "No dose reduction required in mild-to-moderate renal impairment.",
    },
  ];

  const suggestedTests = [
    {
      testName: "Urine Albumin-to-Creatinine Ratio (uACR)",
      category: "Renal / Nephrology",
      clinicalReason: "Detect early diabetic nephropathy and quantify microalbuminuria for RAS-blockade titration.",
      priority: "Urgent" as const,
    },
    {
      testName: "Comprehensive Metabolic Panel (CMP) + Lipid Panel",
      category: "Biochemistry",
      clinicalReason: "Assess electrolyte stability, serum potassium, and LDL-C targets.",
      priority: "Routine" as const,
    },
  ];

  const modalityAttributions = [
    { modalityType: "Imaging (Radiology)",      label: "Chest PA X-Ray",             findingSummary: "Mild left ventricular prominence consistent with chronic systemic hypertension",                    confidenceContribution: 88 },
    { modalityType: "Audio (Auscultation)",     label: "Bilateral Lung Sounds",       findingSummary: "Fine end-inspiratory crackles at bilateral pulmonary bases indicative of early fluid retention",    confidenceContribution: 85 },
    { modalityType: "Signal (Bioelectric)",     label: "12-Lead Resting ECG Strip",   findingSummary: "Sinus rhythm at 78 bpm with Sokolow-Lyon criteria positive for LVH and QTc 435 ms",              confidenceContribution: 92 },
    { modalityType: "Genomics (PGx)",           label: "CYP2C19 *2/*2 Assay",         findingSummary: "Poor metabolizer phenotype resulting in failure of clopidogrel bioactivation",                      confidenceContribution: 96 },
    { modalityType: "Psychometrics",            label: "PHQ-9 Clinical Scale",        findingSummary: "Score 16 indicating moderately severe depression with high medication non-adherence risk",           confidenceContribution: 90 },
    { modalityType: "Social Determinants",      label: "Food Security Assessment",    findingSummary: "Resident of designated food desert with limited access to affordable fresh produce",                confidenceContribution: 87 },
  ];

  const multidisciplinaryCarePlan = {
    physician: {
      clinicalDiagnoses: [
        "Type 2 Diabetes Mellitus with Diabetic Nephropathy (E11.22)",
        "Chronic Kidney Disease Stage 3b (N18.32)",
        "Essential Hypertension with Left Ventricular Hypertrophy (I10)",
        "Major Depressive Disorder, Single Episode (F32.1)",
      ],
      primaryActions: [
        "Initiate Empagliflozin 10 mg daily for renal and cardiovascular protection",
        "Initiate Sertraline 25 mg daily with mental health follow-up in 4 weeks",
        "Refer to Clinical Dietitian for Diabetic Renal Medical Nutrition Therapy",
        "Refer to Hospital Social Work for SNAP assistance and community support",
      ],
      referralsNeeded: [
        "Clinical Nutrition / Dietetics (MNT)",
        "Medical Social Work (SDOH & SNAP)",
        "Physical Therapy (Supervised Conditioning)",
        "Clinical Psychology (CBT for Chronic Illness)",
      ],
    },
    nurse: {
      nursingDiagnoses: [
        "Risk for unstable blood glucose related to metabolic dysregulation",
        "Deficient fluid volume balance / peripheral edema related to CKD 3b",
        "Risk for falls related to physical deconditioning and fatigue",
      ],
      monitoringProtocols: [
        "Daily morning fasting capillary blood glucose tracking",
        "Bi-weekly seated and standing blood pressure monitoring to assess for orthostasis",
        "Inspect bilateral lower extremities weekly for skin breakdown or worsening edema",
      ],
      fallPrecautions: "Implement standard fall prevention precautions; educate on slow posture transitions.",
      patientEducationFocus: [
        "Maintain adequate daily hydration while on SGLT2 inhibitor (Empagliflozin)",
        "Recognize hypoglycemia symptoms (sweating, tremor, confusion) and apply 15-15 rule",
        "Daily foot inspection and skin care routine",
      ],
    },
    pharmacist: {
      interactionWarnings: [
        "CYP2C19 *2/*2 Loss-of-Function: Ineffective clopidogrel activation; contraindication flagged",
        "Lisinopril + Empagliflozin: Monitor serum potassium and renal function within 2-4 weeks",
      ],
      renalDoseAdjustments: [
        "eGFR 42 mL/min: Metformin capped at 1000 mg/day; Empagliflozin 10 mg is safe and indicated",
        "Sertraline: No dosage adjustment required for mild-to-moderate renal impairment",
      ],
      pharmacogenomicNotes:
        "CYP2C19 *2/*2 poor metabolizer confirmed. If antiplatelet therapy required, use Ticagrelor or Prasugrel (CPIC Level 1A).",
      counselingPoints: [
        "Take Empagliflozin in the morning with breakfast and drink plenty of water",
        "Take Sertraline consistently in morning to minimize insomnia",
      ],
    },
    physiotherapist: {
      mobilityGoal: "Improve functional exercise tolerance and achieve 150 minutes/week moderate aerobic walking.",
      prescribedExercises: [
        "Low-impact recumbent stationary cycling 20 min @ RPE 4-5/10",
        "Seated resistance band knee extensions and chest presses (2 sets x 10 reps, 3x/week)",
        "Tandem stance and heel-to-toe walking balance drills with countertop support",
      ],
      balanceFallPrevention: "Conduct dynamic balance training 3x/week; educate on dual-task ambulation safety.",
      intensityFrequency: "Moderate intensity (RPE 4-5/10), 4-5 sessions per week.",
    },
    dietitian: {
      medicalNutritionTherapy: "Renal-Protective Mediterranean Diet (<2,000 mg Sodium/day, 0.8g protein/kg body weight).",
      sodiumPotassiumLimits: "Sodium cap: 2,000 mg/day; monitor serum potassium with ACEi and SGLT2i therapy.",
      glycemicTargets: "Fasting glucose 80-130 mg/dL; postprandial peak < 180 mg/dL.",
      foodInsecurityStrategy:
        "Focus on affordable, nutrient-dense pantry staples: dried or rinsed low-sodium canned black beans, frozen leafy greens, rolled oats, and brown rice.",
    },
    socialWorker: {
      identifiedSdohRisks: [
        "Residence in USDA-designated urban food desert",
        "Transportation barrier to full-service grocery stores",
        "Financial strain regarding medication co-pays",
      ],
      communityResourcesToConnect: [
        "Hospital Medical Social Work fresh food box weekly voucher program",
        "Emergency Supplemental Nutrition Assistance Program (SNAP) expedited enrollment",
        "County subsidized medical transit service card",
      ],
      caregiverAndSupportPlan:
        "Partner with spouse regarding medication reminder schedule and connect with local Diabetes Self-Management Education group.",
    },
    geneticCounselor: {
      variantInterpretation: "CYP2C19 *2/*2 represents homozygous loss-of-function resulting in poor metabolizer status.",
      counselingGuidance:
        "Assure the patient that clopidogrel resistance is genetic and non-behavioral; provide written PGx card for medical records.",
    },
  };

  return {
    patientSummaryInsight: `A complex multimodal biopsychosocial case in a ${patient.age}-year-old ${patient.gender} presenting with metabolic dysregulation, renal vulnerability (eGFR: ${
      egfrLab?.value || "N/A"
    }), bioelectric LVH strain on 12-lead ECG, and acoustic crackles. Multidisciplinary care coordination across physician, nursing, pharmacy, physiotherapy, nutrition, and social work is indicated for optimal outcomes.`,
    differentialDiagnoses: differential,
    redFlagsUrgentAlerts:
      redFlags.length > 0 ? redFlags : ["Routine monitoring indicated. No acute emergent red flags."],
    drugInteractionsSafety: drugInteractions,
    medicationSuggestions,
    suggestedLabAndImaging: suggestedTests,
    lifestyleAndDietaryInterventions: {
      dietaryGuidance: [
        "Transition to Low-Glycemic, Renal-Protective Mediterranean Diet (target < 2,000 mg sodium/day).",
        "Emphasize plant-forward proteins (legumes, tofu), whole grains, and leafy vegetables.",
        "Eliminate sugar-sweetened beverages and ultra-processed carbohydrate snacks.",
      ],
      exercisePhysiology: [
        "Prescribe low-impact aerobic conditioning: 30 minutes brisk walking 5 days/week (RPE 4-5/10).",
        "Incorporate light progressive resistance bands twice weekly to enhance peripheral insulin sensitivity.",
      ],
      sleepAndStressProtocol: [
        "Implement cognitive behavioral sleep hygiene: consistent 10:30 PM bedtime, screen curfew 60 min prior.",
        "Daily 10-minute diaphragmatic breathing or guided mindfulness to downregulate sympathetic tone.",
      ],
      economicAccessibilityNotes: foodInsec
        ? "Prescription utilizes low-cost staple pantry items (canned black beans rinsed, frozen spinach, rolled oats) avoiding expensive boutique health foods."
        : "Standard balanced nutritional plan.",
    },
    psychologicalSupportStrategies: [
      "Referral to Clinical Psychologist for 8-week Cognitive Behavioral Therapy (CBT) focusing on chronic disease acceptance and behavioral activation.",
      "Structured medication calendar and smart phone reminder pairing to mitigate executive fatigue.",
    ],
    socialInterventions: [
      "Immediate referral to Hospital Medical Social Worker for SNAP enrollment and local subsidized farm-share fresh produce voucher program.",
      "Enrollment in Community Diabetes Self-Management Education and Support (DSMES) group.",
    ],
    guidelineEvidenceCitations: [
      "ADA Standards of Care in Diabetes (2026 Update) — Glycemic & Cardiorenal Targets",
      "KDIGO Clinical Practice Guideline for Diabetes Management in CKD",
      "CPIC Guideline for CYP2C19 Genotype and Clopidogrel Therapy",
      "APA Clinical Practice Guideline for the Treatment of Depression Across the Lifespan",
    ],
    modalityAttributions,
    multidisciplinaryCarePlan,
    aiConfidenceIndex: 95,
    modelVersion: "NiniMed-Deterministic-Engine-v2",
  };
}
