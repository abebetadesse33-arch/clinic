import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit, clientIp } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const limited = enforceRateLimit("treat-me-now/start", [{ key: `ip:${clientIp(req)}`, limit: 15, windowMs: 15 * 60 * 1000 }]);
  if (limited) return limited;

  try {
    const sessionId = `tmn-sess-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    return NextResponse.json({
      success: true,
      data: {
        sessionId,
        startedAt: new Date().toISOString(),
        availableSpecialties: [
          "General Internal Medicine",
          "Urgent Care & Family Medicine",
          "Pediatrics",
          "Dermatology & Skin Care",
          "Emergency Rx Bridge",
        ],
        emergencyWarning: "If you are experiencing chest pain, severe shortness of breath, sudden numbness, or head trauma, please call 911 or visit the nearest emergency facility immediately.",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Failed to start session" }, { status: 500 });
  }
}
