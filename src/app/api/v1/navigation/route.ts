import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { navigationItems } from "@/db/schema";
import { eq, and, or, isNull, asc } from "drizzle-orm";
import { broadcastConfigChange } from "@/lib/services/config-events";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");
    const all = searchParams.get("all") === "true";

    const conditions: any[] = [];

    if (!all) {
      conditions.push(eq(navigationItems.isActive, true));
    }

    if (role && role !== "all") {
      // Return navigation items intended for this specific role, or general items (role is null)
      conditions.push(or(eq(navigationItems.role, role), isNull(navigationItems.role)));
    }

    let query = db.select().from(navigationItems);
    if (conditions.length > 0) {
      // @ts-ignore
      query = query.where(and(...conditions));
    }

    const items = await query.orderBy(asc(navigationItems.order), asc(navigationItems.label));

    return NextResponse.json({
      success: true,
      data: items,
      count: items.length,
    });
  } catch (error: any) {
    console.error("[API v1 navigation GET] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { label, href, icon, role, order, isActive, requiresAuth, badgeKey, parentId, tenantId } = body;

    if (!label || !href) {
      return NextResponse.json({ success: false, error: "Label and href are required" }, { status: 400 });
    }

    const [newItem] = await db
      .insert(navigationItems)
      .values({
        label,
        href,
        icon: icon || null,
        role: role || null,
        order: typeof order === "number" ? order : 0,
        isActive: isActive !== false,
        requiresAuth: requiresAuth !== false,
        badgeKey: badgeKey || null,
        parentId: parentId || null,
        tenantId: tenantId || null,
      })
      .returning();

    broadcastConfigChange("navigation", "created", newItem);

    return NextResponse.json({ success: true, data: newItem }, { status: 201 });
  } catch (error: any) {
    console.error("[API v1 navigation POST] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Item ID is required" }, { status: 400 });
    }

    const [updated] = await db
      .update(navigationItems)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(navigationItems.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ success: false, error: "Navigation item not found" }, { status: 404 });
    }

    broadcastConfigChange("navigation", "updated", updated);

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("[API v1 navigation PUT] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Item ID is required" }, { status: 400 });
    }

    await db.delete(navigationItems).where(eq(navigationItems.id, id));

    broadcastConfigChange("navigation", "deleted", { id });

    return NextResponse.json({ success: true, message: "Deleted successfully" });
  } catch (error: any) {
    console.error("[API v1 navigation DELETE] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
