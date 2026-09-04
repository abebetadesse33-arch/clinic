export interface NEWS2Params {
  respiratoryRate: number; // breaths per min
  spo2: number; // %
  isOnSupplementalOxygen: boolean;
  systolicBP: number; // mmHg
  pulseRate: number; // bpm
  consciousness: "alert" | "voice" | "pain" | "unresponsive"; // AVPU
  temperature: number; // °C
}

export interface NEWS2Result {
  totalScore: number;
  acuityBand: "low" | "low_medium" | "medium" | "high";
  clinicalRisk: "Low" | "Low-Medium" | "Medium" | "High";
  responseLevel: string;
  triggerRapidResponse: boolean;
  scoringBreakdown: {
    respiratoryRate: number;
    spo2: number;
    supplementalOxygen: number;
    systolicBP: number;
    pulseRate: number;
    consciousness: number;
    temperature: number;
  };
}

export function calculateNEWS2(params: NEWS2Params): NEWS2Result {
  const breakdown = {
    respiratoryRate: 0,
    spo2: 0,
    supplementalOxygen: params.isOnSupplementalOxygen ? 2 : 0,
    systolicBP: 0,
    pulseRate: 0,
    consciousness: params.consciousness !== "alert" ? 3 : 0,
    temperature: 0,
  };

  // Respiratory Rate
  if (params.respiratoryRate <= 8 || params.respiratoryRate >= 25) breakdown.respiratoryRate = 3;
  else if (params.respiratoryRate >= 21) breakdown.respiratoryRate = 2;
  else if (params.respiratoryRate <= 11) breakdown.respiratoryRate = 1;

  // SpO2 Scale 1
  if (params.spo2 <= 91) breakdown.spo2 = 3;
  else if (params.spo2 <= 93) breakdown.spo2 = 2;
  else if (params.spo2 <= 95) breakdown.spo2 = 1;

  // Systolic BP
  if (params.systolicBP <= 90 || params.systolicBP >= 220) breakdown.systolicBP = 3;
  else if (params.systolicBP <= 100) breakdown.systolicBP = 2;
  else if (params.systolicBP <= 110) breakdown.systolicBP = 1;

  // Pulse
  if (params.pulseRate <= 40 || params.pulseRate >= 131) breakdown.pulseRate = 3;
  else if (params.pulseRate >= 111) breakdown.pulseRate = 2;
  else if (params.pulseRate <= 50 || params.pulseRate >= 91) breakdown.pulseRate = 1;

  // Temperature
  if (params.temperature <= 35.0) breakdown.temperature = 3;
  else if (params.temperature >= 39.1) breakdown.temperature = 2;
  else if (params.temperature <= 36.0 || params.temperature >= 38.1) breakdown.temperature = 1;

  const totalScore =
    breakdown.respiratoryRate +
    breakdown.spo2 +
    breakdown.supplementalOxygen +
    breakdown.systolicBP +
    breakdown.pulseRate +
    breakdown.consciousness +
    breakdown.temperature;

  const hasIndividualThree = Object.values(breakdown).some((v) => v === 3);

  let acuityBand: NEWS2Result["acuityBand"] = "low";
  let clinicalRisk: NEWS2Result["clinicalRisk"] = "Low";
  let responseLevel = "Ward-based response: 12-hourly monitoring";
  let triggerRapidResponse = false;

  if (totalScore >= 7) {
    acuityBand = "high";
    clinicalRisk = "High";
    responseLevel = "EMERGENCY: Immediate assessment by team with critical care competencies / Rapid Response Team (RRT). Continuous monitoring and transfer to ICU/HDU.";
    triggerRapidResponse = true;
  } else if (totalScore >= 5 || hasIndividualThree) {
    acuityBand = "medium";
    clinicalRisk = "Medium";
    responseLevel = "URGENT: Urgent review by ward doctor or acute care team. Hourly monitoring. Consider escalation to critical care.";
    triggerRapidResponse = totalScore >= 6;
  } else if (totalScore >= 1) {
    acuityBand = "low_medium";
    clinicalRisk = "Low-Medium";
    responseLevel = "PROMPT: Inform registered nurse. Minimum 4-6 hourly monitoring.";
  }

  return {
    totalScore,
    acuityBand,
    clinicalRisk,
    responseLevel,
    triggerRapidResponse,
    scoringBreakdown: breakdown,
  };
}
