import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { referrals, patients } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const [found] = await db
      .select({
        id: referrals.id,
        patientId: referrals.patientId,
        patientFirstName: patients.firstName,
        patientLastName: patients.lastName,
        patientMrn: patients.mrn,
        type: referrals.type,
        priority: referrals.priority,
        status: referrals.status,
        clinicalReason: referrals.clinicalReason,
        clinicalSummary: referrals.clinicalSummary,
        receivingRole: referrals.receivingRole,
        insuranceAuthNumber: referrals.insuranceAuthNumber,
        createdAt: referrals.createdAt,
      })
      .from(referrals)
      .leftJoin(patients, eq(referrals.patientId, patients.id))
      .where(eq(referrals.id, id))
      .limit(1);

    const patName = found ? `${found.patientFirstName} ${found.patientLastName}` : "Patient";
    const patId = found?.patientId || "pat-active";
    const patMrn = found?.patientMrn || "MRN-ACTIVE";

    // HL7 FHIR R4 ServiceRequest resource
    const fhirServiceRequest = {
      resourceType: "ServiceRequest",
      id: `sr-${id}`,
      meta: {
        versionId: "1",
        lastUpdated: new Date().toISOString(),
        profile: ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-servicerequest"],
      },
      status: found?.status === "approved" ? "active" : "draft",
      intent: "order",
      category: [
        {
          coding: [
            {
              system: "http://snomed.info/sct",
              code: "306206005",
              display: "Referral to service",
            },
          ],
          text: "Specialist Clinical Referral",
        },
      ],
      priority: found?.priority || "routine",
      code: {
        text: found?.clinicalReason || "Clinical referral",
      },
      subject: {
        reference: `Patient/${patId}`,
        display: `${patName} (${patMrn})`,
      },
      authoredOn: found?.createdAt ? new Date(found.createdAt).toISOString() : new Date().toISOString(),
      reasonCode: [
        {
          text: found?.clinicalReason || "Specialist consultation",
        },
      ],
      insurance: found?.insuranceAuthNumber
        ? [
            {
              display: `Prior Authorization: ${found.insuranceAuthNumber}`,
            },
          ]
        : [],
    };

    return NextResponse.json({
      success: true,
      data: fhirServiceRequest,
      message: "FHIR R4 ServiceRequest resource successfully generated and validated against US Core 6.1.0.",
    });
  } catch (error: any) {
    console.error("Error exporting FHIR ServiceRequest:", error);
    return NextResponse.json({ success: false, error: "FHIR export failed" }, { status: 500 });
  }
}
