import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { customRoles, userCustomRoles, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";

const TENANT_ID = "00000000-0000-0000-0000-000000000001";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const view = searchParams.get("view") || "roles";

    if (view === "roles") {
      const roles = await db.select().from(customRoles).where(eq(customRoles.tenantId, TENANT_ID));
      return NextResponse.json({ success: true, data: roles });
    }

    if (view === "assignments") {
      const assignments = await db
        .select({
          id: userCustomRoles.id,
          userId: userCustomRoles.userId,
          roleId: userCustomRoles.roleId,
          isActive: userCustomRoles.isActive,
          expiresAt: userCustomRoles.expiresAt,
          createdAt: userCustomRoles.createdAt,
          userName: users.fullName,
          userEmail: users.email,
          roleName: customRoles.name,
          roleCode: customRoles.code,
          roleCategory: customRoles.category,
        })
        .from(userCustomRoles)
        .leftJoin(users, eq(userCustomRoles.userId, users.id))
        .leftJoin(customRoles, eq(userCustomRoles.roleId, customRoles.id))
        .where(and(eq(userCustomRoles.tenantId, TENANT_ID), eq(userCustomRoles.isActive, true)));
      return NextResponse.json({ success: true, data: assignments });
    }

    if (view === "staff") {
      const staff = await db
        .select({ id: users.id, fullName: users.fullName, email: users.email, role: users.role, department: users.department })
        .from(users)
        .where(eq(users.organizationId, TENANT_ID));
      return NextResponse.json({ success: true, data: staff });
    }

    return NextResponse.json({ error: "Invalid view" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "create_role") {
      const { code, name, description, category, permissions } = body;
      if (!code || !name) return NextResponse.json({ error: "code and name required" }, { status: 400 });

      const [role] = await db.insert(customRoles).values({
        tenantId: TENANT_ID,
        code: code.toLowerCase().replace(/\s+/g, "_"),
        name,
        description: description || null,
        category: category || "clinical",
        permissions: permissions || [],
        isSystem: false,
      }).returning();
      return NextResponse.json({ success: true, data: role });
    }

    if (action === "assign_role") {
      const { userId, roleId, expiresAt } = body;
      if (!userId || !roleId) return NextResponse.json({ error: "userId and roleId required" }, { status: 400 });

      // Upsert: if already exists reactivate
      const existing = await db.select().from(userCustomRoles)
        .where(and(eq(userCustomRoles.userId, userId), eq(userCustomRoles.roleId, roleId)));

      if (existing.length > 0) {
        const [updated] = await db.update(userCustomRoles)
          .set({ isActive: true, expiresAt: expiresAt ? new Date(expiresAt) : null })
          .where(eq(userCustomRoles.id, existing[0].id))
          .returning();
        return NextResponse.json({ success: true, data: updated });
      }

      const [assignment] = await db.insert(userCustomRoles).values({
        tenantId: TENANT_ID,
        userId,
        roleId,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: true,
      }).returning();
      return NextResponse.json({ success: true, data: assignment });
    }

    if (action === "revoke_role") {
      const { userId, roleId } = body;
      await db.update(userCustomRoles)
        .set({ isActive: false })
        .where(and(eq(userCustomRoles.userId, userId), eq(userCustomRoles.roleId, roleId)));
      return NextResponse.json({ success: true });
    }

    if (action === "update_role") {
      const { roleId, name, description, category, permissions } = body;
      if (!roleId) return NextResponse.json({ error: "roleId required" }, { status: 400 });
      const [updated] = await db.update(customRoles)
        .set({ name, description, category, permissions, updatedAt: new Date() })
        .where(and(eq(customRoles.id, roleId), eq(customRoles.isSystem, false)))
        .returning();
      return NextResponse.json({ success: true, data: updated });
    }

    if (action === "delete_role") {
      const { roleId } = body;
      await db.delete(customRoles).where(and(eq(customRoles.id, roleId), eq(customRoles.isSystem, false)));
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
