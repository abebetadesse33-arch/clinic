import { db } from "@/db";
import {
  subscriptions,
  subscriptionPlans,
  subscriptionMembers,
  familyMembers,
  familyGroups,
  subscriptionUsage,
} from "@/db/schema";
import { eq, and, sql, gte, lte } from "drizzle-orm";

export interface EntitlementCheckRequest {
  patientId: string;
  tenantId: string;
  serviceType: "consultation" | "lab_test" | "medication" | "procedure" | "telehealth" | "physiotherapy";
  nominalPrice: number;
}

export interface EntitlementCheckResult {
  hasActiveSubscription: boolean;
  subscriptionId?: string;
  planId?: string;
  planName?: string;
  subscriberType?: "individual" | "family" | "company";
  serviceType: string;
  nominalPrice: number;
  coveredAmount: number;
  patientCopayAmount: number;
  discountPercentage: number;
  isFullyCovered: boolean;
  remainingQuota: number;
  totalQuota: number;
  usedQuota: number;
  message: string;
}

const isValidUUID = (id?: string | null) =>
  Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));

/**
 * Evaluates patient coverage and benefits under their active family, corporate, or individual subscription.
 */
export async function checkPatientEntitlement(
  params: EntitlementCheckRequest
): Promise<EntitlementCheckResult> {
  const { patientId, tenantId, serviceType, nominalPrice } = params;

  if (!isValidUUID(patientId) || !isValidUUID(tenantId)) {
    return {
      hasActiveSubscription: false,
      serviceType,
      nominalPrice,
      coveredAmount: 0,
      patientCopayAmount: nominalPrice,
      discountPercentage: 0,
      isFullyCovered: false,
      remainingQuota: 0,
      totalQuota: 0,
      usedQuota: 0,
      message: "No active subscription found for specified patient ID",
    };
  }

  try {
    // 1. Check for corporate seat subscription membership
    const memberSub = await db
      .select({
        subscription: subscriptions,
        plan: subscriptionPlans,
      })
      .from(subscriptionMembers)
      .innerJoin(subscriptions, eq(subscriptionMembers.subscriptionId, subscriptions.id))
      .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
      .where(
        and(
          eq(subscriptionMembers.patientId, patientId),
          eq(subscriptionMembers.isActive, true),
          eq(subscriptions.tenantId, tenantId),
          sql`${subscriptions.status} IN ('active', 'trial')`
        )
      )
      .limit(1);

    let activeSubRecord = memberSub[0];

    // 2. If not found in corporate seats, check for family group subscription
    if (!activeSubRecord) {
      const familySub = await db
        .select({
          subscription: subscriptions,
          plan: subscriptionPlans,
        })
        .from(familyMembers)
        .innerJoin(familyGroups, eq(familyMembers.familyGroupId, familyGroups.id))
        .innerJoin(subscriptions, eq(subscriptions.familyGroupId, familyGroups.id))
        .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
        .where(
          and(
            eq(familyMembers.patientId, patientId),
            eq(familyMembers.isActive, true),
            eq(subscriptions.tenantId, tenantId),
            sql`${subscriptions.status} IN ('active', 'trial')`
          )
        )
        .limit(1);

      activeSubRecord = familySub[0];
    }

    // 3. If not found in family, check direct individual subscription
    if (!activeSubRecord) {
      const directSub = await db
        .select({
          subscription: subscriptions,
          plan: subscriptionPlans,
        })
        .from(subscriptions)
        .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
        .where(
          and(
            eq(subscriptions.patientId, patientId),
            eq(subscriptions.tenantId, tenantId),
            sql`${subscriptions.status} IN ('active', 'trial')`
          )
        )
        .limit(1);

      activeSubRecord = directSub[0];
    }

    // If no active subscription found
    if (!activeSubRecord) {
      return {
        hasActiveSubscription: false,
        serviceType,
        nominalPrice,
        coveredAmount: 0,
        patientCopayAmount: nominalPrice,
        discountPercentage: 0,
        isFullyCovered: false,
        remainingQuota: 0,
        totalQuota: 0,
        usedQuota: 0,
        message: "No active healthcare subscription found. Standard service fee applies.",
      };
    }

    const { subscription, plan } = activeSubRecord;
    const includedServices = (plan.includedServices as any) || {};
    const discountPercent = Number(includedServices.discountPercent || 0);

    // Map serviceType to quota property
    let quotaKey = "";
    if (serviceType === "consultation" || serviceType === "telehealth") {
      quotaKey = "consultations";
    } else if (serviceType === "lab_test") {
      quotaKey = "labTests";
    } else if (serviceType === "medication") {
      quotaKey = "medications";
    } else if (serviceType === "physiotherapy") {
      quotaKey = "physiotherapy";
    }

    const totalQuota = includedServices[quotaKey] !== undefined ? Number(includedServices[quotaKey]) : 0;
    const isUnlimited = totalQuota === -1;

    // 4. Calculate usage within current billing cycle
    let usedQuota = 0;
    if (!isUnlimited && totalQuota > 0) {
      const usageCountResult = await db
        .select({
          totalConsumed: sql<number>`COALESCE(SUM(${subscriptionUsage.quantity}), 0)::int`,
        })
        .from(subscriptionUsage)
        .where(
          and(
            eq(subscriptionUsage.subscriptionId, subscription.id),
            eq(subscriptionUsage.serviceType, serviceType),
            gte(subscriptionUsage.consumedAt, subscription.currentPeriodStart),
            lte(subscriptionUsage.consumedAt, subscription.currentPeriodEnd)
          )
        );

      usedQuota = usageCountResult[0]?.totalConsumed || 0;
    }

    const remainingQuota = isUnlimited ? 999999 : Math.max(0, totalQuota - usedQuota);

    // 5. Evaluate final coverage
    if (isUnlimited || remainingQuota > 0) {
      return {
        hasActiveSubscription: true,
        subscriptionId: subscription.id,
        planId: plan.id,
        planName: plan.name,
        subscriberType: subscription.subscriberType as any,
        serviceType,
        nominalPrice,
        coveredAmount: nominalPrice,
        patientCopayAmount: 0,
        discountPercentage: 100,
        isFullyCovered: true,
        remainingQuota: isUnlimited ? -1 : remainingQuota,
        totalQuota: isUnlimited ? -1 : totalQuota,
        usedQuota,
        message: `100% Covered by ${plan.name} (${isUnlimited ? "Unlimited" : `${remainingQuota} remaining in period`}).`,
      };
    }

    // Quota exhausted -> apply discount percentage if configured
    if (discountPercent > 0) {
      const discountAmount = Math.round(((nominalPrice * discountPercent) / 100) * 100) / 100;
      const copayAmount = Math.max(0, nominalPrice - discountAmount);

      return {
        hasActiveSubscription: true,
        subscriptionId: subscription.id,
        planId: plan.id,
        planName: plan.name,
        subscriberType: subscription.subscriberType as any,
        serviceType,
        nominalPrice,
        coveredAmount: discountAmount,
        patientCopayAmount: copayAmount,
        discountPercentage: discountPercent,
        isFullyCovered: false,
        remainingQuota: 0,
        totalQuota,
        usedQuota,
        message: `Quota exhausted. ${discountPercent}% Subscriber Discount applied.`,
      };
    }

    // No coverage or discount for this serviceType
    return {
      hasActiveSubscription: true,
      subscriptionId: subscription.id,
      planId: plan.id,
      planName: plan.name,
      subscriberType: subscription.subscriberType as any,
      serviceType,
      nominalPrice,
      coveredAmount: 0,
      patientCopayAmount: nominalPrice,
      discountPercentage: 0,
      isFullyCovered: false,
      remainingQuota: 0,
      totalQuota,
      usedQuota,
      message: `Service not covered in current plan tier. Standard rate applies.`,
    };
  } catch (error) {
    console.error("Error evaluating entitlement:", error);
    return {
      hasActiveSubscription: false,
      serviceType,
      nominalPrice,
      coveredAmount: 0,
      patientCopayAmount: nominalPrice,
      discountPercentage: 0,
      isFullyCovered: false,
      remainingQuota: 0,
      totalQuota: 0,
      usedQuota: 0,
      message: "Entitlement check error. Defaulting to standard pricing.",
    };
  }
}

/**
 * Records consumed quota in the subscription ledger once an encounter, lab, or prescription is fulfilled.
 */
export async function recordSubscriptionUsage(params: {
  tenantId: string;
  subscriptionId: string;
  patientId: string;
  serviceType: "consultation" | "lab_test" | "medication" | "procedure" | "telehealth" | "physiotherapy";
  serviceId?: string;
  quantity?: number;
  nominalPrice: number;
  coveredAmount: number;
  patientCopayAmount?: number;
  periodStart: Date;
  periodEnd: Date;
}) {
  return await db.insert(subscriptionUsage).values({
    tenantId: params.tenantId,
    subscriptionId: params.subscriptionId,
    patientId: params.patientId,
    serviceType: params.serviceType,
    serviceId: params.serviceId,
    quantity: params.quantity || 1,
    nominalPrice: params.nominalPrice.toString(),
    coveredAmount: params.coveredAmount.toString(),
    patientCopayAmount: (params.patientCopayAmount || 0).toString(),
    billingPeriodStart: params.periodStart,
    billingPeriodEnd: params.periodEnd,
  }).returning();
}
