import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { medications, auditLogs } from "@/db/schema";
import { createMedicationSchema } from "@/lib/validations/schemas";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { insertReturning } from "@/lib/db/returning";
import { requireRoles, STAFF_ROLES, CLINICIAN_ROLES } from "@/lib/security/auth-session";

// GET /api/v1/medications
export async function GET(req: NextRequest) {
  const auth = await requireRoles(req, STAFF_ROLES);
  if ("response" in auth) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId");

    if (patientId) {
      const data = await db
        .select()
        .from(medications)
        .where(eq(medications.patientId, patientId));
      return NextResponse.json({ success: true, data });
    }

    const data = await db
      .select()
      .from(medications)
      .limit(100);

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Error fetching medications:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch medications" },
      { status: 500 }
    );
  }
}

// POST /api/v1/medications
export async function POST(req: NextRequest) {
  const auth = await requireRoles(req, CLINICIAN_ROLES);
  if ("response" in auth) return auth.response;

  try {
    const body = await req.json();
    const validated = createMedicationSchema.parse(body);

    const [newMed] = await insertReturning(db, medications, {
        tenantId: auth.user.organizationId,
        patientId: validated.patientId,
        name: validated.name,
        dosage: validated.dosage,
        frequency: validated.frequency,
        route: validated.route,
        indication: validated.indication,
        startDate: validated.startDate,
        isActive: validated.isActive,
        pharmacistVerified: validated.pharmacistVerified,
      });

    await db.insert(auditLogs).values({
      tenantId: auth.user.organizationId,
      action: "MEDICATION_ADDED",
      entityType: "medications",
      entityId: newMed.id,
      summary: `Added active medication: ${newMed.name} ${newMed.dosage} for patient ${newMed.patientId}`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json(
      { success: true, data: newMed, message: "Medication added to patient record" },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: error.errors },
        { status: 422 }
      );
    }
    console.error("Error creating medication:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to add medication" },
      { status: 500 }
    );
  }
}
