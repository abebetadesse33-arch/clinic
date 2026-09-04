"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Send,
  Zap,
  FlaskConical,
  Pill,
  Activity,
  Stethoscope,
  FileImage,
  Utensils,
  Brain,
  Users,
  Building,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  Plus,
  Save,
  Search,
  RefreshCw,
  Trash2,
  Database
} from "lucide-react";
import { soundAlerts } from "@/lib/audio/sound-alerts";
import { useClinic } from "@/context/ClinicContext";

// ─── TYPES & MAPPINGS ─────────────────────────────────────────────────────────

export type HospitalDepartment =
  | "laboratory"
  | "pharmacy"
  | "physiotherapy"
  | "specialist"
  | "imaging"
  | "nutrition"
  | "psychology"
  | "social_work"
  | "admission";

export interface DepartmentConfig {
  id: HospitalDepartment;
  label: string;
  badge: string;
  iconName: string;
  iconColor: string;
  bgGradient: string;
  description: string;
}

export interface ClinicalProtocol {
  id: string;
  departmentId: HospitalDepartment;
  name: string;
  items: string[];
  defaultIndication: string;
  createdBy?: string;
  createdAt?: string;
  isCustom?: boolean;
}

export { HOSPITAL_DEPARTMENTS } from "./ClinicalOrderDropdown";


// Map database string keys to Lucide React components
const ICON_MAP: Record<string, React.ElementType> = {
  FlaskConical,
  Pill,
  Activity,
  Stethoscope,
  FileImage,
  Utensils,
  Brain,
  Users,
  Building,
};

// Fallback departments in case API fails
const FALLBACK_DEPARTMENTS: DepartmentConfig[] = [
  {
    id: "laboratory",
    label: "Laboratory & Diagnostics",
    badge: "Pathology / LIS",
    iconName: "FlaskConical",
    iconColor: "text-blue-400",
    bgGradient: "from-blue-500/10 to-indigo-500/10 border-blue-500/30",
    description: "Requisition diagnostic blood panels, urine, microbiology cultures & molecular assays",
  },
  {
    id: "imaging",
    label: "Radiology & Diagnostic Imaging",
    badge: "Imaging Suite",
    iconName: "FileImage",
    iconColor: "text-cyan-400",
    bgGradient: "from-cyan-500/10 to-blue-500/10 border-cyan-500/30",
    description: "Requisition X-Rays, CT scans, diagnostic ultrasounds and magnetic resonance imaging",
  },
  {
    id: "pharmacy",
    label: "Pharmacy & Medication Dispense",
    badge: "In-Clinic / Dispensing",
    iconName: "Pill",
    iconColor: "text-emerald-400",
    bgGradient: "from-emerald-500/10 to-teal-500/10 border-emerald-500/30",
    description: "Issue electronic prescription, STAT IV/infusion, or continuous medication order",
  },
];

interface ClinicalOrderModalProps {
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    mrn: string;
    age?: number;
    gender?: string;
  };
  initialDepartment?: HospitalDepartment;
  onClose: () => void;
  onOrderDispatched?: (order: any) => void;
}

