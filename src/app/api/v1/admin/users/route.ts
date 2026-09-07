import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, organizations } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { createHash } from "crypto";

function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

export async function GET(req: NextRequest) {
  try {
    const allUsers = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        role: users.role,
        department: users.department,
        licenseNumber: users.licenseNumber,
        isActive: users.isActive,
        organizationId: users.organizationId,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    return NextResponse.json({ success: true, data: allUsers });
  } catch (error) {
    console.error("Admin users fetch error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fullName, email, password, role = "patient", department, licenseNumber, phone } = body;

    if (!fullName || !email || !password) {
      return NextResponse.json({ success: false, error: "Full name, email, and password are required." }, { status: 400 });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const [existingUser] = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
    if (existingUser) {
      return NextResponse.json({ success: false, error: "An account with this email already exists." }, { status: 409 });
    }

    let orgId = "00000000-0000-0000-0000-000000000001";
    try {
      const [existingOrg] = await db.select().from(organizations).limit(1);
      if (existingOrg) orgId = existingOrg.id;
    } catch {}

    const targetRole = role && role !== "patient" ? role : "patient";
    const [createdUser] = await db
      .insert(users)
      .values({
        organizationId: orgId,
        email: normalizedEmail,
        passwordHash: sha256Hex(String(password)),
        fullName: String(fullName).trim(),
        role: targetRole,
        department: department || null,
        licenseNumber: licenseNumber || null,
        phone: phone || null,
        isAdminGrantedBySuperAdmin: targetRole === "tenant_admin" || targetRole === "system_admin",
        isActive: true,
      })
      .returning({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        role: users.role,
      });

    return NextResponse.json({ success: true, data: createdUser, message: "User created successfully." }, { status: 201 });
  } catch (error: any) {
    console.error("Admin create user error:", error);
    return NextResponse.json({ success: false, error: error?.message || "Failed to create user" }, { status: 500 });
  }
}
