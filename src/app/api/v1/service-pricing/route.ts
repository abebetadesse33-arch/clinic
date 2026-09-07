import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { servicePricing } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { broadcastConfigChange } from "@/lib/services/config-events";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const serviceType = searchParams.get("serviceType");
    const planCode = searchParams.get("planCode");
    const all = searchParams.get("all") === "true";

    const conditions: any[] = [];

    if (!all) {
      conditions.push(eq(servicePricing.isActive, true));
    }

    if (serviceType) {
      conditions.push(eq(servicePricing.serviceType, serviceType));
    }

    if (planCode) {
      conditions.push(eq(servicePricing.planCode, planCode));
    }

    let query = db.select().from(servicePricing);
    if (conditions.length > 0) {
      // @ts-ignore
      query = query.where(and(...conditions));
    }

    const tiers = await query.orderBy(asc(servicePricing.basePrice));

    return NextResponse.json({
      success: true,
      data: tiers,
      count: tiers.length,
    });
  } catch (error: any) {
    console.error("[API v1 service-pricing GET] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      serviceName,
      serviceType,
      planCode,
      basePrice,
      yearlyPrice,
      currency,
      discountPercent,
      badge,
      description,
      features,
      popular,
      ctaText,
      isActive,
      metadata,
    } = body;

    if (!serviceName || basePrice === undefined) {
      return NextResponse.json({ success: false, error: "serviceName and basePrice are required" }, { status: 400 });
    }

    const [created] = await db
      .insert(servicePricing)
      .values({
        serviceName,
        serviceType: serviceType || "subscription",
        planCode: planCode || null,
        basePrice: String(basePrice),
        yearlyPrice: yearlyPrice !== undefined ? String(yearlyPrice) : null,
        currency: currency || "ETB",
        discountPercent: String(discountPercent || 0),
        badge: badge || null,
        description: description || null,
        features: Array.isArray(features) ? features : [],
        popular: Boolean(popular),
        ctaText: ctaText || "Get Started",
        isActive: isActive !== false,
        metadata: metadata || {},
      })
      .returning();

    broadcastConfigChange("service-pricing", "created", created);

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error: any) {
    console.error("[API v1 service-pricing POST] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, basePrice, yearlyPrice, discountPercent, ...rest } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Pricing ID is required" }, { status: 400 });
    }

    const updateData: any = { ...rest, updatedAt: new Date() };
    if (basePrice !== undefined) updateData.basePrice = String(basePrice);
    if (yearlyPrice !== undefined) updateData.yearlyPrice = String(yearlyPrice);
    if (discountPercent !== undefined) updateData.discountPercent = String(discountPercent);

    const [updated] = await db
      .update(servicePricing)
      .set(updateData)
      .where(eq(servicePricing.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ success: false, error: "Pricing tier not found" }, { status: 404 });
    }

    broadcastConfigChange("service-pricing", "updated", updated);

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("[API v1 service-pricing PUT] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Pricing ID is required" }, { status: 400 });
    }

    await db.delete(servicePricing).where(eq(servicePricing.id, id));

    broadcastConfigChange("service-pricing", "deleted", { id });

    return NextResponse.json({ success: true, message: "Deleted successfully" });
  } catch (error: any) {
    console.error("[API v1 service-pricing DELETE] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
