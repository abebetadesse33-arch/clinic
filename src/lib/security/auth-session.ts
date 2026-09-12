import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, patients } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";

/**
 * ═══════════════════════════════════════════════════════════════════
 * SECURE SERVER SESSION HELPER (Zero-Trust Session Resolver)
 * ═══════════════════════════════════════════════════════════════════
 * Extracts and verifies the authenticated user ID directly from the
 * secure server-side session cookie ("Nini_session").
 *
 * Prevents "Session State Leak" and "Untrusted Client Payload" attacks
 * where malicious or stale client bodies spoof doctorId, collectedBy,
 * or triggeredByUserId.
 * ═══════════════════════════════════════════════════════════════════
 */

export interface AuthenticatedUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
  department?: string | null;
  licenseNumber?: string | null;
  organizationId: string;
  isActive: boolean;
  isAdminGrantedBySuperAdmin: boolean;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Returns the verified user ID from the HTTP-only server cookie "Nini_session".
 * Returns null if the session is missing, malformed, or references an inactive/nonexistent user.
 */
export async function getAuthenticatedSessionUserId(req: NextRequest): Promise<string | null> {
  const sessionId = req.cookies.get("Nini_session")?.value;

  if (!sessionId || !UUID_REGEX.test(sessionId)) {
    return null;
  }

  try {
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, sessionId), eq(users.isActive, true)))
      .limit(1);

    return user?.id || null;
  } catch (err) {
    console.error("[AuthSession] Error verifying session user ID:", err);
    return null;
  }
}

/**
 * Returns the full verified User record from the HTTP-only server cookie "Nini_session".
 * Returns null if unauthenticated.
 */
export async function getAuthenticatedSessionUser(req: NextRequest): Promise<AuthenticatedUser | null> {
  const sessionId = req.cookies.get("Nini_session")?.value;

  if (!sessionId || !UUID_REGEX.test(sessionId)) {
    return null;
  }

  try {
    const [user] = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        role: users.role,
        department: users.department,
        licenseNumber: users.licenseNumber,
        organizationId: users.organizationId,
        isActive: users.isActive,
        isAdminGrantedBySuperAdmin: users.isAdminGrantedBySuperAdmin,
      })
      .from(users)
      .where(and(eq(users.id, sessionId), eq(users.isActive, true)))
      .limit(1);

    return (user as AuthenticatedUser) || null;
  } catch (err) {
    console.error("[AuthSession] Error retrieving session user:", err);
    return null;
  }
}

/**
 * Guard utility for API routes requiring strict authentication.
 * If authenticated, returns { user }.
 * If not authenticated, returns a 401 Unauthorized NextResponse.
 */
export async function requireAuthenticatedUser(
  req: NextRequest
): Promise<{ user: AuthenticatedUser } | { response: NextResponse }> {
  const user = await getAuthenticatedSessionUser(req);

  if (!user) {
    return {
      response: NextResponse.json(
        {
          success: false,
          error: "Unauthorized: A valid authenticated session is required to perform this action.",
        },
        { status: 401 }
      ),
    };
  }

  return { user };
}

/**
 * Guard administrative configuration and workforce operations.
 * Admin UI guards are useful for UX, but authorization must be enforced here
 * because every API route is directly reachable by a client.
 */
export async function requireAdminUser(
  req: NextRequest
): Promise<{ user: AuthenticatedUser } | { response: NextResponse }> {
  const auth = await requireAuthenticatedUser(req);
  if ("response" in auth) return auth;

  const isSystemAdmin = auth.user.role === "system_admin";
  const isGrantedTenantAdmin =
    auth.user.role === "tenant_admin" && auth.user.isAdminGrantedBySuperAdmin;

  if (!isSystemAdmin && !isGrantedTenantAdmin) {
    return {
      response: NextResponse.json(
        { success: false, error: "Forbidden: administrator privileges are required." },
        { status: 403 }
      ),
    };
  }

  return auth;
}

export function isAuthorizedForRole(
  userRole: string,
  allowedRoles: string[]
): boolean {
  if (!userRole || !Array.isArray(allowedRoles) || allowedRoles.length === 0) {
    return false;
  }

  return allowedRoles.includes(userRole);
}

/**
 * Zero-trust patient access resolver.
 * Enforces that patient users can strictly and only access their own records.
 * Clinical staff and administrators can view the designated patient's records.
 */
export async function resolveAuthorizedPatient(
  req: NextRequest,
  explicitPatientId?: string | null
): Promise<
  | { user: AuthenticatedUser; patient: any; isPatient: boolean }
  | { response: NextResponse }
> {
  const user = await getAuthenticatedSessionUser(req);
  if (!user) {
    return {
      response: NextResponse.json(
        { success: false, error: "Unauthorized: A valid session is required to access medical records." },
        { status: 401 }
      ),
    };
  }

  // 1. If caller is a patient, strictly resolve their own profile
  if (user.role === "patient") {
    const [ownPatient] = await db
      .select()
      .from(patients)
      .where(or(eq(patients.userId, user.id), eq(patients.email, user.email)))
      .limit(1);

    if (!ownPatient) {
      return {
        response: NextResponse.json(
          { success: false, error: "No patient profile found. Please complete registration." },
          { status: 404 }
        ),
      };
    }

    // If caller specified an explicit patientId or mrn, it MUST match their own
    if (
      explicitPatientId &&
      explicitPatientId !== ownPatient.id &&
      explicitPatientId !== ownPatient.mrn
    ) {
      return {
        response: NextResponse.json(
          {
            success: false,
            error: "Access denied: Patients may only access their own medical records.",
          },
          { status: 403 }
        ),
      };
    }

    return { user, patient: ownPatient, isPatient: true };
  }

  // 2. Clinical staff or administrators
  let targetPatient: any = null;
  if (explicitPatientId) {
    const [found] = await db
      .select()
      .from(patients)
      .where(or(eq(patients.id, explicitPatientId), eq(patients.mrn, explicitPatientId)))
      .limit(1);
    targetPatient = found || null;
  }

  return { user, patient: targetPatient, isPatient: false };
}

