import { NextRequest, NextResponse } from "next/server";
import { ProviderMatchingService } from "@/lib/services/provider-matching-service";
import { enforceRateLimit, clientIp } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const limited = enforceRateLimit("treat-me-now/match", [{ key: `ip:${clientIp(req)}`, limit: 15, windowMs: 15 * 60 * 1000 }]);
  if (limited) return limited;

  try {
    const body = await req.json();
    const { specialty, urgency = "urgent", language } = body;

    const matches = await ProviderMatchingService.findMatches({
      specialty,
      urgency,
      language,
    });

    return NextResponse.json({
      success: true,
      data: {
        matchedProvider: matches[0] || null,
        alternativeProviders: matches.slice(1, 4),
        totalAvailable: matches.length,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Provider matching failed" },
      { status: 500 }
    );
  }
}
