import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { patients } from "@/db/schema";
import { eq } from "drizzle-orm";
import { CaseWorkflowService } from "@/lib/services/case-workflow-service";
import { QueueService } from "@/lib/services/queue-service";
import { dispatchNotification } from "@/lib/notifications/notification-service";

export const dynamic = "force-dynamic";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      patientInfo = {},
      triageResult = {},
      provider = {},
      careFormat = "video",
      symptoms = {},
    } = body;

    const fullName = patientInfo.fullName || "Urgent Care Patient";
    const email = patientInfo.email || `patient-${Date.now()}@ninimed-urgent.org`;
    const phone = patientInfo.phone || "";

    // 1. Ensure patient record exists
    let [existingPatient] = await db
      .select()
      .from(patients)
      .where(eq(patients.email, email.trim().toLowerCase()))
      .limit(1);

    let patientId = existingPatient?.id;
    if (!existingPatient) {
      const parts = fullName.split(" ");
      const firstName = parts[0] || "Urgent";
      const lastName = parts.slice(1).join(" ") || "Patient";
      const mrn = `MRN-UC-${Date.now().toString().slice(-6)}`;

      const [newPatient] = await db
        .insert(patients)
        .values({
          tenantId: DEFAULT_TENANT_ID,
          mrn,
          firstName,
          lastName,
          email: email.trim().toLowerCase(),
          phone: phone || null,
          gender: "other",
          dateOfBirth: "1995-01-01",
        })
        .returning();

      existingPatient = newPatient;
      patientId = newPatient.id;
    }

    // 2. Create Case
    const chiefComplaint = symptoms.chiefComplaint || triageResult.summary || "Urgent Clinical Care Consultation";
    const urgency = triageResult.urgencyLevel || "urgent";

    const createdCase = await CaseWorkflowService.createCase({
      tenantId: DEFAULT_TENANT_ID,
      patientId: patientId!,
      chiefComplaint,
      priority: urgency,
      severity: urgency === "emergency" ? "very_severe" : "severe",
      personal: {
        fullName,
        email,
        phone,
        careFormat,
      },
      symptoms: {
        ...symptoms,
        triageSummary: triageResult.summary,
      },
      aiAnalysis: {
        triage: triageResult,
        careFormat,
      },
    });

    // 3. Assign Provider
    if (provider?.id) {
      await CaseWorkflowService.assignProvider({
        caseId: createdCase.caseId,
        providerId: provider.id,
        providerName: provider.fullName || "On-Call Urgent Care Physician",
        providerType: provider.role || "physician",
        specialty: provider.specialty || "Urgent Care",
        assignmentType: "patient_choice",
        notes: `Treat Me Now™ urgent intake via ${careFormat} format.`,
      });
    }

    // 4. Enqueue in Live Queue
    const queueEntry = await QueueService.enqueue({
      tenantId: DEFAULT_TENANT_ID,
      caseId: createdCase.id,
      patientId: patientId!,
      providerId: provider?.id || undefined,
      queueType: "treat_me_now",
      priority: urgency,
      metadata: {
        careFormat,
        chiefComplaint,
        doctorName: provider.fullName,
      },
    });

    const examRoomUrl = `/telemedicine/room-${createdCase.caseId}?role=patient&format=${careFormat}`;

    // Real-Time Notification: Broadcast to Urgent Care & Triage Clinicians
    await dispatchNotification({
      category: "appointments",
      type: "treat_me_now",
      title: `🚨 Urgent Intake: ${fullName} (#${createdCase.caseNumber})`,
      body: `Priority: ${urgency.toUpperCase()} • ${careFormat.toUpperCase()} visit requested. Chief Complaint: ${chiefComplaint}. Assigned: ${provider.fullName || "Urgent Care Pool"}.`,
      priority: urgency === "emergency" ? "critical" : "high",
      targetRole: "physician",
      recipientUserId: provider?.id || undefined,
      actionUrl: `/cases/${createdCase.caseId}`,
      actionText: "Enter Exam Room",
      relatedEntityType: "cases",
      relatedEntityId: createdCase.id,
      metadata: {
        caseNumber: createdCase.caseNumber,
        queuePosition: queueEntry.position,
        urgency,
        careFormat,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        caseId: createdCase.caseId,
        caseNumber: createdCase.caseNumber,
        queueId: queueEntry.id,
        position: queueEntry.position,
        estimatedWaitMinutes: queueEntry.estimatedWaitMinutes,
        assignedDoctor: provider,
        careFormat,
        examRoomUrl,
      },
    });
  } catch (err: any) {
    console.error("[Treat Me Now confirm error]:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to confirm urgent care visit" },
      { status: 500 }
    );
  }
}
