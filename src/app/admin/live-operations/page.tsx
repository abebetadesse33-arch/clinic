"use client";

import { useState, useEffect } from "react";
import {
  Activity,
  Users,
  Bed,
  TestTube,
  Pill,
  Clock,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  TrendingUp,
  ShieldAlert,
  Radio,
  UserCheck,
} from "lucide-react";

export default function LiveOperationsPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<string>("");

  const fetchOperations = async () => {
    try {
      const res = await fetch("/api/v1/admin/live-operations");
      const json = await res.json();
      if (json.operations) {
        setData(json.operations);
        setLastRefreshed(new Date().toLocaleTimeString());
      }
    } catch (e) {
      console.error("Fetch operations error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOperations();
    const interval = setInterval(fetchOperations, 5000); // 5s live telemetry poll
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a14] text-gray-100 p-6 md:p-10 font-sans">
      {/* Top Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800/80 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white tracking-tight">Live Clinical Operations Center</h1>
                <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1.5 animate-pulse">
                  <Radio className="w-3 h-3 text-emerald-400" /> Live Stream (&lt; 1s Latency)
                </span>
              </div>
              <p className="text-sm text-gray-400 mt-0.5">
                Real-time clinic throughput, waiting room queues, bed telemetry, lab turnaround & staffing loads
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">Updated: {lastRefreshed || "Just now"}</span>
            <button
              onClick={fetchOperations}
              className="p-2.5 bg-[#121222] border border-gray-800 rounded-xl hover:border-gray-700 text-gray-300 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {data && (
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Top 4 KPI Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Waiting Room */}
            <div className="bg-[#121222] border border-gray-800/80 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between text-gray-400 text-xs mb-3">
                <span className="font-semibold uppercase tracking-wider">Waiting Room Queue</span>
                <Users className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-black text-white">{data.waitingRoom.totalWaiting}</div>
                <span className="text-xs text-gray-400">patients waiting</span>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-800/60 flex items-center justify-between text-xs">
                <span className="text-gray-500">Avg Wait Time:</span>
                <span className="font-bold text-amber-400">{data.waitingRoom.averageWaitMinutes} mins</span>
              </div>
            </div>

            {/* Bed Occupancy */}
            <div className="bg-[#121222] border border-gray-800/80 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between text-gray-400 text-xs mb-3">
                <span className="font-semibold uppercase tracking-wider">Inpatient Bed Capacity</span>
                <Bed className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-black text-white">{data.inpatientBeds.occupancyRatePercent}%</div>
                <span className="text-xs text-gray-400">({data.inpatientBeds.occupied}/{data.inpatientBeds.totalCapacity} beds)</span>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-800/60 flex items-center justify-between text-xs">
                <span className="text-gray-500">ICU Occupancy:</span>
                <span className="font-bold text-rose-400">{data.inpatientBeds.icuOccupancy}</span>
              </div>
            </div>

            {/* Lab Turnaround */}
            <div className="bg-[#121222] border border-gray-800/80 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between text-gray-400 text-xs mb-3">
                <span className="font-semibold uppercase tracking-wider">Diagnostic Lab Queue</span>
                <TestTube className="w-4 h-4 text-amber-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-black text-white">{data.labTurnaround.activeTestsCount}</div>
                <span className="text-xs text-gray-400">active tests</span>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-800/60 flex items-center justify-between text-xs">
                <span className="text-gray-500">STAT Turnaround:</span>
                <span className="font-bold text-emerald-400">{data.labTurnaround.averageStatTurnaroundMins} mins</span>
              </div>
            </div>

            {/* Pharmacy Dispense */}
            <div className="bg-[#121222] border border-gray-800/80 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between text-gray-400 text-xs mb-3">
                <span className="font-semibold uppercase tracking-wider">Pharmacy Dispense</span>
                <Pill className="w-4 h-4 text-teal-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-black text-white">{data.pharmacyQueue.ordersInQueue}</div>
                <span className="text-xs text-gray-400">orders queued</span>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-800/60 flex items-center justify-between text-xs">
                <span className="text-gray-500">Avg Dispense:</span>
                <span className="font-bold text-teal-400">{data.pharmacyQueue.averageDispenseTimeMins} mins</span>
              </div>
            </div>
          </div>

          {/* Middle Section: Acuity Triage Distribution & Staff Workload */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Waiting Room Acuity Distribution */}
            <div className="lg:col-span-6 bg-[#121222] border border-gray-800/80 rounded-2xl p-6 shadow-xl">
              <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" /> Waiting Room Acuity (ESI Breakdown)
              </h2>
              <div className="space-y-3">
                {[
                  { level: "ESI-1 Immediate (Resuscitation)", count: data.waitingRoom.byAcuity.esi1, color: "bg-rose-500", badge: "text-rose-400" },
                  { level: "ESI-2 Emergent (< 15 mins)", count: data.waitingRoom.byAcuity.esi2, color: "bg-orange-500", badge: "text-orange-400" },
                  { level: "ESI-3 Urgent (< 30 mins)", count: data.waitingRoom.byAcuity.esi3, color: "bg-amber-500", badge: "text-amber-400" },
                  { level: "ESI-4 Less Urgent (< 60 mins)", count: data.waitingRoom.byAcuity.esi4, color: "bg-blue-500", badge: "text-blue-400" },
                  { level: "ESI-5 Non-Urgent (< 120 mins)", count: data.waitingRoom.byAcuity.esi5, color: "bg-emerald-500", badge: "text-emerald-400" },
                ].map((item, i) => (
                  <div key={i} className="p-3 bg-[#18182e] rounded-xl border border-gray-800/80 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-3 h-3 rounded-full ${item.color}`} />
                      <span className="text-xs font-medium text-gray-200">{item.level}</span>
                    </div>
                    <span className={`text-sm font-bold ${item.badge}`}>{item.count} patients</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Staff Allocation & Load Balancing */}
            <div className="lg:col-span-6 bg-[#121222] border border-gray-800/80 rounded-2xl p-6 shadow-xl">
              <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-400" /> Staff Workload & Allocation Heatmap
              </h2>
              <div className="space-y-4">
                {data.staffWorkload.map((staff: any, i: number) => (
                  <div key={i} className="p-3.5 bg-[#18182e] rounded-xl border border-gray-800/80">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-semibold text-gray-200">{staff.role} ({staff.onDuty} On Duty)</span>
                      <span className={`font-bold ${staff.capacityUtilizationPercent > 85 ? "text-amber-400" : "text-emerald-400"}`}>
                        {staff.capacityUtilizationPercent}% Capacity
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          staff.capacityUtilizationPercent > 85 ? "bg-amber-500" : "bg-emerald-500"
                        }`}
                        style={{ width: `${staff.capacityUtilizationPercent}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-gray-500 mt-2">
                      <span>Active Load: {staff.activeEncounters || staff.activeAssignments || staff.activeOrders || staff.activeBatches} active tasks</span>
                      <span>Target: &lt; 85% optimal</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
