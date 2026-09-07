import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { cases, notifications, users } from "@/db/schema";
import { eq, or } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const condition = isUuid
      ? or(eq(cases.id, id), eq(cases.caseId, id), eq(cases.caseNumber, id))
      : or(eq(cases.caseId, id), eq(cases.caseNumber, id));

    const rows = await db
      .select()
      .from(cases)
      .where(condition)
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Case not found" },
        { status: 404 }
      );
    }

    const r = rows[0];
    const personal = (r.personal || r.patientInfo || {}) as any;
    const complaint = (r.complaint || r.complaintDetails || {}) as any;
    const symptoms = (r.symptoms || {}) as any;
    const aiAnalysis = (r.aiAnalysis || {}) as any;
    const timeline = Array.isArray(r.timeline) && r.timeline.length > 0 ? r.timeline : [
      { time: r.submittedAt ? new Date(r.submittedAt).toISOString() : new Date().toISOString(), event: "Case submitted by patient", actor: "Patient" },
      { time: r.submittedAt ? new Date(r.submittedAt).toISOString() : new Date().toISOString(), event: `Assigned to ${r.assignedHandlerName || "Attending Clinician"}`, actor: "System" },
      r.aiSummary || aiAnalysis.summary ? { time: new Date().toISOString(), event: "AI clinical analysis complete", actor: "AI Engine" } : null,
    ].filter(Boolean);

    const detailedCase = {
      id: r.id,
      caseId: r.caseId || r.caseNumber,
      caseNumber: r.caseNumber || r.caseId,
      patient: {
        fullName: personal.fullName || "Patient",
        age: personal.age || 45,
        gender: personal.gender || "undisclosed",
        mrn: personal.mrn || "MRN-TEMP",
        phone: personal.phone || "",
        email: personal.email || "",
      },
      personal,
      complaint: {
        chiefComplaint: r.chiefComplaint || complaint.chiefComplaint || "Medical Case",
        severity: r.severity || complaint.severity || "moderate",
        seekingUrgent: Boolean(complaint.seekingUrgent || r.severity === "very_severe"),
        duration: complaint.duration || "Recent",
        onset: complaint.onset || "gradual",
        location: complaint.location || "",
        aggravating: complaint.aggravating || "",
        relieving: complaint.relieving || "",
        associatedSymptoms: complaint.associatedSymptoms || "",
      },
      history: r.history || r.medicalHistory || {},
      symptoms: {
        painScale: symptoms.painScale || 0,
        selectedCategories: symptoms.selectedCategories || [],
        vitals: symptoms.vitals || {},
        detailedDescription: symptoms.detailedDescription || "",
      },
      filesCount: Array.isArray(r.filesAttached) ? r.filesAttached.length : 0,
      filesAttached: r.filesAttached || [],
      assignedHandler: r.assignedHandlerName || "Attending Clinician",
      handlerId: r.assignedHandlerId || "",
      status: r.status || "pending_ai_analysis",
      submittedAt: r.submittedAt ? new Date(r.submittedAt).toISOString() : new Date().toISOString(),
      aiSummary: r.aiSummary || aiAnalysis.summary || null,
      aiRecommendations: r.aiRecommendations || null,
      aiAnalysis: Object.keys(aiAnalysis).length > 0 ? aiAnalysis : r.aiSummary ? { summary: r.aiSummary } : null,
      conferenceNotes: r.conferenceNotes || "",
      handlerNote: r.handlerNote || "",
      timeline,
    };

    return NextResponse.json({ success: true, data: detailedCase });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Failed to fetch case" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { status, handlerNote, conferenceNotes, aiSummary, aiRecommendations, aiAnalysis } = body;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.id);
    const condition = isUuid
      ? or(eq(cases.id, params.id), eq(cases.caseId, params.id), eq(cases.caseNumber, params.id))
      : or(eq(cases.caseId, params.id), eq(cases.caseNumber, params.id));

    const rows = await db
      .select()
      .from(cases)
      .where(condition)
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: "Case not found" }, { status: 404 });
    }

    const currentCase = rows[0];
    const updateFields: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (status) {
      updateFields.status = status;
      if (status === "resolved" || status === "closed") {
        updateFields.resolvedAt = new Date();
      }
    }

    if (handlerNote !== undefined) updateFields.handlerNote = handlerNote;
    if (conferenceNotes !== undefined) updateFields.conferenceNotes = conferenceNotes;
    if (aiSummary !== undefined) updateFields.aiSummary = aiSummary;
    if (aiRecommendations !== undefined) updateFields.aiRecommendations = aiRecommendations;
    if (aiAnalysis !== undefined) updateFields.aiAnalysis = aiAnalysis;

    // Append to timeline
    const existingTimeline = Array.isArray(currentCase.timeline) ? currentCase.timeline : [];
    if (status && status !== currentCase.status) {
      existingTimeline.push({
        time: new Date().toISOString(),
        event: `Status updated to ${status.replace(/_/g, " ")}`,
        actor: "Clinician",
        note: handlerNote || undefined,
      });
      updateFields.timeline = existingTimeline;
    }

    const [updated] = await db
      .update(cases)
      .set(updateFields)
      .where(eq(cases.id, currentCase.id))
      .returning();

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        caseId: updated.caseId,
        status: updated.status,
        updatedAt: new Date().toISOString(),
        message: "Case updated successfully",
      },
    });
  } catch (error: any) {
    console.error("[CASES API] PATCH error:", error);
    return NextResponse.json({ success: false, error: error.message || "Update failed" }, { status: 500 });
  }
}

