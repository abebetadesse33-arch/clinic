import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { staffProfiles } from "@/db/schema";
import { AuthenticatedUser, isAdminUser } from "@/lib/security/auth-session";

/**
 * Resolves which staff profile a request may act on. Administrators may target
 * any `requestedStaffId`; everyone else is pinned to their own profile, and a
 * request naming a different staff member is rejected.
 */
export async function resolveStaffScope(
  user: AuthenticatedUser,
  requestedStaffId?: string | null
): Promise<{ staffId: string | null } | { response: NextResponse }> {
  if (isAdminUser(user)) return { staffId: requestedStaffId || null };

  const [own] = await db
    .select({ id: staffProfiles.id })
    .from(staffProfiles)
    .where(eq(staffProfiles.userId, user.id))
    .limit(1);

  if (!own) {
    return {
      response: NextResponse.json(
        { success: false, error: "No staff profile is linked to your account." },
        { status: 403 }
      ),
    };
  }
  if (requestedStaffId && requestedStaffId !== own.id) {
    return {
      response: NextResponse.json(
        { success: false, error: "Forbidden: you can only access your own HR records." },
        { status: 403 }
      ),
    };
  }
  return { staffId: own.id };
}
