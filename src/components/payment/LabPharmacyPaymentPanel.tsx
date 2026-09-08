"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  FlaskConical,
  Pill,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ReceiptText,
  Bell,
  Zap,
  ShieldCheck,
  X,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  ArrowRight,
  Banknote,
  Smartphone,
  Building2,
  Wallet,
  QrCode,
  Check,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface LabTestEntry {
  testName: string;
  priority?: "routine" | "urgent" | "stat";
  clinicalReason?: string;
}

interface MedicationEntry {
  medicationName: string;
  dosage: string;
  frequency: string;
  quantity: number;
  durationDays: number;
  route?: string;
  instructions?: string;
}

interface QuoteLineItem {
  serviceCode: string;
  description: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  category: "laboratory" | "pharmacy";
}

interface QuoteResult {
  invoiceId: string;
  invoiceNumber: string;
  patientName: string;
  patientMrn: string;
  items: QuoteLineItem[];
  subtotalEtb: number;
  discountEtb: number;
  discountReason: string;
  totalAmountEtb: number;
  currency: string;
  status: string;
}

interface Props {
  patientId: string;
  patientName: string;
  patientMrn: string;
  department: "laboratory" | "pharmacy" | "combined";
  doctorId?: string;
  encounterId?: string;
  /** Pre-loaded items from a clinical order */
  prefillLabTests?: LabTestEntry[];
  prefillMedications?: MedicationEntry[];
  onPaymentComplete?: (invoiceId: string, transactionRef: string) => void;
  onClose?: () => void;
}

// ─── Payment Method Config ────────────────────────────────────────────────────

