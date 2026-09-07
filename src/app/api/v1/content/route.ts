import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { pageContents } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { broadcastConfigChange } from "@/lib/services/config-events";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pageKey = searchParams.get("page") || searchParams.get("pageKey");
    const sectionKey = searchParams.get("section") || searchParams.get("sectionKey");
    const language = searchParams.get("language") || "en";
    const all = searchParams.get("all") === "true";

    const conditions: any[] = [];

    if (!all) {
      conditions.push(eq(pageContents.isActive, true));
    }

    if (pageKey) {
      conditions.push(eq(pageContents.pageKey, pageKey));
    }

    if (sectionKey) {
      conditions.push(eq(pageContents.sectionKey, sectionKey));
    }

    if (language) {
      conditions.push(eq(pageContents.language, language));
    }

    let query = db.select().from(pageContents);
    if (conditions.length > 0) {
      // @ts-ignore
      query = query.where(and(...conditions));
    }

    const contents = await query.orderBy(desc(pageContents.version));

    // If both page and section are specified, return the latest matching content block directly
    if (pageKey && sectionKey && contents.length > 0) {
      return NextResponse.json({
        success: true,
        data: contents[0],
      });
    }

    return NextResponse.json({
      success: true,
      data: contents,
      count: contents.length,
    });
  } catch (error: any) {
    console.error("[API v1 content GET] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pageKey, sectionKey, contentType, content, language, version, isActive } = body;

    if (!pageKey || !sectionKey || content === undefined) {
      return NextResponse.json(
        { success: false, error: "pageKey, sectionKey, and content are required" },
        { status: 400 }
      );
    }

    const [created] = await db
      .insert(pageContents)
      .values({
        pageKey,
        sectionKey,
        contentType: contentType || "json",
        content,
        language: language || "en",
        version: typeof version === "number" ? version : 1,
        isActive: isActive !== false,
      })
      .returning();

    broadcastConfigChange("content", "created", created);

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error: any) {
    console.error("[API v1 content POST] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Content ID is required" }, { status: 400 });
    }

    const [updated] = await db
      .update(pageContents)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(pageContents.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ success: false, error: "Content not found" }, { status: 404 });
    }

    broadcastConfigChange("content", "updated", updated);

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("[API v1 content PUT] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Content ID is required" }, { status: 400 });
    }

    await db.delete(pageContents).where(eq(pageContents.id, id));

    broadcastConfigChange("content", "deleted", { id });

    return NextResponse.json({ success: true, message: "Deleted successfully" });
  } catch (error: any) {
    console.error("[API v1 content DELETE] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
