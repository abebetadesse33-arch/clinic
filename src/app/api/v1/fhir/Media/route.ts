import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { patients } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  let patientId = searchParams.get("patient");

  if (!patientId) {
    const [p] = await db.select({ id: patients.id }).from(patients).limit(1);
    patientId = p?.id || "pat-active";
  }

  const mediaBundle = {
    resourceType: "Bundle",
    type: "searchset",
    total: 1,
    entry: [
      {
        resource: {
          resourceType: "Media",
          id: "med-ast-01",
          status: "completed",
          type: {
            coding: [
              {
                system: "http://terminology.hl7.org/CodeSystem/media-type",
                code: "image",
                display: "Image",
              },
            ],
          },
          subject: {
            reference: `Patient/${patientId}`,
          },
          content: {
            contentType: "image/jpeg",
            url: "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&q=80&w=600",
            title: "PA Chest Radiograph Diagnostic Capture",
          },
          note: [
            {
              text: "Diagnostic imaging archived in PACS archive.",
            },
          ],
        },
      },
    ],
  };

  return NextResponse.json(mediaBundle);
}
