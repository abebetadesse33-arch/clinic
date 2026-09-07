/**
 * Medication Education Service
 * Multi-vector interaction checking (DDI, drug-food, drug-condition,
 * pharmacogenomics) with plain-language side-effect classification
 * and patient-friendly counseling summaries.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type InteractionSeverity = "contraindicated" | "major" | "moderate" | "minor" | "none";
export type SideEffectFrequency = "very_common" | "common" | "uncommon" | "rare" | "very_rare";
export type SideEffectSeverity = "severe" | "moderate" | "mild";

export interface DrugInteraction {
  drugA: string;
  drugB: string;
  severity: InteractionSeverity;
  mechanism: string;
  clinicalEffect: string;
  plainLanguage: string;
  managementRecommendation: string;
}

export interface DrugFoodInteraction {
  drug: string;
  food: string;
  severity: InteractionSeverity;
  effect: string;
  plainLanguage: string;
}

export interface SideEffect {
  effectName: string;
  frequency: SideEffectFrequency;
  severity: SideEffectSeverity;
  plainLanguage: string;
  onsetTypical: string;
  managementTip: string;
  requiresImmediateAttention: boolean;
}

export interface PharmacogenomicAlert {
  gene: string;
  allele: string;
  drug: string;
  implication: string;
  recommendation: string;
}

export interface MedicationProfile {
  drugName: string;
  genericName: string;
  drugClass: string;
  mechanism: string;
  plainMechanism: string;
  interactions: DrugInteraction[];
  foodInteractions: DrugFoodInteraction[];
  sideEffects: SideEffect[];
  pharmacogenomicAlerts: PharmacogenomicAlert[];
  counselingSummary: string;
  storageInstructions: string;
  missedDoseTip: string;
}

export interface MedicationReviewResult {
  reviewedMedications: string[];
  interactions: DrugInteraction[];
  foodInteractions: DrugFoodInteraction[];
  pharmacogenomicAlerts: PharmacogenomicAlert[];
  overallRiskScore: "high" | "moderate" | "low";
  plainLanguageSummary: string;
  priorityWarnings: string[];
}

// ─── Drug Interaction Database (Clinical DDI Rules) ─────────────────────────

const DDI_RULES: DrugInteraction[] = [
  {
    drugA: "warfarin",
    drugB: "aspirin",
    severity: "major",
    mechanism: "Additive anticoagulant/antiplatelet effect via thromboxane inhibition",
    clinicalEffect: "Significantly increased bleeding risk including GI hemorrhage",
    plainLanguage: "Taking aspirin with warfarin greatly increases your risk of serious bleeding. Your stomach or intestines could bleed.",
    managementRecommendation: "Avoid unless specifically directed by cardiologist. Monitor INR closely if combined.",
  },
  {
    drugA: "metformin",
    drugB: "contrast dye",
    severity: "major",
    mechanism: "Iodinated contrast can cause acute kidney injury, impairing metformin clearance leading to lactic acidosis",
    clinicalEffect: "Lactic acidosis risk, potentially fatal",
    plainLanguage: "If you are having an X-ray or CT scan with dye injected, you must stop metformin before and after. Tell the radiologist you take metformin.",
    managementRecommendation: "Hold metformin 48h before contrast and restart only after kidney function confirmed normal.",
  },
  {
    drugA: "lisinopril",
    drugB: "potassium",
    severity: "moderate",
    mechanism: "ACE inhibitors reduce aldosterone, decreasing potassium excretion; supplements can cause hyperkalemia",
    clinicalEffect: "Hyperkalemia → cardiac arrhythmia",
    plainLanguage: "Lisinopril already raises potassium levels. Taking potassium supplements on top of this can cause dangerous heart rhythm problems.",
    managementRecommendation: "Avoid potassium supplements unless prescribed. Monitor serum potassium periodically.",
  },
  {
    drugA: "metformin",
    drugB: "alcohol",
    severity: "moderate",
    mechanism: "Both increase lactic acid production and decrease hepatic gluconeogenesis",
    clinicalEffect: "Increased lactic acidosis risk; enhanced hypoglycemia",
    plainLanguage: "Drinking alcohol while on metformin raises the risk of a condition called lactic acidosis, which causes muscle pain and serious illness.",
    managementRecommendation: "Advise minimal to no alcohol. Binge drinking contraindicated.",
  },
  {
    drugA: "atorvastatin",
    drugB: "clarithromycin",
    severity: "major",
    mechanism: "CYP3A4 inhibition by clarithromycin increases atorvastatin plasma concentration",
    clinicalEffect: "Rhabdomyolysis risk (severe muscle breakdown)",
    plainLanguage: "The antibiotic clarithromycin prevents your body from breaking down the cholesterol medication atorvastatin, causing dangerous levels to build up.",
    managementRecommendation: "Temporarily discontinue atorvastatin during short antibiotic course, or switch to pravastatin which is not CYP3A4 metabolized.",
  },
  {
    drugA: "sildenafil",
    drugB: "nitrates",
    severity: "contraindicated",
    mechanism: "Synergistic nitric oxide/cGMP pathway activation causing profound vasodilation",
    clinicalEffect: "Severe hypotension, syncope, myocardial infarction",
    plainLanguage: "This combination is absolutely forbidden. It can cause your blood pressure to drop dangerously low within minutes.",
    managementRecommendation: "Absolute contraindication. Do not use together under any circumstance.",
  },
  {
    drugA: "ssri",
    drugB: "tramadol",
    severity: "major",
    mechanism: "Both increase serotonin; tramadol also inhibits serotonin reuptake",
    clinicalEffect: "Serotonin syndrome: hyperthermia, agitation, clonus",
    plainLanguage: "Combining your antidepressant with tramadol can cause serotonin syndrome — a dangerous condition with high fever, shaking, and confusion.",
    managementRecommendation: "Choose alternative analgesic (paracetamol, NSAID if not contraindicated). If tramadol essential, monitor closely.",
  },
];

// ─── Drug-Food Interaction Database ─────────────────────────────────────────

const FOOD_INTERACTION_RULES: DrugFoodInteraction[] = [
  {
    drug: "warfarin",
    food: "leafy greens (spinach, kale, broccoli)",
    severity: "moderate",
    effect: "High vitamin K content reduces anticoagulant efficacy",
    plainLanguage: "Foods rich in vitamin K (spinach, kale, broccoli) reduce how well warfarin prevents blood clots. Eat consistent amounts, do not suddenly eat more or less.",
  },
  {
    drug: "simvastatin",
    food: "grapefruit",
    severity: "major",
    effect: "Grapefruit furanocoumarins inhibit CYP3A4 in gut wall, dramatically increasing statin bioavailability",
    plainLanguage: "Do NOT eat grapefruit or drink grapefruit juice with simvastatin. It can cause dangerous muscle breakdown by making the drug too strong.",
  },
  {
    drug: "levothyroxine",
    food: "calcium/iron supplements, coffee",
    severity: "moderate",
    effect: "Calcium and iron bind levothyroxine in gut, reducing absorption by 20-40%",
    plainLanguage: "Take your thyroid tablet on an empty stomach first thing in the morning. Wait at least 30 minutes before eating, coffee, or taking calcium/iron supplements.",
  },
  {
    drug: "metronidazole",
    food: "alcohol",
    severity: "major",
    effect: "Disulfiram-like reaction via acetaldehyde accumulation",
    plainLanguage: "Do not drink ANY alcohol while taking metronidazole and for 48 hours after finishing. Even a small amount will cause severe nausea, vomiting, flushing, and palpitations.",
  },
  {
    drug: "monoamine oxidase inhibitors",
    food: "tyramine-rich foods (aged cheese, cured meats)",
    severity: "major",
    effect: "MAO inhibition prevents tyramine breakdown causing hypertensive crisis",
    plainLanguage: "Avoid aged cheeses, salami, wine, soy sauce, and pickled foods while on this antidepressant. These can cause your blood pressure to spike dangerously.",
  },
];

// ─── Side Effect Database ────────────────────────────────────────────────────

const SIDE_EFFECT_DB: Record<string, SideEffect[]> = {
  metformin: [
    {
      effectName: "Nausea and diarrhoea",
      frequency: "very_common",
      severity: "mild",
      plainLanguage: "Stomach upset and loose stools are very common when starting metformin. This usually improves within 2–4 weeks.",
      onsetTypical: "First 2 weeks",
      managementTip: "Take metformin with food. Consider extended-release (XR) formulation to reduce GI side effects.",
      requiresImmediateAttention: false,
    },
    {
      effectName: "Vitamin B12 deficiency",
      frequency: "uncommon",
      severity: "moderate",
      plainLanguage: "Long-term metformin can reduce vitamin B12 absorption, causing numbness or fatigue.",
      onsetTypical: "After years of use",
      managementTip: "Annual B12 blood test recommended. Supplement if deficient.",
      requiresImmediateAttention: false,
    },
    {
      effectName: "Lactic acidosis",
      frequency: "very_rare",
      severity: "severe",
      plainLanguage: "Extremely rare but serious: muscle pain, difficulty breathing, stomach pain, and feeling cold or dizzy.",
      onsetTypical: "Any time; risk highest with kidney disease",
      managementTip: "Go to emergency immediately. This is a medical emergency.",
      requiresImmediateAttention: true,
    },
  ],
  lisinopril: [
    {
      effectName: "Dry persistent cough",
      frequency: "common",
      severity: "mild",
      plainLanguage: "A dry, tickling cough is very common with lisinopril and affects up to 20% of patients. It is not dangerous.",
      onsetTypical: "Within weeks of starting",
      managementTip: "If bothersome, ask your doctor about switching to an ARB (e.g., losartan) which does not cause cough.",
      requiresImmediateAttention: false,
    },
    {
      effectName: "Angioedema",
      frequency: "rare",
      severity: "severe",
      plainLanguage: "Sudden swelling of lips, tongue, throat, or face is a rare but dangerous reaction requiring immediate emergency care.",
      onsetTypical: "Typically within first weeks, but can occur anytime",
      managementTip: "Call emergency services immediately. Do not wait.",
      requiresImmediateAttention: true,
    },
    {
      effectName: "Dizziness on standing",
      frequency: "common",
      severity: "mild",
      plainLanguage: "You may feel dizzy when you stand up quickly because this medicine lowers blood pressure.",
      onsetTypical: "First few days",
      managementTip: "Rise slowly from sitting or lying position. Increase fluid intake if not contraindicated.",
      requiresImmediateAttention: false,
    },
  ],
  atorvastatin: [
    {
      effectName: "Muscle aches (myalgia)",
      frequency: "common",
      severity: "moderate",
      plainLanguage: "Some muscle soreness or weakness is common with cholesterol medications. Report severe or unexplained muscle pain.",
      onsetTypical: "Any time",
      managementTip: "Report persistent muscle pain. Your doctor may check CK levels or lower the dose.",
      requiresImmediateAttention: false,
    },
    {
      effectName: "Liver enzyme elevation",
      frequency: "uncommon",
      severity: "moderate",
      plainLanguage: "Rarely, statins affect liver function. Blood tests will monitor this.",
      onsetTypical: "First 3–6 months",
      managementTip: "Annual liver function tests. Avoid excessive alcohol.",
      requiresImmediateAttention: false,
    },
  ],
};

// ─── Pharmacogenomic Alert Rules ─────────────────────────────────────────────

const PGX_RULES: PharmacogenomicAlert[] = [
  {
    gene: "CYP2C19",
    allele: "*2/*2 (Poor Metabolizer)",
    drug: "clopidogrel",
    implication: "Clopidogrel is a prodrug requiring CYP2C19 activation. Poor metabolizers have <10% of expected antiplatelet effect → stent thrombosis risk.",
    recommendation: "Switch to prasugrel or ticagrelor which do not require CYP2C19 activation.",
  },
  {
    gene: "CYP2D6",
    allele: "*4/*4 (Poor Metabolizer)",
    drug: "codeine",
    implication: "Codeine requires CYP2D6 to convert to morphine. Poor metabolizers get inadequate pain relief.",
    recommendation: "Use alternative analgesics (tramadol cautiously, or low-dose morphine with adjusted dosing).",
  },
  {
    gene: "TPMT",
    allele: "Low Activity Variant",
    drug: "azathioprine",
    implication: "Impaired thiopurine methyltransferase leads to toxic accumulation causing severe myelosuppression.",
    recommendation: "Reduce azathioprine dose by 50-90% or consider alternative immunosuppressant.",
  },
  {
    gene: "VKORC1",
    allele: "-1639G>A",
    drug: "warfarin",
    implication: "Reduced VKORC1 expression means patients need lower warfarin doses to achieve target INR.",
    recommendation: "Start at 30-50% lower initial dose. More frequent INR monitoring in first month.",
  },
];

// ─── Service Functions ───────────────────────────────────────────────────────

export function checkDrugInteractions(medications: string[]): DrugInteraction[] {
  const found: DrugInteraction[] = [];
  const normalised = medications.map((m) => m.toLowerCase().trim());

  for (const rule of DDI_RULES) {
    const aMatch = normalised.some((m) => m.includes(rule.drugA));
    const bMatch = normalised.some((m) => m.includes(rule.drugB));
    if (aMatch && bMatch) {
      found.push(rule);
    }
  }
  return found;
}

export function checkFoodInteractions(medications: string[]): DrugFoodInteraction[] {
  const found: DrugFoodInteraction[] = [];
  const normalised = medications.map((m) => m.toLowerCase().trim());

  for (const rule of FOOD_INTERACTION_RULES) {
    if (normalised.some((m) => m.includes(rule.drug))) {
      found.push(rule);
    }
  }
  return found;
}

export function getSideEffects(drugName: string): SideEffect[] {
  const key = drugName.toLowerCase().trim();
  for (const [drug, effects] of Object.entries(SIDE_EFFECT_DB)) {
    if (key.includes(drug)) return effects;
  }
  return [];
}

export function getPharmacogenomicAlerts(
  medications: string[],
  knownGeneVariants?: { gene: string; allele: string }[]
): PharmacogenomicAlert[] {
  if (!knownGeneVariants?.length) return [];
  const found: PharmacogenomicAlert[] = [];
  const normalised = medications.map((m) => m.toLowerCase().trim());

  for (const rule of PGX_RULES) {
    const drugMatches = normalised.some((m) => m.includes(rule.drug));
    const geneMatches = knownGeneVariants.some(
      (v) => v.gene === rule.gene && v.allele.toLowerCase().includes(rule.allele.split(" ")[0].toLowerCase())
    );
    if (drugMatches && geneMatches) {
      found.push(rule);
    }
  }
  return found;
}

export function buildMedicationReview(
  medications: string[],
  geneVariants?: { gene: string; allele: string }[]
): MedicationReviewResult {
  const interactions = checkDrugInteractions(medications);
  const foodInteractions = checkFoodInteractions(medications);
  const pharmacogenomicAlerts = getPharmacogenomicAlerts(medications, geneVariants);

  const hasContraindicated = interactions.some((i) => i.severity === "contraindicated");
  const hasMajor = interactions.some((i) => i.severity === "major");
  const overallRiskScore: "high" | "moderate" | "low" = hasContraindicated || hasMajor
    ? "high"
    : interactions.length > 0
    ? "moderate"
    : "low";

  const priorityWarnings: string[] = [];
  interactions
    .filter((i) => i.severity === "contraindicated" || i.severity === "major")
    .forEach((i) => priorityWarnings.push(`⚠️ ${i.drugA} + ${i.drugB}: ${i.plainLanguage}`));
  pharmacogenomicAlerts.forEach((a) =>
    priorityWarnings.push(`🧬 Genetic Alert (${a.gene}/${a.allele}): ${a.recommendation}`)
  );

  const plainLanguageSummary = overallRiskScore === "high"
    ? `Important safety alert: Your current medication combination has ${interactions.filter((i) => ["contraindicated","major"].includes(i.severity)).length} serious interaction(s) requiring immediate attention. Please review priority warnings with your doctor.`
    : overallRiskScore === "moderate"
    ? `Your medications have ${interactions.length} potential interaction(s) that require monitoring. Review recommendations with your pharmacist.`
    : `Your current medication combination appears safe. Continue as prescribed and report any new symptoms.`;

  return {
    reviewedMedications: medications,
    interactions,
    foodInteractions,
    pharmacogenomicAlerts,
    overallRiskScore,
    plainLanguageSummary,
    priorityWarnings,
  };
}

export function generateCounselingSummary(profile: {
  drugName: string;
  indication: string;
  dosage: string;
  frequency: string;
  specialInstructions?: string;
  language?: string;
}): string {
  if (profile.language === "am") {
    return `${profile.drugName} ለ${profile.indication} ያዘዘልዎ ህክምና ነው። ${profile.dosage}ን ${profile.frequency} ይውሰዱ። ${profile.specialInstructions || "ከምግብ ጋር ወይም ወዲያ በኋላ ይውሰዱ።"} አስፈላጊ ከሆነ ሀኪምዎን ያነጋግሩ።`;
  }
  return `${profile.drugName} is prescribed for ${profile.indication}. Take ${profile.dosage} ${profile.frequency}. ${profile.specialInstructions || "Best taken with food to reduce stomach upset."} If side effects are bothersome, consult your prescriber before stopping.`;
}
