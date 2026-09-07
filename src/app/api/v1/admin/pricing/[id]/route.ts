import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { servicePricingCatalog, auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// PATCH /api/v1/admin/pricing/[id]
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await req.json();
    const { basePrice, isFree, isActive, name, description, validityDays } = body;

    const [existing] = await db
      .select()
      .from(servicePricingCatalog)
      .where(eq(servicePricingCatalog.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Service pricing record not found." },
        { status: 404 }
      );
    }

    const [updated] = await db
      .update(servicePricingCatalog)
      .set({
        basePrice: basePrice !== undefined ? String(basePrice) : existing.basePrice,
        isFree: typeof isFree === "boolean" ? isFree : existing.isFree,
        isActive: typeof isActive === "boolean" ? isActive : existing.isActive,
        name: name || existing.name,
        description: description !== undefined ? description : existing.description,
        validityDays: validityDays !== undefined ? (validityDays ? Number(validityDays) : null) : existing.validityDays,
        updatedAt: new Date(),
      })
      .where(eq(servicePricingCatalog.id, id))
      .returning();

    try {
      await db.insert(auditLogs).values({
        tenantId: "00000000-0000-0000-0000-000000000001",
        action: "SERVICE_PRICE_UPDATED",
        entityType: "service_pricing_catalog",
        entityId: updated.id,
        summary: `Updated service ${updated.serviceCode} (${updated.name}). BasePrice: ${updated.basePrice} ${updated.currency}, isFree: ${updated.isFree}, isActive: ${updated.isActive}`,
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      });
    } catch {}

    return NextResponse.json({
      success: true,
      data: updated,
      message: `Service '${updated.name}' updated successfully!`,
    });
  } catch (error: any) {
    console.error("Error updating service pricing item:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to update pricing item" },
      { status: 500 }
    );
  }
}

// DELETE /api/v1/admin/pricing/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    const [deleted] = await db
      .update(servicePricingCatalog)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(servicePricingCatalog.id, id))
      .returning();

    if (!deleted) {
      return NextResponse.json({ success: false, error: "Service not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: deleted,
      message: `Service '${deleted.name}' has been deactivated.`,
    });
  } catch (error: any) {
    console.error("Error deactivating service:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to deactivate service" },
      { status: 500 }
    );
  }
}
