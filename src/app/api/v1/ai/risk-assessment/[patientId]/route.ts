/**
 * Patient Risk Assessment API Endpoint
 * Exposes AI/ML prediction engine insights via REST API
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/security/auth-session";
import { rbacEngine } from "@/lib/security/advanced-rbac-engine";
import { PatientAIPredictionEngine } from "@/lib/ai/patient-prediction-engine";
import { queryCache } from "@/lib/performance/cache-manager";

export const runtime = "nodejs";

/**
 * GET /api/v1/ai/risk-assessment/:patientId
 * Get comprehensive risk profile for patient
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { patientId: string } }
) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const patientId = params.patientId;

    // Check access
    const accessDecision = await rbacEngine.evaluateAccess({
      userId: session.userId,
      userRoles: session.roles || [],
      organizationId: session.organizationId,
      action: "read",
      resourceType: "patient:ai:risk-assessment",
      resourceId: patientId,
    });

    if (!accessDecision.allowed) {
      return NextResponse.json(
        { error: "Access Denied", reason: accessDecision.reason },
        { status: 403 }
      );
    }

    // Try cache first
    const cacheKey = `risk:${patientId}`;
    const cached = queryCache.getQuery("patient:risk-assessment", { patientId });
    if (cached) {
      return NextResponse.json({
        success: true,
        cached: true,
        riskProfile: cached,
      });
    }

    // Calculate risk profile
    const riskProfile = await PatientAIPredictionEngine.calculateRiskProfile(
      patientId,
      session.organizationId
    );

    // Cache result
    queryCache.cacheQuery(
      "patient:risk-assessment",
      riskProfile,
      { patientId },
      10 * 60 * 1000 // 10 minutes
    );

    return NextResponse.json({
      success: true,
      cached: false,
      riskProfile,
    });
  } catch (error) {
    console.error("Risk assessment error:", error);
    return NextResponse.json(
      { error: "Failed to calculate risk assessment" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/ai/insights/:patientId
 * Get AI-driven clinical insights for patient
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { patientId: string } }
) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const patientId = params.patientId;

    // Check access
    const accessDecision = await rbacEngine.evaluateAccess({
      userId: session.userId,
      userRoles: session.roles || [],
      organizationId: session.organizationId,
      action: "read",
      resourceType: "patient:ai:insights",
      resourceId: patientId,
    });

    if (!accessDecision.allowed) {
      return NextResponse.json(
        { error: "Access Denied" },
        { status: 403 }
      );
    }

    // Generate insights
    const insights = await PatientAIPredictionEngine.generateInsights(
      patientId,
      session.organizationId
    );

    return NextResponse.json({
      success: true,
      insights,
      count: insights.length,
      generatedAt: new Date(),
    });
  } catch (error) {
    console.error("Insights generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate insights" },
      { status: 500 }
    );
  }
}
