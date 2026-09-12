import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { encounters, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { resolveAuthorizedPatient } from "@/lib/security/auth-session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const explicitPatientId = searchParams.get("patientId") || searchParams.get("id");

  try {
    const auth = await resolveAuthorizedPatient(req, explicitPatientId);
    if ("response" in auth) {
      return auth.response;
    }

    const pat = auth.patient;
    if (!pat) {
      return NextResponse.json({ success: true, data: [] });
    }

    const encs = await db
      .select({
        id: encounters.id,
        patientId: encounters.patientId,
        encounterType: encounters.encounterType,
        status: encounters.status,
        chiefComplaint: encounters.chiefComplaint,
        clinicalNotes: encounters.clinicalNotes,
        startTime: encounters.startTime,
        endTime: encounters.endTime,
        createdAt: encounters.createdAt,
        clinicianId: encounters.clinicianId,
      })
      .from(encounters)
      .where(eq(encounters.patientId, pat.id))
      .orderBy(desc(encounters.startTime));

    // Fetch clinician names
    const clinicianIds = encs
      .map((e) => e.clinicianId)
      .filter((id, idx, arr): id is string => typeof id === "string" && id.length > 0 && arr.indexOf(id) === idx);
    const clinicians: Record<string, string> = {};
    for (const cid of clinicianIds) {
      const [u] = await db.select({ fullName: users.fullName, role: users.role }).from(users).where(eq(users.id, cid)).limit(1);
      if (u) clinicians[cid] = u.fullName;
    }

    const shaped = encs.map((e) => ({
      id: e.id,
      patientId: e.patientId,
      type: e.chiefComplaint || e.encounterType?.replace(/_/g, " ") || "Clinical Visit",
      provider: (e.clinicianId && clinicians[e.clinicianId]) ? clinicians[e.clinicianId] : "Care Team Physician",
      specialty: e.encounterType === "telehealth" ? "Virtual Care" : "Primary Care",
      date: e.startTime
        ? new Date(e.startTime).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })
        : "",
      time: e.startTime
        ? new Date(e.startTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
        : "",
      scheduledAt: e.startTime,
      location: e.encounterType === "telehealth" ? "Secure Video Room" : "Main Clinic",
      isTelehealth: e.encounterType === "telehealth",
      status: e.status || "planned",
      reason: e.chiefComplaint || "",
      instructions: "Check in 10 minutes before your appointment.",
    }));

    return NextResponse.json({ success: true, data: shaped });
  } catch (err: any) {
    console.error("Error fetching appointments:", err);
    return NextResponse.json({ success: true, data: [] });
  }
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const explicitPatientId = searchParams.get("patientId") || searchParams.get("id");

  try {
    const auth = await resolveAuthorizedPatient(req, explicitPatientId);
    if ("response" in auth) {
      return auth.response;
    }

    const pat = auth.patient;
    const u = auth.user;
    if (!pat) return NextResponse.json({ success: false, error: "Patient profile not found" }, { status: 404 });

    const body = await req.json();
    const { provider, type, date, time, isTelehealth, reason } = body;

    const startTime = date && time
      ? new Date(`${date}T${time.replace(" AM", "").replace(" PM", "")}`)
      : new Date(Date.now() + 86400000 * 3);

    const [newEnc] = await db
      .insert(encounters)
      .values({
        tenantId: pat.tenantId,
        patientId: pat.id,
        clinicianId: pat.primaryDoctorId || u.id,
        encounterType: isTelehealth ? "telehealth" : "in_person",
        status: "planned",
        admissionStatus: "outpatient",
        currentStep: "front_desk",
        chiefComplaint: reason || type || "General consultation",
        startTime,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: { ...newEnc, provider: provider || "Care Team Physician" },
      message: "Appointment scheduled successfully!",
    });
  } catch (err: any) {
    console.error("Error creating appointment:", err);
    return NextResponse.json({ success: false, error: err?.message || "Internal server error" }, { status: 500 });
  }
}

