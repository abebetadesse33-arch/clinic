"use client";

import React, { useState } from "react";
import {
  GitFork,
  Activity,
  Stethoscope,
  Pill,
  TestTube2,
  Lock,
  Unlock,
  AlertOctagon,
  Clock,
  RotateCcw,
  Play,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  Database,
  Sparkles,
  Zap,
  Check,
  X,
  History,
  TrendingUp,
} from "lucide-react";

interface WorkflowStateCard {
  workflow: string;
  name: string;
  currentState: string;
  subStates: string[];
  requiresPaymentGate?: boolean;
  isGateLocked?: boolean;
  slaMinutes: number;
  icon: any;
  accent: string;
}

interface EventItem {
  id: number;
  name: string;
  actor: string;
  role: string;
  time: string;
  payload: Record<string, any>;
}

export default function CentralStateMachineConsole() {
  const [encounterId, setEncounterId] = useState("enc-state-machine-2026");
  const [parentState, setParentState] = useState("WITH_DOCTOR");

  // Workflow Sub-States
  const [clinicalState, setClinicalState] = useState("DIAGNOSIS_RECORDED");
  const [labState, setLabState] = useState("LAB_PAYMENT_PENDING");
  const [pharmacyState, setPharmacyState] = useState("MEDICATION_PAYMENT_PENDING");
  const [nutritionState, setNutritionState] = useState("NUTRITION_ASSESSMENT_ORDERED");
  const [imagingState, setImagingState] = useState("IMAGING_ORDERED");

  // Hard Payment Gates
  const [isLabPaid, setIsLabPaid] = useState(false);
  const [isPharmacyPaid, setIsPharmacyPaid] = useState(false);

  // Events Log
  const [events, setEvents] = useState<EventItem[]>([
    { id: 1, name: "PATIENT_CHECKED_IN", actor: "Receptionist", role: "front_desk", time: "10:00:12 AM", payload: { queueNo: "Q-104" } },
    { id: 2, name: "DOCTOR_CALLED_PATIENT", actor: "Dr. Dawit", role: "physician", time: "10:06:45 AM", payload: { room: "Exam 3" } },
    { id: 3, name: "CONSULTATION_STARTED", actor: "Dr. Dawit", role: "physician", time: "10:08:10 AM", payload: { type: "in_person" } },
    { id: 4, name: "VITALS_RECORDED", actor: "Nurse Tigist", role: "nurse", time: "10:11:30 AM", payload: { bp: "142/90", hr: 104, spo2: 91 } },
    { id: 5, name: "SYMPTOMS_RECORDED", actor: "Dr. Dawit", role: "physician", time: "10:14:02 AM", payload: { chiefComplaint: "Shortness of breath" } },
    { id: 6, name: "DIAGNOSIS_RECORDED", actor: "Dr. Dawit", role: "physician", time: "10:18:22 AM", payload: { icd10: "J18.9", name: "Pneumonia" } },
    { id: 7, name: "LAB_ORDER_CREATED", actor: "Dr. Dawit", role: "physician", time: "10:20:05 AM", payload: { tests: ["CBC", "BMP", "CXR"], cost: 650 } },
    { id: 8, name: "MEDICATION_ORDER_CREATED", actor: "Dr. Dawit", role: "physician", time: "10:21:40 AM", payload: { meds: ["Ceftriaxone", "Azithromycin"], cost: 420 } },
  ]);

  // Sagas
  const [sagas, setSagas] = useState([
    {
      id: "saga-lab-8801",
      type: "lab_order_payment_saga",
      status: isLabPaid ? "completed" : "in_progress",
      steps: ["CREATE_LAB_ORDERS", isLabPaid ? "CONFIRM_PAYMENT" : "AWAITING_PAYMENT_GATE"],
    },
    {
      id: "saga-pharm-9902",
      type: "pharmacy_payment_dispense_saga",
      status: isPharmacyPaid ? "in_progress" : "in_progress",
      steps: ["CREATE_PRESCRIPTIONS", isPharmacyPaid ? "CONFIRM_PAYMENT" : "AWAITING_PAYMENT_GATE"],
    },
  ]);

  // Replay
  const [replayIndex, setReplayIndex] = useState(events.length);
  const [isReplaying, setIsReplaying] = useState(false);

  // Dispatch helper
  const handleInjectEvent = (eventName: string, actor: string, role: string, payload: Record<string, any> = {}) => {
    const newEvent = {
      id: events.length + 1,
      name: eventName,
      actor,
      role,
      time: new Date().toLocaleTimeString(),
      payload,
    };

    setEvents((prev) => [...prev, newEvent]);
    setReplayIndex(events.length + 1);

    // Apply state transitions
    if (eventName === "LAB_PAYMENT_CONFIRMED") {
      setIsLabPaid(true);
      setLabState("LAB_PAID");
    } else if (eventName === "SAMPLE_COLLECTED") {
      if (!isLabPaid) {
        alert("HARD PAYMENT GATE BLOCKED: Sample collection cannot occur until Lab Payment is confirmed!");
        return;
      }
      setLabState("SAMPLE_COLLECTED");
      setParentState("LAB_IN_PROGRESS");
    } else if (eventName === "LAB_RESULT_ENTERED") {
      setLabState("LAB_RESULTED");
      setParentState("AI_ANALYSIS_PENDING");
    } else if (eventName === "AI_LAB_ANALYSIS_COMPLETED") {
      setLabState("AI_ANALYSIS_COMPLETED");
      setParentState("WITH_DOCTOR");
    } else if (eventName === "MEDICATION_PAYMENT_CONFIRMED") {
      setIsPharmacyPaid(true);
      setPharmacyState("MEDICATION_PAID");
    } else if (eventName === "PHARMACIST_REVIEW_COMPLETED") {
      setPharmacyState("PHARMACIST_REVIEW_COMPLETED");
      setParentState("PHARMACY_IN_PROGRESS");
    } else if (eventName === "MEDICATION_DISPENSED") {
      if (!isPharmacyPaid) {
        alert("HARD PAYMENT GATE BLOCKED: Dispensing cannot occur until Medication Payment is confirmed!");
        return;
      }
      setPharmacyState("DISPENSED");
    } else if (eventName === "ENCOUNTER_COMPLETED") {
      setParentState("COMPLETED");
    }
  };

  const handleCompensateSaga = (sagaId: string) => {
    setSagas((prev) =>
      prev.map((s) =>
        s.id === sagaId
          ? {
              ...s,
              status: "compensated",
              steps: [...s.steps, "COMPENSATE_REFUND_ISSUED", "NOTIFY_CLINICIAN"],
            }
          : s
      )
    );
    alert(`Saga Transaction ${sagaId} compensated: Automated refund processed & state rolled back.`);
  };

  return (
    <div className="min-h-screen bg-[#070712] text-gray-100 p-6 md:p-10 font-sans">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800/80 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <GitFork className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white tracking-tight">Central State Machine Command Center</h1>
                <span className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs px-2.5 py-0.5 rounded-full font-medium">
                  Event-Driven & Concurrent Sagas
                </span>
              </div>
              <p className="text-sm text-gray-400 mt-0.5">
                Parallel workflow engine, append-only event sourcing, hard payment gates, SLA monitors & saga compensation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#111126] border border-gray-800 rounded-2xl flex items-center gap-3">
              <span className="text-xs text-gray-400">Parent Encounter State:</span>
              <span className="bg-indigo-600 text-white font-mono text-xs px-3 py-1 rounded-full font-bold shadow-md shadow-indigo-600/30">
                {parentState}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Parallel Workflows Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Clinical Workflow Card */}
          <div className="p-5 bg-[#0e0e1f] border border-emerald-500/30 rounded-3xl space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Stethoscope className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">Clinical Workflow</h3>
              </div>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold font-mono">
                SLA: 30m
              </span>
            </div>

            <div className="p-3 bg-[#15152c] rounded-2xl border border-gray-800">
              <span className="text-[11px] text-gray-400 block mb-1">Active Sub-State:</span>
              <span className="text-sm font-bold text-emerald-300 font-mono">{clinicalState}</span>
            </div>

            <div className="space-y-1 text-xs">
              {["CONSULTATION_STARTED", "SYMPTOMS_RECORDED", "VITALS_RECORDED", "DIAGNOSIS_RECORDED", "PLAN_APPROVED"].map((st) => (
                <div key={st} className="flex items-center justify-between py-1 border-b border-gray-800/40 text-[11px]">
                  <span className={clinicalState === st ? "text-emerald-400 font-bold" : "text-gray-500"}>{st}</span>
                  {clinicalState === st && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                </div>
              ))}
            </div>
          </div>

          {/* Lab Workflow Card (Hard Payment Gate) */}
          <div className="p-5 bg-[#0e0e1f] border border-blue-500/30 rounded-3xl space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <TestTube2 className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-sm text-white">Laboratory Workflow</h3>
              </div>
              <div className="flex items-center gap-1.5">
                {isLabPaid ? (
                  <span className="flex items-center gap-1 text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold">
                    <Unlock className="w-3 h-3" /> Gate Unlocked
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded font-bold">
                    <Lock className="w-3 h-3" /> Payment Gate Locked
                  </span>
                )}
              </div>
            </div>

            <div className="p-3 bg-[#15152c] rounded-2xl border border-gray-800">
              <span className="text-[11px] text-gray-400 block mb-1">Active Sub-State:</span>
              <span className="text-sm font-bold text-blue-300 font-mono">{labState}</span>
            </div>

            <div className="space-y-1 text-xs">
              {["LAB_ORDERED", "LAB_PAYMENT_PENDING", "LAB_PAID", "SAMPLE_COLLECTED", "LAB_RESULTED", "AI_ANALYSIS_COMPLETED"].map((st) => (
                <div key={st} className="flex items-center justify-between py-1 border-b border-gray-800/40 text-[11px]">
                  <span className={labState === st ? "text-blue-400 font-bold" : "text-gray-500"}>{st}</span>
                  {labState === st && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />}
                </div>
              ))}
            </div>
          </div>

          {/* Pharmacy Workflow Card (Hard Payment Gate) */}
          <div className="p-5 bg-[#0e0e1f] border border-amber-500/30 rounded-3xl space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Pill className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm text-white">Pharmacy Workflow</h3>
              </div>
              <div className="flex items-center gap-1.5">
                {isPharmacyPaid ? (
                  <span className="flex items-center gap-1 text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold">
                    <Unlock className="w-3 h-3" /> Gate Unlocked
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded font-bold">
                    <Lock className="w-3 h-3" /> Payment Gate Locked
                  </span>
                )}
              </div>
            </div>

            <div className="p-3 bg-[#15152c] rounded-2xl border border-gray-800">
              <span className="text-[11px] text-gray-400 block mb-1">Active Sub-State:</span>
              <span className="text-sm font-bold text-amber-300 font-mono">{pharmacyState}</span>
            </div>

            <div className="space-y-1 text-xs">
              {["MEDICATION_ORDERED", "MEDICATION_PAYMENT_PENDING", "MEDICATION_PAID", "PHARMACIST_REVIEW_COMPLETED", "DISPENSED"].map((st) => (
                <div key={st} className="flex items-center justify-between py-1 border-b border-gray-800/40 text-[11px]">
                  <span className={pharmacyState === st ? "text-amber-400 font-bold" : "text-gray-500"}>{st}</span>
                  {pharmacyState === st && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Live Event Injector & Saga Console */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Event Dispatch Simulator */}
          <div className="lg:col-span-1 bg-[#0f0f1f] border border-gray-800/80 rounded-3xl p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-800 pb-3">
              <Zap className="w-4 h-4 text-cyan-400" />
              <h3 className="font-bold text-sm text-white">Event Injector (Simulator)</h3>
            </div>
            <p className="text-xs text-gray-400">Trigger state transitions across parallel workflows:</p>

            <div className="space-y-2">
              <button
                onClick={() => handleInjectEvent("LAB_PAYMENT_CONFIRMED", "Chapa Webhook", "system", { amount: 650 })}
                className="w-full py-2.5 px-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 rounded-xl text-xs font-bold text-left flex items-center justify-between"
              >
                <span>💳 Inject: LAB_PAYMENT_CONFIRMED</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => handleInjectEvent("SAMPLE_COLLECTED", "Lab Tech Eden", "lab_technician", { barcode: "SMPL-9041" })}
                className="w-full py-2.5 px-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 rounded-xl text-xs font-bold text-left flex items-center justify-between"
              >
                <span>🧪 Inject: SAMPLE_COLLECTED</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => handleInjectEvent("LAB_RESULT_ENTERED", "Lab Tech Eden", "lab_technician", { wbc: "14.2 (High)" })}
                className="w-full py-2.5 px-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 rounded-xl text-xs font-bold text-left flex items-center justify-between"
              >
                <span>📊 Inject: LAB_RESULT_ENTERED</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => handleInjectEvent("AI_LAB_ANALYSIS_COMPLETED", "Multimodal AI", "ai_agent", { findings: "Bacterial consolidation" })}
                className="w-full py-2.5 px-3 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 rounded-xl text-xs font-bold text-left flex items-center justify-between"
              >
                <span>✨ Inject: AI_LAB_ANALYSIS_COMPLETED</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => handleInjectEvent("MEDICATION_PAYMENT_CONFIRMED", "Telebirr Webhook", "system", { amount: 420 })}
                className="w-full py-2.5 px-3 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-bold text-left flex items-center justify-between"
              >
                <span>💳 Inject: MEDICATION_PAYMENT_CONFIRMED</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => handleInjectEvent("PHARMACIST_REVIEW_COMPLETED", "PharmD Bethel", "pharmacist", { approved: true })}
                className="w-full py-2.5 px-3 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-bold text-left flex items-center justify-between"
              >
                <span>💊 Inject: PHARMACIST_REVIEW_COMPLETED</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => handleInjectEvent("MEDICATION_DISPENSED", "PharmD Bethel", "pharmacist", { patientConfirmed: true })}
                className="w-full py-2.5 px-3 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-bold text-left flex items-center justify-between"
              >
                <span>📦 Inject: MEDICATION_DISPENSED</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Immutable Append-Only Event Stream */}
          <div className="lg:col-span-2 bg-[#0f0f1f] border border-gray-800/80 rounded-3xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">Append-Only Event Store ({events.length} Events)</h3>
              </div>
              <span className="text-[11px] text-gray-500 font-mono">Immutable Audit Log</span>
            </div>

            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {events.slice(0, replayIndex).map((evt) => (
                <div key={evt.id} className="p-3 bg-[#141428] rounded-xl border border-gray-800/80 flex items-start justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-300 font-bold flex items-center justify-center text-[10px]">
                        {evt.id}
                      </span>
                      <strong className="text-white font-mono">{evt.name}</strong>
                      <span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded">
                        {evt.role}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400">
                      Actor: <span className="text-gray-300">{evt.actor}</span> | Payload:{" "}
                      <span className="font-mono text-cyan-300">{JSON.stringify(evt.payload)}</span>
                    </p>
                  </div>
                  <span className="text-[10px] text-gray-500 font-mono shrink-0">{evt.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Distributed Saga Transactions Monitor */}
        <div className="bg-[#0f0f1f] border border-gray-800/80 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-800 pb-3">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-sm text-white">Distributed Saga Transactions & Compensation</h3>
            </div>
            <span className="text-xs text-gray-400">Multi-Service Consistency & Rollbacks</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sagas.map((saga) => (
              <div key={saga.id} className="p-4 bg-[#141428] rounded-2xl border border-gray-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-indigo-400 font-bold">{saga.id}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      saga.status === "completed"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : saga.status === "compensated"
                        ? "bg-amber-500/20 text-amber-300"
                        : "bg-blue-500/20 text-blue-300"
                    }`}
                  >
                    {saga.status}
                  </span>
                </div>
                <div className="text-xs text-white font-bold">{saga.type}</div>
                <div className="text-[11px] text-gray-400 space-y-1">
                  <div>Steps: {saga.steps.join(" → ")}</div>
                </div>

                {saga.status !== "compensated" && (
                  <button
                    onClick={() => handleCompensateSaga(saga.id)}
                    className="w-full py-2 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" /> Test Compensation Rollback (Refund)
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Time-Travel Event Replay Slider */}
        <div className="bg-[#0f0f1f] border border-gray-800/80 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-800 pb-3">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-cyan-400" />
              <h3 className="font-bold text-sm text-white">Time-Travel Event Replayer (Compliance & Audit)</h3>
            </div>
            <span className="text-xs font-mono text-cyan-400">Step {replayIndex} of {events.length}</span>
          </div>

          <div className="space-y-3">
            <input
              type="range"
              min="1"
              max={events.length}
              value={replayIndex}
              onChange={(e) => setReplayIndex(parseInt(e.target.value))}
              className="w-full accent-cyan-500 bg-gray-800 rounded-lg cursor-pointer h-2"
            />
            <div className="flex justify-between text-[11px] text-gray-500 font-mono">
              <span>Event 1: Check-in</span>
              <span>Reconstructed State: {events[replayIndex - 1]?.name}</span>
              <span>Event {events.length}: Current</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
