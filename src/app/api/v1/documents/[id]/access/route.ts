import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { documentAccessLogs } from "@/db/schema";

export const dynamic = "force-dynamic";

// POST /api/v1/documents/[id]/access
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { userId, accessType } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId is required" }, { status: 400 });
    }

    const [log] = await db
      .insert(documentAccessLogs)
      .values({
        fileId: params.id,
        accessedByUserId: userId,
        accessType: accessType || "preview",
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: log,
    });
  } catch (error: any) {
    console.error("POST document access log error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
