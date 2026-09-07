import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { deviceReadings, devices, auditLogs } from "@/db/schema";
import { createDeviceReadingSchema } from "@/lib/validations/schemas";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

// GET /api/v1/devices/readings?patientId=...
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId");
    const deviceId = searchParams.get("deviceId");

    if (patientId) {
      const data = await db
        .select()
        .from(deviceReadings)
        .where(eq(deviceReadings.patientId, patientId))
        .orderBy(desc(deviceReadings.recordedAt))
        .limit(100);
      return NextResponse.json({ success: true, data });
    }

    if (deviceId) {
      const data = await db
        .select()
        .from(deviceReadings)
        .where(eq(deviceReadings.deviceId, deviceId))
        .orderBy(desc(deviceReadings.recordedAt))
        .limit(100);
      return NextResponse.json({ success: true, data });
    }

    const data = await db
      .select()
      .from(deviceReadings)
      .orderBy(desc(deviceReadings.recordedAt))
      .limit(100);

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Error fetching device readings:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch readings" },
      { status: 500 }
    );
  }
}

// POST /api/v1/devices/readings - Ingest IoT Telemetry
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = createDeviceReadingSchema.parse(body);

    let isAnomaly = false;
    let anomalySeverity: "normal" | "warning" | "critical" = "normal";

    if (validated.metricType === "blood_pressure_systolic") {
      if (validated.numericValue >= 180 || validated.numericValue <= 80) {
        isAnomaly = true;
        anomalySeverity = "critical";
      } else if (validated.numericValue >= 140) {
        isAnomaly = true;
        anomalySeverity = "warning";
      }
    } else if (validated.metricType === "glucose_mg_dl") {
      if (validated.numericValue >= 300 || validated.numericValue <= 60) {
        isAnomaly = true;
        anomalySeverity = "critical";
      } else if (validated.numericValue >= 180) {
        isAnomaly = true;
        anomalySeverity = "warning";
      }
    } else if (validated.metricType === "spo2_percent") {
      if (validated.numericValue < 90) {
        isAnomaly = true;
        anomalySeverity = "critical";
      } else if (validated.numericValue < 94) {
        isAnomaly = true;
        anomalySeverity = "warning";
      }
    }

    const [newReading] = await db
      .insert(deviceReadings)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        deviceId: validated.deviceId,
        patientId: validated.patientId,
        metricType: validated.metricType,
        numericValue: validated.numericValue.toString(),
        unit: validated.unit,
        isAnomaly,
        anomalySeverity,
        recordedAt: new Date(),
      })
      .returning();

    // Update device last synced timestamp
    await db
      .update(devices)
      .set({ lastSyncedAt: new Date() })
      .where(eq(devices.id, validated.deviceId));

    if (isAnomaly) {
      await db.insert(auditLogs).values({
        tenantId: DEFAULT_TENANT_ID,
        action: "DEVICE_ANOMALY_DETECTED",
        entityType: "device_readings",
        entityId: newReading.id,
        summary: `RPM alert: ${newReading.metricType} value ${newReading.numericValue} ${newReading.unit} flagged as ${anomalySeverity} for patient ${newReading.patientId}`,
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: newReading,
        message: isAnomaly ? `Reading ingested (${anomalySeverity} threshold alert)` : "Reading ingested successfully",
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: error.errors },
        { status: 422 }
      );
    }
    console.error("Error creating device reading:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to ingest reading" },
      { status: 500 }
    );
  }
}
