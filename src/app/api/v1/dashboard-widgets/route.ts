import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { dashboardWidgets } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { broadcastConfigChange } from "@/lib/services/config-events";
import { insertReturning, updateReturning } from "@/lib/db/returning";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");
    const all = searchParams.get("all") === "true";

    const conditions: any[] = [];

    if (!all) {
      conditions.push(eq(dashboardWidgets.isActive, true));
    }

    if (role && role !== "all") {
      conditions.push(eq(dashboardWidgets.role, role));
    }

    let query = db.select().from(dashboardWidgets);
    if (conditions.length > 0) {
      // @ts-ignore
      query = query.where(and(...conditions));
    }

    const widgets = await query.orderBy(asc(dashboardWidgets.position));

    return NextResponse.json({
      success: true,
      data: widgets,
      count: widgets.length,
    });
  } catch (error: any) {
    console.error("[API v1 dashboard-widgets GET] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { role, widgetName, widgetType, title, description, config, position, gridSpan, isActive } = body;

    if (!role || !widgetName) {
      return NextResponse.json({ success: false, error: "role and widgetName are required" }, { status: 400 });
    }

    const [created] = await insertReturning(db, dashboardWidgets, {
        role,
        widgetName,
        widgetType: widgetType || "stats",
        title: title || null,
        description: description || null,
        config: config || {},
        position: typeof position === "number" ? position : 0,
        gridSpan: typeof gridSpan === "number" ? gridSpan : 1,
        isActive: isActive !== false,
      });

    broadcastConfigChange("dashboard-widgets", "created", created);

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error: any) {
    console.error("[API v1 dashboard-widgets POST] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Widget ID is required" }, { status: 400 });
    }

    const [updated] = await updateReturning(db, dashboardWidgets, {
        ...updates,
        updatedAt: new Date(),
      }, eq(dashboardWidgets.id, id));

    if (!updated) {
      return NextResponse.json({ success: false, error: "Widget not found" }, { status: 404 });
    }

    broadcastConfigChange("dashboard-widgets", "updated", updated);

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("[API v1 dashboard-widgets PUT] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Widget ID is required" }, { status: 400 });
    }

    await db.delete(dashboardWidgets).where(eq(dashboardWidgets.id, id));

    broadcastConfigChange("dashboard-widgets", "deleted", { id });

    return NextResponse.json({ success: true, message: "Deleted successfully" });
  } catch (error: any) {
    console.error("[API v1 dashboard-widgets DELETE] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
