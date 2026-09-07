import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  subscriptions,
  subscriptionPlans,
  familyGroups,
  companies,
  patients,
  organizations,
} from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { SubscriptionService } from "@/lib/services/subscription-service";
import { dispatchNotification } from "@/lib/notifications/notification-service";
import { getAuthenticatedSessionUserId } from "@/lib/security/auth-session";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const subscriberType = searchParams.get("subscriberType") as any;

    const [org] = await db.select().from(organizations).limit(1);
    const tenantId = searchParams.get("tenantId") || org?.id;

    if (!tenantId) {
      return NextResponse.json({ success: false, error: "Tenant not found" }, { status: 400 });
    }

    const conditions = [eq(subscriptions.tenantId, tenantId)];
    if (subscriberType) {
      conditions.push(eq(subscriptions.subscriberType, subscriberType));
    }

    const allSubs = await db
      .select({
        subscription: subscriptions,
        plan: subscriptionPlans,
        familyGroup: familyGroups,
        company: companies,
      })
      .from(subscriptions)
      .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
      .leftJoin(familyGroups, eq(subscriptions.familyGroupId, familyGroups.id))
      .leftJoin(companies, eq(subscriptions.companyId, companies.id))
      .where(and(...conditions))
      .orderBy(desc(subscriptions.createdAt));

    return NextResponse.json({ success: true, data: allSubs });
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

    const { subscriberType, planId, primaryPatientId, familyName, paymentMethod, companyName, contactPerson, email, phone, seatCount, adminUserId } = body;

    if (subscriberType === "family") {
      if (!primaryPatientId || !familyName || !planId) {
        return NextResponse.json({ success: false, error: "Missing required family subscription fields" }, { status: 400 });
      }

      const result = await SubscriptionService.createFamilySubscription({
        tenantId,
        primaryPatientId,
        familyName,
        planId,
        paymentMethod,
      });

      await dispatchNotification({
        category: "billing",
        type: "system_alert",
        title: "Subscription created",
        body: `Family subscription ${result.subscription.id.slice(0, 8)} was created and is ready for payment.`,
        priority: "normal",
        participantPatientId: primaryPatientId,
        senderUserId: await getAuthenticatedSessionUserId(req) || undefined,
        actionUrl: `/subscriptions/${result.subscription.id}`,
        actionText: "View subscription",
        relatedEntityType: "subscription",
        relatedEntityId: result.subscription.id,
        metadata: { workflowDomain: "subscription", status: result.subscription.status, invoiceId: result.invoice.id },
      });

      return NextResponse.json({ success: true, data: result }, { status: 201 });
    } else if (subscriberType === "company") {
      if (!companyName || !contactPerson || !email || !phone || !planId || !adminUserId) {
        return NextResponse.json({ success: false, error: "Missing required company subscription fields" }, { status: 400 });
      }

      const result = await SubscriptionService.createCompanySubscription({
        tenantId,
        name: companyName,
        contactPerson,
        email,
        phone,
        planId,
        seatCount: Number(seatCount || 10),
        adminUserId,
      });

      await dispatchNotification({
        category: "billing",
        type: "system_alert",
        title: "Company subscription created",
        body: `${companyName} subscription was created and is awaiting payment review.`,
        priority: "normal",
        recipientUserId: adminUserId,
        targetRole: "tenant_admin",
        senderUserId: await getAuthenticatedSessionUserId(req) || undefined,
        actionUrl: `/subscriptions/${result.subscription.id}`,
        actionText: "View subscription",
        relatedEntityType: "subscription",
        relatedEntityId: result.subscription.id,
        metadata: { workflowDomain: "subscription", companyId: result.company.id, invoiceId: result.invoice.id },
      });

      return NextResponse.json({ success: true, data: result }, { status: 201 });
    }

    return NextResponse.json({ success: false, error: "Unsupported subscriber type" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
