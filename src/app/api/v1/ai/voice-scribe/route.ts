import { NextRequest, NextResponse } from "next/server";
import { processAmbientConsultation } from "@/lib/ai/ambient-clinical-intelligence";

export async function POST(req: NextRequest) {
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
