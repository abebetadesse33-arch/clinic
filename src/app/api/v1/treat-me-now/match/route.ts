import { NextRequest, NextResponse } from "next/server";
import { ProviderMatchingService } from "@/lib/services/provider-matching-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
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
