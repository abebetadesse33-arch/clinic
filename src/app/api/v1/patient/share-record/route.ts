import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sharedMedicalRecords } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { randomBytes } from "crypto";
import { resolveAuthorizedPatient } from "@/lib/security/auth-session";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/patient/share-record
 * Creates a secure, time-limited QR token to share medical records with consulting doctors.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      patientId: requestedPatientId,
      durationHours = 24,
      accessScope = ["allergies", "medications", "lab_results", "conditions", "emergency_contacts"],
      passcode,
      doctorName,
    } = body;

    // Resolve authorized patient — patients are strictly scoped to their own record
    const auth = await resolveAuthorizedPatient(req, requestedPatientId || null);
    if ("response" in auth) {
      return auth.response;
    }

    const pat = auth.patient;
    if (!pat) {
      return NextResponse.json(
        { success: false, error: "Patient profile not found." },
        { status: 404 }
      );
    }

    const shareToken = `smr_${randomBytes(16).toString("hex")}`;
    const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);

    const [record] = await db
      .insert(sharedMedicalRecords)
      .values({
        patientId: pat.id,
        shareToken,
        accessScope,
        passcode: passcode ? String(passcode).trim() : null,
        doctorName: doctorName ? String(doctorName).trim() : null,
        status: "active",
        expiresAt,
      })
      .returning();

    // Construct full share URL
    const origin = req.nextUrl.origin || "https://app.ninimed.org";
    const shareUrl = `${origin}/share/medical/${shareToken}`;

    return NextResponse.json({
      success: true,
      data: {
        shareId: record.id,
        shareToken,
        shareUrl,
        expiresAt: expiresAt.toISOString(),
        durationHours,
        accessScope,
        hasPasscode: Boolean(passcode),
        doctorName: doctorName || "Consulting Physician / External Clinic",
        qrData: JSON.stringify({
          type: "NINIMED_SHARED_RECORD",
          token: shareToken,
          url: shareUrl,
          expiresAt: expiresAt.toISOString(),
        }),
      },
      message: `Medical share pass generated. Valid for ${durationHours} hours.`,
    });
  } catch (error: any) {
    console.error("Error creating shared medical record QR:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to generate medical share QR code." },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/patient/share-record
 * Lists active and past medical share tokens for the authenticated patient.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const explicitPatientId = searchParams.get("patientId") || searchParams.get("id");

    const auth = await resolveAuthorizedPatient(req, explicitPatientId);
    if ("response" in auth) {
      return auth.response;
    }

    const pat = auth.patient;
    if (!pat) {
      return NextResponse.json({ success: true, data: [] });
    }

    const shares = await db
      .select()
      .from(sharedMedicalRecords)
      .where(eq(sharedMedicalRecords.patientId, pat.id))
      .orderBy(desc(sharedMedicalRecords.createdAt))
      .limit(20);

    return NextResponse.json({
      success: true,
      data: shares.map((s) => ({
        ...s,
        isExpired: new Date(s.expiresAt) < new Date(),
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch shared records." },
      { status: 500 }
    );
  }
}
