"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import RoleGuard from "@/components/auth/RoleGuard";
import {
  Settings,
  FlaskConical,
  Pill,
  Bell,
  ShieldCheck,
  ShieldAlert,
  ToggleLeft,
  ToggleRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Users,
  Lock,
  Unlock,
  ArrowLeft,
  CreditCard,
  Zap,
  ClipboardList,
  Smartphone,
  Mail,
  Sparkles,
  Wallet,
  QrCode,
  Receipt,
  ArrowRightLeft,
  HeartPulse,
  Activity,
  Check,
} from "lucide-react";

export default function AdminPaymentWorkflowPage() {
  return (
    <RoleGuard
      allowedRoles={["system_admin", "tenant_admin"]}
      fallbackTitle="Payment Workflow Administration"
      fallbackMessage="Access restricted to System and Tenant Administrators."
    >
      <AdminPaymentWorkflowContent />
    </RoleGuard>
  );
}

function AdminPaymentWorkflowContent() {
  const [settings, setSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Billing Architecture Model State
  const [billingModel, setBillingModel] = useState<"unified_encounter_tab" | "per_order_gate" | "hybrid">("hybrid");
  const [defaultDepositAmount, setDefaultDepositAmount] = useState<number>(2500);
  const [enablePoCQRPayments, setEnablePoCQRPayments] = useState<boolean>(true);
  const [allowPharmacyEmergencyBypass, setAllowPharmacyEmergencyBypass] = useState<boolean>(true);
  const [softGateLabCollection, setSoftGateLabCollection] = useState<boolean>(true);
  const [softGatePharmacyReview, setSoftGatePharmacyReview] = useState<boolean>(true);

  // Local editable state
  const [enforceLabGate, setEnforceLabGate] = useState(true);
  const [enforcePharmacyGate, setEnforcePharmacyGate] = useState(true);
  const [autoNotifyLab, setAutoNotifyLab] = useState(true);
  const [autoNotifyPharmacy, setAutoNotifyPharmacy] = useState(true);
  const [allowEmergencyOverride, setAllowEmergencyOverride] = useState(true);
  const [globalFreeMode, setGlobalFreeMode] = useState(false);
  const [allowCash, setAllowCash] = useState(true);

  // Account Creation Verification States
  const [requireEmailVerification, setRequireEmailVerification] = useState(true);
  const [requireSmsVerification, setRequireSmsVerification] = useState(false);
  const [enableTwoFactorLogin, setEnableTwoFactorLogin] = useState(false);
  const [allowDemoBypass, setAllowDemoBypass] = useState(true);

  const showNotif = (type: "success" | "error", msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 5000);
  };

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const [resPayment, resAuth] = await Promise.all([
        fetch("/api/v1/admin/payment-workflow-settings"),
        fetch("/api/v1/admin/auth-settings"),
      ]);

      const dataPayment = await resPayment.json();
      if (dataPayment.success && dataPayment.data) {
        const s = dataPayment.data;
        setSettings(s);
        setBillingModel(s.billingModel ?? "hybrid");
        setDefaultDepositAmount(s.defaultDepositAmountEtb ? Number(s.defaultDepositAmountEtb) : 2500);
        setEnablePoCQRPayments(s.enablePoCQRPayments ?? true);
        setAllowPharmacyEmergencyBypass(s.allowPharmacyEmergencyBypass ?? true);
        setSoftGateLabCollection(s.softGateLabCollection ?? true);
        setSoftGatePharmacyReview(s.softGatePharmacyReview ?? true);
        setEnforceLabGate(s.enforceLabPaymentGate ?? true);
        setEnforcePharmacyGate(s.enforcePharmacyPaymentGate ?? true);
        setAutoNotifyLab(s.autoNotifyLabOnPayment ?? true);
        setAutoNotifyPharmacy(s.autoNotifyPharmacyOnPayment ?? true);
        setAllowEmergencyOverride(s.allowEmergencyOverride ?? true);
        setGlobalFreeMode(s.globalFreeMode ?? false);
        setAllowCash(s.allowCashReconciliation ?? true);
      }

      const dataAuth = await resAuth.json();
      if (dataAuth.success && dataAuth.data) {
        const a = dataAuth.data;
        setRequireEmailVerification(a.requireEmailVerification ?? true);
        setRequireSmsVerification(a.requireSmsVerification ?? false);
        setEnableTwoFactorLogin(a.enableTwoFactorLogin ?? false);
        setAllowDemoBypass(a.allowDemoBypass ?? true);
      }
    } catch (e) {
      showNotif("error", "Failed to load settings.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const [resPayment, resAuth] = await Promise.all([
        fetch("/api/v1/admin/payment-workflow-settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            billingModel,
            defaultDepositAmountEtb: defaultDepositAmount,
            enablePoCQRPayments,
            allowPharmacyEmergencyBypass,
            softGateLabCollection,
            softGatePharmacyReview,
            enforceLabPaymentGate: enforceLabGate,
            enforcePharmacyPaymentGate: enforcePharmacyGate,
            autoNotifyLabOnPayment: autoNotifyLab,
            autoNotifyPharmacyOnPayment: autoNotifyPharmacy,
            allowEmergencyOverride,
            globalFreeMode,
            allowCashReconciliation: allowCash,
          }),
        }),
        fetch("/api/v1/admin/auth-settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requireEmailVerification,
            requireSmsVerification,
            enableTwoFactorLogin,
            allowDemoBypass,
          }),
        }),
      ]);

      const dataPayment = await resPayment.json();
      const dataAuth = await resAuth.json();

      if (!dataPayment.success || !dataAuth.success) {
        throw new Error(dataPayment.error || dataAuth.error || "Save failed");
      }

      setSettings(dataPayment.data);
      showNotif("success", "Workflow, payment gates & account verification settings saved successfully.");
    } catch (e: any) {
      showNotif("error", e.message || "Save failed.");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Reusable Toggle Row ──────────────────────────────────────────────────

  const ToggleRow = ({
    label,
    desc,
    value,
    onChange,
    icon: Icon,
    iconColor,
    danger = false,
  }: {
    label: string;
    desc: string;
    value: boolean;
    onChange: (v: boolean) => void;
    icon: any;
    iconColor: string;
    danger?: boolean;
  }) => (
    <div
      className={`flex items-center justify-between gap-4 p-4 rounded-2xl border transition-all ${
        value
          ? danger
            ? "border-rose-500/30 bg-rose-500/5"
            : "border-teal-500/20 bg-teal-500/5"
          : "border-slate-800 bg-slate-900/40"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
            value ? (danger ? "border-rose-500/40 bg-rose-500/15" : "border-teal-500/30 bg-teal-500/10") : "border-slate-700 bg-slate-900"
          }`}
        >
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        <div>
          <span className="text-sm font-bold text-white block">{label}</span>
          <span className="text-[11px] text-slate-400">{desc}</span>
        </div>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`shrink-0 w-12 h-6 rounded-full relative transition-all duration-300 ${
          value ? (danger ? "bg-rose-500" : "bg-teal-500") : "bg-slate-700"
        }`}
        role="switch"
        aria-checked={value}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 ${
            value ? "translate-x-6" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Notification toast */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl border text-sm font-medium animate-slide-up ${
            notification.type === "success"
              ? "bg-emerald-900/90 border-emerald-500/40 text-emerald-200"
              : "bg-rose-900/90 border-rose-500/40 text-rose-200"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          {notification.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="p-2 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-teal-400" />
              <h1 className="text-xl font-extrabold text-white tracking-tight">
                Payment Workflow & Notification Settings
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Control lab and pharmacy payment gates, role-based access, and auto-notification routing.
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-sm transition-all shadow-lg shadow-teal-900/30 disabled:opacity-60"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
          {isSaving ? "Saving..." : "Save All Settings"}
        </button>
      </div>

      {/* ── 1. Clinic Billing Architecture: Unified Tab vs. Per-Order QR ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
        <div>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
              <Wallet className="w-4 h-4 text-teal-400" />
              Clinic Billing Architecture & Settlement Engine
            </h2>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-500/10 text-teal-300 border border-teal-500/20">
              Active: {billingModel === "unified_encounter_tab" ? "Unified Encounter Tab" : billingModel === "per_order_gate" ? "Per-Order QR Gating" : "Hybrid Mode (Both Enabled)"}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Choose how patient care is monetized: upfront deposit with single discharge settlement, decentralized per-order Point-of-Care QR payments, or hybrid mode.
          </p>
        </div>

        {/* 3 Architecture Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Unified Encounter Tab */}
          <div
            onClick={() => setBillingModel("unified_encounter_tab")}
            className={`cursor-pointer rounded-2xl border p-5 transition-all relative space-y-3 ${
              billingModel === "unified_encounter_tab"
                ? "border-teal-500 bg-teal-500/10 shadow-lg shadow-teal-950/40 ring-1 ring-teal-500/50"
                : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-teal-500/15 border border-teal-500/30 text-teal-400">
                <Wallet className="w-4 h-4" />
              </div>
              {billingModel === "unified_encounter_tab" && (
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500 text-slate-950">
                  <Check className="w-3 h-3" /> Selected
                </span>
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Unified Encounter Tab</h3>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Patient deploys a deposit (e.g. ETB 2,500) at registration. All doctor consults, lab tests, and medications run against the tab. At discharge, the final balance is calculated (excess deposit refunded or remaining balance collected).
              </p>
            </div>
            <div className="text-[10px] text-teal-400/90 font-medium pt-2 border-t border-slate-800/80 flex items-center gap-1">
              <span>Zero handoff wait</span> · <span>Single settlement</span>
            </div>
          </div>

          {/* Card 2: Per-Order Gating */}
          <div
            onClick={() => setBillingModel("per_order_gate")}
            className={`cursor-pointer rounded-2xl border p-5 transition-all relative space-y-3 ${
              billingModel === "per_order_gate"
                ? "border-sky-500 bg-sky-500/10 shadow-lg shadow-sky-950/40 ring-1 ring-sky-500/50"
                : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-sky-500/15 border border-sky-500/30 text-sky-400">
                <QrCode className="w-4 h-4" />
              </div>
              {billingModel === "per_order_gate" && (
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500 text-slate-950">
                  <Check className="w-3 h-3" /> Selected
                </span>
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Per-Order Gating (PoC QR)</h3>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                No initial deposit. Each department (Lab draw station, Pharmacy counter, Imaging) presents dynamic Point-of-Care QR codes (Telebirr, CBE Birr, Chapa) for instant per-order payment clearance.
              </p>
            </div>
            <div className="text-[10px] text-sky-400/90 font-medium pt-2 border-t border-slate-800/80 flex items-center gap-1">
              <span>Pay-as-you-go</span> · <span>Decentralized counters</span>
            </div>
          </div>

          {/* Card 3: Hybrid Mode */}
          <div
            onClick={() => setBillingModel("hybrid")}
            className={`cursor-pointer rounded-2xl border p-5 transition-all relative space-y-3 ${
              billingModel === "hybrid"
                ? "border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500/50"
                : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                <ArrowRightLeft className="w-4 h-4" />
              </div>
              {billingModel === "hybrid" && (
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950">
                  <Check className="w-3 h-3" /> Recommended
                </span>
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Hybrid Mode (Full Freedom)</h3>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Patients who place a deposit enjoy the frictionless Encounter Tab with discharge reconciliation. Patients without a deposit seamlessly use Point-of-Care QR / cash at individual department counters.
              </p>
            </div>
            <div className="text-[10px] text-emerald-400/90 font-medium pt-2 border-t border-slate-800/80 flex items-center gap-1">
              <span>Maximum patient flexibility</span> · <span>Zero leakage</span>
            </div>
          </div>
        </div>

        {/* Deposit Configuration Panel */}
        {(billingModel === "unified_encounter_tab" || billingModel === "hybrid") && (
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-teal-400" />
                Default Registration Deposit Amount (ETB)
              </span>
              <p className="text-[11px] text-slate-400">
                Suggested visit deposit collected at patient registration / check-in. Any unused surplus is refunded at discharge.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={defaultDepositAmount}
                  onChange={(e) => setDefaultDepositAmount(Math.max(0, Number(e.target.value) || 0))}
                  className="w-32 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm font-bold text-right focus:outline-none focus:border-teal-500"
                />
                <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-bold">ETB</span>
              </div>
              <div className="flex items-center gap-1">
                {[1500, 2500, 5000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setDefaultDepositAmount(amt)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                      defaultDepositAmount === amt
                        ? "bg-teal-500 text-slate-950 border-teal-500"
                        : "bg-slate-900 text-slate-400 border-slate-700 hover:text-white"
                    }`}
                  >
                    {amt.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Dual Workflow Visual Flow Comparison */}
        <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800/80 space-y-3">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
            Operational Pathway Architecture:
          </span>
          <div className="space-y-2 text-[11px]">
            {/* Pathway 1 */}
            <div className="flex flex-wrap items-center gap-2 text-slate-400">
              <span className="px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 font-bold">Encounter Tab:</span>
              <span>Deposit at Arrival</span>
              <span>→</span>
              <span className="text-emerald-300">Doctor Consult (Unblocked)</span>
              <span>→</span>
              <span className="text-emerald-300">Lab Draw & Run (Unblocked)</span>
              <span>→</span>
              <span className="text-emerald-300">Pharmacy Dispense (Unblocked)</span>
              <span>→</span>
              <span className="px-2 py-0.5 rounded bg-teal-500/20 text-teal-200 font-bold">Discharge Balance Settlement (Refund / Collect)</span>
            </div>
            {/* Pathway 2 */}
            <div className="flex flex-wrap items-center gap-2 text-slate-400">
              <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 font-bold">Per-Order PoC:</span>
              <span>Check-In</span>
              <span>→</span>
              <span>Doctor Orders</span>
              <span>→</span>
              <span className="text-sky-300 font-medium">PoC Dynamic QR Scan (Lab Chair / Rx Desk)</span>
              <span>→</span>
              <span>Instant Clearance</span>
              <span>→</span>
              <span>Care Delivered</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Clinical Velocity & Life-Safety Controls ────────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
        <div>
          <h2 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
            <HeartPulse className="w-4 h-4 text-rose-400" />
            Clinical Velocity & Life-Safety Enhancements
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Remove clinical bottlenecks and ensure emergency life-saving protocols are never stalled by administrative payment gates.
          </p>
        </div>
        <div className="space-y-3">
          <ToggleRow
            label="Life-Safety Emergency Bypass for Medication Dispensing"
            desc="Allows physicians to release STAT and emergency medications (epinephrine, dextrose, IV antibiotics) immediately without a payment block."
            value={allowPharmacyEmergencyBypass}
            onChange={setAllowPharmacyEmergencyBypass}
            icon={HeartPulse}
            iconColor="text-rose-400"
          />
          <ToggleRow
            label="Phlebotomy Soft-Gating & Decoupled Collection"
            desc="Permits lab technicians to draw specimens immediately upon doctor order. Payment gate is checked upon result release, saving 25 min waiting time."
            value={softGateLabCollection}
            onChange={setSoftGateLabCollection}
            icon={FlaskConical}
            iconColor="text-sky-400"
          />
          <ToggleRow
            label="Pharmacy Parallel Review & Staging"
            desc="Pharmacists review interactions and pre-package medications during the payment window; only physical handover is locked, cutting counter wait to < 2 min."
            value={softGatePharmacyReview}
            onChange={setSoftGatePharmacyReview}
            icon={Pill}
            iconColor="text-cyan-400"
          />
          <ToggleRow
            label="Decentralized Point-of-Care (PoC) Dynamic QR Terminals"
            desc="Displays instant Telebirr, CBE Birr, and Chapa dynamic QR codes directly at phlebotomy and pharmacy counters for contactless self-checkout."
            value={enablePoCQRPayments}
            onChange={setEnablePoCQRPayments}
            icon={QrCode}
            iconColor="text-purple-400"
          />
        </div>
      </div>

      {/* ── Global Emergency Controls ─────────────────────────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
        <div>
          <h2 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            Global Clinical Override Controls
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            These master switches affect all clinical departments simultaneously.
          </p>
        </div>
        <div className="space-y-3">
          <ToggleRow
            label="Global Free / Emergency Mode"
            desc="When ON, all payment gates across lab, pharmacy, and registration are bypassed instantly — for emergency or disaster situations."
            value={globalFreeMode}
            onChange={setGlobalFreeMode}
            icon={ShieldAlert}
            iconColor="text-rose-400"
            danger={true}
          />
          <ToggleRow
            label="Emergency Override by Physician"
            desc="Allows licensed physicians to bypass payment gates for life-critical orders without admin approval."
            value={allowEmergencyOverride}
            onChange={setAllowEmergencyOverride}
            icon={Unlock}
            iconColor="text-amber-400"
          />
          <ToggleRow
            label="Allow Cash Payment Reconciliation"
            desc="Cashiers can record cash payments manually at the counter."
            value={allowCash}
            onChange={setAllowCash}
            icon={CreditCard}
            iconColor="text-emerald-400"
          />
        </div>
      </div>

      {/* ── Account Creation & National ID Verification Control Matrix ──── */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
        <div>
          <h2 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-400" />
            Account Creation & National ID Verification Controls
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Enable or disable OTP security verification and National ID gates during patient & staff registration.
          </p>
        </div>
        <div className="space-y-3">
          <ToggleRow
            label="Require Email OTP Verification for Account Creation"
            desc="When ON, new accounts must verify a 6-digit email OTP before account activation. When OFF, users are activated instantly without waiting for verification."
            value={requireEmailVerification}
            onChange={setRequireEmailVerification}
            icon={Mail}
            iconColor="text-teal-400"
          />
          <ToggleRow
            label="Require SMS OTP Phone Verification for Account Creation"
            desc="When ON, dispatches a 6-digit SMS verification code to patient/staff mobile phones before Digital Patient Card issuance."
            value={requireSmsVerification}
            onChange={setRequireSmsVerification}
            icon={Smartphone}
            iconColor="text-emerald-400"
          />
          <ToggleRow
            label="Enforce Two-Factor Authentication (2FA) on Sign-In"
            desc="Prompts an OTP verification code on every subsequent login."
            value={enableTwoFactorLogin}
            onChange={setEnableTwoFactorLogin}
            icon={Lock}
            iconColor="text-purple-400"
          />
          <ToggleRow
            label="Allow Sandbox / Demo One-Click Verification Bypass"
            desc="Enables instant autofill and developer bypass codes (123456) for accelerated onboarding and testing."
            value={allowDemoBypass}
            onChange={setAllowDemoBypass}
            icon={Sparkles}
            iconColor="text-amber-400"
          />
        </div>
      </div>

      {/* ── Lab Payment Gate ──────────────────────────────────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
        <div>
          <h2 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-sky-400" />
            Laboratory Service Payment Gate
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Controls whether patients must pay before specimens can be collected and lab tests processed.
          </p>
        </div>
        <div className="space-y-3">
          <ToggleRow
            label="Enforce Lab Payment Gate"
            desc="When ON, lab orders move to 'Pending Payment' status until invoice is cleared. Lab staff can only commence on payment confirmation."
            value={enforceLabGate}
            onChange={setEnforceLabGate}
            icon={Lock}
            iconColor="text-sky-400"
          />
          <ToggleRow
            label="Auto-Notify Lab Staff on Payment"
            desc="When a lab invoice is paid, all lab technicians and biologists receive an instant push notification with patient details and order list."
            value={autoNotifyLab}
            onChange={setAutoNotifyLab}
            icon={Bell}
            iconColor="text-sky-400"
          />
        </div>

        {/* Lab workflow diagram */}
        <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 pt-2 border-t border-slate-800">
          <span className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300">Doctor Orders Test</span>
          <span>→</span>
          <span className="px-2 py-1 rounded-lg bg-sky-500/10 text-sky-300">Invoice Generated</span>
          <span>→</span>
          <span className={`px-2 py-1 rounded-lg ${enforceLabGate ? "bg-rose-500/10 text-rose-300" : "bg-slate-800 text-slate-400 line-through"}`}>
            {enforceLabGate ? "🔒 Payment Required" : "Gate Skipped"}
          </span>
          <span>→</span>
          <span className={`px-2 py-1 rounded-lg ${autoNotifyLab ? "bg-emerald-500/10 text-emerald-300" : "bg-slate-800 text-slate-400 line-through"}`}>
            {autoNotifyLab ? "🔔 Lab Notified" : "No Notification"}
          </span>
          <span>→</span>
          <span className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300">Specimen Collected</span>
          <span>→</span>
          <span className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300">Results Ready</span>
        </div>
      </div>

      {/* ── Pharmacy Payment Gate ─────────────────────────────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
        <div>
          <h2 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
            <Pill className="w-4 h-4 text-cyan-400" />
            Pharmacy Dispensing Payment Gate
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Controls whether prescriptions must be paid before the pharmacist can dispense medications.
          </p>
        </div>
        <div className="space-y-3">
          <ToggleRow
            label="Enforce Pharmacy Payment Gate"
            desc="When ON, prescriptions remain in 'Pending Payment' status. Pharmacist dispensing is blocked until invoice payment is confirmed."
            value={enforcePharmacyGate}
            onChange={setEnforcePharmacyGate}
            icon={Lock}
            iconColor="text-cyan-400"
          />
          <ToggleRow
            label="Auto-Notify Pharmacists on Payment"
            desc="When a pharmacy invoice is paid, all pharmacists receive an instant notification with the authorized prescription list."
            value={autoNotifyPharmacy}
            onChange={setAutoNotifyPharmacy}
            icon={Bell}
            iconColor="text-cyan-400"
          />
        </div>

        {/* Pharmacy workflow diagram */}
        <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 pt-2 border-t border-slate-800">
          <span className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300">Doctor Signs Rx</span>
          <span>→</span>
          <span className="px-2 py-1 rounded-lg bg-cyan-500/10 text-cyan-300">Quote & Invoice</span>
          <span>→</span>
          <span className={`px-2 py-1 rounded-lg ${enforcePharmacyGate ? "bg-rose-500/10 text-rose-300" : "bg-slate-800 text-slate-400 line-through"}`}>
            {enforcePharmacyGate ? "🔒 Payment Required" : "Gate Skipped"}
          </span>
          <span>→</span>
          <span className={`px-2 py-1 rounded-lg ${autoNotifyPharmacy ? "bg-emerald-500/10 text-emerald-300" : "bg-slate-800 text-slate-400 line-through"}`}>
            {autoNotifyPharmacy ? "🔔 Pharmacist Notified" : "No Notification"}
          </span>
          <span>→</span>
          <span className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300">Dispensed to Patient</span>
        </div>
      </div>

      {/* ── Role-Based Permissions Summary ───────────────────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
        <div>
          <h2 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" />
            Role-Based Payment Permissions
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Defines which roles can waive fees, trigger emergency overrides, or collect cash.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              label: "Fee Waiver Authority",
              roles: ["system_admin", "tenant_admin"],
              color: "text-rose-300",
              bg: "bg-rose-500/10 border-rose-500/20",
              icon: "🔓",
            },
            {
              label: "Emergency Override",
              roles: ["system_admin", "tenant_admin", "physician"],
              color: "text-amber-300",
              bg: "bg-amber-500/10 border-amber-500/20",
              icon: "⚡",
            },
            {
              label: "Cash Collection",
              roles: ["system_admin", "tenant_admin", "pharmacist", "nurse", "cashier"],
              color: "text-emerald-300",
              bg: "bg-emerald-500/10 border-emerald-500/20",
              icon: "💵",
            },
          ].map(({ label, roles, color, bg, icon }) => (
            <div key={label} className={`p-4 rounded-2xl border ${bg} space-y-2`}>
              <div className="flex items-center gap-2">
                <span>{icon}</span>
                <span className={`text-xs font-bold ${color}`}>{label}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {roles.map((r) => (
                  <span
                    key={r}
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700"
                  >
                    {r.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-slate-500 italic">
          Role permission sets are managed here for reference. To change them, update the system configuration or contact NiniMed support.
        </p>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Admin Workflows", href: "/admin/workflows", icon: ClipboardList, color: "text-teal-400" },
          { label: "Admin Pricing", href: "/admin/pricing", icon: CreditCard, color: "text-emerald-400" },
          { label: "Pharmacy Workstation", href: "/pharmacy", icon: Pill, color: "text-cyan-400" },
          { label: "Lab Workstation", href: "/biologist", icon: FlaskConical, color: "text-sky-400" },
        ].map(({ label, href, icon: Icon, color }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-2 p-3 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 transition-all text-xs font-bold text-slate-400 hover:text-white"
          >
            <Icon className={`w-4 h-4 ${color}`} />
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
