import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { and, eq, gt, lt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { users, patients, authSessions } from "@/db/schema";
import { AUTH_SCHEMA_STATEMENTS } from "@/db/auth-schema";

/**
 * Server-side session management.
 *
 * The browser receives an opaque random token in the HTTP-only "Nini_session"
 * cookie. Only the SHA-256 hash of that token is stored in `auth_sessions`,
 * together with the owning user and an expiry. Identity is always resolved
 * from that table; nothing in a request body or query string is trusted.
 */

export const SESSION_COOKIE_NAME = "Nini_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
const LAST_SEEN_REFRESH_MS = 10 * 60 * 1000;
const AUTH_SCHEMA_RETRY_MS = 60 * 1000;

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

export interface AuthSession {
  userId: string;
  organizationId: string;
  roles: string[];
  user: AuthenticatedUser;
}

// ─── Schema self-heal ────────────────────────────────────────────────────────

let authSchemaReady: Promise<void> | null = null;

/**
 * Makes sure the tables/columns the auth flow needs exist. Idempotent and
 * memoised per process, so the cost is one round of DDL per server start.
 * Kept independent of the large boot-time schema block, which can partially
 * fail and silently leave `users` without newer columns.
 */
export function ensureAuthSchema(): Promise<void> {
  if (!authSchemaReady) {
    authSchemaReady = (async () => {
      for (const statement of AUTH_SCHEMA_STATEMENTS) {
        await db.execute(sql.raw(statement));
      }
    })().catch((err) => {
      // Never block sign-in on this step: if the schema is already correct the
      // following queries succeed anyway, and if it is not they report the real
      // error. Retry the DDL after a short backoff.
      console.error("[AuthSession] Auth schema check failed (continuing):", err?.message || err);
      const retry: any = setTimeout(() => {
        authSchemaReady = null;
      }, AUTH_SCHEMA_RETRY_MS);
      retry.unref?.();
    });
  }
  return authSchemaReady;
}

// ─── Token helpers ───────────────────────────────────────────────────────────

function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function requestMeta(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for");
  return {
    ipAddress: (forwarded ? forwarded.split(",")[0] : req.headers.get("x-real-ip") || "").trim() || null,
    userAgent: (req.headers.get("user-agent") || "").slice(0, 512) || null,
  };
}

// ─── Session lifecycle ───────────────────────────────────────────────────────

/**
 * Creates a new server-side session for the user and returns the raw token
 * that must be placed in the cookie. The token itself is never stored.
 */
export async function createSession(userId: string, req: NextRequest): Promise<string> {
  await ensureAuthSchema();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  const meta = requestMeta(req);

  await db.insert(authSessions).values({
    userId,
    tokenHash: hashToken(token),
    expiresAt,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  // Opportunistic cleanup of this user's expired sessions.
  db.delete(authSessions)
    .where(and(eq(authSessions.userId, userId), lt(authSessions.expiresAt, new Date())))
    .catch(() => {});

  return token;
}

/** Deletes the session referenced by the request cookie, if any. */
export async function revokeSession(req: NextRequest): Promise<void> {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return;
  try {
    await db.delete(authSessions).where(eq(authSessions.tokenHash, hashToken(token)));
  } catch (err) {
    console.error("[AuthSession] Failed to revoke session:", err);
  }
}

/** Deletes every session belonging to a user (password change, deactivation). */
export async function revokeAllSessionsForUser(userId: string): Promise<void> {
  await db.delete(authSessions).where(eq(authSessions.userId, userId));
}

export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && process.env.NINIMED_INSECURE_COOKIE !== "true",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && process.env.NINIMED_INSECURE_COOKIE !== "true",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

// ─── Identity resolution ─────────────────────────────────────────────────────

/**
 * Compatibility adapter for API modules using the older session shape.
 * The identity still comes exclusively from the verified HTTP-only session.
 */
export async function getAuthSession(req: NextRequest): Promise<AuthSession | null> {
  const user = await getAuthenticatedSessionUser(req);
  if (!user) return null;

  return {
    userId: user.id,
    organizationId: user.organizationId,
    roles: [user.role, ...(user.role === "system_admin" || user.role === "tenant_admin" ? ["admin"] : [])],
    user,
  };
}

/**
 * Returns the verified user ID for the session cookie, or null when the
 * session is missing, unknown, expired, or belongs to an inactive user.
 */
export async function getAuthenticatedSessionUserId(req: NextRequest): Promise<string | null> {
  const user = await getAuthenticatedSessionUser(req);
  return user?.id ?? null;
}

/**
 * Returns the full verified user record for the session cookie, or null when
 * unauthenticated.
 */
export async function getAuthenticatedSessionUser(req: NextRequest): Promise<AuthenticatedUser | null> {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token || token.length < 32 || token.length > 128) {
    return null;
  }

  try {
    await ensureAuthSchema();
    const now = new Date();
    const [row] = await db
      .select({
        sessionId: authSessions.id,
        lastSeenAt: authSessions.lastSeenAt,
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
      .from(authSessions)
      .innerJoin(users, eq(users.id, authSessions.userId))
      .where(
        and(
          eq(authSessions.tokenHash, hashToken(token)),
          gt(authSessions.expiresAt, now),
          eq(users.isActive, true)
        )
      )
      .limit(1);

    if (!row) return null;

    if (now.getTime() - new Date(row.lastSeenAt).getTime() > LAST_SEEN_REFRESH_MS) {
      db.update(authSessions)
        .set({ lastSeenAt: now })
        .where(eq(authSessions.id, row.sessionId))
        .catch(() => {});
    }

    const { sessionId: _sessionId, lastSeenAt: _lastSeenAt, ...user } = row;
    return user;
  } catch (err) {
    console.error("[AuthSession] Error resolving session:", err);
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
