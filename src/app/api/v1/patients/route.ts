import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { patients, auditLogs, users } from "@/db/schema";
import { createPatientSchema } from "@/lib/validations/schemas";
import { desc, eq, ilike, or, and, count } from "drizzle-orm";
import { z } from "zod";
import { dispatchNotification } from "@/lib/notifications/notification-service";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

export const dynamic = "force-dynamic";

// GET /api/v1/patients
export async function GET(req: NextRequest) {
  try {
    const sessionId = req.cookies.get("Nini_session")?.value;
    let currentUser: any = null;

    if (sessionId) {
      const [user] = await db.select().from(users).where(eq(users.id, sessionId)).limit(1);
      currentUser = user;
    }

    if (currentUser && currentUser.role === "patient") {
      const [ownPatient] = await db
        .select()
        .from(patients)
        .where(or(eq(patients.userId, currentUser.id), eq(patients.email, currentUser.email)))
        .limit(1);

      if (!ownPatient) {
        return NextResponse.json({ success: true, data: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } });
      }

      return NextResponse.json({
        success: true,
        data: [ownPatient],
        pagination: { page: 1, limit: 1, total: 1, totalPages: 1 },
      });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const search = searchParams.get("search")?.trim() || "";
    const priority = searchParams.get("priority");
    const tenantId = searchParams.get("tenantId") || DEFAULT_TENANT_ID;

    const conditions = [eq(patients.tenantId, tenantId)];

    if (search) {
      conditions.push(
        or(
          ilike(patients.firstName, `%${search}%`),
          ilike(patients.lastName, `%${search}%`),
          ilike(patients.mrn, `%${search}%`)
        )!
      );
    }

    if (priority && priority !== "all") {
      conditions.push(eq(patients.triagePriority, priority as any));
    }

    const data = await db
      .select()
      .from(patients)
      .where(conditions.length > 1 ? and(...conditions) : conditions[0])
      .limit(limit)
      .offset((page - 1) * limit)
      .orderBy(desc(patients.createdAt));

    const totalRes = await db
      .select({ count: count() })
      .from(patients)
      .where(conditions.length > 1 ? and(...conditions) : conditions[0]);

    const total = totalRes[0]?.count || data.length;

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Error fetching patients:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch patients" },
      { status: 500 }
    );
  }
}

// POST /api/v1/patients
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = createPatientSchema.parse(body);

    const mrn = `MRN-${Math.floor(10000 + Math.random() * 90000)}`;

    const [newPatient] = await db
      .insert(patients)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        mrn,
        firstName: validated.firstName,
        lastName: validated.lastName,
        dateOfBirth: validated.dateOfBirth,
        gender: validated.gender,
        bloodType: validated.bloodType || "O+",
        phone: validated.phone || "+251 91 100 0000",
        email: validated.email || `${validated.firstName.toLowerCase()}.${validated.lastName.toLowerCase()}@patient.Nini.org`,
        allergies: validated.allergies || [],
        emergencyContact: validated.emergencyContact || "Emergency Contact on file",
        primaryDoctorId: validated.primaryDoctorId,
        triagePriority: validated.triagePriority || "routine",
        avatar: validated.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300",
      })
      .returning();

    // Append to immutable audit log
    await db.insert(auditLogs).values({
      tenantId: DEFAULT_TENANT_ID,
      action: "PATIENT_CREATED",
      entityType: "patients",
      entityId: newPatient.id,
      summary: `Registered new patient: ${newPatient.firstName} ${newPatient.lastName} (${newPatient.mrn}) with priority ${newPatient.triagePriority}`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    // Real-Time Notification: Alert Triage Staff and Reception
    await dispatchNotification({
      category: "appointments",
      type: "patient_registered",
      title: `New Patient Intake: ${newPatient.firstName} ${newPatient.lastName}`,
      body: `Assigned MRN: ${newPatient.mrn} • Acuity: ${(newPatient.triagePriority || "routine").toUpperCase()}. Ready for triage assessment.`,
      priority: newPatient.triagePriority === "critical" ? "critical" : "normal",
      targetRole: "triage_staff",
      actionUrl: `/patients/${newPatient.id}`,
      actionText: "Open Patient Chart",
      relatedEntityType: "patients",
      relatedEntityId: newPatient.id,
      metadata: { mrn: newPatient.mrn, triagePriority: newPatient.triagePriority },
    });

    return NextResponse.json(
      { success: true, data: newPatient, message: "Patient registered successfully" },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: error.errors },
        { status: 422 }
      );
    }
    console.error("Error creating patient:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create patient" },
      { status: 500 }
    );
  }
}
