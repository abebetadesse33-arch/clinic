import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { immunizations, patients } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId");

    if (!patientId) {
      return NextResponse.json({ success: false, error: "patientId parameter is required" }, { status: 400 });
    }

    const records = await db
      .select({
        id: immunizations.id,
        name: immunizations.vaccineName,
        dateGiven: immunizations.dateGiven,
        doseNumber: immunizations.doseNumber,
        lotNumber: immunizations.lotNumber,
        manufacturer: immunizations.manufacturer,
        administeringProvider: immunizations.administeringProvider,
        status: immunizations.status,
        nextDueDate: immunizations.nextDueDate,
        notes: immunizations.notes,
        createdAt: immunizations.createdAt,
      })
      .from(immunizations)
      .where(eq(immunizations.patientId, patientId))
      .orderBy(desc(immunizations.dateGiven));

    const mapped = records.map((r) => ({
      id: r.id,
      name: r.name,
      dateGiven: r.dateGiven ? new Date(r.dateGiven).toISOString() : null,
      doseNumber: r.doseNumber,
      lotNumber: r.lotNumber,
      manufacturer: r.manufacturer,
      administeringProvider: r.administeringProvider || "Clinical Staff",
      status: r.status === "due" ? "Due" : r.status === "overdue" ? "Overdue" : "Up to Date",
      due: r.status === "due" || r.status === "overdue",
      nextDueDate: r.nextDueDate ? new Date(r.nextDueDate).toISOString() : null,
      notes: r.notes,
    }));

    return NextResponse.json({ success: true, data: mapped });
  } catch (error: any) {
    console.error("Error fetching immunizations:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch immunizations" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { patientId, vaccineName, doseNumber, manufacturer, lotNumber, administeringProvider, status, nextDueDate, notes } = body;

    if (!patientId || !vaccineName) {
      return NextResponse.json({ success: false, error: "patientId and vaccineName are required" }, { status: 400 });
    }

    const [patient] = await db.select({ tenantId: patients.tenantId }).from(patients).where(eq(patients.id, patientId)).limit(1);
    const tenantId = patient?.tenantId || "00000000-0000-0000-0000-000000000001";

    const [newRecord] = await db
      .insert(immunizations)
      .values({
        tenantId,
        patientId,
        vaccineName,
        doseNumber: doseNumber || "Dose 1",
        manufacturer: manufacturer || "Standard Health Service",
        lotNumber: lotNumber || "LOT-GEN",
        administeringProvider: administeringProvider || "Care Team",
        status: status || "completed",
        nextDueDate: nextDueDate ? new Date(nextDueDate) : null,
        notes: notes || "Recorded via patient immunization workflow.",
        dateGiven: new Date(),
      })
      .returning();

    return NextResponse.json({ success: true, data: newRecord }, { status: 201 });
  } catch (error: any) {
    console.error("Error recording immunization:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to record immunization" },
      { status: 500 }
    );
  }
}
