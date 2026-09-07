import { NextRequest, NextResponse } from "next/server";
import { SubscriptionService } from "@/lib/services/subscription-service";
import { db } from "@/db";
import {
  companies,
  subscriptions,
  subscriptionMembers,
  companyEmployeeInvitations,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { email, phone, employeeIdNumber, department } = body;

    if (!email) {
      return NextResponse.json({ success: false, error: "Employee email is required" }, { status: 400 });
    }

    // Check company exists
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, params.id));

    if (!company) {
      return NextResponse.json({ success: false, error: "Company not found" }, { status: 404 });
    }

    // Check seat capacity
    const [activeSub] = await db
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.companyId, params.id), eq(subscriptions.status, "active")));

    if (!activeSub) {
      return NextResponse.json({ success: false, error: "No active company subscription found" }, { status: 400 });
    }

    const currentMembers = await db
      .select()
      .from(subscriptionMembers)
      .where(and(eq(subscriptionMembers.subscriptionId, activeSub.id), eq(subscriptionMembers.isActive, true)));

    const pendingInvites = await db
      .select()
      .from(companyEmployeeInvitations)
      .where(and(eq(companyEmployeeInvitations.companyId, params.id), eq(companyEmployeeInvitations.status, "pending")));

    if (currentMembers.length + pendingInvites.length >= activeSub.seatCount) {
      return NextResponse.json(
        {
          success: false,
          error: `Seat capacity reached (${activeSub.seatCount} seats allocated). Please upgrade your subscription to add more seats.`,
        },
        { status: 400 }
      );
    }

    const invitation = await SubscriptionService.inviteEmployee({
      companyId: params.id,
      email,
      phone,
      employeeIdNumber,
      department,
    });

    return NextResponse.json({
      success: true,
      data: invitation,
      message: `Invitation generated for ${email}. Token: ${invitation.token}`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
