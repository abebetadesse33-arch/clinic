import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { imagingStudies, imagingTemplates, patients } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET /api/v1/ris/imaging-studies
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId");

    const [studies, templates] = await Promise.all([
      db
        .select({
          id: imagingStudies.id,
          patientId: imagingStudies.patientId,
          accessionNumber: imagingStudies.accessionNumber,
          modality: imagingStudies.modality,
          bodyPart: imagingStudies.bodyPart,
          studyUid: imagingStudies.studyUid,
          priority: imagingStudies.priority,
          status: imagingStudies.status,
          isCriticalFinding: imagingStudies.isCriticalFinding,
          scheduledAt: imagingStudies.scheduledAt,
          performedAt: imagingStudies.performedAt,
          createdAt: imagingStudies.createdAt,
          patientFirstName: patients.firstName,
          patientLastName: patients.lastName,
          patientMrn: patients.mrn,
        })
        .from(imagingStudies)
        .leftJoin(patients, eq(imagingStudies.patientId, patients.id))
        .where(patientId ? eq(imagingStudies.patientId, patientId) : undefined)
        .orderBy(desc(imagingStudies.createdAt)),
      db.select().from(imagingTemplates),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        studies,
        templates,
      },
    });
  } catch (error: any) {
    console.error("Error fetching RIS studies:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch imaging worklist" },
      { status: 500 }
    );
  }
}
