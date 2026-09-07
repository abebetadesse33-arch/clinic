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

    const [assignment] = await db
      .update(patientAssignments)
      .set({
        status: "accepted",
        acceptedAt: new Date(),
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

    // Notify Patient
    await RealtimeBroadcaster.broadcast({
      organizationId: assignment.tenantId,
      patientId: assignment.patientId,
      eventType: "provider.accepted",
      title: "Doctor Accepted Your Request",
      body: "Your assigned clinician has accepted the clinical case and is preparing for your consultation.",
      priority: "high",
    });

    return NextResponse.json({
      success: true,
      data: assignment,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to accept assignment" },
      { status: 500 }
    );
  }
}
