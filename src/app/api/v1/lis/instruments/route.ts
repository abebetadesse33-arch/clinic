import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { labInstruments, labQcRuns } from "@/db/schema";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET /api/v1/lis/instruments
export async function GET(_req: NextRequest) {
  try {
    const [instruments, qcRuns] = await Promise.all([
      db.select().from(labInstruments).orderBy(desc(labInstruments.createdAt)),
      db.select().from(labQcRuns).orderBy(desc(labQcRuns.runAt)).limit(50),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        instruments,
        recentQcRuns: qcRuns,
      },
    });
  } catch (error: any) {
    console.error("Error fetching LIS instruments:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch LIS data" },
      { status: 500 }
    );
  }
}
