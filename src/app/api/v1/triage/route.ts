import { NextRequest, NextResponse } from "next/server";
import { TriageService } from "@/lib/services/triage-service";
import { requireRoles, CLINICIAN_ROLES } from "@/lib/security/auth-session";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requireRoles(req, CLINICIAN_ROLES);
  if ("response" in auth) return auth.response;

  try {
    const body = await req.json();
    const {
      chiefComplaint,
      symptoms,
      duration,
      severityScale,
      patientDemographics,
      vitals,
      medicalHistory,
    } = body;

    if (!chiefComplaint) {
      return NextResponse.json(
        { success: false, error: "chiefComplaint is required for triage assessment" },
        { status: 400 }
      );
    }

    const result = await TriageService.assess({
      chiefComplaint,
      symptoms,
      duration,
      severityScale: severityScale ? Number(severityScale) : undefined,
      patientDemographics,
      vitals,
      medicalHistory,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    console.error("[Triage API error]:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Triage calculation failed" },
      { status: 500 }
    );
  }
}
