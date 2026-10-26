import { NextRequest, NextResponse } from "next/server";
import { TriageService } from "@/lib/services/triage-service";
import { enforceRateLimit, clientIp } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const limited = enforceRateLimit("treat-me-now/triage", [{ key: `ip:${clientIp(req)}`, limit: 15, windowMs: 15 * 60 * 1000 }]);
  if (limited) return limited;

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
