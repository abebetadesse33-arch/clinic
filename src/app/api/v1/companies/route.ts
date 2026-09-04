import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  companies,
  subscriptions,
  subscriptionPlans,
  companyAdmins,
  organizations,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { SubscriptionService } from "@/lib/services/subscription-service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const [org] = await db.select().from(organizations).limit(1);
    const tenantId = searchParams.get("tenantId") || org?.id;

    if (!tenantId) {
      return NextResponse.json({ success: false, error: "Tenant not found" }, { status: 400 });
    }

    const companyList = await db
      .select({
        company: companies,
        subscription: subscriptions,
        plan: subscriptionPlans,
      })
      .from(companies)
      .leftJoin(subscriptions, eq(subscriptions.companyId, companies.id))
      .leftJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
      .where(eq(companies.tenantId, tenantId))
      .orderBy(desc(companies.createdAt));

    return NextResponse.json({ success: true, data: companyList });
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
      return NextResponse.json({ success: false, error: "Tenant not found" }, { status: 400 });
    }

    const { name, tinNumber, industry, contactPerson, email, phone, billingAddress, planId, seatCount, adminUserId } = body;

    if (!name || !contactPerson || !email || !phone || !planId || !adminUserId) {
      return NextResponse.json({ success: false, error: "Missing required company registration parameters" }, { status: 400 });
    }

    const result = await SubscriptionService.createCompanySubscription({
      tenantId,
      name,
      tinNumber,
      industry,
      contactPerson,
      email,
      phone,
      billingAddress,
      planId,
      seatCount: Number(seatCount || 10),
      adminUserId,
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
