import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { labResults, medications, prescriptions, patients, users } from "@/db/schema";
import { eq, or, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const explicitPatientId = searchParams.get("patientId");
  const sessionId = req.cookies.get("Nini_session")?.value;

  try {
    let pat: any = null;

    // 1. If explicit patientId provided, lookup directly
    if (explicitPatientId) {
      const [found] = await db
        .select()
        .from(patients)
        .where(eq(patients.id, explicitPatientId))
        .limit(1);
      pat = found;
    }

    // 2. Otherwise lookup by authenticated session
    if (!pat && sessionId) {
      const [u] = await db.select().from(users).where(eq(users.id, sessionId)).limit(1);
      if (u) {
        const [found] = await db
          .select()
          .from(patients)
          .where(or(eq(patients.userId, u.id), eq(patients.email, u.email)))
          .limit(1);
        pat = found;
      }
    }

    // 3. Strict resolution - do not fallback to arbitrary limit(1)
    if (pat) {
      const [dbLabs, dbPrescriptions, dbMeds] = await Promise.all([
        db
          .select()
          .from(labResults)
          .where(eq(labResults.patientId, pat.id))
          .orderBy(desc(labResults.performedAt)),
        db
          .select({
            id: prescriptions.id,
            medicationName: prescriptions.medicationName,
            dosage: prescriptions.dosage,
            frequency: prescriptions.frequency,
            instructions: prescriptions.instructions,
            refillsAllowed: prescriptions.refillsAllowed,
            status: prescriptions.status,
            createdAt: prescriptions.createdAt,
            doctorName: users.fullName,
          })
          .from(prescriptions)
          .leftJoin(users, eq(prescriptions.doctorId, users.id))
          .where(eq(prescriptions.patientId, pat.id))
          .orderBy(desc(prescriptions.createdAt)),
        db.select().from(medications).where(eq(medications.patientId, pat.id)),
      ]);

      // Merge active e-prescriptions
      const formattedMeds = dbPrescriptions.length > 0
        ? dbPrescriptions.map((rx) => ({
            id: rx.id,
            medicationName: rx.medicationName,
            dosage: rx.dosage || "Standard Dose",
            instructions: rx.instructions || "Take as directed by your physician.",
            refillsRemaining: rx.refillsAllowed ?? 1,
            prescribedBy: rx.doctorName || "Attending Physician",
            status: (rx.status as string) === "cancelled" || (rx.status as string) === "discontinued" ? "Inactive" : (rx.status as string).includes("pending") ? "Pending" : "Active",
            canRefill: (rx.refillsAllowed ?? 1) > 0,
          }))
        : dbMeds.map((m) => ({
            id: m.id,
            medicationName: m.name,
            dosage: m.dosage || "",
            instructions: m.notes || "Take as directed by your physician.",
            refillsRemaining: 1,
            prescribedBy: "Attending Physician",
            status: "Active",
            canRefill: true,
          }));

      return NextResponse.json({
        success: true,
        data: {
          patientId: pat.id,
          patientName: `${pat.firstName} ${pat.lastName}`.trim(),
          mrn: pat.mrn,
          labResults: dbLabs.map((l) => ({
            id: l.id,
            testName: l.testName,
            category: l.category,
            value: l.value,
            unit: l.unit,
            referenceRangeLow: l.referenceRangeLow,
            referenceRangeHigh: l.referenceRangeHigh,
            referenceRange: `${l.referenceRangeLow || "—"} - ${l.referenceRangeHigh || "—"}`,
            isAbnormal: l.isAbnormal,
            performedAt: l.performedAt ? new Date(l.performedAt).toLocaleDateString() : "Recent",
            plainLanguageExplanation: l.interpretation || "Results verified by clinical laboratory.",
            orderedBy: "Clinical Laboratory",
            items: [
              {
                name: l.testName,
                value: l.value,
                unit: l.unit,
                referenceRange: `${l.referenceRangeLow || "—"} - ${l.referenceRangeHigh || "—"}`,
                status: l.isAbnormal ? "abnormal" : "normal",
              },
            ],
          })),
          medications: formattedMeds,
          documents: [],
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        patientId: null,
        labResults: [],
        medications: [],
        documents: [],
      },
    });
  } catch (error: any) {
    console.error("Error fetching patient records:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch patient records",
        data: {
          patientId: null,
          labResults: [],
          medications: [],
          documents: [],
        },
      },
      { status: 500 }
    );
  }
}
