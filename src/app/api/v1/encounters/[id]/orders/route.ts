import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clinicalOrders, encounters, auditLogs, patients } from "@/db/schema";
import { getAuthenticatedSessionUserId } from "@/lib/security/auth-session";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { evaluateOrderCDS } from "@/lib/cds/order-cds-engine";
import { queueOrderOutboxEvent } from "@/lib/workflow/outbox-worker";
import { createTamperEvidentAuditLog } from "@/lib/security/tenant-guard";

const createOrderSchema = z.object({
  patientId: z.string().uuid("Valid patient UUID required"),
  orderType: z.enum(["laboratory", "pharmacy", "imaging", "procedure"]),
  clinicalIndication: z.string().min(3, "Clinical indication or test name is required"),
  priority: z.enum(["routine", "urgent", "stat"]).default("routine"),
  isSensitive: z.boolean().default(false),
  overrideRationale: z.string().optional(),
});

// GET /api/v1/encounters/[id]/orders - Fetch all orders scoped strictly to this encounter
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sessionUserId = await getAuthenticatedSessionUserId(req);
    if (!sessionUserId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const encounterId = params.id;
    const orders = await db
      .select()
      .from(clinicalOrders)
      .where(eq(clinicalOrders.encounterId, encounterId))
      .orderBy(desc(clinicalOrders.createdAt));

    return NextResponse.json({ success: true, data: orders });
  } catch (error: any) {
    console.error("[EncounterOrders:GET] Error fetching encounter orders:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

// POST /api/v1/encounters/[id]/orders - Create order strictly bound to encounter & session doctor
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const encounterId = params.id;

    // 1. STRICT AUTHENTICATION: Identity extracted exclusively from verified server session cookie
    const sessionUserId = await getAuthenticatedSessionUserId(req);
    if (!sessionUserId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Active authenticated session required" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validated = createOrderSchema.parse(body);

    // 2. CLINICAL DECISION SUPPORT (CDS) PRE-SUBMISSION EVALUATION
    const cdsResult = await evaluateOrderCDS({
      patientId: validated.patientId,
      testName: validated.clinicalIndication,
      orderType: validated.orderType,
    });

    if (cdsResult.hasConflict) {
      if (cdsResult.severity === "hard_stop") {
        return NextResponse.json(
          { success: false, error: cdsResult.message, cds: cdsResult },
          { status: 422 }
        );
      }
      if (cdsResult.severity === "soft_stop" && (!validated.overrideRationale || validated.overrideRationale.trim().length < 5)) {
        return NextResponse.json(
          {
            success: false,
            error: `${cdsResult.message} A documented override rationale (minimum 5 characters) is required to proceed.`,
            cds: cdsResult,
            requiresOverride: true,
          },
          { status: 409 }
        );
      }
    }

    // 3. ATOMIC DB TRANSACTION: Encounter Validation + Order + Audit + Outbox
    const result = await db.transaction(async (tx) => {
      // Verify encounter exists, belongs to the patient, and is active
      const [encounter] = await tx
        .select()
        .from(encounters)
        .where(
          and(
            eq(encounters.id, encounterId),
            eq(encounters.patientId, validated.patientId)
          )
        )
        .limit(1);

      if (!encounter) {
        throw new Error("ENCOUNTER_INVALID: Encounter does not exist or does not match patient record.");
      }

      if (encounter.status === "finished" || encounter.status === "cancelled") {
        throw new Error("ENCOUNTER_CLOSED: Cannot place orders on a closed or cancelled encounter.");
      }

      // Calculate staged release timestamp (e.g. hold sensitive pathology 48 hours)
      const releaseAt = validated.isSensitive
        ? new Date(Date.now() + 48 * 60 * 60 * 1000)
        : new Date();

      // Persist the order deterministically linked to encounter and session doctor
      const [newOrder] = await tx
        .insert(clinicalOrders)
        .values({
          tenantId: encounter.tenantId,
          patientId: validated.patientId,
          encounterId: encounter.id,
          orderingDoctorId: sessionUserId, // Server session, never client payload
          orderType: validated.orderType,
          clinicalIndication: validated.clinicalIndication,
          priority: validated.priority,
          status: "ordered",
          isSensitive: validated.isSensitive,
          releaseAt,
        })
        .returning();

      // Tamper-evident audit trail with SHA-256 state checksum
      await createTamperEvidentAuditLog({
        tenantId: encounter.tenantId,
        userId: sessionUserId,
        action: "CLINICAL_ORDER_CREATED",
        entityType: "clinical_orders",
        entityId: newOrder.id,
        payload: {
          orderId: newOrder.id,
          encounterId: encounter.id,
          patientId: validated.patientId,
          testName: validated.clinicalIndication,
          priority: validated.priority,
          overrideRationale: validated.overrideRationale || null,
        },
        summary: `Doctor ${sessionUserId} placed ${validated.orderType} order for patient ${validated.patientId} under encounter ${encounterId}`,
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
        tx,
      });

      // Atomic Transactional Outbox Event
      await queueOrderOutboxEvent(
        {
          tenantId: encounter.tenantId,
          orderId: newOrder.id,
          eventType: "ORDER_CREATED",
          payload: {
            encounterId: encounter.id,
            patientId: validated.patientId,
            testName: validated.clinicalIndication,
            priority: validated.priority,
            orderingDoctorId: sessionUserId,
          },
        },
        tx
      );

      return newOrder;
    });

    return NextResponse.json(
      { success: true, data: result, message: "Clinical order created successfully" },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[EncounterOrders:POST] Order creation failure:", error);
    const isEncounterErr = error.message?.startsWith("ENCOUNTER_");
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create order" },
      { status: isEncounterErr ? 403 : 500 }
    );
  }
}
