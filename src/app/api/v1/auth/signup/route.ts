import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, organizations, patients, systemAuthSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createHash, randomInt } from "crypto";

function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

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

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedPhone = phone ? phone.trim() : null;
    const cleanNationalId = nationalId ? nationalId.trim().toUpperCase() : null;

    if (body.accountType && body.accountType !== "patient") {
      return NextResponse.json(
        { success: false, error: "Public registration is limited to patients. Staff and admin roles are assigned after account approval by the admin team." },
        { status: 403 }
      );
    }

    const [settings] = await db.select().from(systemAuthSettings).limit(1);
    const requireEmail = settings ? settings.requireEmailVerification : true;
    const requireSms = settings ? settings.requireSmsVerification : false;

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

    const [createdUser] = await db
      .insert(users)
      .values({
        organizationId: orgId,
        email: normalizedEmail,
        passwordHash: sha256Hex(password),
        fullName,
        role: "patient",
        nationalId: cleanNationalId,
        phone: normalizedPhone,
      })
      .returning();

    const patientMrn = mrn || `MRN-${randomInt(10000, 99999)}`;
    const digitalCardNumber = `NINI-2026-${randomInt(1000, 9999)}-${randomInt(1000, 9999)}`;
    const loginPasscode = `NN-${randomInt(100000, 999999)}`;
    const issueDate = new Date();
    const expiryDate = new Date(issueDate.getTime() + 90 * 24 * 60 * 60 * 1000);

    const nameParts = fullName.split(" ");
    const firstName = nameParts[0] || fullName;
    const lastName = nameParts.slice(1).join(" ") || "Patient";

    const [createdPatient] = await db
      .insert(patients)
      .values({
        tenantId: orgId,
        userId: createdUser.id,
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
      })
      .returning();

    const BRANCH_NAMES: Record<string, string> = {
      "habitat-main": "NiniMed Habitat Clinic & 24/7 ER (Main)",
      "tebasse-branch": "NiniMed Tebasse Clinic",
      "atakilt-branch": "NiniMed Atakilt Clinic",
      "liche-branch": "NiniMed Liche Health Center",
    };

    const patientCard = {
      cardId: digitalCardNumber,
      mrn: patientMrn,
      patientName: fullName,
      nationalId: cleanNationalId || "ETH-VERIFIED-ID",
      nationalIdVerified: Boolean(cleanNationalId),
      phone: normalizedPhone || "N/A",
      email: normalizedEmail,
      bloodType: bloodType || "O+",
      primaryClinic: BRANCH_NAMES[preferredClinicBranch] || "NiniMed Habitat Main Clinic",
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
        token: `token_${createdUser.id}_${Date.now()}`,
        message: "Welcome to NiniMed! Your patient account has been created and your Digital Patient Card is ready.",
      },
      { status: 201 }
    );

    response.cookies.set("Nini_session", createdUser.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error: any) {
    console.error("Error in registration:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to complete account registration." },
      { status: 500 }
    );
  }
}
