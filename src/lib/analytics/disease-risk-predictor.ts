export interface ASCVDParams {
  age: number;
  gender: "male" | "female";
  totalCholesterol: number; // mg/dL
  hdlCholesterol: number; // mg/dL
  systolicBP: number; // mmHg
  isTreatedHypertension: boolean;
  isSmoker: boolean;
  hasDiabetes: boolean;
}

export interface ASCVDResult {
  tenYearRiskPercent: number;
  riskCategory: "low" | "borderline" | "intermediate" | "high";
  lifetimeRiskPercent?: number;
  recommendations: string[];
}

export interface DiabetesRiskParams {
  age: number;
  gender: "male" | "female";
  bmi: number;
  isPhysicallyActive: boolean;
  hasFamilyHistory: boolean;
  hasHighBP: boolean;
  hasGestationalDiabetes?: boolean;
}

export interface DiabetesRiskResult {
  score: number; // 0 - 11 points (ADA standard)
  isHighRisk: boolean;
  riskCategory: "low" | "moderate" | "high";
  recommendations: string[];
}

export interface CKDProgressionParams {
  egfr: number; // mL/min/1.73m2
  uacr: number; // mg/g (Urine Albumin to Creatinine Ratio)
}

export interface CKDProgressionResult {
  gStage: "G1" | "G2" | "G3a" | "G3b" | "G4" | "G5";
  aStage: "A1" | "A2" | "A3";
  riskColor: "green_low" | "yellow_moderate" | "orange_high" | "red_very_high";
  annualProgressionRatePercent: number;
  recommendations: string[];
}

export interface ReadmissionRiskParams {
  lengthOfStayDays: number;
  isAcuteAdmission: boolean;
  charlsonComorbidityIndex: number;
  edVisitsPastSixMonths: number;
}

export interface ReadmissionRiskResult {
  laceScore: number; // 0 - 19
  readmissionRiskPercent: number;
  riskCategory: "low" | "moderate" | "high" | "critical";
  recommendations: string[];
}

// ─── 1. ASCVD Risk Score (AHA/ACC Pooled Cohort Equations) ───────────────────
export function calculateASCVD(params: ASCVDParams): ASCVDResult {
  const { age, gender, totalCholesterol: tc, hdlCholesterol: hdl, systolicBP: sbp, isTreatedHypertension, isSmoker, hasDiabetes } = params;

  // Approximation coefficient equation
  let score = 0;
  if (gender === "male") {
    score = (age * 0.06) + (tc * 0.015) - (hdl * 0.02) + (sbp * (isTreatedHypertension ? 0.025 : 0.018)) + (isSmoker ? 0.65 : 0) + (hasDiabetes ? 0.75 : 0) - 7.5;
  } else {
    score = (age * 0.055) + (tc * 0.014) - (hdl * 0.022) + (sbp * (isTreatedHypertension ? 0.028 : 0.019)) + (isSmoker ? 0.70 : 0) + (hasDiabetes ? 0.85 : 0) - 8.2;
  }

  // Convert log-odds to percentage bounded
  const expScore = Math.exp(score);
  const rawRisk = (expScore / (1 + expScore)) * 100;
  const tenYearRiskPercent = Math.min(99, Math.max(1, Math.round(rawRisk * 10) / 10));

  let riskCategory: ASCVDResult["riskCategory"] = "low";
  if (tenYearRiskPercent >= 20) riskCategory = "high";
  else if (tenYearRiskPercent >= 7.5) riskCategory = "intermediate";
  else if (tenYearRiskPercent >= 5) riskCategory = "borderline";

  const recommendations: string[] = [];
  if (riskCategory === "high" || riskCategory === "intermediate") {
    recommendations.push("Initiate high-intensity statin therapy (e.g., Atorvastatin 40-80 mg daily).");
    recommendations.push("Target blood pressure < 130/80 mmHg.");
    recommendations.push("Mediterranean or DASH diet with structured 150 min/week moderate aerobic activity.");
  } else if (riskCategory === "borderline") {
    recommendations.push("Consider moderate-intensity statin if risk enhancers present (family history, CAC score > 0).");
  } else {
    recommendations.push("Reinforce heart-healthy lifestyle habits and reassess ASCVD in 4-6 years.");
  }

  return {
    tenYearRiskPercent,
    riskCategory,
    lifetimeRiskPercent: Math.min(80, Math.round(tenYearRiskPercent * 2.2)),
    recommendations,
  };
}

