import { NextRequest, NextResponse } from "next/server";
import { recordSubscriptionUsage } from "@/lib/services/entitlement-service";
import { db } from "@/db";
import { subscriptions, organizations } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subscriptionId, patientId, serviceType, serviceId, quantity, nominalPrice, coveredAmount, patientCopayAmount } = body;

    if (!subscriptionId || !patientId || !serviceType) {
      return NextResponse.json({ success: false, error: "Missing required parameters" }, { status: 400 });
    }

    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.id, subscriptionId));
    if (!sub) {
      return NextResponse.json({ success: false, error: "Subscription not found" }, { status: 404 });
    }

    const [record] = await recordSubscriptionUsage({
      tenantId: sub.tenantId,
      subscriptionId,
      patientId,
      serviceType,
      serviceId,
      quantity: quantity || 1,
      nominalPrice: nominalPrice || 0,
      coveredAmount: coveredAmount || 0,
      patientCopayAmount: patientCopayAmount || 0,
      periodStart: sub.currentPeriodStart,
      periodEnd: sub.currentPeriodEnd,
    });

    return NextResponse.json({ success: true, data: record }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
