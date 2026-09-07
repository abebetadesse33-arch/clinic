import { db } from "@/db";
import {
  subscriptionPlans,
  subscriptions,
  familyGroups,
  familyMembers,
  companies,
  companyAdmins,
  companyEmployeeInvitations,
  subscriptionMembers,
  subscriptionInvoices,
} from "@/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import crypto from "crypto";

export interface CreatePlanDTO {
  tenantId: string;
  name: string;
  slug: string;
  description?: string;
  type: "individual" | "family" | "company";
  billingCycle: "monthly" | "quarterly" | "yearly";
  basePrice: number;
  currency?: string;
  maxMembers?: number;
  additionalMemberPrice?: number;
  includedServices: {
    consultations?: number; // -1 for unlimited
    labTests?: number;
    medications?: number;
    physiotherapy?: number;
    discountPercent?: number;
    coveredCategories?: string[];
  };
  trialPeriodDays?: number;
}

export class SubscriptionService {
  /**
   * 1. PLAN MANAGEMENT
   */
  static async createPlan(data: CreatePlanDTO) {
    const [plan] = await db
      .insert(subscriptionPlans)
      .values({
        tenantId: data.tenantId,
        name: data.name,
        slug: data.slug,
        description: data.description,
        type: data.type,
        billingCycle: data.billingCycle,
        basePrice: data.basePrice.toString(),
        currency: data.currency || "ETB",
        maxMembers: data.maxMembers,
        additionalMemberPrice: (data.additionalMemberPrice || 0).toString(),
        includedServices: data.includedServices as any,
        trialPeriodDays: data.trialPeriodDays || 0,
        isActive: true,
        version: 1,
      })
      .returning();
    return plan;
  }

  static async listPlans(tenantId: string, filterType?: "individual" | "family" | "company") {
    const conditions = [eq(subscriptionPlans.tenantId, tenantId), eq(subscriptionPlans.isActive, true)];
    if (filterType) {
      conditions.push(eq(subscriptionPlans.type, filterType));
    }
    return await db.select().from(subscriptionPlans).where(and(...conditions)).orderBy(desc(subscriptionPlans.createdAt));
  }

