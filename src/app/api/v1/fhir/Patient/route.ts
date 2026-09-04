import { NextResponse } from "next/server";
import { db } from "@/db";
import { patients } from "@/db/schema";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const dbPatients = await db.select().from(patients).orderBy(desc(patients.createdAt)).limit(50);

    const fhirBundle = {
      resourceType: "Bundle",
      type: "searchset",
      total: dbPatients.length,
      entry: dbPatients.map((p) => ({
        fullUrl: `https://Ninimed.org/fhir/Patient/${p.id}`,
        resource: {
          resourceType: "Patient",
          id: p.id,
          identifier: [
            {
              system: "https://Ninimed.org/mrn",
              value: p.mrn,
            },
          ],
          active: true,
          name: [
            {
              use: "official",
              family: p.lastName,
              given: [p.firstName],
            },
          ],
          telecom: [
            ...(p.phone ? [{ system: "phone", value: p.phone, use: "mobile" }] : []),
            ...(p.email ? [{ system: "email", value: p.email }] : []),
          ],
          gender: p.gender || "unknown",
          birthDate: p.dateOfBirth ? new Date(p.dateOfBirth).toISOString().substring(0, 10) : undefined,
        },
      })),
    };

    return NextResponse.json(fhirBundle);
  } catch (error: any) {
    console.error("Error generating FHIR patient bundle:", error);
    return NextResponse.json({
      resourceType: "Bundle",
      type: "searchset",
      total: 0,
      entry: [],
    });
  }
}
