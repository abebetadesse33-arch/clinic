import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  customReports,
  patients,
  encounters,
  invoices,
  prescriptions,
  labOrders,
} from "@/db/schema";
import { desc, count, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET /api/v1/reports/custom
export async function GET(_req: NextRequest) {
  try {
    const [savedReports, patCount, encCount, invSum, rxCount, labCount] = await Promise.all([
      db.select().from(customReports).orderBy(desc(customReports.createdAt)),
      db.select({ count: count() }).from(patients),
      db.select({ count: count() }).from(encounters),
      db.select({ total: sql<string>`coalesce(sum(${invoices.totalAmount}), 0)` }).from(invoices),
      db.select({ count: count() }).from(prescriptions),
      db.select({ count: count() }).from(labOrders),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        savedReports,
        analyticsSummary: {
          totalPatients: patCount[0]?.count || 0,
          totalEncounters: encCount[0]?.count || 0,
          totalBilledAmount: parseFloat(invSum[0]?.total || "0"),
          totalPrescriptions: rxCount[0]?.count || 0,
          totalLabOrders: labCount[0]?.count || 0,
          currency: "ETB",
        },
      },
    });
  } catch (error: any) {
    console.error("Error generating custom reports:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate report" },
      { status: 500 }
    );
  }
}
