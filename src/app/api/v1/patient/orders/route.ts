import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clinicalOrders, patients } from "@/db/schema";
import { getAuthenticatedSessionUserId } from "@/lib/security/auth-session";
import { eq, and, desc, or, lte } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET /api/v1/patient/orders - Patient portal orders with staged result release policy
export async function GET(req: NextRequest) {
  try {
    const sessionUserId = await getAuthenticatedSessionUserId(req);
    if (!sessionUserId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Resolve patient record associated with the authenticated session user
    const [patient] = await db
      .select({ id: patients.id })
      .from(patients)
      .where(or(eq(patients.userId, sessionUserId), eq(patients.id, sessionUserId)))
      .limit(1);

    if (!patient) {
      return NextResponse.json({ success: true, data: [] });
    }

    const now = new Date();

    // Staged release policy:
    // 1. Non-sensitive orders are visible immediately
    // 2. Sensitive diagnostic orders (e.g. oncology/biopsy) are only released once releaseAt <= now OR isReleasedEarly = true
    const orders = await db
      .select({
        id: clinicalOrders.id,
        orderType: clinicalOrders.orderType,
        testName: clinicalOrders.clinicalIndication,
        status: clinicalOrders.status,
        priority: clinicalOrders.priority,
        orderedAt: clinicalOrders.createdAt,
        updatedAt: clinicalOrders.updatedAt,
        collectedAt: clinicalOrders.collectedAt,
        isSensitive: clinicalOrders.isSensitive,
        releaseAt: clinicalOrders.releaseAt,
        isReleasedEarly: clinicalOrders.isReleasedEarly,
      })
      .from(clinicalOrders)
      .where(
        and(
          eq(clinicalOrders.patientId, patient.id),
          or(
            eq(clinicalOrders.isSensitive, false),
            lte(clinicalOrders.releaseAt, now),
            eq(clinicalOrders.isReleasedEarly, true)
          )
        )
      )
      .orderBy(desc(clinicalOrders.createdAt));

    // Map to user-friendly patient progression timeline
    const timelineData = orders.map((o) => {
      let stage = "Order Received";
      let stepNumber = 1;

      switch (o.status) {
        case "ordered":
        case "pending_collection":
          stage = "Order Placed - Awaiting Sample Collection";
          stepNumber = 1;
          break;
        case "specimen_received":
          stage = "Sample Received at Laboratory";
          stepNumber = 2;
          break;
        case "in_analysis":
        case "preliminary":
          stage = "Processing & Laboratory Analysis";
          stepNumber = 3;
          break;
        case "final_verified":
        case "reviewed_by_provider":
        case "closed":
          stage = "Results Ready & Verified by Clinician";
          stepNumber = 4;
          break;
        case "cancelled":
          stage = "Cancelled";
          stepNumber = 0;
          break;
      }

      return {
        ...o,
        timelineStage: stage,
        stepNumber,
        isComplete: o.status === "final_verified" || o.status === "reviewed_by_provider" || o.status === "closed",
      };
    });

    return NextResponse.json({ success: true, data: timelineData });
  } catch (error: any) {
    console.error("[PatientOrders:GET] Error fetching patient orders:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch patient orders" },
      { status: 500 }
    );
  }
}
