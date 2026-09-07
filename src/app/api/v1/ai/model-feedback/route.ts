import { NextRequest, NextResponse } from "next/server";
import { recordClinicianFeedback, calculateModelMetrics } from "@/lib/ai/continuous-learning";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      tenantId,
      clinicianId,
      modelId,
      suggestionId,
      agentName,
      action,
      originalOutput,
      clinicianModification,
      notes,
    } = body;

    if (!tenantId || !clinicianId || !action) {
      return NextResponse.json({ error: "tenantId, clinicianId, and action required" }, { status: 400 });
    }

    const feedback = await recordClinicianFeedback({
      tenantId,
      clinicianId,
      modelId,
      suggestionId,
      agentName,
      action,
      originalOutput,
      clinicianModification,
      notes,
    });

    return NextResponse.json({ success: true, feedback });
  } catch (error) {
    console.error("Record model feedback error:", error);
    return NextResponse.json({ error: "Failed to record feedback" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get("tenantId");

  if (!tenantId) {
    return NextResponse.json({ error: "tenantId required" }, { status: 400 });
  }

  const metrics = await calculateModelMetrics(tenantId);
  return NextResponse.json({ metrics });
}
