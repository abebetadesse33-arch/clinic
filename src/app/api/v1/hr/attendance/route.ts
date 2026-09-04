import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { staffAttendance, staffProfiles, users } from "@/db/schema";
import { eq, desc, and, gte, lte } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET /api/v1/hr/attendance?staffId=&date=&startDate=&endDate=
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const staffId = searchParams.get("staffId");
    const attendanceDate = searchParams.get("date");

    const records = await db
      .select({
        id: staffAttendance.id,
        staffId: staffAttendance.staffId,
        attendanceDate: staffAttendance.attendanceDate,
        clockIn: staffAttendance.clockIn,
        clockOut: staffAttendance.clockOut,
        regularHours: staffAttendance.regularHours,
        overtimeHours: staffAttendance.overtimeHours,
        overtimeMultiplier: staffAttendance.overtimeMultiplier,
        verificationMethod: staffAttendance.verificationMethod,
        status: staffAttendance.status,
        deviationNotes: staffAttendance.deviationNotes,
        createdAt: staffAttendance.createdAt,
        fullName: users.fullName,
        employeeCode: staffProfiles.employeeCode,
        department: staffProfiles.department,
        designation: staffProfiles.designation,
      })
      .from(staffAttendance)
      .innerJoin(staffProfiles, eq(staffAttendance.staffId, staffProfiles.id))
      .innerJoin(users, eq(staffProfiles.userId, users.id))
      .where(
        staffId
          ? and(
              eq(staffAttendance.staffId, staffId),
              attendanceDate ? eq(staffAttendance.attendanceDate, attendanceDate) : undefined
            )
          : attendanceDate
          ? eq(staffAttendance.attendanceDate, attendanceDate)
          : undefined
      )
      .orderBy(desc(staffAttendance.attendanceDate));

    return NextResponse.json({ success: true, data: records });
  } catch (error: any) {
    console.error("[HR ATTENDANCE GET]", error);
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}

// POST /api/v1/hr/attendance — clock in or clock out
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, staffId, shiftId, verificationMethod, recordedBy } = body;

    if (!staffId || !action) {
      return NextResponse.json({ success: false, error: "staffId and action required" }, { status: 400 });
    }

    const today = new Date().toISOString().split("T")[0];

    if (action === "clock_in") {
      // Check if already clocked in today
      const existing = await db
        .select()
        .from(staffAttendance)
        .where(and(eq(staffAttendance.staffId, staffId), eq(staffAttendance.attendanceDate, today)))
        .limit(1);

      if (existing.length > 0) {
        return NextResponse.json({ success: false, error: "Already clocked in today." }, { status: 409 });
      }

      const [record] = await db
        .insert(staffAttendance)
        .values({
          staffId,
          shiftId: shiftId || null,
          attendanceDate: today,
          clockIn: new Date(),
          verificationMethod: verificationMethod || "pin",
          status: "present",
          recordedBy: recordedBy || null,
        })
        .returning();

      return NextResponse.json({ success: true, data: record, message: "Clock-in recorded." }, { status: 201 });
    }

    if (action === "clock_out") {
      const [existing] = await db
        .select()
        .from(staffAttendance)
        .where(and(eq(staffAttendance.staffId, staffId), eq(staffAttendance.attendanceDate, today)))
        .limit(1);

      if (!existing || !existing.clockIn) {
        return NextResponse.json({ success: false, error: "No active clock-in found for today." }, { status: 404 });
      }

      const clockOut = new Date();
      const clockIn = new Date(existing.clockIn);
      const totalMs = clockOut.getTime() - clockIn.getTime();
      const totalHours = totalMs / (1000 * 60 * 60);
      const regularHours = Math.min(totalHours, 8);
      const overtimeHours = Math.max(0, totalHours - 8);

      // Determine overtime multiplier: night shift (18:00-06:00) → 1.75, else → 1.50
      const hour = clockIn.getHours();
      const isNightShift = hour >= 18 || hour < 6;
      const overtimeMultiplier = overtimeHours > 0 ? (isNightShift ? "1.75" : "1.50") : "1.00";

      const [updated] = await db
        .update(staffAttendance)
        .set({
          clockOut,
          regularHours: regularHours.toFixed(2),
          overtimeHours: overtimeHours.toFixed(2),
          overtimeMultiplier,
        })
        .where(eq(staffAttendance.id, existing.id))
        .returning();

      return NextResponse.json({ success: true, data: updated, message: `Clock-out recorded. ${regularHours.toFixed(1)}h regular, ${overtimeHours.toFixed(1)}h overtime.` });
    }

    if (action === "manual_record") {
      const { attendanceDate = today, clockIn, clockOut, regularHours = "8.00", overtimeHours = "0.00", status = "present", deviationNotes, verificationMethod = "manual" } = body;

      // Check if record exists for this staff and date
      const [existing] = await db
        .select()
        .from(staffAttendance)
        .where(and(eq(staffAttendance.staffId, staffId), eq(staffAttendance.attendanceDate, attendanceDate)))
        .limit(1);

      let record;
      if (existing) {
        const [updated] = await db
          .update(staffAttendance)
          .set({
            clockIn: clockIn ? new Date(clockIn) : existing.clockIn,
            clockOut: clockOut ? new Date(clockOut) : existing.clockOut,
            regularHours: regularHours.toString(),
            overtimeHours: overtimeHours.toString(),
            status,
            verificationMethod,
            deviationNotes: deviationNotes ?? existing.deviationNotes,
          })
          .where(eq(staffAttendance.id, existing.id))
          .returning();
        record = updated;
      } else {
        const [inserted] = await db
          .insert(staffAttendance)
          .values({
            staffId,
            attendanceDate,
            clockIn: clockIn ? new Date(clockIn) : new Date(),
            clockOut: clockOut ? new Date(clockOut) : null,
            regularHours: regularHours.toString(),
            overtimeHours: overtimeHours.toString(),
            status,
            verificationMethod,
            deviationNotes: deviationNotes || null,
            recordedBy: recordedBy || null,
          })
          .returning();
        record = inserted;
      }

      return NextResponse.json({ success: true, data: record, message: "Attendance record saved." }, { status: 201 });
    }

    return NextResponse.json({ success: false, error: "Invalid action. Use clock_in, clock_out, or manual_record." }, { status: 400 });
  } catch (error: any) {
    console.error("[HR ATTENDANCE POST]", error);
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}
