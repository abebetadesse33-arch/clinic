import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const analytics = {
    summary: {
      totalReferrals: 142,
      activePending: 18,
      scheduled: 46,
      completedMonthToDate: 68,
      averageTurnaroundDays: 3.4,
      acceptanceRatePercent: 94.2,
      noShowRatePercent: 4.1,
    },
    bySpecialty: [
      { specialty: "Clinical Nutrition & Dietetics", total: 42, completed: 32, avgWaitDays: 2.8, acceptanceRate: 98 },
      { specialty: "Physiotherapy & Rehabilitation", total: 38, completed: 28, avgWaitDays: 3.1, acceptanceRate: 95 },
      { specialty: "Medical Social Work & SDOH", total: 26, completed: 22, avgWaitDays: 1.4, acceptanceRate: 100 },
      { specialty: "Clinical Psychology & Behavioral", total: 18, completed: 11, avgWaitDays: 5.6, acceptanceRate: 88 },
      { specialty: "Outpatient Nephrology (External)", total: 12, completed: 7, avgWaitDays: 6.2, acceptanceRate: 85 },
      { specialty: "Cardiogenomics & Genetics", total: 6, completed: 5, avgWaitDays: 4.0, acceptanceRate: 92 },
    ],
    bySource: [
      { source: "Clinician Manual", count: 82, percent: 57.7 },
      { source: "AI Automated Suggestion", count: 48, percent: 33.8 },
      { source: "Patient Self-Referral", count: 12, percent: 8.5 },
    ],
    bottlenecks: [
      { specialty: "Outpatient Nephrology", reason: "Insurance prior authorization turnaround delays (avg 4.2 days)", severity: "high" },
      { specialty: "Clinical Psychology", reason: "Specialist clinic capacity constraints", severity: "medium" },
    ],
  };

  return NextResponse.json({
    success: true,
    data: analytics,
  });
}
