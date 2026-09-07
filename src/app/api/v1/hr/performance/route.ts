import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { staffPerformanceReviews, staffProfiles, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const staffId = searchParams.get("staffId");
    const tenantId = searchParams.get("tenantId");

    const reviews = await db
      .select({
        id: staffPerformanceReviews.id,
        staffId: staffPerformanceReviews.staffId,
        reviewType: staffPerformanceReviews.reviewType,
        reviewPeriodStart: staffPerformanceReviews.reviewPeriodStart,
        reviewPeriodEnd: staffPerformanceReviews.reviewPeriodEnd,
        csatScore: staffPerformanceReviews.csatScore,
        avgConsultationMins: staffPerformanceReviews.avgConsultationMins,
        diagnosticTurnaroundAdherencePct: staffPerformanceReviews.diagnosticTurnaroundAdherencePct,
        protocolCompliancePct: staffPerformanceReviews.protocolCompliancePct,
        prescriptionAuditScore: staffPerformanceReviews.prescriptionAuditScore,
        selfReviewScore: staffPerformanceReviews.selfReviewScore,
        peerReviewScore: staffPerformanceReviews.peerReviewScore,
        hodReviewScore: staffPerformanceReviews.hodReviewScore,
        overallScore: staffPerformanceReviews.overallScore,
        bonusRecommendationEtb: staffPerformanceReviews.bonusRecommendationEtb,
        goals: staffPerformanceReviews.goals,
        status: staffPerformanceReviews.status,
        comments: staffPerformanceReviews.comments,
        createdAt: staffPerformanceReviews.createdAt,
        fullName: users.fullName,
        employeeCode: staffProfiles.employeeCode,
        department: staffProfiles.department,
        designation: staffProfiles.designation,
      })
      .from(staffPerformanceReviews)
      .innerJoin(staffProfiles, eq(staffPerformanceReviews.staffId, staffProfiles.id))
      .innerJoin(users, eq(staffProfiles.userId, users.id))
      .where(
        staffId ? eq(staffPerformanceReviews.staffId, staffId) :
        tenantId ? eq(staffPerformanceReviews.tenantId, tenantId) : undefined
      )
      .orderBy(desc(staffPerformanceReviews.createdAt));

    return NextResponse.json({ success: true, data: reviews });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      staffId, tenantId, reviewPeriodStart, reviewPeriodEnd, reviewType,
      csatScore, avgConsultationMins, diagnosticTurnaroundAdherencePct,
      protocolCompliancePct, prescriptionAuditScore, selfReviewScore,
      peerReviewScore, hodReviewScore, goals, comments, reviewedBy,
    } = body;

    if (!staffId || !tenantId || !reviewPeriodStart || !reviewPeriodEnd || !reviewedBy) {
      return NextResponse.json({ success: false, error: "Missing required fields." }, { status: 400 });
    }

    // Compute overall score (weighted average)
    const scores = [
      csatScore ? parseFloat(csatScore) : null,
      selfReviewScore ? parseFloat(selfReviewScore) : null,
      peerReviewScore ? parseFloat(peerReviewScore) : null,
      hodReviewScore ? parseFloat(hodReviewScore) : null,
    ].filter((s) => s !== null) as number[];

    const overallScore = scores.length > 0
      ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)
      : null;

    // Bonus recommendation: score 4.5+ → 10% of base, 3.5-4.5 → 5%, below → 0
    const scoreNum = overallScore ? parseFloat(overallScore) : 0;
    const bonusMultiplier = scoreNum >= 4.5 ? 0.10 : scoreNum >= 3.5 ? 0.05 : 0;
    // We'll use a flat 10,000 ETB average for bonus calc if no base salary provided
    const bonusRecommendationEtb = (10000 * bonusMultiplier).toFixed(2);

    const [review] = await db
      .insert(staffPerformanceReviews)
      .values({
        staffId, tenantId, reviewPeriodStart, reviewPeriodEnd,
        reviewType: reviewType || "quarterly",
        csatScore: csatScore?.toString() || null,
        avgConsultationMins: avgConsultationMins?.toString() || null,
        diagnosticTurnaroundAdherencePct: diagnosticTurnaroundAdherencePct?.toString() || null,
        protocolCompliancePct: protocolCompliancePct?.toString() || null,
        prescriptionAuditScore: prescriptionAuditScore?.toString() || null,
        selfReviewScore: selfReviewScore?.toString() || null,
        peerReviewScore: peerReviewScore?.toString() || null,
        hodReviewScore: hodReviewScore?.toString() || null,
        overallScore: overallScore,
        bonusRecommendationEtb,
        goals: goals || [],
        status: "submitted",
        comments: comments || null,
        reviewedBy,
      })
      .returning();

    return NextResponse.json({ success: true, data: review }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}
