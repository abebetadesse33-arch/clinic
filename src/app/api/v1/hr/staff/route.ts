import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  staffProfiles, staffCertifications, users, organizations, auditLogs,
} from "@/db/schema";
import { eq, desc, ilike, or, and, ne } from "drizzle-orm";
import { dispatchNotification } from "@/lib/notifications/notification-service";

export const dynamic = "force-dynamic";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

// GET /api/v1/hr/staff — list staff with filters + available candidate users
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const department = searchParams.get("department");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const includeUsers = searchParams.get("includeUsers") === "true";

    let query = db
      .select({
        id: staffProfiles.id,
        userId: staffProfiles.userId,
        employeeCode: staffProfiles.employeeCode,
        department: staffProfiles.department,
        designation: staffProfiles.designation,
        specialization: staffProfiles.specialization,
        licenseNumber: staffProfiles.licenseNumber,
        licenseIssuingBody: staffProfiles.licenseIssuingBody,
        licenseExpiryDate: staffProfiles.licenseExpiryDate,
        cmePoints: staffProfiles.cmePoints,
        employmentType: staffProfiles.employmentType,
        baseSalaryEtb: staffProfiles.baseSalaryEtb,
        status: staffProfiles.status,
        hiredAt: staffProfiles.hiredAt,
        createdAt: staffProfiles.createdAt,
        fullName: users.fullName,
        email: users.email,
        phone: users.phone,
        avatarUrl: users.avatarUrl,
        role: users.role,
      })
      .from(staffProfiles)
      .innerJoin(users, eq(staffProfiles.userId, users.id))
      .orderBy(desc(staffProfiles.createdAt));

    const data = await query;

    // JS-side filters for simplicity
    let filtered = data;
    if (department && department !== "All") filtered = filtered.filter((s) => s.department === department);
    if (status && status !== "All") filtered = filtered.filter((s) => s.status === status);
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.fullName?.toLowerCase().includes(q) ||
          s.employeeCode.toLowerCase().includes(q) ||
          s.designation.toLowerCase().includes(q) ||
          s.department.toLowerCase().includes(q)
      );
    }

    // Also fetch all staff-eligible users (non-patient)
    const staffUserIds = new Set(data.map((s) => s.userId));
    const allCandidateUsers = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        role: users.role,
        department: users.department,
        phone: users.phone,
      })
      .from(users)
      .where(ne(users.role, "patient"));

    const unassignedUsers = allCandidateUsers.filter((u) => !staffUserIds.has(u.id));

    return NextResponse.json({
      success: true,
      data: filtered,
      total: filtered.length,
      unassignedUsers,
      allUsers: allCandidateUsers,
    });
  } catch (error: any) {
    console.error("[HR STAFF GET]", error);
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}

// POST /api/v1/hr/staff — onboard a new staff member
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId, tenantId = DEFAULT_TENANT_ID, employeeCode, department, designation, specialization,
      licenseNumber, licenseIssuingBody, licenseExpiryDate, employmentType,
      baseSalaryEtb, onCallAllowanceRate, consultationRevenueSharePct,
      bankAccountNumber, bankName, mobileWalletNumber, mobileWalletProvider,
      hiredAt, cmePoints,
    } = body;

    if (!userId || !department || !designation) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: userId, department, designation" },
        { status: 400 }
      );
    }

    // Auto-generate employee code if missing
    const empCode = employeeCode || `EMP-${Date.now().toString().slice(-4)}`;
    const hireDate = hiredAt || new Date().toISOString().split("T")[0];

    // Check if staff profile already exists for this user
    const [existing] = await db
      .select()
      .from(staffProfiles)
      .where(eq(staffProfiles.userId, userId))
      .limit(1);

    let staffRecord;
    if (existing) {
      const [updated] = await db
        .update(staffProfiles)
        .set({
          department,
          designation,
          specialization: specialization ?? existing.specialization,
          licenseNumber: licenseNumber ?? existing.licenseNumber,
          licenseExpiryDate: licenseExpiryDate ?? existing.licenseExpiryDate,
          baseSalaryEtb: baseSalaryEtb?.toString() ?? existing.baseSalaryEtb,
          updatedAt: new Date(),
        })
        .where(eq(staffProfiles.id, existing.id))
        .returning();
      staffRecord = updated;
    } else {
      const [inserted] = await db
        .insert(staffProfiles)
        .values({
          userId,
          tenantId,
          employeeCode: empCode,
          department,
          designation,
          specialization: specialization || null,
          licenseNumber: licenseNumber || null,
          licenseIssuingBody: licenseIssuingBody || null,
          licenseExpiryDate: licenseExpiryDate || null,
          cmePoints: cmePoints || 0,
          employmentType: employmentType || "full_time",
          baseSalaryEtb: baseSalaryEtb?.toString() || "25000.00",
          onCallAllowanceRate: onCallAllowanceRate?.toString() || "800.00",
          consultationRevenueSharePct: consultationRevenueSharePct?.toString() || "0.00",
          bankAccountNumber: bankAccountNumber || null,
          bankName: bankName || null,
          mobileWalletNumber: mobileWalletNumber || null,
          mobileWalletProvider: mobileWalletProvider || "none",
          hiredAt: hireDate,
          status: "active",
        })
        .returning();
      staffRecord = inserted;
    }

    // Keep users.department in sync
    await db.update(users).set({ department }).where(eq(users.id, userId));

    return NextResponse.json({ success: true, data: staffRecord, message: "Staff onboarded successfully." }, { status: 201 });
  } catch (error: any) {
    console.error("[HR STAFF POST]", error);
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}

