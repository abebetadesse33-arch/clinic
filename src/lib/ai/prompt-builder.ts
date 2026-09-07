import {
  Patient,
  VitalsRecord,
  SymptomRecord,
  LabResultRecord,
  GeneticProfileRecord,
  ImagingFindingRecord,
  PsychologicalAssessmentRecord,
  SocialHistoryRecord,
  MedicationRecord,
  MediaAssetRecord,
  NursingAssessmentRecord,
  PhysiotherapyAssessmentRecord,
  NutritionAssessmentRecord,
  RespiratoryAssessmentRecord,
} from "../types/clinical";

export interface CompletePatientClinicalBundle {
  patient: Patient;
  vitals?: VitalsRecord;
  symptoms: SymptomRecord[];
  labResults: LabResultRecord[];
  genetics: GeneticProfileRecord[];
  imaging: ImagingFindingRecord[];
  psychological: PsychologicalAssessmentRecord[];
  socialHistory: SocialHistoryRecord[];
  activeMedications: MedicationRecord[];
  mediaAssets?: MediaAssetRecord[];
  nursing?: NursingAssessmentRecord[];
  physiotherapy?: PhysiotherapyAssessmentRecord[];
  nutrition?: NutritionAssessmentRecord[];
  respiratory?: RespiratoryAssessmentRecord[];
}

