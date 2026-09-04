import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { feedbackRecords, organizations, users } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { analyzeFeedbackNLP } from "@/lib/ai/feedback-nlp";

export const dynamic = "force-dynamic";

// GET /api/v1/feedback — list and filter feedback records
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const tenantId = searchParams.get("tenantId");
    const sentiment = searchParams.get("sentiment");
    const urgencyLevel = searchParams.get("urgencyLevel");
    const resolutionStatus = searchParams.get("resolutionStatus");
    const submitterType = searchParams.get("submitterType");

    let query = db
      .select({
        id: feedbackRecords.id,
        tenantId: feedbackRecords.tenantId,
        submitterType: feedbackRecords.submitterType,
        submitterUserId: feedbackRecords.submitterUserId,
        submitterName: feedbackRecords.submitterName,
        submitterContact: feedbackRecords.submitterContact,
        department: feedbackRecords.department,
        rating: feedbackRecords.rating,
        feedbackText: feedbackRecords.feedbackText,
        category: feedbackRecords.category,
        sentiment: feedbackRecords.sentiment,
        sentimentScore: feedbackRecords.sentimentScore,
        confidenceScore: feedbackRecords.confidenceScore,
        extractedThemes: feedbackRecords.extractedThemes,
        actionRecommendations: feedbackRecords.actionRecommendations,
        urgencyLevel: feedbackRecords.urgencyLevel,
        isSafetyHazard: feedbackRecords.isSafetyHazard,
        resolutionStatus: feedbackRecords.resolutionStatus,
        assignedAdminId: feedbackRecords.assignedAdminId,
        resolutionNotes: feedbackRecords.resolutionNotes,
        resolvedAt: feedbackRecords.resolvedAt,
        createdAt: feedbackRecords.createdAt,
      })
      .from(feedbackRecords)
      .orderBy(desc(feedbackRecords.createdAt));

    const records = await query;

    let filtered = records;
    if (tenantId) filtered = filtered.filter((r) => r.tenantId === tenantId);
    if (sentiment) filtered = filtered.filter((r) => r.sentiment === sentiment);
    if (urgencyLevel) filtered = filtered.filter((r) => r.urgencyLevel === urgencyLevel);
    if (resolutionStatus) filtered = filtered.filter((r) => r.resolutionStatus === resolutionStatus);
    if (submitterType) filtered = filtered.filter((r) => r.submitterType === submitterType);

    // Compute Summary Stats
    const total = filtered.length;
    const positiveCount = filtered.filter((r) => r.sentiment === "positive").length;
    const neutralCount = filtered.filter((r) => r.sentiment === "neutral").length;
    const negativeCount = filtered.filter((r) => r.sentiment === "negative").length;
    const safetyHazards = filtered.filter((r) => r.isSafetyHazard).length;
    const averageRating = total > 0
      ? filtered.reduce((sum, r) => sum + (r.rating || 0), 0) / (filtered.filter((r) => r.rating).length || 1)
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        records: filtered,
        summary: {
          total,
          positiveCount,
          neutralCount,
          negativeCount,
          safetyHazards,
          averageRating: Number(averageRating.toFixed(1)),
          positiveRatio: total > 0 ? Math.round((positiveCount / total) * 100) : 0,
        },
      },
    });
  } catch (error: any) {
    console.error("[FEEDBACK GET]", error);
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}

// POST /api/v1/feedback — submit new feedback with real-time NLP analysis
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      tenantId,
      submitterType = "patient",
      submitterUserId,
      submitterName,
      submitterContact,
      encounterId,
      department,
      rating,
      feedbackText,
      category = "general",
    } = body;

    if (!feedbackText || feedbackText.trim().length === 0) {
      return NextResponse.json({ success: false, error: "feedbackText is required." }, { status: 400 });
    }

    // Resolve tenant ID fallback if not provided
    let resolvedTenantId = tenantId;
    if (!resolvedTenantId) {
      const [firstOrg] = await db.select({ id: organizations.id }).from(organizations).limit(1);
      resolvedTenantId = firstOrg?.id;
    }

    if (!resolvedTenantId) {
      return NextResponse.json({ success: false, error: "No organization tenant found." }, { status: 400 });
    }

    // Run NLP Sentiment & Theme Pipeline
    const nlpResult = await analyzeFeedbackNLP(feedbackText, {
      department,
      category,
      submitterType,
      rating,
    });

    const [newRecord] = await db
      .insert(feedbackRecords)
      .values({
        tenantId: resolvedTenantId,
        submitterType,
        submitterUserId: submitterUserId || null,
        submitterName: submitterName || (submitterType === "anonymous" ? "Anonymous" : "Patient Visitor"),
        submitterContact: submitterContact || null,
        encounterId: encounterId || null,
        department: department || "General Outpatient",
        rating: rating || (nlpResult.sentiment === "positive" ? 5 : nlpResult.sentiment === "negative" ? 2 : 3),
        feedbackText,
        category,
        sentiment: nlpResult.sentiment,
        sentimentScore: nlpResult.sentimentScore.toFixed(2),
        confidenceScore: nlpResult.confidenceScore.toFixed(2),
        extractedThemes: nlpResult.extractedThemes,
        actionRecommendations: nlpResult.actionRecommendations,
        urgencyLevel: nlpResult.urgencyLevel,
        isSafetyHazard: nlpResult.isSafetyHazard,
        resolutionStatus: nlpResult.isSafetyHazard ? "under_investigation" : "open",
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: {
        feedback: newRecord,
        nlp: nlpResult,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error("[FEEDBACK POST]", error);
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}

// PATCH /api/v1/feedback — update resolution status or assign admin
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, resolutionStatus, assignedAdminId, resolutionNotes } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "id is required." }, { status: 400 });
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (resolutionStatus) {
      updateData.resolutionStatus = resolutionStatus;
      if (resolutionStatus === "action_taken" || resolutionStatus === "closed") {
        updateData.resolvedAt = new Date();
      }
    }
    if (assignedAdminId) updateData.assignedAdminId = assignedAdminId;
    if (resolutionNotes !== undefined) updateData.resolutionNotes = resolutionNotes;

    const [updated] = await db
      .update(feedbackRecords)
      .set(updateData)
      .where(eq(feedbackRecords.id, id))
      .returning();

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("[FEEDBACK PATCH]", error);
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}
