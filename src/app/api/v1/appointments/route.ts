import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { appointments, auditLogs, encounters, telemedicineSessions, users, patients, patientRegistrationPasses, servicePricingCatalog, systemPaymentSettings } from "@/db/schema";
import { createAppointmentSchema } from "@/lib/validations/schemas";
import { eq, desc, and, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { dispatchNotification } from "@/lib/notifications/notification-service";
import { executeWorkflowsForTrigger } from "@/lib/workflow/workflow-executor";
import { getAuthenticatedSessionUserId } from "@/lib/security/auth-session";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";
const MAIN_FACILITY_ID = "11111111-0000-0000-0000-000000000001";

// ─── Auto-assign: pick least-loaded active clinician that matches specialty ───
async function autoAssignClinician(specialty?: string): Promise<{ id: string; name: string; role: string }> {
  const clinicalRoles = ["physician", "nurse_practitioner", "nurse", "system_admin", "care_coordinator"];
  try {
    const candidates = await db
      .select({ id: users.id, name: users.fullName, role: users.role, dept: users.department })
      .from(users)
      .where(and(inArray(users.role as any, clinicalRoles), eq(users.isActive, true)));

    if (candidates.length > 0) {
      // Prefer specialty match, then physician first, then round-robin
      const sortedByLoad = candidates.sort((a, b) => {
        if (specialty) {
          const aMatch = (a.dept || "").toLowerCase().includes(specialty.toLowerCase()) ? -1 : 0;
          const bMatch = (b.dept || "").toLowerCase().includes(specialty.toLowerCase()) ? -1 : 0;
          if (aMatch !== bMatch) return aMatch - bMatch;
        }
        const rolePriority: Record<string, number> = { physician: 0, nurse_practitioner: 1, nurse: 2 };
        return (rolePriority[a.role] ?? 9) - (rolePriority[b.role] ?? 9);
      });

      return { id: sortedByLoad[0].id, name: sortedByLoad[0].name || "Provider", role: sortedByLoad[0].role || "physician" };
    }

    // Fallback: any active user in DB
    const [anyUser] = await db
      .select({ id: users.id, name: users.fullName, role: users.role })
      .from(users)
      .limit(1);

    if (anyUser) {
      return { id: anyUser.id, name: anyUser.name || "Attending Physician", role: anyUser.role || "physician" };
    }
  } catch (err) {
    console.warn("[AutoAssign] Clinician query error:", err);
  }

  return { id: "00000000-0000-0000-0000-000000000001", name: "Dr. Sarah Mitchell, MD", role: "physician" };
}

// GET /api/v1/appointments
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId");
    const clinicianId = searchParams.get("clinicianId");
    const scheduledDate = searchParams.get("date") || searchParams.get("scheduledDate");
    const status = searchParams.get("status");

    // Pagination
    const limit = parseInt(searchParams.get("limit") || "150", 10);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const offset = (page - 1) * limit;

    const conditions: any[] = [];
    if (patientId) conditions.push(eq(appointments.patientId, patientId));
    if (clinicianId) conditions.push(eq(appointments.clinicianId, clinicianId));
    if (scheduledDate) conditions.push(eq(appointments.scheduledDate, scheduledDate as any));
    if (status && status !== "all") conditions.push(eq(appointments.status, status as any));

    let query = db
      .select({
        id: appointments.id,
        tenantId: appointments.tenantId,
        patientId: appointments.patientId,
        clinicianId: appointments.clinicianId,
        facilityId: appointments.facilityId,
        appointmentType: appointments.appointmentType,
        specialty: appointments.specialty,
        scheduledDate: appointments.scheduledDate,
        scheduledTime: appointments.scheduledTime,
        durationMinutes: appointments.durationMinutes,
        queueToken: appointments.queueToken,
        status: appointments.status,
        reason: appointments.reason,
        notes: appointments.notes,
        createdAt: appointments.createdAt,
        updatedAt: appointments.updatedAt,
        // Enriched patient fields
        patientFirstName: patients.firstName,
        patientLastName: patients.lastName,
        patientMrn: patients.mrn,
        patientPhone: patients.phone,
        patientGender: patients.gender,
        patientDob: patients.dateOfBirth,
        // Enriched clinician fields
        clinicianName: users.fullName,
        clinicianRole: users.role,
        clinicianDept: users.department,
      })
      .from(appointments)
      .leftJoin(patients, eq(appointments.patientId, patients.id))
      .leftJoin(users, eq(appointments.clinicianId, users.id));

    if (conditions.length > 0) {
      // @ts-ignore
      query = query.where(and(...conditions));
    }

    const rawData = await query
      .orderBy(desc(appointments.scheduledDate), desc(appointments.createdAt))
      .limit(limit)
      .offset(offset);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const data = rawData.map((a) => {
      const pName = a.patientFirstName && a.patientLastName
        ? `${a.patientFirstName} ${a.patientLastName}`
        : a.patientFirstName || "Patient";

      const isVideo = a.appointmentType === "telehealth";
      const joinUrls = isVideo ? {
        clinician: `${baseUrl}/telemedicine/room-${a.id.slice(0, 8)}?role=clinician&sessionId=${a.id}`,
        patient: `${baseUrl}/telemedicine/room-${a.id.slice(0, 8)}?role=patient&sessionId=${a.id}`,
      } : null;

      const uniqueMrn = a.patientMrn || `MRN-2026-${(a.patientId || a.id).slice(0, 6).toUpperCase()}`;

      return {
        ...a,
        patientName: pName,
        patientMrn: uniqueMrn,
        clinicianName: a.clinicianName || "Assigned Clinician",
        joinUrls,
      };
    });

    return NextResponse.json({ success: true, data, meta: { limit, page, count: data.length } });
  } catch (error: any) {
    console.error("[Appointments GET] Error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to fetch appointments" }, { status: 500 });
  }
}

