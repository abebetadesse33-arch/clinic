import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { patientAssignments, cases } from "@/db/schema";
import { eq } from "drizzle-orm";
import { RealtimeBroadcaster } from "@/lib/services/realtime-broadcaster";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json().catch(() => ({}));
    const { reason = "Provider unavailable / workload limit reached" } = body;

    const [assignment] = await db
      .update(patientAssignments)
      .set({
        status: "declined",
        notes: reason,
        updatedAt: new Date(),
      })
      .where(eq(patientAssignments.id, id))
      .returning();

    if (!assignment) {
      return NextResponse.json(
        { success: false, error: "Assignment not found" },
        { status: 404 }
      );
    }

    // Alert Care Coordinator for reassignment
    await RealtimeBroadcaster.broadcast({
      organizationId: assignment.tenantId,
      targetRole: "care_coordinator",
      eventType: "assignment.declined",
      title: "⚠️ Provider Declined Assignment",
      body: `Clinician declined case. Reason: "${reason}". Automated re-routing required.`,
      priority: "high",
    });

    return NextResponse.json({
      success: true,
      data: assignment,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to decline assignment" },
      { status: 500 }
    );
  }
}
