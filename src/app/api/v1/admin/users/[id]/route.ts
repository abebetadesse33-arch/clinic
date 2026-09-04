import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

type Params = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const [user] = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        role: users.role,
        department: users.department,
        licenseNumber: users.licenseNumber,
        phone: users.phone,
        isActive: users.isActive,
        organizationId: users.organizationId,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, params.id))
      .limit(1);

    if (!user) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch user" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const body = await req.json();
    const { role, isActive, fullName, department, licenseNumber, phone } = body;

    const updatePayload: Record<string, any> = { updatedAt: new Date() };
    if (role !== undefined) {
      updatePayload.role = role;
      updatePayload.isAdminGrantedBySuperAdmin = role === "tenant_admin" || role === "system_admin";
      if (role === "patient") updatePayload.isAdminGrantedBySuperAdmin = false;
    }
    if (isActive !== undefined) updatePayload.isActive = isActive;
    if (fullName !== undefined) updatePayload.fullName = fullName;
    if (department !== undefined) updatePayload.department = department;
    if (licenseNumber !== undefined) updatePayload.licenseNumber = licenseNumber;
    if (phone !== undefined) updatePayload.phone = phone;

    const [updated] = await db
      .update(users)
      .set(updatePayload)
      .where(eq(users.id, params.id))
      .returning({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        department: users.department,
      });

    if (!updated) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Admin user PATCH error:", error);
    return NextResponse.json({ success: false, error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    // Soft delete — set isActive=false rather than hard delete (HIPAA compliance)
    const [updated] = await db
      .update(users)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(users.id, params.id))
      .returning({ id: users.id, email: users.email });

    if (!updated) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    return NextResponse.json({ success: true, message: "User deactivated (HIPAA-compliant soft delete)", data: updated });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to deactivate user" }, { status: 500 });
  }
}
