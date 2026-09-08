"use client";

import React, { useState, useEffect } from "react";
import {
  Wallet,
  Receipt,
  Plus,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  DollarSign,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  QrCode,
  ShieldCheck,
  Building2,
  Smartphone,
  Banknote,
} from "lucide-react";

interface ChargeItem {
  id: string;
  serviceCode: string;
  description: string;
  amountEtb: number;
  department: string;
  orderId?: string;
  chargedAt: string;
}

interface StatementData {
  tabId: string;
  encounterId: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  depositAmountEtb: number;
  depositMethod: string;
  depositTxRef?: string;
  totalChargesEtb: number;
  balanceDueEtb: number;
  refundDueEtb: number;
  status: "active" | "settled" | "refunded";
  chargesList: ChargeItem[];
  settledAt?: string;
  settledBy?: string;
  settlementNotes?: string;
  recommendation: "issue_refund" | "collect_balance" | "exact_settlement";
}

interface Props {
  encounterId?: string;
  patientId?: string;
  patientName?: string;
  onSettled?: () => void;
}

export default function EncounterTabCard({ encounterId, patientId, patientName, onSettled }: Props) {
  const [statement, setStatement] = useState<StatementData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSettling, setIsSettling] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [showCharges, setShowCharges] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settleMethod, setSettleMethod] = useState("telebirr");
  const [settleNotes, setSettleNotes] = useState("");
  const [notification, setNotification] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const fetchTab = async () => {
    if (!encounterId && !patientId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const q = encounterId ? `encounterId=${encounterId}` : `patientId=${patientId}`;
      const res = await fetch(`/api/v1/billing/encounter-tab?${q}`);
      const data = await res.json();
      if (data.success && data.data) {
        setStatement(data.data);
      } else {
        setStatement(null);
      }
    } catch {
      setStatement(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (encounterId || patientId) fetchTab();
  }, [encounterId, patientId]);

  const handleOpenTab = async () => {
    if (!patientId) return;
    setIsOpening(true);
    try {
      const res = await fetch("/api/v1/billing/encounter-tab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          encounterId: encounterId || undefined,
          depositAmountEtb: 2500,
          depositMethod: "telebirr",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNotification({ type: "success", msg: "Encounter Tab opened with ETB 2,500 deposit." });
        fetchTab();
      } else {
        throw new Error(data.error || "Failed to open tab");
      }
    } catch (e: any) {
      setNotification({ type: "error", msg: e.message || "Failed to open tab" });
    } finally {
      setIsOpening(false);
    }
  };

  const handleSettle = async () => {
    const targetEncounterId = statement?.encounterId || encounterId;
    if (!targetEncounterId) return;
    setIsSettling(true);
    try {
      const res = await fetch("/api/v1/billing/encounter-tab", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          encounterId: targetEncounterId,
          finalPaymentMethod: settleMethod,
          finalTxRef: `FIN-${settleMethod.toUpperCase()}-${Date.now()}`,
          settlementNotes: settleNotes || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setNotification({
          type: "success",
          msg: statement?.refundDueEtb
            ? `Refund of ETB ${statement.refundDueEtb.toLocaleString()} recorded.`
            : "Encounter Tab discharge balance settled.",
        });
        setShowSettleModal(false);
        fetchTab();
        onSettled?.();
      } else {
        throw new Error(data.error || "Failed to settle tab");
      }
    } catch (e: any) {
      setNotification({ type: "error", msg: e.message || "Failed to settle tab" });
    } finally {
      setIsSettling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center gap-2 text-xs text-slate-400">
        <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
        Loading Encounter Tab balance...
      </div>
    );
  }

  if (!statement) {
    return (
      <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-slate-500" />
          <span>No active Encounter Tab for {patientName || "patient"}. Standard per-order gating applies.</span>
        </div>
        {patientId && (
          <button
            onClick={handleOpenTab}
            disabled={isOpening}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs transition shrink-0"
          >
            {isOpening ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Open Tab (Deposit)
          </button>
        )}
      </div>
    );
  }

  const isRefund = statement.refundDueEtb > 0;
  const isBalanceDue = statement.balanceDueEtb > 0;
  const isSettled = statement.status !== "active";

  return (
    <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl shadow-slate-950/40">
      {/* Toast */}
      {notification && (
        <div
          className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
            notification.type === "success"
              ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-300"
              : "bg-rose-950/80 border-rose-500/40 text-rose-300"
          }`}
        >
          {notification.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {notification.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/25 flex items-center justify-center text-teal-400">
            <Wallet className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-white">Unified Encounter Tab</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isSettled
                    ? "bg-slate-800 text-slate-400 border border-slate-700"
                    : "bg-teal-500/15 text-teal-300 border border-teal-500/30"
                }`}
              >
                {statement.status.toUpperCase()}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Deposit: <strong className="text-slate-200">ETB {statement.depositAmountEtb.toLocaleString()}</strong> ({statement.depositMethod.toUpperCase()})
            </p>
          </div>
        </div>

        <button
          onClick={fetchTab}
          className="p-1.5 rounded-lg border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-colors"
          title="Refresh Tab"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Balance Highlight Banner */}
      <div
        className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          isSettled
            ? "bg-slate-950 border-slate-800"
            : isRefund
            ? "bg-emerald-950/40 border-emerald-500/30"
            : isBalanceDue
            ? "bg-amber-950/40 border-amber-500/30"
            : "bg-teal-950/40 border-teal-500/30"
        }`}
      >
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
            {isSettled
              ? "Encounter Tab Settled"
              : isRefund
              ? "🎉 Discharge Surplus — Refund Due to Patient"
              : isBalanceDue
              ? "⚠️ Out-of-Pocket Balance Due from Patient"
              : "✅ Exact Settlement"}
          </span>
          <div className="text-xl font-extrabold text-white mt-0.5 font-mono">
            ETB{" "}
            {isRefund
              ? statement.refundDueEtb.toLocaleString()
              : isBalanceDue
              ? statement.balanceDueEtb.toLocaleString()
              : "0.00"}
          </div>
          <span className="text-[11px] text-slate-400">
            Total Charges Incurred: ETB {statement.totalChargesEtb.toLocaleString()} ({statement.chargesList.length} orders)
          </span>
        </div>

        {!isSettled && (
          <button
            onClick={() => setShowSettleModal(true)}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-md ${
              isRefund
                ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-950/40"
                : "bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-teal-950/40"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            {isRefund ? "Process Refund & Discharge" : "Collect Balance & Settle"}
          </button>
        )}
      </div>

      {/* Itemized Charges Toggle */}
      <div>
        <button
          onClick={() => setShowCharges(!showCharges)}
          className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-white py-1 transition-colors"
        >
          <span>Itemized Encounter Charges ({statement.chargesList.length})</span>
          {showCharges ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showCharges && (
          <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {statement.chargesList.length === 0 ? (
              <div className="p-3 text-[11px] text-slate-500 text-center">No charges logged yet.</div>
            ) : (
              statement.chargesList.map((chg) => (
                <div
                  key={chg.id}
                  className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-200 block">{chg.description}</span>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                      {chg.department} · {new Date(chg.chargedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-teal-300">ETB {chg.amountEtb.toLocaleString()}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Settlement Modal */}
      {showSettleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-white">
                {isRefund ? "Process Patient Refund" : "Settle Remaining Balance"}
              </h3>
              <button
                onClick={() => setShowSettleModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Initial Deposit:</span>
                <span className="font-mono text-white">ETB {statement.depositAmountEtb.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>Total Clinical Charges:</span>
                <span className="font-mono text-white">ETB {statement.totalChargesEtb.toLocaleString()}</span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between text-sm font-extrabold">
                <span className={isRefund ? "text-emerald-400" : "text-amber-400"}>
                  {isRefund ? "Refund Due:" : "Balance Due:"}
                </span>
                <span className="font-mono text-white">
                  ETB {isRefund ? statement.refundDueEtb.toLocaleString() : statement.balanceDueEtb.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 block">
                {isRefund ? "Disbursement Method" : "Settlement Payment Method"}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "telebirr", label: "Telebirr" },
                  { id: "cbe_birr", label: "CBE Birr" },
                  { id: "cash", label: "Cash Payout" },
                  { id: "chapa_card", label: "Card / Digital" },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSettleMethod(m.id)}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-colors ${
                      settleMethod === m.id
                        ? "border-teal-500 bg-teal-500/15 text-teal-300"
                        : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300 block">Settlement Notes (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Cashier receipt #1042, Telebirr txn ref"
                value={settleNotes}
                onChange={(e) => setSettleNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowSettleModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-800 text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSettle}
                disabled={isSettling}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 ${
                  isRefund
                    ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                    : "bg-teal-500 hover:bg-teal-400 text-slate-950"
                } disabled:opacity-50`}
              >
                {isSettling ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                {isRefund ? "Confirm Refund Payout" : "Confirm Balance Payment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