  /**
   * 2. FAMILY GROUP ENROLLMENT & MANAGEMENT
   */
  static async createFamilySubscription(params: {
    tenantId: string;
    primaryPatientId: string;
    familyName: string;
    planId: string;
    paymentMethod?: "telebirr" | "chapa" | "bank_transfer";
  }) {
    // 1. Create or retrieve Family Group
    const [familyGroup] = await db
      .insert(familyGroups)
      .values({
        tenantId: params.tenantId,
        primaryPatientId: params.primaryPatientId,
        name: params.familyName,
      })
      .returning();

    // 2. Add Primary Patient to Family Members
    await db.insert(familyMembers).values({
      familyGroupId: familyGroup.id,
      patientId: params.primaryPatientId,
      relationship: "primary",
      isActive: true,
      canViewSharedBilling: true,
    });

    // 3. Get Plan to establish billing dates & price
    const [plan] = await db
      .select()
      .from(subscriptionPlans)
      .where(and(eq(subscriptionPlans.id, params.planId), eq(subscriptionPlans.tenantId, params.tenantId)));

    if (!plan) throw new Error("Subscription plan not found");

    const now = new Date();
    const periodEnd = new Date(now);
    if (plan.billingCycle === "yearly") {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else if (plan.billingCycle === "quarterly") {
      periodEnd.setMonth(periodEnd.getMonth() + 3);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    // 4. Create Active Subscription
    const [sub] = await db
      .insert(subscriptions)
      .values({
        tenantId: params.tenantId,
        planId: plan.id,
        subscriberType: "family",
        familyGroupId: familyGroup.id,
        seatCount: plan.maxMembers || 4,
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
      })
      .returning();

    // 5. Generate Initial Subscription Invoice
    const invoiceNumber = `INV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const [invoice] = await db
      .insert(subscriptionInvoices)
      .values({
        tenantId: params.tenantId,
        subscriptionId: sub.id,
        invoiceNumber,
        periodStart: now,
        periodEnd,
        baseAmount: plan.basePrice,
        additionalSeatsAmount: "0",
        discountAmount: "0",
        taxAmount: "0",
        totalAmount: plan.basePrice,
        currency: plan.currency,
        status: "open",
        paymentMethod: params.paymentMethod || "telebirr",
        dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days grace
      })
      .returning();

    return { familyGroup, subscription: sub, invoice };
  }

  static async addFamilyDependent(params: {
    tenantId: string;
    familyGroupId: string;
    patientId: string;
    relationship: "spouse" | "child" | "parent" | "other";
  }) {
    // Check max members allowed in active plan
    const [familySub] = await db
      .select({
        subscription: subscriptions,
        plan: subscriptionPlans,
      })
      .from(subscriptions)
      .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
      .where(and(eq(subscriptions.familyGroupId, params.familyGroupId), eq(subscriptions.tenantId, params.tenantId)));

    if (familySub && familySub.plan.maxMembers) {
      const currentMembers = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(familyMembers)
        .where(and(eq(familyMembers.familyGroupId, params.familyGroupId), eq(familyMembers.isActive, true)));

      if ((currentMembers[0]?.count || 0) >= familySub.plan.maxMembers) {
        throw new Error(`Plan limit reached (Max ${familySub.plan.maxMembers} family members). Please upgrade plan.`);
      }
    }

    const [member] = await db
      .insert(familyMembers)
      .values({
        familyGroupId: params.familyGroupId,
        patientId: params.patientId,
        relationship: params.relationship,
        isActive: true,
      })
      .returning();

    return member;
  }

  /**
   * 3. CORPORATE COMPANY MANAGEMENT
   */
  static async createCompanySubscription(params: {
    tenantId: string;
    name: string;
    tinNumber?: string;
    industry?: string;
    contactPerson: string;
    email: string;
    phone: string;
    planId: string;
    seatCount: number;
    billingAddress?: string;
    adminUserId: string;
  }) {
    // 1. Create Company
    const [company] = await db
      .insert(companies)
      .values({
        tenantId: params.tenantId,
        name: params.name,
        tinNumber: params.tinNumber,
        industry: params.industry,
        contactPerson: params.contactPerson,
        email: params.email,
        phone: params.phone,
        billingAddress: params.billingAddress,
        preferredPaymentMethod: "bank_transfer",
      })
      .returning();

    // 2. Link HR Admin User
    await db.insert(companyAdmins).values({
      companyId: company.id,
      userId: params.adminUserId,
      role: "owner",
    });

    // 3. Plan & Pricing calculation
    const [plan] = await db
      .select()
      .from(subscriptionPlans)
      .where(and(eq(subscriptionPlans.id, params.planId), eq(subscriptionPlans.tenantId, params.tenantId)));

    if (!plan) throw new Error("Plan not found");

    const now = new Date();
    const periodEnd = new Date(now);
    if (plan.billingCycle === "yearly") {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    const basePrice = Number(plan.basePrice);
    const additionalMemberPrice = Number(plan.additionalMemberPrice || 0);
    const baseSeats = plan.maxMembers || 10;
    const extraSeats = Math.max(0, params.seatCount - baseSeats);
    const totalAmount = basePrice + extraSeats * additionalMemberPrice;

    // 4. Create Subscription
    const [sub] = await db
      .insert(subscriptions)
      .values({
        tenantId: params.tenantId,
        planId: plan.id,
        subscriberType: "company",
        companyId: company.id,
        seatCount: params.seatCount,
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      })
      .returning();

    // 5. Generate Pro-Forma Invoice for Corporate Client
    const invoiceNumber = `CORP-INV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const [invoice] = await db
      .insert(subscriptionInvoices)
      .values({
        tenantId: params.tenantId,
        subscriptionId: sub.id,
        invoiceNumber,
        periodStart: now,
        periodEnd,
        baseAmount: basePrice.toString(),
        additionalSeatsAmount: (extraSeats * additionalMemberPrice).toString(),
        discountAmount: "0",
        taxAmount: "0",
        totalAmount: totalAmount.toString(),
        currency: plan.currency,
        status: "open",
        paymentMethod: "bank_transfer",
        dueDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000), // 15 days for corporate
      })
      .returning();

    return { company, subscription: sub, invoice };
  }

  static async inviteEmployee(params: {
    companyId: string;
    email: string;
    phone?: string;
    employeeIdNumber?: string;
    department?: string;
  }) {
    const token = crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days valid

    const [invitation] = await db
      .insert(companyEmployeeInvitations)
      .values({
        companyId: params.companyId,
        email: params.email,
        phone: params.phone,
        employeeIdNumber: params.employeeIdNumber,
        department: params.department,
        token,
        expiresAt,
        status: "pending",
      })
      .returning();

    return invitation;
  }

  static async claimEmployeeInvitation(params: {
    token: string;
    patientId: string;
  }) {
    const [invitation] = await db
      .select()
      .from(companyEmployeeInvitations)
      .where(
        and(
          eq(companyEmployeeInvitations.token, params.token),
          eq(companyEmployeeInvitations.status, "pending")
        )
      );

    if (!invitation) throw new Error("Invalid or expired invitation token");
    if (new Date() > invitation.expiresAt) {
      await db
        .update(companyEmployeeInvitations)
        .set({ status: "expired" })
        .where(eq(companyEmployeeInvitations.id, invitation.id));
      throw new Error("Invitation has expired");
    }

    // Find active company subscription
    const [companySub] = await db
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.companyId, invitation.companyId), eq(subscriptions.status, "active")));

    if (!companySub) throw new Error("Company does not have an active subscription");

    // Add to subscription members
    const [member] = await db
      .insert(subscriptionMembers)
      .values({
        subscriptionId: companySub.id,
        patientId: params.patientId,
        role: "employee",
        department: invitation.department,
        employeeIdNumber: invitation.employeeIdNumber,
        isActive: true,
      })
      .returning();

    // Mark invitation accepted
    await db
      .update(companyEmployeeInvitations)
      .set({ status: "accepted", claimedPatientId: params.patientId })
      .where(eq(companyEmployeeInvitations.id, invitation.id));

    return member;
  }
}
