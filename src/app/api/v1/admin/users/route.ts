import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, staffProfiles } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { createHash } from "crypto";
import { requireAdminUser } from "@/lib/security/auth-session";

function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdminUser(req);
    if ("response" in auth) return auth.response;

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
      .where(eq(users.organizationId, auth.user.organizationId))
      .orderBy(desc(users.createdAt));

    return NextResponse.json({ success: true, data: allUsers });
  } catch (error) {
    console.error("Admin users fetch error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdminUser(req);
    if ("response" in auth) return auth.response;

    const body = await req.json();
    const {
      fullName, email, password, role = "patient", department, licenseNumber, phone,
      designation, employeeCode, employmentType = "full_time",
    } = body;

    if (!fullName || !email || !password) {
      return NextResponse.json({ success: false, error: "Full name, email, and password are required." }, { status: 400 });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const [existingUser] = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
    if (existingUser) {
      return NextResponse.json({ success: false, error: "An account with this email already exists." }, { status: 409 });
    }

    const orgId = auth.user.organizationId;

    const targetRole = role || "patient";
    const supportedRoles = [
      "system_admin", "tenant_admin", "physician", "nurse_practitioner", "nurse",
      "pharmacist", "physiotherapist", "occupational_therapist", "dietitian",
      "social_worker", "radiologist", "pathologist", "lab_technician",
      "genetic_counselor", "respiratory_therapist", "psychologist", "biologist",
      "care_coordinator", "patient", "auditor",
    ];
    if (!supportedRoles.includes(targetRole)) {
      return NextResponse.json({ success: false, error: "Unsupported account role." }, { status: 400 });
    }
    if (targetRole !== "patient" && (!department || !designation)) {
      return NextResponse.json(
        { success: false, error: "Department and designation are required when registering staff." },
        { status: 400 }
      );
    }

    const createdUser = await db.transaction(async (tx) => {
      const [user] = await tx
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

      if (targetRole !== "patient") {
        await tx.insert(staffProfiles).values({
          userId: user.id,
          tenantId: orgId,
          employeeCode: employeeCode || `EMP-${Date.now().toString().slice(-6)}`,
          department: String(department).trim(),
          designation: String(designation).trim(),
          licenseNumber: licenseNumber || null,
          employmentType,
          hiredAt: new Date().toISOString().split("T")[0],
          status: "active",
        });
      }

      return user;
    });

    return NextResponse.json({
      success: true,
      data: createdUser,
      message: targetRole === "patient" ? "User created successfully." : "Staff member registered and onboarded successfully.",
    }, { status: 201 });
  } catch (error: any) {
    console.error("Admin create user error:", error);
    return NextResponse.json({ success: false, error: error?.message || "Failed to create user" }, { status: 500 });
  }
}
