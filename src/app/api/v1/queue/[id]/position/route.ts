import { NextRequest, NextResponse } from "next/server";
import { QueueService } from "@/lib/services/queue-service";
import { db } from "@/db";
import { queueEntries } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuthenticatedUser, resolveAuthorizedPatient } from "@/lib/security/auth-session";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuthenticatedUser(req);
  if ("response" in auth) return auth.response;

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

    // Staff see entries in their organization; a patient only sees their own place in line.
    if (auth.user.role === "patient") {
      const access = await resolveAuthorizedPatient(req, entry.patientId);
      if ("response" in access) return access.response;
    } else if (entry.tenantId !== auth.user.organizationId) {
      return NextResponse.json({ success: false, error: "Queue entry not found" }, { status: 404 });
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