export function buildBiopsychosocialPrompt(bundle: CompletePatientClinicalBundle): string {
  const {
    patient,
    vitals,
    symptoms,
    labResults,
    genetics,
    imaging,
    psychological,
    socialHistory,
    activeMedications,
    mediaAssets = [],
    nursing = [],
    physiotherapy = [],
    nutrition = [],
    respiratory = [],
  } = bundle;

  const demographicsText = `
PATIENT IDENTIFICATION & DEMOGRAPHICS:
- Age: ${patient.age} yrs | Gender: ${patient.gender} | Blood Type: ${patient.bloodType} | MRN: ${patient.mrn}
- Documented Allergies: ${patient.allergies.length > 0
      ? patient.allergies.map((a) => `${a.substance} (${a.severity}: ${a.reaction})`).join("; ")
      : "No known drug allergies (NKDA)"
    }
`;

  const vitalsText = vitals
    ? `
PHYSIOLOGICAL VITALS & BIOELECTRIC SIGNALS:
- BP: ${vitals.systolicBp}/${vitals.diastolicBp} mmHg | HR: ${vitals.heartRate} bpm | SpO2: ${vitals.oxygenSaturation}% | Temp: ${vitals.temperatureC}°C
- BMI: ${vitals.bmi} (${vitals.weightKg} kg, ${vitals.heightCm} cm) | ECG Summary: ${vitals.ecgSummary || "Normal sinus"}
`
    : "PHYSIOLOGICAL VITALS: None recorded.";

  const symptomsText = `
PRESENTING SYMPTOMS & CHIEF COMPLAINT:
${symptoms.map((s) => `- ${s.name} (${s.severity.toUpperCase()}, duration: ${s.duration}) - ${s.description}`).join("\n") || "- None"}
`;

  const labsText = `
BIOCHEMICAL & LABORATORY PANELS:
${labResults
      .map(
        (l) =>
          `- ${l.testName} (${l.category}): ${l.value} ${l.unit} [Ref: ${l.referenceRangeLow}-${l.referenceRangeHigh}] -> ${l.isAbnormal ? `*ABNORMAL / ${l.interpretation}*` : "Normal"
          }`
      )
      .join("\n") || "- None"
    }
`;

  const geneticsText = `
PHARMACOGENOMICS & GENOMICS:
${genetics.map((g) => `- Gene: ${g.gene} | Variant: ${g.variant} | Phenotype: ${g.phenotype} -> ${g.clinicalSignificance}`).join("\n") || "- None"}
`;

  const multidisciplinaryAssessmentsText = `
MULTIDISCIPLINARY CARE TEAM ASSESSMENTS:
- Nursing Assessment: ${nursing.length > 0
      ? nursing.map((n) => `Morse Fall Score: ${n.morseFallScore} (${n.fallRiskCategory} risk) | Pain: ${n.painScore}/10 | Notes: ${n.nursingCareNotes}`).join("; ")
      : "No nursing assessment on file"
    }
- Physiotherapy Assessment: ${physiotherapy.length > 0
      ? physiotherapy.map((pt) => `Berg Balance Score: ${pt.bergBalanceScore}/56 | Gait Speed: ${pt.gaitSpeedMetersPerSec} m/s | Rehab Goal: ${pt.rehabGoals}`).join("; ")
      : "No PT assessment on file"
    }
- Nutrition Assessment: ${nutrition.length > 0
      ? nutrition.map((nu) => `Diet Type: ${nu.dietType} | Daily Calorie Target: ${nu.dailyCalorieTarget} kcal | Sodium Limit: ${nu.sodiumLimitMg} mg | Accommodation: ${nu.foodInsecurityAccommodation}`).join("; ")
      : "No dietitian assessment on file"
    }
- Psychological Assessment: ${psychological.length > 0
      ? psychological.map((p) => `${p.testName}: Score ${p.score} (${p.severity}) | Adherence Risk: ${p.adherenceRisk}`).join("; ")
      : "No psych assessment"
    }
- Social Determinants (SDOH): ${socialHistory.length > 0
      ? socialHistory.map((s) => `${s.category.toUpperCase()}: ${s.indicator} (${s.severityLevel} severity) - ${s.description}`).join("; ")
      : "No SDOH barriers noted"
    }
- Active Medications: ${activeMedications.map((m) => `${m.name} ${m.dosage} (${m.frequency}, ${m.route})`).join("; ") || "None"
    }
`;

  return `
You are the Multidisciplinary Clinical AI Orchestrator (NiniMed Enterprise v3.0).
Your goal is to synthesize patient data across all modalities and generate a unified, collaborative care plan segmented for the entire healthcare team:
1. Physician / NP / PA: Differential diagnoses, medical prescriptions, diagnostic orders, referrals.
2. Nurse: Nursing care plan, fall risk precautions, vital monitoring protocols, patient education.
3. Pharmacist: Drug-drug interactions, renal/hepatic dosing adjustments, pharmacogenomics warnings (CPIC), medication counseling.
4. Physiotherapist: Mobility goals, exercise prescription, balance & fall prevention regimens.
5. Dietitian: Medical Nutrition Therapy (MNT), meal structure, glycemic/renal limits, food insecurity accommodations.
6. Social Worker: SDOH interventions, community pantry/SNAP connections, transportation aid, caregiver support.
7. Genetic Counselor: Actionable variant guidance, family screening recommendations.

${demographicsText}
${vitalsText}
${symptomsText}
${labsText}
${geneticsText}
${multidisciplinaryAssessmentsText}

OUTPUT FORMAT: Return pure valid JSON with these exact top-level fields:
{
  "patientSummaryInsight": "2-3 sentence holistic clinical synthesis.",
  "differentialDiagnoses": [
    { "condition": "Name", "probability": "High" | "Moderate" | "Low", "confidenceScore": 85, "reasoning": "Rationale", "modalitySources": ["Lab: HbA1c", "Imaging: Chest X-Ray"], "icd10": "E11.22" }
  ],
  "redFlagsUrgentAlerts": ["Alert 1", "Alert 2"],
  "drugInteractionsSafety": [
    { "severity": "Critical" | "Major" | "Moderate", "interactingSubstances": ["Drug A", "Gene B"], "clinicalEffect": "Effect", "actionRequired": "Action" }
  ],
  "medicationSuggestions": [
    { "drug": "Drug Name", "dosage": "10 mg", "frequency": "Daily", "route": "Oral", "clinicalRationale": "Reason", "precautions": "Precautions", "modalitySources": ["Biochemistry: eGFR 42"] }
  ],
  "suggestedLabAndImaging": [
    { "testName": "Test Name", "category": "Category", "clinicalReason": "Reason", "priority": "Routine" | "Urgent" | "STAT" }
  ],
  "lifestyleAndDietaryInterventions": {
    "dietaryGuidance": ["Diet 1"],
    "exercisePhysiology": ["Exercise 1"],
    "sleepAndStressProtocol": ["Sleep 1"],
    "economicAccessibilityNotes": "Budget notes"
  },
  "psychologicalSupportStrategies": ["Psych 1"],
  "socialInterventions": ["Social 1"],
  "guidelineEvidenceCitations": ["ADA 2026", "KDIGO 2024", "CPIC CYP2C19"],
  "modalityAttributions": [
    { "modalityType": "Imaging", "label": "Chest X-Ray", "findingSummary": "Mild LV prominence", "confidenceContribution": 90 }
  ],
  "multidisciplinaryCarePlan": {
    "physician": {
      "clinicalDiagnoses": ["Type 2 Diabetes Mellitus with Microvascular Involvement", "CKD Stage 3b", "Major Depression"],
      "primaryActions": ["Initiate SGLT2i therapy", "Titrate ACEi for microalbuminuria", "Refer to Dietitian and Social Worker"],
      "referralsNeeded": ["Clinical Dietitian (MNT)", "Hospital Social Worker (SNAP & Food Assistance)", "Physical Therapy (Conditioning)"]
    },
    "nurse": {
      "nursingDiagnoses": ["Risk for unstable blood glucose", "Deficient knowledge regarding SGLT2i hydration", "Fall risk related to antalgic gait"],
      "monitoringProtocols": ["Check morning fasting glucose", "Monitor standing BP for orthostasis", "Inspect bilateral lower extremities for skin breakdown"],
      "fallPrecautions": "Implement standard bedside fall precautions; non-skid footwear; call light within reach.",
      "patientEducationFocus": ["Hydration and mycotic hygiene on Empagliflozin", "Hypoglycemia recognition and management rule of 15s"]
    },
    "pharmacist": {
      "interactionWarnings": ["Clopidogrel resistance due to CYP2C19 *2/*2 genotype (poor metabolizer)"],
      "renalDoseAdjustments": ["Metformin contraindicated/capped at eGFR 42 mL/min; Empagliflozin 10mg safe down to eGFR 20"],
      "pharmacogenomicNotes": "CYP2C19 *2/*2 loss of function: Recommend switching antiplatelet from Clopidogrel to Ticagrelor 90mg BID.",
      "counselingPoints": ["Take Sertraline in morning with food", "Take Empagliflozin with full glass of water"]
    },
    "physiotherapist": {
      "mobilityGoal": "Achieve 150 minutes/week moderate aerobic walking and improve Berg balance score from 42 to 48/56.",
      "prescribedExercises": ["Low-impact recumbent stationary cycling 20 min @ RPE 4/10", "Seated resistance band leg extensions 2x10 reps", "Tandem stance and single-leg balance drills with countertop support"],
      "balanceFallPrevention": "Conduct dynamic balance training 3x/week; educate on dual-task ambulation safety.",
      "intensityFrequency": "Moderate intensity, 4-5 sessions per week."
    },
    "dietitian": {
      "medicalNutritionTherapy": "Renal-Protective Diabetic Mediterranean Diet (<2,000 mg Sodium/day, 0.8g protein/kg body weight).",
      "sodiumPotassiumLimits": "Sodium cap: 2,000 mg/day; Potassium monitoring indicated with ACEi/SGLT2i co-administration.",
      "glycemicTargets": "Fasting glucose 80-130 mg/dL; Postprandial < 180 mg/dL.",
      "foodInsecurityStrategy": "Utilize low-cost pantry staples (canned legumes rinsed, frozen spinach, rolled oats, brown rice) avoiding expensive specialty items."
    },
    "socialWorker": {
      "identifiedSdohRisks": ["Resident of USDA-designated food desert", "Transportation barrier to full-service grocery stores", "Economic copay strain"],
      "communityResourcesToConnect": ["Hospital Food Pantry voucher program", "SNAP Emergency Allotment Enrollment", "County Paratransit subsidized medical transport"],
      "caregiverAndSupportPlan": "Coordinate with spouse regarding medication reminder schedule and local DSMES support group."
    },
    "geneticCounselor": {
      "variantInterpretation": "CYP2C19 *2/*2 represents complete loss of functional CYP2C19 enzyme activity.",
      "counselingGuidance": "Explain to patient that genetic variability causes normal clopidogrel doses to be ineffective, not personal treatment failure."
    }
  },
  "aiConfidenceIndex": 95,
  "modelVersion": "Gemini-1.5-Pro-Multidisciplinary-Enterprise"
}
`;
}
