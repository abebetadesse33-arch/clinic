import { NextRequest, NextResponse } from "next/server";
import { CaseWorkflowService, CaseStatus } from "@/lib/services/case-workflow-service";

export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();
    const {
      status,
      actorName = "Staff Clinician",
      actorRole = "physician",
      details,
    } = body;

    if (!status) {
      return NextResponse.json({ success: false, error: "status is required" }, { status: 400 });
    }

    const updated = await CaseWorkflowService.updateCaseStatus({
      caseId: id,
      status: status as CaseStatus,
      actorName,
      actorRole,
      details,
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to update case status" },
      { status: 500 }
    );
  }
}
