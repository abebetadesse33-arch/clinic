import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { patientConsents, patients, users } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";

export const dynamic = "force-dynamic";

const DEFAULT_ORGANIZATION_ID = "00000000-0000-0000-0000-000000000001";

const CONSENT_DEFINITIONS = [
  {
    consentType: "treatment",
    title: "General Consent for Medical Treatment",
    description: "Authorization for examinations, diagnostics, and clinical care by NiniMed practitioners.",
    defaultGranted: true,
    version: "2.1",
    required: true,
  },
  {
    consentType: "ai_processing",
    title: "AI-Assisted Clinical Decision Support & Multimodal Reasoning",
    description: "Consent for Google Gemini multimodal AI to synthesize lab, imaging, and genomic data to assist your doctor.",
    defaultGranted: true,
    version: "1.3",
    required: false,
  },
  {
    consentType: "data_sharing",
    title: "Interdisciplinary Care Team Data Sharing",
    description: "Permits sharing of clinical records between physician, nurse, dietitian, physiotherapist, and pharmacist.",
    defaultGranted: true,
    version: "1.0",
    required: true,
  },
  {
    consentType: "research",
    title: "De-identified Research & Quality Improvement",
    description: "Allows fully anonymized clinical metrics to be included in population health research.",
    defaultGranted: false,
    version: "1.0",
    required: false,
  },
  {
    consentType: "specialist_access",
    title: "Behavioral Health & Dietetics Specialist Access",
    description: "Authorization for psychologist and dietitian to review mental health and nutritional questionnaires.",
    defaultGranted: true,
    version: "1.1",
    required: false,
  },
];

async function resolvePatient(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const explicitPatientId = searchParams.get("patientId");
  const sessionId = req.cookies.get("Nini_session")?.value;

  if (explicitPatientId) {
    const [found] = await db
      .select()
      .from(patients)
      .where(eq(patients.id, explicitPatientId))
      .limit(1);
    if (found) return found;
  }

  if (sessionId) {
    const [u] = await db.select().from(users).where(eq(users.id, sessionId)).limit(1);
    if (u) {
      const [found] = await db
        .select()
        .from(patients)
        .where(or(eq(patients.userId, u.id), eq(patients.email, u.email)))
        .limit(1);
      if (found) return found;
    }
  }

  // Fallback to first patient in database
  const [fallback] = await db.select().from(patients).limit(1);
  return fallback || null;
}

export async function GET(req: NextRequest) {
  try {
    const patient = await resolvePatient(req);
    if (!patient) {
      // If no patient in database, return the template definitions
      const templateData = CONSENT_DEFINITIONS.map((def) => ({
        ...def,
        isGranted: def.defaultGranted,
        grantedAt: def.defaultGranted ? new Date().toISOString() : null,
      }));
      return NextResponse.json({ success: true, data: templateData });
    }

    // Query existing consents for patient
    let existingConsents = await db
      .select()
      .from(patientConsents)
      .where(eq(patientConsents.patientId, patient.id));

    // If no consents exist yet for this patient, seed defaults into DB
    if (existingConsents.length === 0) {
      const rowsToInsert = CONSENT_DEFINITIONS.map((def) => ({
        organizationId: DEFAULT_ORGANIZATION_ID,
        patientId: patient.id,
        consentType: def.consentType,
        isGranted: def.defaultGranted,
        version: def.version,
        grantedAt: def.defaultGranted ? new Date() : new Date(),
        revokedAt: def.defaultGranted ? null : new Date(),
      }));

      existingConsents = await db.insert(patientConsents).values(rowsToInsert).returning();
    }

    // Map database records with titles and descriptions
    const mergedData = CONSENT_DEFINITIONS.map((def) => {
      const record = existingConsents.find((c) => c.consentType === def.consentType);
      return {
        id: record?.id,
        consentType: def.consentType,
        title: def.title,
        description: def.description,
        isGranted: record ? record.isGranted : def.defaultGranted,
        version: record?.version || def.version,
        grantedAt: record?.grantedAt?.toISOString() || null,
        required: def.required,
      };
    });

    return NextResponse.json({
      success: true,
      patientId: patient.id,
      data: mergedData,
    });
  } catch (err: any) {
    console.error("[patient/consents GET error]:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to retrieve consents" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { consentType, isGranted, patientId: reqPatientId } = body;

    if (!consentType) {
      return NextResponse.json({ success: false, error: "consentType is required" }, { status: 400 });
    }

    const patient = reqPatientId
      ? (await db.select().from(patients).where(eq(patients.id, reqPatientId)).limit(1))[0]
      : await resolvePatient(request);

    if (!patient) {
      return NextResponse.json({ success: false, error: "Patient record not found" }, { status: 404 });
    }

    const def = CONSENT_DEFINITIONS.find((d) => d.consentType === consentType);
    if (!def) {
      return NextResponse.json({ success: false, error: "Invalid consent type" }, { status: 400 });
    }

    const userAgent = request.headers.get("user-agent") || undefined;
    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;

    // Check if consent record exists
    const [existing] = await db
      .select()
      .from(patientConsents)
      .where(and(eq(patientConsents.patientId, patient.id), eq(patientConsents.consentType, consentType)))
      .limit(1);

    let updatedRecord: any;
    if (existing) {
      const [updated] = await db
        .update(patientConsents)
        .set({
          isGranted: Boolean(isGranted),
          version: def.version,
          userAgent,
          ipAddress,
          grantedAt: isGranted ? new Date() : existing.grantedAt,
          revokedAt: isGranted ? null : new Date(),
        })
        .where(eq(patientConsents.id, existing.id))
        .returning();
      updatedRecord = updated;
    } else {
      const [created] = await db
        .insert(patientConsents)
        .values({
          organizationId: DEFAULT_ORGANIZATION_ID,
          patientId: patient.id,
          consentType,
          isGranted: Boolean(isGranted),
          version: def.version,
          userAgent,
          ipAddress,
          grantedAt: new Date(),
          revokedAt: isGranted ? null : new Date(),
        })
        .returning();
      updatedRecord = created;
    }

    return NextResponse.json({
      success: true,
      data: {
        ...updatedRecord,
        title: def.title,
        description: def.description,
        required: def.required,
      },
      message: `Consent for ${def.title} updated to: ${isGranted ? "Granted" : "Revoked"}.`,
    });
  } catch (err: any) {
    console.error("[patient/consents POST error]:", err);
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 });
  }
}
