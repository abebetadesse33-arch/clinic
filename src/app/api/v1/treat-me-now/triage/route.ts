import { NextRequest, NextResponse } from "next/server";
import { TriageService } from "@/lib/services/triage-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      chiefComplaint,
      severityScale = 5,
      duration = "1-2 days",
      additionalSymptoms = [],
      vitals = {},
      patientDemographics = {},
    } = body;

    if (!chiefComplaint) {
      return NextResponse.json(
        { success: false, error: "chiefComplaint is required" },
        { status: 400 }
      );
    }

    const triageResult = await TriageService.assess({
      chiefComplaint,
      symptoms: additionalSymptoms,
      duration,
      severityScale: Number(severityScale),
      vitals,
      patientDemographics,
    });

    return NextResponse.json({
      success: true,
      data: triageResult,
    });
  } catch (err: any) {
    console.error("[Treat Me Now Triage error]:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Triage failed" },
      { status: 500 }
    );
  }
}
