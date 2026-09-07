import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { translations } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { broadcastConfigChange } from "@/lib/services/config-events";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const language = searchParams.get("language") || "en";
    const key = searchParams.get("key");
    const format = searchParams.get("format");
    const all = searchParams.get("all") === "true";

    const conditions: any[] = [];

    if (!all) {
      conditions.push(eq(translations.isActive, true));
    }

    if (language) {
      conditions.push(eq(translations.language, language));
    }

    if (key) {
      conditions.push(eq(translations.key, key));
    }

    let query = db.select().from(translations);
    if (conditions.length > 0) {
      // @ts-ignore
      query = query.where(and(...conditions));
    }

    const items = await query;

    // If format=map, return a key-value dictionary for fast client-side i18n
    if (format === "map") {
      const map: Record<string, string> = {};
      for (const item of items) {
        map[item.key] = item.value;
      }
      return NextResponse.json({
        success: true,
        data: map,
        language,
      });
    }

    // If single key requested
    if (key && items.length > 0) {
      return NextResponse.json({
        success: true,
        data: items[0],
      });
    }

    return NextResponse.json({
      success: true,
      data: items,
      count: items.length,
    });
  } catch (error: any) {
    console.error("[API v1 translations GET] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, language, value, isActive } = body;

    if (!key || !language || value === undefined) {
      return NextResponse.json({ success: false, error: "key, language, and value are required" }, { status: 400 });
    }

    const [created] = await db
      .insert(translations)
      .values({
        key,
        language,
        value,
        isActive: isActive !== false,
      })
      .returning();

    broadcastConfigChange("translations", "created", created);

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error: any) {
    console.error("[API v1 translations POST] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Translation ID is required" }, { status: 400 });
    }

    const [updated] = await db
      .update(translations)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(translations.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ success: false, error: "Translation not found" }, { status: 404 });
    }

    broadcastConfigChange("translations", "updated", updated);

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("[API v1 translations PUT] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Translation ID is required" }, { status: 400 });
    }

    await db.delete(translations).where(eq(translations.id, id));

    broadcastConfigChange("translations", "deleted", { id });

    return NextResponse.json({ success: true, message: "Deleted successfully" });
  } catch (error: any) {
    console.error("[API v1 translations DELETE] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
