import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const operationsData = {
    timestamp: new Date().toISOString(),
    waitingRoom: {
      totalWaiting: 18,
      averageWaitMinutes: 14,
      longestWaitMinutes: 32,
      byAcuity: {
        esi1: 0,
        esi2: 2,
        esi3: 7,
        esi4: 6,
        esi5: 3,
      },
    },
    inpatientBeds: {
      totalCapacity: 80,
      occupied: 68,
      occupancyRatePercent: 85,
      icuOccupancy: "8/10 (80%)",
      stepdownOccupancy: "18/20 (90%)",
      generalWardOccupancy: "42/50 (84%)",
    },
    labTurnaround: {
      activeTestsCount: 34,
      averageStatTurnaroundMins: 22,
      averageRoutineTurnaroundMins: 65,
      criticalAlertsPendingReview: 1,
    },
    pharmacyQueue: {
      ordersInQueue: 12,
      averageDispenseTimeMins: 8,
      stockoutAlerts: 2,
    },
    staffWorkload: [
      { role: "Physicians", onDuty: 6, activeEncounters: 14, capacityUtilizationPercent: 88 },
      { role: "Nurses", onDuty: 14, activeAssignments: 38, capacityUtilizationPercent: 90 },
      { role: "Pharmacists", onDuty: 3, activeOrders: 12, capacityUtilizationPercent: 75 },
      { role: "Lab Technicians", onDuty: 4, activeBatches: 8, capacityUtilizationPercent: 82 },
    ],
  };

  return NextResponse.json({ success: true, operations: operationsData });
}
