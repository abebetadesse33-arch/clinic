/**
 * RBAC Policy Management API Endpoint
 * Manage fine-grained access control policies
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/security/auth-session";
import { rbacEngine, RBACPolicy } from "@/lib/security/advanced-rbac-engine";

export const runtime = "nodejs";

/**
 * GET /api/v1/security/rbac/audit-logs
 * Get RBAC audit log
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can view RBAC audit logs
    if (!session.roles?.includes("admin")) {
      return NextResponse.json(
        { error: "Only admins can access audit logs" },
        { status: 403 }
      );
    }

    const userId = req.nextUrl.searchParams.get("userId");
    const days = Number(req.nextUrl.searchParams.get("days") || "7");
    const limit = Number(req.nextUrl.searchParams.get("limit") || "100");

    const startTime = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const auditLog = rbacEngine.getAuditLog({
      organizationId: session.organizationId,
      userId: userId || undefined,
      startTime,
      limit,
    });

    return NextResponse.json({
      success: true,
      auditLog,
      count: auditLog.length,
      filter: { userId, days, limit },
    });
  } catch (error) {
    console.error("RBAC audit log error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve audit logs" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/security/rbac/policies
 * Create or update RBAC policy
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can manage policies
    if (!session.roles?.includes("admin")) {
      return NextResponse.json(
        { error: "Only admins can manage RBAC policies" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const policy: RBACPolicy = {
      ...body,
      organizationId: session.organizationId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Validate policy
    if (!policy.id || !policy.name || !policy.rules) {
      return NextResponse.json(
        { error: "Policy ID, name, and rules are required" },
        { status: 400 }
      );
    }

    // Set policy
    rbacEngine.setPolicy(policy);

    return NextResponse.json({
      success: true,
      policy,
      message: "Policy created/updated successfully",
    });
  } catch (error) {
    console.error("RBAC policy error:", error);
    return NextResponse.json(
      { error: "Failed to manage RBAC policy" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/v1/security/rbac/role-hierarchy
 * Configure role inheritance hierarchy
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can modify hierarchy
    if (!session.roles?.includes("admin")) {
      return NextResponse.json(
        { error: "Only admins can modify role hierarchy" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { role, parentRoles } = body;

    if (!role || !Array.isArray(parentRoles)) {
      return NextResponse.json(
        { error: "Role and parentRoles array are required" },
        { status: 400 }
      );
    }

    // Set role hierarchy
    rbacEngine.setRoleHierarchy(role, parentRoles);

    return NextResponse.json({
      success: true,
      message: `Role hierarchy updated for ${role}`,
      hierarchy: { role, parentRoles },
    });
  } catch (error) {
    console.error("Role hierarchy error:", error);
    return NextResponse.json(
      { error: "Failed to update role hierarchy" },
      { status: 500 }
    );
  }
}
