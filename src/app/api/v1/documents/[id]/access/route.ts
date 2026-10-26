import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { documentAccessLogs } from "@/db/schema";
import { insertReturning } from "@/lib/db/returning";
import { requireAuthenticatedUser } from "@/lib/security/auth-session";

export const dynamic = "force-dynamic";

// POST /api/v1/documents/[id]/access
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuthenticatedUser(req);
  if ("response" in auth) return auth.response;

  try {
    const body = await req.json();
    const { accessType } = body;
    // The audit trail records the signed-in user, never a client-supplied id.
    const userId = auth.user.id;

    const [log] = await insertReturning(db, documentAccessLogs, {
        fileId: params.id,
        accessedByUserId: userId,
        accessType: accessType || "preview",
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      });

    return NextResponse.json({
      success: true,
      data: log,
    });
  } catch (error: any) {
    console.error("POST document access log error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
