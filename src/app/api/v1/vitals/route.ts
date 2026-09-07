import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { vitals, auditLogs } from "@/db/schema";
import { createVitalSchema } from "@/lib/validations/schemas";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

// GET /api/v1/vitals?patientId=...
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId");
    const encounterId = searchParams.get("encounterId");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    if (patientId) {
      const data = await db
        .select()
        .from(vitals)
        .where(eq(vitals.patientId, patientId))
        .orderBy(desc(vitals.recordedAt))
        .limit(limit);
      return NextResponse.json({ success: true, data });
    }

    if (encounterId) {
      const data = await db
        .select()
        .from(vitals)
        .where(eq(vitals.encounterId, encounterId))
        .orderBy(desc(vitals.recordedAt))
        .limit(limit);
      return NextResponse.json({ success: true, data });
    }

    const data = await db
      .select()
      .from(vitals)
      .orderBy(desc(vitals.recordedAt))
      .limit(limit);

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Error fetching vitals:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch vitals" },
      { status: 500 }
    );
  }
}

// POST /api/v1/vitals
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = createVitalSchema.parse(body);

    const [newVital] = await db
      .insert(vitals)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        patientId: validated.patientId,
        encounterId: validated.encounterId,
        systolicBp: validated.systolicBp,
        diastolicBp: validated.diastolicBp,
        heartRate: validated.heartRate,
        respiratoryRate: validated.respiratoryRate,
        temperatureC: validated.temperatureC.toString(),
        oxygenSaturation: validated.oxygenSaturation.toString(),
        bmi: validated.bmi?.toString(),
        heightCm: validated.heightCm?.toString(),
        weightKg: validated.weightKg?.toString(),
      })
      .returning();

    await db.insert(auditLogs).values({
      tenantId: DEFAULT_TENANT_ID,
      action: "VITALS_RECORDED",
      entityType: "vitals",
      entityId: newVital.id,
      summary: `Recorded vitals: BP ${newVital.systolicBp}/${newVital.diastolicBp}, HR ${newVital.heartRate}, SpO2 ${newVital.oxygenSaturation}%, Temp ${newVital.temperatureC}°C`,
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json(
      { success: true, data: newVital, message: "Vitals saved successfully" },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: error.errors },
        { status: 422 }
      );
    }
    console.error("Error recording vitals:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to record vitals" },
      { status: 500 }
    );
  }
}
