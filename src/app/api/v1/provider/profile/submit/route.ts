import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { providerProfiles, notifications, users, auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";
const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

// POST /api/v1/provider/profile/submit
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId is required" }, { status: 400 });
    }

    const [updated] = await db
      .update(providerProfiles)
      .set({
        approvalStatus: "pending_hr",
        submittedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(providerProfiles.userId, userId))
      .returning();

    if (!updated) {
      return NextResponse.json({ success: false, error: "Provider profile not found" }, { status: 404 });
    }

    const [providerUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    // Notify HR / Admins
    const hrUsers = await db.select({ id: users.id }).from(users).where(eq(users.role, "system_admin"));
    for (const hr of hrUsers) {
      try {
        await db.insert(notifications).values({
          organizationId: DEFAULT_TENANT_ID,
          recipientUserId: hr.id,
          senderUserId: userId,
          type: "system_alert",
          title: "📋 New Provider Profile Submitted for Review",
          body: `Clinician ${providerUser?.fullName || "Staff Member"} has submitted profile details and weekly schedule availability for HR approval.`,
          actionUrl: "/admin/hr/approvals",
          priority: "high",
        });
      } catch { }
    }

    await db.insert(auditLogs).values({
      tenantId: DEFAULT_TENANT_ID,
      action: "PROVIDER_PROFILE_SUBMITTED_FOR_APPROVAL",
      entityType: "provider_profiles",
      entityId: updated.id,
      summary: `Provider ${userId} submitted updated profile and schedule to HR queue.`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({
      success: true,
      message: "Profile and schedule submitted to HR queue for review.",
      data: updated,
    });
  } catch (error: any) {
    console.error("POST submit provider profile error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to submit profile" }, { status: 500 });
  }
}
