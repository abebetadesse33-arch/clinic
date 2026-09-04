import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { patientAssignments, users, patients, cases } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { CaseWorkflowService } from "@/lib/services/case-workflow-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const providerId = searchParams.get("providerId");
    const patientId = searchParams.get("patientId");
    const status = searchParams.get("status");

    let query = db
      .select({
        id: patientAssignments.id,
        status: patientAssignments.status,
        assignmentType: patientAssignments.assignmentType,
        providerType: patientAssignments.providerType,
        specialty: patientAssignments.specialty,
        assignedAt: patientAssignments.assignedAt,
        acceptedAt: patientAssignments.acceptedAt,
        completedAt: patientAssignments.completedAt,
        notes: patientAssignments.notes,
        patientId: patientAssignments.patientId,
        providerId: patientAssignments.providerId,
        caseId: patientAssignments.caseId,
        providerName: users.fullName,
        patientFirstName: patients.firstName,
        patientLastName: patients.lastName,
      })
      .from(patientAssignments)
      .leftJoin(users, eq(patientAssignments.providerId, users.id))
      .leftJoin(patients, eq(patientAssignments.patientId, patients.id));

    const rows = await query.orderBy(desc(patientAssignments.assignedAt)).limit(50);

    const formatted = rows.map((r) => ({
      ...r,
      patientName: `${r.patientFirstName || "Patient"} ${r.patientLastName || ""}`.trim(),
    }));

    return NextResponse.json({
      success: true,
      data: {
        assignments: formatted,
        total: formatted.length,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch assignments" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      caseId,
      providerId,
      providerName,
      providerType = "physician",
      specialty = "General Medicine",
      assignmentType = "manual",
      notes,
    } = body;

    if (!caseId || !providerId) {
      return NextResponse.json(
        { success: false, error: "caseId and providerId are required" },
        { status: 400 }
      );
    }

    const updated = await CaseWorkflowService.assignProvider({
      caseId,
      providerId,
      providerName: providerName || "Attending Physician",
      providerType,
      specialty,
      assignmentType,
      notes,
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (err: any) {
    console.error("[Assignment POST error]:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Assignment failed" },
      { status: 500 }
    );
  }
}
