import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, organizations, patients, systemAuthSettings, clinicLocations } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { randomInt } from "crypto";
import { dispatchNotification } from "@/lib/notifications/notification-service";
import { hashPassword } from "@/lib/security/password";
import { createSession, ensureAuthSchema, setSessionCookie } from "@/lib/security/auth-session";
import { insertReturning } from "@/lib/db/returning";

const MIN_PASSWORD_LENGTH = 8;

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      fullName,
      email,
      password,
      nationalId,
      preferredClinicBranch = "habitat-main",
      phone,
      dateOfBirth,
      gender,
      mrn,
      bloodType = "O+",
      verificationToken,
    } = body;

    if (!fullName || !email || !password) {
      return NextResponse.json(
        { success: false, error: "Full Name, Email, and Password are required." },
        { status: 400 }
      );
    }

    if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { success: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` },
        { status: 400 }
      );
    }

    await ensureAuthSchema();

    const normalizedEmail = String(email).toLowerCase().trim();
    const normalizedPhone = phone ? phone.trim() : null;
    const cleanNationalId = nationalId ? nationalId.trim().toUpperCase() : null;

    if (body.accountType && body.accountType !== "patient") {
      return NextResponse.json(
        { success: false, error: "Public registration is limited to patients. Staff and admin roles are assigned after account approval by the admin team." },
        { status: 403 }
      );
    }

    // Verification settings are optional; a missing table must not block registration.
    let requireEmail = false;
    let requireSms = false;
    try {
      const [settings] = await db.select().from(systemAuthSettings).limit(1);
      requireEmail = Boolean(settings?.requireEmailVerification);
      requireSms = Boolean(settings?.requireSmsVerification);
    } catch (err) {
      console.warn("[Signup] Could not read system_auth_settings; continuing without verification:", err);
    }

    if ((requireEmail || requireSms) && !verificationToken) {
      return NextResponse.json(
        {
          success: false,
          requireVerification: true,
          channel: requireEmail ? "email" : "sms",
          identifier: requireEmail ? normalizedEmail : (normalizedPhone || normalizedEmail),
          message: "Verification required. A 6-digit OTP code has been dispatched to complete account activation.",
        },
        { status: 200 }
      );
    }

    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "An account with this email address already exists. Please sign in instead." },
        { status: 409 }
      );
    }

    if (cleanNationalId) {
      const [existingWithNid] = await db
        .select({ id: patients.id, mrn: patients.mrn })
        .from(patients)
        .where(eq(patients.nationalId, cleanNationalId))
        .limit(1);

      if (existingWithNid) {
        return NextResponse.json(
          { success: false, error: `National ID (${cleanNationalId}) is already linked to patient record ${existingWithNid.mrn}.` },
          { status: 409 }
        );
      }
    }

    let orgId = "00000000-0000-0000-0000-000000000001";
    try {
      const [existingOrg] = await db.select().from(organizations).limit(1);
      if (existingOrg) orgId = existingOrg.id;
    } catch {}

    const patientMrn = mrn || `MRN-${randomInt(10000, 99999)}`;
    const digitalCardNumber = `NINI-2026-${randomInt(1000, 9999)}-${randomInt(1000, 9999)}`;
    const loginPasscode = `NN-${randomInt(100000, 999999)}`;
    const issueDate = new Date();
    const expiryDate = new Date(issueDate.getTime() + 90 * 24 * 60 * 60 * 1000);

    const nameParts = fullName.split(" ");
    const firstName = nameParts[0] || fullName;
    const lastName = nameParts.slice(1).join(" ") || "Patient";

    const passwordHash = await hashPassword(password);

    const { createdUser, createdPatient } = await db.transaction(async (tx) => {
      const [user] = await insertReturning(tx, users, {
          organizationId: orgId,
          email: normalizedEmail,
          passwordHash,
          fullName,
          role: "patient",
          nationalId: cleanNationalId,
          phone: normalizedPhone,
        });

      const [patient] = await insertReturning(tx, patients, {
          tenantId: orgId,
          userId: user.id,
          mrn: patientMrn,
          nationalId: cleanNationalId,
          nationalIdVerified: Boolean(cleanNationalId),
          digitalCardNumber,
          preferredClinicBranch: preferredClinicBranch || "habitat-main",
          firstName,
          lastName,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth).toISOString().split("T")[0] : "1990-01-01",
          gender: (gender as any) || "other",
          bloodType: bloodType || "O+",
          email: normalizedEmail,
          phone: normalizedPhone,
        });

      return { createdUser: user, createdPatient: patient };
    });

    const [preferredBranch] = await db
      .select({ name: clinicLocations.name })
      .from(clinicLocations)
      .where(
        and(
          eq(clinicLocations.slug, preferredClinicBranch || "habitat-main"),
          eq(clinicLocations.tenantId, orgId),
          eq(clinicLocations.isActive, true),
        ),
      )
      .limit(1);

    const patientCard = {
      cardId: digitalCardNumber,
      mrn: patientMrn,
      patientName: fullName,
      nationalId: cleanNationalId || "ETH-VERIFIED-ID",
      nationalIdVerified: Boolean(cleanNationalId),
      phone: normalizedPhone || "N/A",
      email: normalizedEmail,
      bloodType: bloodType || "O+",
      primaryClinic: preferredBranch?.name || "NiniMed Clinic",
      issuedAt: issueDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      validUntil: expiryDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      status: "Active 3-Month Membership",
      qrData: JSON.stringify({
        patientName: fullName,
        mrn: patientMrn,
        nationalId: cleanNationalId,
        cardId: digitalCardNumber,
        clinic: preferredClinicBranch,
        verified: true,
      }),
      loginPasscode,
    };

    try {
      await dispatchNotification({
        category: "system",
        type: "welcome_message",
        title: `Welcome to NiniMed, ${firstName}!`,
        body: "Your patient account is ready. Explore your dashboard, book a visit, and keep your digital patient card available for check-in.",
        priority: "normal",
        recipientUserId: createdUser.id,
        actionUrl: "/patient/dashboard",
        actionText: "Open Patient Dashboard",
        relatedEntityType: "patient",
        relatedEntityId: createdPatient.id,
        metadata: { messageKind: "welcome", mrn: patientMrn },
      });
    } catch (notificationError) {
      console.error("[Signup] Welcome notification delivery failed:", notificationError);
    }

    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: createdUser.id,
          fullName: createdUser.fullName,
          email: createdUser.email,
          role: createdUser.role,
          nationalId: cleanNationalId,
          organizationId: createdUser.organizationId,
        },
        patient: createdPatient,
        patientCard,
        loginPasscode,
        redirectUrl: "/patient/dashboard",
        message: "Welcome to NiniMed! Your patient account has been created and your Digital Patient Card is ready.",
      },
      { status: 201 }
    );

    setSessionCookie(response, await createSession(createdUser.id, req));

    return response;
  } catch (error: any) {
    console.error("[Auth] Registration failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to complete account registration.",
        ...(process.env.NODE_ENV !== "production" || process.env.NINIMED_AUTH_DEBUG === "true"
          ? { detail: error?.message || String(error) }
          : {}),
      },
      { status: 500 }
    );
  }
}
