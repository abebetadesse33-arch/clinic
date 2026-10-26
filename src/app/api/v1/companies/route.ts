import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  companies,
  subscriptions,
  subscriptionPlans,
  companyAdmins,
  organizations,
} from "@/db/schema";
import { and, eq, desc, inArray } from "drizzle-orm";
import { requireAuthenticatedUser, requireAdminUser, isAdminUser } from "@/lib/security/auth-session";
import { SubscriptionService } from "@/lib/services/subscription-service";

export async function GET(req: NextRequest) {
  const auth = await requireAuthenticatedUser(req);
  if ("response" in auth) return auth.response;

  try {
    const tenantId = auth.user.organizationId;

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
      .where(
        isAdminUser(auth.user)
          ? eq(companies.tenantId, tenantId)
          : and(
              eq(companies.tenantId, tenantId),
              // Company portal admins only see the companies they administer.
              inArray(
                companies.id,
                (
                  await db
                    .select({ id: companyAdmins.companyId })
                    .from(companyAdmins)
                    .where(eq(companyAdmins.userId, auth.user.id))
                ).map((r) => r.id).concat("__none__")
              )
            )
      )
      .orderBy(desc(companies.createdAt));

    return NextResponse.json({ success: true, data: companyList });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminUser(req);
  if ("response" in auth) return auth.response;

  try {
    const body = await req.json();
    const tenantId = auth.user.organizationId;

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
