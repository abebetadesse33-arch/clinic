import { NextRequest, NextResponse } from "next/server";
import { getEncounterAdmissionTimeline } from "@/lib/services/admission-workflow-service";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const timeline = await getEncounterAdmissionTimeline(params.id);

    if (!timeline) {
      return NextResponse.json({ error: "Encounter not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, timeline });
  } catch (error) {
    console.error("Get admission timeline error:", error);
    return NextResponse.json({ error: "Failed to fetch admission timeline" }, { status: 500 });
  }
}
