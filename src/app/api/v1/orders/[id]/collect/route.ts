import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clinicalOrders, patients, auditLogs } from "@/db/schema";
import { getAuthenticatedSessionUserId } from "@/lib/security/auth-session";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { createTamperEvidentAuditLog } from "@/lib/security/tenant-guard";

const ppidCollectionSchema = z.object({
  scannedWristbandMrn: z.string().min(2, "Scanned patient MRN barcode required"),
  scannedTubeBarcode: z.string().min(3, "Scanned specimen tube barcode required"),
  specimenCondition: z.enum(["adequate", "hemolyzed", "clotted", "insufficient_volume"]).default("adequate"),
  rejectionReason: z.string().optional(),
});

// POST /api/v1/orders/[id]/collect - Positive Patient Identification (PPID) & Specimen Collection
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sessionUserId = await getAuthenticatedSessionUserId(req);
    if (!sessionUserId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validated = ppidCollectionSchema.parse(body);

    return await db.transaction(async (tx) => {
      // 1. Join Order to Patient to verify Scanned MRN matches the true registered patient
      const [orderWithPatient] = await tx
        .select({
          orderId: clinicalOrders.id,
          orderStatus: clinicalOrders.status,
          tenantId: clinicalOrders.tenantId,
          patientId: clinicalOrders.patientId,
          patientMrn: patients.mrn,
          patientFirstName: patients.firstName,
          patientLastName: patients.lastName,
        })
        .from(clinicalOrders)
        .innerJoin(patients, eq(clinicalOrders.patientId, patients.id))
        .where(eq(clinicalOrders.id, params.id))
        .limit(1);

      if (!orderWithPatient) {
        return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
      }

      // 2. POSITIVE PATIENT IDENTIFICATION CHECK (PPID)
      if (orderWithPatient.patientMrn.trim().toLowerCase() !== validated.scannedWristbandMrn.trim().toLowerCase()) {
        // Critical Patient Safety Alarm
        await createTamperEvidentAuditLog({
          tenantId: orderWithPatient.tenantId,
          userId: sessionUserId,
          action: "PPID_MISMATCH_DETECTED",
          entityType: "clinical_orders",
          entityId: orderWithPatient.orderId,
          payload: {
            scannedMrn: validated.scannedWristbandMrn,
            expectedMrn: orderWithPatient.patientMrn,
            phlebotomistUserId: sessionUserId,
          },
          summary: `CRITICAL SAFETY ALARM: Scanned wristband '${validated.scannedWristbandMrn}' does NOT match patient record '${orderWithPatient.patientMrn}' (${orderWithPatient.patientFirstName} ${orderWithPatient.patientLastName})`,
          ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
          tx,
        });

        return NextResponse.json(
          {
            success: false,
            error: "CRITICAL PATIENT SAFETY ALARM: Scanned wristband MRN does not match the patient assigned to this clinical order!",
            code: "PPID_MISMATCH",
          },
          { status: 409 }
        );
      }

      // 3. SPECIMEN INTEGRITY VALIDATION & REJECTION WORKFLOW
      if (validated.specimenCondition !== "adequate") {
        const rejectionNote = validated.rejectionReason || `Specimen rejected due to condition: ${validated.specimenCondition}`;

        await tx
          .update(clinicalOrders)
          .set({
            status: "cancelled",
            cancellationReason: rejectionNote,
            cancelledBy: sessionUserId,
            cancelledAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(clinicalOrders.id, params.id));

        await createTamperEvidentAuditLog({
          tenantId: orderWithPatient.tenantId,
          userId: sessionUserId,
          action: "SPECIMEN_COLLECTION_REJECTED",
          entityType: "clinical_orders",
          entityId: orderWithPatient.orderId,
          summary: `Specimen rejected (${validated.specimenCondition}). Reason: ${rejectionNote}`,
          tx,
        });

        return NextResponse.json(
          {
            success: false,
            error: `Specimen rejected: ${validated.specimenCondition}. Order has been cancelled. Please initiate a recollection order.`,
            recollectionRequired: true,
          },
          { status: 422 }
        );
      }

      // 4. TRANSITION TO SPECIMEN_RECEIVED
      const [updated] = await tx
        .update(clinicalOrders)
        .set({
          status: "specimen_received",
          specimenBarcode: validated.scannedTubeBarcode,
          collectedBy: sessionUserId,
          collectedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(clinicalOrders.id, params.id))
        .returning();

      await createTamperEvidentAuditLog({
        tenantId: orderWithPatient.tenantId,
        userId: sessionUserId,
        action: "SPECIMEN_COLLECTED_PPID_VERIFIED",
        entityType: "clinical_orders",
        entityId: orderWithPatient.orderId,
        payload: {
          scannedTubeBarcode: validated.scannedTubeBarcode,
          collectedBy: sessionUserId,
        },
        summary: `Positive Patient Identification verified. Specimen collected with tube barcode ${validated.scannedTubeBarcode}`,
        tx,
      });

      return NextResponse.json({
        success: true,
        data: updated,
        message: "Positive patient identification verified. Specimen accepted for processing.",
      });
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: "Validation failed", details: error.errors }, { status: 422 });
    }
    console.error("[PPID:POST] Error during specimen collection:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Specimen collection processing failed" },
      { status: 500 }
    );
  }
}
