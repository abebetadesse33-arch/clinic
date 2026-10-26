import { NextRequest, NextResponse } from "next/server";
import { executeClinicalCopilot, CopilotRequest } from "@/lib/ai/universal-copilot";
import { requireRoles, CLINICIAN_ROLES } from "@/lib/security/auth-session";
import { db } from "@/db";
import { patients } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const auth = await requireRoles(req, CLINICIAN_ROLES);
  if ("response" in auth) return auth.response;

  try {
    const body: CopilotRequest = await req.json();

    if (!body.message || typeof body.message !== "string") {
      return NextResponse.json(
        { error: "A valid message string is required." },
        { status: 400 }
      );
    }

    // Persona and patient scope come from the verified session, not the request body.
    if (body.patientId) {
      const [patient] = await db
        .select({ id: patients.id })
        .from(patients)
        .where(and(eq(patients.id, body.patientId), eq(patients.tenantId, auth.user.organizationId)))
        .limit(1);
      if (!patient) {
        return NextResponse.json({ success: false, error: "Patient not found in your organization." }, { status: 404 });
      }
    }

    const startTime = Date.now();
    const result = await executeClinicalCopilot({ ...body, userRole: auth.user.role as CopilotRequest["userRole"] });
    const latencyMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        latencyMs,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("AI Copilot Error:", error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
