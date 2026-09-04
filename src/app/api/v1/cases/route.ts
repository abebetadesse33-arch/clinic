import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { cases, users, notifications, patients, telemedicineSessions, encounters } from "@/db/schema";
import { eq, desc, and, or, inArray } from "drizzle-orm";

export const dynamic = "force-dynamic";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

async function getAvailableClinicians() {
  try {
    const clinicianRoles = ["physician", "nurse_practitioner", "care_coordinator", "system_admin", "nurse"];
    const found = await db
      .select({ id: users.id, name: users.fullName, role: users.role, department: users.department })
      .from(users)
      .where(inArray(users.role, clinicianRoles as any));

    if (found.length > 0) {
      return found.map((u) => ({
        id: u.id,
        name: u.name,
        role: u.role,
        specialty: u.department || (u.role === "physician" ? "Internal Medicine" : "Clinical Care"),
        available: true,
      }));
    }

    const allUsers = await db
      .select({ id: users.id, name: users.fullName, role: users.role, department: users.department })
      .from(users)
      .limit(5);

    if (allUsers.length > 0) {
      return allUsers.map((u) => ({
        id: u.id,
        name: u.name || "Attending Clinician",
        role: u.role || "physician",
        specialty: u.department || "Internal Medicine",
        available: true,
      }));
    }
  } catch (err) {
    console.warn("getAvailableClinicians query error:", err);
  }

  return [
    { id: "00000000-0000-0000-0000-000000000001", name: "Dr. Sarah Mitchell, MD", role: "physician", specialty: "Internal Medicine", available: true },
  ];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { personal, complaint, history, symptoms, filesCount, fileNames, fileTypes, patientId: passedPatientId } = body;

    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    const caseId = `CASE-${new Date().getFullYear()}-${random}`;

    const handlers = await getAvailableClinicians();
    const handler = complaint?.seekingUrgent || complaint?.severity === "very_severe"
      ? (handlers.find((h) => h.role === "physician" || h.role === "system_admin") || handlers[0])
      : handlers[0];

    const attached = body.filesAttached || fileNames?.map((fn: string, i: number) => ({
      name: fn,
      type: fileTypes?.[i] || "document",
    })) || [];

    const now = new Date();
    const initialTimeline = [
      { time: now.toISOString(), event: "Case submitted by patient", actor: "Patient" },
      { time: now.toISOString(), event: `Auto-assigned to ${handler.name}`, actor: "System" },
    ];

    const resolvedPatient = {
      fullName: personal?.fullName || "Patient",
      gender: personal?.gender || "undisclosed",
      dateOfBirth: personal?.dateOfBirth || "",
      phone: personal?.phone || "",
      email: personal?.email || "",
      address: personal?.address || "",
      occupation: personal?.occupation || "",
      emergencyContact: personal?.emergencyContact || "",
      emergencyPhone: personal?.emergencyPhone || "",
      mrn: personal?.mrn || "",
    };

    const resolvedComplaint = {
      chiefComplaint: complaint?.chiefComplaint || "Clinical Consultation Request",
      severity: complaint?.severity || "moderate",
      onset: complaint?.onset || "gradual",
      duration: complaint?.duration || "Recent",
      location: complaint?.location || "",
      aggravating: complaint?.aggravating || "",
      relieving: complaint?.relieving || "",
      associatedSymptoms: complaint?.associatedSymptoms || "",
      previousSimilar: Boolean(complaint?.previousSimilar),
      seekingUrgent: Boolean(complaint?.seekingUrgent),
    };

    // Insert into PostgreSQL cases table
    const [insertedCase] = await db
      .insert(cases)
      .values({
        caseId,
        caseNumber: caseId,
        tenantId: DEFAULT_TENANT_ID,
        patientId: passedPatientId && passedPatientId.length === 36 ? passedPatientId : null,
        status: "pending_ai_analysis",
        chiefComplaint: resolvedComplaint.chiefComplaint,
        severity: resolvedComplaint.severity as any,
        assignedHandlerId: handler.id,
        assignedHandlerName: handler.name,
        assignedRole: handler.role,
        personal: resolvedPatient,
        patientInfo: resolvedPatient,
        complaint: resolvedComplaint,
        complaintDetails: resolvedComplaint,
        history: history || {},
        medicalHistory: history || {},
        symptoms: symptoms || {},
        filesAttached: attached,
        timeline: initialTimeline,
        submittedAt: now,
      })
      .returning();

    // ── Provision real telemedicine session for urgent / video requests ──────
    let urgentJoinUrls: { patient: string; clinician: string } | null = null;
    let urgentSessionId: string | null = null;
    if (body.seekingVideo || complaint?.seekingUrgent || complaint?.severity === "very_severe") {
      try {
        // Resolve patientId → must be patients.id, not users.id
        let resolvedPatientGuid: string | null = null;
        if (passedPatientId && passedPatientId.length === 36) {
          const [byPatId] = await db.select({ id: patients.id }).from(patients).where(eq(patients.id, passedPatientId)).limit(1);
          if (byPatId) {
            resolvedPatientGuid = byPatId.id;
          } else {
            const [byUserId] = await db.select({ id: patients.id }).from(patients).where(eq(patients.userId, passedPatientId)).limit(1);
            if (byUserId) resolvedPatientGuid = byUserId.id;
          }
        }
        if (!resolvedPatientGuid) {
          const [anyPat] = await db.select({ id: patients.id }).from(patients).limit(1);
          resolvedPatientGuid = anyPat?.id ?? null;
        }

        const resolvedClinicianGuid = handler.id && handler.id.length === 36 ? handler.id : null;
        if (!resolvedClinicianGuid) throw new Error("No valid clinician found");
        if (!resolvedPatientGuid) throw new Error("No valid patient found");

        const [encounter] = await db
          .insert(encounters)
          .values({
            tenantId: DEFAULT_TENANT_ID,
            patientId: resolvedPatientGuid,
            clinicianId: resolvedClinicianGuid,
            encounterType: "telehealth",
            status: "planned",
            admissionStatus: "outpatient",
            chiefComplaint: resolvedComplaint.chiefComplaint,
          })
          .returning();

        const urgentRoomId = `urgent-${DEFAULT_TENANT_ID.slice(0, 8)}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const [urgentSession] = await db
          .insert(telemedicineSessions)
          .values({
            tenantId: DEFAULT_TENANT_ID,
            encounterId: encounter.id,
            patientId: resolvedPatientGuid,
            doctorId: resolvedClinicianGuid,
            roomId: urgentRoomId,
            status: "scheduled",
          })
          .returning();

        urgentSessionId = urgentSession.id;
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        urgentJoinUrls = {
          patient:   `${baseUrl}/telemedicine/${urgentSession.roomId}?role=patient&sessionId=${urgentSession.id}`,
          clinician: `${baseUrl}/telemedicine/${urgentSession.roomId}?role=clinician&sessionId=${urgentSession.id}`,
        };
      } catch (sessionErr) {
        console.error("Urgent session provision error (non-fatal):", sessionErr);
      }
    }

    // Trigger async AI analysis
    const origin = request.nextUrl.origin || "http://localhost:3000";
    fetch(`${origin}/api/v1/ai/analyze-case`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caseId,
        personal: resolvedPatient,
        complaint: resolvedComplaint,
        history,
        symptoms,
        fileNames,
        fileTypes,
      }),
    }).catch((err) => {
      console.error("AI trigger error (non-fatal):", err);
    });

    // ── Dual notifications: clinician + patient ─────────────────────────────
    if (handler.id && handler.id.length === 36) {
      try {
        await db.insert(notifications).values({
          organizationId: DEFAULT_TENANT_ID,
          recipientUserId: handler.id,
          type: "consult_request",
          title: `🚨 ${resolvedComplaint.seekingUrgent ? "URGENT" : "New"} Case Assigned: ${caseId}`,
          body: `${resolvedComplaint.chiefComplaint} — Severity: ${resolvedComplaint.severity}. Patient: ${resolvedPatient.fullName}.${urgentJoinUrls ? " Video room is ready." : ""}`,
          priority: resolvedComplaint.seekingUrgent ? "critical" : "high",
          actionUrl: urgentJoinUrls?.clinician || `/cases/${caseId}`,
          relatedEntityType: "cases",
          relatedEntityId: insertedCase.id,
          metadata: { caseId, joinUrl: urgentJoinUrls?.clinician || null },
        });
      } catch { }
    }
    // Notify patient (if linked userId exists)
    if (passedPatientId && passedPatientId.length === 36) {
      try {
        const [patientRec] = await db.select().from(patients).where(eq(patients.id, passedPatientId)).limit(1);
        if (patientRec?.userId) {
          await db.insert(notifications).values({
            organizationId: DEFAULT_TENANT_ID,
            recipientUserId: patientRec.userId,
            senderUserId: handler.id && handler.id.length === 36 ? handler.id : undefined,
            type: "system_alert",
            title: resolvedComplaint.seekingUrgent ? "🚨 Clinician Assigned — Join Now" : "✅ Case Received",
            body: `Your request has been received and assigned to ${handler.name}. Case ID: ${caseId}.${urgentJoinUrls ? " Your video room is open — click to join." : " You will be contacted shortly."}`,
            priority: resolvedComplaint.seekingUrgent ? "critical" : "normal",
            actionUrl: urgentJoinUrls?.patient || `/patient/cases`,
            relatedEntityType: "cases",
            relatedEntityId: insertedCase.id,
            metadata: { caseId, joinUrl: urgentJoinUrls?.patient || null },
          });
        }
      } catch { }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: insertedCase.id,
        caseId,
        caseNumber: caseId,
        assignedHandler: handler.name,
        assignedRole: handler.role,
        handlerId: handler.id,
        status: "pending_ai_analysis",
        estimatedResponseHours: resolvedComplaint.seekingUrgent ? 0 : 24,
        submittedAt: now.toISOString(),
        filesAttached: attached.length,
        sessionId: urgentSessionId,
        joinUrls: urgentJoinUrls,
        message: `Your case has been received and assigned to ${handler.name}. AI pre-analysis is underway.${ urgentJoinUrls ? " Your video room is ready — you can join now." : "" }`,
      },
    });
  } catch (error: any) {
    console.error("[CASES API] POST error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to submit case" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const handlerId = searchParams.get("handlerId");
    const patientId = searchParams.get("patientId");
    const limit = parseInt(searchParams.get("limit") || "50");

    const conditions: any[] = [];
    if (status) conditions.push(eq(cases.status, status as any));
    if (handlerId) conditions.push(eq(cases.assignedHandlerId, handlerId));
    if (patientId) conditions.push(eq(cases.patientId, patientId));

    let query = db.select().from(cases);
    if (conditions.length > 0) {
      // @ts-ignore
      query = query.where(and(...conditions));
    }

    const rows = await query.orderBy(desc(cases.submittedAt), desc(cases.createdAt)).limit(limit);

    // Normalize items for UI consumption
    const normalized = rows.map((r) => {
      const personal = (r.personal || r.patientInfo || {}) as any;
      const complaint = (r.complaint || r.complaintDetails || {}) as any;
      const symptoms = (r.symptoms || {}) as any;
      const aiAnalysis = (r.aiAnalysis || {}) as any;

      return {
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
        timeline: r.timeline || [],
      };
    });

    const handlers = await getAvailableClinicians();

    return NextResponse.json({
      success: true,
      data: {
        cases: normalized,
        total: normalized.length,
        handlers,
      },
    });
  } catch (error: any) {
    console.error("[CASES API] GET error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to fetch cases" }, { status: 500 });
  }
}