// ─── 2. ADA Type 2 Diabetes Risk Score ───────────────────────────────────────
export function calculateDiabetesRisk(params: DiabetesRiskParams): DiabetesRiskResult {
  let score = 0;

  // Age
  if (params.age >= 60) score += 3;
  else if (params.age >= 50) score += 2;
  else if (params.age >= 40) score += 1;

  // Gender
  if (params.gender === "male") score += 1;

  // Gestational diabetes
  if (params.hasGestationalDiabetes) score += 1;

  // Family history
  if (params.hasFamilyHistory) score += 1;

  // High BP
  if (params.hasHighBP) score += 1;

  // Physical activity
  if (!params.isPhysicallyActive) score += 1;

  // BMI
  if (params.bmi >= 40) score += 3;
  else if (params.bmi >= 30) score += 2;
  else if (params.bmi >= 25) score += 1;

  const isHighRisk = score >= 5;
  const riskCategory = score >= 7 ? "high" : score >= 5 ? "moderate" : "low";

  const recommendations: string[] = [];
  if (isHighRisk) {
    recommendations.push("Order Fasting Plasma Glucose and Hemoglobin A1c screening.");
    recommendations.push("Enroll in intensive Diabetes Prevention Program (DPP) targeting 5-7% weight reduction.");
  } else {
    recommendations.push("Maintain routine physical activity (>= 150 min/week) and balanced nutrition.");
  }

  return { score, isHighRisk, riskCategory, recommendations };
}

// ─── 3. KDIGO CKD Progression Calculator ─────────────────────────────────────
export function calculateCKDProgression(params: CKDProgressionParams): CKDProgressionResult {
  const { egfr, uacr } = params;

  let gStage: CKDProgressionResult["gStage"] = "G1";
  if (egfr >= 90) gStage = "G1";
  else if (egfr >= 60) gStage = "G2";
  else if (egfr >= 45) gStage = "G3a";
  else if (egfr >= 30) gStage = "G3b";
  else if (egfr >= 15) gStage = "G4";
  else gStage = "G5";

  let aStage: CKDProgressionResult["aStage"] = "A1";
  if (uacr < 30) aStage = "A1";
  else if (uacr <= 300) aStage = "A2";
  else aStage = "A3";

  // KDIGO Matrix coloring
  let riskColor: CKDProgressionResult["riskColor"] = "green_low";
  let annualProgressionRatePercent = 2;

  if (gStage === "G5" || (gStage === "G4" && aStage !== "A1") || (gStage === "G3b" && aStage === "A3")) {
    riskColor = "red_very_high";
    annualProgressionRatePercent = 18;
  } else if ((gStage === "G4" && aStage === "A1") || (gStage === "G3b" && aStage !== "A3") || (gStage === "G3a" && aStage === "A3") || ((gStage === "G1" || gStage === "G2") && aStage === "A3")) {
    riskColor = "orange_high";
    annualProgressionRatePercent = 10;
  } else if ((gStage === "G3a" && aStage === "A2") || ((gStage === "G1" || gStage === "G2") && aStage === "A2")) {
    riskColor = "yellow_moderate";
    annualProgressionRatePercent = 5;
  }

  const recommendations: string[] = [];
  if (riskColor === "red_very_high" || riskColor === "orange_high") {
    recommendations.push("Referral to Nephrology for comprehensive renal care management.");
    recommendations.push("Initiate SGLT2 inhibitor + maximally tolerated ACEi/ARB for renal protection.");
    recommendations.push("Monitor serum creatinine, potassium, and uACR every 3 months.");
  } else if (riskColor === "yellow_moderate") {
    recommendations.push("Target strict blood pressure < 130/80 mmHg; repeat uACR in 6 months.");
  } else {
    recommendations.push("Annual eGFR and uACR monitoring.");
  }

  return { gStage, aStage, riskColor, annualProgressionRatePercent, recommendations };
}

// ─── 4. 30-Day Hospital Readmission Risk (LACE Index) ─────────────────────────
export function calculateReadmissionRisk(params: ReadmissionRiskParams): ReadmissionRiskResult {
  let lace = 0;

  // L: Length of stay
  if (params.lengthOfStayDays >= 14) lace += 7;
  else if (params.lengthOfStayDays >= 7) lace += 5;
  else if (params.lengthOfStayDays >= 4) lace += 4;
  else if (params.lengthOfStayDays >= 2) lace += 2;
  else if (params.lengthOfStayDays === 1) lace += 1;

  // A: Acute admission
  if (params.isAcuteAdmission) lace += 3;

  // C: Charlson Comorbidity
  lace += Math.min(5, params.charlsonComorbidityIndex);

  // E: ED visits past 6 months
  lace += Math.min(4, params.edVisitsPastSixMonths);

  let riskCategory: ReadmissionRiskResult["riskCategory"] = "low";
  let readmissionRiskPercent = 5;

  if (lace >= 10) {
    riskCategory = "critical";
    readmissionRiskPercent = 38;
  } else if (lace >= 7) {
    riskCategory = "high";
    readmissionRiskPercent = 22;
  } else if (lace >= 5) {
    riskCategory = "moderate";
    readmissionRiskPercent = 12;
  }

  const recommendations: string[] = [];
  if (lace >= 7) {
    recommendations.push("Schedule post-discharge home visit or telehealth check-in within 48-72 hours.");
    recommendations.push("Conduct pharmacy medication reconciliation call within 24 hours of discharge.");
    recommendations.push("Assign designated transitional care coordinator.");
  } else {
    recommendations.push("Standard discharge instruction checklist and routine 2-week follow-up.");
  }

  return { laceScore: lace, readmissionRiskPercent, riskCategory, recommendations };
}
