import { NextRequest, NextResponse } from "next/server";
import { resolveAuthorizedPatient } from "@/lib/security/auth-session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const access = await resolveAuthorizedPatient(request, new URL(request.url).searchParams.get("patient"));
  if ("response" in access) return access.response;
  if (!access.patient || access.patient.tenantId !== access.user.organizationId) {
    return NextResponse.json({ success: false, error: "A valid patient reference in your organization is required." }, { status: 400 });
  }
  const patientId: string = access.patient.id;

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
