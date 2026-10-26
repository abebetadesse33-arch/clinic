import { NextRequest, NextResponse } from "next/server";
import { and, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { cases, companies, companyAdmins, encounters, familyGroups, patients } from "@/db/schema";
import {
  AuthenticatedUser,
  isAdminUser,
  requireAuthenticatedUser,
  resolveAuthorizedPatient,
} from "@/lib/security/auth-session";

const notFound = (what: string) =>
  NextResponse.json({ success: false, error: `${what} not found.` }, { status: 404 });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Returns a 404 response unless the encounter exists inside the caller's organization. */
export async function assertEncounterInTenant(
  encounterId: string,
  organizationId: string
): Promise<NextResponse | null> {
  if (!UUID_RE.test(encounterId)) return notFound("Encounter");
  const [row] = await db
    .select({ id: encounters.id })
    .from(encounters)
    .where(and(eq(encounters.id, encounterId), eq(encounters.tenantId, organizationId)))
    .limit(1);
  return row ? null : notFound("Encounter");
}

/**
 * Patient-scoped access for `/patients/[id]/...` routes. Patients are pinned to
 * their own record; staff may reach any patient in their own organization.
 * `patient` is null when staff pass an id that is not a real patient (e.g. a
 * demo placeholder), which callers may treat as "no data" rather than an error.
 */
export async function requirePatientAccess(
  req: NextRequest,
  patientIdOrMrn: string
): Promise<
  { user: AuthenticatedUser; patient: any | null; isPatient: boolean } | { response: NextResponse }
> {
  const access = await resolveAuthorizedPatient(req, patientIdOrMrn);
  if ("response" in access) return access;

  if (access.patient && !access.isPatient && access.patient.tenantId !== access.user.organizationId) {
    return { response: notFound("Patient") };
  }
  return access;
}

/**
 * Case access: staff in the same organization, or the patient who owns the case.
 * `caseKey` may be the row id, the public caseId or the case number.
 */
export async function requireCaseAccess(
  req: NextRequest,
  caseKey: string
): Promise<{ user: AuthenticatedUser; row: typeof cases.$inferSelect } | { response: NextResponse }> {
  const auth = await requireAuthenticatedUser(req);
  if ("response" in auth) return auth;

  const condition = UUID_RE.test(caseKey)
    ? or(eq(cases.id, caseKey), eq(cases.caseId, caseKey), eq(cases.caseNumber, caseKey))
    : or(eq(cases.caseId, caseKey), eq(cases.caseNumber, caseKey));
  const [row] = await db.select().from(cases).where(condition).limit(1);
  if (!row) return { response: notFound("Case") };

  if (auth.user.role === "patient") {
    const [own] = await db
      .select({ id: patients.id })
      .from(patients)
      .where(or(eq(patients.userId, auth.user.id), eq(patients.email, auth.user.email)))
      .limit(1);
    if (!own || row.patientId !== own.id) {
      return {
        response: NextResponse.json(
          { success: false, error: "Access denied: patients may only access their own cases." },
          { status: 403 }
        ),
      };
    }
  } else if (row.tenantId && row.tenantId !== auth.user.organizationId) {
    return { response: notFound("Case") };
  }
  return { user: auth.user, row };
}

/** The patient record that belongs to a patient-role user, or null. */
export async function findOwnPatient(user: AuthenticatedUser) {
  const [own] = await db
    .select()
    .from(patients)
    .where(or(eq(patients.userId, user.id), eq(patients.email, user.email)))
    .limit(1);
  return own || null;
}

/**
 * Company access: administrators of the company's organization, or the company's
 * own portal admins (owners and HR managers may change things, finance viewers
 * are read-only).
 */
export async function requireCompanyAccess(
  req: NextRequest,
  companyId: string,
  mode: "read" | "write"
): Promise<{ user: AuthenticatedUser; company: typeof companies.$inferSelect } | { response: NextResponse }> {
  const auth = await requireAuthenticatedUser(req);
  if ("response" in auth) return auth;

  const [company] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
  if (!company || company.tenantId !== auth.user.organizationId) return { response: notFound("Company") };

  if (isAdminUser(auth.user)) return { user: auth.user, company };

  const [membership] = await db
    .select({ role: companyAdmins.role })
    .from(companyAdmins)
    .where(and(eq(companyAdmins.companyId, companyId), eq(companyAdmins.userId, auth.user.id)))
    .limit(1);
  const allowed = membership && (mode === "read" || membership.role !== "finance_viewer");
  if (!allowed) {
    return {
      response: NextResponse.json(
        { success: false, error: "Forbidden: you are not an administrator of this company." },
        { status: 403 }
      ),
    };
  }
  return { user: auth.user, company };
}

/**
 * Family group access: staff in the same organization, or a patient who is the
 * group's primary member. Members who are not the primary cannot manage the group.
 */
export async function requireFamilyGroupAccess(
  req: NextRequest,
  groupId: string
): Promise<{ user: AuthenticatedUser; group: typeof familyGroups.$inferSelect } | { response: NextResponse }> {
  const auth = await requireAuthenticatedUser(req);
  if ("response" in auth) return auth;

  const [group] = await db.select().from(familyGroups).where(eq(familyGroups.id, groupId)).limit(1);
  if (!group || group.tenantId !== auth.user.organizationId) return { response: notFound("Family group") };

  if (auth.user.role === "patient") {
    const own = await findOwnPatient(auth.user);
    if (!own || own.id !== group.primaryPatientId) {
      return {
        response: NextResponse.json(
          { success: false, error: "Access denied: only the primary member can manage a family group." },
          { status: 403 }
        ),
      };
    }
  }
  return { user: auth.user, group };
}
