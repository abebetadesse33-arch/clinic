import { NextRequest, NextResponse } from "next/server";
import { runMultiAgentOrchestration, PatientClinicalBundle } from "@/lib/ai/multi-agent-orchestrator";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const bundle: PatientClinicalBundle = {
      patientId: body.patientId || "pat-active",
      mrn: body.mrn || "MRN-ACTIVE",
      name: body.name || "Patient",
      age: body.age || 45,
      gender: body.gender || "Undisclosed",
      chiefComplaint: body.chiefComplaint || "Clinical evaluation and multidisciplinary management",
      hpi: body.hpi,
      vitals: body.vitals || { systolicBP: 130, diastolicBP: 85, heartRate: 75, spo2: 98, bmi: 24.5 },
      diagnoses: body.diagnoses || ["Clinical Evaluation"],
      medications: body.medications || [],
      allergies: body.allergies || [],
      labResults: body.labResults || [],
      psychological: body.psychological,
      socialSdoh: body.socialSdoh,
      languagePreference: body.languagePreference || "en",
    };

    const result = await runMultiAgentOrchestration(bundle);
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("Multi-agent consult error:", error);
    return NextResponse.json({ error: "Multi-agent consultation failed" }, { status: 500 });
  }
}
