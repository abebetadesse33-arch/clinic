import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { prescriptions, auditLogs, patients, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { dispatchNotification } from "@/lib/notifications/notification-service";
import { getAuthenticatedSessionUserId } from "@/lib/security/auth-session";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const prescriptionId = params.id;
    if (!prescriptionId) {
      return NextResponse.json({ success: false, error: "Prescription ID is required" }, { status: 400 });
    }

    const sessionUserId = await getAuthenticatedSessionUserId(req);

    // 1. Fetch prescription
    const [rx] = await db
      .select({
        id: prescriptions.id,
        tenantId: prescriptions.tenantId,
        patientId: prescriptions.patientId,
        doctorId: prescriptions.doctorId,
        medicationName: prescriptions.medicationName,
        dosage: prescriptions.dosage,
        refillsAllowed: prescriptions.refillsAllowed,
        status: prescriptions.status,
      })
      .from(prescriptions)
      .where(eq(prescriptions.id, prescriptionId))
      .limit(1);

    if (!rx) {
      return NextResponse.json({ success: false, error: "Prescription not found" }, { status: 404 });
    }

    // 2. Fetch patient details
    const [patient] = await db
      .select({
        firstName: patients.firstName,
        lastName: patients.lastName,
        mrn: patients.mrn,
      })
      .from(patients)
      .where(eq(patients.id, rx.patientId))
      .limit(1);

    const patientName = patient ? `${patient.firstName} ${patient.lastName}`.trim() : "Patient";
    const patientMrn = patient?.mrn || "MRN-PENDING";

    // 3. Log Audit Trail
    await db.insert(auditLogs).values({
      tenantId: rx.tenantId,
      action: "PRESCRIPTION_REFILL_REQUESTED",
      entityType: "prescriptions",
      entityId: rx.id,
      summary: `Patient ${patientName} (${patientMrn}) requested e-prescription refill for ${rx.medicationName} (${rx.dosage || ""})`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    // 4. Dispatch notification to prescriber if known
    if (rx.doctorId) {
      await dispatchNotification({
        category: "orders",
        type: "prescription_refill_request",
        title: `💊 Refill Request: ${rx.medicationName} (${patientName})`,
        body: `Patient ${patientName} (${patientMrn}) has requested a 90-day refill for ${rx.medicationName} ${rx.dosage || ""}. Please review and authorize.`,
        priority: "normal",
        recipientUserId: rx.doctorId,
        actionUrl: `/patients/${rx.patientId}?tab=medications&prescriptionId=${rx.id}`,
        actionText: `Authorize Refill (${rx.medicationName})`,
        relatedEntityType: "prescriptions",
        relatedEntityId: rx.id,
        metadata: {
          prescriptionId: rx.id,
          patientId: rx.patientId,
          medicationName: rx.medicationName,
          dosage: rx.dosage,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Refill request submitted to clinical care team",
      data: {
        prescriptionId: rx.id,
        status: "refill_requested",
      },
    });
  } catch (error: any) {
    console.error("Error submitting refill request:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to submit refill request" },
      { status: 500 }
    );
  }
}
