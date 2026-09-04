import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clinicalFiles, documentAccessLogs } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// PATCH /api/v1/documents/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { category, verificationStatus, tags, isConfidential, actorUserId } = body;

    const [updated] = await db
      .update(clinicalFiles)
      .set({
        category: category !== undefined ? category : undefined,
        verificationStatus: verificationStatus !== undefined ? verificationStatus : undefined,
        tags: tags !== undefined ? tags : undefined,
        isConfidential: isConfidential !== undefined ? isConfidential : undefined,
        updatedAt: new Date(),
      })
      .where(eq(clinicalFiles.id, params.id))
      .returning();

    if (actorUserId) {
      try {
        await db.insert(documentAccessLogs).values({
          fileId: params.id,
          accessedByUserId: actorUserId,
          accessType: "reclassify",
          ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
        });
      } catch { }
    }

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    console.error("PATCH document error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE /api/v1/documents/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const [archived] = await db
      .update(clinicalFiles)
      .set({
        archived: true,
        updatedAt: new Date(),
      })
      .where(eq(clinicalFiles.id, params.id))
      .returning();

    return NextResponse.json({
      success: true,
      message: "Document successfully archived.",
      data: archived,
    });
  } catch (error: any) {
    console.error("DELETE document error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
