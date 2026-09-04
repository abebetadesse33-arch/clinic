import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { referrals, patients, users } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const [found] = await db
      .select({
        id: referrals.id,
        organizationId: referrals.organizationId,
        patientId: referrals.patientId,
        patientFirstName: patients.firstName,
        patientLastName: patients.lastName,
        patientMrn: patients.mrn,
        type: referrals.type,
        source: referrals.source,
        referringUserId: referrals.referringUserId,
        referringRole: referrals.referringRole,
        receivingRole: referrals.receivingRole,
        receivingUserId: referrals.receivingUserId,
        priority: referrals.priority,
        status: referrals.status,
        clinicalReason: referrals.clinicalReason,
        clinicalSummary: referrals.clinicalSummary,
        notes: referrals.notes,
        insuranceAuthNumber: referrals.insuranceAuthNumber,
        scheduledAppointmentId: referrals.scheduledAppointmentId,
        dueBy: referrals.dueBy,
        acceptedAt: referrals.acceptedAt,
        completedAt: referrals.completedAt,
        responseNotes: referrals.responseNotes,
        createdAt: referrals.createdAt,
        updatedAt: referrals.updatedAt,
      })
      .from(referrals)
      .leftJoin(patients, eq(referrals.patientId, patients.id))
      .where(eq(referrals.id, id))
      .limit(1);

    if (!found) {
      return NextResponse.json({ success: false, error: "Referral not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...found,
        patientName: `${found.patientFirstName || ""} ${found.patientLastName || ""}`.trim() || "Patient",
        referringUserName: "Care Physician",
        receivingUserName: "Assigned Specialist",
      },
    });
  } catch (error: any) {
    console.error("Error fetching referral:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch referral" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { status, responseNotes, scheduledDate, performedBy, performerRole } = body;

    const now = new Date();

    const [existing] = await db.select().from(referrals).where(eq(referrals.id, id)).limit(1);

    const existingDetails = (existing?.attachedDataRefs as any) || {};
    const updatedDetails = {
      ...existingDetails,
      ...(status === "accepted" || status === "approved"
        ? {
            approvedBy: performedBy || "Ward Attending Specialist",
            approvedRole: performerRole || "Specialist",
            approvedAt: now.toISOString(),
            approvalNotes: responseNotes || null,
          }
        : {}),
    };

    const [updated] = await db
      .update(referrals)
      .set({
        status: status || undefined,
        responseNotes: responseNotes || undefined,
        scheduledAppointmentId: scheduledDate || undefined,
        attachedDataRefs: updatedDetails as any,
        updatedAt: now,
        ...(status === "accepted" || status === "approved" ? { acceptedAt: now } : {}),
        ...(status === "completed" ? { completedAt: now } : {}),
      })
      .where(eq(referrals.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    console.error("Error updating referral:", error);
    return NextResponse.json({ success: false, error: "Failed to update referral" }, { status: 500 });
  }
}
