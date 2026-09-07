import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  prescriptions,
  medications,
  drugBatches,
  stockMovements,
  auditLogs,
} from "@/db/schema";
import { eq } from "drizzle-orm";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

// GET /api/v1/prescriptions/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rxRes = await db
      .select()
      .from(prescriptions)
      .where(eq(prescriptions.id, params.id))
      .limit(1);

    if (!rxRes || rxRes.length === 0) {
      return NextResponse.json(
        { success: false, error: "Prescription not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: rxRes[0] });
  } catch (error: any) {
    console.error("Error fetching prescription:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch prescription" },
      { status: 500 }
    );
  }
}

// PATCH /api/v1/prescriptions/[id] - Pharmacist Dispense / Status Update
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { action, pharmacistId, batchId, notes } = body;
    const rxId = params.id;

    const rxList = await db
      .select()
      .from(prescriptions)
      .where(eq(prescriptions.id, rxId))
      .limit(1);

    if (!rxList || rxList.length === 0) {
      return NextResponse.json(
        { success: false, error: "Prescription not found" },
        { status: 404 }
      );
    }

    const rx = rxList[0];

    if (action === "dispense") {
      // 1. Update prescription status
      const [updatedRx] = await db
        .update(prescriptions)
        .set({
          status: "dispensed",
          dispensedAt: new Date(),
          pharmacistId: pharmacistId || "11111111-1111-1111-1111-111111111104",
        })
        .where(eq(prescriptions.id, rxId))
        .returning();

      // 2. Add or update active patient medication list
      await db.insert(medications).values({
        tenantId: DEFAULT_TENANT_ID,
        patientId: rx.patientId,
        name: rx.medicationName,
        dosage: rx.dosage,
        frequency: rx.frequency,
        route: rx.route || "Oral",
        indication: rx.indication || "Prescribed treatment",
        prescribedBy: rx.doctorId,
        isActive: true,
        pharmacistVerified: true,
      });

      // 3. Deduct stock from drug batch if specified
      if (batchId) {
        const batchRes = await db
          .select()
          .from(drugBatches)
          .where(eq(drugBatches.id, batchId))
          .limit(1);

        if (batchRes && batchRes.length > 0) {
          const batch = batchRes[0];
          const deductQty = rx.dispenseQuantity || 1;
          const newQty = Math.max(0, batch.quantityRemaining - deductQty);

          await db
            .update(drugBatches)
            .set({
              quantityRemaining: newQty,
              status: newQty === 0 ? "depleted" : batch.status,
              updatedAt: new Date(),
            })
            .where(eq(drugBatches.id, batchId));

          await db.insert(stockMovements).values({
            tenantId: DEFAULT_TENANT_ID,
            batchId,
            movementType: "dispense",
            quantity: -deductQty,
            previousQuantity: batch.quantityRemaining,
            newQuantity: newQty,
            referenceType: "prescription",
            referenceId: rx.id,
            performedBy: pharmacistId || "11111111-1111-1111-1111-111111111104",
            notes: notes || `Dispensed for prescription ${rx.medicationName} (${rx.id})`,
          });
        }
      }

      // 4. Audit Log
      await db.insert(auditLogs).values({
        tenantId: DEFAULT_TENANT_ID,
        userId: pharmacistId || "11111111-1111-1111-1111-111111111104",
        action: "MEDICATION_DISPENSED",
        entityType: "prescriptions",
        entityId: rx.id,
        summary: `Pharmacist dispensed ${rx.medicationName} ${rx.dosage} (Qty: ${rx.dispenseQuantity}) to patient ${rx.patientId}`,
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      });

      return NextResponse.json({
        success: true,
        data: updatedRx,
        message: "Medication successfully verified and dispensed from inventory",
      });
    }

    if (action === "cancel") {
      const [cancelledRx] = await db
        .update(prescriptions)
        .set({ status: "cancelled" })
        .where(eq(prescriptions.id, rxId))
        .returning();

      return NextResponse.json({
        success: true,
        data: cancelledRx,
        message: "Prescription cancelled",
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Error updating prescription:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update prescription" },
      { status: 500 }
    );
  }
}
