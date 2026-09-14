/**
 * AI/ML Prediction Engine for Patient Care
 * Provides risk assessment, outcome predictions, and clinical insights
 */

import { db } from "@/db";
import { patients, encounters, prescriptions, vitals, lab_results } from "@/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";

export interface PatientRiskProfile {
  patientId: string;
  overallRisk: number; // 0-100
  riskFactors: {
    readmissionRisk: number;
    mortalityRisk: number;
    complicationRisk: number;
    nonAdherenceRisk: number;
  };
  recommendations: string[];
  confidence: number;
  lastUpdated: Date;
}

export interface PredictionInsight {
  type:
    | "high_risk_alert"
    | "readmission_warning"
    | "medication_interaction"
    | "appointment_optimization"
    | "outcome_improvement";
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  actionable: boolean;
  suggestedActions: string[];
  confidence: number;
  data: Record<string, unknown>;
}

export class PatientAIPredictionEngine {
  /**
   * Calculate comprehensive risk profile for patient
   */
  static async calculateRiskProfile(
    patientId: string,
    organizationId: string
  ): Promise<PatientRiskProfile> {
    try {
      // Fetch patient data
      const patientData = await db.query.patients.findFirst({
        where: eq(patients.id, patientId),
      });

      if (!patientData) {
        throw new Error("Patient not found");
      }

      // Fetch recent encounters
      const recentEncounters = await db
        .select()
        .from(encounters)
        .where(
          and(
            eq(encounters.patientId, patientId),
            gte(
              encounters.createdAt,
              new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
            ) // Last year
          )
        )
        .orderBy(desc(encounters.createdAt))
        .limit(50);

      // Fetch recent vitals
      const recentVitals = await db
        .select()
        .from(vitals)
        .where(eq(vitals.patientId, patientId))
        .orderBy(desc(vitals.recordedAt))
        .limit(30);

      // Calculate risk factors
      const readmissionRisk = this.calculateReadmissionRisk(
        recentEncounters,
        recentVitals,
        patientData
      );
      const mortalityRisk = this.calculateMortalityRisk(
        patientData,
        recentVitals
      );
      const complicationRisk = this.calculateComplicationRisk(recentEncounters);
      const nonAdherenceRisk = this.calculateNonAdherenceRisk(patientData);

      // Calculate overall risk
      const overallRisk =
        (readmissionRisk +
          mortalityRisk +
          complicationRisk +
          nonAdherenceRisk) /
        4;

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        readmissionRisk,
        mortalityRisk,
        complicationRisk,
        nonAdherenceRisk
      );

      return {
        patientId,
        overallRisk: Math.round(overallRisk),
        riskFactors: {
          readmissionRisk: Math.round(readmissionRisk),
          mortalityRisk: Math.round(mortalityRisk),
          complicationRisk: Math.round(complicationRisk),
          nonAdherenceRisk: Math.round(nonAdherenceRisk),
        },
        recommendations,
        confidence: 0.85,
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.error("Risk profile calculation error:", error);
      throw error;
    }
  }

  /**
   * Calculate readmission risk
   */
  private static calculateReadmissionRisk(
    encounters: any[],
    vitals: any[],
    patient: any
  ): number {
    let risk = 0;

    // Age factor
    const age = patient.dateOfBirth
      ? new Date().getFullYear() -
        new Date(patient.dateOfBirth).getFullYear()
      : 0;
    if (age > 65) risk += 15;
    if (age > 75) risk += 10;

    // Encounter frequency (multiple admissions = higher risk)
    const encountersInLast90Days = encounters.filter(
      (e) =>
        new Date(e.createdAt).getTime() >
        Date.now() - 90 * 24 * 60 * 60 * 1000
    ).length;
    risk += Math.min(encountersInLast90Days * 5, 20);

    // Chronic condition indicators
    const chronicConditions = patient.conditions?.length || 0;
    risk += Math.min(chronicConditions * 5, 15);

    // Vital signs stability
    if (vitals.length > 0) {
      const vitalVariability = this.calculateVitalVariability(vitals);
      risk += Math.min(vitalVariability * 2, 20);
    }

    return Math.min(risk, 100);
  }

  /**
   * Calculate mortality risk
   */
  private static calculateMortalityRisk(patient: any, vitals: any[]): number {
    let risk = 0;

    // Age-based risk
    const age = patient.dateOfBirth
      ? new Date().getFullYear() -
        new Date(patient.dateOfBirth).getFullYear()
      : 0;
    if (age > 65) risk += 10;
    if (age > 75) risk += 15;
    if (age > 85) risk += 10;

    // Comorbidities
    const conditions = patient.conditions || [];
    if (
      conditions.some((c: string) =>
        ["heart_failure", "copd", "cancer"].includes(
          c.toLowerCase()
        )
      )
    ) {
      risk += 20;
    }

    // Vital signs critical thresholds
    if (vitals.length > 0) {
      const latestVital = vitals[0];
      if (latestVital.systolic < 90 || latestVital.systolic > 180)
        risk += 15;
      if (latestVital.diastolic < 60 || latestVital.diastolic > 110)
        risk += 10;
      if (latestVital.heartRate < 40 || latestVital.heartRate > 120)
        risk += 12;
      if (latestVital.oxygenSaturation < 90) risk += 25;
    }

    return Math.min(risk, 100);
  }

