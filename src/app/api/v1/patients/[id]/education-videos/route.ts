import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { patientEducationVideos } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { generatePatientVideoScript } from "@/lib/ai/video-script-generator";
import { buildScenesFromScript } from "@/lib/video/animation-engine";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const videos = await db
      .select()
      .from(patientEducationVideos)
      .where(
        and(
          eq(patientEducationVideos.patientId, params.id),
          eq(patientEducationVideos.status, "ready")
        )
      )
      .orderBy(desc(patientEducationVideos.createdAt))
      .limit(20);

    return NextResponse.json({ videos });
  } catch (error) {
    console.error("GET patient education videos error:", error);
    return NextResponse.json({ error: "Failed to fetch videos" }, { status: 500 });
  }
}
