import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { patients, organizations, patientRegistrations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { TriageService } from "@/lib/services/triage-service";
import { ProviderMatchingService } from "@/lib/services/provider-matching-service";
import { CaseWorkflowService } from "@/lib/services/case-workflow-service";
import { QueueService } from "@/lib/services/queue-service";

export const dynamic = "force-dynamic";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      gender = "other",
      address,
      emergencyContact,
      emergencyPhone,
      insuranceProvider,
      policyNumber,
      knownAllergies = [],
      chronicConditions = [],
      currentMedications = [],
      chiefComplaint = "General consultation and clinical assessment",
      symptoms = "",
      severityScale = 5,
      duration = "1-3 days",
      vitals,
      preferredProviderId,
      preferredSpecialty,
      assignmentType = "automatic",
      consents = {},
      invitationToken,
    } = body;

    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { success: false, error: "First name, last name, and email are required." },
        { status: 400 }
      );
    }

    // 1. Perform Rapid AI Triage
    const triageResult = await TriageService.assess({
      chiefComplaint,
      symptoms,
      duration,
      severityScale: Number(severityScale),
      patientDemographics: {
        gender,
        dateOfBirth,
      },
      vitals,
      medicalHistory: {
        chronicConditions: Array.isArray(chronicConditions) ? chronicConditions : [chronicConditions].filter(Boolean),
        knownAllergies: Array.isArray(knownAllergies) ? knownAllergies : [knownAllergies].filter(Boolean),
        currentMedications: Array.isArray(currentMedications) ? currentMedications : [currentMedications].filter(Boolean),
      },
    });

    // 2. Find or Create Patient Record
    const [existingPatient] = await db
      .select()
      .from(patients)
      .where(eq(patients.email, email.trim().toLowerCase()))
      .limit(1);

    let patientRecord = existingPatient;
    if (!patientRecord) {
      const mrn = `MRN-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
      const formattedDob = dateOfBirth && typeof dateOfBirth === "string" && dateOfBirth.includes("-")
        ? dateOfBirth
        : "1990-01-01";
      const emergencyStr = emergencyContact
        ? `${emergencyContact}${emergencyPhone ? ` (${emergencyPhone})` : ""}`
        : null;

      const [newPatient] = await db
        .insert(patients)
        .values({
          tenantId: DEFAULT_TENANT_ID,
          mrn,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          dateOfBirth: formattedDob,
          gender: ["male", "female", "other", "undisclosed"].includes(gender) ? gender : "other",
          email: email.trim().toLowerCase(),
          phone: phone ? phone.trim() : null,
          allergies: Array.isArray(knownAllergies) ? knownAllergies : [knownAllergies].filter(Boolean),
          emergencyContact: emergencyStr,
          triagePriority: triageResult.urgencyLevel === "emergency" ? "critical" : triageResult.urgencyLevel === "urgent" ? "urgent" : "routine",
        })
        .returning();
      patientRecord = newPatient;
    }

    // Link invitation token if provided
    if (invitationToken) {
      try {
        await db
          .update(patientRegistrations)
          .set({
            status: "active",
            activatedPatientId: patientRecord.id,
            updatedAt: new Date(),
          })
          .where(eq(patientRegistrations.verificationToken, invitationToken));
      } catch (e) {
        console.warn("[register-with-triage] Failed to activate registration token:", e);
      }
    }

    // 3. Create Case Record with Triage Results
    const createdCase = await CaseWorkflowService.createCase({
      tenantId: DEFAULT_TENANT_ID,
      patientId: patientRecord.id,
      chiefComplaint,
      priority: triageResult.urgencyLevel,
      severity: triageResult.urgencyLevel === "emergency" ? "very_severe" : triageResult.urgencyLevel === "urgent" ? "severe" : "moderate",
      personal: {
        fullName: `${firstName} ${lastName}`,
        email,
        phone,
        dateOfBirth,
        gender,
        address,
      },
      symptoms: {
        chiefComplaint,
        detailedDescription: symptoms,
        duration,
        severityScale,
        vitals,
      },
      aiAnalysis: {
        triage: triageResult,
        urgencyLevel: triageResult.urgencyLevel,
        recommendedSpecialty: triageResult.recommendedSpecialty,
        possibleDiagnoses: triageResult.possibleDiagnoses,
        redFlags: triageResult.redFlags,
        recommendedTests: triageResult.recommendedTests,
        summary: triageResult.summary,
        confidenceScore: triageResult.confidenceScore,
      },
    });

    // 4. Intelligent Provider Matching
    const matchedProviders = await ProviderMatchingService.findMatches({
      specialty: preferredSpecialty || triageResult.recommendedSpecialty,
      urgency: triageResult.urgencyLevel,
      preferredProviderId,
      tenantId: DEFAULT_TENANT_ID,
    });

    const topProvider = matchedProviders[0];

    // 5. Automatic Provider Assignment (if automatic or choice)
    let assignedProvider = topProvider;
    if (topProvider) {
      await CaseWorkflowService.assignProvider({
        caseId: createdCase.caseId,
        providerId: topProvider.id,
        providerName: topProvider.fullName,
        providerType: topProvider.role,
        specialty: topProvider.specialty,
        assignmentType: assignmentType as any,
        notes: `Matched by AI Triage (${triageResult.recommendedSpecialty}) with score ${topProvider.matchScore}%`,
      });
    }

    // 6. Enqueue Patient
    const queueEntry = await QueueService.enqueue({
      tenantId: DEFAULT_TENANT_ID,
      caseId: createdCase.id,
      patientId: patientRecord.id,
      providerId: topProvider ? topProvider.id : undefined,
      queueType: "treat_me_now",
      priority: triageResult.urgencyLevel,
      metadata: {
        chiefComplaint,
        specialty: triageResult.recommendedSpecialty,
        assignedDoctor: topProvider?.fullName,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        patient: {
          id: patientRecord.id,
          mrn: patientRecord.mrn,
          fullName: `${patientRecord.firstName} ${patientRecord.lastName}`,
          email: patientRecord.email,
        },
        case: {
          id: createdCase.id,
          caseId: createdCase.caseId,
          caseNumber: createdCase.caseNumber,
          status: createdCase.status,
          priority: createdCase.priority,
        },
        triage: triageResult,
        matchedProvider: topProvider,
        candidateProviders: matchedProviders,
        queue: {
          id: queueEntry.id,
          position: queueEntry.position,
          estimatedWaitMinutes: queueEntry.estimatedWaitMinutes,
          status: queueEntry.status,
        },
      },
    });
  } catch (error: any) {
    console.error("[register-with-triage API error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to complete registration and triage" },
      { status: 500 }
    );
  }
}
