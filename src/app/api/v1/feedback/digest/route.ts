import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { feedbackRecords } from "@/db/schema";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET /api/v1/feedback/digest — aggregate NLP intelligence
export async function GET(req: NextRequest) {
  try {
    const records = await db
      .select()
      .from(feedbackRecords)
      .orderBy(desc(feedbackRecords.createdAt));

    const total = records.length;
    const positive = records.filter((r) => r.sentiment === "positive");
    const neutral = records.filter((r) => r.sentiment === "neutral");
    const negative = records.filter((r) => r.sentiment === "negative");
    const safetyHazards = records.filter((r) => r.isSafetyHazard);
    const criticalUrgency = records.filter((r) => r.urgencyLevel === "critical_safety" || r.urgencyLevel === "elevated");

    // Aggregate extracted themes
    const themeCounts: Record<string, { count: number; negativeCount: number; positiveCount: number }> = {};
    records.forEach((r) => {
      const themes = (r.extractedThemes as string[]) || [];
      themes.forEach((t) => {
        if (!themeCounts[t]) themeCounts[t] = { count: 0, negativeCount: 0, positiveCount: 0 };
        themeCounts[t].count++;
        if (r.sentiment === "negative") themeCounts[t].negativeCount++;
        if (r.sentiment === "positive") themeCounts[t].positiveCount++;
      });
    });

    const sortedThemes = Object.entries(themeCounts)
      .map(([theme, stats]) => ({ theme, ...stats }))
      .sort((a, b) => b.count - a.count);

    // Aggregate department rankings
    const departmentScores: Record<string, { total: number; sumScore: number; negativeCount: number }> = {};
    records.forEach((r) => {
      const dept = r.department || "General";
      if (!departmentScores[dept]) departmentScores[dept] = { total: 0, sumScore: 0, negativeCount: 0 };
      departmentScores[dept].total++;
      departmentScores[dept].sumScore += parseFloat(r.sentimentScore || "0");
      if (r.sentiment === "negative") departmentScores[dept].negativeCount++;
    });

    const departmentRankings = Object.entries(departmentScores)
      .map(([dept, data]) => ({
        department: dept,
        totalFeedback: data.total,
        averageSentimentScore: Number((data.sumScore / data.total).toFixed(2)),
        negativeCount: data.negativeCount,
        satisfactionRate: Math.round(((data.total - data.negativeCount) / data.total) * 100),
      }))
      .sort((a, b) => b.averageSentimentScore - a.averageSentimentScore);

    // Collect all actionable recommendations
    const recommendations: any[] = [];
    records.forEach((r) => {
      const recs = (r.actionRecommendations as any[]) || [];
      recs.forEach((rec) => {
        recommendations.push({
          ...rec,
          feedbackId: r.id,
          date: r.createdAt,
          resolutionStatus: r.resolutionStatus,
        });
      });
    });

    return NextResponse.json({
      success: true,
      data: {
        kpis: {
          totalFeedback: total,
          positiveCount: positive.length,
          neutralCount: neutral.length,
          negativeCount: negative.length,
          netSentimentScore: total > 0 ? Number(((positive.length - negative.length) / total).toFixed(2)) : 0,
          safetyHazardsCount: safetyHazards.length,
          openActionItems: records.filter((r) => r.resolutionStatus === "open").length,
        },
        topThemes: sortedThemes.slice(0, 8),
        departmentRankings,
        recentSafetyAlerts: safetyHazards.slice(0, 5),
        recentRecommendations: recommendations.slice(0, 10),
      },
    });
  } catch (error: any) {
    console.error("[FEEDBACK DIGEST GET]", error);
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}
