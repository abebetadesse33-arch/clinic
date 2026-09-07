import { db } from "@/db";
import {
  subscriptions,
  subscriptionPlans,
  subscriptionInvoices,
} from "@/db/schema";
import { eq, and, sql, lte } from "drizzle-orm";

export class BillingAutomationService {
  /**
   * Calculates linear daily proration when upgrading or downgrading a plan mid-cycle.
   */
  static calculateProration(params: {
    currentPlanPrice: number;
    newPlanPrice: number;
    periodStart: Date;
    periodEnd: Date;
    changeDate?: Date;
  }) {
    const changeDate = params.changeDate || new Date();
    const totalCycleDays = Math.max(1, Math.round((params.periodEnd.getTime() - params.periodStart.getTime()) / (1000 * 60 * 60 * 24)));
    const remainingDays = Math.max(0, Math.round((params.periodEnd.getTime() - changeDate.getTime()) / (1000 * 60 * 60 * 24)));

    const dailyOldRate = params.currentPlanPrice / totalCycleDays;
    const dailyNewRate = params.newPlanPrice / totalCycleDays;

    const unusedCredit = Math.round(dailyOldRate * remainingDays * 100) / 100;
    const newPeriodCost = Math.round(dailyNewRate * remainingDays * 100) / 100;
    const netPayableDifferential = Math.max(0, Math.round((newPeriodCost - unusedCredit) * 100) / 100);
    const netCreditDifferential = Math.max(0, Math.round((unusedCredit - newPeriodCost) * 100) / 100);

    return {
      totalCycleDays,
      remainingDays,
      unusedCredit,
      newPeriodCost,
      netPayableDifferential,
      netCreditDifferential,
    };
  }

  /**
   * Evaluates recurring renewals and generates invoices for upcoming billing cycles.
   */
  static async processRecurringBillingCycle(tenantId: string) {
    const now = new Date();
    const windowStart = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours ahead

    const expiringSubscriptions = await db
      .select({
        subscription: subscriptions,
        plan: subscriptionPlans,
      })
      .from(subscriptions)
      .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
      .where(
        and(
          eq(subscriptions.tenantId, tenantId),
          eq(subscriptions.status, "active"),
          eq(subscriptions.cancelAtPeriodEnd, false),
          lte(subscriptions.currentPeriodEnd, windowStart)
        )
      );

    const generatedInvoices = [];

    for (const item of expiringSubscriptions) {
      const { subscription, plan } = item;
      const nextPeriodStart = new Date(subscription.currentPeriodEnd);
      const nextPeriodEnd = new Date(nextPeriodStart);

      if (plan.billingCycle === "yearly") {
        nextPeriodEnd.setFullYear(nextPeriodEnd.getFullYear() + 1);
      } else if (plan.billingCycle === "quarterly") {
        nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 3);
      } else {
        nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);
      }

      const invoiceNumber = `REC-INV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const [invoice] = await db
        .insert(subscriptionInvoices)
        .values({
          tenantId,
          subscriptionId: subscription.id,
          invoiceNumber,
          periodStart: nextPeriodStart,
          periodEnd: nextPeriodEnd,
          baseAmount: plan.basePrice,
          additionalSeatsAmount: "0",
          discountAmount: "0",
          taxAmount: "0",
          totalAmount: plan.basePrice,
          currency: plan.currency,
          status: "open",
          dueDate: new Date(nextPeriodStart.getTime() + 5 * 24 * 60 * 60 * 1000),
        })
        .returning();

      // Advance subscription cycle
      await db
        .update(subscriptions)
        .set({
          currentPeriodStart: nextPeriodStart,
          currentPeriodEnd: nextPeriodEnd,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, subscription.id));

      generatedInvoices.push(invoice);
    }

    return { processedCount: expiringSubscriptions.length, generatedInvoices };
  }

  /**
   * Executes dunning process on overdue invoices.
   */
  static async processDunningSequence(tenantId: string) {
    const now = new Date();

    const overdueInvoices = await db
      .select({
        invoice: subscriptionInvoices,
        subscription: subscriptions,
      })
      .from(subscriptionInvoices)
      .innerJoin(subscriptions, eq(subscriptionInvoices.subscriptionId, subscriptions.id))
      .where(
        and(
          eq(subscriptionInvoices.tenantId, tenantId),
          eq(subscriptionInvoices.status, "open"),
          lte(subscriptionInvoices.dueDate, now)
        )
      );

    const dunningLogs = [];

    for (const { invoice, subscription } of overdueInvoices) {
      const daysOverdue = Math.floor((now.getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24));
      const attempts = invoice.dunningAttempts + 1;

      let newStatus = subscription.status;
      let actionTaken = "reminder_sent";

      if (daysOverdue >= 14) {
        // Final cancellation
        newStatus = "cancelled";
        actionTaken = "subscription_cancelled_due_to_nonpayment";
        await db.update(subscriptions).set({ status: "cancelled", cancelledAt: now }).where(eq(subscriptions.id, subscription.id));
        await db.update(subscriptionInvoices).set({ status: "uncollectible" }).where(eq(subscriptionInvoices.id, invoice.id));
      } else if (daysOverdue >= 3) {
        // Suspend/past_due
        newStatus = "past_due";
        actionTaken = "subscription_marked_past_due";
        await db.update(subscriptions).set({ status: "past_due" }).where(eq(subscriptions.id, subscription.id));
      }

      await db
        .update(subscriptionInvoices)
        .set({
          dunningAttempts: attempts,
          lastDunningAt: now,
        })
        .where(eq(subscriptionInvoices.id, invoice.id));

      dunningLogs.push({
        invoiceId: invoice.id,
        subscriptionId: subscription.id,
        daysOverdue,
        attempts,
        actionTaken,
        newStatus,
      });
    }

    return { totalEvaluated: overdueInvoices.length, dunningLogs };
  }
}
