import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { patientAssignments, cases, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { CaseWorkflowService } from "@/lib/services/case-workflow-service";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();
    const { newProviderId, reason = "Reassigned by care team" } = body;

    if (!newProviderId) {
      return NextResponse.json(
        { success: false, error: "newProviderId is required" },
        { status: 400 }
      );
    }

    const [assignment] = await db
      .select()
      .from(patientAssignments)
      .where(eq(patientAssignments.id, id));

    if (!assignment) {
      return NextResponse.json(
        { success: false, error: "Assignment not found" },
        { status: 404 }
      );
    }

    // Mark previous assignment cancelled
    await db
      .update(patientAssignments)
      .set({ status: "cancelled", notes: `Reassigned: ${reason}` })
      .where(eq(patientAssignments.id, id));

    const [newDoc] = await db
      .select()
      .from(users)
      .where(eq(users.id, newProviderId));

    if (assignment.caseId) {
      const [c] = await db
        .select({ caseId: cases.caseId })
        .from(cases)
        .where(eq(cases.id, assignment.caseId));

      if (c) {
        await CaseWorkflowService.assignProvider({
          caseId: c.caseId,
          providerId: newProviderId,
          providerName: newDoc?.fullName || "Assigned Clinician",
          providerType: newDoc?.role || "physician",
          assignmentType: "manual",
          notes: `Reassigned from previous provider: ${reason}`,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Successfully reassigned provider",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Reassignment failed" },
      { status: 500 }
    );
  }
}
