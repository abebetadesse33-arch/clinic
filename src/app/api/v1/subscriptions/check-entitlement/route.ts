import { NextRequest, NextResponse } from "next/server";
import { checkPatientEntitlement } from "@/lib/services/entitlement-service";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { requireAuthenticatedUser } from "@/lib/security/auth-session";
import { requirePatientAccess } from "@/lib/security/tenant-resource";

export async function GET(req: NextRequest) {
  const auth = await requireAuthenticatedUser(req);
  if ("response" in auth) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId");
    const serviceType = (searchParams.get("serviceType") || "consultation") as any;
    const nominalPrice = Number(searchParams.get("nominalPrice") || 0);

    if (!patientId && auth.user.role !== "patient") {
      return NextResponse.json({ success: false, error: "patientId is required" }, { status: 400 });
    }
    // Patients can only check their own entitlement; staff are limited to their organization.
    const access = await requirePatientAccess(req, patientId || "");
    if ("response" in access) return access.response;
    if (!access.patient) {
      return NextResponse.json({ success: false, error: "Patient not found" }, { status: 404 });
    }

    const [org] = await db.select().from(organizations).limit(1);
    const tenantId = auth.user.organizationId || org?.id;

    if (!tenantId) {
      return NextResponse.json({ success: false, error: "tenantId not found" }, { status: 400 });
    }

    const result = await checkPatientEntitlement({
      patientId: access.patient.id as string,
      tenantId,
      serviceType,
      nominalPrice,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