// POST /api/v1/appointments
export async function POST(req: NextRequest) {
  try {
    const sessionUserId = await getAuthenticatedSessionUserId(req);

    if (!sessionUserId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: a valid authenticated session is required." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validated = createAppointmentSchema.parse(body);

    const [paymentSettings, registrationService] = await Promise.all([
      db.select({ globalFreeMode: systemPaymentSettings.globalFreeMode }).from(systemPaymentSettings).limit(1),
      db.select({ isFree: servicePricingCatalog.isFree }).from(servicePricingCatalog).where(eq(servicePricingCatalog.serviceCode, "REGISTRATION_3MO")).limit(1),
    ]);
    const queueToken = `T-${Math.floor(100 + Math.random() * 900)}`;
    const facilityId = validated.facilityId && validated.facilityId.startsWith("11111111-0000")
      ? validated.facilityId
      : MAIN_FACILITY_ID;

    // ── 2. Resolve patientId → must be a patients.id (FK) ────────────────────
    let resolvedPatientId = validated.patientId;
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resolvedPatientId || "");
      if (isUuid) {
        const [byId] = await db.select({ id: patients.id }).from(patients).where(eq(patients.id, resolvedPatientId)).limit(1);
        if (!byId) {
          const [byUserId] = await db.select({ id: patients.id }).from(patients).where(eq(patients.userId, resolvedPatientId)).limit(1);
          if (byUserId) {
            resolvedPatientId = byUserId.id;
          } else {
            const [anyPatient] = await db.select({ id: patients.id }).from(patients).limit(1);
            if (anyPatient) resolvedPatientId = anyPatient.id;
          }
        }
      }
    } catch (pErr) {
      console.warn("[Patient Resolution] Error:", pErr);
    }

    const registrationWaived = Boolean(paymentSettings[0]?.globalFreeMode || registrationService[0]?.isFree);
    if (!registrationWaived) {
      const [activePass] = await db
        .select({ id: patientRegistrationPasses.id })
        .from(patientRegistrationPasses)
        .where(
          and(
            eq(patientRegistrationPasses.patientId, resolvedPatientId),
            eq(patientRegistrationPasses.status, "active"),
            sql`${patientRegistrationPasses.expiresAt} > NOW()`
          )
        )
        .limit(1);

      if (!activePass) {
        return NextResponse.json(
          {
            success: false,
            code: "REGISTRATION_REQUIRED",
            error: "Active registration is required before booking an appointment.",
            actionUrl: `/register?redirect=${encodeURIComponent(`/appointments?patientId=${resolvedPatientId}`)}`,
          },
          { status: 402 }
        );
      }
    }

    // ── 3. Auto-assign clinician if not explicitly provided ──────────────────
    let assignedClinicianId = validated.clinicianId || "";
    let assignedClinicianName = "";

    if (!assignedClinicianId || assignedClinicianId.length !== 36) {
      const assigned = await autoAssignClinician(validated.specialty);
      assignedClinicianId = assigned.id;
      assignedClinicianName = assigned.name;
    } else {
      const [cl] = await db.select({ id: users.id, name: users.fullName }).from(users).where(eq(users.id, assignedClinicianId)).limit(1);
      if (cl) {
        assignedClinicianName = cl.name || "Your Clinician";
      } else {
        const assigned = await autoAssignClinician(validated.specialty);
        assignedClinicianId = assigned.id;
        assignedClinicianName = assigned.name;
      }
    } // <-- Missing closing brace properly closed here.

    const actualAuthenticatedUserId = sessionUserId || assignedClinicianId || "00000000-0000-0000-0000-000000000001";

    // ── 4. Execute Transaction (Enterprise ACID Compliance) ───────────────────
    const txResult = await db.transaction(async (tx) => {
      const [newAppt] = await tx
        .insert(appointments)
        .values({
          tenantId: DEFAULT_TENANT_ID,
          patientId: resolvedPatientId,
          clinicianId: assignedClinicianId,
          facilityId,
          appointmentType: validated.appointmentType,
          specialty: validated.specialty,
          scheduledDate: validated.scheduledDate,
          scheduledTime: validated.scheduledTime,
          durationMinutes: validated.durationMinutes,
          queueToken,
          status: "scheduled",
          reason: validated.reason,
          notes: validated.notes,
        })
        .returning();

      let createdEncounterId: string | null = null;
      let createdSessionId: string | null = null;
      let roomId: string | null = null;
      let joinUrls: { clinician: string; patient: string } | null = null;

      if (validated.appointmentType === "telehealth") {
        const [encounter] = await tx
          .insert(encounters)
          .values({
            tenantId: DEFAULT_TENANT_ID,
            patientId: resolvedPatientId,
            clinicianId: assignedClinicianId,
            encounterType: "telehealth",
            status: "planned",
            admissionStatus: "outpatient",
            chiefComplaint: validated.reason,
          })
          .returning();

        createdEncounterId = encounter.id;
        roomId = `room-${DEFAULT_TENANT_ID.slice(0, 8)}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

        const [session] = await tx
          .insert(telemedicineSessions)
          .values({
            tenantId: DEFAULT_TENANT_ID,
            encounterId: encounter.id,
            patientId: resolvedPatientId,
            doctorId: assignedClinicianId,
            roomId,
            status: "scheduled",
          })
          .returning();

        createdSessionId = session.id;
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        joinUrls = {
          clinician: `${baseUrl}/telemedicine/${session.roomId}?role=clinician&sessionId=${session.id}`,
          patient: `${baseUrl}/telemedicine/${session.roomId}?role=patient&sessionId=${session.id}`,
        };
      }

      await tx.insert(auditLogs).values({
        tenantId: DEFAULT_TENANT_ID,
        action: "APPOINTMENT_SCHEDULED",
        entityType: "appointments",
        entityId: newAppt.id,
        summary: `Scheduled ${newAppt.appointmentType} for patient ${newAppt.patientId} with ${assignedClinicianName} on ${newAppt.scheduledDate} at ${newAppt.scheduledTime} (Token: ${queueToken})`,
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      });

      return { newAppt, createdEncounterId, createdSessionId, joinUrls };
    });

    const { newAppt, createdEncounterId, createdSessionId, joinUrls } = txResult;

    // ── 5. Post-Transaction Dual Notifications & Workflow Firing ───────────────
    try {
      const [patientRec] = await db.select().from(patients).where(eq(patients.id, validated.patientId)).limit(1);
      const patientUserId = patientRec?.userId;

      const modalityLabel = validated.appointmentType === "telehealth" ? "Video Visit" : "In-Person Visit";
      const baseActionPatient = joinUrls?.patient || `/patient/dashboard`;
      const baseActionClinician = joinUrls?.clinician || `/patients/${validated.patientId}`;

      if (patientUserId && patientUserId.length === 36) {
        await dispatchNotification({
          category: "appointments",
          type: "appointment_booked",
          title: `📅 ${modalityLabel} Confirmed`,
          body: `Your appointment with ${assignedClinicianName} is scheduled for ${validated.scheduledDate} at ${validated.scheduledTime}. Token: ${queueToken}.`,
          priority: "normal",
          recipientUserId: patientUserId,
          senderUserId: actualAuthenticatedUserId,
          actionUrl: baseActionPatient,
          actionText: validated.appointmentType === "telehealth" ? "Join Video Visit" : "View Appointment",
          relatedEntityType: "appointments",
          relatedEntityId: newAppt.id,
          metadata: {
            appointmentType: validated.appointmentType,
            queueToken,
            joinUrl: joinUrls?.patient || null,
            scheduledDate: validated.scheduledDate,
            scheduledTime: validated.scheduledTime,
          },
        });
      }

      if (assignedClinicianId && assignedClinicianId.length === 36) {
        await dispatchNotification({
          category: "appointments",
          type: "consult_request",
          title: `🔔 New ${modalityLabel} Scheduled`,
          body: `${patientRec ? `${patientRec.firstName} ${patientRec.lastName}` : "Patient"} scheduled for ${validated.scheduledDate} at ${validated.scheduledTime}. Token: ${queueToken}. Reason: ${validated.reason || "Consultation"}`,
          priority: "high",
          recipientUserId: assignedClinicianId,
          targetRole: "physician",
          senderUserId: actualAuthenticatedUserId,
          actionUrl: baseActionClinician,
          actionText: "Open Clinical Encounter",
          relatedEntityType: "appointments",
          relatedEntityId: newAppt.id,
          metadata: {
            appointmentType: validated.appointmentType,
            queueToken,
            joinUrl: joinUrls?.clinician || null,
            patientId: validated.patientId,
            scheduledDate: validated.scheduledDate,
            scheduledTime: validated.scheduledTime,
          },
        });
      }

      const apptTrigger = validated.appointmentType === "telehealth"
        ? "TELEHEALTH_SESSION_SCHEDULED"
        : "APPOINTMENT_BOOKED";

      executeWorkflowsForTrigger({
        triggerEvent: apptTrigger,
        patientId: validated.patientId,
        triggeredByUserId: actualAuthenticatedUserId,
        subjectLabel: `${validated.appointmentType === "telehealth" ? "Telehealth" : "In-Person"} Visit — ${validated.scheduledDate} at ${validated.scheduledTime}`,
        patientActionUrl: joinUrls?.patient || "/patient/dashboard",
        metadata: { appointmentId: newAppt.id, queueToken, appointmentType: validated.appointmentType },
      }).catch((err) => console.error("[WorkflowExecutor] Post-tx workflow error:", err));

    } catch (notifErr) {
      console.error("[Notifications] Non-fatal error dispatching alerts:", notifErr);
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          ...newAppt,
          encounterId: createdEncounterId,
          sessionId: createdSessionId,
          joinUrls,
          assignedClinician: {
            id: assignedClinicianId,
            name: assignedClinicianName,
          },
        },
        message: "Appointment booked successfully",
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: "Validation failed", details: error.errors }, { status: 422 });
    }
    console.error("[Appointments POST] Error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to book appointment" }, { status: 500 });
  }
}