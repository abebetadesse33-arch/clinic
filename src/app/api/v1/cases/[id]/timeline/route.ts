import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { cases } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const [c] = await db
      .select({
        id: cases.id,
        caseId: cases.caseId,
        caseNumber: cases.caseNumber,
        status: cases.status,
        timeline: cases.timeline,
      })
      .from(cases)
      .where(eq(cases.caseId, id));

    if (!c) {
      return NextResponse.json({ success: false, error: "Case not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        caseId: c.caseId,
        caseNumber: c.caseNumber,
        status: c.status,
        timeline: c.timeline || [],
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Failed to fetch timeline" }, { status: 500 });
  }
}
