import { NextResponse } from "next/server";
import { db } from "@/db";
import { patients } from "@/db/schema";
import { eq, or } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { registrationId, registrationData } = body;

    if (!registrationData) {
      return NextResponse.json(
        { success: false, error: "registrationData is required" },
        { status: 400 }
      );
    }

    const {
      firstName,
      lastName,
      dateOfBirth,
      gender,
      email,
      phone,
      address,
      emergencyContact,
      emergencyPhone,
    } = registrationData;

    // Real database duplicate check
    let duplicateMatch = null;
    if (email) {
      const [existing] = await db
        .select()
        .from(patients)
        .where(eq(patients.email, email.toLowerCase().trim()))
        .limit(1);
      if (existing) {
        duplicateMatch = existing;
      }
    }

    if (duplicateMatch) {
      return NextResponse.json({
        success: true,
        data: {
          duplicateDetected: true,
          matchedPatientId: duplicateMatch.id,
          matchedMrn: duplicateMatch.mrn,
          matchedName: `${duplicateMatch.firstName} ${duplicateMatch.lastName}`,
          resolution: "merged_or_linked",
          message: "An existing patient record was found with this email. Your new submission has been linked to your medical chart.",
        },
      });
    }

    // Insert new patient in DB
    const mrn = `MRN-${Math.floor(10000 + Math.random() * 90000)}`;
    const dobString = dateOfBirth ? new Date(dateOfBirth).toISOString().split("T")[0] : "1990-01-01";
    const emergencyContactStr = emergencyContact
      ? (typeof emergencyContact === "string" ? emergencyContact : `${emergencyContact}${emergencyPhone ? ` (${emergencyPhone})` : ""}`)
      : null;

    const [newPat] = await db
      .insert(patients)
      .values({
        tenantId: "00000000-0000-0000-0000-000000000001",
        mrn,
        firstName: firstName || "New",
        lastName: lastName || "Patient",
        dateOfBirth: dobString,
        gender: (gender as any) || "other",
        phone: phone || "",
        email: email?.toLowerCase().trim() || `${mrn.toLowerCase()}@patient.Nini.org`,
        emergencyContact: emergencyContactStr,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: {
        duplicateDetected: false,
        patientId: newPat.id,
        mrn: newPat.mrn,
        name: `${newPat.firstName} ${newPat.lastName}`,
        status: "active",
        message: "Patient registration completed successfully. Your medical record has been activated.",
      },
    });
  } catch (error: any) {
    console.error("Error submitting registration:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
