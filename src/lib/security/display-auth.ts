import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { waitingRoomDisplays } from "@/db/schema";
import { getAuthenticatedSessionUser } from "@/lib/security/auth-session";

export interface DisplayAccess {
  tenantId: string;
  /** Set when the caller is a paired display screen; null for signed-in staff. */
  displayId: string | null;
  token: string | null;
}

/**
 * Waiting-room screens are unattended TVs, so they cannot hold a staff session.
 * They authenticate with the secret pairing token an administrator copies from
 * the waiting-room admin page. Signed-in staff may also read the same data.
 * The tenant is always derived from the token or the session, never the request.
 */
export async function authorizeDisplay(
  req: NextRequest
): Promise<DisplayAccess | { response: NextResponse }> {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || req.headers.get("x-display-token");

  if (token) {
    const [display] = await db
      .select({ id: waitingRoomDisplays.id, tenantId: waitingRoomDisplays.tenantId })
      .from(waitingRoomDisplays)
      .where(and(eq(waitingRoomDisplays.displayToken, token), eq(waitingRoomDisplays.isActive, true)))
      .limit(1);
    if (display) return { tenantId: display.tenantId, displayId: display.id, token };
  } else {
    const user = await getAuthenticatedSessionUser(req);
    if (user && user.role !== "patient") {
      return { tenantId: user.organizationId, displayId: url.searchParams.get("displayId"), token: null };
    }
  }

  return {
    response: NextResponse.json(
      { success: false, error: "Unauthorized: a valid display token or staff session is required." },
      { status: 401 }
    ),
  };
}
