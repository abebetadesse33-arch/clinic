import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { leaveRequests, staffProfiles, users } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { insertReturning, updateReturning } from "@/lib/db/returning";
import { requireRoles, requireAdminUser, STAFF_ROLES } from "@/lib/security/auth-session";
import { resolveStaffScope } from "@/lib/security/staff-scope";

export const dynamic = "force-dynamic";

// GET /api/v1/hr/leave?staffId=&status=&tenantId=
export async function GET(req: NextRequest) {
  const auth = await requireRoles(req, STAFF_ROLES);
  if ("response" in auth) return auth.response;

  try {
    const { searchParams } = req.nextUrl;
    const scope = await resolveStaffScope(auth.user, searchParams.get("staffId"));
    if ("response" in scope) return scope.response;
    const staffId = scope.staffId;
    const status = searchParams.get("status");
    const tenantId = auth.user.organizationId;

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
  const auth = await requireRoles(req, STAFF_ROLES);
  if ("response" in auth) return auth.response;

  try {
    const body = await req.json();
    const scope = await resolveStaffScope(auth.user, body.staffId);
    if ("response" in scope) return scope.response;
    const staffId = scope.staffId;
    const tenantId = auth.user.organizationId;
    const { leaveType, startDate, endDate, totalDays, reason, supportingDocumentUrl } = body;

    if (!staffId || !tenantId || !leaveType || !startDate || !endDate || !totalDays || !reason) {
      return NextResponse.json({ success: false, error: "Missing required fields." }, { status: 400 });
    }

    const [newLeave] = await insertReturning(db, leaveRequests, {
        staffId, tenantId, leaveType, startDate, endDate,
        totalDays: Number(totalDays),
        reason,
        supportingDocumentUrl: supportingDocumentUrl || null,
        status: "pending",
      });

    return NextResponse.json({ success: true, data: newLeave }, { status: 201 });
  } catch (error: any) {
    console.error("[HR LEAVE POST]", error);
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}

// PATCH /api/v1/hr/leave — HOD or HR approve/reject
export async function PATCH(req: NextRequest) {
  const auth = await requireAdminUser(req);
  if ("response" in auth) return auth.response;

  try {
    const body = await req.json();
    const { leaveId, action, rejectionReason } = body;
    const approvedBy = auth.user.id;

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

    const [updated] = await updateReturning(db, leaveRequests, updateData, eq(leaveRequests.id, leaveId));

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("[HR LEAVE PATCH]", error);
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}
