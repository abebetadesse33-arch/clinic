import { NextRequest, NextResponse } from "next/server";
import { SubscriptionService } from "@/lib/services/subscription-service";
import { db } from "@/db";
import { organizations } from "@/db/schema";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filterType = searchParams.get("type") as "individual" | "family" | "company" | undefined;

    // Default or query tenant
    const [org] = await db.select().from(organizations).limit(1);
    const tenantId = searchParams.get("tenantId") || org?.id;

    if (!tenantId) {
      return NextResponse.json({ success: false, error: "Tenant not found" }, { status: 400 });
    }

    const plans = await SubscriptionService.listPlans(tenantId, filterType || undefined);
    return NextResponse.json({ success: true, data: plans });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const [org] = await db.select().from(organizations).limit(1);
    const tenantId = body.tenantId || org?.id;

    if (!tenantId) {
      return NextResponse.json({ success: false, error: "Tenant not specified" }, { status: 400 });
    }

    if (!body.name || !body.type || !body.billingCycle || body.basePrice === undefined) {
      return NextResponse.json({ success: false, error: "Missing required plan fields" }, { status: 400 });
    }

    const slug = body.slug || body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    const plan = await SubscriptionService.createPlan({
      tenantId,
      name: body.name,
      slug,
      description: body.description,
      type: body.type,
      billingCycle: body.billingCycle,
      basePrice: Number(body.basePrice),
      currency: body.currency || "ETB",
      maxMembers: body.maxMembers ? Number(body.maxMembers) : undefined,
      additionalMemberPrice: body.additionalMemberPrice ? Number(body.additionalMemberPrice) : 0,
      includedServices: body.includedServices || {
        consultations: 0,
        labTests: 0,
        discountPercent: 0,
      },
      trialPeriodDays: body.trialPeriodDays ? Number(body.trialPeriodDays) : 0,
    });

    return NextResponse.json({ success: true, data: plan }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
