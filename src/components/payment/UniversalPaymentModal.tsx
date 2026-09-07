"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  CreditCard,
  Building2,
  Phone,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Upload,
  Loader2,
  X,
  FileText,
  Sparkles,
  QrCode,
  ArrowRight,
  Receipt,
  Lock,
  Clock,
  Zap,
  Calendar,
  DollarSign,
  Printer,
} from "lucide-react";

export interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (receipt: {
    receiptNumber: string;
    amount: number;
    method: string;
    transactionReference: string;
    registration?: any;
  }) => void;
  serviceType:
    | "registration"
    | "appointment"
    | "telehealth"
    | "bed_admission"
    | "lab_analysis"
    | "medication_dispense"
    | "subscription_renewal"
    | "case_intake"
    | "physiotherapy"
    | "nutrition"
    | "psychology"
    | "consultation";
  serviceCode?: string;
  serviceTitle: string;
  amountEtb: number;
  patientId?: string;
  patientName?: string;
  encounterId?: string;
  caseId?: string;
  invoiceId?: string;
}

export default function UniversalPaymentModal({
  isOpen,
  onClose,
  onSuccess,
  serviceType,
  serviceCode,
  serviceTitle,
  amountEtb,
  patientId,
  patientName = "Patient Member",
  encounterId,
  caseId,
  invoiceId,
}: PaymentModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<
    "telebirr" | "cbe" | "card" | "cash"
  >("telebirr");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 3-Month Registration & Addon state
  const [regStatus, setRegStatus] = useState<any>(null);
  const [includeRegistrationAddon, setIncludeRegistrationAddon] = useState(false);
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<number>(0);

  // Telebirr state
  const [telebirrPhone, setTelebirrPhone] = useState("+251 91 100 2233");
  const [telebirrMode, setTelebirrMode] = useState<"push" | "qr">("push");

  // CBE state
  const [cbeAccount, setCbeAccount] = useState("1000293848192");
  const [cbeReference, setCbeReference] = useState("");
  const [copiedBank, setCopiedBank] = useState(false);

  // Card state
  const [cardNumber, setCardNumber] = useState("4111 2222 3333 4444");
  const [cardExpiry, setCardExpiry] = useState("12/28");
  const [cardCvc, setCardCvc] = useState("321");

  useEffect(() => {
    if (isOpen) {
      setPaymentSuccess(false);
      setReceiptData(null);
      setErrorMessage(null);
      setIsProcessing(false);

      // Check registration status
      fetch("/api/v1/patient/registration-status")
        .then((r) => r.json())
        .then((d) => {
          if (d.success && d.data) {
            setRegStatus(d.data);
            if (!d.data.isActive && serviceType !== "registration") {
              setIncludeRegistrationAddon(true);
            }
          }
        })
        .catch(() => {});
    }
  }, [isOpen, serviceType]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedBank(true);
    setTimeout(() => setCopiedBank(false), 2000);
  };

  // Base Calculation
  const regFee = includeRegistrationAddon && !regStatus?.isActive
    ? Number(regStatus?.basePrice || 350)
    : 0;
  const rawSubtotal = amountEtb + regFee;
  const currentTotal = Math.max(0, rawSubtotal - appliedDiscount);

  const handleApplyDiscount = () => {
    const code = discountCode.toUpperCase().trim();
    if (code === "COMMUNITY2026" || code === "STAFF100" || code === "FREECARE") {
      setAppliedDiscount(rawSubtotal);
    } else if (code === "SENIOR50" || code === "STUDENT50") {
      setAppliedDiscount(rawSubtotal * 0.5);
    } else if (code === "CARE20") {
      setAppliedDiscount(rawSubtotal * 0.2);
    } else {
      setErrorMessage("Invalid discount code. Try 'COMMUNITY2026' or 'CARE20'.");
    }
  };

  const handleProcessPayment = async () => {
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // 1. Prepare Line Items
      const lineItems: any[] = [
        {
          serviceCode: serviceCode || `SRV_${serviceType.toUpperCase()}`,
          description: serviceTitle,
          unitPrice: amountEtb,
          quantity: 1,
        },
      ];

      if (includeRegistrationAddon && !regStatus?.isActive) {
        lineItems.push({
          serviceCode: "REGISTRATION_3MO",
          description: "Patient Registration & Health Portal Access (3 Months Validity)",
          unitPrice: regFee,
          quantity: 1,
        });
      }

      // 2. Create Dynamic Invoice
      const invoiceRes = await fetch("/api/v1/checkout/create-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          items: lineItems,
          discountCode: discountCode || undefined,
        }),
      }).then((r) => r.json());

      if (!invoiceRes.success || !invoiceRes.data?.invoice) {
        throw new Error(invoiceRes.error || "Failed to generate invoice");
      }

      const inv = invoiceRes.data.invoice;

      // 3. Execute Payment Transaction
      const payRes = await fetch("/api/v1/checkout/process-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: inv.id,
          paymentMethod: selectedMethod,
          phoneNumber: selectedMethod === "telebirr" ? telebirrPhone : undefined,
          accountNumber: selectedMethod === "cbe" ? cbeAccount : undefined,
          transactionRef: selectedMethod === "cbe" ? cbeReference || undefined : undefined,
        }),
      }).then((r) => r.json());

      if (!payRes.success) {
        throw new Error(payRes.error || "Payment transaction failed");
      }

      setReceiptData(payRes.data.receipt);
      setPaymentSuccess(true);

      setTimeout(() => {
        onSuccess({
          receiptNumber: payRes.data.receipt.receiptNumber,
          amount: currentTotal,
          method: selectedMethod,
          transactionReference: payRes.data.receipt.transactionRef,
          registration: payRes.data.registration,
        });
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err?.message || "Payment service temporarily unavailable. Please retry.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="drawer-backdrop animate-fade-in" onClick={onClose}>
      <div
        className="drawer-content p-6 sm:p-8 max-w-xl mx-auto rounded-3xl bg-white border border-[#E7E2D8] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#F2EFE9]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#E8F4F0] text-[#005C4B] flex items-center justify-center font-bold">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#162E27] font-display">
                Universal Health Checkout
              </h2>
              <p className="text-xs text-[#687B74]">
                Instant Receipt • 3-Month Coverage • TLS 1.3 Encrypted
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#FAF8F5] text-[#687B74] hover:text-[#162E27] flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="mt-5 space-y-5">
          {paymentSuccess && receiptData ? (
            /* Digital Receipt View */
            <div className="text-center py-4 space-y-4 animate-fade-in">
              <div className="w-14 h-14 rounded-full bg-[#E8F4F0] text-[#005C4B] flex items-center justify-center mx-auto ring-8 ring-[#E8F4F0]/60">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <span className="badge-mint text-xs mb-1">Payment Cleared</span>
                <h3 className="text-xl font-bold text-[#162E27] font-display">
                  Receipt #{receiptData.receiptNumber}
                </h3>
                <p className="text-xs text-[#687B74] mt-0.5">
                  Verified transaction for {receiptData.patientName}
                </p>
              </div>

              {/* Itemized Receipt Breakdown */}
              <div className="bg-[#FAF8F5] border border-[#E7E2D8] rounded-2xl p-4 text-left text-xs space-y-2.5 max-w-md mx-auto">
                <div className="flex justify-between border-b border-[#E7E2D8]/60 pb-2 text-[#687B74]">
                  <span>Transaction Ref:</span>
                  <span className="font-mono font-bold text-[#005C4B]">
                    {receiptData.transactionRef}
                  </span>
                </div>

                <div className="space-y-1.5 py-1">
                  {receiptData.items?.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between text-[#162E27]">
                      <span className="truncate max-w-[240px]">{item.description}</span>
                      <span className="font-mono font-bold">
                        {Number(item.totalPrice).toLocaleString()} ETB
                      </span>
                    </div>
                  ))}
                </div>

                {receiptData.registration && (
                  <div className="p-2.5 rounded-xl bg-[#E8F4F0] border border-[#005C4B]/20 text-[11px] text-[#005C4B] font-bold flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" /> 3-Month Registration:
                    </span>
                    <span>Valid until {new Date(receiptData.registration.validUntil).toLocaleDateString()}</span>
                  </div>
                )}

                <div className="flex justify-between pt-2 border-t border-[#E7E2D8] text-[#162E27] font-bold text-sm">
                  <span>Total Cleared:</span>
                  <span className="font-mono text-[#005C4B]">
                    {Number(receiptData.totalAmount).toLocaleString()} {receiptData.currency}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => window.print()}
                  className="btn-pill-ghost text-xs py-2 px-4 flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Receipt
                </button>
                <button
                  onClick={onClose}
                  className="btn-pill-primary text-xs py-2 px-6 shadow-sm"
                >
                  Done & Continue →
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Service & Breakdown Summary Card */}
              <div className="bg-[#FAF8F5] border border-[#E7E2D8] rounded-2xl p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <span className="badge-mint text-[10px]">Itemized Invoice</span>
                    <h4 className="text-sm font-bold text-[#162E27]">{serviceTitle}</h4>
                    <span className="text-xs text-[#687B74]">
                      Member: <strong className="text-[#162E27]">{patientName}</strong>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-[#687B74] uppercase block font-bold">
                      Service Fee
                    </span>
                    <span className="text-xl font-black text-[#005C4B] font-display">
                      {amountEtb.toLocaleString()}{" "}
                      <span className="text-xs font-normal text-[#687B74]">ETB</span>
                    </span>
                  </div>
                </div>

                {/* 3-Month Registration Expiry Check & Addon Prompt */}
                {regStatus && !regStatus.isActive && serviceType !== "registration" && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-900 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                        3-Month Patient Registration Required
                      </span>
                      <span className="font-mono font-bold text-amber-900">
                        +{regFee} ETB
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-800">
                      Your quarterly registration is expired. Bundling grants 90 days of unlimited doctor messaging, triage, and records access.
                    </p>
                    <label className="flex items-center gap-2 pt-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeRegistrationAddon}
                        onChange={(e) => setIncludeRegistrationAddon(e.target.checked)}
                        className="w-4 h-4 rounded text-[#005C4B] focus:ring-[#005C4B]"
                      />
                      <span className="text-xs font-bold text-[#162E27]">
                        Bundle 3-Month Registration Fee (+{regFee} ETB)
                      </span>
                    </label>
                  </div>
                )}

                {/* Total Summary */}
                <div className="flex justify-between items-center pt-2 border-t border-[#E7E2D8] text-xs">
                  <span className="font-bold text-[#687B74]">Total Due at Checkout:</span>
                  <span className="text-2xl font-black text-[#162E27] font-mono">
                    {currentTotal.toLocaleString()}{" "}
                    <span className="text-xs font-normal text-[#687B74]">ETB</span>
                  </span>
                </div>
              </div>

              {/* Discount Code Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Promo or Waiver Code (e.g. COMMUNITY2026)"
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value)}
                  className="flex-1 px-3.5 py-2 rounded-xl border border-[#E7E2D8] text-xs uppercase text-[#162E27] placeholder-[#687B74] focus:outline-none focus:border-[#005C4B]"
                />
                <button
                  type="button"
                  onClick={handleApplyDiscount}
                  className="btn-pill-ghost text-xs py-2 px-4"
                >
                  Apply
                </button>
              </div>

              {/* Payment Methods Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#162E27] uppercase tracking-wider block">
                  Select Payment Method
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: "telebirr", label: "Telebirr", icon: Phone },
                    { id: "cbe", label: "CBE Birr", icon: Building2 },
                    { id: "card", label: "Card / Chapa", icon: CreditCard },
                    { id: "cash", label: "Cash / POS", icon: DollarSign },
                  ].map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSelectedMethod(id as any)}
                      className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                        selectedMethod === id
                          ? "border-[#005C4B] bg-[#E8F4F0] text-[#005C4B] shadow-sm font-bold"
                          : "border-[#E7E2D8] bg-white text-[#33413C] hover:bg-[#FAF8F5]"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[11px] block">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Payment Details */}
              {selectedMethod === "telebirr" && (
                <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E7E2D8] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#162E27]">Telebirr Instant Push</span>
                    <div className="flex gap-1 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setTelebirrMode("push")}
                        className={`px-2.5 py-1 rounded-full font-bold ${
                          telebirrMode === "push" ? "bg-[#005C4B] text-white" : "bg-white border"
                        }`}
                      >
                        USSD Push
                      </button>
                      <button
                        type="button"
                        onClick={() => setTelebirrMode("qr")}
                        className={`px-2.5 py-1 rounded-full font-bold ${
                          telebirrMode === "qr" ? "bg-[#005C4B] text-white" : "bg-white border"
                        }`}
                      >
                        QR Code
                      </button>
                    </div>
                  </div>

                  {telebirrMode === "push" ? (
                    <div>
                      <label className="text-[11px] text-[#687B74] block mb-1">
                        Enter Telebirr Phone Number
                      </label>
                      <input
                        type="text"
                        value={telebirrPhone}
                        onChange={(e) => setTelebirrPhone(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border border-[#E7E2D8] text-xs font-mono font-bold text-[#162E27] focus:outline-none focus:border-[#005C4B]"
                      />
                    </div>
                  ) : (
                    <div className="text-center py-2 space-y-2">
                      <div className="w-28 h-28 bg-white border border-[#E7E2D8] rounded-xl p-2 mx-auto flex items-center justify-center">
                        <QrCode className="w-24 h-24 text-[#162E27]" />
                      </div>
                      <span className="text-[10px] text-[#687B74] block">
                        Scan with Telebirr App to clear {currentTotal} ETB
                      </span>
                    </div>
                  )}
                </div>
              )}

              {selectedMethod === "cbe" && (
                <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E7E2D8] space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#687B74]">CBE Account:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-[#162E27]">{cbeAccount}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(cbeAccount)}
                        className="p-1 text-[#005C4B] hover:text-[#0B3B32]"
                      >
                        {copiedBank ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-[#687B74] block mb-1">
                      CBE Birr / Transfer Reference Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. FT262489201"
                      value={cbeReference}
                      onChange={(e) => setCbeReference(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-[#E7E2D8] text-xs font-mono font-bold text-[#162E27] focus:outline-none focus:border-[#005C4B]"
                    />
                  </div>
                </div>
              )}

              {selectedMethod === "card" && (
                <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E7E2D8] space-y-3">
                  <div>
                    <label className="text-[11px] text-[#687B74] block mb-1">Card Number</label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-[#E7E2D8] text-xs font-mono text-[#162E27] focus:outline-none focus:border-[#005C4B]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-[#687B74] block mb-1">Expiry</label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border border-[#E7E2D8] text-xs font-mono text-[#162E27] focus:outline-none focus:border-[#005C4B]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-[#687B74] block mb-1">CVC</label>
                      <input
                        type="text"
                        value={cardCvc}
                        onChange={(e) => setCardCvc(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border border-[#E7E2D8] text-xs font-mono text-[#162E27] focus:outline-none focus:border-[#005C4B]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {selectedMethod === "cash" && (
                <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E7E2D8] text-xs text-[#687B74] space-y-1">
                  <span className="font-bold text-[#162E27] block">Reception Desk Clearance</span>
                  <p>
                    Proceed with booking. An unpaid invoice of {currentTotal} ETB will be registered for clearance at the front desk POS.
                  </p>
                </div>
              )}

              {/* Error Banner */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Submit CTA */}
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleProcessPayment}
                className="btn-pill-primary w-full py-3.5 text-xs font-bold flex items-center justify-center gap-2 shadow-warm-md disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Payment with Gateway...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm & Pay {currentTotal.toLocaleString()} ETB</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
