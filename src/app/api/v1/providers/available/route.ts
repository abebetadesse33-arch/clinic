import { NextRequest, NextResponse } from "next/server";
import { ProviderMatchingService } from "@/lib/services/provider-matching-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const specialty = searchParams.get("specialty") || undefined;
    const urgency = (searchParams.get("urgency") as any) || "routine";
    const language = searchParams.get("language") || undefined;

    const matches = await ProviderMatchingService.findMatches({
      specialty,
      urgency,
      language,
    });

    return NextResponse.json({
      success: true,
      data: {
        providers: matches,
        totalAvailable: matches.length,
      },
    });
  } catch (err: any) {
    console.error("[Available Providers API error]:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch available providers" },
      { status: 500 }
    );
  }
}
