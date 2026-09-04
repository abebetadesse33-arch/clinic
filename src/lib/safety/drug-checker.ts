import { Allergy, GeneticProfileRecord, LabResultRecord, MedicationRecord } from "../types/clinical";

export interface DrugSafetyAlert {
  id: string;
  type: "drug_drug" | "allergy" | "renal_hepatic" | "pharmacogenomic";
  severity: "Critical" | "Major" | "Moderate" | "Minor";
  title: string;
  description: string;
  recommendation: string;
}

// Known Drug-Drug Interaction Database
const KNOWN_DDI = [
  {
    drugA: "clopidogrel",
    drugB: "omeprazole",
    severity: "Major" as const,
    effect: "Omeprazole (CYP2C19 inhibitor) significantly decreases active metabolite formation of clopidogrel, increasing thrombosis/cardiac event risk.",
    recommendation: "Switch to pantoprazole or H2 blocker (famotidine) which exhibits minimal CYP2C19 inhibition.",
  },
  {
    drugA: "metformin",
    drugB: "contrast",
    severity: "Critical" as const,
    effect: "Iodinated radiocontrast combined with metformin in reduced renal function can precipitate lactic acidosis.",
    recommendation: "Withhold metformin 48h prior to and after iodinated contrast imaging.",
  },
  {
    drugA: "lisinopril",
    drugB: "spironolactone",
    severity: "Major" as const,
    effect: "Concomitant ACE inhibitor and potassium-sparing diuretic significantly escalates hyperkalemia risk.",
    recommendation: "Monitor serum potassium within 1 week of initiation and periodically thereafter.",
  },
  {
    drugA: "sertraline",
    drugB: "tramadol",
    severity: "Critical" as const,
    effect: "Synergistic serotonergic activity heightens the risk of life-threatening Serotonin Syndrome.",
    recommendation: "Avoid co-administration; use non-serotonergic analgesia (e.g. acetaminophen or topical NSAID).",
  },
  {
    drugA: "simvastatin",
    drugB: "amlodipine",
    severity: "Moderate" as const,
    effect: "Amlodipine increases simvastatin serum concentrations, elevating rhabdomyolysis and myopathy risk.",
    recommendation: "Do not exceed simvastatin 20 mg daily when co-prescribed with amlodipine, or substitute atorvastatin/rosuvastatin.",
  },
  {
    drugA: "warfarin",
    drugB: "ciprofloxacin",
    severity: "Critical" as const,
    effect: "Ciprofloxacin potently inhibits CYP1A2/CYP3A4, dramatically elevating INR and major hemorrhage risk.",
    recommendation: "Reduce warfarin dose by 30-50% and monitor INR within 48-72 hours, or choose alternative antibiotic.",
  },
];

// Allergy Cross-Reactivity Database
const ALLERGY_MAP: Record<string, string[]> = {
  penicillin: ["amoxicillin", "ampicillin", "augmentin", "piperacillin", "penicillin v"],
  sulfa: ["sulfamethoxazole", "bactrim", "septra", "sulfasalazine", "hydrochlorothiazide"],
  nsaid: ["ibuprofen", "naproxen", "ketorolac", "meloxicam", "aspirin", "celecoxib", "diclofenac"],
  cephalosporin: ["cephalexin", "cefuroxime", "ceftriaxone", "cefepime"],
  codeine: ["codeine", "morphine", "hydrocodone", "oxycodone"],
};

