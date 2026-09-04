import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { workflowTemplates } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organizationId") || searchParams.get("tenantId");

    const templates = organizationId
      ? await db
          .select()
          .from(workflowTemplates)
          .where(eq(workflowTemplates.organizationId, organizationId))
          .orderBy(desc(workflowTemplates.createdAt))
      : await db.select().from(workflowTemplates).orderBy(desc(workflowTemplates.createdAt));

    return NextResponse.json({ success: true, templates });
  } catch (error: any) {
    console.error("Fetch templates error:", error);
    return NextResponse.json({ error: "Failed to fetch workflow templates" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      organizationId,
      tenantId,
      name,
      processType = "consultation",
      description,
      steps = [],
    } = body;

    const orgId = organizationId || tenantId;

    if (!orgId || !name || !processType) {
      return NextResponse.json(
        { error: "organizationId (or tenantId), name, and processType are required" },
        { status: 400 }
      );
    }

    const [template] = await db
      .insert(workflowTemplates)
      .values({
        organizationId: orgId,
        name,
        processType: processType as any,
        description: description || null,
        steps: steps || [],
      })
      .returning();

    return NextResponse.json({ success: true, template });
  } catch (error: any) {
    console.error("Create template error:", error);
    return NextResponse.json({ error: "Failed to create workflow template" }, { status: 500 });
  }
}
