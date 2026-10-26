import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  patients,
  vitals,
  labResults,
  medications,
  prescriptions,
  carePlans,
  geneticProfiles,
  auditLogs,
  users,
} from "@/db/schema";
import { updatePatientSchema } from "@/lib/validations/schemas";
import { requireAdminUser } from "@/lib/security/auth-session";
import { requirePatientAccess } from "@/lib/security/tenant-resource";
import { and, eq, desc } from "drizzle-orm";
import { z } from "zod";
import { insertReturning, updateReturning, deleteReturning } from "@/lib/db/returning";

// GET /api/v1/patients/[id] - Complete 360 Patient Profile
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requirePatientAccess(req, params.id);
    if ("response" in auth) {
      return auth.response;
    }
    const patientId = auth.isPatient ? auth.patient.id : params.id;

    const patientRes = await db
      .select()
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);

    if (!patientRes || patientRes.length === 0) {
      return NextResponse.json(
        { success: false, error: "Patient not found" },
        { status: 404 }
      );
    }

    const patient = patientRes[0];

    // Fetch related clinical records in parallel
    const [
      patientVitals,
      patientLabs,
      patientMeds,
      patientRx,
      patientCarePlans,
      patientGenetics,
    ] = await Promise.all([
      db
        .select()
        .from(vitals)
        .where(eq(vitals.patientId, patientId))
        .orderBy(desc(vitals.recordedAt))
        .limit(10),
      db
        .select()
        .from(labResults)
        .where(eq(labResults.patientId, patientId))
        .orderBy(desc(labResults.performedAt))
        .limit(20),
      db
        .select()
        .from(medications)
        .where(eq(medications.patientId, patientId)),
      db
        .select()
        .from(prescriptions)
        .where(eq(prescriptions.patientId, patientId))
        .orderBy(desc(prescriptions.createdAt)),
      db
        .select()
        .from(carePlans)
        .where(eq(carePlans.patientId, patientId))
        .orderBy(desc(carePlans.createdAt))
        .limit(5),
      db
        .select()
        .from(geneticProfiles)
        .where(eq(geneticProfiles.patientId, patientId)),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        ...patient,
        vitals: patientVitals,
        labResults: patientLabs,
        medications: patientMeds,
        prescriptions: patientRx,
        carePlans: patientCarePlans,
        geneticProfiles: patientGenetics,
      },
    });
  } catch (error: any) {
    console.error("Error fetching patient profile:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch patient" },
      { status: 500 }
    );
  }
}

// PUT /api/v1/patients/[id] - Update Patient Profile
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requirePatientAccess(req, params.id);
    if ("response" in auth) {
      return auth.response;
    }
    const patientId = auth.isPatient ? auth.patient.id : params.id;
    const body = await req.json();

    const validated = updatePatientSchema.parse(body);

    const [updated] = await updateReturning(db, patients, {
        ...validated,
        updatedAt: new Date(),
      }, and(eq(patients.id, patientId), eq(patients.tenantId, auth.user.organizationId)));

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Patient not found" },
        { status: 404 }
      );
    }

    await insertReturning(db, auditLogs, {
      tenantId: auth.user.organizationId,
      action: "PATIENT_UPDATED",
      entityType: "patients",
      entityId: patientId,
      summary: `Updated profile for patient ${updated.firstName} ${updated.lastName} (${updated.mrn})`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Patient updated successfully",
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: error.errors },
        { status: 422 }
      );
    }
    console.error("Error updating patient:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update patient" },
      { status: 500 }
    );
  }
}

// DELETE /api/v1/patients/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Deleting a patient record is an administrative action.
    const auth = await requireAdminUser(req);
    if ("response" in auth) {
      return auth.response;
    }
    const patientId = params.id;

    const [deleted] = await deleteReturning(db, patients, and(eq(patients.id, patientId), eq(patients.tenantId, auth.user.organizationId)));

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Patient not found" },
        { status: 404 }
      );
    }

    await insertReturning(db, auditLogs, {
      tenantId: auth.user.organizationId,
      action: "PATIENT_ARCHIVED",
      entityType: "patients",
      entityId: patientId,
      summary: `Archived patient record for ${deleted.firstName} ${deleted.lastName} (${deleted.mrn})`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({
      success: true,
      message: "Patient record archived successfully",
    });
  } catch (error: any) {
    console.error("Error deleting patient:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete patient" },
      { status: 500 }
    );
  }
}