// PATCH /api/v1/hr/staff — assign department or update staff profile
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      staffId,
      userId,
      department,
      designation,
      specialization,
      licenseNumber,
      licenseExpiryDate,
      status,
      baseSalaryEtb,
      employmentType,
      cmePoints,
    } = body;

    const targetStaffId = id || staffId;

    if (!targetStaffId && !userId) {
      return NextResponse.json(
        { success: false, error: "Either staffId/id or userId is required." },
        { status: 400 }
      );
    }

    // Find profile
    let profile = null;
    if (targetStaffId) {
      const [found] = await db
        .select()
        .from(staffProfiles)
        .where(eq(staffProfiles.id, targetStaffId))
        .limit(1);
      profile = found;
    } else if (userId) {
      const [found] = await db
        .select()
        .from(staffProfiles)
        .where(eq(staffProfiles.userId, userId))
        .limit(1);
      profile = found;
    }

    // If profile doesn't exist yet but userId is provided, create it
    if (!profile && userId) {
      const empCode = `EMP-${Date.now().toString().slice(-4)}`;
      const [created] = await db
        .insert(staffProfiles)
        .values({
          userId,
          tenantId: DEFAULT_TENANT_ID,
          employeeCode: empCode,
          department: department || "General Outpatient",
          designation: designation || "Clinical Staff",
          specialization: specialization || null,
          baseSalaryEtb: baseSalaryEtb?.toString() || "25000.00",
          hiredAt: new Date().toISOString().split("T")[0],
          status: "active",
        })
        .returning();
      profile = created;
    }

    if (!profile) {
      return NextResponse.json({ success: false, error: "Staff profile not found." }, { status: 404 });
    }

    // Build update object
    const updateFields: any = { updatedAt: new Date() };
    if (department !== undefined) updateFields.department = department;
    if (designation !== undefined) updateFields.designation = designation;
    if (specialization !== undefined) updateFields.specialization = specialization;
    if (licenseNumber !== undefined) updateFields.licenseNumber = licenseNumber;
    if (licenseExpiryDate !== undefined) updateFields.licenseExpiryDate = licenseExpiryDate;
    if (status !== undefined) updateFields.status = status;
    if (baseSalaryEtb !== undefined) updateFields.baseSalaryEtb = baseSalaryEtb.toString();
    if (employmentType !== undefined) updateFields.employmentType = employmentType;
    if (cmePoints !== undefined) updateFields.cmePoints = cmePoints;

    const [updated] = await db
      .update(staffProfiles)
      .set(updateFields)
      .where(eq(staffProfiles.id, profile.id))
      .returning();

    // Synchronize users table if department or designation changed
    if (department) {
      await db
        .update(users)
        .set({ department })
        .where(eq(users.id, profile.userId));
    }

    // Dispatch notification to the staff member
    if (department && department !== profile.department) {
      await dispatchNotification({
        category: "system",
        type: "system_alert",
        title: `🏢 Department Assigned: ${department}`,
        body: `You have been assigned to the ${department} department${designation ? ` as ${designation}` : ""}.`,
        recipientUserId: profile.userId,
        priority: "normal",
        actionUrl: "/admin/hr",
        actionText: "View Profile",
      });
    }

    // Audit log
    await db.insert(auditLogs).values({
      tenantId: DEFAULT_TENANT_ID,
      userId: profile.userId,
      action: "STAFF_DEPARTMENT_ASSIGNED",
      entityType: "staff_profiles",
      entityId: profile.id,
      summary: `Staff ${profile.employeeCode} assigned to department '${department || profile.department}' (${designation || profile.designation})`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: `Staff member successfully assigned to ${department || updated.department}.`,
    });
  } catch (error: any) {
    console.error("[HR STAFF PATCH]", error);
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}

