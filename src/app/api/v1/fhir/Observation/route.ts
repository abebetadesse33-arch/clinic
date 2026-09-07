import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { labResults, vitals, patients } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let patientId = searchParams.get("patient");

    if (!patientId) {
      const [p] = await db.select({ id: patients.id }).from(patients).limit(1);
      patientId = p?.id || "pat-active";
    }

    const labs = await db
      .select()
      .from(labResults)
      .where(eq(labResults.patientId, patientId))
      .orderBy(desc(labResults.performedAt))
      .limit(10);

    const vitalsRows = await db
      .select()
      .from(vitals)
      .where(eq(vitals.patientId, patientId))
      .orderBy(desc(vitals.recordedAt))
      .limit(5);

    const entries: any[] = [];

    labs.forEach((lab) => {
      entries.push({
        resource: {
          resourceType: "Observation",
          id: `obs-lab-${lab.id}`,
          status: "final",
          category: [
            {
              coding: [
                {
                  system: "http://terminology.hl7.org/CodeSystem/observation-category",
                  code: "laboratory",
                  display: "Laboratory",
                },
              ],
            },
          ],
          code: {
            text: lab.testName,
          },
          subject: {
            reference: `Patient/${patientId}`,
          },
          valueQuantity: {
            value: Number(lab.value) || 0,
            unit: lab.unit,
          },
          interpretation: lab.isAbnormal
            ? [
                {
                  coding: [
                    {
                      system: "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
                      code: "A",
                      display: "Abnormal",
                    },
                  ],
                },
              ]
            : undefined,
        },
      });
    });

    vitalsRows.forEach((v) => {
      if (v.systolicBp && v.diastolicBp) {
        entries.push({
          resource: {
            resourceType: "Observation",
            id: `obs-bp-${v.id}`,
            status: "final",
            category: [
              {
                coding: [
                  {
                    system: "http://terminology.hl7.org/CodeSystem/observation-category",
                    code: "vital-signs",
                    display: "Vital Signs",
                  },
                ],
              },
            ],
            code: {
              text: "Blood Pressure",
            },
            subject: {
              reference: `Patient/${patientId}`,
            },
            component: [
              {
                code: { text: "Systolic" },
                valueQuantity: { value: v.systolicBp, unit: "mmHg" },
              },
              {
                code: { text: "Diastolic" },
                valueQuantity: { value: v.diastolicBp, unit: "mmHg" },
              },
            ],
          },
        });
      }
    });

    return NextResponse.json({
      resourceType: "Bundle",
      type: "searchset",
      total: entries.length,
      entry: entries,
    });
  } catch (error: any) {
    console.error("FHIR Observation error:", error);
    return NextResponse.json({
      resourceType: "Bundle",
      type: "searchset",
      total: 0,
      entry: [],
    });
  }
}
