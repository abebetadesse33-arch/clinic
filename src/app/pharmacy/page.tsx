"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useClinic } from "../../context/ClinicContext";
import RoleGuard from "../../components/auth/RoleGuard";
import PermissionGate from "../../components/auth/PermissionGate";
import LabPharmacyPaymentPanel from "@/components/payment/LabPharmacyPaymentPanel";
import {
  AlertTriangle,
  CheckCircle2,
  Dna,
  FileCheck,
  Filter,
  Pill,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Zap,
  Lock,
  CreditCard,
  X,
  Package,
  Layers,
  Send,
  UserCheck,
  Clock,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Plus,
  Truck,
  Building,
  Bell,
  Check,
  Activity,
  ChevronRight,
} from "lucide-react";

export default function PharmacyWorkstationPage() {
  return (
    <RoleGuard
      allowedRoles={[
        "pharmacist",
        "physician",
        "nurse_practitioner",
        "nurse",
        "system_admin",
        "tenant_admin",
        "auditor",
      ]}
      fallbackTitle="Clinical Pharmacotherapy Suite"
      fallbackMessage="Access to medication dispensing and DDI clinical evaluation is restricted to licensed pharmacists and clinical prescribers."
    >
      <PharmacyWorkstationContent />
    </RoleGuard>
  );
}

