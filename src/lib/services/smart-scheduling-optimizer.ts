export interface NoShowRiskInput {
  patientAge: number;
  leadTimeDays: number; // Days between booking and appointment
  pastNoShowCount: number;
  pastCompletedVisits: number;
  appointmentTimeHour: number; // 8-17
  distanceToClinicKm?: number;
  hasConfirmedSms?: boolean;
}

export interface NoShowRiskResult {
  noShowProbabilityPercent: number;
  riskTier: "low" | "medium" | "high";
  contributingFactors: string[];
  suggestedAction: "standard_reminder" | "double_confirm_sms" | "offer_telehealth" | "strategic_overbook";
}

export function predictNoShowRisk(input: NoShowRiskInput): NoShowRiskResult {
  let riskScore = 8; // 8% baseline clinic no-show rate
  const factors: string[] = [];

  // Historical adherence
  const totalHistory = input.pastNoShowCount + input.pastCompletedVisits;
  if (totalHistory > 0) {
    const historicalRate = (input.pastNoShowCount / totalHistory) * 100;
    if (historicalRate >= 30) {
      riskScore += 25;
      factors.push(`Past no-show rate is ${Math.round(historicalRate)}% (${input.pastNoShowCount} missed)`);
    } else if (input.pastCompletedVisits >= 3 && input.pastNoShowCount === 0) {
      riskScore -= 5;
    }
  }

  // Lead time (appointments booked > 14 days in advance have 2x higher no-show)
  if (input.leadTimeDays > 14) {
    riskScore += 18;
    factors.push(`Long scheduling lead time (${input.leadTimeDays} days in advance)`);
  } else if (input.leadTimeDays <= 2) {
    riskScore -= 4;
  }

  // Distance / transport barriers
  if (input.distanceToClinicKm && input.distanceToClinicKm > 20) {
    riskScore += 12;
    factors.push(`Patient lives ${input.distanceToClinicKm} km from facility`);
  }

  // Time of day (early morning 8 AM and late afternoon 4 PM higher no-show)
  if (input.appointmentTimeHour <= 8 || input.appointmentTimeHour >= 16) {
    riskScore += 6;
    factors.push("Edge-of-day appointment time slot");
  }

  if (input.hasConfirmedSms) {
    riskScore -= 12;
  }

  const noShowProbabilityPercent = Math.min(85, Math.max(3, Math.round(riskScore)));
  const riskTier: NoShowRiskResult["riskTier"] =
    noShowProbabilityPercent >= 35 ? "high" : noShowProbabilityPercent >= 18 ? "medium" : "low";

  let suggestedAction: NoShowRiskResult["suggestedAction"] = "standard_reminder";
  if (riskTier === "high") {
    suggestedAction = input.distanceToClinicKm && input.distanceToClinicKm > 15 ? "offer_telehealth" : "strategic_overbook";
  } else if (riskTier === "medium") {
    suggestedAction = "double_confirm_sms";
  }

  return {
    noShowProbabilityPercent,
    riskTier,
    contributingFactors: factors,
    suggestedAction,
  };
}
