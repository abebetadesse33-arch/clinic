import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { leaveRequests, staffProfiles, users } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET /api/v1/hr/leave?staffId=&status=&tenantId=
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const staffId = searchParams.get("staffId");
    const status = searchParams.get("status");
    const tenantId = searchParams.get("tenantId");

    const data = await db
      .select({
        id: leaveRequests.id,
        staffId: leaveRequests.staffId,
        leaveType: leaveRequests.leaveType,
        startDate: leaveRequests.startDate,
        endDate: leaveRequests.endDate,
        totalDays: leaveRequests.totalDays,
        reason: leaveRequests.reason,
        status: leaveRequests.status,
        rejectionReason: leaveRequests.rejectionReason,
        hodApprovedAt: leaveRequests.hodApprovedAt,
        hrApprovedAt: leaveRequests.hrApprovedAt,
        createdAt: leaveRequests.createdAt,
        fullName: users.fullName,
        employeeCode: staffProfiles.employeeCode,
        department: staffProfiles.department,
        designation: staffProfiles.designation,
      })
      .from(leaveRequests)
      .innerJoin(staffProfiles, eq(leaveRequests.staffId, staffProfiles.id))
      .innerJoin(users, eq(staffProfiles.userId, users.id))
      .where(
        staffId ? eq(leaveRequests.staffId, staffId) :
        tenantId ? eq(leaveRequests.tenantId, tenantId) : undefined
      )
      .orderBy(desc(leaveRequests.createdAt));

    const filtered = status ? data.filter((l) => l.status === status) : data;
    return NextResponse.json({ success: true, data: filtered });
  } catch (error: any) {
    console.error("[HR LEAVE GET]", error);
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}

// POST /api/v1/hr/leave — submit a new leave request
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { staffId, tenantId, leaveType, startDate, endDate, totalDays, reason, supportingDocumentUrl } = body;

    if (!staffId || !tenantId || !leaveType || !startDate || !endDate || !totalDays || !reason) {
      return NextResponse.json({ success: false, error: "Missing required fields." }, { status: 400 });
    }

    const [newLeave] = await db
      .insert(leaveRequests)
      .values({
        staffId, tenantId, leaveType, startDate, endDate,
        totalDays: Number(totalDays),
        reason,
        supportingDocumentUrl: supportingDocumentUrl || null,
        status: "pending",
      })
      .returning();

    return NextResponse.json({ success: true, data: newLeave }, { status: 201 });
  } catch (error: any) {
    console.error("[HR LEAVE POST]", error);
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}

// PATCH /api/v1/hr/leave — HOD or HR approve/reject
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { leaveId, action, approvedBy, rejectionReason } = body;

    if (!leaveId || !action) {
      return NextResponse.json({ success: false, error: "leaveId and action are required." }, { status: 400 });
    }

    let updateData: any = { updatedAt: new Date() };

    if (action === "approve_hod") {
      updateData.status = "approved_by_hod";
      updateData.hodApprovedBy = approvedBy;
      updateData.hodApprovedAt = new Date();
    } else if (action === "approve_hr") {
      updateData.status = "approved_by_hr";
      updateData.hrApprovedBy = approvedBy;
      updateData.hrApprovedAt = new Date();
    } else if (action === "reject") {
      updateData.status = "rejected";
      updateData.rejectionReason = rejectionReason || "Not specified";
    } else if (action === "cancel") {
      updateData.status = "cancelled";
    } else {
      return NextResponse.json({ success: false, error: "Invalid action." }, { status: 400 });
    }

    const [updated] = await db
      .update(leaveRequests)
      .set(updateData)
      .where(eq(leaveRequests.id, leaveId))
      .returning();

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("[HR LEAVE PATCH]", error);
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}
