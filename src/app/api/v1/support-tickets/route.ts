import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { supportTickets, supportTicketComments, auditLogs } from "@/db/schema";
import { createSupportTicketSchema } from "@/lib/validations/schemas";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

// GET /api/v1/support-tickets
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const data = await db
      .select()
      .from(supportTickets)
      .where(status ? eq(supportTickets.status, status as any) : undefined)
      .orderBy(desc(supportTickets.createdAt));

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Error fetching support tickets:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch support tickets" },
      { status: 500 }
    );
  }
}

// POST /api/v1/support-tickets
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = createSupportTicketSchema.parse(body);

    const ticketNumber = `TICK-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const [newTicket] = await db
      .insert(supportTickets)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        ticketNumber,
        category: validated.category,
        priority: validated.priority,
        status: "open",
        title: validated.title,
        description: validated.description,
        patientId: validated.patientId,
        reporterUserId: "11111111-1111-1111-1111-111111111101",
      })
      .returning();

    await db.insert(auditLogs).values({
      tenantId: DEFAULT_TENANT_ID,
      action: "SUPPORT_TICKET_RAISED",
      entityType: "support_tickets",
      entityId: newTicket.id,
      summary: `Raised support ticket ${ticketNumber}: "${newTicket.title}" (${newTicket.category} - ${newTicket.priority})`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json(
      { success: true, data: newTicket, message: "Support ticket created" },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: error.errors },
        { status: 422 }
      );
    }
    console.error("Error creating support ticket:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create support ticket" },
      { status: 500 }
    );
  }
}
