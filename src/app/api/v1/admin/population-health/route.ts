import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/security/auth-session";
import { getPopulationHealthMetrics } from "@/lib/analytics/population-health-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdminUser(req);
  if ("response" in auth) return auth.response;

  try {
    const summary = getPopulationHealthMetrics();
    return NextResponse.json({ success: true, summary });
  } catch (error) {
    console.error("Population health error:", error);
    return NextResponse.json({ error: "Failed to fetch population health metrics" }, { status: 500 });
  }
}
