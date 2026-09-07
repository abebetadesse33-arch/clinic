import { db } from "@/db";
import { clinicalOrders, invoices, invoiceItems, auditLogs } from "@/db/schema";
import { eq, and } from "drizzle-orm";

const DEFAULT_ORDER_PRICING: Record<string, { fee: string; currency: string }> = {
  laboratory: { fee: "450.00", currency: "ETB" },
  pharmacy: { fee: "280.00", currency: "ETB" },
  imaging: { fee: "1250.00", currency: "ETB" },
  procedure: { fee: "850.00", currency: "ETB" },
};

/**
 * Captures billable charges for a completed clinical order and syncs them to the encounter invoice.
 */
export async function captureOrderCharge(params: {
  orderId: string;
  performerUserId: string;
  tx?: any;
}): Promise<{ billed: boolean; invoiceItemId?: string; amount?: string }> {
  const database = params.tx || db;

  const [order] = await database
    .select()
    .from(clinicalOrders)
    .where(eq(clinicalOrders.id, params.orderId))
    .limit(1);

  if (!order) {
    throw new Error(`Order ${params.orderId} not found for charge capture`);
  }

  const pricing = DEFAULT_ORDER_PRICING[order.orderType] || { fee: "350.00", currency: "ETB" };

  // Locate or create draft invoice for the patient
  let [invoice] = await database
    .select()
    .from(invoices)
    .where(and(eq(invoices.patientId, order.patientId), eq(invoices.status, "draft")))
    .limit(1);

  if (!invoice) {
    const [newInvoice] = await database
      .insert(invoices)
      .values({
        organizationId: order.tenantId,
        patientId: order.patientId,
        invoiceNumber: `INV-${Date.now().toString(36).toUpperCase()}`,
        status: "draft",
        totalAmount: pricing.fee,
        currency: pricing.currency,
      })
      .returning();
    invoice = newInvoice;
  }

  // Insert line item into invoice
  const [lineItem] = await database
    .insert(invoiceItems)
    .values({
      invoiceId: invoice.id,
      description: `[${order.orderType.toUpperCase()}] ${order.clinicalIndication}`,
      quantity: 1,
      unitPrice: pricing.fee,
      totalPrice: pricing.fee,
    })
    .returning();

  // Audit log the charge capture
  await database.insert(auditLogs).values({
    tenantId: order.tenantId,
    action: "ORDER_CHARGE_CAPTURED",
    entityType: "clinical_orders",
    entityId: order.id,
    summary: `Automated charge capture: ${pricing.fee} ${pricing.currency} billed for order ${order.id} to invoice ${invoice.id} by performer ${params.performerUserId}`,
  });

  return { billed: true, invoiceItemId: lineItem?.id, amount: pricing.fee };
}