const PAYMENT_METHODS = [
  { id: "cash", label: "Cash", icon: Banknote, color: "text-emerald-400" },
  { id: "telebirr", label: "TeleBirr", icon: Smartphone, color: "text-purple-400" },
  { id: "cbe_birr", label: "CBE Birr", icon: Building2, color: "text-blue-400" },
  { id: "awash", label: "Awash Bank", icon: Building2, color: "text-orange-400" },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LabPharmacyPaymentPanel({
  patientId,
  patientName,
  patientMrn,
  department,
  doctorId,
  encounterId,
  prefillLabTests = [],
  prefillMedications = [],
  onPaymentComplete,
  onClose,
}: Props) {
  const [step, setStep] = useState<"compose" | "quote" | "pay" | "done">("compose");

  // Encounter Tab state
  const [activeTab, setActiveTab] = useState<{
    id: string;
    depositAmountEtb: number;
    runningTotalEtb: number;
    balanceDueEtb: number;
    status: string;
  } | null>(null);
  const [useEncounterTab, setUseEncounterTab] = useState(false);
  const [isLoadingTab, setIsLoadingTab] = useState(false);

  // PoC QR state
  const [pocQr, setPocQr] = useState<{
    qrCodeDataUrl: string;
    provider: string;
    accountReference: string;
    amount: number;
    instructions: string;
  } | null>(null);
  const [isLoadingQr, setIsLoadingQr] = useState(false);

  // Compose step
  const [labTests, setLabTests] = useState<LabTestEntry[]>(
    prefillLabTests.length > 0
      ? prefillLabTests
      : department !== "pharmacy"
      ? [{ testName: "", priority: "routine", clinicalReason: "" }]
      : []
  );
  const [medications, setMedications] = useState<MedicationEntry[]>(
    prefillMedications.length > 0
      ? prefillMedications
      : department !== "laboratory"
      ? [{ medicationName: "", dosage: "", frequency: "Once daily", quantity: 30, durationDays: 30, route: "Oral", instructions: "" }]
      : []
  );

  // Quote result
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [isQuoting, setIsQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // Payment step
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [transactionRef, setTransactionRef] = useState("");
  const [isPaying, setIsPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  // Done
  const [finalRef, setFinalRef] = useState("");
  const [notified, setNotified] = useState(0);

  // Check for active Encounter Tab
  useEffect(() => {
    async function checkTab() {
      if (!encounterId && !patientId) return;
      setIsLoadingTab(true);
      try {
        const query = encounterId ? `encounterId=${encounterId}` : `patientId=${patientId}`;
        const res = await fetch(`/api/v1/billing/encounter-tab?${query}`);
        const data = await res.json();
        if (data.success && data.tab && data.tab.status === "active") {
          setActiveTab(data.tab);
          setUseEncounterTab(true); // Default to active encounter tab if available!
        }
      } catch (err) {
        console.error("Failed to fetch encounter tab:", err);
      } finally {
        setIsLoadingTab(false);
      }
    }
    checkTab();
  }, [encounterId, patientId]);

  // Fetch Point-of-Care QR code when in pay step with mobile payment
  useEffect(() => {
    async function fetchQr() {
      if (step !== "pay" || !quote || (paymentMethod !== "telebirr" && paymentMethod !== "cbe_birr") || useEncounterTab) {
        setPocQr(null);
        return;
      }
      setIsLoadingQr(true);
      try {
        const res = await fetch(
          `/api/v1/payments/poc-qr?provider=${paymentMethod}&amount=${quote.totalAmountEtb}&patientMrn=${patientMrn}&orderId=${quote.invoiceId}&department=${department}`
        );
        const data = await res.json();
        if (data.success && data.data) {
          setPocQr(data.data);
        }
      } catch (err) {
        console.error("Failed to fetch PoC QR:", err);
      } finally {
        setIsLoadingQr(false);
      }
    }
    fetchQr();
  }, [step, quote, paymentMethod, patientMrn, department, useEncounterTab]);

  // ── Compose Helpers ──────────────────────────────────────────────────────

  const addLabTest = () =>
    setLabTests((prev) => [...prev, { testName: "", priority: "routine", clinicalReason: "" }]);

  const updateLabTest = (idx: number, field: keyof LabTestEntry, value: string) =>
    setLabTests((prev) => prev.map((t, i) => (i === idx ? { ...t, [field]: value } : t)));

  const removeLabTest = (idx: number) => setLabTests((prev) => prev.filter((_, i) => i !== idx));

  const addMedication = () =>
    setMedications((prev) => [
      ...prev,
      { medicationName: "", dosage: "", frequency: "Once daily", quantity: 30, durationDays: 30, route: "Oral", instructions: "" },
    ]);

  const updateMedication = (idx: number, field: keyof MedicationEntry, value: string | number) =>
    setMedications((prev) => prev.map((m, i) => (i === idx ? { ...m, [field]: value } : m)));

  const removeMedication = (idx: number) => setMedications((prev) => prev.filter((_, i) => i !== idx));

  // ── Generate Quote ────────────────────────────────────────────────────────

  const handleGenerateQuote = async () => {
    setIsQuoting(true);
    setQuoteError(null);

    const validLab = labTests.filter((t) => t.testName.trim().length > 0);
    const validMed = medications.filter((m) => m.medicationName.trim().length > 0);

    if (validLab.length === 0 && validMed.length === 0) {
      setQuoteError("Please add at least one lab test or medication.");
      setIsQuoting(false);
      return;
    }

    try {
      const res = await fetch("/api/v1/billing/quote-and-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          department,
          labTests: validLab,
          medications: validMed,
          doctorId,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Quote generation failed");
      setQuote(data.data);
      setStep("quote");
    } catch (e: any) {
      setQuoteError(e.message || "Failed to generate quote");
    } finally {
      setIsQuoting(false);
    }
  };

  // ── Process Payment ───────────────────────────────────────────────────────

  const handlePay = async () => {
    if (!quote) return;
    setIsPaying(true);
    setPayError(null);

    try {
      const selectedMethod = useEncounterTab ? "encounter_tab" : paymentMethod;
      const res = await fetch("/api/v1/billing/pay-and-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: quote.invoiceId,
          paymentMethod: selectedMethod,
          transactionRef: useEncounterTab
            ? `TAB-CHG-${quote.invoiceNumber}`
            : (transactionRef.trim() || undefined),
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Payment failed");

      setFinalRef(data.data.transactionRef);
      setNotified(data.data.notificationsDispatched || 0);
      setStep("done");
      onPaymentComplete?.(quote.invoiceId, data.data.transactionRef);
    } catch (e: any) {
      setPayError(e.message || "Payment processing failed");
    } finally {
      setIsPaying(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  const deptLabel =
    department === "laboratory" ? "Laboratory" : department === "pharmacy" ? "Pharmacy" : "Lab & Pharmacy";

  const deptColor =
    department === "laboratory"
      ? "from-sky-900/40 to-slate-900"
      : department === "pharmacy"
      ? "from-cyan-900/40 to-slate-900"
      : "from-teal-900/40 to-slate-900";

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl w-full max-w-3xl mx-auto">
      {/* Header */}
      <div className={`p-5 bg-gradient-to-r ${deptColor} border-b border-slate-800 flex items-center justify-between gap-4`}>
        <div className="flex items-center gap-3">
          {department === "laboratory" || department === "combined" ? (
            <FlaskConical className="w-5 h-5 text-sky-400 shrink-0" />
          ) : null}
          {department === "pharmacy" || department === "combined" ? (
            <Pill className="w-5 h-5 text-cyan-400 shrink-0" />
          ) : null}
          <div>
            <h2 className="text-sm font-extrabold text-white uppercase tracking-wider">
              {deptLabel} Payment & Dispensing
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {patientName} · MRN: {patientMrn}
            </p>
          </div>
        </div>
        {/* Step indicator */}
        <div className="flex items-center gap-1.5 text-[10px] font-bold">
          {["compose", "quote", "pay", "done"].map((s, i) => (
            <React.Fragment key={s}>
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                  step === s
                    ? "bg-teal-500 text-slate-950 border-teal-400"
                    : ["compose", "quote", "pay", "done"].indexOf(step) > i
                    ? "bg-slate-700 text-emerald-400 border-slate-600"
                    : "bg-slate-900 text-slate-600 border-slate-800"
                }`}
              >
                {i + 1}
              </span>
              {i < 3 && <span className="w-4 h-px bg-slate-700" />}
            </React.Fragment>
          ))}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-auto p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── STEP 1: COMPOSE ORDER ────────────────────────────────────────── */}
      {step === "compose" && (
        <div className="p-6 space-y-6 animate-fade-in">
          {/* Lab Tests */}
          {(department === "laboratory" || department === "combined") && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-2">
                  <FlaskConical className="w-3.5 h-3.5" /> Laboratory Tests
                </h3>
                <button
                  onClick={addLabTest}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 hover:bg-sky-500/20 text-[10px] font-bold transition-colors"
                >
                  <Plus className="w-3 h-3" /> Add Test
                </button>
              </div>
              {labTests.map((t, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <input
                    className="col-span-5 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                    placeholder="e.g. HbA1c, CBC, Renal Panel"
                    value={t.testName}
                    onChange={(e) => updateLabTest(i, "testName", e.target.value)}
                  />
                  <select
                    className="col-span-3 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                    value={t.priority || "routine"}
                    onChange={(e) => updateLabTest(i, "priority", e.target.value)}
                  >
                    <option value="routine">Routine</option>
                    <option value="urgent">Urgent</option>
                    <option value="stat">STAT</option>
                  </select>
                  <input
                    className="col-span-3 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                    placeholder="Clinical reason"
                    value={t.clinicalReason || ""}
                    onChange={(e) => updateLabTest(i, "clinicalReason", e.target.value)}
                  />
                  <button onClick={() => removeLabTest(i)} className="col-span-1 flex justify-center text-slate-600 hover:text-rose-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Medications */}
          {(department === "pharmacy" || department === "combined") && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                  <Pill className="w-3.5 h-3.5" /> Medications
                </h3>
                <button
                  onClick={addMedication}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 text-[10px] font-bold transition-colors"
                >
                  <Plus className="w-3 h-3" /> Add Medication
                </button>
              </div>
              {medications.map((m, i) => (
                <div key={i} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      placeholder="Medication name (e.g. Metformin)"
                      value={m.medicationName}
                      onChange={(e) => updateMedication(i, "medicationName", e.target.value)}
                    />
                    <input
                      className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      placeholder="Dosage (e.g. 500mg)"
                      value={m.dosage}
                      onChange={(e) => updateMedication(i, "dosage", e.target.value)}
                    />
                    <input
                      className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      placeholder="Frequency"
                      value={m.frequency}
                      onChange={(e) => updateMedication(i, "frequency", e.target.value)}
                    />
                    <div className="flex gap-2">
                      <input
                        type="number"
                        className="w-1/2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                        placeholder="Qty"
                        value={m.quantity}
                        onChange={(e) => updateMedication(i, "quantity", Number(e.target.value))}
                      />
                      <input
                        type="number"
                        className="w-1/2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                        placeholder="Days"
                        value={m.durationDays}
                        onChange={(e) => updateMedication(i, "durationDays", Number(e.target.value))}
                      />
                    </div>
                  </div>
                  <input
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    placeholder="Patient instructions (optional)"
                    value={m.instructions || ""}
                    onChange={(e) => updateMedication(i, "instructions", e.target.value)}
                  />
                  <div className="flex justify-end">
                    <button onClick={() => removeMedication(i)} className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-rose-400 transition-colors">
                      <Trash2 className="w-3 h-3" /> Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {quoteError && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {quoteError}
            </div>
          )}

          <button
            onClick={handleGenerateQuote}
            disabled={isQuoting}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-bold text-sm transition-all shadow-lg shadow-teal-900/30 disabled:opacity-60"
          >
            {isQuoting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            {isQuoting ? "Generating Price Quote..." : "Generate Dynamic Price Quote"}
            {!isQuoting && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      )}

      {/* ── STEP 2: REVIEW QUOTE ─────────────────────────────────────────── */}
      {step === "quote" && quote && (
        <div className="p-6 space-y-5 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider">Itemized Quote</span>
              <h3 className="text-sm font-extrabold text-white mt-0.5">{quote.invoiceNumber}</h3>
            </div>
            {quote.status === "paid" && (
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                FREE / WAIVED
              </span>
            )}
          </div>

          {/* Line Items Table */}
          <div className="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="border-b border-slate-800">
                <tr className="text-slate-400 uppercase text-[10px] font-bold">
                  <th className="py-2.5 px-4">Service</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Unit Price</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {quote.items.map((item, i) => (
                  <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-black ${item.category === "laboratory" ? "bg-sky-500/20 text-sky-400" : "bg-cyan-500/20 text-cyan-400"}`}>
                          {item.category === "laboratory" ? "🧪" : "💊"}
                        </span>
                        <div>
                          <span className="text-white font-medium block leading-tight">{item.description}</span>
                          <span className="text-slate-500 text-[10px] font-mono">{item.serviceCode}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center text-slate-300">{item.quantity}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-300">
                      {item.unitPrice.toFixed(2)} <span className="text-slate-500">ETB</span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-white">
                      {item.totalPrice.toFixed(2)} <span className="text-slate-400 font-normal">ETB</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-4 space-y-2">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Subtotal</span>
              <span className="font-mono">{Number(quote.subtotalEtb).toFixed(2)} ETB</span>
            </div>
            {quote.discountEtb > 0 && (
              <div className="flex justify-between text-xs text-emerald-400">
                <span>Discount</span>
                <span className="font-mono">-{Number(quote.discountEtb).toFixed(2)} ETB</span>
              </div>
            )}
            {quote.discountReason && (
              <p className="text-[10px] text-emerald-500/80 italic">{quote.discountReason}</p>
            )}
            <div className="flex justify-between items-center pt-2 border-t border-slate-800">
              <span className="text-sm font-bold text-white">Total Payable</span>
              <span className="text-xl font-extrabold text-teal-400 font-mono">
                {Number(quote.totalAmountEtb).toFixed(2)}
                <span className="text-xs text-slate-400 font-normal ml-1">Birr</span>
              </span>
            </div>
          </div>

          {quote.status === "paid" ? (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              Services are waived/free. Lab and pharmacy will be notified automatically.
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => setStep("compose")}
                className="flex-1 py-2.5 rounded-2xl border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 text-xs font-bold transition-colors"
              >
                ← Edit Order
              </button>
              <button
                onClick={() => setStep("pay")}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-sm transition-all shadow-lg shadow-teal-900/30"
              >
                <CreditCard className="w-4 h-4" />
                Proceed to Payment
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 3: PAYMENT ──────────────────────────────────────────────── */}
      {step === "pay" && quote && (
        <div className="p-6 space-y-5 animate-fade-in">
          <div>
            <h3 className="text-sm font-extrabold text-white">Collect Payment</h3>
            <p className="text-xs text-slate-400 mt-0.5">Total due: <strong className="text-teal-400 font-mono text-lg">{Number(quote.totalAmountEtb).toFixed(2)} Birr</strong></p>
          </div>

          {/* Encounter Tab Detection Banner */}
          {activeTab && (
            <div
              onClick={() => setUseEncounterTab(!useEncounterTab)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                useEncounterTab
                  ? "bg-teal-950/40 border-teal-500 ring-1 ring-teal-500/50"
                  : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${useEncounterTab ? "bg-teal-500 text-slate-950" : "bg-slate-800 text-teal-400"}`}>
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">Charge to Unified Encounter Tab</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">Active Tab</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Deposit: <strong className="text-emerald-400">{Number(activeTab.depositAmountEtb).toLocaleString()} ETB</strong> · Current Balance: <strong className="text-white">{Number(activeTab.balanceDueEtb).toLocaleString()} ETB</strong>
                    </p>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${useEncounterTab ? "bg-teal-500 border-teal-400 text-slate-950" : "border-slate-700 bg-slate-800"}`}>
                  {useEncounterTab && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>
              {useEncounterTab && (
                <p className="mt-2.5 pt-2.5 border-t border-teal-800/40 text-[11px] text-teal-200">
                  ⚡ Order will be instantly approved and auto-charged against the patient's registration deposit. Settlement occurs at discharge.
                </p>
              )}
            </div>
          )}

          {/* Payment Method Selector (hidden if using active Encounter Tab) */}
          {!useEncounterTab && (
            <>
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Point-of-Care Payment Method</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PAYMENT_METHODS.map(({ id, label, icon: Icon, color }) => (
                    <button
                      key={id}
                      onClick={() => setPaymentMethod(id)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-xs font-bold transition-all ${
                        paymentMethod === id
                          ? "border-teal-500 bg-teal-500/10 text-white"
                          : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-white"
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${paymentMethod === id ? "text-teal-400" : color}`} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Point of Care Dynamic QR Display */}
              {pocQr && (paymentMethod === "telebirr" || paymentMethod === "cbe_birr") && (
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center gap-4 animate-fade-in">
                  <div className="bg-white p-2 rounded-xl shadow-lg shrink-0">
                    <img
                      src={pocQr.qrCodeDataUrl}
                      alt="Payment QR"
                      className="w-28 h-28 object-contain"
                    />
                  </div>
                  <div className="space-y-1.5 text-center sm:text-left flex-1">
                    <div className="flex items-center gap-2 justify-center sm:justify-start">
                      <QrCode className="w-4 h-4 text-teal-400" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        Point-of-Care Scan & Pay
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Patient scans with <strong>{pocQr.provider.toUpperCase()} App</strong> at the counter to pay directly.
                    </p>
                    <p className="text-[10px] font-mono text-slate-400">
                      Account: <span className="text-teal-300 font-semibold">{pocQr.accountReference}</span>
                    </p>
                    <p className="text-[10px] text-emerald-400 italic">
                      {pocQr.instructions}
                    </p>
                  </div>
                </div>
              )}

              {/* Reference number (optional for cash) */}
              {paymentMethod !== "cash" && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Transaction Reference Number
                  </label>
                  <input
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 font-mono"
                    placeholder={`${paymentMethod.toUpperCase()} Ref # (e.g. TB-2026-XXXXXX)`}
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                  />
                </div>
              )}
            </>
          )}

          {/* Auto-notify info */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <Bell className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-blue-200">
              On confirmation, <strong>lab technicians</strong>{department !== "laboratory" ? " and <strong>pharmacists</strong>" : ""} will be automatically notified to commence processing immediately.
            </p>
          </div>

          {payError && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {payError}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep("quote")}
              className="flex-1 py-2.5 rounded-2xl border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 text-xs font-bold transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={handlePay}
              disabled={isPaying}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm transition-all shadow-lg shadow-emerald-900/30 disabled:opacity-60"
            >
              {isPaying ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              {isPaying
                ? "Processing..."
                : useEncounterTab
                ? `Approve & Charge ${Number(quote.totalAmountEtb).toFixed(2)} Birr to Tab`
                : `Confirm Payment of ${Number(quote.totalAmountEtb).toFixed(2)} Birr`}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: SUCCESS ───────────────────────────────────────────────── */}
      {step === "done" && (
        <div className="p-8 flex flex-col items-center text-center gap-5 animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-extrabold text-white">Payment Confirmed!</h3>
            <p className="text-sm text-slate-400">
              Transaction Reference: <span className="font-mono text-teal-400">{finalRef}</span>
            </p>
          </div>

          <div className="w-full flex flex-col sm:flex-row gap-3">
            <div className="flex-1 p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center gap-3">
              <FlaskConical className="w-5 h-5 text-sky-400 shrink-0" />
              <div className="text-left">
                <span className="text-[10px] text-sky-400 font-bold uppercase block">Lab</span>
                <span className="text-xs text-white">Notified & processing started</span>
              </div>
            </div>
            {(department === "pharmacy" || department === "combined") && (
              <div className="flex-1 p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center gap-3">
                <Pill className="w-5 h-5 text-cyan-400 shrink-0" />
                <div className="text-left">
                  <span className="text-[10px] text-cyan-400 font-bold uppercase block">Pharmacy</span>
                  <span className="text-xs text-white">Ready to dispense</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Bell className="w-3.5 h-3.5 text-teal-400" />
            <span><strong className="text-white">{notified}</strong> staff member{notified !== 1 ? "s" : ""} notified automatically.</span>
          </div>

          <div className="flex gap-3 w-full pt-2">
            <button
              onClick={() => {
                setStep("compose");
                setQuote(null);
                setFinalRef("");
                setTransactionRef("");
              }}
              className="flex-1 py-2.5 rounded-2xl border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 text-xs font-bold transition-colors"
            >
              New Order
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
