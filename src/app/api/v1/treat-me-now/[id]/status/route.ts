import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { cases, queueEntries, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { QueueService } from "@/lib/services/queue-service";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params; // caseId or queueId

    // 1. Try finding case first
    let [c] = await db
      .select()
      .from(cases)
      .where(eq(cases.caseId, id));

    let queueEntry = null;

    if (c) {
      queueEntry = await QueueService.getPositionByPatientOrCase(c.patientId || undefined, c.id);
    } else {
      // Try finding queueEntry by ID
      const [q] = await db
        .select()
        .from(queueEntries)
        .where(eq(queueEntries.id, id));

      if (q) {
        queueEntry = await QueueService.getPositionByPatientOrCase(q.patientId, q.caseId || undefined);
        if (q.caseId) {
          const [foundCase] = await db
            .select()
            .from(cases)
            .where(eq(cases.id, q.caseId));
          c = foundCase;
        }
      }
    }

    if (!c && !queueEntry) {
      return NextResponse.json(
        { success: false, error: "Session or case not found" },
        { status: 404 }
      );
    }

    // Check clinician details
    let doctor = null;
    if (c?.assignedProviderId) {
      const [doc] = await db
        .select({
          id: users.id,
          fullName: users.fullName,
          role: users.role,
          avatarUrl: users.avatarUrl,
        })
        .from(users)
        .where(eq(users.id, c.assignedProviderId));
      doctor = doc;
    }

    const isReady =
      queueEntry?.status === "called" ||
      queueEntry?.status === "in_service" ||
      c?.status === "in_consultation" ||
      (queueEntry?.position && queueEntry.position <= 1);

    return NextResponse.json({
      success: true,
      data: {
        caseId: c?.caseId || id,
        caseNumber: c?.caseNumber,
        caseStatus: c?.status || "waiting",
        queuePosition: queueEntry?.position ?? 1,
        estimatedWaitMinutes: queueEntry?.estimatedWaitMinutes ?? 3,
        queueStatus: queueEntry?.status ?? "waiting",
        isReady,
        assignedDoctor: doctor || {
          fullName: c?.assignedHandlerName || "On-Call Clinical Lead",
          role: c?.assignedRole || "Physician, MD",
        },
        timeline: c?.timeline || [],
        roomUrl: `/telemedicine/room-${c?.caseId || id}?role=patient`,
      },
    });
  } catch (err: any) {
    console.error("[Treat Me Now status error]:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch status" },
      { status: 500 }
    );
  }
}
