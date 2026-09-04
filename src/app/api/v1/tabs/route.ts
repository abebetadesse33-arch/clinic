import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tabConfigurations } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { broadcastConfigChange } from "@/lib/services/config-events";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pageKey = searchParams.get("page") || searchParams.get("pageKey");
    const all = searchParams.get("all") === "true";

    const conditions: any[] = [];

    if (!all) {
      conditions.push(eq(tabConfigurations.isActive, true));
    }

    if (pageKey) {
      conditions.push(eq(tabConfigurations.pageKey, pageKey));
    }

    let query = db.select().from(tabConfigurations);
    if (conditions.length > 0) {
      // @ts-ignore
      query = query.where(and(...conditions));
    }

    const tabs = await query.orderBy(asc(tabConfigurations.order));

    return NextResponse.json({
      success: true,
      data: tabs,
      count: tabs.length,
    });
  } catch (error: any) {
    console.error("[API v1 tabs GET] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pageKey, tabKey, label, icon, badgeKey, order, isActive, requiredPermission } = body;

    if (!pageKey || !tabKey || !label) {
      return NextResponse.json({ success: false, error: "pageKey, tabKey, and label are required" }, { status: 400 });
    }

    const [created] = await db
      .insert(tabConfigurations)
      .values({
        pageKey,
        tabKey,
        label,
        icon: icon || null,
        badgeKey: badgeKey || null,
        order: typeof order === "number" ? order : 0,
        isActive: isActive !== false,
        requiredPermission: requiredPermission || null,
      })
      .returning();

    broadcastConfigChange("tabs", "created", created);

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error: any) {
    console.error("[API v1 tabs POST] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Tab ID is required" }, { status: 400 });
    }

    const [updated] = await db
      .update(tabConfigurations)
      .set(updates)
      .where(eq(tabConfigurations.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ success: false, error: "Tab not found" }, { status: 404 });
    }

    broadcastConfigChange("tabs", "updated", updated);

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("[API v1 tabs PUT] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Tab ID is required" }, { status: 400 });
    }

    await db.delete(tabConfigurations).where(eq(tabConfigurations.id, id));

    broadcastConfigChange("tabs", "deleted", { id });

    return NextResponse.json({ success: true, message: "Deleted successfully" });
  } catch (error: any) {
    console.error("[API v1 tabs DELETE] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
