import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  invoices, invoiceItems, patients, encounters, labOrders, prescriptions,
  payments, journalEntries, journalEntryLines, chartOfAccounts,
} from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET /api/v1/finance/pos?patientId= — aggregate all billable items
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const patientId = searchParams.get("patientId");

    if (!patientId) {
      return NextResponse.json({ success: false, error: "patientId is required." }, { status: 400 });
    }

    // Fetch unbilled lab orders
    const unfilledLabs = await db
      .select({
        id: labOrders.id,
        testName: labOrders.testName,
        price: labOrders.price,
        currency: labOrders.currency,
        status: labOrders.status,
        paymentStatus: labOrders.paymentStatus,
        orderedAt: labOrders.orderedAt,
      })
      .from(labOrders)
      .where(and(eq(labOrders.patientId, patientId), eq(labOrders.paymentStatus, "unpaid")));

    // Fetch unpaid prescriptions
    const unfilledRx = await db
      .select({
        id: prescriptions.id,
        medicationName: prescriptions.medicationName,
        status: prescriptions.status,
        createdAt: prescriptions.createdAt,
      })
      .from(prescriptions)
      .where(and(eq(prescriptions.patientId, patientId), eq(prescriptions.paymentStatus, "unpaid")));

    // Fetch existing open invoices
    const openInvoices = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.patientId, patientId), eq(invoices.status, "draft")));

    return NextResponse.json({
      success: true,
      data: {
        unbilledLabs: unfilledLabs,
        unbilledPrescriptions: unfilledRx,
        openInvoices,
      },
    });
  } catch (error: any) {
    console.error("[FINANCE POS GET]", error);
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}

// POST /api/v1/finance/pos — process POS payment with split payment support
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      patientId, tenantId, invoiceId, lineItems, paymentBreakdown,
      processedBy, notes,
    } = body;

    // paymentBreakdown: { cash: 500, telebirr: 1200, cbe_birr: 0, insurance: 3000, card: 0 }
    if (!patientId || !tenantId || !lineItems || !paymentBreakdown) {
      return NextResponse.json({ success: false, error: "Missing required fields." }, { status: 400 });
    }

    const totalAmount = lineItems.reduce((sum: number, item: any) => sum + parseFloat(item.amount || 0), 0);
    const totalPaid = Object.values(paymentBreakdown as Record<string, number>).reduce(
      (sum: number, v: number) => sum + Number(v),
      0
    );

    if (totalPaid < totalAmount) {
      return NextResponse.json({
        success: false,
        error: `Underpayment: Required ${totalAmount.toFixed(2)} ETB, received ${totalPaid.toFixed(2)} ETB.`,
      }, { status: 400 });
    }

    // Create or update invoice
    const [inv] = invoiceId
      ? await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1)
      : await db
          .insert(invoices)
          .values({
            patientId,
            tenantId,
            invoiceNumber: `INV-POS-${Date.now()}`,
            lineItems: lineItems || [],
            subtotal: totalAmount.toFixed(2),
            discountAmount: "0",
            taxAmount: "0",
            totalAmount: totalAmount.toFixed(2),
            paidAmount: totalPaid.toFixed(2),
            status: "paid",
            currency: "ETB",
            dueDate: new Date().toISOString().split("T")[0],
          })
          .returning();

    // Record payment — use correct payments schema columns
    const payMethod: "cash" | "telebirr" | "chapa" | "bank_transfer" | "insurance_copay" | "paypal" =
      paymentBreakdown.cash > 0 ? "cash" :
      paymentBreakdown.telebirr > 0 ? "telebirr" :
      paymentBreakdown.cbe_birr > 0 ? "bank_transfer" : "cash";

    const [pmt] = await db
      .insert(payments)
      .values({
        invoiceId: inv.id,
        patientId,
        tenantId,
        paymentNumber: `PMT-${Date.now()}`,
        amount: totalPaid.toFixed(2),
        currency: "ETB",
        paymentMethod: payMethod,
        transactionReference: JSON.stringify(paymentBreakdown),
        status: "completed",
        collectedBy: processedBy || null,
      })
      .returning();

    // Auto-generate double-entry journal entry
    const entryNumber = `JE-POS-${Date.now()}`;
    // Look up cash account (code 1100) and consultation revenue (code 4100)
    const cashAccount = await db
      .select()
      .from(chartOfAccounts)
      .where(eq(chartOfAccounts.accountCode, "1100"))
      .limit(1);

    const revenueAccount = await db
      .select()
      .from(chartOfAccounts)
      .where(eq(chartOfAccounts.accountCode, "4100"))
      .limit(1);

    if (cashAccount.length > 0 && revenueAccount.length > 0) {
      const [je] = await db
        .insert(journalEntries)
        .values({
          tenantId,
          entryNumber,
          entryDate: new Date().toISOString().split("T")[0],
          description: `POS Payment – Invoice #${inv.id?.slice(0, 8)}`,
          referenceType: "pos_billing",
          referenceId: inv.id,
          totalDebit: totalPaid.toFixed(2),
          totalCredit: totalPaid.toFixed(2),
          status: "posted",
          postedBy: processedBy || null,
          postedAt: new Date(),
        })
        .returning();

      await db.insert(journalEntryLines).values([
        {
          journalEntryId: je.id,
          accountId: cashAccount[0].id,
          debit: totalPaid.toFixed(2),
          credit: "0.00",
          memo: "Cash/Mobile receipt from patient POS payment",
          lineOrder: 1,
        },
        {
          journalEntryId: je.id,
          accountId: revenueAccount[0].id,
          debit: "0.00",
          credit: totalPaid.toFixed(2),
          memo: "Clinical services revenue recognized",
          lineOrder: 2,
        },
      ]);

      // Update account balances
      await db
        .update(chartOfAccounts)
        .set({ currentBalance: String(parseFloat(cashAccount[0].currentBalance || "0") + totalPaid) })
        .where(eq(chartOfAccounts.id, cashAccount[0].id));

      await db
        .update(chartOfAccounts)
        .set({ currentBalance: String(parseFloat(revenueAccount[0].currentBalance || "0") + totalPaid) })
        .where(eq(chartOfAccounts.id, revenueAccount[0].id));
    }

    return NextResponse.json({
      success: true,
      data: { invoice: inv, payment: pmt, entryNumber },
      message: `Payment of ${totalPaid.toFixed(2)} ETB processed and recorded.`,
    });
  } catch (error: any) {
    console.error("[FINANCE POS POST]", error);
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}
