import { NextRequest, NextResponse } from "next/server";
import { checkPatientEntitlement } from "@/lib/services/entitlement-service";
import { db } from "@/db";
import { organizations } from "@/db/schema";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId");
    const serviceType = (searchParams.get("serviceType") || "consultation") as any;
    const nominalPrice = Number(searchParams.get("nominalPrice") || 0);

    if (!patientId) {
      return NextResponse.json({ success: false, error: "patientId is required" }, { status: 400 });
    }

    const [org] = await db.select().from(organizations).limit(1);
    const tenantId = searchParams.get("tenantId") || org?.id;

    if (!tenantId) {
      return NextResponse.json({ success: false, error: "tenantId not found" }, { status: 400 });
    }

    const result = await checkPatientEntitlement({
      patientId,
      tenantId,
      serviceType,
      nominalPrice,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
