import { NextRequest, NextResponse } from "next/server";
import { processAmbientConsultation } from "@/lib/ai/ambient-clinical-intelligence";
import { requireRoles, CLINICIAN_ROLES } from "@/lib/security/auth-session";

export async function POST(req: NextRequest) {
  const auth = await requireRoles(req, CLINICIAN_ROLES);
  if ("response" in auth) return auth.response;

  try {
    const body = await req.json();
    const { transcript, patientContext } = body;

    if (!transcript || typeof transcript !== "string") {
      return NextResponse.json({ error: "transcript text is required" }, { status: 400 });
    }

    const result = await processAmbientConsultation(transcript, patientContext);
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("Voice scribe error:", error);
    return NextResponse.json({ error: "Failed to process ambient voice transcript" }, { status: 500 });
  }
}
