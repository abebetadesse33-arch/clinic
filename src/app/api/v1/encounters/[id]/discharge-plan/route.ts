import { NextRequest, NextResponse } from "next/server";
import { updateDischargePlanning } from "@/lib/services/admission-workflow-service";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const {
      patientId,
      tenantId,
      careCoordinatorId,
      dischargeDestination = "home_self_care",
      followUpAppointmentsScheduled = [
        { specialty: "Primary Care / Internal Medicine", timeframe: "14 days", doctorName: "Dr. Dawit Haile" },
        { specialty: "Clinical Nutrition", timeframe: "30 days", doctorName: "Dietitian Beth" },
      ],
      medicalEquipmentOrdered = ["Home Blood Pressure Monitor", "Glucometer with Test Strips"],
      medicationDischargeCounselingCompleted = true,
      coordinatorNotes = "Patient confirmed comprehension of discharge instructions and scheduled follow-up appointments.",
    } = body;

    if (!patientId || !tenantId || !careCoordinatorId) {
      return NextResponse.json({ error: "patientId, tenantId, and careCoordinatorId required" }, { status: 400 });
    }

    const result = await updateDischargePlanning({
      encounterId: params.id,
      patientId,
      tenantId,
      careCoordinatorId,
      dischargeDestination,
      followUpAppointmentsScheduled,
      medicalEquipmentOrdered,
      medicationDischargeCounselingCompleted,
      coordinatorNotes,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Discharge plan error:", error);
    return NextResponse.json({ error: "Failed to update discharge plan" }, { status: 500 });
  }
}
