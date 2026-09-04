import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { purchaseOrders, auditLogs } from "@/db/schema";
import { createPurchaseOrderSchema } from "@/lib/validations/schemas";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

// GET /api/v1/pharmacy/purchase-orders
export async function GET(_req: NextRequest) {
  try {
    const data = await db
      .select()
      .from(purchaseOrders)
      .orderBy(desc(purchaseOrders.orderedAt));

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Error fetching purchase orders:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch purchase orders" },
      { status: 500 }
    );
  }
}

// POST /api/v1/pharmacy/purchase-orders
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = createPurchaseOrderSchema.parse(body);

    const poNumber = `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const [newPO] = await db
      .insert(purchaseOrders)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        supplierId: validated.supplierId,
        poNumber,
        status: "submitted",
        items: validated.items,
        totalAmount: validated.totalAmount.toString(),
        orderedBy: "11111111-1111-1111-1111-111111111104",
        orderedAt: new Date(),
        notes: validated.notes,
      })
      .returning();

    await db.insert(auditLogs).values({
      tenantId: DEFAULT_TENANT_ID,
      userId: "11111111-1111-1111-1111-111111111104",
      action: "PURCHASE_ORDER_SUBMITTED",
      entityType: "purchase_orders",
      entityId: newPO.id,
      summary: `Generated purchase order ${poNumber} for ${newPO.totalAmount} ETB (${validated.items.length} items)`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json(
      { success: true, data: newPO, message: "Purchase order submitted to supplier" },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: error.errors },
        { status: 422 }
      );
    }
    console.error("Error generating purchase order:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create purchase order" },
      { status: 500 }
    );
  }
}