export default function ClinicalOrderModal({
  patient,
  initialDepartment = "laboratory",
  onClose,
  onOrderDispatched,
}: ClinicalOrderModalProps) {
  const { currentUser } = useClinic();

  // ─── STATE ──────────────────────────────────────────────────────────────────
  const [departments, setDepartments] = useState<DepartmentConfig[]>(FALLBACK_DEPARTMENTS);
  const [protocols, setProtocols] = useState<ClinicalProtocol[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Form State
  const [selectedDept, setSelectedDept] = useState<HospitalDepartment>(initialDepartment);
  const [priority, setPriority] = useState<"routine" | "urgent" | "stat">("routine");
  const [orderTitle, setOrderTitle] = useState("");
  const [items, setItems] = useState<string[]>([]);
  const [customItemInput, setCustomItemInput] = useState("");
  const [clinicalIndication, setClinicalIndication] = useState("");
  const [instructions, setInstructions] = useState("");

  // Routing State
  const [isDoctorExplicitlyRequested, setIsDoctorExplicitlyRequested] = useState(false);
  const [requestedDoctorName, setRequestedDoctorName] = useState("");
  const [patientWillingToWait, setPatientWillingToWait] = useState(false);
  const [hasExistingAppointment, setHasExistingAppointment] = useState(false);

  // Submission & UI State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successOrder, setSuccessOrder] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Protocol Creation State
  const [isCreatingProtocol, setIsCreatingProtocol] = useState(false);
  const [newProtocolName, setNewProtocolName] = useState("");
  const [isSavingProtocol, setIsSavingProtocol] = useState(false);

  // ─── DATA FETCHING ──────────────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    const fetchClinicalData = async () => {
      setIsLoadingData(true);
      try {
        // Fetch departments and dynamic protocols from the enterprise database
        const [deptRes, protoRes] = await Promise.all([
          fetch("/api/v1/clinical/departments"),
          fetch("/api/v1/clinical/protocols")
        ]);

        if (!isMounted) return;

        if (deptRes.ok) {
          const deptData = await deptRes.json();
          if (deptData.data && deptData.data.length > 0) {
            setDepartments(deptData.data);
          }
        }

        if (protoRes.ok) {
          const protoData = await protoRes.json();
          if (protoData.data) {
            setProtocols(protoData.data);
          }
        }
      } catch (err) {
        console.warn("Failed to load realtime clinical configurations, using fallbacks.", err);
      } finally {
        if (isMounted) setIsLoadingData(false);
      }
    };

    fetchClinicalData();
    return () => { isMounted = false; };
  }, []);

  const activeConfig = useMemo(() =>
    departments.find((d) => d.id === selectedDept) || departments[0],
    [departments, selectedDept]);

  const activeProtocols = useMemo(() => {
    return protocols
      .filter((p) => p.departmentId === selectedDept)
      .filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.items.some(i => i.toLowerCase().includes(searchQuery.toLowerCase())));
  }, [protocols, selectedDept, searchQuery]);

  // ─── HANDLERS ───────────────────────────────────────────────────────────────

  // Appends items from a protocol to the current order (allowing complex, multi-protocol orders)
  const handleAddProtocolItems = (protocol: ClinicalProtocol) => {
    if (!orderTitle) {
      setOrderTitle(protocol.name);
    } else if (!orderTitle.includes(protocol.name)) {
      setOrderTitle((prev) => `${prev} + ${protocol.name}`);
    }

    if (!clinicalIndication) {
      setClinicalIndication(protocol.defaultIndication);
    }

    // Deduplicate items
    setItems((prev) => Array.from(new Set([...prev, ...protocol.items])));
  };

  const handleAddCustomItem = () => {
    if (!customItemInput.trim()) return;
    setItems((prev) => Array.from(new Set([...prev, customItemInput.trim()])));
    setCustomItemInput("");
  };

  const handleRemoveItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  // Enterprise Feature: Save current order configuration as a new re-usable protocol
  const handleSaveProtocolTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProtocolName.trim() || items.length === 0) {
      setErrorMsg("Protocol name and at least one item are required.");
      return;
    }

    setIsSavingProtocol(true);
    try {
      const payload = {
        departmentId: selectedDept,
        name: newProtocolName.trim(),
        items,
        defaultIndication: clinicalIndication.trim() || "Standard clinical indication",
        createdBy: currentUser?.id,
      };

      const res = await fetch("/api/v1/clinical/protocols", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setProtocols((prev) => [data.data, ...prev]);
        setIsCreatingProtocol(false);
        setNewProtocolName("");

        // Ensure playBookingAlertBeep exists before calling it
        if (soundAlerts && typeof soundAlerts.playBookingAlertBeep === 'function') {
          soundAlerts.playBookingAlertBeep();
        }
      } else {
        throw new Error(data.error || "Failed to save protocol.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Could not save protocol template.");
    } finally {
      setIsSavingProtocol(false);
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderTitle.trim()) {
      setErrorMsg("Please provide an order title or select an order set.");
      return;
    }
    if (items.length === 0) {
      setErrorMsg("Please add at least one specific test or procedure to the order.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/v1/clinical/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: patient.id,
          department: selectedDept,
          targetWard: `${activeConfig.label.split(" ")[0]} Ward`,
          orderTitle: orderTitle.trim(),
          priority,
          clinicalIndication: clinicalIndication.trim(),
          instructions: instructions.trim(),
          items,
          isDoctorExplicitlyRequested,
          requestedDoctorName: isDoctorExplicitlyRequested ? requestedDoctorName : undefined,
          patientWillingToWait: isDoctorExplicitlyRequested ? patientWillingToWait : false,
          hasExistingAppointment: isDoctorExplicitlyRequested ? hasExistingAppointment : false,
        }),
      });

      const data = await res.json();

      if (data.success && data.order) {
        // Ensure sound methods exist before calling them
        if (priority === "stat") {
          if (soundAlerts && typeof soundAlerts.playUrgentAlertBeep === 'function') {
            soundAlerts.playUrgentAlertBeep();
          }
        } else {
          if (soundAlerts && typeof soundAlerts.playBookingAlertBeep === 'function') {
            soundAlerts.playBookingAlertBeep();
          }
        }

        setSuccessOrder(data.order);
        if (onOrderDispatched) {
          onOrderDispatched(data.order);
        }
      } else {
        throw new Error(data.error || "Order dispatch failed.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Could not dispatch order to department.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const DepartmentIcon = ICON_MAP[activeConfig.iconName] || Activity;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-5 animate-fade-in">
      <div className="bg-[#0f111a] border border-slate-800 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden ring-1 ring-white/10">

        {/* ─── HEADER ────────────────────────────────────────────────────────── */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-[#141824] to-[#0f111a]">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${activeConfig.bgGradient} flex items-center justify-center shadow-inner`}>
              <DepartmentIcon className={`w-6 h-6 ${activeConfig.iconColor}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-lg text-white">Comprehensive Clinical Order</h2>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40">
                  Realtime CPOE
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-0.5">
                Patient: <strong className="text-white">{patient.firstName} {patient.lastName}</strong> • MRN: <span className="font-mono text-teal-300">{patient.mrn}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-all bg-slate-900 border border-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ─── SUCCESS SPLASH ────────────────────────────────────────────────── */}
        {successOrder ? (
          <div className="p-8 text-center space-y-6 my-auto animate-fade-in">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-2xl shadow-emerald-900/20">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-extrabold text-white tracking-tight">Order Dispatched Successfully</h3>
              <p className="text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
                Order <strong className="text-teal-300 font-mono text-base">{successOrder.orderNumber}</strong> has been transmitted to the <strong className="text-white">{activeConfig.label}</strong> team with priority <span className="uppercase font-bold text-amber-400">{successOrder.priority}</span>.
              </p>
            </div>

            <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl max-w-md mx-auto text-left text-sm space-y-3 shadow-inner">
              <div className="flex justify-between border-b border-slate-800 pb-2 text-slate-400">
                <span>Routing Target:</span>
                <span className="font-bold text-white flex items-center gap-1.5"><Database className="w-3.5 h-3.5" /> {activeConfig.badge}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2 text-slate-400">
                <span>Primary Directive:</span>
                <span className="font-bold text-white truncate max-w-[200px]" title={successOrder.orderTitle}>{successOrder.orderTitle}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Items Requested:</span>
                <span className="font-bold text-teal-300">{successOrder.items?.length || items.length} Procedures</span>
              </div>
            </div>

            <div className="flex justify-center gap-4 pt-4">
              <button
                onClick={() => {
                  setSuccessOrder(null);
                  setOrderTitle("");
                  setItems([]);
                  setClinicalIndication("");
                }}
                className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold transition-all border border-slate-700 hover:border-slate-600"
              >
                Place Another Order
              </button>
              <button
                onClick={onClose}
                className="px-8 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-sm font-extrabold shadow-lg shadow-teal-900/40 transition-all active:scale-95"
              >
                Return to Chart
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmitOrder} className="flex-1 flex flex-col overflow-hidden">

            {/* ─── DEPARTMENT STRIP ──────────────────────────────────────────── */}
            <div className="px-6 py-3 border-b border-slate-800 bg-[#0a0c13] flex items-center gap-2 overflow-x-auto custom-scrollbar shrink-0 shadow-inner">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mr-2 shrink-0 flex items-center gap-1">
                <Building className="w-3.5 h-3.5" /> Route To:
              </span>
              {departments.map((dept) => {
                const Icon = ICON_MAP[dept.iconName] || Activity;
                const isSelected = selectedDept === dept.id;
                return (
                  <button
                    key={dept.id}
                    type="button"
                    onClick={() => setSelectedDept(dept.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 border ${isSelected
                        ? "bg-teal-500 text-slate-950 border-teal-400 shadow-md shadow-teal-900/50"
                        : "bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-600 hover:text-white hover:bg-slate-800"
                      }`}
                  >
                    <Icon className={`w-4 h-4 ${isSelected ? "text-slate-950" : dept.iconColor}`} />
                    <span>{dept.label.split(" ")[0]}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[#0f111a]">

              {/* ─── PROTOCOL BROWSER & ACUITY ─────────────────────────────────── */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Left Column: Protocols */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <Database className="w-4 h-4 text-teal-500" /> Enterprise Protocols
                    </h3>
                    <div className="relative w-48">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search templates..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-[11px] text-white focus:border-teal-500 focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto custom-scrollbar pr-2">
                    {isLoadingData ? (
                      <div className="col-span-2 py-8 flex flex-col items-center justify-center text-slate-500">
                        <RefreshCw className="w-6 h-6 animate-spin mb-2 text-teal-500/50" />
                        <span className="text-xs font-medium">Syncing Protocols...</span>
                      </div>
                    ) : activeProtocols.length === 0 ? (
                      <div className="col-span-2 py-8 text-center border border-dashed border-slate-700 rounded-2xl bg-slate-900/30 text-slate-500 text-xs">
                        No protocols found. Create a custom order and save it as a new protocol.
                      </div>
                    ) : (
                      activeProtocols.map((protocol) => (
                        <button
                          key={protocol.id || protocol.name}
                          type="button"
                          onClick={() => handleAddProtocolItems(protocol)}
                          className="p-3.5 rounded-2xl border bg-slate-900/50 border-slate-800 text-left transition-all hover:border-teal-500/40 hover:bg-slate-800 group relative overflow-hidden"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <span className="text-xs font-bold text-slate-200 group-hover:text-teal-300 transition-colors pr-6">
                              {protocol.name}
                            </span>
                            <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-teal-500 group-hover:text-slate-950 transition-colors absolute right-3 top-3">
                              <Plus className="w-3.5 h-3.5" />
                            </div>
                          </div>
                          <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">
                            {protocol.items.join(" • ")}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Right Column: Acuity & Builder */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-inner space-y-5">
                    <div>
                      <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2">
                        Clinical Priority
                      </label>
                      <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                        {(["routine", "urgent", "stat"] as const).map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setPriority(p)}
                            className={`flex-1 py-2 rounded-lg text-xs font-extrabold uppercase transition-all ${priority === p
                                ? p === "stat"
                                  ? "bg-rose-600 text-white shadow-md shadow-rose-900/20"
                                  : p === "urgent"
                                    ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-900/20"
                                    : "bg-teal-500 text-slate-950 shadow-md shadow-teal-900/20"
                                : "text-slate-500 hover:bg-slate-800 hover:text-slate-300"
                              }`}
                          >
                            {p === "stat" ? "⚡ STAT" : p}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2">
                        Primary Order Directive
                      </label>
                      <input
                        type="text"
                        value={orderTitle}
                        onChange={(e) => setOrderTitle(e.target.value)}
                        placeholder={`e.g. STAT Cardiac Workup`}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-4 py-3 text-sm font-semibold text-white focus:outline-none transition-all placeholder:font-normal"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-px w-full bg-slate-800" />

              {/* ─── DYNAMIC ITEMS BUILDER ─────────────────────────────────────── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-slate-200 font-bold flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-teal-400" /> Specific Assays, Tests, or Procedures
                  </label>

                  {/* Admin / Physician Privilege: Save Protocol */}
                  {items.length > 0 && !isCreatingProtocol && (
                    <button
                      type="button"
                      onClick={() => setIsCreatingProtocol(true)}
                      className="text-[11px] font-bold text-teal-400 hover:text-teal-300 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500/10 border border-teal-500/20 hover:bg-teal-500/20 transition-all"
                    >
                      <Save className="w-3.5 h-3.5" /> Save as Protocol
                    </button>
                  )}
                </div>

                {/* Protocol Creation Inline Form */}
                {isCreatingProtocol && (
                  <div className="p-4 rounded-2xl bg-teal-950/20 border border-teal-500/30 flex flex-col sm:flex-row items-end sm:items-center gap-3 animate-fade-in">
                    <div className="flex-1 w-full">
                      <label className="text-[10px] text-teal-400 font-bold uppercase mb-1 block">New Protocol Name</label>
                      <input
                        type="text"
                        value={newProtocolName}
                        onChange={(e) => setNewProtocolName(e.target.value)}
                        placeholder="e.g. ICU Sepsis Bundle V2"
                        className="w-full bg-slate-950 border border-teal-500/40 focus:border-teal-400 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => setIsCreatingProtocol(false)}
                        className="px-3 py-2 rounded-lg text-xs font-bold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveProtocolTemplate}
                        disabled={isSavingProtocol || !newProtocolName.trim()}
                        className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all shadow-md"
                      >
                        {isSavingProtocol ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
                        Save Template
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 p-4 rounded-2xl bg-slate-900/60 border border-slate-800 min-h-[80px] shadow-inner">
                  {items.map((item, i) => (
                    <div
                      key={i}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 hover:border-slate-600 transition-colors group"
                    >
                      <span className="text-xs text-slate-200 font-medium leading-tight">{item}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(i)}
                        className="text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 p-1 rounded-md transition-colors"
                        title="Remove Item"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <div className="w-full h-full flex items-center justify-center text-xs text-slate-500 italic py-2">
                      Queue is empty. Select a protocol from the catalog or add custom procedures below.
                    </div>
                  )}
                </div>

                <div className="flex gap-2 relative">
                  <Plus className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={customItemInput}
                    onChange={(e) => setCustomItemInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCustomItem();
                      }
                    }}
                    placeholder="Add unlisted test, assay, or specific directive (Press Enter)..."
                    className="flex-1 bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none transition-colors shadow-inner placeholder:text-slate-600"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomItem}
                    disabled={!customItemInput.trim()}
                    className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-xs font-bold transition-all border border-slate-700"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* ─── CLINICAL DETAILS ──────────────────────────────────────────── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                <div className="space-y-2">
                  <label className="text-[11px] text-slate-400 font-extrabold uppercase tracking-wider block">
                    Clinical Indication (ICD / Reason)
                  </label>
                  <textarea
                    rows={3}
                    value={clinicalIndication}
                    onChange={(e) => setClinicalIndication(e.target.value)}
                    placeholder="Provide diagnostic rationale for insurance and pathologist review..."
                    className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-4 py-3 text-xs text-white focus:outline-none resize-none leading-relaxed shadow-inner"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] text-slate-400 font-extrabold uppercase tracking-wider block">
                    Special Handling Instructions
                  </label>
                  <textarea
                    rows={3}
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="e.g. Fasting 8 hours; Keep sample on ice; Call attending if critical..."
                    className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl px-4 py-3 text-xs text-white focus:outline-none resize-none leading-relaxed shadow-inner"
                  />
                </div>
              </div>

              {/* ─── ROUTING & ASSIGNMENT ──────────────────────────────────────── */}
              <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Users className="w-4 h-4 text-teal-400" />
                    <span className="text-sm font-bold text-white">Execution Routing</span>
                  </div>
                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 font-bold uppercase tracking-wider">
                    Default: First Available
                  </span>
                </div>

                <div className="space-y-3 pt-1">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative flex items-center justify-center mt-0.5">
                      <input
                        type="checkbox"
                        checked={isDoctorExplicitlyRequested}
                        onChange={(e) => setIsDoctorExplicitlyRequested(e.target.checked)}
                        className="peer sr-only"
                      />
                      <div className="w-4 h-4 border-2 border-slate-600 rounded peer-checked:bg-teal-500 peer-checked:border-teal-500 transition-all flex items-center justify-center">
                        <CheckCircle2 className="w-3 h-3 text-slate-950 opacity-0 peer-checked:opacity-100" />
                      </div>
                    </div>
                    <div>
                      <span className="font-bold text-xs text-slate-200 group-hover:text-white transition-colors block">
                        Override: Assign to Specific Clinician/Technician
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5 leading-relaxed">
                        Bypass the general ward pool. Only use if patient has an explicit appointment or continuity of care requirement.
                      </span>
                    </div>
                  </label>

                  {isDoctorExplicitlyRequested && (
                    <div className="pl-7 space-y-4 pt-2 animate-fade-in">
                      <div>
                        <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1.5">
                          Select Requested Professional
                        </label>
                        <select
                          value={requestedDoctorName}
                          onChange={(e) => setRequestedDoctorName(e.target.value)}
                          className="w-full sm:w-2/3 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500 shadow-inner"
                        >
                          <option value="">-- Search Directory --</option>
                          <option value="Dr. Aster Solomon, MD">Dr. Aster Solomon, MD (Internal Medicine)</option>
                          <option value="Dr. Sarah Mitchell, MD">Dr. Sarah Mitchell, MD (Cardiology)</option>
                          <option value="Dr. Daniel Bekele, MD">Dr. Daniel Bekele, MD (Surgery)</option>
                          <option value="Sr. Yohannes Haile, DPT">Sr. Yohannes Haile, DPT (Physiotherapy)</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-2.5 bg-slate-950 p-4 rounded-xl border border-slate-800">
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <div className="relative flex items-center justify-center">
                            <input
                              type="checkbox"
                              checked={patientWillingToWait}
                              onChange={(e) => setPatientWillingToWait(e.target.checked)}
                              className="peer sr-only"
                            />
                            <div className="w-3.5 h-3.5 border border-slate-600 rounded-sm peer-checked:bg-teal-500 peer-checked:border-teal-500 transition-all flex items-center justify-center">
                              <CheckCircle2 className="w-2.5 h-2.5 text-slate-950 opacity-0 peer-checked:opacity-100" />
                            </div>
                          </div>
                          <span className="text-[11px] text-slate-300 group-hover:text-white transition-colors">
                            Patient consents to wait for this specific provider's schedule.
                          </span>
                        </label>

                        <label className="flex items-center gap-3 cursor-pointer group">
                          <div className="relative flex items-center justify-center">
                            <input
                              type="checkbox"
                              checked={hasExistingAppointment}
                              onChange={(e) => setHasExistingAppointment(e.target.checked)}
                              className="peer sr-only"
                            />
                            <div className="w-3.5 h-3.5 border border-slate-600 rounded-sm peer-checked:bg-teal-500 peer-checked:border-teal-500 transition-all flex items-center justify-center">
                              <CheckCircle2 className="w-2.5 h-2.5 text-slate-950 opacity-0 peer-checked:opacity-100" />
                            </div>
                          </div>
                          <span className="text-[11px] text-slate-300 group-hover:text-white transition-colors">
                            An existing confirmed appointment is already on the ledger.
                          </span>
                        </label>

                        {!patientWillingToWait && !hasExistingAppointment && (
                          <div className="mt-1 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] flex items-start gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>Routing Warning: Without wait consent or a prior appointment, system may re-route to the general pool if SLA is breached.</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {errorMsg && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-2.5 shadow-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>

            {/* ─── FOOTER ACTIONS ────────────────────────────────────────────── */}
            <div className="px-6 py-4 border-t border-slate-800 bg-[#0a0c13] flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                <ShieldCheck className="w-4 h-4 text-emerald-500/70" />
                <span className="uppercase tracking-wider font-bold">Encrypted & Audited Transaction</span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 sm:flex-none px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all border border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !orderTitle.trim() || items.length === 0}
                  className={`flex-1 sm:flex-none px-8 py-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-50 active:scale-95 ${priority === "stat"
                      ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/40"
                      : priority === "urgent"
                        ? "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-900/20"
                        : "bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-teal-900/30"
                    }`}
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>
                    {isSubmitting
                      ? "Dispatching Order..."
                      : `Dispatch ${priority.toUpperCase()} Order to ${activeConfig.label.split(" ")[0]}`}
                  </span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}