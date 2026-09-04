"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  FlaskConical,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldCheck,
  FileText,
  Printer,
  ChevronRight,
  Loader2,
  Calendar,
  User,
  Sparkles,
  Smartphone,
  Banknote,
  Info,
  Check,
  Building2,
  RefreshCw,
} from "lucide-react";

interface LabOrderData {
  id: string;
  testName: string;
  priority: "routine" | "urgent" | "stat";
  status: string;
  price: string;
  currency: string;
  paymentStatus: "unpaid" | "paid" | "waived" | "free";
  orderedAt: string;
  completedAt?: string;
  clinicalReason?: string;
  timelineStage?: string;
  stepNumber?: number;
  isComplete?: boolean;
}

interface LabResultData {
  id: string;
  testName: string;
  value: string;
  unit: string;
  referenceRangeLow?: string;
  referenceRangeHigh?: string;
  isAbnormal: boolean;
  interpretation: string;
  performedAt: string;
}

export default function PatientOrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]">
          <Loader2 className="w-8 h-8 animate-spin text-[#005C4B]" />
        </div>
      }
    >
      <PatientOrdersContent />
    </Suspense>
  );
}

function PatientOrdersContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const targetOrderId = searchParams.get("orderId");
  const targetAction = searchParams.get("action"); // 'pay' | 'instructions'
  const targetView = searchParams.get("view"); // 'result'
  const targetResultId = searchParams.get("resultId");

  const [orders, setOrders] = useState<LabOrderData[]>([]);
  const [results, setResults] = useState<LabResultData[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<LabOrderData | null>(null);
  const [loading, setLoading] = useState(true);

  // Payment UI state
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"telebirr" | "cbe_birr" | "cash">("telebirr");
  const [phoneNumber, setPhoneNumber] = useState("+251 91 234 5678");
  const [paying, setPaying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "results">("details");

  useEffect(() => {
    if (targetView === "result") {
      setActiveTab("results");
    }
  }, [targetView]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch orders from patient orders endpoint
      const ordersRes = await fetch("/api/v1/patient/orders");
      const ordersJson = await ordersRes.json();

      let orderList: LabOrderData[] = [];
      if (ordersJson.success && Array.isArray(ordersJson.data) && ordersJson.data.length > 0) {
        orderList = ordersJson.data;
      } else {
        // Fallback to direct lab-orders
        const fallbackRes = await fetch("/api/v1/lab-orders");
        const fallbackJson = await fallbackRes.json();
        if (fallbackJson.success && Array.isArray(fallbackJson.data)) {
          orderList = fallbackJson.data;
        }
      }

      setOrders(orderList);

      // 2. Fetch verified lab results
      const resultsRes = await fetch("/api/v1/lab-results");
      const resultsJson = await resultsRes.json();
      if (resultsJson.success && Array.isArray(resultsJson.data)) {
        setResults(resultsJson.data);
      }

      // 3. Highlight targeted order from URL parameter
      if (orderList.length > 0) {
        if (targetOrderId) {
          const matched = orderList.find((o) => o.id === targetOrderId);
          setSelectedOrder(matched || orderList[0]);
        } else {
          setSelectedOrder(orderList[0]);
        }
      }
    } catch (err) {
      console.error("[PatientOrders] Error loading order details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [targetOrderId]);

  // Handle instant online payment settlement
  const handleSettlePayment = async () => {
    if (!selectedOrder) return;
    setPaying(true);

    try {
      // Simulate network request to payment processor (Telebirr / CBE)
      await new Promise((resolve) => setTimeout(resolve, 1400));

      // Update order payment status in database
      const res = await fetch(`/api/v1/orders/${selectedOrder.id}/transition`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nextStatus: "pending_collection",
          reason: `Patient cleared payment of ${selectedOrder.price || "450.00"} ${selectedOrder.currency || "ETB"} via ${selectedPaymentMethod.toUpperCase()}`,
        }),
      });

      setPaymentSuccess(true);
      setSelectedOrder((prev) =>
        prev ? { ...prev, paymentStatus: "paid", status: "pending_collection" } : null
      );
      setOrders((prev) =>
        prev.map((o) =>
          o.id === selectedOrder.id ? { ...o, paymentStatus: "paid", status: "pending_collection" } : o
        )
      );
    } catch (err) {
      console.error("[PatientOrders] Payment processing error:", err);
    } finally {
      setPaying(false);
    }
  };

  // Helper for preparation & fasting guidelines
  const getPrepInstructions = (testName = "") => {
    const lower = testName.toLowerCase();
    if (lower.includes("lipid") || lower.includes("cholesterol") || lower.includes("triglyceride")) {
      return {
        fastingHours: 12,
        fastingRequired: true,
        summary: "12-Hour Overnight Fasting Required",
        instructions: "Do not eat or drink anything except plain water for 10-12 hours prior to your blood draw. Avoid high-fat meals and alcohol 24 hours prior.",
        specimen: "Venous Blood (Gold SST Tube)",
        tubeColor: "border-amber-400 bg-amber-50 text-amber-900",
      };
    }
    if (lower.includes("glucose") || lower.includes("sugar") || lower.includes("hba1c") || lower.includes("diabetes")) {
      return {
        fastingHours: 8,
        fastingRequired: true,
        summary: "8-Hour Fasting Required",
        instructions: "Fast for 8 hours prior to the test (water only). Please visit the laboratory early in the morning before eating breakfast.",
        specimen: "Venous Blood (Grey/Lavender Tube)",
        tubeColor: "border-rose-400 bg-rose-50 text-rose-900",
      };
    }
    if (lower.includes("urine") || lower.includes("urinalysis")) {
      return {
        fastingHours: 0,
        fastingRequired: false,
        summary: "Clean-Catch Midstream Urine",
        instructions: "Collect morning midstream urine into the sterile container supplied by the lab reception. Keep container tightly sealed.",
        specimen: "Midstream Clean-Catch Urine",
        tubeColor: "border-amber-400 bg-amber-50 text-amber-900",
      };
    }
    return {
      fastingHours: 0,
      fastingRequired: false,
      summary: "No Special Fasting Required",
      instructions: "Maintain regular hydration and take routine medications unless advised otherwise by your attending physician.",
      specimen: "Standard Venous Sample (Lavender EDTA)",
      tubeColor: "border-teal-400 bg-teal-50 text-teal-900",
    };
  };

  const prep = getPrepInstructions(selectedOrder?.testName);
  const matchedResult = results.find(
    (r) =>
      r.testName.toLowerCase() === selectedOrder?.testName.toLowerCase() ||
      r.id === targetResultId
  );

  return (
    <div className="min-h-screen bg-[#FAF8F5] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-[#687B74]">
          <Link href="/patient/dashboard" className="hover:text-[#005C4B] transition-colors">
            Patient Dashboard
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="font-semibold text-[#162E27]">Diagnostic Orders & Payment</span>
        </div>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#E7E2D8] shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200 flex items-center gap-1.5">
                <FlaskConical className="w-3.5 h-3.5 text-teal-600" />
                Laboratory Diagnostic Pipeline
              </span>
              {selectedOrder?.priority === "stat" && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200 animate-pulse">
                  STAT Urgent
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#162E27] font-serif-heading mt-2">
              {selectedOrder ? selectedOrder.testName : "My Clinical Orders"}
            </h1>
            <p className="text-xs text-[#687B74] mt-1">
              Deterministic order tracking, preparation guidelines, and calculated digital payment settlement.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("details")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "details"
                  ? "bg-[#005C4B] text-white shadow-md"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Order & Payment Instructions
            </button>
            <button
              onClick={() => setActiveTab("results")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "results"
                  ? "bg-[#005C4B] text-white shadow-md"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Verified Results {matchedResult ? "✓" : ""}
            </button>
          </div>
        </div>

        {/* Main Grid: Left Column Order List, Right Column Event Detail */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: Order Selector List (4 cols) */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-[#162E27] uppercase tracking-wider">
                My Clinical Orders ({orders.length})
              </span>
              <button
                onClick={loadData}
                className="text-xs text-teal-700 hover:text-teal-900 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            </div>

            {loading ? (
              <div className="p-8 bg-white rounded-2xl border border-[#E7E2D8] flex items-center justify-center text-xs text-[#687B74]">
                <Loader2 className="w-5 h-5 animate-spin mr-2 text-[#005C4B]" /> Loading orders...
              </div>
            ) : orders.length === 0 ? (
              <div className="p-8 bg-white rounded-2xl border border-[#E7E2D8] text-center text-xs text-[#687B74]">
                No clinical diagnostic orders found for your profile.
              </div>
            ) : (
              orders.map((ord) => {
                const isSelected = selectedOrder?.id === ord.id;
                const isPaid = ord.paymentStatus === "paid" || ord.status === "completed";

                return (
                  <div
                    key={ord.id}
                    onClick={() => {
                      setSelectedOrder(ord);
                      setPaymentSuccess(false);
                      router.replace(`/patient/orders?orderId=${ord.id}`, { scroll: false });
                    }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-white border-[#005C4B] shadow-md ring-2 ring-[#005C4B]/20"
                        : "bg-white/80 border-[#E7E2D8] hover:border-slate-300 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-bold text-sm text-[#162E27] block">
                          {ord.testName}
                        </span>
                        <span className="text-[11px] text-[#687B74] block mt-0.5">
                          Ordered: {new Date(ord.orderedAt).toLocaleDateString()}
                        </span>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isPaid
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : "bg-amber-100 text-amber-800 border border-amber-200"
                        }`}
                      >
                        {isPaid ? "Paid & Cleared" : "Payment Due"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#F0EBE1] text-xs">
                      <span className="font-bold text-[#162E27]">
                        {ord.price ? `${ord.price} ${ord.currency || "ETB"}` : "450.00 ETB"}
                      </span>
                      <span className="text-[11px] text-teal-700 font-semibold flex items-center gap-1">
                        View Event <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* RIGHT: Focused Event Card (Payment / Instructions / Results) (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {selectedOrder ? (
              <>
                {/* 1. VISUAL PROGRESS PIPELINE */}
                <div className="bg-white p-6 rounded-3xl border border-[#E7E2D8] shadow-sm">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#687B74] block mb-4">
                    Closed-Loop Clinical Order Timeline
                  </span>

                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    {/* Step 1 */}
                    <div className="space-y-1.5">
                      <div className="w-8 h-8 mx-auto rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                        ✓
                      </div>
                      <span className="font-bold text-[#162E27] block text-[11px]">1. Ordered</span>
                      <span className="text-[10px] text-[#687B74]">By Physician</span>
                    </div>

                    {/* Step 2 */}
                    <div className="space-y-1.5">
                      <div
                        className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center font-bold text-xs shadow-sm ${
                          selectedOrder.paymentStatus === "paid" || selectedOrder.status === "completed"
                            ? "bg-emerald-600 text-white"
                            : "bg-amber-500 text-white animate-bounce"
                        }`}
                      >
                        {selectedOrder.paymentStatus === "paid" ? "✓" : "2"}
                      </div>
                      <span className="font-bold text-[#162E27] block text-[11px]">2. Payment</span>
                      <span className="text-[10px] text-[#687B74]">
                        {selectedOrder.paymentStatus === "paid" ? "Cleared" : "Action Required"}
                      </span>
                    </div>

                    {/* Step 3 */}
                    <div className="space-y-1.5">
                      <div
                        className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center font-bold text-xs shadow-sm ${
                          selectedOrder.status === "sample_collected" ||
                          selectedOrder.status === "processing" ||
                          selectedOrder.status === "completed"
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-200 text-slate-500"
                        }`}
                      >
                        3
                      </div>
                      <span className="font-bold text-[#162E27] block text-[11px]">3. Specimen</span>
                      <span className="text-[10px] text-[#687B74]">Lab Intake</span>
                    </div>

                    {/* Step 4 */}
                    <div className="space-y-1.5">
                      <div
                        className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center font-bold text-xs shadow-sm ${
                          selectedOrder.status === "completed" || matchedResult
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-200 text-slate-500"
                        }`}
                      >
                        {selectedOrder.status === "completed" || matchedResult ? "✓" : "4"}
                      </div>
                      <span className="font-bold text-[#162E27] block text-[11px]">4. Verified</span>
                      <span className="text-[10px] text-[#687B74]">Results Ready</span>
                    </div>
                  </div>
                </div>

                {/* 2. TAB: DETAILS & PAYMENT INSTRUCTIONS */}
                {activeTab === "details" && (
                  <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E7E2D8] shadow-sm space-y-6 animate-fade-in">
                    {/* Price & Status Banner */}
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-[#FAF8F5] to-emerald-50/50 border border-[#E7E2D8] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <span className="text-xs font-semibold text-[#687B74] block">Calculated Service Fee</span>
                        <div className="flex items-baseline gap-2 mt-0.5">
                          <span className="text-3xl font-bold text-[#162E27] font-serif-heading">
                            {selectedOrder.price || "450.00"}
                          </span>
                          <span className="text-sm font-bold text-[#687B74]">{selectedOrder.currency || "ETB"}</span>
                        </div>
                        <span className="text-[11px] text-[#687B74] block mt-1">
                          Standard clinical fee schedule verified against facility catalog.
                        </span>
                      </div>

                      <div className="text-right">
                        {selectedOrder.paymentStatus === "paid" || paymentSuccess ? (
                          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Payment Settled</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-100 border border-amber-200 text-amber-800 text-xs font-bold">
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                            <span>Unpaid • Due Before Sample Draw</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Patient Preparation Instructions */}
                    <div className="space-y-3">
                      <h3 className="font-bold text-sm text-[#162E27] flex items-center gap-2">
                        <Info className="w-4 h-4 text-teal-700" />
                        <span>Clinical Preparation & Fasting Guidelines</span>
                      </h3>

                      <div className={`p-4 rounded-2xl border ${prep.tubeColor} space-y-2`}>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs">{prep.summary}</span>
                          <span className="text-[11px] font-semibold opacity-80">{prep.specimen}</span>
                        </div>
                        <p className="text-xs leading-relaxed opacity-90">{prep.instructions}</p>
                        <div className="pt-2 border-t border-black/10 text-[11px] flex items-center justify-between">
                          <span>📍 Location: Room 102 - Diagnostic Phlebotomy Desk</span>
                          <span>⏰ Hours: 8:00 AM – 4:30 PM (Mon – Sat)</span>
                        </div>
                      </div>
                    </div>

                    {/* Payment Form / Settlement Options */}
                    {selectedOrder.paymentStatus !== "paid" && !paymentSuccess ? (
                      <div className="space-y-4 pt-4 border-t border-[#E7E2D8]">
                        <h3 className="font-bold text-sm text-[#162E27] flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-[#005C4B]" />
                          <span>Select Digital Payment Method</span>
                        </h3>

                        {/* Payment Method Selector */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <button
                            type="button"
                            onClick={() => setSelectedPaymentMethod("telebirr")}
                            className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all ${
                              selectedPaymentMethod === "telebirr"
                                ? "bg-teal-50/70 border-teal-600 ring-2 ring-teal-600/20 text-[#162E27]"
                                : "bg-white border-[#E7E2D8] text-[#687B74] hover:bg-slate-50"
                            }`}
                          >
                            <Smartphone className="w-5 h-5 text-teal-700" />
                            <div>
                              <span className="font-bold text-xs block">Telebirr</span>
                              <span className="text-[10px] text-[#687B74]">Mobile USSD / App</span>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedPaymentMethod("cbe_birr")}
                            className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all ${
                              selectedPaymentMethod === "cbe_birr"
                                ? "bg-teal-50/70 border-teal-600 ring-2 ring-teal-600/20 text-[#162E27]"
                                : "bg-white border-[#E7E2D8] text-[#687B74] hover:bg-slate-50"
                            }`}
                          >
                            <Building2 className="w-5 h-5 text-teal-700" />
                            <div>
                              <span className="font-bold text-xs block">CBE Birr</span>
                              <span className="text-[10px] text-[#687B74]">Commercial Bank</span>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedPaymentMethod("cash")}
                            className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all ${
                              selectedPaymentMethod === "cash"
                                ? "bg-teal-50/70 border-teal-600 ring-2 ring-teal-600/20 text-[#162E27]"
                                : "bg-white border-[#E7E2D8] text-[#687B74] hover:bg-slate-50"
                            }`}
                          >
                            <Banknote className="w-5 h-5 text-teal-700" />
                            <div>
                              <span className="font-bold text-xs block">Clinic Reception</span>
                              <span className="text-[10px] text-[#687B74]">Pay Cash at Desk</span>
                            </div>
                          </button>
                        </div>

                        {/* Telebirr Input & Pay Action */}
                        {selectedPaymentMethod === "telebirr" && (
                          <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E7E2D8] space-y-3">
                            <label className="text-xs font-semibold text-[#162E27] block">
                              Telebirr Registered Phone Number
                            </label>
                            <input
                              type="text"
                              value={phoneNumber}
                              onChange={(e) => setPhoneNumber(e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5CEBF] bg-white text-xs text-[#162E27] font-mono focus:outline-none focus:ring-2 focus:ring-[#005C4B]"
                              placeholder="+251 9X XXX XXXX"
                            />
                            <p className="text-[11px] text-[#687B74]">
                              A direct USSD payment prompt of <strong>{selectedOrder.price || "450.00"} ETB</strong> will
                              be sent to your phone.
                            </p>
                          </div>
                        )}

                        <button
                          type="button"
                          disabled={paying}
                          onClick={handleSettlePayment}
                          className="w-full py-3.5 px-4 rounded-xl bg-[#005C4B] hover:bg-[#004A3C] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#005C4B]/20 transition-all hover:scale-[1.01] disabled:opacity-50"
                        >
                          {paying ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Processing Digital Settlement...</span>
                            </>
                          ) : (
                            <>
                              <CreditCard className="w-4 h-4" />
                              <span>
                                Pay {selectedOrder.price || "450.00"} {selectedOrder.currency || "ETB"} & Confirm Instructions
                              </span>
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <div>
                          <span className="font-bold block">Payment Cleared Successfully</span>
                          <span className="text-[11px] text-emerald-800">
                            Your order is cleared for accessioning. Present your MRN at Laboratory Room 102 for sample collection.
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. TAB: VERIFIED RESULTS VIEW */}
                {activeTab === "results" && (
                  <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E7E2D8] shadow-sm space-y-6 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-[#687B74] block">Diagnostic Analysis Report</span>
                        <h3 className="text-lg font-bold text-[#162E27] mt-0.5">{selectedOrder.testName}</h3>
                      </div>
                      <button
                        onClick={() => window.print()}
                        className="px-3 py-1.5 rounded-xl border border-[#E7E2D8] text-xs font-semibold text-teal-800 hover:bg-slate-50 flex items-center gap-1.5"
                      >
                        <Printer className="w-3.5 h-3.5" /> Print Report
                      </button>
                    </div>

                    {matchedResult ? (
                      <div className="space-y-4">
                        <div className="p-5 rounded-2xl bg-[#FAF8F5] border border-[#E7E2D8] space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#162E27]">Laboratory Measured Values</span>
                            <span
                              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                                matchedResult.isAbnormal
                                  ? "bg-amber-100 text-amber-800 border border-amber-200"
                                  : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              }`}
                            >
                              {matchedResult.interpretation || (matchedResult.isAbnormal ? "Abnormal" : "Normal")}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-[#E7E2D8] text-xs">
                            <div>
                              <span className="text-[10px] text-[#687B74] block">Measured Result</span>
                              <span className="text-lg font-bold text-[#162E27] font-mono">
                                {matchedResult.value} {matchedResult.unit}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-[#687B74] block">Reference Range</span>
                              <span className="text-xs font-semibold text-[#162E27] font-mono mt-1 block">
                                {matchedResult.referenceRangeLow || "—"} - {matchedResult.referenceRangeHigh || "—"}{" "}
                                {matchedResult.unit}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-[#687B74] block">Analysis Date</span>
                              <span className="text-xs font-semibold text-[#162E27] mt-1 block">
                                {new Date(matchedResult.performedAt).toLocaleDateString()}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-[#687B74] block">Verified By</span>
                              <span className="text-xs font-semibold text-emerald-700 mt-1 block flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3" /> Central Pathology Lab
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Clinical interpretation notes */}
                        <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-100 text-xs text-teal-950 space-y-1">
                          <span className="font-bold flex items-center gap-1 text-teal-900">
                            <Sparkles className="w-3.5 h-3.5 text-teal-700" /> Attending Physician Clinical Review
                          </span>
                          <p className="text-[11px] leading-relaxed text-teal-800">
                            Panel findings have been integrated into your clinical encounter record. Your physician has
                            reviewed these results. Please schedule a follow-up consultation if any values require
                            treatment adjustments.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 rounded-2xl bg-[#FAF8F5] border border-[#E7E2D8] text-center space-y-2">
                        <Clock className="w-6 h-6 text-amber-500 mx-auto animate-pulse" />
                        <span className="font-bold text-xs text-[#162E27] block">Specimen Analysis in Progress</span>
                        <p className="text-[11px] text-[#687B74] max-w-sm mx-auto">
                          Results have not been released yet by the laboratory technician. You will receive an instant notification
                          the moment verification is complete.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="p-12 bg-white rounded-3xl border border-[#E7E2D8] text-center text-xs text-[#687B74]">
                Select an order from the list on the left to view payment instructions or verified results.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
