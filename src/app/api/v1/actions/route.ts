import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { actionConfigurations } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { broadcastConfigChange } from "@/lib/services/config-events";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pageKey = searchParams.get("page") || searchParams.get("pageKey");
    const actionKey = searchParams.get("action") || searchParams.get("actionKey");
    const all = searchParams.get("all") === "true";

    const conditions: any[] = [];

    if (!all) {
      conditions.push(eq(actionConfigurations.isActive, true));
    }

    if (pageKey) {
      conditions.push(eq(actionConfigurations.pageKey, pageKey));
    }

    if (actionKey) {
      conditions.push(eq(actionConfigurations.actionKey, actionKey));
    }

    let query = db.select().from(actionConfigurations);
    if (conditions.length > 0) {
      // @ts-ignore
      query = query.where(and(...conditions));
    }

    const actions = await query.orderBy(asc(actionConfigurations.order));

    // If specific actionKey was requested, return that single action or null
    if (actionKey && actions.length > 0) {
      return NextResponse.json({
        success: true,
        data: actions[0],
      });
    }

    return NextResponse.json({
      success: true,
      data: actions,
      count: actions.length,
    });
  } catch (error: any) {
    console.error("[API v1 actions GET] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      pageKey,
      actionKey,
      label,
      icon,
      actionType,
      href,
      apiEndpoint,
      method,
      variant,
      requiredPermission,
      order,
      isActive,
    } = body;

    if (!pageKey || !actionKey || !label) {
      return NextResponse.json({ success: false, error: "pageKey, actionKey, and label are required" }, { status: 400 });
    }

    const [created] = await db
      .insert(actionConfigurations)
      .values({
        pageKey,
        actionKey,
        label,
        icon: icon || null,
        actionType: actionType || "link",
        href: href || null,
        apiEndpoint: apiEndpoint || null,
        method: method || "GET",
        variant: variant || "default",
        requiredPermission: requiredPermission || null,
        order: typeof order === "number" ? order : 0,
        isActive: isActive !== false,
      })
      .returning();

    broadcastConfigChange("actions", "created", created);

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error: any) {
    console.error("[API v1 actions POST] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Action ID is required" }, { status: 400 });
    }

    const [updated] = await db
      .update(actionConfigurations)
      .set(updates)
      .where(eq(actionConfigurations.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ success: false, error: "Action config not found" }, { status: 404 });
    }

    broadcastConfigChange("actions", "updated", updated);

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("[API v1 actions PUT] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Action ID is required" }, { status: 400 });
    }

    await db.delete(actionConfigurations).where(eq(actionConfigurations.id, id));

    broadcastConfigChange("actions", "deleted", { id });

    return NextResponse.json({ success: true, message: "Deleted successfully" });
  } catch (error: any) {
    console.error("[API v1 actions DELETE] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
