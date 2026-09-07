import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { invoices, invoiceItems, patientRegistrationPasses, auditLogs, patients } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// POST /api/v1/checkout/process-payment
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      invoiceId,
      paymentMethod = "telebirr",
      phoneNumber,
      accountNumber,
      transactionRef: clientRef,
    } = body;

    if (!invoiceId) {
      return NextResponse.json(
        { success: false, error: "invoiceId is required to process payment." },
        { status: 400 }
      );
    }

    // 1. Fetch Invoice & Line Items
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, invoiceId))
      .limit(1);

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: "Invoice record not found." },
        { status: 404 }
      );
    }

    const items = await db
      .select()
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, invoice.id));

    // 2. Generate Transaction Reference
    const transactionRef =
      clientRef ||
      `TXN-${paymentMethod.toUpperCase()}-${new Date().getFullYear()}${Math.floor(100000 + Math.random() * 900000)}`;

    const paidAt = new Date();

    // 3. Update Invoice Status to Paid
    const [updatedInvoice] = await db
      .update(invoices)
      .set({
        status: "paid",
        paymentMethod,
        transactionRef,
        paidAt,
      })
      .where(eq(invoices.id, invoice.id))
      .returning();

    // 4. Check for 3-Month Registration & Activate Membership
    const hasRegistration = items.some(
      (item) => item.serviceCode === "REGISTRATION_3MO" || item.serviceCode.includes("REGISTRATION")
    );

    let registrationRecord: any = null;
    if (hasRegistration) {
      const startsAt = new Date();
      const expiresAt = new Date(startsAt.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days

      const [newReg] = await db
        .insert(patientRegistrationPasses)
        .values({
          patientId: invoice.patientId,
          invoiceId: invoice.id,
          startsAt,
          expiresAt,
          status: "active",
        })
        .returning();

      registrationRecord = newReg;
    }

    // 5. Fetch Patient Info for Digital Receipt
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.id, invoice.patientId))
      .limit(1);

    // 6. Record Audit Log
    try {
      await db.insert(auditLogs).values({
        tenantId: invoice.tenantId,
        action: "PAYMENT_CLEARED",
        entityType: "invoices",
        entityId: invoice.id,
        summary: `Payment of ${invoice.totalAmount} ${invoice.currency} cleared for ${patient?.firstName || "Patient"} ${patient?.lastName || ""} via ${paymentMethod.toUpperCase()} (Ref: ${transactionRef}).`,
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      });
    } catch {}

    // 7. Assemble Receipt Payload
    const receipt = {
      receiptNumber: `REC-${invoice.invoiceNumber.replace("INV-", "")}`,
      invoiceNumber: invoice.invoiceNumber,
      transactionRef,
      paymentMethod: paymentMethod.toUpperCase(),
      patientName: patient ? `${patient.firstName} ${patient.lastName}` : "Valued Member",
      patientMrn: patient?.mrn || "MRN-PENDING",
      totalAmount: invoice.totalAmount,
      currency: invoice.currency,
      subtotal: invoice.subtotal,
      discountAmount: invoice.discountAmount,
      paidAt: paidAt.toISOString(),
      items: items.map((i) => ({
        serviceCode: i.serviceCode,
        description: i.description,
        unitPrice: i.unitPrice,
        quantity: i.quantity,
        totalPrice: i.totalPrice,
      })),
      registration: registrationRecord
        ? {
            status: "active",
            validUntil: registrationRecord.expiresAt.toISOString(),
            validityDays: 90,
          }
        : null,
    };

    return NextResponse.json({
      success: true,
      data: {
        invoice: updatedInvoice,
        receipt,
        registration: registrationRecord,
      },
      message: `Payment of ${invoice.totalAmount} ${invoice.currency} confirmed successfully!`,
    });
  } catch (error: any) {
    console.error("Error processing payment:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to complete payment transaction" },
      { status: 500 }
    );
  }
}
