import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { vendorInvoices, invoices, payments } from "@/db/schema";
import { eq, desc, and, lt, gte } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET /api/v1/finance/ar-ap?tenantId=&view=ar|ap|aging
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const tenantId = searchParams.get("tenantId");
    const view = searchParams.get("view") || "ap";

    if (!tenantId) {
      return NextResponse.json({ success: false, error: "tenantId is required." }, { status: 400 });
    }

    if (view === "ap") {
      // Accounts Payable — vendor invoices
      const apRecords = await db
        .select()
        .from(vendorInvoices)
        .where(eq(vendorInvoices.tenantId, tenantId))
        .orderBy(desc(vendorInvoices.createdAt));

      const totalUnpaid = apRecords
        .filter((v) => v.paymentStatus === "unpaid" || v.paymentStatus === "partial")
        .reduce((s, v) => s + parseFloat(v.totalAmountEtb || "0"), 0);

      const totalOverdue = apRecords
        .filter((v) => v.paymentStatus === "overdue")
        .reduce((s, v) => s + parseFloat(v.totalAmountEtb || "0"), 0);

      return NextResponse.json({
        success: true,
        data: { vendors: apRecords, summary: { totalUnpaid, totalOverdue } },
      });
    }

    if (view === "aging") {
      // Aging Accounts Receivable buckets
      const now = new Date();
      const allInvoices = await db
        .select()
        .from(invoices)
        .where(and(eq(invoices.tenantId, tenantId)))
        .orderBy(desc(invoices.createdAt));

      const unpaidInvoices = allInvoices.filter((inv) => inv.status !== "paid" && inv.status !== "cancelled");

      const buckets = {
        current: [] as typeof unpaidInvoices,
        "31_60": [] as typeof unpaidInvoices,
        "61_90": [] as typeof unpaidInvoices,
        over_90: [] as typeof unpaidInvoices,
      };

      for (const inv of unpaidInvoices) {
        const due = new Date(inv.dueDate || inv.createdAt || now);
        const daysPast = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
        if (daysPast <= 30) buckets.current.push(inv);
        else if (daysPast <= 60) buckets["31_60"].push(inv);
        else if (daysPast <= 90) buckets["61_90"].push(inv);
        else buckets.over_90.push(inv);
      }

      const sumBucket = (b: typeof unpaidInvoices) =>
        b.reduce((s, inv) => s + parseFloat(inv.totalAmount?.toString() || "0"), 0);

      return NextResponse.json({
        success: true,
        data: {
          buckets,
          summary: {
            current: { count: buckets.current.length, total: sumBucket(buckets.current) },
            "31_60": { count: buckets["31_60"].length, total: sumBucket(buckets["31_60"]) },
            "61_90": { count: buckets["61_90"].length, total: sumBucket(buckets["61_90"]) },
            over_90: { count: buckets.over_90.length, total: sumBucket(buckets.over_90) },
          },
        },
      });
    }

    return NextResponse.json({ success: false, error: "Invalid view. Use: ar, ap, aging" }, { status: 400 });
  } catch (error: any) {
    console.error("[FINANCE AR-AP GET]", error);
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}

// POST /api/v1/finance/ar-ap — create vendor invoice or process payout
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "create_vendor_invoice") {
      const {
        tenantId, vendorName, vendorContact, invoiceNumber, poReference,
        description, category, amountEtb, vatAmountEtb, dueDate, documentUrl, createdBy,
      } = body;

      if (!tenantId || !vendorName || !invoiceNumber || !description || !amountEtb || !dueDate || !createdBy) {
        return NextResponse.json({ success: false, error: "Missing required fields for vendor invoice." }, { status: 400 });
      }

      const amount = parseFloat(amountEtb);
      const vat = parseFloat(vatAmountEtb || "0");
      const total = amount + vat;

      const [inv] = await db
        .insert(vendorInvoices)
        .values({
          tenantId, vendorName, vendorContact: vendorContact || null,
          invoiceNumber, poReference: poReference || null,
          description, category: category || "other",
          amountEtb: amount.toFixed(2),
          vatAmountEtb: vat.toFixed(2),
          totalAmountEtb: total.toFixed(2),
          dueDate, documentUrl: documentUrl || null,
          paymentStatus: "unpaid",
          createdBy,
        })
        .returning();

      return NextResponse.json({ success: true, data: inv }, { status: 201 });
    }

    if (action === "pay_vendor") {
      const { vendorInvoiceId, paidAmountEtb, paymentMethod, paymentReference, approvedBy } = body;

      const [inv] = await db
        .select()
        .from(vendorInvoices)
        .where(eq(vendorInvoices.id, vendorInvoiceId))
        .limit(1);

      if (!inv) {
        return NextResponse.json({ success: false, error: "Vendor invoice not found." }, { status: 404 });
      }

      const paid = parseFloat(paidAmountEtb);
      const total = parseFloat(inv.totalAmountEtb || "0");
      const alreadyPaid = parseFloat(inv.paidAmountEtb || "0");
      const newPaid = alreadyPaid + paid;
      const newStatus = newPaid >= total ? "paid" : "partial";

      const [updated] = await db
        .update(vendorInvoices)
        .set({
          paidAmountEtb: newPaid.toFixed(2),
          paymentStatus: newStatus as "paid" | "partial",
          paymentMethod: paymentMethod || "bank_transfer",
          paymentReference: paymentReference || null,
          paidAt: newPaid >= total ? new Date() : null,
          approvedBy: approvedBy || null,
          approvedAt: approvedBy ? new Date() : null,
          threeWayMatchStatus: "matched",
          updatedAt: new Date(),
        })
        .where(eq(vendorInvoices.id, vendorInvoiceId))
        .returning();

      return NextResponse.json({ success: true, data: updated, message: `Paid ${paid.toFixed(2)} ETB to ${inv.vendorName}.` });
    }

    return NextResponse.json({ success: false, error: "Invalid action. Use: create_vendor_invoice or pay_vendor." }, { status: 400 });
  } catch (error: any) {
    console.error("[FINANCE AR-AP POST]", error);
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}
