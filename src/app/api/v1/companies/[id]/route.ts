import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  companies,
  subscriptions,
  subscriptionPlans,
  subscriptionMembers,
  companyEmployeeInvitations,
  patients,
  subscriptionInvoices,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, params.id));

    if (!company) {
      return NextResponse.json({ success: false, error: "Company not found" }, { status: 404 });
    }

    const [activeSub] = await db
      .select({
        subscription: subscriptions,
        plan: subscriptionPlans,
      })
      .from(subscriptions)
      .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
      .where(eq(subscriptions.companyId, params.id))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);

    let employees: any[] = [];
    let invoices: any[] = [];
    if (activeSub) {
      employees = await db
        .select({
          member: subscriptionMembers,
          patient: patients,
        })
        .from(subscriptionMembers)
        .innerJoin(patients, eq(subscriptionMembers.patientId, patients.id))
        .where(eq(subscriptionMembers.subscriptionId, activeSub.subscription.id));

      invoices = await db
        .select()
        .from(subscriptionInvoices)
        .where(eq(subscriptionInvoices.subscriptionId, activeSub.subscription.id))
        .orderBy(desc(subscriptionInvoices.createdAt));
    }

    const invitations = await db
      .select()
      .from(companyEmployeeInvitations)
      .where(eq(companyEmployeeInvitations.companyId, params.id))
      .orderBy(desc(companyEmployeeInvitations.createdAt));

    return NextResponse.json({
      success: true,
      data: {
        company,
        subscription: activeSub || null,
        employees,
        invitations,
        invoices,
        stats: {
          totalSeats: activeSub?.subscription.seatCount || 0,
          usedSeats: employees.length,
          pendingInvites: invitations.filter((i) => i.status === "pending").length,
          availableSeats: Math.max(
            0,
            (activeSub?.subscription.seatCount || 0) - employees.length - invitations.filter((i) => i.status === "pending").length
          ),
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
