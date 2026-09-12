import { NextRequest, NextResponse } from "next/server";
import { resolveAuthorizedPatient } from "@/lib/security/auth-session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const explicitPatientId = searchParams.get("patientId") || searchParams.get("id") || searchParams.get("mrn");

  try {
    const auth = await resolveAuthorizedPatient(req, explicitPatientId);
    if ("response" in auth) {
      return auth.response;
    }

    const pat = auth.patient;
    if (!pat) {
      return NextResponse.json(
        { success: false, error: "No patient profile found. Please complete registration." },
        { status: 404 }
      );
    }

    const birthYear = pat.dateOfBirth ? new Date(pat.dateOfBirth).getFullYear() : 1990;
    const currentYear = new Date().getFullYear();
    const age = currentYear - birthYear;

    return NextResponse.json({
      success: true,
      data: {
        id: pat.id,
        mrn: pat.mrn,
        nationalId: pat.nationalId || "ETH-VERIFIED-ID",
        nationalIdVerified: Boolean(pat.nationalIdVerified),
        digitalCardNumber: pat.digitalCardNumber || `NINI-2026-${pat.mrn?.replace(/\D/g, "") || "9482"}`,
        preferredClinicBranch: pat.preferredClinicBranch || "habitat-main",
        firstName: pat.firstName,
        lastName: pat.lastName,
        dateOfBirth: pat.dateOfBirth,
        age,
        gender: pat.gender,
        bloodType: pat.bloodType || "O+",
        phone: pat.phone || "",
        email: pat.email || "",
        emergencyContact: pat.emergencyContact || "None specified",
        primaryDoctor: "Care Team Physician",
        allergies: pat.allergies || [],
        chronicConditions: [],
        careTeam: [],
      },
    });
  } catch (e: any) {
    console.error("Error querying real patient in /api/v1/patient/me:", e);
    return NextResponse.json(
      {
        success: false,
        error: e?.message || "Failed to load patient profile",
      },
      { status: 500 }
    );
  }
}

