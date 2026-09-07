import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { subscriptions, subscriptionMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; patientId: string } }
) {
  try {
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.companyId, params.id), eq(subscriptions.status, "active")));

    if (!sub) {
      return NextResponse.json({ success: false, error: "Active company subscription not found" }, { status: 404 });
    }

    const [removed] = await db
      .update(subscriptionMembers)
      .set({ isActive: false, removedAt: new Date() })
      .where(
        and(
          eq(subscriptionMembers.subscriptionId, sub.id),
          eq(subscriptionMembers.patientId, params.patientId)
        )
      )
      .returning();

    return NextResponse.json({
      success: true,
      data: removed,
      message: "Employee seat successfully released and coverage terminated",
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
