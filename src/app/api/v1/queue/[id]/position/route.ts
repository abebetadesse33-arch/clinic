import { NextRequest, NextResponse } from "next/server";
import { QueueService } from "@/lib/services/queue-service";
import { db } from "@/db";
import { queueEntries } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const [entry] = await db
      .select()
      .from(queueEntries)
      .where(eq(queueEntries.id, id));

    if (!entry) {
      return NextResponse.json(
        { success: false, error: "Queue entry not found" },
        { status: 404 }
      );
    }

    const posData = await QueueService.getPositionByPatientOrCase(entry.patientId, entry.caseId || undefined);

    return NextResponse.json({
      success: true,
      data: posData || {
        position: entry.position,
        estimatedWaitMinutes: entry.estimatedWaitMinutes,
        status: entry.status,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch position" },
      { status: 500 }
    );
  }
}
