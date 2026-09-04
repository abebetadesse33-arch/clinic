export interface CohortDistribution {
  totalPopulation: number;
  highRiskCount: number;
  risingRiskCount: number;
  lowRiskCount: number;
  highRiskPercentage: number;
  risingRiskPercentage: number;
  lowRiskPercentage: number;
}

export interface HEDISMeasure {
  id: string;
  name: string;
  category: string;
  eligiblePopulation: number;
  compliantCount: number;
  complianceRatePercent: number;
  targetBenchmarkPercent: number;
  status: "on_track" | "needs_attention" | "at_risk";
  careGapsIdentified: number;
}

export interface PopulationHealthSummary {
  cohortDistribution: CohortDistribution;
  hedisMeasures: HEDISMeasure[];
  topChronicConditions: { condition: string; patientCount: number; prevalencePercent: number; trend: "increasing" | "stable" | "decreasing" }[];
  predictedReadmissionsNext30Days: number;
  preventableEdVisitsAvoided: number;
  costSavingsProjected: number; // in local currency / USD
}

export function getPopulationHealthMetrics(): PopulationHealthSummary {
  const total = 4250;
  const highRisk = 468;
  const risingRisk = 1190;
  const lowRisk = total - highRisk - risingRisk;

  const measures: HEDISMeasure[] = [
    {
      id: "HEDIS-CDC-A1C",
      name: "Comprehensive Diabetes Care: HbA1c Control (< 8.0%)",
      category: "Endocrine & Metabolic",
      eligiblePopulation: 680,
      compliantCount: 524,
      complianceRatePercent: 77.1,
      targetBenchmarkPercent: 80.0,
      status: "needs_attention",
      careGapsIdentified: 156,
    },
    {
      id: "HEDIS-CBP",
      name: "Controlling High Blood Pressure (< 140/90 mmHg)",
      category: "Cardiovascular",
      eligiblePopulation: 1120,
      compliantCount: 918,
      complianceRatePercent: 82.0,
      targetBenchmarkPercent: 75.0,
      status: "on_track",
      careGapsIdentified: 202,
    },
    {
      id: "HEDIS-COL",
      name: "Colorectal Cancer Screening (Ages 45-75)",
      category: "Preventive Screening",
      eligiblePopulation: 940,
      compliantCount: 610,
      complianceRatePercent: 64.9,
      targetBenchmarkPercent: 72.0,
      status: "at_risk",
      careGapsIdentified: 330,
    },
    {
      id: "HEDIS-BCS",
      name: "Breast Cancer Screening (Mammogram 24m)",
      category: "Preventive Screening",
      eligiblePopulation: 780,
      compliantCount: 632,
      complianceRatePercent: 81.0,
      targetBenchmarkPercent: 78.0,
      status: "on_track",
      careGapsIdentified: 148,
    },
    {
      id: "HEDIS-KIDNEY",
      name: "Kidney Health Evaluation for Patients with Diabetes",
      category: "Renal Protection",
      eligiblePopulation: 680,
      compliantCount: 462,
      complianceRatePercent: 67.9,
      targetBenchmarkPercent: 75.0,
      status: "needs_attention",
      careGapsIdentified: 218,
    },
  ];

  return {
    cohortDistribution: {
      totalPopulation: total,
      highRiskCount: highRisk,
      risingRiskCount: risingRisk,
      lowRiskCount: lowRisk,
      highRiskPercentage: Math.round((highRisk / total) * 100),
      risingRiskPercentage: Math.round((risingRisk / total) * 100),
      lowRiskPercentage: Math.round((lowRisk / total) * 100),
    },
    hedisMeasures: measures,
    topChronicConditions: [
      { condition: "Essential Hypertension", patientCount: 1240, prevalencePercent: 29.2, trend: "stable" },
      { condition: "Type 2 Diabetes Mellitus", patientCount: 710, prevalencePercent: 16.7, trend: "increasing" },
      { condition: "Dyslipidemia / Atherosclerosis", patientCount: 890, prevalencePercent: 20.9, trend: "stable" },
      { condition: "Chronic Kidney Disease (G1-G4)", patientCount: 340, prevalencePercent: 8.0, trend: "increasing" },
      { condition: "Major Depressive Disorder", patientCount: 420, prevalencePercent: 9.9, trend: "increasing" },
    ],
    predictedReadmissionsNext30Days: 14,
    preventableEdVisitsAvoided: 89,
    costSavingsProjected: 145000,
  };
}
