"use client";

import React, { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Search, Receipt, CreditCard, Banknote, ShieldCheck, CheckCircle2,
  XCircle, Plus, Minus, Trash2, Zap, AlertCircle,
  User, Phone, Hash, Package, FlaskConical, Pill, Stethoscope,
  Printer, RefreshCw, Edit2, Percent, Timer, BarChart3,
  ChevronRight, QrCode, Play, Square, Download, Loader2,
  ArrowRight, Bell, Clock,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────
type SourceType = "prescription" | "lab_order" | "consultation" | "manual";
type Category = "pharmacy" | "lab" | "consultation" | "radiology" | "procedure";

type CartItem = {
  sourceType: SourceType;
  sourceId: string | null;
  description: string;
  category: Category;
  unitPrice: number;
  quantity: number;
  discount: number;
};

type Patient = {
  id: string;
  fullName: string;
  mrn: string;
  phone: string;
  dateOfBirth: string;
  sex: string;
};

type PendingSummary = {
  prescriptionCount: number;
  labCount: number;
  totalPending: number;
};

type ShiftInfo = {
  id: string;
  cashierId: string;
  terminalId: string;
  openedAt: string;
  openingFloat: string;
  expectedCash: string;
  totalCashSales: string;
  totalTelebirrSales: string;
  totalCardSales: string;
  totalInsuranceSales: string;
  totalTransactions: number;
  status: string;
};

type ReceiptData = {
  transactionId: string;
  receiptNumber: string;
  invoiceNumber: string;
  totalAmount: string;
  changeReturned: string;
  qrPayload: string;
  prescriptionsCleared: number;
  labOrdersCleared: number;
};

const MANUAL_SERVICES = [
  { description: "General Practitioner Consultation", category: "consultation" as Category, unitPrice: 1200 },
  { description: "Specialist Consultation", category: "consultation" as Category, unitPrice: 2800 },
  { description: "Emergency Triage & Assessment", category: "consultation" as Category, unitPrice: 2500 },
  { description: "Wound Dressing & Care", category: "procedure" as Category, unitPrice: 800 },
  { description: "IV Cannulation & Infusion", category: "procedure" as Category, unitPrice: 650 },
  { description: "ECG (12-Lead)", category: "procedure" as Category, unitPrice: 1200 },
  { description: "Chest X-Ray (PA View)", category: "radiology" as Category, unitPrice: 1800 },
  { description: "Abdominal Ultrasound", category: "radiology" as Category, unitPrice: 3200 },
];

const CATEGORY_ICON: Record<Category | string, React.ReactNode> = {
  pharmacy: <Pill size={13} className="text-rose-400" />,
  lab: <FlaskConical size={13} className="text-amber-400" />,
  consultation: <Stethoscope size={13} className="text-blue-400" />,
  radiology: <BarChart3 size={13} className="text-violet-400" />,
  procedure: <Plus size={13} className="text-teal-400" />,
};

const CATEGORY_COLOR: Record<Category | string, string> = {
  pharmacy: "bg-rose-500/10 border-rose-500/20 text-rose-300",
  lab: "bg-amber-500/10 border-amber-500/20 text-amber-300",
  consultation: "bg-blue-500/10 border-blue-500/20 text-blue-300",
  radiology: "bg-violet-500/10 border-violet-500/20 text-violet-300",
  procedure: "bg-teal-500/10 border-teal-500/20 text-teal-300",
};

function fmt(n: number) { return `ETB ${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`; }

// ─── Main POS Component ────────────────────────────────────────────────────────
function SmartPOSContent() {
  const searchParams = useSearchParams();
  const urlPatientId = searchParams.get("patientId");
  const urlOrderId = searchParams.get("orderId");
  const [highlightedOrderId, setHighlightedOrderId] = useState<string | null>(null);
  const [urlLoaded, setUrlLoaded] = useState(false);

  // Shift
  const [shift, setShift] = useState<ShiftInfo | null>(null);
  const [openingFloat, setOpeningFloat] = useState("1000");
  const [shiftLoading, setShiftLoading] = useState(true);

  // Patient
  const [patientSearch, setPatientSearch] = useState("");
  const [patientResults, setPatientResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [pendingSummary, setPendingSummary] = useState<PendingSummary | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // Auto-load patient and pending orders from referral URL params
  useEffect(() => {
    if (urlPatientId && !urlLoaded) {
      setUrlLoaded(true);
      if (urlOrderId) setHighlightedOrderId(urlOrderId);
      (async () => {
        setSearchLoading(true);
        try {
          const res = await fetch(`/api/v1/billing/pos/pending-items?patientId=${urlPatientId}`);
          const data = await res.json();
          if (data.success && data.data) {
            if (data.data.patient) setSelectedPatient(data.data.patient);
            if (data.data.summary) setPendingSummary(data.data.summary);
            if (data.data.pendingItems) {
              const newItems: CartItem[] = data.data.pendingItems.map((item: any) => ({
                ...item,
                quantity: item.quantity ?? 1,
                discount: 0,
              }));
              setCart(newItems);
            }
          }
        } catch (e) {
          console.error("Error auto-loading referral patient items:", e);
        } finally {
          setSearchLoading(false);
        }
      })();
    }
  }, [urlPatientId, urlOrderId, urlLoaded]);

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountPct, setDiscountPct] = useState(0);
  const [taxRate] = useState(0); // VAT-exempt by default
  const [showManualAdd, setShowManualAdd] = useState(false);

  // Payment
  const [showPayModal, setShowPayModal] = useState(false);
  const [payMethod, setPayMethod] = useState<"cash" | "telebirr" | "cbe_birr" | "card" | "insurance" | "split">("cash");
  const [cashTendered, setCashTendered] = useState("");
  const [split, setSplit] = useState({ cash: "0", telebirr: "0", cbe_birr: "0", card: "0", insurance: "0" });
  const [transactionRef, setTransactionRef] = useState("");
  const [processing, setProcessing] = useState(false);

  // Receipt
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  // Z-Report
  const [showZReport, setShowZReport] = useState(false);
  const [zReportData, setZReportData] = useState<Record<string, unknown> | null>(null);

  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const MOCK_CASHIER_ID = "00000000-0000-0000-0000-000000000099"; // Would come from auth

  // ─── Load active shift ──────────────────────────────────────────────────────
  const loadShift = useCallback(async () => {
    setShiftLoading(true);
    try {
      const res = await fetch(`/api/v1/billing/pos/shifts?view=active&cashierId=${MOCK_CASHIER_ID}`);
      const data = await res.json();
      if (data.success && data.data.length > 0) setShift(data.data[0]);
    } catch (e) { console.error(e); }
    setShiftLoading(false);
  }, []);

  useEffect(() => { loadShift(); }, [loadShift]);

  // ─── Patient search ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    if (!patientSearch.trim()) { setPatientResults([]); return; }
    searchRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`/api/v1/billing/pos/pending-items?search=${encodeURIComponent(patientSearch)}`);
        const data = await res.json();
        if (data.success) setPatientResults(data.data);
      } catch (e) { console.error(e); }
      setSearchLoading(false);
    }, 400);
  }, [patientSearch]);

  // ─── Load pending items for selected patient ────────────────────────────────
  const loadPendingItems = async (patient: Patient) => {
    setSelectedPatient(patient);
    setPatientSearch("");
    setPatientResults([]);
    try {
      const res = await fetch(`/api/v1/billing/pos/pending-items?patientId=${patient.id}`);
      const data = await res.json();
      if (data.success) {
        setPendingSummary(data.data.summary);
        // Auto-load pending items into cart
        const newItems: CartItem[] = (data.data.pendingItems ?? []).map((item: CartItem) => ({
          ...item,
          quantity: item.quantity ?? 1,
          discount: 0,
        }));
        setCart(newItems);
      }
    } catch (e) { console.error(e); }
  };

  // ─── Cart helpers ───────────────────────────────────────────────────────────
  const addManualItem = (svc: typeof MANUAL_SERVICES[0]) => {
    setCart(c => [...c, {
      sourceType: "manual",
      sourceId: null,
      description: svc.description,
      category: svc.category,
      unitPrice: svc.unitPrice,
      quantity: 1,
      discount: 0,
    }]);
    setShowManualAdd(false);
  };

  const updateQty = (idx: number, delta: number) => {
    setCart(c => c.map((item, i) => i === idx ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item));
  };

  const removeItem = (idx: number) => setCart(c => c.filter((_, i) => i !== idx));

  // ─── Totals ─────────────────────────────────────────────────────────────────
  const subtotal = cart.reduce((s, i) => s + i.unitPrice * i.quantity * (1 - i.discount / 100), 0);
  const discountAmt = subtotal * (discountPct / 100);
  const taxAmt = (subtotal - discountAmt) * (taxRate / 100);
  const total = subtotal - discountAmt + taxAmt;
  const change = payMethod === "cash" && cashTendered ? Math.max(0, parseFloat(cashTendered) - total) : 0;

  // ─── Checkout ───────────────────────────────────────────────────────────────
  const handleCheckout = async () => {
    if (!selectedPatient || cart.length === 0) return;
    setProcessing(true);
    try {
      const body = {
        patientId: selectedPatient.id,
        cashierId: MOCK_CASHIER_ID,
        shiftId: shift?.id ?? null,
        cartItems: cart,
        paymentMethod: payMethod,
        paymentBreakdown: payMethod === "split" ? split : { [payMethod]: total.toFixed(2) },
        cashTendered: payMethod === "cash" ? cashTendered : null,
        discountAmount: discountAmt.toFixed(2),
        taxRate: taxRate.toString(),
        transactionRef: transactionRef || null,
      };
      const res = await fetch("/api/v1/billing/pos/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setReceipt(data.data);
        setShowPayModal(false);
        setShowReceipt(true);
        setCart([]);
        setSelectedPatient(null);
        setPendingSummary(null);
        loadShift();
      } else {
        alert("Checkout error: " + data.error);
      }
    } catch (e) { console.error(e); alert("Network error"); }
    setProcessing(false);
  };

  // ─── Shift management ───────────────────────────────────────────────────────
  const openShift = async () => {
    const res = await fetch("/api/v1/billing/pos/shifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "open_shift", cashierId: MOCK_CASHIER_ID, openingFloat }),
    });
    const data = await res.json();
    if (data.success) setShift(data.data);
  };

  const closeShift = async () => {
    if (!shift) return;
    const actual = prompt("Enter actual cash in drawer (ETB):");
    if (!actual) return;
    const res = await fetch("/api/v1/billing/pos/shifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "close_shift", shiftId: shift.id, actualCash: actual }),
    });
    const data = await res.json();
    if (data.success) { setShift(null); alert("Shift closed. Cash variance: ETB " + data.data.cashVariance); }
  };

  const loadZReport = async () => {
    if (!shift) return;
    const res = await fetch(`/api/v1/billing/pos/shifts?view=z_report&shiftId=${shift.id}`);
    const data = await res.json();
    if (data.success) { setZReportData(data.data); setShowZReport(true); }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex flex-col">
      {/* Top Bar */}
      <div className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-20 px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0">
            <Receipt size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-none">Smart POS Terminal</h1>
            <p className="text-xs text-slate-500 mt-0.5">Dynamic billing & automated checkout</p>
          </div>
        </div>

        {/* Shift indicator */}
        <div className="flex items-center gap-3">
          {shift ? (
            <>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-400 font-medium">Shift Open</span>
                <span className="text-slate-500">·</span>
                <span className="text-slate-400">{shift.terminalId}</span>
                <span className="text-slate-500">·</span>
                <span className="text-slate-400">{shift.totalTransactions} txns</span>
              </div>
              <button onClick={loadZReport} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 transition">
                <BarChart3 size={12} /> Z-Report
              </button>
              <button onClick={closeShift} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 transition">
                <Square size={12} /> Close Shift
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="number"
                className="w-28 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                value={openingFloat}
                onChange={e => setOpeningFloat(e.target.value)}
                placeholder="Opening float"
              />
              <button onClick={openShift} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white font-medium transition">
                <Play size={12} /> Open Shift
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ─── LEFT: Patient + Items ─────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-slate-800">
          {/* Patient search */}
          <div className="p-4 border-b border-slate-800">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              {searchLoading && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 animate-spin" />}
              <input
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-9 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                placeholder="Search patient by name, MRN, or phone…"
                value={patientSearch}
                onChange={e => setPatientSearch(e.target.value)}
              />
            </div>

            {/* Search results dropdown */}
            {patientResults.length > 0 && (
              <div className="mt-2 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl">
                {patientResults.map(p => (
                  <button key={p.id} onClick={() => loadPendingItems(p)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-700 transition text-left border-b border-slate-700 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-slate-300 text-sm font-bold">
                        {p.fullName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">{p.fullName}</p>
                        <p className="text-slate-500 text-xs">{p.mrn} · {p.sex} · {p.phone}</p>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-slate-500" />
                  </button>
                ))}
              </div>
            )}

            {/* Selected patient banner */}
            {selectedPatient && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-base">
                      {selectedPatient.fullName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-emerald-300 font-semibold text-sm">{selectedPatient.fullName}</p>
                      <p className="text-emerald-600 text-xs">{selectedPatient.mrn} · {selectedPatient.sex} · {selectedPatient.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {pendingSummary && pendingSummary.totalPending > 0 && (
                      <div className="text-right">
                        <p className="text-xs text-emerald-600">Auto-loaded pending</p>
                        <p className="text-emerald-400 text-xs font-medium">
                          {pendingSummary.prescriptionCount} Rx + {pendingSummary.labCount} Labs = {fmt(pendingSummary.totalPending)}
                        </p>
                      </div>
                    )}
                    <button onClick={() => { setSelectedPatient(null); setCart([]); setPendingSummary(null); setHighlightedOrderId(null); }}
                      className="text-slate-500 hover:text-slate-300 transition">
                      <XCircle size={16} />
                    </button>
                  </div>
                </div>

                {/* Direct Referral Order Alert Banner */}
                {highlightedOrderId && (
                  <div className="flex items-center justify-between bg-gradient-to-r from-emerald-950/80 via-teal-950/60 to-slate-900 border border-emerald-500/50 rounded-xl px-4 py-2.5 shadow-lg shadow-emerald-950/50">
                    <div className="flex items-center gap-2.5">
                      <Zap className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" />
                      <div>
                        <span className="text-xs font-bold text-emerald-300">Targeted Order Referral: </span>
                        <span className="text-xs text-slate-300">
                          Diagnostic Lab Order <span className="font-mono text-emerald-300 font-semibold">{highlightedOrderId.slice(0, 8)}...</span> automatically queued for cashier checkout.
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowPayModal(true)}
                      className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs transition shrink-0 shadow"
                    >
                      Quick Settle
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-3">
                <Receipt size={40} className="opacity-30" />
                <p className="text-sm">Search for a patient or add items manually</p>
                {selectedPatient && pendingSummary?.totalPending === 0 && (
                  <p className="text-xs text-emerald-600">✓ No pending charges for this patient</p>
                )}
              </div>
            ) : (
              cart.map((item, idx) => {
                const isReferred = Boolean(item.sourceId && item.sourceId === highlightedOrderId);
                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      isReferred
                        ? "border-emerald-400 bg-emerald-950/30 ring-2 ring-emerald-500/50 shadow-lg shadow-emerald-500/10"
                        : CATEGORY_COLOR[item.category] ?? CATEGORY_COLOR.procedure
                    }`}
                  >
                    <div className="shrink-0">{CATEGORY_ICON[item.category]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white text-sm font-medium truncate">{item.description}</p>
                        {isReferred && (
                          <span className="text-[10px] bg-emerald-500/25 text-emerald-300 border border-emerald-500/50 px-2 py-0.5 rounded-full font-bold">
                            🎯 Referral Order
                          </span>
                        )}
                      </div>
                      <p className="text-xs opacity-60 mt-0.5">
                        {fmt(item.unitPrice)} × {item.quantity}
                        {item.sourceType !== "manual" && <span className="ml-2 opacity-50">· from {item.sourceType}</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => updateQty(idx, -1)} className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 transition">
                        <Minus size={12} />
                      </button>
                      <span className="text-white text-sm font-medium w-5 text-center">{item.quantity}</span>
                      <button onClick={() => updateQty(idx, 1)} className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 transition">
                        <Plus size={12} />
                      </button>
                      <span className="text-white text-sm font-semibold w-24 text-right">{fmt(item.unitPrice * item.quantity)}</span>
                      <button onClick={() => removeItem(idx)} className="text-slate-600 hover:text-red-400 transition ml-1">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Manual add */}
          <div className="border-t border-slate-800 p-4">
            <button onClick={() => setShowManualAdd(!showManualAdd)}
              className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 transition">
              <Plus size={13} /> Add service manually
            </button>
            {showManualAdd && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {MANUAL_SERVICES.map((svc, i) => (
                  <button key={i} onClick={() => addManualItem(svc)}
                    className="text-left p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition">
                    <div className="flex items-center gap-2 mb-1">
                      {CATEGORY_ICON[svc.category]}
                      <span className="text-xs text-slate-500 capitalize">{svc.category}</span>
                    </div>
                    <p className="text-white text-xs font-medium leading-tight">{svc.description}</p>
                    <p className="text-slate-400 text-xs mt-1">{fmt(svc.unitPrice)}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ─── RIGHT: Totals + Payment ────────────────────────────────────────── */}
        <div className="w-80 flex flex-col border-l border-slate-800 bg-slate-900">
          <div className="p-5 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              <h2 className="text-white font-semibold text-base">Order Summary</h2>

              {/* Discount */}
              <div className="flex items-center gap-2">
                <Percent size={14} className="text-slate-500" />
                <label className="text-xs text-slate-400 flex-1">Discount (%)</label>
                <input
                  type="number" min="0" max="100"
                  className="w-16 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white text-right focus:outline-none focus:border-emerald-500"
                  value={discountPct}
                  onChange={e => setDiscountPct(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                />
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal ({cart.length} items)</span>
                  <span>{fmt(subtotal)}</span>
                </div>
                {discountAmt > 0 && (
                  <div className="flex justify-between text-amber-400">
                    <span>Discount ({discountPct}%)</span>
                    <span>− {fmt(discountAmt)}</span>
                  </div>
                )}
                {taxAmt > 0 && (
                  <div className="flex justify-between text-slate-400">
                    <span>VAT ({taxRate}%)</span>
                    <span>{fmt(taxAmt)}</span>
                  </div>
                )}
                <div className="pt-3 border-t border-slate-800 flex justify-between text-white font-bold text-lg">
                  <span>Total</span>
                  <span>{fmt(total)}</span>
                </div>
              </div>
            </div>

            {/* Payment methods */}
            <div className="mt-6 space-y-3">
              <p className="text-xs text-slate-400 font-medium">Payment Method</p>
              <div className="grid grid-cols-2 gap-2">
                {(["cash", "telebirr", "cbe_birr", "card", "insurance", "split"] as const).map(m => (
                  <button key={m}
                    onClick={() => setPayMethod(m)}
                    className={`py-2 rounded-xl border text-xs font-medium capitalize transition ${payMethod === m ? "bg-emerald-600 border-emerald-500 text-white" : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500"}`}>
                    {m === "telebirr" ? "Telebirr" : m === "cbe_birr" ? "CBE Birr" : m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>

              {payMethod === "cash" && (
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Cash Tendered</label>
                  <input
                    type="number"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    value={cashTendered}
                    onChange={e => setCashTendered(e.target.value)}
                    placeholder={`Min ${total.toFixed(2)}`}
                  />
                  {cashTendered && parseFloat(cashTendered) >= total && (
                    <p className="text-emerald-400 text-xs mt-1">Change: {fmt(change)}</p>
                  )}
                </div>
              )}

              {payMethod === "split" && (
                <div className="space-y-2">
                  {(["cash", "telebirr", "card", "insurance"] as const).map(m => (
                    <div key={m} className="flex items-center gap-2">
                      <label className="text-xs text-slate-400 capitalize w-20 shrink-0">{m}</label>
                      <input
                        type="number"
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
                        value={split[m]}
                        onChange={e => setSplit(s => ({ ...s, [m]: e.target.value }))}
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>
              )}

              {(payMethod === "telebirr" || payMethod === "card") && (
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Transaction Reference</label>
                  <input
                    type="text"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    value={transactionRef}
                    onChange={e => setTransactionRef(e.target.value)}
                    placeholder="e.g. TXN-12345678"
                  />
                </div>
              )}

              <button
                onClick={() => setShowPayModal(true)}
                disabled={cart.length === 0 || !selectedPatient || !shift || (payMethod === "cash" && !!cashTendered && parseFloat(cashTendered) < total)}
                className="w-full mt-2 flex items-center justify-center gap-2 py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-white font-semibold text-sm transition"
              >
                <Zap size={16} /> Process Payment · {fmt(total)}
              </button>
              {!shift && <p className="text-center text-xs text-amber-500">Open a cashier shift to enable checkout</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Confirmation Modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-6">
            <h2 className="text-white font-bold text-lg mb-4 text-center">Confirm Payment</h2>
            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-sm text-slate-400"><span>Patient</span><span className="text-white">{selectedPatient?.fullName}</span></div>
              <div className="flex justify-between text-sm text-slate-400"><span>Method</span><span className="text-white capitalize">{payMethod}</span></div>
              <div className="flex justify-between text-sm text-slate-400"><span>Items</span><span className="text-white">{cart.length}</span></div>
              <div className="pt-3 border-t border-slate-800 flex justify-between text-white font-bold text-xl">
                <span>Total</span><span>{fmt(total)}</span>
              </div>
              {payMethod === "cash" && cashTendered && (
                <div className="flex justify-between text-emerald-400 text-sm font-medium">
                  <span>Change</span><span>{fmt(change)}</span>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowPayModal(false)} disabled={processing}
                className="flex-1 py-3 border border-slate-700 rounded-xl text-slate-400 hover:text-slate-200 transition text-sm">Cancel</button>
              <button onClick={handleCheckout} disabled={processing}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-xl text-white font-semibold text-sm transition">
                {processing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                {processing ? "Processing…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && receipt && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl w-full max-w-sm p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 size={32} className="text-emerald-400" />
              </div>
              <h2 className="text-white font-bold text-lg">Payment Successful</h2>
              <p className="text-slate-400 text-sm">Pharmacy queue advanced · Prescriptions cleared</p>
            </div>
            <div className="bg-slate-800 rounded-xl p-4 space-y-2 text-sm mb-5">
              <div className="flex justify-between text-slate-400"><span>Receipt #</span><span className="text-white font-mono text-xs">{receipt.receiptNumber}</span></div>
              <div className="flex justify-between text-slate-400"><span>Invoice #</span><span className="text-white font-mono text-xs">{receipt.invoiceNumber}</span></div>
              <div className="flex justify-between text-slate-400"><span>Amount Paid</span><span className="text-emerald-400 font-bold">{fmt(parseFloat(receipt.totalAmount))}</span></div>
              {parseFloat(receipt.changeReturned) > 0 && (
                <div className="flex justify-between text-slate-400"><span>Change Given</span><span className="text-amber-400 font-medium">{fmt(parseFloat(receipt.changeReturned))}</span></div>
              )}
              <div className="pt-2 border-t border-slate-700 space-y-1 text-xs text-slate-500">
                <div className="flex justify-between"><span>Rx Cleared</span><span className="text-emerald-400">{receipt.prescriptionsCleared}</span></div>
                <div className="flex justify-between"><span>Labs Cleared</span><span className="text-emerald-400">{receipt.labOrdersCleared}</span></div>
              </div>
            </div>
            {/* QR placeholder */}
            <div className="flex items-center justify-center bg-white rounded-xl p-4 mb-5">
              <div className="text-slate-900 text-center">
                <QrCode size={60} />
                <p className="text-xs mt-2 font-mono">{receipt.receiptNumber}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => window.print()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-slate-700 hover:border-slate-500 rounded-xl text-slate-400 hover:text-slate-200 text-sm transition">
                <Printer size={14} /> Print
              </button>
              <button onClick={() => setShowReceipt(false)}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white font-medium text-sm transition">
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Z-Report Modal */}
      {showZReport && zReportData && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-bold text-lg">Z-Report</h2>
              <button onClick={() => setShowZReport(false)} className="text-slate-500 hover:text-slate-300"><XCircle size={18} /></button>
            </div>
            {(() => {
              const summary = (zReportData as { summary?: Record<string, unknown> }).summary ?? {};
              const byMethod = (summary.byMethod as Record<string, number>) ?? {};
              return (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Total Transactions", value: String(summary.totalTransactions ?? 0), color: "text-white" },
                      { label: "Total Revenue", value: fmt(Number(summary.totalRevenue ?? 0)), color: "text-emerald-400" },
                      { label: "Cash Sales", value: fmt(byMethod.cash ?? 0), color: "text-amber-400" },
                      { label: "Telebirr", value: fmt(byMethod.telebirr ?? 0), color: "text-violet-400" },
                      { label: "Card", value: fmt(byMethod.card ?? 0), color: "text-blue-400" },
                      { label: "Insurance", value: fmt(byMethod.insurance ?? 0), color: "text-teal-400" },
                    ].map(item => (
                      <div key={item.label} className="bg-slate-800 rounded-xl p-3">
                        <p className="text-slate-500 text-xs mb-1">{item.label}</p>
                        <p className={`font-bold text-base ${item.color}`}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setShowZReport(false)} className="w-full mt-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 text-sm transition">
                    Close
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SmartPOSPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          <p className="text-sm font-medium text-slate-300">Loading Smart POS Terminal...</p>
        </div>
      }
    >
      <SmartPOSContent />
    </Suspense>
  );
}
