import { NextRequest, NextResponse } from "next/server";
import { getVideoRecommendations } from "@/lib/services/video-recommendation-service";
import { requireAuthenticatedUser } from "@/lib/security/auth-session";

export async function GET(req: NextRequest) {
  const auth = await requireAuthenticatedUser(req);
  if ("response" in auth) return auth.response;

  const { searchParams } = new URL(req.url);

  const icd10Raw = searchParams.get("icd10");
  const medsRaw = searchParams.get("medications");
  const language = searchParams.get("language") || "en";
  const maxResults = parseInt(searchParams.get("maxResults") || "5", 10);
  const minQuality = parseInt(searchParams.get("minQuality") || "75", 10);

  const icd10Codes = icd10Raw ? icd10Raw.split(",").map((c) => c.trim()) : [];
  const medications = medsRaw ? medsRaw.split(",").map((m) => m.trim()) : [];

  const recommendations = getVideoRecommendations({
    icd10Codes,
    medications,
    language,
    audienceLevel: "patient",
    maxResults,
    minQualityScore: minQuality,
  });

  return NextResponse.json({
    recommendations,
    total: recommendations.length,
    query: { icd10Codes, medications, language },
  });
}
