import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { invoices, auditLogs } from "@/db/schema";
import { createInvoiceSchema } from "@/lib/validations/schemas";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

// GET /api/v1/invoices
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId");
    const status = searchParams.get("status");

    if (patientId) {
      const data = await db
        .select()
        .from(invoices)
        .where(eq(invoices.patientId, patientId))
        .orderBy(desc(invoices.createdAt));
      return NextResponse.json({ success: true, data });
    }

    if (status) {
      const data = await db
        .select()
        .from(invoices)
        .where(eq(invoices.status, status as any))
        .orderBy(desc(invoices.createdAt));
      return NextResponse.json({ success: true, data });
    }

    const data = await db
      .select()
      .from(invoices)
      .orderBy(desc(invoices.createdAt))
      .limit(100);

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}

// POST /api/v1/invoices
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = createInvoiceSchema.parse(body);

    const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

    const [newInvoice] = await db
      .insert(invoices)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        patientId: validated.patientId,
        encounterId: validated.encounterId,
        invoiceNumber,
        lineItems: validated.lineItems,
        subtotal: validated.subtotal.toString(),
        discountAmount: validated.discountAmount.toString(),
        taxAmount: validated.taxAmount.toString(),
        totalAmount: validated.totalAmount.toString(),
        paidAmount: "0.00",
        currency: validated.currency || "ETB",
        status: "issued",
        dueDate: validated.dueDate,
      })
      .returning();

    await db.insert(auditLogs).values({
      tenantId: DEFAULT_TENANT_ID,
      action: "INVOICE_GENERATED",
      entityType: "invoices",
      entityId: newInvoice.id,
      summary: `Generated invoice ${invoiceNumber} for ${newInvoice.totalAmount} ${newInvoice.currency} (Patient: ${newInvoice.patientId})`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json(
      { success: true, data: newInvoice, message: "Invoice generated successfully" },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: error.errors },
        { status: 422 }
      );
    }
    console.error("Error creating invoice:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create invoice" },
      { status: 500 }
    );
  }
}