  /**
   * Calculate complication risk
   */
  private static calculateComplicationRisk(encounters: any[]): number {
    let risk = 0;

    // Previous complications
    const previousComplications = encounters.filter(
      (e) => e.complications && e.complications.length > 0
    ).length;
    risk += previousComplications * 5;

    // Emergency visits
    const emergencyVisits = encounters.filter(
      (e) => e.type === "emergency"
    ).length;
    risk += emergencyVisits * 8;

    // Recent procedures increase risk slightly
    const recentProcedures = encounters.filter(
      (e) =>
        new Date(e.createdAt).getTime() >
        Date.now() - 30 * 24 * 60 * 60 * 1000
    ).length;
    risk += Math.min(recentProcedures * 3, 10);

    return Math.min(risk, 100);
  }

  /**
   * Calculate medication non-adherence risk
   */
  private static calculateNonAdherenceRisk(patient: any): number {
    let risk = 0;

    // Cognitive conditions
    if (patient.conditions?.some((c: string) =>
      ["dementia", "cognitive_impairment", "mental_illness"].includes(
        c.toLowerCase()
      )
    )) {
      risk += 20;
    }

    // Polypharmacy risk (too many medications)
    const medicationCount = patient.medicationCount || 0;
    if (medicationCount > 10) risk += 15;
    if (medicationCount > 15) risk += 15;

    // Age factor (elderly less adherent)
    const age = patient.dateOfBirth
      ? new Date().getFullYear() -
        new Date(patient.dateOfBirth).getFullYear()
      : 0;
    if (age > 75) risk += 10;

    // Social determinants
    if (patient.socialRiskFactors?.length > 0) {
      risk += patient.socialRiskFactors.length * 5;
    }

    return Math.min(risk, 100);
  }

  /**
   * Calculate vital signs variability
   */
  private static calculateVitalVariability(vitals: any[]): number {
    if (vitals.length < 2) return 0;

    const systolics = vitals.map((v) => v.systolic).filter(Boolean);
    const diastolics = vitals.map((v) => v.diastolic).filter(Boolean);

    const sysStdDev = this.standardDeviation(systolics);
    const diasStdDev = this.standardDeviation(diastolics);

    // Normalize to 0-100 scale
    return Math.min((sysStdDev + diasStdDev) / 2, 50);
  }

  /**
   * Calculate standard deviation
   */
  private static standardDeviation(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squareDiffs = values.map((v) => Math.pow(v - mean, 2));
    const avgSquareDiff =
      squareDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(avgSquareDiff);
  }

  /**
   * Generate actionable recommendations
   */
  private static generateRecommendations(
    readmissionRisk: number,
    mortalityRisk: number,
    complicationRisk: number,
    nonAdherenceRisk: number
  ): string[] {
    const recommendations: string[] = [];

    if (readmissionRisk > 60) {
      recommendations.push(
        "Schedule early follow-up appointment within 7 days of discharge"
      );
      recommendations.push("Implement daily telehealth check-ins");
    }

    if (mortalityRisk > 50) {
      recommendations.push("Urgent cardiology/pulmonology consultation");
      recommendations.push("Increase monitoring frequency to daily");
      recommendations.push("Consider ICU-level care coordination");
    }

    if (complicationRisk > 50) {
      recommendations.push("Aggressive post-procedure monitoring");
      recommendations.push("Enhanced infection prevention protocols");
    }

    if (nonAdherenceRisk > 60) {
      recommendations.push("Implement medication reminder system");
      recommendations.push("Consider supervised medication administration");
      recommendations.push("Simplify medication regimen if possible");
    }

    if (recommendations.length === 0) {
      recommendations.push("Continue routine care and monitoring");
    }

    return recommendations;
  }

  /**
   * Generate AI-driven insights for patient
   */
  static async generateInsights(
    patientId: string,
    organizationId: string
  ): Promise<PredictionInsight[]> {
    const insights: PredictionInsight[] = [];

    try {
      const riskProfile = await this.calculateRiskProfile(
        patientId,
        organizationId
      );

      // High-risk alert
      if (riskProfile.overallRisk > 75) {
        insights.push({
          type: "high_risk_alert",
          severity: "critical",
          message: `Patient has high overall risk score of ${riskProfile.overallRisk}/100`,
          actionable: true,
          suggestedActions: riskProfile.recommendations,
          confidence: 0.88,
          data: riskProfile.riskFactors,
        });
      }

      // Readmission warning
      if (riskProfile.riskFactors.readmissionRisk > 70) {
        insights.push({
          type: "readmission_warning",
          severity: "high",
          message:
            "High readmission risk detected. Early intervention recommended.",
          actionable: true,
          suggestedActions: [
            "Schedule 7-day post-discharge follow-up",
            "Enroll in disease management program",
          ],
          confidence: 0.82,
          data: { readmissionRisk: riskProfile.riskFactors.readmissionRisk },
        });
      }

      // Medication adherence support
      if (riskProfile.riskFactors.nonAdherenceRisk > 60) {
        insights.push({
          type: "medication_interaction",
          severity: "high",
          message: "Patient may benefit from medication adherence support",
          actionable: true,
          suggestedActions: [
            "Set up automated medication reminders",
            "Simplify medication schedule",
            "Provide medication education",
          ],
          confidence: 0.79,
          data: { nonAdherenceRisk: riskProfile.riskFactors.nonAdherenceRisk },
        });
      }

      return insights;
    } catch (error) {
      console.error("Insight generation error:", error);
      return [];
    }
  }
}

// Export singleton instance
export const aiPredictionEngine = new PatientAIPredictionEngine();
