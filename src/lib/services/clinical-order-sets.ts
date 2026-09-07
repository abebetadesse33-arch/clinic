export interface OrderSetItem {
  id: string;
  type: "lab" | "imaging" | "medication" | "nursing" | "diet" | "consult";
  name: string;
  details: string;
  priority: "routine" | "urgent" | "stat";
  instructions?: string;
  dosage?: string;
  frequency?: string;
  route?: string;
  isPreselected: boolean;
}

export interface ClinicalOrderSet {
  id: string;
  name: string;
  icd10: string;
  indication: string;
  category: "pulmonary" | "cardiovascular" | "endocrine" | "infectious" | "renal" | "general";
  evidenceBase: string;
  items: OrderSetItem[];
}

export const CLINICAL_ORDER_SETS: ClinicalOrderSet[] = [
  // 1. Community-Acquired Pneumonia (CAP)
  {
    id: "orderset-cap-2026",
    name: "Community-Acquired Pneumonia (CAP) Admission Set",
    icd10: "J18.9",
    indication: "Inpatient admission for moderate to severe CAP",
    category: "pulmonary",
    evidenceBase: "ATS/IDSA CAP Clinical Practice Guidelines",
    items: [
      { id: "cap-lab-1", type: "lab", name: "Complete Blood Count (CBC) with Differential", details: "Assess leukocytosis, left shift, and bandemia", priority: "urgent", isPreselected: true },
      { id: "cap-lab-2", type: "lab", name: "Comprehensive Metabolic Panel (CMP)", details: "Evaluate renal function, BUN for CURB-65 score, electrolytes", priority: "urgent", isPreselected: true },
      { id: "cap-lab-3", type: "lab", name: "Blood Cultures x2 (Aerobic & Anaerobic)", details: "Draw prior to initial antibiotic administration", priority: "stat", isPreselected: true },
      { id: "cap-lab-4", type: "lab", name: "Sputum Gram Stain and Culture", details: "Deep expectorated sputum or induced", priority: "routine", isPreselected: true },
      { id: "cap-img-1", type: "imaging", name: "Chest X-Ray (PA and Lateral)", details: "Assess for focal consolidation, pleural effusion, or cavitation", priority: "urgent", isPreselected: true },
      { id: "cap-med-1", type: "medication", name: "Ceftriaxone 1g IV Daily", details: "Broad spectrum cephalosporin coverage", priority: "stat", dosage: "1g", frequency: "Q24H", route: "IV", isPreselected: true },
      { id: "cap-med-2", type: "medication", name: "Azithromycin 500mg IV Daily", details: "Atypical coverage (Mycoplasma, Legionella)", priority: "stat", dosage: "500mg", frequency: "Q24H", route: "IV", isPreselected: true },
      { id: "cap-nurs-1", type: "nursing", name: "Continuous Pulse Oximetry & O2 Titration", details: "Titrate supplemental O2 to maintain SpO2 >= 92% (>= 88% if COPD)", priority: "urgent", isPreselected: true },
      { id: "cap-diet-1", type: "diet", name: "Regular / Pureed Diet as Tolerated", details: "Ensure adequate oral hydration", priority: "routine", isPreselected: true },
    ],
  },

  // 2. Diabetic Ketoacidosis / Severe Hyperglycemia
  {
    id: "orderset-dka-2026",
    name: "Diabetic Ketoacidosis (DKA) / Severe Hyperglycemia Protocol",
    icd10: "E11.65",
    indication: "Inpatient management of acute diabetic decompensation",
    category: "endocrine",
    evidenceBase: "ADA Standards of Care: DKA Management Protocol",
    items: [
      { id: "dka-lab-1", type: "lab", name: "Basic Metabolic Panel (BMP) q2h x 3", details: "Serial potassium, sodium, bicarbonate, anion gap monitoring", priority: "stat", isPreselected: true },
      { id: "dka-lab-2", type: "lab", name: "Venous Blood Gas (VBG)", details: "Assess systemic pH and base deficit", priority: "stat", isPreselected: true },
      { id: "dka-lab-3", type: "lab", name: "Serum Beta-Hydroxybutyrate & Urinalysis", details: "Quantify ketonemia and glycosuria", priority: "stat", isPreselected: true },
      { id: "dka-med-1", type: "medication", name: "IV Normal Saline (0.9% NaCl) 1000 mL/hr x 2h", details: "Initial rapid volume resuscitation", priority: "stat", dosage: "1000mL", frequency: "Once", route: "IV", isPreselected: true },
      { id: "dka-med-2", type: "medication", name: "Regular Insulin Continuous IV Infusion 0.1 units/kg/hr", details: "Initiate after serum K+ confirmed > 3.3 mmol/L", priority: "stat", dosage: "0.1 u/kg/hr", frequency: "Continuous", route: "IV", isPreselected: true },
      { id: "dka-nurs-1", type: "nursing", name: "Point-of-Care Bedside Glucose q1h", details: "Target gradual glucose decline 50-75 mg/dL/hr", priority: "stat", isPreselected: true },
      { id: "dka-consult-1", type: "consult", name: "Clinical Dietitian / Nutrition Consult", details: "Transition meal plan and diabetic carbohydrate education", priority: "routine", isPreselected: true },
    ],
  },

  // 3. Acute Decompensated Heart Failure (ADHF)
  {
    id: "orderset-adhf-2026",
    name: "Acute Decompensated Heart Failure (ADHF) Admission Set",
    icd10: "I50.9",
    indication: "Volume overload with pulmonary congestion or peripheral edema",
    category: "cardiovascular",
    evidenceBase: "AHA/ACC/HFSA Heart Failure Management Guidelines",
    items: [
      { id: "hf-lab-1", type: "lab", name: "NT-proBNP / BNP & High-Sensitivity Troponin", details: "Cardiac biomarker quantification and acute ischemia rule-out", priority: "stat", isPreselected: true },
      { id: "hf-lab-2", type: "lab", name: "Comprehensive Metabolic Panel (CMP)", details: "Baseline eGFR, creatinine, potassium, sodium prior to diuresis", priority: "urgent", isPreselected: true },
      { id: "hf-img-1", type: "imaging", name: "12-Lead ECG & Transthoracic Echocardiogram (TTE)", details: "Evaluate rhythm, EF, wall motion, valvular pathology", priority: "urgent", isPreselected: true },
      { id: "hf-med-1", type: "medication", name: "Furosemide 40-80mg IV Push", details: "Intravenous loop diuretic for rapid decongestion", priority: "stat", dosage: "40mg", frequency: "Q12H", route: "IV", isPreselected: true },
      { id: "hf-nurs-1", type: "nursing", name: "Strict Intake & Output (I/O) + Daily Standing Weight", details: "Weigh daily at 06:00 AM on same scale", priority: "routine", isPreselected: true },
      { id: "hf-diet-1", type: "diet", name: "Cardiac Sodium-Restricted Diet (< 2,000 mg/day)", details: "Fluid restriction 1.5 - 2.0 L/day if hyponatremic", priority: "routine", isPreselected: true },
      { id: "hf-consult-1", type: "consult", name: "Physiotherapy (PT) Mobility Assessment", details: "Safe functional reconditioning and sub-maximal ambulation", priority: "routine", isPreselected: true },
    ],
  },

  // 4. Sepsis (SEP-1 Bundle Protocol)
  {
    id: "orderset-sepsis-2026",
    name: "Sepsis / Septic Shock Early Resuscitation (SEP-1 Protocol)",
    icd10: "A41.9",
    indication: "Suspected or confirmed systemic infection with organ dysfunction",
    category: "infectious",
    evidenceBase: "Surviving Sepsis Campaign International Guidelines 2026",
    items: [
      { id: "sep-lab-1", type: "lab", name: "Initial Serum Lactate & Repeat in 2-4h", details: "Assess tissue hypoperfusion; repeat if lactate > 2.0 mmol/L", priority: "stat", isPreselected: true },
      { id: "sep-lab-2", type: "lab", name: "Blood Cultures x2 Prior to Antibiotics", details: "Two separate venipuncture sites", priority: "stat", isPreselected: true },
      { id: "sep-lab-3", type: "lab", name: "CBC, CMP, Coagulation Panel (PT/INR, PTT)", details: "Screen for multi-organ dysfunction (SOFA score)", priority: "stat", isPreselected: true },
      { id: "sep-med-1", type: "medication", name: "Broad-Spectrum IV Antibiotics (Piperacillin-Tazobactam or Cefepime)", details: "Administer within 60 minutes of sepsis identification", priority: "stat", dosage: "3.375g", frequency: "Q6H", route: "IV", isPreselected: true },
      { id: "sep-med-2", type: "medication", name: "30 mL/kg IV Balanced Crystalloid Fluid Bolus", details: "For hypotension (MAP < 65) or lactate >= 4.0 mmol/L", priority: "stat", dosage: "30mL/kg", frequency: "Once", route: "IV", isPreselected: true },
      { id: "sep-nurs-1", type: "nursing", name: "Continuous Non-Invasive Hemodynamic Telemetry", details: "Target Mean Arterial Pressure (MAP) >= 65 mmHg", priority: "stat", isPreselected: true },
    ],
  },

  // 5. Hypertensive Urgency / Crisis
  {
    id: "orderset-htn-2026",
    name: "Hypertensive Urgency / Severe Uncontrolled Blood Pressure",
    icd10: "I10",
    indication: "Severe elevation in blood pressure (SBP >= 180 or DBP >= 110)",
    category: "cardiovascular",
    evidenceBase: "AHA/ACC High Blood Pressure Management Protocol",
    items: [
      { id: "htn-lab-1", type: "lab", name: "Comprehensive Metabolic Panel & Urinalysis", details: "Screen for acute target organ injury (acute kidney injury, proteinuria)", priority: "urgent", isPreselected: true },
      { id: "htn-img-1", type: "imaging", name: "12-Lead ECG", details: "Assess for left ventricular strain or acute ischemic repolarization", priority: "urgent", isPreselected: true },
      { id: "htn-med-1", type: "medication", name: "Amlodipine 10mg PO Daily", details: "Oral dihydropyridine calcium channel blocker", priority: "urgent", dosage: "10mg", frequency: "Daily", route: "Oral", isPreselected: true },
      { id: "htn-med-2", type: "medication", name: "Lisinopril 10-20mg PO Daily", details: "Oral ACE inhibitor (verify renal function and potassium)", priority: "urgent", dosage: "10mg", frequency: "Daily", route: "Oral", isPreselected: true },
      { id: "htn-nurs-1", type: "nursing", name: "Serial Blood Pressure Monitoring q15m x 1h then q1h", details: "Target gradual reduction of MAP by 15-20% over 24 hours", priority: "urgent", isPreselected: true },
      { id: "htn-diet-1", type: "diet", name: "DASH Low-Sodium Diet (< 1,500 mg/day)", details: "High potassium/fiber unless renal disease present", priority: "routine", isPreselected: true },
    ],
  },
];

export function getOrderSetById(id: string): ClinicalOrderSet | undefined {
  return CLINICAL_ORDER_SETS.find((os) => os.id === id);
}

export function getOrderSetForDiagnosis(diagnosisText: string): ClinicalOrderSet | undefined {
  const lower = diagnosisText.toLowerCase();
  if (lower.includes("pneumon") || lower.includes("cap")) return CLINICAL_ORDER_SETS[0];
  if (lower.includes("diabet") || lower.includes("dka") || lower.includes("sugar") || lower.includes("glucose")) return CLINICAL_ORDER_SETS[1];
  if (lower.includes("heart failure") || lower.includes("adhf") || lower.includes("edema")) return CLINICAL_ORDER_SETS[2];
  if (lower.includes("sepsis") || lower.includes("shock") || lower.includes("bacteremia")) return CLINICAL_ORDER_SETS[3];
  if (lower.includes("hypertens") || lower.includes("blood pressure")) return CLINICAL_ORDER_SETS[4];
  return CLINICAL_ORDER_SETS[0];
}
