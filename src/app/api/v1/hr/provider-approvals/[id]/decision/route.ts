import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { providerProfiles, providerSchedules, notifications, auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";
const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

// POST /api/v1/hr/provider-approvals/[id]/decision
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { action, feedback, reviewerId } = body;

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json({ success: false, error: "Action must be 'approve' or 'reject'" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(providerProfiles)
      .where(eq(providerProfiles.id, params.id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ success: false, error: "Profile not found" }, { status: 404 });
    }

    const newStatus = action === "approve" ? "approved" : "rejected";

    const [updated] = await db
      .update(providerProfiles)
      .set({
        approvalStatus: newStatus,
        licenseVerified: action === "approve" ? true : existing.licenseVerified,
        hrFeedback: feedback || (action === "approve" ? "Approved by HR." : "Changes requested by HR."),
        hrReviewerId: reviewerId || null,
        approvedAt: action === "approve" ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(providerProfiles.id, params.id))
      .returning();

    // If approved, also approve all associated weekly schedules
    if (action === "approve") {
      await db
        .update(providerSchedules)
        .set({ isApprovedByHr: true })
        .where(eq(providerSchedules.providerId, existing.userId));
    }

    // Notify Provider of HR Decision
    try {
      await db.insert(notifications).values({
        organizationId: DEFAULT_TENANT_ID,
        recipientUserId: existing.userId,
        senderUserId: reviewerId || "00000000-0000-0000-0000-000000000001",
        type: "system_alert",
        title: action === "approve" ? "✅ Profile & Schedule Approved by HR" : "⚠️ HR Requested Changes on Profile",
        body: action === "approve"
          ? "Your clinical profile, services, and weekly availability are now active and publicly bookable for patients."
          : `HR requested revisions on your submission: "${feedback || "Please review license credentials or schedule buffers."}"`,
        actionUrl: "/provider/profile",
        priority: "high",
      });
    } catch { }

    // Audit Log
    try {
      await db.insert(auditLogs).values({
        tenantId: DEFAULT_TENANT_ID,
        action: action === "approve" ? "HR_APPROVED_PROVIDER_PROFILE" : "HR_REJECTED_PROVIDER_PROFILE",
        entityType: "provider_profiles",
        entityId: updated.id,
        summary: `HR ${action} provider profile ${updated.id}. Feedback: ${feedback || "N/A"}`,
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      });
    } catch { }

    return NextResponse.json({
      success: true,
      message: `Provider profile ${action}d successfully.`,
      data: updated,
    });
  } catch (error: any) {
    console.error("POST HR approval decision error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to process decision" }, { status: 500 });
  }
}
