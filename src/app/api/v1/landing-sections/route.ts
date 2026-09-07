import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { landingSections } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { broadcastConfigChange } from "@/lib/services/config-events";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sectionKey = searchParams.get("sectionKey");
    const all = searchParams.get("all") === "true";

    const conditions: any[] = [];

    if (!all) {
      conditions.push(eq(landingSections.isActive, true));
    }

    if (sectionKey) {
      conditions.push(eq(landingSections.sectionKey, sectionKey));
    }

    let query = db.select().from(landingSections);
    if (conditions.length > 0) {
      // @ts-ignore
      query = query.where(and(...conditions));
    }

    const sections = await query.orderBy(asc(landingSections.order));

    return NextResponse.json({
      success: true,
      data: sections,
      count: sections.length,
    });
  } catch (error: any) {
    console.error("[API v1 landing-sections GET] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sectionKey, title, subtitle, content, order, isActive } = body;

    if (!sectionKey) {
      return NextResponse.json({ success: false, error: "sectionKey is required" }, { status: 400 });
    }

    const [created] = await db
      .insert(landingSections)
      .values({
        sectionKey,
        title: title || null,
        subtitle: subtitle || null,
        content: content || {},
        order: typeof order === "number" ? order : 0,
        isActive: isActive !== false,
      })
      .returning();

    broadcastConfigChange("landing-sections", "created", created);

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error: any) {
    console.error("[API v1 landing-sections POST] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Section ID is required" }, { status: 400 });
    }

    const [updated] = await db
      .update(landingSections)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(landingSections.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ success: false, error: "Section not found" }, { status: 404 });
    }

    broadcastConfigChange("landing-sections", "updated", updated);

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("[API v1 landing-sections PUT] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Section ID is required" }, { status: 400 });
    }

    await db.delete(landingSections).where(eq(landingSections.id, id));

    broadcastConfigChange("landing-sections", "deleted", { id });

    return NextResponse.json({ success: true, message: "Deleted successfully" });
  } catch (error: any) {
    console.error("[API v1 landing-sections DELETE] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
