/**
 * Cache Management & Performance Monitoring API
 * Monitor and manage cache performance
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/security/auth-session";
import { rbacEngine } from "@/lib/security/advanced-rbac-engine";
import { queryCache, globalCache } from "@/lib/performance/cache-manager";

export const runtime = "nodejs";

/**
 * GET /api/v1/performance/cache/stats
 * Get cache performance statistics
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can view cache stats
    if (!session.roles?.includes("admin")) {
      return NextResponse.json(
        { error: "Only admins can view cache statistics" },
        { status: 403 }
      );
    }

    const globalStats = globalCache.getStats();
    const queryCacheStats = queryCache.getStats();

    return NextResponse.json({
      success: true,
      cache: {
        global: globalStats,
        queryCache: queryCacheStats,
        timestamp: new Date(),
        recommendation: getPerformanceRecommendation(globalStats, queryCacheStats),
      },
    });
  } catch (error) {
    console.error("Cache stats error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve cache statistics" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/performance/cache/clear
 * Clear cache by pattern or completely
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can clear cache
    if (!session.roles?.includes("admin")) {
      return NextResponse.json(
        { error: "Only admins can clear cache" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { pattern, resource } = body;

    if (pattern) {
      queryCache.invalidatePattern(pattern);
      globalCache.invalidatePattern(pattern);
    } else if (resource) {
      queryCache.invalidateResource(resource);
    } else {
      queryCache.clear();
      globalCache.clear();
    }

    return NextResponse.json({
      success: true,
      message: "Cache cleared successfully",
      cleared: { pattern, resource },
    });
  } catch (error) {
    console.error("Cache clear error:", error);
    return NextResponse.json(
      { error: "Failed to clear cache" },
      { status: 500 }
    );
  }
}

/**
 * Generate performance recommendation based on cache stats
 */
function getPerformanceRecommendation(
  globalStats: any,
  queryCacheStats: any
): string {
  const globalUtilization = globalStats.utilization || 0;
  const queryCacheUtilization = queryCacheStats.utilization || 0;

  if (globalUtilization > 90) {
    return "ALERT: Global cache utilization above 90%. Consider increasing cache size or reducing TTL.";
  }

  if (queryCacheUtilization > 85) {
    return "WARNING: Query cache is 85%+ full. Monitor for cache thrashing.";
  }

  if (globalUtilization < 30 && queryCacheUtilization < 30) {
    return "INFO: Cache utilization is low. Consider reducing cache sizes to free memory.";
  }

  return "Cache health is optimal. No immediate action required.";
}

/**
 * POST /api/v1/performance/metrics
 * Log custom performance metrics
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { metric, value, tags } = body;

    if (!metric || value === undefined) {
      return NextResponse.json(
        { error: "Metric name and value are required" },
        { status: 400 }
      );
    }

    // Log metric (in production, send to monitoring service)
    console.log(`[METRIC] ${metric}: ${value}`, tags || {});

    return NextResponse.json({
      success: true,
      message: "Metric recorded",
      metric: { metric, value, tags, timestamp: new Date() },
    });
  } catch (error) {
    console.error("Metrics error:", error);
    return NextResponse.json(
      { error: "Failed to record metric" },
      { status: 500 }
    );
  }
}
