import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  invoices, payments, prescriptions, labOrders,
  pharmacyDispensingQueue, pharmacyNotifications,
  posTransactions, posCashierShifts,
} from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

const TENANT_ID = "00000000-0000-0000-0000-000000000001";

function generateReceiptNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `RCP-${ts}-${rand}`;
}

function generatePaymentNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  return `PAY-${ts}`;
}

function generateInvoiceNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  return `INV-POS-${ts}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      patientId,
      cashierId,
      shiftId,
      cartItems,         // Array of { sourceType, sourceId, description, category, unitPrice, quantity, discount }
      paymentMethod,     // 'cash' | 'telebirr' | 'chapa' | 'card' | 'cbe_birr' | 'insurance' | 'split'
      paymentBreakdown,  // { cash: 0, telebirr: 0, ... }
      cashTendered,
      discountAmount,
      taxRate,           // percent e.g. 15
      transactionRef,
      notes,
    } = body;

    if (!patientId || !cashierId || !cartItems || cartItems.length === 0) {
      return NextResponse.json({ error: "patientId, cashierId, and cartItems required" }, { status: 400 });
    }

    // ─── Calculate totals ───────────────────────────────────────────────────────
    const subtotal = cartItems.reduce(
      (sum: number, item: { unitPrice: number; quantity: number; discount: number }) =>
        sum + item.unitPrice * item.quantity * (1 - (item.discount ?? 0) / 100),
      0
    );
    const discount = parseFloat(discountAmount ?? "0");
    const taxAmount = ((subtotal - discount) * (parseFloat(taxRate ?? "0") / 100));
    const totalAmount = subtotal - discount + taxAmount;
    const changeReturned = cashTendered ? Math.max(0, parseFloat(cashTendered) - totalAmount) : 0;

    // ─── Create or update Invoice ───────────────────────────────────────────────
    const invoiceNumber = generateInvoiceNumber();
    const [invoice] = await db.insert(invoices).values({
      tenantId: TENANT_ID,
      patientId,
      invoiceNumber,
      lineItems: cartItems,
      subtotal: subtotal.toFixed(2),
      discountAmount: discount.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
      paidAmount: totalAmount.toFixed(2),
      currency: "ETB",
      status: "paid",
      paymentMethod,
      transactionRef: transactionRef ?? null,
      paidAt: new Date(),
    }).returning();

    // ─── Record Payment ─────────────────────────────────────────────────────────
    const paymentNumber = generatePaymentNumber();
    const mappedPaymentMethod = (paymentMethod === "insurance" ? "insurance_copay" : paymentMethod === "card" ? "bank_transfer" : paymentMethod) as any;
    await db.insert(payments).values({
      tenantId: TENANT_ID,
      invoiceId: invoice.id,
      patientId,
      paymentNumber,
      amount: totalAmount.toFixed(2),
      currency: "ETB",
      paymentMethod: mappedPaymentMethod,
      transactionReference: transactionRef ?? null,
      receiptNumber: generateReceiptNumber(),
      status: "completed",
      collectedBy: cashierId,
      paidAt: new Date(),
    });

    // ─── Clear source items (prescription / lab order) ──────────────────────────
    const rxIds = cartItems
      .filter((i: { sourceType: string }) => i.sourceType === "prescription")
      .map((i: { sourceId: string }) => i.sourceId);

    const labIds = cartItems
      .filter((i: { sourceType: string }) => i.sourceType === "lab_order")
      .map((i: { sourceId: string }) => i.sourceId);

    for (const rxId of rxIds) {
      await db.update(prescriptions)
        .set({
          paymentStatus: "paid",
          status: "payment_cleared",
          invoiceId: invoice.id,
          transactionRef: transactionRef ?? null,
          paidAt: new Date(),
        })
        .where(eq(prescriptions.id, rxId));

      // Advance pharmacy dispensing queue to payment_verified
      await db.update(pharmacyDispensingQueue)
        .set({ status: "payment_verified", paymentVerifiedAt: new Date() })
        .where(and(
          eq(pharmacyDispensingQueue.prescriptionId, rxId),
          eq(pharmacyDispensingQueue.status, "awaiting_payment")
        ));
    }

    for (const labId of labIds) {
      await db.update(labOrders)
        .set({
          paymentStatus: "paid",
          invoiceId: invoice.id,
          transactionRef: transactionRef ?? null,
          paidAt: new Date(),
        })
        .where(eq(labOrders.id, labId));
    }

    // ─── Update Shift Totals ────────────────────────────────────────────────────
    if (shiftId) {
      const cashPaid = parseFloat(paymentBreakdown?.cash ?? "0");
      const telebirrPaid = parseFloat(paymentBreakdown?.telebirr ?? "0");
      const cardPaid = parseFloat(paymentBreakdown?.card ?? "0");
      const insurancePaid = parseFloat(paymentBreakdown?.insurance ?? "0");

      await db.execute(sql`
        UPDATE pos_cashier_shifts SET
          total_cash_sales      = total_cash_sales + ${cashPaid},
          total_telebirr_sales  = total_telebirr_sales + ${telebirrPaid},
          total_card_sales      = total_card_sales + ${cardPaid},
          total_insurance_sales = total_insurance_sales + ${insurancePaid},
          expected_cash         = expected_cash + ${cashPaid},
          total_transactions    = total_transactions + 1
        WHERE id = ${shiftId}
      `);
    }

    // ─── Log POS Transaction ────────────────────────────────────────────────────
    const receiptNumber = generateReceiptNumber();
    const qrPayload = JSON.stringify({
      receipt: receiptNumber,
      patient: patientId,
      amount: totalAmount.toFixed(2),
      date: new Date().toISOString(),
    });

    const [posTx] = await db.insert(posTransactions).values({
      tenantId: TENANT_ID,
      shiftId: shiftId ?? null,
      invoiceId: invoice.id,
      patientId,
      cashierId,
      receiptNumber,
      subtotal: subtotal.toFixed(2),
      discountAmount: discount.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
      paymentMethod,
      paymentBreakdown: paymentBreakdown ?? {},
      itemsSnapshot: cartItems,
      cashTendered: cashTendered ? parseFloat(cashTendered).toFixed(2) : null,
      changeReturned: changeReturned.toFixed(2),
      transactionRef: transactionRef ?? null,
      qrCodePayload: qrPayload,
    }).returning();

    return NextResponse.json({
      success: true,
      data: {
        transactionId: posTx.id,
        receiptNumber,
        invoiceNumber,
        totalAmount: totalAmount.toFixed(2),
        changeReturned: changeReturned.toFixed(2),
        qrPayload,
        prescriptionsCleared: rxIds.length,
        labOrdersCleared: labIds.length,
        pharmacyQueueAdvanced: rxIds.length,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[POS Checkout Error]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