function PharmacyWorkstationContent() {
  const {
    patients,
    selectedPatient,
    selectPatient,
    medications,
    prescriptions: contextPrescriptions,
    labResults,
    genetics,
    checkSafetyForCandidate,
    currentUser,
  } = useClinic();

  const patient = selectedPatient || patients[0];
  const pMeds = medications.filter((m) => m.patientId === patient?.id);
  const egfrLab = labResults.find((l) => l.patientId === patient?.id && l.testName.toLowerCase().includes("egfr"));
  const cyp2c19 = genetics.find((g) => g.patientId === patient?.id && g.gene.toUpperCase() === "CYP2C19");

  // Tab State
  const [activeTab, setActiveTab] = useState<"queue" | "inventory" | "batches" | "suppliers" | "safety">("queue");

  // Dispensing Queue State
  const [queue, setQueue] = useState<any[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueFilter, setQueueFilter] = useState<string>("all");
  const [queueSearch, setQueueSearch] = useState<string>("");

  // Modals State
  const [showPaymentPanel, setShowPaymentPanel] = useState(false);
  const [paymentPatient, setPaymentPatient] = useState<any>(null);
  const [dispatchModalItem, setDispatchModalItem] = useState<any | null>(null);
  const [selectedNurseId, setSelectedNurseId] = useState<string>("11111111-1111-1111-1111-111111111103");
  const [dispatchWard, setDispatchWard] = useState<string>("Ward 3 - Acute Care");
  const [dispatchBed, setDispatchBed] = useState<string>("Bed 12B");
  const [dispatchNotes, setDispatchNotes] = useState<string>("");

  // Inventory State
  const [catalog, setCatalog] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [invAlerts, setInvAlerts] = useState<any[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventorySearch, setInventorySearch] = useState("");
  const [showAddDrugModal, setShowAddDrugModal] = useState(false);
  const [showAddBatchModal, setShowAddBatchModal] = useState(false);
  const [selectedDrugForBatch, setSelectedDrugForBatch] = useState<any | null>(null);
  const [showNewPoModal, setShowNewPoModal] = useState(false);

  // Safety Screener State
  const [verifyCandidate, setVerifyCandidate] = useState("");
  const [safetyAlerts, setSafetyAlerts] = useState<any[] | null>(null);

  // Notifications State
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  // ──────────────────────────────────────────────────────────
  // DATA FETCHING
  // ──────────────────────────────────────────────────────────

  const fetchQueue = useCallback(async () => {
    setQueueLoading(true);
    try {
      const res = await fetch("/api/v1/pharmacy/queue");
      const data = await res.json();
      if (data.success) {
        setQueue(data.queue || []);
        setUnreadNotifCount(data.unreadNotifications || 0);
      }
    } catch (e) {
      console.error("Failed to load queue:", e);
    } finally {
      setQueueLoading(false);
    }
  }, []);

  const fetchInventory = useCallback(async () => {
    setInventoryLoading(true);
    try {
      const [catRes, batchRes, supRes, poRes, alertRes] = await Promise.all([
        fetch("/api/v1/pharmacy/inventory?view=catalog").then((r) => r.json()),
        fetch("/api/v1/pharmacy/inventory?view=batches").then((r) => r.json()),
        fetch("/api/v1/pharmacy/inventory?view=suppliers").then((r) => r.json()),
        fetch("/api/v1/pharmacy/inventory?view=purchase_orders").then((r) => r.json()),
        fetch("/api/v1/pharmacy/inventory?view=alerts").then((r) => r.json()),
      ]);

      if (catRes.success) setCatalog(catRes.catalog || []);
      if (batchRes.success) setBatches(batchRes.batches || []);
      if (supRes.success) setSuppliers(supRes.suppliers || []);
      if (poRes.success) setPurchaseOrders(poRes.orders || []);
      if (alertRes.success) setInvAlerts(alertRes.alerts || []);
    } catch (e) {
      console.error("Failed to load inventory:", e);
    } finally {
      setInventoryLoading(false);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      if (!currentUser?.id) return;
      const res = await fetch(`/api/v1/pharmacy/notify?recipientId=${currentUser.id}&role=pharmacist`);
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
        setUnreadNotifCount(data.unreadCount || 0);
      }
    } catch (e) {
      console.error("Failed to load notifications:", e);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    fetchQueue();
    fetchInventory();
    fetchNotifications();

    const interval = setInterval(() => {
      fetchQueue();
      fetchNotifications();
    }, 15000);

    return () => clearInterval(interval);
  }, [fetchQueue, fetchInventory, fetchNotifications]);

  // ──────────────────────────────────────────────────────────
  // DISPENSING ACTIONS
  // ──────────────────────────────────────────────────────────

  const handleDispense = async (item: any) => {
    try {
      const res = await fetch("/api/v1/pharmacy/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "dispense",
          queueItemId: item.id,
          pharmacistId: currentUser?.id,
          deliveryMethod: item.deliveryMethod,
        }),
      }).then((r) => r.json());

      if (res.success) {
        alert(`✅ Dispensed: ${item.medicationName}. Stock deducted via FEFO.`);
        fetchQueue();
        fetchInventory();
      } else {
        alert(`⚠️ ${res.error || "Failed to dispense medication"}`);
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    }
  };

  const handleDispatchToNurse = async () => {
    if (!dispatchModalItem) return;
    try {
      const res = await fetch("/api/v1/pharmacy/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "dispatch_to_nurse",
          queueItemId: dispatchModalItem.id,
          nurseId: selectedNurseId,
          wardId: dispatchWard,
          bedNumber: dispatchBed,
          notes: dispatchNotes,
        }),
      }).then((r) => r.json());

      if (res.success) {
        alert(`🚀 Dispatched to Nurse! The nurse and patient have been alerted in real time.`);
        setDispatchModalItem(null);
        fetchQueue();
      } else {
        alert(`⚠️ ${res.error || "Failed to dispatch to nurse"}`);
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    }
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyCandidate.trim() || !patient?.id) return;
    const alerts = checkSafetyForCandidate(verifyCandidate, patient.id);
    setSafetyAlerts(alerts);
  };

  const markAllNotificationsRead = async () => {
    if (!currentUser?.id) return;
    await fetch("/api/v1/pharmacy/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_all_read", recipientId: currentUser.id }),
    });
    setUnreadNotifCount(0);
    fetchNotifications();
  };

  // Filtered Queue
  const filteredQueue = queue.filter((item) => {
    if (queueFilter === "awaiting_payment" && item.status !== "awaiting_payment") return false;
    if (queueFilter === "payment_verified" && item.status !== "payment_verified") return false;
    if (queueFilter === "being_dispensed" && item.status !== "being_dispensed") return false;
    if (queueFilter === "dispatched_to_nurse" && item.status !== "dispatched_to_nurse") return false;
    if (queueFilter === "completed" && item.status !== "completed" && item.status !== "ready_for_pickup" && item.status !== "nurse_received") return false;

    if (queueSearch) {
      const q = queueSearch.toLowerCase();
      const matchMed = item.medicationName?.toLowerCase().includes(q);
      const matchPat = (item.patientFirstName + " " + item.patientLastName)?.toLowerCase().includes(q);
      const matchMrn = item.patientMrn?.toLowerCase().includes(q);
      if (!matchMed && !matchPat && !matchMrn) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* ────────────────────────────────────────────────────────── */}
      {/* HEADER BANNER */}
      {/* ────────────────────────────────────────────────────────── */}
      <div className="glass-panel p-6 rounded-3xl border border-teal-500/20 bg-gradient-to-r from-slate-900 via-slate-900/95 to-teal-950/40 shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Pill className="w-3.5 h-3.5" />
              Smart Pharmacy & Dispensing Engine
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 font-mono">
              Auto FEFO Inventory
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-800">
              Live Gateway Sync
            </span>
          </div>

          <h1 className="text-2xl lg:text-3xl font-black text-white mt-2">
            Pharmacy Workstation & Medication Automation
          </h1>
          <p className="text-xs lg:text-sm text-slate-300 mt-1 max-w-3xl">
            Automated prescription receipt, dynamic drug pricing, instant patient payment notification, one-click FEFO dispensing, and real-time nurse ward handoff.
          </p>
        </div>

        {/* Right Header CTAs & Notifications */}
        <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              className="relative p-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
              title="Pharmacy Alerts"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white font-bold text-[10px] flex items-center justify-center animate-pulse">
                  {unreadNotifCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifDropdown && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-4 z-50 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-teal-400" />
                    Live Pharmacy Notifications
                  </h4>
                  <button
                    onClick={markAllNotificationsRead}
                    className="text-[11px] text-teal-400 hover:underline font-semibold"
                  >
                    Mark all read
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {notifications.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-4 text-center">No new notifications</p>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-2.5 rounded-xl border text-xs ${
                          n.readAt ? "bg-slate-800/40 border-slate-800 text-slate-400" : "bg-teal-950/40 border-teal-700/50 text-slate-200"
                        }`}
                      >
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <Activity className="w-3 h-3 text-teal-400" />
                          {n.title}
                        </div>
                        <p className="text-[11px] text-slate-300 mt-0.5">{n.body}</p>
                        <span className="text-[9px] text-slate-500 mt-1 block">
                          {new Date(n.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => {
              fetchQueue();
              fetchInventory();
            }}
            className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${queueLoading || inventoryLoading ? "animate-spin text-teal-400" : ""}`} />
          </button>

          {/* Fast Patient Selector */}
          <select
            value={patient?.id}
            onChange={(e) => selectPatient(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-2xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500 font-semibold"
          >
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.firstName} {p.lastName} ({p.mrn})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* TABS NAVIGATION */}
      {/* ────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab("queue")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
            activeTab === "queue"
              ? "bg-teal-500 text-slate-950 shadow-lg shadow-teal-500/20"
              : "bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800"
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Live Dispensing Queue</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${activeTab === "queue" ? "bg-slate-950 text-teal-300" : "bg-slate-800 text-slate-400"}`}>
            {queue.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("inventory")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
            activeTab === "inventory"
              ? "bg-teal-500 text-slate-950 shadow-lg shadow-teal-500/20"
              : "bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800"
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Drug Catalog & Stock</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${activeTab === "inventory" ? "bg-slate-950 text-teal-300" : "bg-slate-800 text-slate-400"}`}>
            {catalog.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("batches")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
            activeTab === "batches"
              ? "bg-teal-500 text-slate-950 shadow-lg shadow-teal-500/20"
              : "bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>FEFO Batches ({batches.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("suppliers")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
            activeTab === "suppliers"
              ? "bg-teal-500 text-slate-950 shadow-lg shadow-teal-500/20"
              : "bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800"
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Suppliers & POs ({purchaseOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("safety")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
            activeTab === "safety"
              ? "bg-teal-500 text-slate-950 shadow-lg shadow-teal-500/20"
              : "bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800"
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Clinical Safety Screener</span>
        </button>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 1: LIVE DISPENSING QUEUE */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === "queue" && (
        <div className="space-y-4">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="glass-card p-3.5 rounded-2xl border border-amber-500/30 bg-amber-950/20">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Awaiting Payment</span>
              <div className="text-xl font-black text-white mt-0.5">
                {queue.filter((q) => q.status === "awaiting_payment").length}
              </div>
              <p className="text-[10px] text-amber-200/80 mt-0.5">Patient notified with payment total</p>
            </div>

            <div className="glass-card p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-950/20">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Payment Verified ✅</span>
              <div className="text-xl font-black text-white mt-0.5">
                {queue.filter((q) => q.status === "payment_verified").length}
              </div>
              <p className="text-[10px] text-emerald-200/80 mt-0.5">Ready for immediate dispensing</p>
            </div>

            <div className="glass-card p-3.5 rounded-2xl border border-cyan-500/30 bg-cyan-950/20">
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">In Dispense / Transit</span>
              <div className="text-xl font-black text-white mt-0.5">
                {queue.filter((q) => q.status === "being_dispensed" || q.status === "dispatched_to_nurse").length}
              </div>
              <p className="text-[10px] text-cyan-200/80 mt-0.5">Assigned to nurse / counter</p>
            </div>

            <div className="glass-card p-3.5 rounded-2xl border border-purple-500/30 bg-purple-950/20">
              <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Completed Today</span>
              <div className="text-xl font-black text-white mt-0.5">
                {queue.filter((q) => q.status === "completed" || q.status === "ready_for_pickup" || q.status === "nurse_received").length}
              </div>
              <p className="text-[10px] text-purple-200/80 mt-0.5">Delivered to patient</p>
            </div>
          </div>

          {/* Queue Filter Controls */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
              {[
                { id: "all", label: "All Items" },
                { id: "payment_verified", label: "Ready to Dispense" },
                { id: "awaiting_payment", label: "Awaiting Payment" },
                { id: "dispatched_to_nurse", label: "In Nurse Transit" },
                { id: "completed", label: "Completed" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setQueueFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    queueFilter === f.id
                      ? "bg-teal-500/20 text-teal-300 border border-teal-500/40"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-72">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search drug, patient, MRN..."
                value={queueSearch}
                onChange={(e) => setQueueSearch(e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          {/* Live Queue Cards */}
          <div className="space-y-3">
            {filteredQueue.length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-slate-900/40 border border-slate-800">
                <CheckCircle2 className="w-10 h-10 text-teal-500/40 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-white">No Prescriptions in Current Queue</h3>
                <p className="text-xs text-slate-400 mt-1">
                  When a doctor signs a prescription, it will automatically calculate price and appear here.
                </p>
              </div>
            ) : (
              filteredQueue.map((item) => (
                <div
                  key={item.id}
                  className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all shadow-md flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4"
                >
                  {/* Medication & Patient Info */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Priority Tag */}
                      {item.priority === "stat" && (
                        <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-black uppercase animate-pulse">
                          🚨 STAT URGENT
                        </span>
                      )}
                      {item.priority === "urgent" && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold uppercase">
                          ⚡ Urgent
                        </span>
                      )}

                      {/* Status Badge */}
                      {item.status === "awaiting_payment" && (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Awaiting Payment
                        </span>
                      )}
                      {item.status === "payment_verified" && (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-extrabold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          Payment Verified ✅ (Ready to Dispense)
                        </span>
                      )}
                      {item.status === "being_dispensed" && (
                        <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-bold flex items-center gap-1">
                          <Activity className="w-3 h-3" />
                          Dispensing in Progress
                        </span>
                      )}
                      {item.status === "dispatched_to_nurse" && (
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 text-xs font-bold flex items-center gap-1">
                          <Send className="w-3 h-3" />
                          Dispatched to Nurse ({item.wardId ?? "Ward"})
                        </span>
                      )}
                      {item.status === "ready_for_pickup" && (
                        <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40 text-xs font-bold flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Ready at Counter
                        </span>
                      )}
                      {item.status === "nurse_received" && (
                        <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-bold flex items-center gap-1">
                          <UserCheck className="w-3 h-3" />
                          Nurse Received at Ward
                        </span>
                      )}

                      <span className="text-[11px] text-slate-400">
                        MRN: <strong className="text-slate-200">{item.patientMrn}</strong>
                      </span>
                    </div>

                    <div className="flex flex-wrap items-baseline gap-2">
                      <h4 className="text-base font-extrabold text-white">
                        {item.medicationName} <span className="text-teal-400">({item.dosage})</span>
                      </h4>
                      <span className="text-xs text-slate-400">
                        Qty: <strong className="text-white">{item.quantity}</strong> • Instructions: {item.rxInstructions || "As directed"}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span>Patient: <strong className="text-slate-200">{item.patientFirstName} {item.patientLastName}</strong></span>
                      <span>•</span>
                      <span>Delivery: <strong className="text-teal-300 uppercase">{item.deliveryMethod?.replace("_", " ")}</strong></span>
                      {item.wardId && (
                        <>
                          <span>•</span>
                          <span>Location: <strong className="text-white">{item.wardId}</strong> {item.bedNumber ? `(${item.bedNumber})` : ""}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Pricing & Actions */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-800">
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Total Amount</span>
                      <div className="text-lg font-black text-emerald-400">
                        {item.currency || "ETB"} {Number(item.totalPrice).toFixed(2)}
                      </div>
                    </div>

                    {/* Action Buttons based on status */}
                    <div className="flex items-center gap-2">
                      {item.status === "awaiting_payment" && (
                        <button
                          onClick={() => {
                            setPaymentPatient({
                              id: item.patientId,
                              name: `${item.patientFirstName} ${item.patientLastName}`,
                              mrn: item.patientMrn,
                              invoiceId: item.rxInvoiceId,
                            });
                            setShowPaymentPanel(true);
                          }}
                          className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          Collect Payment
                        </button>
                      )}

                      {item.status === "payment_verified" && (
                        <PermissionGate
                          permission="dispense_medications"
                          actionName="Dispense"
                          fallback={
                            <span className="text-xs text-slate-500 bg-slate-800 px-3 py-1.5 rounded-xl">
                              Pharmacist Required
                            </span>
                          }
                        >
                          <button
                            onClick={() => handleDispense(item)}
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-500/20"
                          >
                            <Zap className="w-3.5 h-3.5 fill-slate-950" />
                            Verify & Dispense (FEFO)
                          </button>
                        </PermissionGate>
                      )}

                      {item.status === "being_dispensed" && (
                        <button
                          onClick={() => setDispatchModalItem(item)}
                          className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Send to Nurse / Ward
                        </button>
                      )}

                      {item.status === "dispatched_to_nurse" && (
                        <button
                          onClick={async () => {
                            await fetch("/api/v1/pharmacy/queue", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ action: "nurse_received", queueItemId: item.id }),
                            });
                            fetchQueue();
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/40 text-xs font-semibold"
                        >
                          Acknowledge Receipt
                        </button>
                      )}

                      {(item.status === "ready_for_pickup" || item.status === "nurse_received") && (
                        <button
                          onClick={async () => {
                            await fetch("/api/v1/pharmacy/queue", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ action: "complete", queueItemId: item.id }),
                            });
                            fetchQueue();
                          }}
                          className="px-3 py-1.5 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700 text-xs font-bold"
                        >
                          Complete Order
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 2: DRUG CATALOG & INVENTORY */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === "inventory" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="relative flex-1 max-w-md w-full">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search drug generic name, brand name, strength..."
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>

            <button
              onClick={() => setShowAddDrugModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Medication to Catalog
            </button>
          </div>

          {/* Catalog Table */}
          <div className="glass-card rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-4">Medication</th>
                    <th className="p-4">Form & Route</th>
                    <th className="p-4">Unit Cost</th>
                    <th className="p-4">Selling Price</th>
                    <th className="p-4">Stock Level</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {catalog
                    .filter((d) => {
                      if (!inventorySearch) return true;
                      const q = inventorySearch.toLowerCase();
                      return (
                        d.genericName?.toLowerCase().includes(q) ||
                        d.brandName?.toLowerCase().includes(q) ||
                        d.strength?.toLowerCase().includes(q)
                      );
                    })
                    .map((drug) => {
                      const stock = Number(drug.totalStock || 0);
                      const reorder = Number(drug.reorderLevel || 50);
                      const isLow = stock <= reorder && stock > 0;
                      const isOut = stock === 0;

                      return (
                        <tr key={drug.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-4">
                            <div className="font-extrabold text-white">{drug.genericName}</div>
                            {drug.brandName && (
                              <div className="text-[11px] text-teal-400 font-semibold">{drug.brandName}</div>
                            )}
                            <div className="text-[10px] text-slate-400">{drug.strength} • Pkg: {drug.packageSize}</div>
                          </td>
                          <td className="p-4">
                            <span className="capitalize">{drug.dosageForm}</span>
                            <div className="text-[10px] text-slate-400 uppercase">{drug.route}</div>
                          </td>
                          <td className="p-4 font-mono">ETB {Number(drug.defaultUnitCost).toFixed(2)}</td>
                          <td className="p-4 font-mono font-bold text-emerald-400">
                            ETB {Number(drug.defaultSellingPrice).toFixed(2)}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-black text-white">{stock}</span>
                              <span className="text-[10px] text-slate-400">/ min {reorder}</span>
                            </div>
                            {/* Stock Bar */}
                            <div className="w-24 h-1.5 bg-slate-800 rounded-full mt-1 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  isOut ? "bg-rose-500" : isLow ? "bg-amber-400" : "bg-emerald-500"
                                }`}
                                style={{ width: `${Math.min(100, (stock / (reorder * 3)) * 100)}%` }}
                              />
                            </div>
                          </td>
                          <td className="p-4">
                            {isOut ? (
                              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold text-[10px] border border-rose-500/30">
                                Out of Stock
                              </span>
                            ) : isLow ? (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[10px] border border-amber-500/30">
                                Low Stock ({stock})
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/30">
                                Adequate ({stock})
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => {
                                setSelectedDrugForBatch(drug);
                                setShowAddBatchModal(true);
                              }}
                              className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 text-[11px] font-bold"
                            >
                              + Add Batch
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 3: FEFO BATCHES */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === "batches" && (
        <div className="space-y-4">
          <div className="glass-card rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-teal-400" />
                  Active Drug Batches (First Expiry First Out - FEFO)
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Dispensing will automatically deduct from the earliest expiring batch.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-4">Drug</th>
                    <th className="p-4">Batch Number</th>
                    <th className="p-4">Supplier</th>
                    <th className="p-4">Expiry Date</th>
                    <th className="p-4">Remaining</th>
                    <th className="p-4">Bin Location</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {batches.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-800/40">
                      <td className="p-4">
                        <div className="font-bold text-white">{b.drugGenericName}</div>
                        <div className="text-[10px] text-slate-400">{b.drugStrength}</div>
                      </td>
                      <td className="p-4 font-mono text-teal-300 font-bold">{b.batchNumber}</td>
                      <td className="p-4 text-slate-300">{b.supplierName || "Direct / Local"}</td>
                      <td className="p-4">
                        <span className="font-mono text-white">{b.expiryDate}</span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm font-black text-white">{b.quantityRemaining}</span>
                        <span className="text-[10px] text-slate-500"> / {b.quantityReceived}</span>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono text-[10px]">
                          {b.locationBin || "Shelf A-1"}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 4: SUPPLIERS & PURCHASE ORDERS */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === "suppliers" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Purchase Orders & Vendors</h3>
            <button
              onClick={() => setShowNewPoModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md"
            >
              <Plus className="w-4 h-4" />
              Create Purchase Order
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Purchase Orders */}
            <div className="glass-card p-5 rounded-3xl border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-2">
                <Truck className="w-4 h-4" />
                Active Purchase Orders
              </h4>

              <div className="space-y-2.5">
                {purchaseOrders.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-4">No purchase orders created yet.</p>
                ) : (
                  purchaseOrders.map((po) => (
                    <div key={po.id} className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white text-xs">{po.poNumber}</div>
                        <div className="text-[11px] text-slate-400">{po.supplierName} • Total: ETB {po.totalAmount}</div>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold text-[10px] uppercase">
                        {po.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Supplier Directory */}
            <div className="glass-card p-5 rounded-3xl border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-2">
                <Building className="w-4 h-4" />
                Registered Suppliers ({suppliers.length})
              </h4>

              <div className="space-y-2.5">
                {suppliers.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-4">No suppliers registered.</p>
                ) : (
                  suppliers.map((s) => (
                    <div key={s.id} className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between">
                        <strong className="text-xs text-white">{s.name}</strong>
                        <span className="text-[10px] text-teal-400">Lead: {s.leadTimeDays} days</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {s.contactPerson} • {s.phone} • {s.email}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 5: CLINICAL SAFETY SCREENER & DDI */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === "safety" && (
        <div className="space-y-6">
          {/* Critical Badges */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-card p-4 rounded-2xl border border-cyan-500/30 bg-cyan-950/20 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-bold uppercase">Renal Clearance (eGFR)</span>
                <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold text-[10px]">
                  Stage 3b CKD
                </span>
              </div>
              <div className="text-xl font-extrabold text-white">
                {egfrLab?.value || "42"} <span className="text-xs font-normal text-slate-400">mL/min/1.73m²</span>
              </div>
              <p className="text-[11px] text-slate-300">
                Metformin cap: 1000 mg/day. SGLT2i approved for cardiorenal protection.
              </p>
            </div>

            <div className="glass-card p-4 rounded-2xl border border-teal-500/30 bg-teal-950/20 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-bold uppercase">Pharmacogenomics (PGx)</span>
                <span className="px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 font-bold text-[10px]">
                  CPIC Level 1A
                </span>
              </div>
              <div className="text-xl font-extrabold text-teal-300">
                CYP2C19 {cyp2c19?.variant || "*2/*2"}
              </div>
              <p className="text-[11px] text-slate-300">
                Poor Metabolizer: Loss-of-function contraindicates Clopidogrel. Use Ticagrelor.
              </p>
            </div>

            <div className="glass-card p-4 rounded-2xl border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-bold uppercase">Documented Allergies</span>
                <span className="text-[10px] text-rose-400 font-bold uppercase">Critical</span>
              </div>
              <div className="text-base font-extrabold text-rose-300">
                {patient?.allergies?.map((a: any) => a.substance).join(", ") || "NKDA"}
              </div>
              <p className="text-[11px] text-slate-400">Cross-checked automatically against beta-lactam class.</p>
            </div>
          </div>

          <div className="glass-card p-6 rounded-3xl border border-teal-500/30 bg-slate-900/90 space-y-4">
            <h3 className="text-xs font-bold text-teal-300 uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-teal-400" />
              Pharmacist Drug Safety & Formulary Screener
            </h3>
            <p className="text-xs text-slate-400">
              Cross-check new medications against allergies, renal limits, and pharmacogenomic enzymes.
            </p>

            <form onSubmit={handleVerify} className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter candidate drug (e.g. Clopidogrel, Ticagrelor, Ciprofloxacin)..."
                  value={verifyCandidate}
                  onChange={(e) => setVerifyCandidate(e.target.value)}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md"
                >
                  Screen Candidate Medication
                </button>
              </div>
            </form>

            {safetyAlerts && (
              <div className="mt-3 space-y-2 animate-fade-in">
                {safetyAlerts.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div>
                      <strong>Approved:</strong> No adverse interaction or pharmacogenomic mismatch identified for &apos;{verifyCandidate}&apos;.
                    </div>
                  </div>
                ) : (
                  safetyAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-4 rounded-2xl border text-xs space-y-1.5 ${
                        alert.severity === "Critical"
                          ? "bg-rose-950/90 border-rose-600 text-rose-200"
                          : "bg-amber-950/90 border-amber-600 text-amber-200"
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-white text-sm">
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                        {alert.title}
                      </div>
                      <p>{alert.description}</p>
                      <div className="pt-1 font-semibold text-teal-300">Action: {alert.recommendation}</div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* MODAL: DISPATCH TO NURSE & WARD */}
      {/* ────────────────────────────────────────────────────────── */}
      {dispatchModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Send className="w-4 h-4 text-blue-400" />
                Dispatch Medication to Assigned Nurse
              </h3>
              <button onClick={() => setDispatchModalItem(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-1 text-xs">
              <div className="font-extrabold text-white text-sm">{dispatchModalItem.medicationName} ({dispatchModalItem.dosage})</div>
              <div className="text-slate-300">
                Patient: <strong className="text-white">{dispatchModalItem.patientFirstName} {dispatchModalItem.patientLastName}</strong> (MRN: {dispatchModalItem.patientMrn})
              </div>
              <div className="text-slate-400">Qty: {dispatchModalItem.quantity} • Paid: ETB {dispatchModalItem.totalPrice}</div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-bold uppercase text-[10px] block mb-1">Select Assigned Nurse</label>
                <select
                  value={selectedNurseId}
                  onChange={(e) => setSelectedNurseId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-500"
                >
                  <option value="11111111-1111-1111-1111-111111111103">Nurse Sarah Connor (RN - Ward 3 Lead)</option>
                  <option value="11111111-1111-1111-1111-111111111102">Nurse John Watson (Clinical Floor Nurse)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 font-bold uppercase text-[10px] block mb-1">Ward / Room</label>
                  <input
                    type="text"
                    value={dispatchWard}
                    onChange={(e) => setDispatchWard(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-bold uppercase text-[10px] block mb-1">Bed Number</label>
                  <input
                    type="text"
                    value={dispatchBed}
                    onChange={(e) => setDispatchBed(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 font-bold uppercase text-[10px] block mb-1">Administration Notes for Nurse</label>
                <textarea
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  placeholder="e.g. Administer with food. Monitor blood pressure 30 mins post-dose..."
                  rows={2}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setDispatchModalItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleDispatchToNurse}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg"
              >
                Confirm Dispatch & Alert Nurse
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* MODAL: ADD DRUG TO CATALOG */}
      {/* ────────────────────────────────────────────────────────── */}
      {showAddDrugModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Plus className="w-4 h-4 text-teal-400" />
                Add Medication to Formulary Catalog
              </h3>
              <button onClick={() => setShowAddDrugModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async (e: any) => {
                e.preventDefault();
                const form = e.target;
                const body = {
                  action: "add_drug",
                  genericName: form.genericName.value,
                  brandName: form.brandName.value,
                  strength: form.strength.value,
                  dosageForm: form.dosageForm.value,
                  route: form.route.value,
                  defaultUnitCost: form.defaultUnitCost.value,
                  defaultSellingPrice: form.defaultSellingPrice.value,
                  reorderLevel: parseInt(form.reorderLevel.value || "50"),
                  packageSize: form.packageSize.value,
                };
                const res = await fetch("/api/v1/pharmacy/inventory", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(body),
                }).then((r) => r.json());

                if (res.success) {
                  alert("✅ Medication added to catalog successfully!");
                  setShowAddDrugModal(false);
                  fetchInventory();
                } else {
                  alert(`⚠️ ${res.error}`);
                }
              }}
              className="space-y-3 text-xs"
            >
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 font-bold uppercase text-[10px] block mb-1">Generic Name *</label>
                  <input name="genericName" required placeholder="e.g. Amoxicillin" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="text-slate-400 font-bold uppercase text-[10px] block mb-1">Brand Name</label>
                  <input name="brandName" placeholder="e.g. Augmentin" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-slate-400 font-bold uppercase text-[10px] block mb-1">Strength *</label>
                  <input name="strength" required placeholder="e.g. 500mg" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="text-slate-400 font-bold uppercase text-[10px] block mb-1">Dosage Form</label>
                  <select name="dosageForm" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white">
                    <option value="tablet">Tablet</option>
                    <option value="capsule">Capsule</option>
                    <option value="syrup">Syrup</option>
                    <option value="injection">Injection</option>
                    <option value="ointment">Ointment</option>
                    <option value="inhaler">Inhaler</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 font-bold uppercase text-[10px] block mb-1">Route</label>
                  <select name="route" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white">
                    <option value="oral">Oral</option>
                    <option value="iv">IV</option>
                    <option value="im">IM</option>
                    <option value="topical">Topical</option>
                    <option value="inhalation">Inhalation</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-slate-400 font-bold uppercase text-[10px] block mb-1">Unit Cost (ETB)</label>
                  <input name="defaultUnitCost" defaultValue="15.00" type="number" step="0.01" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="text-slate-400 font-bold uppercase text-[10px] block mb-1">Selling Price (ETB)</label>
                  <input name="defaultSellingPrice" defaultValue="25.00" type="number" step="0.01" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-emerald-400" />
                </div>
                <div>
                  <label className="text-slate-400 font-bold uppercase text-[10px] block mb-1">Reorder Level</label>
                  <input name="reorderLevel" defaultValue="50" type="number" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white" />
                </div>
              </div>

              <div>
                <label className="text-slate-400 font-bold uppercase text-[10px] block mb-1">Package Size</label>
                <input name="packageSize" defaultValue="30 tablets" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white" />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setShowAddDrugModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold">
                  Save to Formulary
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* MODAL: ADD BATCH */}
      {/* ────────────────────────────────────────────────────────── */}
      {showAddBatchModal && selectedDrugForBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-teal-400" />
                Add Stock Batch for {selectedDrugForBatch.genericName}
              </h3>
              <button onClick={() => setShowAddBatchModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async (e: any) => {
                e.preventDefault();
                const form = e.target;
                const body = {
                  action: "add_batch",
                  drugId: selectedDrugForBatch.id,
                  batchNumber: form.batchNumber.value,
                  expiryDate: form.expiryDate.value,
                  quantityReceived: parseInt(form.quantityReceived.value),
                  costPerUnit: form.costPerUnit.value,
                  sellingPrice: form.sellingPrice.value,
                  locationBin: form.locationBin.value,
                };
                const res = await fetch("/api/v1/pharmacy/inventory", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(body),
                }).then((r) => r.json());

                if (res.success) {
                  alert("✅ Stock batch added successfully! FEFO queue updated.");
                  setShowAddBatchModal(false);
                  fetchInventory();
                } else {
                  alert(`⚠️ ${res.error}`);
                }
              }}
              className="space-y-3 text-xs"
            >
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 font-bold uppercase text-[10px] block mb-1">Batch Number *</label>
                  <input name="batchNumber" required placeholder="e.g. BATCH-2026-09" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono" />
                </div>
                <div>
                  <label className="text-slate-400 font-bold uppercase text-[10px] block mb-1">Expiry Date *</label>
                  <input name="expiryDate" type="date" required className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-slate-400 font-bold uppercase text-[10px] block mb-1">Quantity *</label>
                  <input name="quantityReceived" type="number" required defaultValue="100" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold" />
                </div>
                <div>
                  <label className="text-slate-400 font-bold uppercase text-[10px] block mb-1">Unit Cost (ETB)</label>
                  <input name="costPerUnit" defaultValue={selectedDrugForBatch.defaultUnitCost} type="number" step="0.01" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="text-slate-400 font-bold uppercase text-[10px] block mb-1">Selling Price</label>
                  <input name="sellingPrice" defaultValue={selectedDrugForBatch.defaultSellingPrice} type="number" step="0.01" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-emerald-400 font-bold" />
                </div>
              </div>

              <div>
                <label className="text-slate-400 font-bold uppercase text-[10px] block mb-1">Shelf / Bin Location</label>
                <input name="locationBin" defaultValue="Shelf A-1" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white" />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setShowAddBatchModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold">
                  Receive & Enqueue Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* MODAL: COLLECT PAYMENT */}
      {/* ────────────────────────────────────────────────────────── */}
      {showPaymentPanel && paymentPatient && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in"
          onClick={(e) => e.target === e.currentTarget && setShowPaymentPanel(false)}
        >
          <div className="w-full max-w-3xl">
            <LabPharmacyPaymentPanel
              patientId={paymentPatient.id}
              patientName={paymentPatient.name}
              patientMrn={paymentPatient.mrn}
              department="pharmacy"
              doctorId={currentUser?.id || undefined}
              onPaymentComplete={() => {
                setShowPaymentPanel(false);
                fetchQueue();
              }}
              onClose={() => setShowPaymentPanel(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
