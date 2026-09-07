import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  subscriptionInvoices,
  subscriptions,
  subscriptionPlans,
  familyGroups,
  companies,
  organizations,
} from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const subscriptionId = searchParams.get("subscriptionId");
    const status = searchParams.get("status") as any;

    const [org] = await db.select().from(organizations).limit(1);
    const tenantId = searchParams.get("tenantId") || org?.id;

    if (!tenantId) {
      return NextResponse.json({ success: false, error: "Tenant not found" }, { status: 400 });
    }

    const conditions = [eq(subscriptionInvoices.tenantId, tenantId)];
    if (subscriptionId) {
      conditions.push(eq(subscriptionInvoices.subscriptionId, subscriptionId));
    }
    if (status) {
      conditions.push(eq(subscriptionInvoices.status, status));
    }

    const invoiceList = await db
      .select({
        invoice: subscriptionInvoices,
        subscription: subscriptions,
        plan: subscriptionPlans,
        familyGroup: familyGroups,
        company: companies,
      })
      .from(subscriptionInvoices)
      .innerJoin(subscriptions, eq(subscriptionInvoices.subscriptionId, subscriptions.id))
      .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
      .leftJoin(familyGroups, eq(subscriptions.familyGroupId, familyGroups.id))
      .leftJoin(companies, eq(subscriptions.companyId, companies.id))
      .where(and(...conditions))
      .orderBy(desc(subscriptionInvoices.createdAt));

    return NextResponse.json({ success: true, data: invoiceList });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
