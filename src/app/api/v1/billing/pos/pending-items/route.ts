import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { prescriptions, labOrders, patients, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";

const TENANT_ID = "00000000-0000-0000-0000-000000000001";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId");
    const mrn = searchParams.get("mrn");
    const search = searchParams.get("search");

    // ─── Patient search by MRN / name ──────────────────────────────────────────
    if (search) {
      const allPatients = await db
        .select({
          id: patients.id,
          firstName: patients.firstName,
          lastName: patients.lastName,
          mrn: patients.mrn,
          phone: patients.phone,
          dateOfBirth: patients.dateOfBirth,
          gender: patients.gender,
        })
        .from(patients)
        .where(eq(patients.tenantId, TENANT_ID))
        .limit(20);

      const q = search.toLowerCase();
      const mapped = allPatients.map((p) => ({
        id: p.id,
        fullName: `${p.firstName} ${p.lastName}`.trim(),
        mrn: p.mrn,
        phone: p.phone ?? "",
        dateOfBirth: p.dateOfBirth,
        sex: p.gender === "male" ? "M" : p.gender === "female" ? "F" : "O",
      }));

      const filtered = mapped.filter(
        (p) =>
          p.fullName.toLowerCase().includes(q) ||
          p.mrn.toLowerCase().includes(q) ||
          p.phone.includes(q)
      );
      return NextResponse.json({ success: true, data: filtered });
    }

    // ─── Resolve MRN → patientId if needed ─────────────────────────────────────
    let resolvedPatientId = patientId;
    if (mrn && !resolvedPatientId) {
      const [pt] = await db.select().from(patients).where(eq(patients.mrn, mrn));
      if (!pt) return NextResponse.json({ error: "Patient not found" }, { status: 404 });
      resolvedPatientId = pt.id;
    }

    if (!resolvedPatientId) {
      return NextResponse.json({ error: "patientId or search required" }, { status: 400 });
    }

    // ─── Patient info ───────────────────────────────────────────────────────────
    const [patientRow] = await db
      .select({
        id: patients.id,
        firstName: patients.firstName,
        lastName: patients.lastName,
        mrn: patients.mrn,
        phone: patients.phone,
        dateOfBirth: patients.dateOfBirth,
        gender: patients.gender,
      })
      .from(patients)
      .where(eq(patients.id, resolvedPatientId));

    const patient = patientRow
      ? {
          id: patientRow.id,
          fullName: `${patientRow.firstName} ${patientRow.lastName}`.trim(),
          mrn: patientRow.mrn,
          phone: patientRow.phone ?? "",
          dateOfBirth: patientRow.dateOfBirth,
          sex: patientRow.gender === "male" ? "M" : patientRow.gender === "female" ? "F" : "O",
        }
      : null;

    // ─── Unpaid Prescriptions ───────────────────────────────────────────────────
    const unpaidRx = await db
      .select({
        id: prescriptions.id,
        medicationName: prescriptions.medicationName,
        dosage: prescriptions.dosage,
        route: prescriptions.route,
        quantity: prescriptions.quantity,
        unitPrice: prescriptions.unitPrice,
        totalPrice: prescriptions.totalPrice,
        paymentStatus: prescriptions.paymentStatus,
        createdAt: prescriptions.createdAt,
        doctorName: users.fullName,
      })
      .from(prescriptions)
      .leftJoin(users, eq(prescriptions.doctorId, users.id))
      .where(
        and(
          eq(prescriptions.patientId, resolvedPatientId),
          eq(prescriptions.paymentStatus, "unpaid")
        )
      );

    // ─── Unpaid Lab Orders ──────────────────────────────────────────────────────
    const unpaidLabs = await db
      .select({
        id: labOrders.id,
        testName: labOrders.testName,
        priority: labOrders.priority,
        status: labOrders.status,
        paymentStatus: labOrders.paymentStatus,
        orderedAt: labOrders.orderedAt,
        price: labOrders.price,
        doctorName: users.fullName,
      })
      .from(labOrders)
      .leftJoin(users, eq(labOrders.doctorId, users.id))
      .where(
        and(
          eq(labOrders.patientId, resolvedPatientId),
          eq(labOrders.paymentStatus, "unpaid")
        )
      );

    // ─── Map → POS line items ───────────────────────────────────────────────────
    const rxItems = unpaidRx.map((rx) => ({
      sourceType: "prescription" as const,
      sourceId: rx.id,
      description: `${rx.medicationName} ${rx.dosage ?? ""}`.trim(),
      category: "pharmacy" as const,
      unitPrice: parseFloat((rx.unitPrice ?? "0").toString()),
      quantity: parseInt((rx.quantity ?? 1).toString()),
      discount: 0,
      note: `Prescribed by ${rx.doctorName ?? "Doctor"}`,
    }));

    const labItems = unpaidLabs.map((lab) => ({
      sourceType: "lab_order" as const,
      sourceId: lab.id,
      description: lab.testName,
      category: "lab" as const,
      unitPrice: parseFloat((lab.price ?? "0").toString()),
      quantity: 1,
      discount: 0,
      note: `Priority: ${lab.priority ?? "Routine"} — Ordered by ${lab.doctorName ?? "Clinician"}`,
    }));

    const pendingItems = [...rxItems, ...labItems];

    return NextResponse.json({
      success: true,
      data: {
        patient,
        pendingItems,
        summary: {
          prescriptionCount: rxItems.length,
          labCount: labItems.length,
          totalPending: pendingItems.reduce(
            (sum, i) => sum + i.unitPrice * i.quantity,
            0
          ),
        },
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
