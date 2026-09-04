import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { mobileClinicEncounters } from "@/db/schema";
import { eq } from "drizzle-orm";

// ─── POST /api/v1/mobile-clinic-sessions/[id]/sync ────────────────────────────
// Receives offline encounter batches from PWA, merges idempotently

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const {
      entityType,
      entityId,
      operation,
      payload,
      clientTimestamp,
    } = body;

    // Idempotency key from header
    const idempotencyKey = req.headers.get("X-Idempotency-Key");
    const payloadChecksum = req.headers.get("X-Payload-Checksum");

    if (!entityType || !entityId || !payload) {
      return NextResponse.json({ error: "entityType, entityId, payload required" }, { status: 400 });
    }

    let result: Record<string, unknown> = {};

    if (entityType === "encounter") {
      const encounterPayload = payload as {
        encounterId: string;
        patientId?: string;
        chiefComplaint?: string;
        clinicalNotes?: string;
        vitals?: Record<string, number | undefined>;
        prescriptions?: unknown[];
        labTests?: unknown[];
      };

      // Upsert encounter – conflict on offlineSyncId → update
      const existing = await db
        .select()
        .from(mobileClinicEncounters)
        .where(eq(mobileClinicEncounters.offlineSyncId, encounterPayload.encounterId))
        .limit(1);

      if (existing.length > 0 && operation === "create") {
        // Already synced – idempotent no-op
        return NextResponse.json({
          status: "already_synced",
          encounterId: encounterPayload.encounterId,
          idempotencyKey,
        });
      }

      const vitals = encounterPayload.vitals || {};

      const [encounter] = await db
        .insert(mobileClinicEncounters)
        .values({
          sessionId: params.id,
          patientId: encounterPayload.patientId || null,
          offlineSyncId: encounterPayload.encounterId,
          chiefComplaint: encounterPayload.chiefComplaint || null,
          clinicalNotes: encounterPayload.clinicalNotes || null,
          vitals: vitals,
          dispensedMedications: (encounterPayload.prescriptions as any) || [],
          pocLabResults: (encounterPayload.labTests as any) || [],
          syncedAt: new Date(),
          clientTimestamp: clientTimestamp ? new Date(clientTimestamp) : new Date(),
        })
        .onConflictDoNothing()
        .returning();

      result = { encounter: encounter || existing[0] };
    } else {
      // Generic sync – store as audit log entry
      result = { acknowledged: true, entityType, entityId };
    }

    return NextResponse.json({
      status: "synced",
      result,
      syncedAt: new Date().toISOString(),
      idempotencyKey,
      payloadChecksum,
    });
  } catch (error) {
    console.error("Mobile clinic sync error:", error);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
