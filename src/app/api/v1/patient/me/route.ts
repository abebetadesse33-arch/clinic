import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { patients, users } from "@/db/schema";
import { eq, or } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const explicitPatientId = searchParams.get("patientId") || searchParams.get("id");
  const explicitMrn = searchParams.get("mrn");
  const sessionId = req.cookies.get("Nini_session")?.value;

  try {
    let pat: any = null;

    // 1. If explicit patientId or mrn provided, look it up directly first!
    if (explicitPatientId) {
      const [found] = await db.select().from(patients).where(eq(patients.id, explicitPatientId)).limit(1);
      pat = found;
    } else if (explicitMrn) {
      const [found] = await db.select().from(patients).where(eq(patients.mrn, explicitMrn)).limit(1);
      pat = found;
    }

    // 2. Otherwise lookup by authenticated session
    let currentUser: any = null;
    if (!pat && sessionId) {
      const [u] = await db.select().from(users).where(eq(users.id, sessionId)).limit(1);
      currentUser = u;
    }

    if (currentUser && currentUser.role !== "patient") {
      return NextResponse.json({ success: false, error: "Access denied for non-patient account." }, { status: 403 });
    }

    if (!pat && currentUser) {
      const [foundPat] = await db
        .select()
        .from(patients)
        .where(or(eq(patients.userId, currentUser.id), eq(patients.email, currentUser.email)))
        .limit(1);
      pat = foundPat;
    }

    if (pat && currentUser && currentUser.role === "patient") {
      const ownsRecord = pat.userId === currentUser.id || pat.email?.toLowerCase() === currentUser.email?.toLowerCase();
      if (!ownsRecord) {
        return NextResponse.json({ success: false, error: "Patients can only access their own health record." }, { status: 403 });
      }
    }

    if (!pat) {
      return NextResponse.json({ success: false, error: "No patient profile found. Please complete registration." }, { status: 404 });
    }

    if (pat) {
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
    }

    return NextResponse.json({
      success: false,
      error: "No patient profile found. Please complete registration.",
    }, { status: 404 });
  } catch (e: any) {
    console.error("Error querying real patient in /api/v1/patient/me:", e);
    return NextResponse.json({
      success: false,
      error: e?.message || "Failed to load patient profile",
    }, { status: 500 });
  }
}
