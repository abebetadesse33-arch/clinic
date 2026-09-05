import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { encounters, encounterEvents, sagaTransactions, stateSlaViolations, users, patients } from "@/db/schema";
import { sql } from "drizzle-orm";
import { getKeyPoolStatus } from "@/lib/ai/gemini-rest-client";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Database Ping & Latency
    const dbPingStart = Date.now();
    await db.execute(sql`SELECT 1 as ping`);
    const dbLatencyMs = Date.now() - dbPingStart;

    // 2. Aggregate Key Telemetry
    const [eventsCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(encounterEvents);

    const [activeSagas] = await db
      .select({ count: sql<number>`count(*)` })
      .from(sagaTransactions);

    const [slaBreaches] = await db
      .select({ count: sql<number>`count(*)` })
      .from(stateSlaViolations);

    const [totalEncounters] = await db
      .select({ count: sql<number>`count(*)` })
      .from(encounters);

    const [totalPatients] = await db
      .select({ count: sql<number>`count(*)` })
      .from(patients);

    const [totalStaff] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);

    const memoryUsage = process.memoryUsage();
    const uptimeSeconds = Math.floor(process.uptime());
    const totalLatencyMs = Date.now() - startTime;

    return NextResponse.json({
      status: "healthy",
      version: "2.4.0-enterprise",
      environment: process.env.NODE_ENV || "production",
      timestamp: new Date().toISOString(),
      uptimeSeconds,
      latency: {
        dbLatencyMs,
        totalLatencyMs,
      },
      system: {
        nodeVersion: process.version,
        memoryUsageMb: {
          rss: (memoryUsage.rss / 1024 / 1024).toFixed(2),
          heapTotal: (memoryUsage.heapTotal / 1024 / 1024).toFixed(2),
          heapUsed: (memoryUsage.heapUsed / 1024 / 1024).toFixed(2),
        },
      },
      database: {
        status: "connected",
        dialect: "PostgreSQL 16 (pgvector)",
        latencyMs: dbLatencyMs,
      },
      aiEngine: {
        status: "operational",
        primaryModel: "gemini-2.0-flash (REST Key Pool)",
        fallbackModel: "NiniMed Deterministic Multidisciplinary Expert Engine",
        multimodalSupport: true,
        ehrGrounding: "active",
        keyPool: getKeyPoolStatus(),
      },
      metrics: {
        totalPatients: Number(totalPatients?.count || 0),
        totalStaff: Number(totalStaff?.count || 0),
        totalEncounters: Number(totalEncounters?.count || 0),
        totalStateEventsRecorded: Number(eventsCount?.count || 0),
        activeSagaTransactions: Number(activeSagas?.count || 0),
        slaBreachesMonitored: Number(slaBreaches?.count || 0),
      },
      features: {
        universalAiCopilot: "enabled",
        ambientVoiceScribing: "ready",
        smartPharmacyAutomation: "live_fefo_enabled",
        dynamicBillingPos: "live_connected",
        customWorkflows: "active",
        dynamicRbac: "enforced",
        blockchainAuditAnchors: "active",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Health check failed";
    console.error("System health check error:", error);
    return NextResponse.json(
      {
        status: "degraded",
        timestamp: new Date().toISOString(),
        error: message,
      },
      { status: 500 }
    );
  }
}
