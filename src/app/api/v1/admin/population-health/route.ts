import { NextResponse } from "next/server";
import { getPopulationHealthMetrics } from "@/lib/analytics/population-health-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const summary = getPopulationHealthMetrics();
    return NextResponse.json({ success: true, summary });
  } catch (error) {
    console.error("Population health error:", error);
    return NextResponse.json({ error: "Failed to fetch population health metrics" }, { status: 500 });
  }
}
