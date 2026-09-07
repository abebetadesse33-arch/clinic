import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { referrals, patients, users, notifications } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { logPatientActivity } from "@/lib/audit/activity-logger";
import { dispatchNotification } from "@/lib/notifications/notification-service";

export const dynamic = "force-dynamic";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

const DEPARTMENT_ROLE_MAP: Record<string, string> = {
  laboratory: "pathologist",
  pharmacy: "pharmacist",
  physiotherapy: "physiotherapist",
  specialist: "physician",
  imaging: "radiologist",
  nutrition: "dietitian",
  psychology: "psychologist",
  social_work: "social_worker",
  admission: "care_coordinator",
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");
    const department = searchParams.get("department");
    const priority = searchParams.get("priority");

    let query = db
      .select({
        id: referrals.id,
        patientId: referrals.patientId,
        patientFirstName: patients.firstName,
        patientLastName: patients.lastName,
        patientMrn: patients.mrn,
        type: referrals.type,
        receivingRole: referrals.receivingRole,
        priority: referrals.priority,
        status: referrals.status,
        clinicalReason: referrals.clinicalReason,
        clinicalSummary: referrals.clinicalSummary,
        notes: referrals.notes,
        attachedDataRefs: referrals.attachedDataRefs,
        createdAt: referrals.createdAt,
      })
      .from(referrals)
      .leftJoin(patients, eq(referrals.patientId, patients.id))
      .orderBy(desc(referrals.createdAt));

    const rows = await query;

    let filtered = rows;
    if (patientId) {
      filtered = filtered.filter((r) => r.patientId === patientId);
    }
    if (priority) {
      filtered = filtered.filter((r) => r.priority === priority);
    }
    if (department) {
      const targetRole = DEPARTMENT_ROLE_MAP[department] || department;
      filtered = filtered.filter((r) => r.receivingRole === targetRole);
    }

    return NextResponse.json({
      success: true,
      data: filtered.map((r) => ({
        id: r.id,
        orderNumber: `ORD-${r.id.slice(0, 8).toUpperCase()}`,
        patientId: r.patientId,
        patientName: `${r.patientFirstName || ""} ${r.patientLastName || ""}`.trim() || "Patient",
        patientMrn: r.patientMrn,
        receivingRole: r.receivingRole,
        priority: r.priority,
        status: r.status,
        orderTitle: r.clinicalReason,
        clinicalSummary: r.clinicalSummary,
        notes: r.notes,
        details: r.attachedDataRefs,
        createdAt: r.createdAt,
      })),
    });
  } catch (error: any) {
    console.error("Failed to fetch clinical orders:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      patientId,
      department,
      orderTitle,
      priority = "routine",
      clinicalIndication,
      instructions,
      items = [],
      subCategory,
      notes,
      targetWard,
      isDoctorExplicitlyRequested = false,
      requestedDoctorName,
      requestedDoctorId,
      patientWillingToWait = false,
      hasExistingAppointment = false,
      laboratoryDetails,
    } = body;

    if (!patientId || !department || !orderTitle) {
      return NextResponse.json(
        { success: false, error: "Patient ID, target department, and order title are required." },
        { status: 400 }
      );
    }

    // Resolve Patient details
    const [patientRecord] = await db
      .select({ firstName: patients.firstName, lastName: patients.lastName, mrn: patients.mrn })
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);

    if (!patientRecord) {
      return NextResponse.json(
        { success: false, error: "The selected patient could not be found. Refresh the patient list and select a valid patient." },
        { status: 400 }
      );
    }

    const patientName = `${patientRecord.firstName} ${patientRecord.lastName}`;
    const patientMrn = patientRecord.mrn;

    // Resolve Attending Physician / Referrer
    const [firstPhysician] = await db
      .select({ id: users.id, fullName: users.fullName, role: users.role })
      .from(users)
      .where(eq(users.role, "physician"))
      .limit(1);

    const referringUserId = firstPhysician?.id || "11111111-1111-1111-1111-111111111101";
    const referringName = firstPhysician?.fullName || "Attending Physician, MD";
    const receivingRole = DEPARTMENT_ROLE_MAP[department] || "physician";
    const resolvedWard = targetWard || department.replace(/_/g, " ").toUpperCase() + " WARD";

    // Doctor assignment gate:
    // Only assign/reveal specific doctor if patient requested AND is willing to wait, OR has existing appointment
    const canAssignNamedDoctor = Boolean(
      ((isDoctorExplicitlyRequested && patientWillingToWait) || hasExistingAppointment) &&
      (requestedDoctorId || requestedDoctorName)
    );

    // Insert into referrals table awaiting ward approval
    const [newReferral] = await db
      .insert(referrals)
      .values({
        organizationId: DEFAULT_TENANT_ID,
        patientId,
        type: "internal",
        source: "manual",
        referringUserId,
        referringRole: "physician",
        receivingRole,
        receivingUserId: canAssignNamedDoctor ? requestedDoctorId : null,
        priority: (priority as any) || "routine",
        status: "pending_review",
        clinicalReason: orderTitle,
        clinicalSummary: clinicalIndication || `Physician clinical order dispatched to ${resolvedWard}`,
        notes: instructions || notes || null,
        attachedDataRefs: {
          department,
          targetWard: resolvedWard,
          subCategory: subCategory || null,
          items: Array.isArray(items) ? items : [items],
          instructions: instructions || null,
          isDoctorExplicitlyRequested: Boolean(isDoctorExplicitlyRequested),
          requestedDoctorName: requestedDoctorName || null,
          patientWillingToWait: Boolean(patientWillingToWait),
          hasExistingAppointment: Boolean(hasExistingAppointment),
          laboratoryDetails: department === "laboratory" && laboratoryDetails ? laboratoryDetails : null,
          canShowSpecificDoctor: canAssignNamedDoctor,
          assignedDoctorName: canAssignNamedDoctor
            ? requestedDoctorName
            : `On-Duty ${resolvedWard} Clinical Pool (First Available)`,
          orderTimestamp: new Date().toISOString(),
        } as any,
      })
      .returning();

    const orderNumber = `ORD-${newReferral.id.slice(0, 8).toUpperCase()}`;

    // Log immutable patient activity event
    const activitySeverity = priority === "stat" ? "critical" : priority === "urgent" ? "warning" : "info";
    await logPatientActivity({
      patientId,
      actorUserId: referringUserId,
      actorName: referringName,
      actorRole: "physician",
      activityType: department === "laboratory" ? "lab_ordered" : department === "pharmacy" ? "prescription_issued" : "care_message_sent",
      title: `⚡ Clinical Order (${priority.toUpperCase()}): ${orderTitle}`,
      description: `Dispatched to ${resolvedWard}: ${clinicalIndication || "Physician directive"}. ${items.length > 0 ? `Items: ${items.join(", ")}` : ""}`,
      severity: activitySeverity,
      metadata: {
        orderId: newReferral.id,
        orderNumber,
        department,
        targetWard: resolvedWard,
        priority,
        items,
        instructions,
      },
    });

    // Notify ALL available on-duty professionals in this ward / role with actionable link
    try {
      await dispatchNotification({
        category: "orders",
        type: "order_placed",
        title: `📋 New Order Awaiting Ward Approval: ${resolvedWard} [${priority.toUpperCase()}]`,
        body: `Attending Physician ordered "${orderTitle}" for patient (${patientName}, MRN: ${patientMrn}). Priority: ${priority.toUpperCase()}. Review and approve for ward.`,
        priority: priority === "stat" || priority === "urgent" ? "critical" : "high",
        targetRole: receivingRole,
        targetDepartment: resolvedWard,
        senderUserId: referringUserId,
        actionUrl: `/referrals`,
        actionText: "Review & Approve Order",
        relatedEntityType: "referrals",
        relatedEntityId: newReferral.id,
        metadata: {
          orderNumber,
          department,
          priority,
          patientMrn,
        },
      });
    } catch (notifErr) {
      console.warn("Could not dispatch push notification for order:", notifErr);
    }

    return NextResponse.json({
      success: true,
      order: {
        id: newReferral.id,
        orderNumber,
        department,
        priority,
        orderTitle,
        receivingRole,
        status: newReferral.status,
        createdAt: newReferral.createdAt,
      },
    });
  } catch (error: any) {
    console.error("Clinical order dispatch error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
