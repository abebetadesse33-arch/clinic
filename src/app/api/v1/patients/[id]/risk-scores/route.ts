import { NextRequest, NextResponse } from "next/server";
import {
  calculateASCVD,
  calculateDiabetesRisk,
  calculateCKDProgression,
  calculateReadmissionRisk,
} from "@/lib/analytics/disease-risk-predictor";
import { calculateNEWS2 } from "@/lib/analytics/early-warning-system";
import { db } from "@/db";
import { riskScores } from "@/db/schema";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const age = parseInt(searchParams.get("age") || "54", 10);
    const gender = (searchParams.get("gender") as "male" | "female") || "female";
    const sbp = parseInt(searchParams.get("sbp") || "142", 10);
    const tc = parseInt(searchParams.get("tc") || "210", 10);
    const hdl = parseInt(searchParams.get("hdl") || "48", 10);
    const bmi = parseFloat(searchParams.get("bmi") || "29.4");
    const egfr = parseFloat(searchParams.get("egfr") || "68");
    const uacr = parseFloat(searchParams.get("uacr") || "85");

    // 1. ASCVD
    const ascvd = calculateASCVD({
      age,
      gender,
      totalCholesterol: tc,
      hdlCholesterol: hdl,
      systolicBP: sbp,
      isTreatedHypertension: true,
      isSmoker: false,
      hasDiabetes: true,
    });

    // 2. Diabetes Risk
    const diabetes = calculateDiabetesRisk({
      age,
      gender,
      bmi,
      isPhysicallyActive: false,
      hasFamilyHistory: true,
      hasHighBP: true,
    });

    // 3. CKD Progression
    const ckd = calculateCKDProgression({ egfr, uacr });

    // 4. Hospital Readmission
    const readmission = calculateReadmissionRisk({
      lengthOfStayDays: 3,
      isAcuteAdmission: true,
      charlsonComorbidityIndex: 3,
      edVisitsPastSixMonths: 1,
    });

    // 5. NEWS2
    const news2 = calculateNEWS2({
      respiratoryRate: 18,
      spo2: 97,
      isOnSupplementalOxygen: false,
      systolicBP: sbp,
      pulseRate: 78,
      consciousness: "alert",
      temperature: 36.8,
    });

    return NextResponse.json({
      patientId: params.id,
      calculatedAt: new Date().toISOString(),
      models: {
        ascvd_10yr: ascvd,
        diabetes_type2: diabetes,
        ckd_progression: ckd,
        readmission_30d: readmission,
        news2_early_warning: news2,
      },
    });
  } catch (error) {
    console.error("Calculate risk scores error:", error);
    return NextResponse.json({ error: "Failed to calculate predictive risk scores" }, { status: 500 });
  }
}
