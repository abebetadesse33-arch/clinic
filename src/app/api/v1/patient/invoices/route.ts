import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { invoices, invoiceItems } from "@/db/schema";
import { desc, eq, inArray } from "drizzle-orm";
import { resolveAuthorizedPatient } from "@/lib/security/auth-session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const explicitPatientId = searchParams.get("patientId") || searchParams.get("id");

  try {
    const auth = await resolveAuthorizedPatient(req, explicitPatientId);
    if ("response" in auth) {
      return auth.response;
    }

    const pat = auth.patient;
    if (!pat) {
      return NextResponse.json({ success: true, data: [] });
    }


    const patientInvoices = await db
      .select()
      .from(invoices)
      .where(eq(invoices.patientId, pat.id))
      .orderBy(desc(invoices.createdAt));

    if (patientInvoices.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const invoiceIds = patientInvoices.map((inv) => inv.id);
    const items = await db
      .select()
      .from(invoiceItems)
      .where(inArray(invoiceItems.invoiceId, invoiceIds));

    const itemsByInvoice = new Map<string, any[]>();
    for (const item of items) {
      const existing = itemsByInvoice.get(item.invoiceId) || [];
      existing.push(item);
      itemsByInvoice.set(item.invoiceId, existing);
    }

    const enriched = patientInvoices.map((inv) => ({
      ...inv,
      items: itemsByInvoice.get(inv.id) || [],
    }));

    return NextResponse.json({
      success: true,
      data: enriched,
    });
  } catch (error: any) {
    console.error("Error fetching patient invoices:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}
