import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  companies,
  subscriptions,
  subscriptionMembers,
  subscriptionUsage,
} from "@/db/schema";
import { eq, and, sql, gte, lte } from "drizzle-orm";

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
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.companyId, params.id), eq(subscriptions.status, "active")));

    if (!activeSub) {
      return NextResponse.json({
        success: true,
        data: {
          summary: { totalClaims: 0, totalCoveredValueETB: 0, activeEmployees: 0 },
          serviceBreakdown: [],
          departmentBreakdown: [],
        },
      });
    }

    // Aggregated service type breakdown (Privacy safe: no patient names or diagnoses)
    const serviceBreakdown = await db
      .select({
        serviceType: subscriptionUsage.serviceType,
        totalQuantity: sql<number>`SUM(${subscriptionUsage.quantity})::int`,
        totalCoveredAmount: sql<number>`SUM(${subscriptionUsage.coveredAmount})::numeric`,
        totalCopayAmount: sql<number>`SUM(${subscriptionUsage.patientCopayAmount})::numeric`,
      })
      .from(subscriptionUsage)
      .where(eq(subscriptionUsage.subscriptionId, activeSub.id))
      .groupBy(subscriptionUsage.serviceType);

    // Active employees count
    const [empCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(subscriptionMembers)
      .where(and(eq(subscriptionMembers.subscriptionId, activeSub.id), eq(subscriptionMembers.isActive, true)));

    // Totals
    const totalClaims = serviceBreakdown.reduce((acc, curr) => acc + (curr.totalQuantity || 0), 0);
    const totalCoveredValueETB = serviceBreakdown.reduce(
      (acc, curr) => acc + Number(curr.totalCoveredAmount || 0),
      0
    );

    return NextResponse.json({
      success: true,
      data: {
        companyName: company.name,
        periodStart: activeSub.currentPeriodStart,
        periodEnd: activeSub.currentPeriodEnd,
        summary: {
          totalClaims,
          totalCoveredValueETB: Math.round(totalCoveredValueETB * 100) / 100,
          activeEmployees: empCount?.count || 0,
          totalSeats: activeSub.seatCount,
        },
        serviceBreakdown,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
