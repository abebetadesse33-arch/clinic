import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { clinicalFiles, patients, users } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { logPatientActivity } from "@/lib/audit/activity-logger";

export const dynamic = "force-dynamic";
const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

// GET /api/v1/documents?patientId=...&category=...&search=...
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId");
    const category = searchParams.get("category");
    const search = searchParams.get("search");

    let query = db
      .select({
        id: clinicalFiles.id,
        patientId: clinicalFiles.patientId,
        uploadedByUserId: clinicalFiles.uploadedByUserId,
        encounterId: clinicalFiles.encounterId,
        category: clinicalFiles.category,
        fileName: clinicalFiles.fileName,
        fileUrl: clinicalFiles.fileUrl,
        fileSize: clinicalFiles.fileSize,
        mimeType: clinicalFiles.mimeType,
        tags: clinicalFiles.tags,
        verificationStatus: clinicalFiles.verificationStatus,
        isConfidential: clinicalFiles.isConfidential,
        archived: clinicalFiles.archived,
        createdAt: clinicalFiles.createdAt,
        updatedAt: clinicalFiles.updatedAt,
        // Enriched patient & uploader data
        patientName: sql<string>`${patients.firstName} || ' ' || ${patients.lastName}`,
        patientMrn: patients.mrn,
        uploaderName: users.fullName,
        uploaderRole: users.role,
      })
      .from(clinicalFiles)
      .leftJoin(patients, eq(clinicalFiles.patientId, patients.id))
      .leftJoin(users, eq(clinicalFiles.uploadedByUserId, users.id))
      .where(eq(clinicalFiles.archived, false))
      .orderBy(desc(clinicalFiles.createdAt));

    const records = await query;

    let filtered = records;
    if (patientId) {
      filtered = filtered.filter((r) => r.patientId === patientId);
    }
    if (category && category !== "all") {
      filtered = filtered.filter((r) => r.category === category);
    }
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.fileName.toLowerCase().includes(s) ||
          r.patientName?.toLowerCase().includes(s) ||
          r.patientMrn?.toLowerCase().includes(s)
      );
    }

    // If empty in database, provide high-value seed clinical files for initial experience
    if (filtered.length === 0 && !patientId) {
      const demoFiles = [
        {
          id: "doc-1",
          patientId: "00000000-0000-0000-0000-000000000001",
          patientName: "Sara Tesfaye",
          patientMrn: "MRN-2026-9041",
          category: "prescription",
          fileName: "ePrescription_Metformin_Lisinopril_RX94021.pdf",
          fileUrl: "/sample-records/rx_metformin.pdf",
          fileSize: 142800,
          mimeType: "application/pdf",
          tags: ["e-Prescription", "Cardiometabolic", "90-Day Refill"],
          verificationStatus: "verified",
          uploaderName: "Dr. Aster Solomon",
          uploaderRole: "physician",
          isConfidential: false,
          archived: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
        },
        {
          id: "doc-2",
          patientId: "00000000-0000-0000-0000-000000000001",
          patientName: "Sara Tesfaye",
          patientMrn: "MRN-2026-9041",
          category: "lab_report",
          fileName: "Comprehensive_Metabolic_Panel_HbA1c_Report.pdf",
          fileUrl: "/sample-records/lab_cmp_hba1c.pdf",
          fileSize: 318200,
          mimeType: "application/pdf",
          tags: ["Biochemistry", "HbA1c", "Lipid Panel", "Verified"],
          verificationStatus: "verified",
          uploaderName: "Central Pathology Lab",
          uploaderRole: "lab_technician",
          isConfidential: false,
          archived: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
        },
        {
          id: "doc-3",
          patientId: "00000000-0000-0000-0000-000000000002",
          patientName: "Dawit Haile",
          patientMrn: "MRN-2026-7832",
          category: "imaging",
          fileName: "Chest_XRay_PA_Lateral_Digital_Scan.png",
          fileUrl: "/sample-records/cxr_scan.png",
          fileSize: 1240000,
          mimeType: "image/png",
          tags: ["Radiology", "Chest X-Ray", "Clear Lungs"],
          verificationStatus: "verified",
          uploaderName: "Dr. Daniel Getachew",
          uploaderRole: "radiologist",
          isConfidential: false,
          archived: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
        },
        {
          id: "doc-4",
          patientId: "00000000-0000-0000-0000-000000000001",
          patientName: "Sara Tesfaye",
          patientMrn: "MRN-2026-9041",
          category: "clinical_note",
          fileName: "Annual_Cardiovascular_Wellness_SOAP_Note.pdf",
          fileUrl: "/sample-records/soap_note.pdf",
          fileSize: 98400,
          mimeType: "application/pdf",
          tags: ["SOAP Note", "Preventative Visit", "Clinical Summary"],
          verificationStatus: "verified",
          uploaderName: "Dr. Aster Solomon",
          uploaderRole: "physician",
          isConfidential: false,
          archived: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
        },
        {
          id: "doc-5",
          patientId: "00000000-0000-0000-0000-000000000003",
          patientName: "Almaz Kebede",
          patientMrn: "MRN-2026-5519",
          category: "invoice",
          fileName: "POS_Encounter_Invoice_Receipt_INV-8492.pdf",
          fileUrl: "/sample-records/receipt_inv8492.pdf",
          fileSize: 64200,
          mimeType: "application/pdf",
          tags: ["POS Receipt", "Settled ETB", "Billing"],
          verificationStatus: "verified",
          uploaderName: "Front Desk Cashier",
          uploaderRole: "system",
          isConfidential: false,
          archived: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
        },
      ];

      return NextResponse.json({
        success: true,
        data: demoFiles,
      });
    }

    return NextResponse.json({
      success: true,
      data: filtered,
    });
  } catch (error: any) {
    console.error("GET documents error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/v1/documents
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      patientId,
      uploadedByUserId,
      encounterId,
      category,
      fileName,
      fileUrl,
      fileSize,
      mimeType,
      tags,
      isConfidential,
    } = body;

    if (!patientId || !fileName || !category) {
      return NextResponse.json(
        { success: false, error: "patientId, fileName, and category are required" },
        { status: 400 }
      );
    }

    const [file] = await db
      .insert(clinicalFiles)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        patientId,
        uploadedByUserId: uploadedByUserId || null,
        encounterId: encounterId || null,
        category,
        fileName,
        fileUrl: fileUrl || `/uploads/${fileName}`,
        fileSize: fileSize || 102400,
        mimeType: mimeType || "application/pdf",
        tags: tags || [category],
        verificationStatus: "verified",
        isConfidential: isConfidential ?? false,
        archived: false,
      })
      .returning();

    // Log in patient activity timeline
    await logPatientActivity({
      patientId,
      actorUserId: uploadedByUserId,
      actorName: "Clinical Staff",
      actorRole: "physician",
      activityType: "document_uploaded",
      title: `New ${category.replace("_", " ").toUpperCase()} Uploaded: ${fileName}`,
      description: `File format ${mimeType || "PDF"} added to patient clinical vault.`,
      metadata: { fileId: file.id, category, fileName },
    });

    return NextResponse.json({
      success: true,
      data: file,
    });
  } catch (error: any) {
    console.error("POST document error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
