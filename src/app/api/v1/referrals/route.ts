import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { referrals, patients, users, notifications } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { executeWorkflowsForTrigger } from "@/lib/workflow/workflow-executor";
import { getAuthenticatedSessionUserId } from "@/lib/security/auth-session";

export const dynamic = "force-dynamic";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

const SEED_REFERRALS = [
  {
    id: "ref-001",
    organizationId: "org-aegis",
    patientId: "pat-01",
    patientName: "Eleanor Vance",
    type: "internal",
    source: "manual",
    referringUserId: "usr-doc-01",
    referringUserName: "Dr. Sarah Mitchell, MD",
    referringRole: "physician",
    receivingRole: "dietitian",
    receivingUserId: "usr-rd-01",
    receivingUserName: "Maya Lin, MS, RD",
    targetType: "professional",
    targetId: "usr-rd-01",
    priority: "urgent",
    status: "pending_review",
    clinicalReason: "T2DM with eGFR 52 — initiate renal MNT diet for 1,800 kcal / 2g Na",
    notes: "Patient has food desert barriers — please include community resource referral",
    dueBy: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "ref-002",
    organizationId: "org-aegis",
    patientId: "pat-01",
    patientName: "Eleanor Vance",
    type: "internal",
    source: "ai",
    referringUserId: "usr-doc-01",
    referringUserName: "Dr. Sarah Mitchell, MD",
    referringRole: "physician",
    receivingRole: "social_worker",
    receivingUserId: "usr-sw-01",
    receivingUserName: "Jordan Brooks, LCSW",
    targetType: "professional",
    targetId: "usr-sw-01",
    priority: "routine",
    status: "approved",
    clinicalReason: "Food insecurity risk and transportation access needs",
    notes: "Please include SNAP and public transportation resource coordination.",
    dueBy: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
] as any[];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");
    const role = searchParams.get("role");
    const status = searchParams.get("status");

    let query = db
      .select({
        id: referrals.id,
        organizationId: referrals.organizationId,
        patientId: referrals.patientId,
        patientFirstName: patients.firstName,
        patientLastName: patients.lastName,
        patientMrn: patients.mrn,
        type: referrals.type,
        source: referrals.source,
        referringUserId: referrals.referringUserId,
        referringRole: referrals.referringRole,
        receivingRole: referrals.receivingRole,
        receivingUserId: referrals.receivingUserId,
        priority: referrals.priority,
        status: referrals.status,
        clinicalReason: referrals.clinicalReason,
        clinicalSummary: referrals.clinicalSummary,
        notes: referrals.notes,
        insuranceAuthNumber: referrals.insuranceAuthNumber,
        scheduledAppointmentId: referrals.scheduledAppointmentId,
        dueBy: referrals.dueBy,
        acceptedAt: referrals.acceptedAt,
        completedAt: referrals.completedAt,
        responseNotes: referrals.responseNotes,
        attachedDataRefs: referrals.attachedDataRefs,
        createdAt: referrals.createdAt,
        updatedAt: referrals.updatedAt,
      })
      .from(referrals)
      .leftJoin(patients, eq(referrals.patientId, patients.id))
      .orderBy(desc(referrals.createdAt));

    const dbRows = await query;

    const shaped = dbRows.map((r) => {
      const details = (r.attachedDataRefs as any) || {};
      const targetWard = details.targetWard || (r.receivingRole ? r.receivingRole.replace(/_/g, " ").toUpperCase() : "Specialty Ward");

      // Rule: Do NOT show specific doctor unless patient requested & willing to wait OR has existing appointment
      const canShowSpecificDoctor = Boolean(
        ((details.isDoctorExplicitlyRequested && details.patientWillingToWait) ||
          details.hasExistingAppointment) &&
          (details.requestedDoctorName || r.receivingUserId)
      );

      const assignedDoctorName = canShowSpecificDoctor
        ? (details.requestedDoctorName || "Assigned Specialist, MD")
        : `On-Duty ${targetWard} Clinical Pool (First Available)`;

      return {
        id: r.id,
        organizationId: r.organizationId,
        patientId: r.patientId,
        patientName: `${r.patientFirstName || ""} ${r.patientLastName || ""}`.trim() || "Patient",
        patientMrn: r.patientMrn || `MRN-2026-${r.patientId.slice(0, 6).toUpperCase()}`,
        type: r.type,
        source: r.source,
        referringUserId: r.referringUserId,
        referringUserName: "Care Physician",
        referringRole: r.referringRole,
        receivingRole: r.receivingRole,
        receivingUserId: canShowSpecificDoctor ? r.receivingUserId : null,
        receivingUserName: assignedDoctorName,
        targetWard,
        canShowSpecificDoctor,
        isDoctorExplicitlyRequested: Boolean(details.isDoctorExplicitlyRequested),
        patientWillingToWait: Boolean(details.patientWillingToWait),
        hasExistingAppointment: Boolean(details.hasExistingAppointment),
        priority: r.priority,
        status: r.status,
        clinicalReason: r.clinicalReason,
        clinicalSummary: r.clinicalSummary || `Referral for ${r.patientFirstName} ${r.patientLastName}`,
        notes: r.notes,
        insuranceAuthNumber: r.insuranceAuthNumber,
        scheduledDate: r.scheduledAppointmentId,
        dueBy: r.dueBy,
        acceptedAt: r.acceptedAt,
        completedAt: r.completedAt,
        responseNotes: r.responseNotes,
        attachedDataRefs: r.attachedDataRefs,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      };
    });

    let results = shaped;
    if (patientId) results = results.filter((r) => r.patientId === patientId);
    if (role) results = results.filter((r) => r.referringRole === role || r.receivingRole === role);
    if (status) results = results.filter((r) => r.status === status);

    return NextResponse.json({
      success: true,
      data: results,
      referrals: results,
      total: results.length,
    });
  } catch (error: any) {
    console.error("Error fetching referrals:", error);
    return NextResponse.json({ success: true, data: [], referrals: [], total: 0 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionUserId = await getAuthenticatedSessionUserId(request);
    if (!sessionUserId) {
      return NextResponse.json({ success: false, error: "Unauthorized: authenticated session required" }, { status: 401 });
    }

    const body = await request.json();
    const {
      patientId,
      type = "internal",
      source = "manual",
      referringUserId,
      referringRole,
      receivingRole,
      priority = "routine",
      clinicalReason,
      clinicalSummary,
      notes,
      targetWard,
      isDoctorExplicitlyRequested = false,
      requestedDoctorName,
      requestedDoctorId,
      patientWillingToWait = false,
      hasExistingAppointment = false,
    } = body;

    let targetPatientId = patientId;
    if (!targetPatientId) {
      const [firstPat] = await db.select({ id: patients.id }).from(patients).limit(1);
      targetPatientId = firstPat?.id;
    }

    const targetUserId = sessionUserId;

    if (!targetPatientId || !targetUserId || !clinicalReason) {
      return NextResponse.json(
        { success: false, error: "Patient, referring clinician, and clinical reason are required" },
        { status: 400 }
      );
    }

    // Doctor assignment gate:
    // Only assign specific doctor if patient requested AND is willing to wait, OR has existing appointment
    const canAssignNamedDoctor = Boolean(
      ((isDoctorExplicitlyRequested && patientWillingToWait) || hasExistingAppointment) &&
      (requestedDoctorId || requestedDoctorName)
    );

    const resolvedWard = targetWard || (receivingRole ? receivingRole.replace(/_/g, " ").toUpperCase() : "Specialty Ward");

    const [newReferral] = await db
      .insert(referrals)
      .values({
        organizationId: DEFAULT_TENANT_ID,
        patientId: targetPatientId,
        type: (type as any) || "internal",
        source: (source as any) || "manual",
        referringUserId: targetUserId,
        referringRole: referringRole || "physician",
        receivingRole: receivingRole || "dietitian",
        receivingUserId: canAssignNamedDoctor ? requestedDoctorId : null,
        priority: (priority as any) || "routine",
        status: "pending_review",
        clinicalReason,
        clinicalSummary: clinicalSummary || `Referral to ${resolvedWard} for clinical assessment`,
        notes: notes || null,
        attachedDataRefs: {
          targetWard: resolvedWard,
          isDoctorExplicitlyRequested: Boolean(isDoctorExplicitlyRequested),
          requestedDoctorName: requestedDoctorName || null,
          patientWillingToWait: Boolean(patientWillingToWait),
          hasExistingAppointment: Boolean(hasExistingAppointment),
          canShowSpecificDoctor: canAssignNamedDoctor,
          assignedDoctorName: canAssignNamedDoctor
            ? requestedDoctorName
            : `On-Duty ${resolvedWard} Clinical Pool (First Available)`,
        } as any,
        insuranceAuthNumber: `AUTH-Nini-${Math.floor(100000 + Math.random() * 900000)}`,
      })
      .returning();

    // Notify all available professionals on duty in that specific ward / role
    try {
      const receivers = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.role, receivingRole as any))
        .limit(5);

      for (const receiver of receivers) {
        await db.insert(notifications).values({
          organizationId: DEFAULT_TENANT_ID,
          recipientUserId: receiver.id,
          senderUserId: targetUserId,
          type: "consult_request",
          title: `📋 New Ward Referral Awaiting Approval: ${resolvedWard} [${priority.toUpperCase()}]`,
          body: `New referral routed to the ${resolvedWard} team: "${clinicalReason}". On-duty staff must review and approve.`,
          priority: priority === "stat" || priority === "urgent" ? "critical" : "high",
          actionUrl: `/referrals`,
          relatedEntityType: "referrals",
          relatedEntityId: newReferral.id,
        });
      }

      // Notify patient if registered
      const [pat] = await db.select({ userId: patients.userId }).from(patients).where(eq(patients.id, targetPatientId)).limit(1);
      if (pat?.userId) {
        await db.insert(notifications).values({
          organizationId: DEFAULT_TENANT_ID,
          recipientUserId: pat.userId,
          type: "system_alert",
          title: "Specialist Referral Created",
          body: `Your care team has scheduled an interdisciplinary referral to ${receivingRole} for ${clinicalReason}.`,
          priority: "normal",
          actionUrl: `/patient/dashboard`,
          relatedEntityType: "referrals",
          relatedEntityId: newReferral.id,
        });
      }
    } catch (notifErr) {
      console.warn("Referral notification dispatch error (non-fatal):", notifErr);
    }

    await executeWorkflowsForTrigger({
      triggerEvent: "SPECIALIST_REFERRAL_CREATED",
      patientId: targetPatientId,
      triggeredByUserId: sessionUserId,
      subjectLabel: `${resolvedWard} referral`,
      patientActionUrl: `/patient/referrals?patientId=${targetPatientId}`,
      metadata: {
        referralId: newReferral.id,
        receivingRole: newReferral.receivingRole,
        priority: newReferral.priority,
        status: newReferral.status,
      },
    });

    return NextResponse.json({ success: true, data: newReferral }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating referral:", error);
    return NextResponse.json({ success: false, error: error?.message || "Internal error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const sessionUserId = await getAuthenticatedSessionUserId(request);
    if (!sessionUserId) {
      return NextResponse.json({ success: false, error: "Unauthorized: authenticated session required" }, { status: 401 });
    }

    const body = await request.json();
    const { id, status, responseNotes } = body;

    if (!id || !status) {
      return NextResponse.json({ success: false, error: "id and status required" }, { status: 400 });
    }

    const now = new Date();
    const [updated] = await db
      .update(referrals)
      .set({
        status: status as any,
        responseNotes: responseNotes || null,
        updatedAt: now,
        ...(status === "accepted" || status === "approved" ? { acceptedAt: now } : {}),
        ...(status === "completed" ? { completedAt: now } : {}),
      })
      .where(eq(referrals.id, id))
      .returning();

    // If referral updated, notify referring doctor and patient
    if (updated?.referringUserId) {
      try {
        await db.insert(notifications).values({
          organizationId: DEFAULT_TENANT_ID,
          recipientUserId: updated.referringUserId,
          type: "system_alert",
          title: `Referral Status: ${status.toUpperCase()}`,
          body: `Referral #${id.slice(0, 8)} has been updated to ${status}.${responseNotes ? ` Note: ${responseNotes}` : ""}`,
          priority: "normal",
          actionUrl: `/referrals`,
          relatedEntityType: "referrals",
          relatedEntityId: id,
        });
      } catch {}
    }

    if (updated) {
      const triggerEvent = status === "completed"
        ? "SPECIALIST_REFERRAL_COMPLETED"
        : status === "accepted" || status === "approved"
          ? "SPECIALIST_REFERRAL_ACCEPTED"
          : null;

      if (triggerEvent) {
        await executeWorkflowsForTrigger({
          triggerEvent,
          patientId: updated.patientId,
          triggeredByUserId: sessionUserId,
          subjectLabel: `${updated.receivingRole.replace(/_/g, " ")} referral`,
          patientActionUrl: `/patient/referrals?patientId=${updated.patientId}`,
          metadata: {
            referralId: updated.id,
            status: updated.status,
            responseNotes: updated.responseNotes,
          },
        });
      }
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("Error updating referral:", error);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
