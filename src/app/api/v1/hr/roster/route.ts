import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { dutyRosters, staffShifts, staffProfiles, users } from "@/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET /api/v1/hr/roster?department=&startDate=&endDate=
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const department = searchParams.get("department");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const rosters = await db
      .select()
      .from(dutyRosters)
      .where(
        department
          ? and(eq(dutyRosters.isActive, true), eq(dutyRosters.department, department))
          : eq(dutyRosters.isActive, true)
      )
      .orderBy(dutyRosters.department);

    // Fetch shifts for each roster
    const allShifts = await db
      .select({
        id: staffShifts.id,
        rosterId: staffShifts.rosterId,
        staffId: staffShifts.staffId,
        shiftDate: staffShifts.shiftDate,
        status: staffShifts.status,
        swapStatus: staffShifts.swapStatus,
        notes: staffShifts.notes,
        fullName: users.fullName,
        designation: staffProfiles.designation,
        employeeCode: staffProfiles.employeeCode,
      })
      .from(staffShifts)
      .innerJoin(staffProfiles, eq(staffShifts.staffId, staffProfiles.id))
      .innerJoin(users, eq(staffProfiles.userId, users.id))
      .orderBy(staffShifts.shiftDate);

    return NextResponse.json({
      success: true,
      data: { rosters, shifts: allShifts },
    });
  } catch (error: any) {
    console.error("[HR ROSTER GET]", error);
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}

// POST /api/v1/hr/roster — create roster or assign shift
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "create_roster") {
      const { tenantId, department, shiftName, shiftTemplate, startTime, endTime,
        requiredDoctors, requiredNurses, requiredSupportStaff, createdBy } = body;

      const [roster] = await db
        .insert(dutyRosters)
        .values({
          tenantId, department, shiftName, shiftTemplate: shiftTemplate || "morning",
          startTime, endTime,
          requiredDoctors: requiredDoctors || 1,
          requiredNurses: requiredNurses || 2,
          requiredSupportStaff: requiredSupportStaff || 1,
          createdBy,
        })
        .returning();
      return NextResponse.json({ success: true, data: roster }, { status: 201 });
    }

    if (action === "assign_shift") {
      let { rosterId, staffId, shiftDate, department, shiftTemplate = "morning", notes } = body;

      if (!staffId || !shiftDate) {
        return NextResponse.json({ success: false, error: "staffId and shiftDate are required." }, { status: 400 });
      }

      // If rosterId not explicitly provided, resolve or create
      if (!rosterId) {
        // If department not provided, get from staff profile
        if (!department) {
          const [staff] = await db.select({ department: staffProfiles.department }).from(staffProfiles).where(eq(staffProfiles.id, staffId)).limit(1);
          department = staff?.department || "General Outpatient";
        }

        const [existingRoster] = await db
          .select()
          .from(dutyRosters)
          .where(
            and(
              eq(dutyRosters.department, department),
              eq(dutyRosters.shiftTemplate, shiftTemplate)
            )
          )
          .limit(1);

        if (existingRoster) {
          rosterId = existingRoster.id;
        } else {
          const timeMap: Record<string, { start: string; end: string }> = {
            morning: { start: "07:00", end: "15:00" },
            evening: { start: "15:00", end: "23:00" },
            night: { start: "23:00", end: "07:00" },
            on_call_24h: { start: "00:00", end: "23:59" },
            ward_rounds: { start: "08:00", end: "12:00" },
          };
          const times = timeMap[shiftTemplate] || { start: "08:00", end: "16:00" };
          const [newRoster] = await db
            .insert(dutyRosters)
            .values({
              tenantId: "00000000-0000-0000-0000-000000000001",
              department,
              shiftName: `${department} ${shiftTemplate.replace(/_/g, " ")}`,
              shiftTemplate: shiftTemplate as any,
              startTime: times.start,
              endTime: times.end,
              requiredDoctors: 1,
              requiredNurses: 2,
              requiredSupportStaff: 1,
              createdBy: "11111111-1111-1111-1111-111111111101",
            })
            .returning();
          rosterId = newRoster.id;
        }
      }

      const [shift] = await db
        .insert(staffShifts)
        .values({
          rosterId,
          staffId,
          shiftDate,
          status: "scheduled",
          swapStatus: "none",
          notes: notes || null,
        })
        .returning();

      return NextResponse.json({ success: true, data: shift, message: "Shift assigned successfully." }, { status: 201 });
    }

    if (action === "request_swap") {
      const { shiftId, swapRequestedWithStaffId } = body;
      const [updated] = await db
        .update(staffShifts)
        .set({ swapStatus: "requested", swapRequestedWithStaffId })
        .where(eq(staffShifts.id, shiftId))
        .returning();
      return NextResponse.json({ success: true, data: updated });
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    console.error("[HR ROSTER POST]", error);
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}

// PUT /api/v1/hr/roster — approve/reject shift swap
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { shiftId, swapDecision, approvedBy } = body;

    if (!shiftId || !swapDecision) {
      return NextResponse.json({ success: false, error: "shiftId and swapDecision required" }, { status: 400 });
    }

    const [updated] = await db
      .update(staffShifts)
      .set({
        swapStatus: swapDecision === "approve" ? "approved" : "rejected",
        swapApprovedBy: approvedBy || null,
        swapApprovedAt: swapDecision === "approve" ? new Date() : null,
      })
      .where(eq(staffShifts.id, shiftId))
      .returning();

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("[HR ROSTER PUT]", error);
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}
