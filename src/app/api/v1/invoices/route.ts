import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { invoices, auditLogs } from "@/db/schema";
import { createInvoiceSchema } from "@/lib/validations/schemas";
import { and, eq, desc } from "drizzle-orm";
import { z } from "zod";
import { insertReturning } from "@/lib/db/returning";
import { requireAuthenticatedUser, requireRoles, resolveAuthorizedPatient, CLINICIAN_ROLES } from "@/lib/security/auth-session";


// GET /api/v1/invoices
export async function GET(req: NextRequest) {
  const auth = await requireAuthenticatedUser(req);
  if ("response" in auth) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    let patientId = searchParams.get("patientId");

    // Patients only ever see their own invoices.
    if (auth.user.role === "patient") {
      const access = await resolveAuthorizedPatient(req, patientId);
      if ("response" in access) return access.response;
      patientId = access.patient.id;
    }
    const inTenant = eq(invoices.tenantId, auth.user.organizationId);
    const status = searchParams.get("status");

    if (patientId) {
      const data = await db
        .select()
        .from(invoices)
        .where(and(eq(invoices.patientId, patientId), inTenant))
        .orderBy(desc(invoices.createdAt));
      return NextResponse.json({ success: true, data });
    }

    if (status) {
      const data = await db
        .select()
        .from(invoices)
        .where(and(eq(invoices.status, status as any), inTenant))
        .orderBy(desc(invoices.createdAt));
      return NextResponse.json({ success: true, data });
    }

    const data = await db
      .select()
      .from(invoices)
      .where(inTenant)
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
  const auth = await requireRoles(req, CLINICIAN_ROLES);
  if ("response" in auth) return auth.response;

  try {
    const body = await req.json();
    const validated = createInvoiceSchema.parse(body);

    const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

    const [newInvoice] = await insertReturning(db, invoices, {
        tenantId: auth.user.organizationId,
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
      });

    await db.insert(auditLogs).values({
      tenantId: auth.user.organizationId,
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