export function checkClinicalSafety(
  candidateDrug: string,
  existingMeds: MedicationRecord[],
  patientAllergies: Allergy[],
  labResults: LabResultRecord[],
  genetics: GeneticProfileRecord[]
): DrugSafetyAlert[] {
  const alerts: DrugSafetyAlert[] = [];
  const normalizedCandidate = candidateDrug.toLowerCase().trim();

  // 1. ALLERGY CHECKS
  for (const allergy of patientAllergies) {
    const allergen = allergy.substance.toLowerCase().trim();
    let isMatch = false;

    if (normalizedCandidate.includes(allergen) || allergen.includes(normalizedCandidate)) {
      isMatch = true;
    } else if (ALLERGY_MAP[allergen]) {
      isMatch = ALLERGY_MAP[allergen].some((crossDrug) =>
        normalizedCandidate.includes(crossDrug)
      );
    }

    if (isMatch) {
      alerts.push({
        id: `allergy-${Date.now()}-${Math.random()}`,
        type: "allergy",
        severity: allergy.severity === "anaphylactic" || allergy.severity === "severe" ? "Critical" : "Major",
        title: `Allergy Contraindication: ${allergy.substance.toUpperCase()}`,
        description: `Patient has documented ${allergy.severity} allergy to ${allergy.substance} (Reaction: ${allergy.reaction}). Candidate medication '${candidateDrug}' presents severe hypersensitivity risk.`,
        recommendation: `DO NOT PRESCRIBE. Select alternative therapeutic class with zero structural cross-reactivity.`,
      });
    }
  }

  // 2. DRUG-DRUG INTERACTIONS
  for (const existing of existingMeds.filter((m) => m.isActive)) {
    const existingName = existing.name.toLowerCase();

    for (const ddi of KNOWN_DDI) {
      const match1 = normalizedCandidate.includes(ddi.drugA) && existingName.includes(ddi.drugB);
      const match2 = normalizedCandidate.includes(ddi.drugB) && existingName.includes(ddi.drugA);

      if (match1 || match2) {
        alerts.push({
          id: `ddi-${Date.now()}-${Math.random()}`,
          type: "drug_drug",
          severity: ddi.severity,
          title: `Drug Interaction: ${candidateDrug} + ${existing.name}`,
          description: ddi.effect,
          recommendation: ddi.recommendation,
        });
      }
    }
  }

  // 3. RENAL & HEPATIC DOSING CHECKS
  const egfrLab = labResults.find((l) => l.testName.toLowerCase().includes("egfr"));
  if (egfrLab) {
    const egfrVal = parseFloat(egfrLab.value);
    if (!isNaN(egfrVal)) {
      // Metformin check
      if (normalizedCandidate.includes("metformin")) {
        if (egfrVal < 30) {
          alerts.push({
            id: `renal-metformin-critical`,
            type: "renal_hepatic",
            severity: "Critical",
            title: "Renal Contraindication: Metformin (eGFR < 30 mL/min/1.73m²)",
            description: `Patient eGFR is ${egfrVal} mL/min. Metformin is contraindicated in Stage 4/5 CKD due to high risk of fatal lactic acidosis.`,
            recommendation: "Discontinue/avoid metformin. Consider DPP-4 inhibitor (e.g. Linagliptin) or GLP-1 RA approved for renal impairment.",
          });
        } else if (egfrVal < 45) {
          alerts.push({
            id: `renal-metformin-moderate`,
            type: "renal_hepatic",
            severity: "Moderate",
            title: "Renal Dosing Adjustment: Metformin (eGFR 30-44 mL/min)",
            description: `Patient eGFR is ${egfrVal} mL/min. Maximum recommended dose is 1,000 mg/day with renal monitoring every 3 months.`,
            recommendation: "Cap metformin dose at 500 mg BID and monitor renal profile frequently.",
          });
        }
      }

      // SGLT2 Inhibitor check
      if (normalizedCandidate.includes("empagliflozin") || normalizedCandidate.includes("dapagliflozin")) {
        if (egfrVal < 20) {
          alerts.push({
            id: `renal-sglt2-alert`,
            type: "renal_hepatic",
            severity: "Major",
            title: "Renal Efficacy Limitation: SGLT2 Inhibitor",
            description: `Glycemic efficacy of SGLT2i is markedly attenuated at eGFR < 20.`,
            recommendation: "Assess if prescribing for cardiorenal protection vs glycemic control.",
          });
        }
      }
    }
  }

  // 4. PHARMACOGENOMIC CHECKS
  for (const gen of genetics) {
    const gene = gen.gene.toUpperCase();
    const pheno = gen.phenotype.toLowerCase();

    // CYP2C19 and Clopidogrel
    if (gene === "CYP2C19" && (pheno.includes("poor") || pheno.includes("intermediate"))) {
      if (normalizedCandidate.includes("clopidogrel")) {
        alerts.push({
          id: `pgx-cyp2c19-clopidogrel`,
          type: "pharmacogenomic",
          severity: "Critical",
          title: `Pharmacogenomic Alert: CYP2C19 ${gen.variant} (${gen.phenotype})`,
          description: `Patient carries loss-of-function allele resulting in impaired bioactivation of clopidogrel and elevated risk of recurrent stent thrombosis / ischemic stroke.`,
          recommendation: `CPIC Level 1A Guideline: Switch to alternative antiplatelet not dependent on CYP2C19 (e.g. Prasugrel or Ticagrelor).`,
        });
      }
    }

    // SLCO1B1 and Simvastatin
    if (gene === "SLCO1B1" && (pheno.includes("reduced") || pheno.includes("poor"))) {
      if (normalizedCandidate.includes("simvastatin")) {
        alerts.push({
          id: `pgx-slco1b1-statin`,
          type: "pharmacogenomic",
          severity: "Major",
          title: `Pharmacogenomic Alert: SLCO1B1 ${gen.variant}`,
          description: `Impaired hepatic OATP1B1 transporter function significantly increases simvastatin plasma concentrations and myopathy/rhabdomyolysis risk.`,
          recommendation: `CPIC Guideline: Use lower dose or switch to pravastatin/rosuvastatin.`,
        });
      }
    }
  }

  return alerts;
}
