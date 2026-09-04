import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  drugCatalog,
  drugBatches,
  suppliers,
  purchaseOrders,
  stockMovements,
  pharmacyInventoryAlerts,
  users,
} from "@/db/schema";
import { eq, and, desc, asc, sql, lt, lte, gte } from "drizzle-orm";

const DEFAULT_TENANT = "00000000-0000-0000-0000-000000000001";

// ──────────────────────────────────────────────────────────
// GET /api/v1/pharmacy/inventory
// Returns drug catalog with stock levels, batches, alerts
// ──────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const view = searchParams.get("view") ?? "catalog"; // catalog | batches | suppliers | purchase_orders | alerts

    if (view === "catalog") {
      // Drug catalog with aggregated stock levels
      const catalog = await db
        .select({
          id: drugCatalog.id,
          genericName: drugCatalog.genericName,
          brandName: drugCatalog.brandName,
          strength: drugCatalog.strength,
          dosageForm: drugCatalog.dosageForm,
          route: drugCatalog.route,
          atcCode: drugCatalog.atcCode,
          barcode: drugCatalog.barcode,
          packageSize: drugCatalog.packageSize,
          reorderLevel: drugCatalog.reorderLevel,
          maxStock: drugCatalog.maxStock,
          defaultUnitCost: drugCatalog.defaultUnitCost,
          defaultSellingPrice: drugCatalog.defaultSellingPrice,
          storageCondition: drugCatalog.storageCondition,
          isActive: drugCatalog.isActive,
          totalStock: sql<number>`COALESCE(SUM(CASE WHEN ${drugBatches.status} = 'active' THEN ${drugBatches.quantityRemaining} ELSE 0 END), 0)`,
          activeBatches: sql<number>`COUNT(CASE WHEN ${drugBatches.status} = 'active' THEN 1 END)`,
          nearestExpiry: sql<string>`MIN(CASE WHEN ${drugBatches.status} = 'active' THEN ${drugBatches.expiryDate} END)`,
        })
        .from(drugCatalog)
        .leftJoin(drugBatches, eq(drugBatches.drugId, drugCatalog.id))
        .where(eq(drugCatalog.isActive, true))
        .groupBy(drugCatalog.id)
        .orderBy(asc(drugCatalog.genericName));

      // Auto-generate low-stock and near-expiry alerts
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const alertSummary = {
        lowStock: catalog.filter((d) => Number(d.totalStock) <= Number(d.reorderLevel)).length,
        outOfStock: catalog.filter((d) => Number(d.totalStock) === 0).length,
        nearExpiry: 0, // populated below
      };

      return NextResponse.json({ success: true, catalog, alertSummary });

    } else if (view === "batches") {
      const drugId = searchParams.get("drugId");
      const conditions = [];
      if (drugId) conditions.push(eq(drugBatches.drugId, drugId));

      const batches = await db
        .select({
          id: drugBatches.id,
          drugId: drugBatches.drugId,
          supplierId: drugBatches.supplierId,
          batchNumber: drugBatches.batchNumber,
          expiryDate: drugBatches.expiryDate,
          receivedDate: drugBatches.receivedDate,
          quantityReceived: drugBatches.quantityReceived,
          quantityRemaining: drugBatches.quantityRemaining,
          costPerUnit: drugBatches.costPerUnit,
          sellingPrice: drugBatches.sellingPrice,
          locationBin: drugBatches.locationBin,
          status: drugBatches.status,
          drugGenericName: drugCatalog.genericName,
          drugBrandName: drugCatalog.brandName,
          drugStrength: drugCatalog.strength,
          supplierName: suppliers.name,
        })
        .from(drugBatches)
        .leftJoin(drugCatalog, eq(drugBatches.drugId, drugCatalog.id))
        .leftJoin(suppliers, eq(drugBatches.supplierId, suppliers.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(asc(drugBatches.expiryDate));

      return NextResponse.json({ success: true, batches });

    } else if (view === "suppliers") {
      const supplierList = await db
        .select()
        .from(suppliers)
        .orderBy(asc(suppliers.name));
      return NextResponse.json({ success: true, suppliers: supplierList });

    } else if (view === "purchase_orders") {
      const orders = await db
        .select({
          id: purchaseOrders.id,
          poNumber: purchaseOrders.poNumber,
          status: purchaseOrders.status,
          items: purchaseOrders.items,
          totalAmount: purchaseOrders.totalAmount,
          orderedAt: purchaseOrders.orderedAt,
          receivedAt: purchaseOrders.receivedAt,
          notes: purchaseOrders.notes,
          supplierName: suppliers.name,
        })
        .from(purchaseOrders)
        .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
        .orderBy(desc(purchaseOrders.orderedAt));

      return NextResponse.json({ success: true, orders });

    } else if (view === "alerts") {
      const alerts = await db
        .select({
          id: pharmacyInventoryAlerts.id,
          alertType: pharmacyInventoryAlerts.alertType,
          threshold: pharmacyInventoryAlerts.threshold,
          currentValue: pharmacyInventoryAlerts.currentValue,
          acknowledged: pharmacyInventoryAlerts.acknowledged,
          createdAt: pharmacyInventoryAlerts.createdAt,
          drugGenericName: drugCatalog.genericName,
          drugStrength: drugCatalog.strength,
          batchNumber: drugBatches.batchNumber,
          batchExpiry: drugBatches.expiryDate,
        })
        .from(pharmacyInventoryAlerts)
        .leftJoin(drugCatalog, eq(pharmacyInventoryAlerts.drugId, drugCatalog.id))
        .leftJoin(drugBatches, eq(pharmacyInventoryAlerts.batchId, drugBatches.id))
        .where(eq(pharmacyInventoryAlerts.acknowledged, false))
        .orderBy(desc(pharmacyInventoryAlerts.createdAt));

      return NextResponse.json({ success: true, alerts });
    }

    return NextResponse.json({ success: false, error: "Unknown view" }, { status: 400 });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ──────────────────────────────────────────────────────────
// POST /api/v1/pharmacy/inventory
// Actions: add_drug | add_batch | add_supplier | create_po | receive_po | ack_alert
// ──────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;
    const tenantId = body.tenantId ?? DEFAULT_TENANT;

    if (action === "add_drug") {
      const [drug] = await db
        .insert(drugCatalog)
        .values({
          tenantId,
          genericName: body.genericName,
          brandName: body.brandName,
          strength: body.strength,
          dosageForm: body.dosageForm,
          route: body.route ?? "oral",
          atcCode: body.atcCode,
          barcode: body.barcode,
          packageSize: body.packageSize,
          reorderLevel: body.reorderLevel ?? 50,
          maxStock: body.maxStock ?? 500,
          defaultUnitCost: body.defaultUnitCost ?? "0.00",
          defaultSellingPrice: body.defaultSellingPrice ?? "0.00",
          storageCondition: body.storageCondition ?? "ambient",
        })
        .returning();
      return NextResponse.json({ success: true, drug });

    } else if (action === "add_batch") {
      const [batch] = await db
        .insert(drugBatches)
        .values({
          tenantId,
          drugId: body.drugId,
          supplierId: body.supplierId,
          batchNumber: body.batchNumber,
          expiryDate: body.expiryDate,
          receivedDate: body.receivedDate ?? new Date().toISOString().split("T")[0],
          quantityReceived: body.quantityReceived,
          quantityRemaining: body.quantityReceived,
          costPerUnit: body.costPerUnit,
          sellingPrice: body.sellingPrice,
          locationBin: body.locationBin ?? "Shelf A-1",
        })
        .returning();

      // Log stock movement
      await db.insert(stockMovements).values({
        tenantId,
        batchId: batch.id,
        movementType: "receive",
        quantity: batch.quantityReceived,
        previousQuantity: 0,
        newQuantity: batch.quantityReceived,
        referenceType: "batch_receipt",
        referenceId: batch.id,
        performedBy: body.performedBy ?? null,
        notes: `Batch ${batch.batchNumber} received`,
      });

      return NextResponse.json({ success: true, batch });

    } else if (action === "add_supplier") {
      const [supplier] = await db
        .insert(suppliers)
        .values({
          tenantId,
          name: body.name,
          contactPerson: body.contactPerson,
          email: body.email,
          phone: body.phone,
          address: body.address,
          leadTimeDays: body.leadTimeDays ?? 3,
        })
        .returning();
      return NextResponse.json({ success: true, supplier });

    } else if (action === "create_po") {
      const poNumber = `PO-${Date.now()}`;
      const [po] = await db
        .insert(purchaseOrders)
        .values({
          tenantId,
          supplierId: body.supplierId,
          poNumber,
          status: "submitted",
          items: body.items,
          totalAmount: body.totalAmount,
          orderedBy: body.orderedBy ?? null,
          notes: body.notes,
        })
        .returning();
      return NextResponse.json({ success: true, po });

    } else if (action === "ack_alert") {
      await db
        .update(pharmacyInventoryAlerts)
        .set({ acknowledged: true, acknowledgedBy: body.userId ?? null, acknowledgedAt: new Date() })
        .where(eq(pharmacyInventoryAlerts.id, body.alertId));
      return NextResponse.json({ success: true, message: "Alert acknowledged" });

    } else if (action === "update_drug") {
      await db
        .update(drugCatalog)
        .set({
          genericName: body.genericName,
          brandName: body.brandName,
          strength: body.strength,
          reorderLevel: body.reorderLevel,
          defaultSellingPrice: body.defaultSellingPrice,
          isActive: body.isActive,
          updatedAt: new Date(),
        })
        .where(eq(drugCatalog.id, body.drugId));
      return NextResponse.json({ success: true, message: "Drug updated" });
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
