import { NextRequest, NextResponse } from "next/server";
import { startAdmissionEncounter, checkDuplicatePatients } from "@/lib/services/admission-workflow-service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      tenantId,
      patientId,
      preRegistrationData,
      encounterType = "in_person",
      admissionStatus = "admitted",
      chiefComplaint,
      assignedNurseId,
      assignedPhysicianId,
      assignedCareCoordinatorId,
      frontDeskStaffId,
      checkDuplicatesOnly,
    } = body;

    if (!tenantId) {
      return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
    }

    // Duplicate check query
    if (checkDuplicatesOnly && preRegistrationData) {
      const duplicates = await checkDuplicatePatients({
        tenantId,
        firstName: preRegistrationData.firstName,
        lastName: preRegistrationData.lastName,
        phone: preRegistrationData.phone,
        dateOfBirth: preRegistrationData.dateOfBirth,
      });
      return NextResponse.json({ success: true, duplicates });
    }

    if (!assignedPhysicianId || !frontDeskStaffId || !chiefComplaint) {
      return NextResponse.json(
        { error: "assignedPhysicianId, frontDeskStaffId, and chiefComplaint are required" },
        { status: 400 }
      );
    }

    const result = await startAdmissionEncounter({
      tenantId,
      patientId,
      preRegistrationData,
      encounterType,
      admissionStatus,
      chiefComplaint,
      assignedNurseId,
      assignedPhysicianId,
      assignedCareCoordinatorId,
      frontDeskStaffId,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Start admission error:", error);
    return NextResponse.json({ error: "Failed to start admission encounter" }, { status: 500 });
  }
}
