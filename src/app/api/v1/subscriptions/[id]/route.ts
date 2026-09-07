import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  subscriptions,
  subscriptionPlans,
  familyGroups,
  familyMembers,
  companies,
  subscriptionMembers,
  subscriptionInvoices,
  subscriptionUsage,
  patients,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { BillingAutomationService } from "@/lib/services/billing-automation-service";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const [sub] = await db
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
      .where(eq(subscriptions.id, params.id));

    if (!sub) {
      return NextResponse.json({ success: false, error: "Subscription not found" }, { status: 404 });
    }

    // Fetch members
    let members: any[] = [];
    if (sub.subscription.familyGroupId) {
      members = await db
        .select({
          member: familyMembers,
          patient: patients,
        })
        .from(familyMembers)
        .innerJoin(patients, eq(familyMembers.patientId, patients.id))
        .where(eq(familyMembers.familyGroupId, sub.subscription.familyGroupId));
    } else if (sub.subscription.companyId) {
      members = await db
        .select({
          member: subscriptionMembers,
          patient: patients,
        })
        .from(subscriptionMembers)
        .innerJoin(patients, eq(subscriptionMembers.patientId, patients.id))
        .where(eq(subscriptionMembers.subscriptionId, sub.subscription.id));
    }

    // Fetch invoices
    const invoices = await db
      .select()
      .from(subscriptionInvoices)
      .where(eq(subscriptionInvoices.subscriptionId, sub.subscription.id))
      .orderBy(desc(subscriptionInvoices.createdAt));

    // Fetch usage in period
    const usage = await db
      .select()
      .from(subscriptionUsage)
      .where(eq(subscriptionUsage.subscriptionId, sub.subscription.id))
      .orderBy(desc(subscriptionUsage.consumedAt));

    return NextResponse.json({
      success: true,
      data: {
        ...sub,
        members,
        invoices,
        usage,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { newPlanId, newSeatCount } = body;

    const [sub] = await db
      .select({
        subscription: subscriptions,
        plan: subscriptionPlans,
      })
      .from(subscriptions)
      .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
      .where(eq(subscriptions.id, params.id));

    if (!sub) {
      return NextResponse.json({ success: false, error: "Subscription not found" }, { status: 404 });
    }

    if (newPlanId && newPlanId !== sub.subscription.planId) {
      const [newPlan] = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.id, newPlanId));

      if (!newPlan) {
        return NextResponse.json({ success: false, error: "New plan not found" }, { status: 404 });
      }

      // Calculate proration
      const proration = BillingAutomationService.calculateProration({
        currentPlanPrice: Number(sub.plan.basePrice),
        newPlanPrice: Number(newPlan.basePrice),
        periodStart: sub.subscription.currentPeriodStart,
        periodEnd: sub.subscription.currentPeriodEnd,
      });

      // Update subscription plan
      const [updatedSub] = await db
        .update(subscriptions)
        .set({
          planId: newPlan.id,
          seatCount: newSeatCount || newPlan.maxMembers || sub.subscription.seatCount,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, params.id))
        .returning();

      // If differential is payable, create adjustment invoice
      let adjustmentInvoice = null;
      if (proration.netPayableDifferential > 0) {
        const invNum = `ADJ-INV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
        [adjustmentInvoice] = await db
          .insert(subscriptionInvoices)
          .values({
            tenantId: sub.subscription.tenantId,
            subscriptionId: sub.subscription.id,
            invoiceNumber: invNum,
            periodStart: new Date(),
            periodEnd: sub.subscription.currentPeriodEnd,
            baseAmount: proration.netPayableDifferential.toString(),
            additionalSeatsAmount: "0",
            discountAmount: "0",
            taxAmount: "0",
            totalAmount: proration.netPayableDifferential.toString(),
            currency: newPlan.currency,
            status: "open",
            dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          })
          .returning();
      }

      return NextResponse.json({
        success: true,
        data: {
          subscription: updatedSub,
          proration,
          adjustmentInvoice,
        },
      });
    }

    if (newSeatCount && newSeatCount !== sub.subscription.seatCount) {
      const [updatedSub] = await db
        .update(subscriptions)
        .set({ seatCount: Number(newSeatCount), updatedAt: new Date() })
        .where(eq(subscriptions.id, params.id))
        .returning();

      return NextResponse.json({ success: true, data: { subscription: updatedSub } });
    }

    return NextResponse.json({ success: true, data: { subscription: sub.subscription } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(req.url);
    const cancelImmediately = searchParams.get("immediate") === "true";

    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, params.id));

    if (!sub) {
      return NextResponse.json({ success: false, error: "Subscription not found" }, { status: 404 });
    }

    if (cancelImmediately) {
      const [updated] = await db
        .update(subscriptions)
        .set({
          status: "cancelled",
          cancelledAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, params.id))
        .returning();
      return NextResponse.json({ success: true, data: updated, message: "Subscription cancelled immediately" });
    } else {
      const [updated] = await db
        .update(subscriptions)
        .set({
          cancelAtPeriodEnd: true,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, params.id))
        .returning();
      return NextResponse.json({
        success: true,
        data: updated,
        message: "Subscription will terminate at end of current billing cycle",
      });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
