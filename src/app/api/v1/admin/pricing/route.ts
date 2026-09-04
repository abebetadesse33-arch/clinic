import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { servicePricingCatalog, systemPaymentSettings, auditLogs } from "@/db/schema";
import { asc, desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET /api/v1/admin/pricing
export async function GET(req: NextRequest) {
  try {
    const [catalog, settingsList] = await Promise.all([
      db.select().from(servicePricingCatalog).orderBy(asc(servicePricingCatalog.category), asc(servicePricingCatalog.name)),
      db.select().from(systemPaymentSettings).limit(1),
    ]);

    const settings = settingsList[0] || {
      id: "00000000-0000-0000-0000-000000000001",
      globalFreeMode: false,
      registrationValidityDays: 90,
      gracePeriodDays: 7,
      allowCashReconciliation: true,
    };

    return NextResponse.json({
      success: true,
      data: {
        services: catalog,
        settings,
      },
    });
  } catch (error: any) {
    console.error("Error fetching pricing catalog:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch pricing catalog" },
      { status: 500 }
    );
  }
}

// PATCH /api/v1/admin/pricing - Update global payment settings
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { globalFreeMode, registrationValidityDays, gracePeriodDays, allowCashReconciliation } = body;

    const [existingSettings] = await db.select().from(systemPaymentSettings).limit(1);

    let updated: any;
    if (existingSettings) {
      const [res] = await db
        .update(systemPaymentSettings)
        .set({
          globalFreeMode: typeof globalFreeMode === "boolean" ? globalFreeMode : existingSettings.globalFreeMode,
          registrationValidityDays: registrationValidityDays || existingSettings.registrationValidityDays,
          gracePeriodDays: gracePeriodDays || existingSettings.gracePeriodDays,
          allowCashReconciliation: typeof allowCashReconciliation === "boolean" ? allowCashReconciliation : existingSettings.allowCashReconciliation,
          updatedAt: new Date(),
        })
        .where(eq(systemPaymentSettings.id, existingSettings.id))
        .returning();
      updated = res;
    } else {
      const [res] = await db
        .insert(systemPaymentSettings)
        .values({
          globalFreeMode: Boolean(globalFreeMode),
          registrationValidityDays: registrationValidityDays || 90,
          gracePeriodDays: gracePeriodDays || 7,
          allowCashReconciliation: allowCashReconciliation ?? true,
        })
        .returning();
      updated = res;
    }

    // Log admin financial change
    try {
      await db.insert(auditLogs).values({
        tenantId: "00000000-0000-0000-0000-000000000001",
        action: "PAYMENT_SETTINGS_UPDATED",
        entityType: "system_payment_settings",
        entityId: updated.id,
        summary: `Admin modified payment settings. GlobalFreeMode: ${updated.globalFreeMode}, ValidityDays: ${updated.registrationValidityDays}`,
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      });
    } catch {}

    return NextResponse.json({
      success: true,
      data: updated,
      message: `Global Payment Settings updated successfully. Global Free Mode is now ${updated.globalFreeMode ? "ENABLED" : "DISABLED"}.`,
    });
  } catch (error: any) {
    console.error("Error updating payment settings:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to update payment settings" },
      { status: 500 }
    );
  }
}

// POST /api/v1/admin/pricing - Create new custom service item
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { serviceCode, category, name, description, basePrice, currency = "ETB", isFree = false, validityDays } = body;

    if (!serviceCode || !category || !name || basePrice === undefined) {
      return NextResponse.json(
        { success: false, error: "serviceCode, category, name, and basePrice are required." },
        { status: 400 }
      );
    }

    const [created] = await db
      .insert(servicePricingCatalog)
      .values({
        serviceCode: serviceCode.toUpperCase().trim(),
        category,
        name,
        description: description || null,
        basePrice: String(basePrice),
        currency,
        isFree: Boolean(isFree),
        isActive: true,
        validityDays: validityDays ? Number(validityDays) : null,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: created,
      message: "New billable service added to catalog successfully.",
    }, { status: 201 });
  } catch (error: any) {
    console.error("Error adding service to catalog:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to create service" },
      { status: 500 }
    );
  }
}
