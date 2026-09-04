import { NextResponse } from "next/server";

// PUT /api/v1/dashboards/[role]/layout - Tenant Admin only: update widget layout
export async function PUT(
  request: Request,
  { params }: { params: { role: string } }
) {
  try {
    const role = params.role;
    const body = await request.json();
    const { widgets } = body as {
      widgets: Array<{
        widgetId: string;
        displayOrder: number;
        colSpan: number;
        rowSpan: number;
        isEnabled: boolean;
        refreshIntervalSeconds: number;
      }>;
    };

    if (!Array.isArray(widgets)) {
      return NextResponse.json(
        { success: false, error: "widgets array is required" },
        { status: 400 }
      );
    }

    // In production: persist to dashboard_layouts table, checking RBAC for tenant_admin
    const updatedAt = new Date().toISOString();
    const layoutId = `layout-${role}-${Date.now()}`;

    // Audit log entry
    const auditEntry = {
      action: "DASHBOARD_LAYOUT_UPDATE",
      entityType: "dashboard_layout",
      entityId: layoutId,
      userRole: "tenant_admin",
      diff: { role, widgetCount: widgets.length },
      timestamp: updatedAt,
    };

    return NextResponse.json({
      success: true,
      data: {
        layoutId,
        role,
        widgetCount: widgets.length,
        updatedAt,
        auditRef: `LAYOUT-${layoutId}`,
      },
      audit: auditEntry,
    });
  } catch {
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}

// GET /api/v1/dashboards/[role]/layout - Retrieve saved layout for a role
export async function GET(
  _request: Request,
  { params }: { params: { role: string } }
) {
  const role = params.role;

  // In production: query dashboard_layouts table for this org+role
  return NextResponse.json({
    success: true,
    data: {
      role,
      source: "default", // "default" | "customized"
      message: "Using default widget layout. Customize via the Layout Customizer.",
    },
  });
}
