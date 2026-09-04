"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import RoleGuard from "@/components/auth/RoleGuard";
import {
  DollarSign, TrendingUp, TrendingDown, CreditCard, ShieldCheck, BarChart3,
  FileText, Activity, ArrowLeft, RefreshCw, Download, Plus, Search, Eye,
  CheckCircle2, XCircle, AlertTriangle, ChevronRight, ChevronDown, ChevronUp,
  Loader2, Wallet, Banknote, Building2, Receipt, ClipboardList, PieChart,
  ArrowUpRight, ArrowDownRight, Clock, Calendar, UserCheck, Package,
  BarChart2, Landmark, Layers, Check, X, AlertCircle, Zap, Star,
  ArrowRight, Filter,
} from "lucide-react";

export default function FinanceManagementPage() {
  return (
    <RoleGuard
      allowedRoles={["system_admin", "tenant_admin"]}
      fallbackTitle="Financial Management Hub"
      fallbackMessage="Access restricted to Administrators."
    >
      <FinanceManagementContent />
    </RoleGuard>
  );
}

type FinTab = "command" | "pos" | "claims" | "ledger" | "ar_ap" | "drawer";

const TABS: { id: FinTab; label: string; icon: any }[] = [
  { id: "command", label: "Command Center", icon: Activity },
  { id: "pos", label: "POS & Billing", icon: Receipt },
  { id: "claims", label: "Insurance Claims", icon: ShieldCheck },
  { id: "ledger", label: "General Ledger", icon: Landmark },
  { id: "ar_ap", label: "AR / AP", icon: Layers },
  { id: "drawer", label: "Cash Register", icon: Wallet },
];

// ─── Mock Data ─────────────────────────────────────────────────────────────────
const TODAY_REVENUE = {
  cash: 48500,
  mobile: 112300,
  card: 29800,
  insurance: 203500,
  total: 394100,
};

const MOCK_CLAIMS = [
  { id: "c1", claimNumber: "CLM-2026-001483", patientName: "Almaz Tesfaye", mrn: "MRN-00923", payerName: "EHIA National Insurance", payerCode: "EHIA", icd10Codes: ["I10", "E11.9"], totalClaimAmountEtb: "14800", approvedAmountEtb: "11840", patientCopayAmountEtb: "2960", status: "approved", submittedAt: "2026-08-28", adjudicatedAt: "2026-08-30" },
  { id: "c2", claimNumber: "CLM-2026-001484", patientName: "Bekele Mamo", mrn: "MRN-00924", payerName: "MedNet Healthcare", payerCode: "MEDNET", icd10Codes: ["J18.9"], totalClaimAmountEtb: "32400", approvedAmountEtb: "0", patientCopayAmountEtb: "0", status: "under_review", submittedAt: "2026-08-30", adjudicatedAt: null },
  { id: "c3", claimNumber: "CLM-2026-001485", patientName: "Chaltu Wakjira", mrn: "MRN-00925", payerName: "Jubilee Life Insurance", payerCode: "JUBILEE", icd10Codes: ["O34.21", "O09.39"], totalClaimAmountEtb: "68000", approvedAmountEtb: "54400", patientCopayAmountEtb: "13600", status: "reimbursed", submittedAt: "2026-08-20", adjudicatedAt: "2026-08-24" },
  { id: "c4", claimNumber: "CLM-2026-001486", patientName: "Dawit Haile", mrn: "MRN-00926", payerName: "Nyala Insurance", payerCode: "NYALA", icd10Codes: ["K35.80"], totalClaimAmountEtb: "52000", approvedAmountEtb: "0", patientCopayAmountEtb: "0", status: "rejected", submittedAt: "2026-08-25", adjudicatedAt: "2026-08-29" },
  { id: "c5", claimNumber: "CLM-2026-001487", patientName: "Eleni Solomon", mrn: "MRN-00927", payerName: "EHIA National Insurance", payerCode: "EHIA", icd10Codes: ["G40.009"], totalClaimAmountEtb: "8400", approvedAmountEtb: "0", patientCopayAmountEtb: "0", status: "draft", submittedAt: null, adjudicatedAt: null },
];

const MOCK_LEDGER_ACCOUNTS = [
  { accountCode: "1100", accountName: "Cash on Hand", accountType: "asset", currentBalance: "68450", department: null },
  { accountCode: "1110", accountName: "CBE Bank Account", accountType: "asset", currentBalance: "1248500", department: null },
  { accountCode: "1200", accountName: "Insurance Receivable (AR)", accountType: "asset", currentBalance: "203500", department: null },
  { accountCode: "1300", accountName: "Pharmacy Inventory", accountType: "asset", currentBalance: "342800", department: "Pharmacy" },
  { accountCode: "2100", accountName: "Accounts Payable", accountType: "liability", currentBalance: "124600", department: null },
  { accountCode: "2200", accountName: "Accrued Payroll Liability", accountType: "liability", currentBalance: "156800", department: null },
  { accountCode: "3100", accountName: "Retained Earnings", accountType: "equity", currentBalance: "2450000", department: null },
  { accountCode: "4100", accountName: "Consultation Revenue", accountType: "revenue", currentBalance: "394100", department: "Outpatient" },
  { accountCode: "4200", accountName: "Laboratory Revenue", accountType: "revenue", currentBalance: "128400", department: "Laboratory" },
  { accountCode: "4300", accountName: "Pharmacy Revenue", accountType: "revenue", currentBalance: "186200", department: "Pharmacy" },
  { accountCode: "4400", accountName: "Radiology Revenue", accountType: "revenue", currentBalance: "94800", department: "Radiology" },
  { accountCode: "5100", accountName: "Pharmacy COGS", accountType: "cogs", currentBalance: "102300", department: "Pharmacy" },
  { accountCode: "6100", accountName: "Staff Salaries", accountType: "expense", currentBalance: "156800", department: null },
  { accountCode: "6200", accountName: "Medical Equipment Maintenance", accountType: "expense", currentBalance: "18400", department: null },
  { accountCode: "6300", accountName: "Utilities", accountType: "expense", currentBalance: "12600", department: null },
];

const MOCK_JOURNAL_ENTRIES = [
  { entryNumber: "JE-POS-001483", entryDate: "2026-08-31", description: "POS Payment – Almaz Tesfaye Consultation + Lab", totalDebit: "14800", status: "posted", referenceType: "pos_billing" },
  { entryNumber: "JE-INS-001484", entryDate: "2026-08-30", description: "Insurance reimbursement – EHIA Claim CLM-001483", totalDebit: "11840", status: "posted", referenceType: "insurance_claim" },
  { entryNumber: "JE-PAY-00028", entryDate: "2026-08-31", description: "Payroll Disbursement – August 2026 (6 staff)", totalDebit: "156800", status: "posted", referenceType: "payroll_disbursement" },
  { entryNumber: "JE-MAN-00009", entryDate: "2026-08-29", description: "Manual Adjustment – Inventory count correction", totalDebit: "3200", status: "posted", referenceType: "manual_adjustment" },
  { entryNumber: "JE-POS-001481", entryDate: "2026-08-29", description: "POS Payment – Bekele Mamo Emergency Visit", totalDebit: "32400", status: "posted", referenceType: "pos_billing" },
];

const MOCK_AR_AGING = {
  current: { count: 12, total: 128400 },
  "31_60": { count: 6, total: 84200 },
  "61_90": { count: 3, total: 48600 },
  over_90: { count: 2, total: 29800 },
};

const MOCK_VENDOR_AP = [
  { id: "v1", vendorName: "Medpharm Pharmaceuticals PLC", invoiceNumber: "MP-2026-4821", description: "Monthly drug supply – Schedule A & B", amountEtb: "86400", dueDate: "2026-09-15", paymentStatus: "unpaid", category: "pharmaceuticals", threeWayMatchStatus: "matched" },
  { id: "v2", vendorName: "Ethiopia Medical Equipment Ltd", invoiceNumber: "EME-3342", description: "Ultrasound probe repair & calibration", amountEtb: "24800", dueDate: "2026-09-05", paymentStatus: "unpaid", category: "medical_equipment", threeWayMatchStatus: "matched" },
  { id: "v3", vendorName: "EthioNet ICT Solutions", invoiceNumber: "EN-9901", description: "Monthly LAN & fiber connectivity services", amountEtb: "8400", dueDate: "2026-08-31", paymentStatus: "overdue", category: "ict", threeWayMatchStatus: "matched" },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────
function fmtETB(n: number | string) {
  return `${parseInt(n as string).toLocaleString()} ETB`;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "bg-slate-700 text-slate-300 border-slate-600",
    submitted: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    under_review: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    approved: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    partially_approved: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
    rejected: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    reimbursed: "bg-teal-500/15 text-teal-300 border-teal-500/30",
    appealed: "bg-violet-500/15 text-violet-300 border-violet-500/30",
    unpaid: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    partial: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
    paid: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    overdue: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    posted: "bg-teal-500/15 text-teal-300 border-teal-500/30",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wide ${map[status] || "bg-slate-700 text-slate-300 border-slate-600"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

// ─── Tab: Command Center ────────────────────────────────────────────────────────
function CommandTab() {
  const totalRevenue = TODAY_REVENUE.total;
  const collections = [
    { label: "Cash", amount: TODAY_REVENUE.cash, pct: Math.round((TODAY_REVENUE.cash / totalRevenue) * 100), color: "amber" },
    { label: "Mobile Money", amount: TODAY_REVENUE.mobile, pct: Math.round((TODAY_REVENUE.mobile / totalRevenue) * 100), color: "violet" },
    { label: "Card", amount: TODAY_REVENUE.card, pct: Math.round((TODAY_REVENUE.card / totalRevenue) * 100), color: "cyan" },
    { label: "Insurance", amount: TODAY_REVENUE.insurance, pct: Math.round((TODAY_REVENUE.insurance / totalRevenue) * 100), color: "teal" },
  ];
  const colorMap: Record<string, { bar: string; text: string; ring: string }> = {
    amber: { bar: "bg-amber-500", text: "text-amber-300", ring: "border-amber-500/40" },
    violet: { bar: "bg-violet-500", text: "text-violet-300", ring: "border-violet-500/40" },
    cyan: { bar: "bg-cyan-500", text: "text-cyan-300", ring: "border-cyan-500/40" },
    teal: { bar: "bg-teal-500", text: "text-teal-300", ring: "border-teal-500/40" },
    rose: { bar: "bg-rose-500", text: "text-rose-300", ring: "border-rose-500/40" },
    emerald: { bar: "bg-emerald-500", text: "text-emerald-300", ring: "border-emerald-500/40" },
  };

  const deptRevenue = [
    { dept: "Outpatient", revenue: 394100, color: "teal" },
    { dept: "Laboratory", revenue: 128400, color: "cyan" },
    { dept: "Pharmacy", revenue: 186200, color: "violet" },
    { dept: "Radiology", revenue: 94800, color: "amber" },
    { dept: "Emergency", revenue: 84500, color: "rose" },
    { dept: "Inpatient", revenue: 156800, color: "emerald" },
  ];
  const maxDept = Math.max(...deptRevenue.map((d) => d.revenue));

  return (
    <div className="space-y-6">
      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Today's Revenue", value: fmtETB(totalRevenue), sub: "+8.4% vs yesterday", icon: TrendingUp, color: "teal" },
          { label: "Pending Claims", value: "4", sub: "203,500 ETB outstanding", icon: ShieldCheck, color: "amber" },
          { label: "Open Invoices", value: "18", sub: "291,000 ETB AR", icon: FileText, color: "violet" },
          { label: "AP Due This Week", value: fmtETB(24800 + 8400), sub: "2 vendor invoices", icon: Landmark, color: "rose" },
        ].map((kpi, i) => (
          <div key={i} className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500 uppercase tracking-widest">{kpi.label}</p>
              <kpi.icon className={`w-4 h-4 ${colorMap[kpi.color]?.text}`} />
            </div>
            <p className="text-xl font-black text-white">{kpi.value}</p>
            <p className="text-[10px] text-slate-500 mt-1">{kpi.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Collection Mix */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-teal-400" /> Today's Collection Mix
          </h3>
          <div className="space-y-3">
            {collections.map((c) => (
              <div key={c.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-400">{c.label}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${colorMap[c.color]?.text}`}>{fmtETB(c.amount)}</span>
                    <span className="text-[10px] text-slate-500">{c.pct}%</span>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-slate-800">
                  <div className={`h-2 rounded-full transition-all ${colorMap[c.color]?.bar}`} style={{ width: `${c.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Department Profitability */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-violet-400" /> Department Revenue (This Month)
          </h3>
          <div className="space-y-2.5">
            {deptRevenue.map((d) => (
              <div key={d.dept} className="flex items-center gap-3">
                <span className="text-xs text-slate-400 w-24 truncate">{d.dept}</span>
                <div className="flex-1 h-2 rounded-full bg-slate-800">
                  <div className={`h-2 rounded-full ${colorMap[d.color]?.bar}`} style={{ width: `${(d.revenue / maxDept) * 100}%` }} />
                </div>
                <span className={`text-xs font-bold w-20 text-right ${colorMap[d.color]?.text}`}>{(d.revenue / 1000).toFixed(0)}K ETB</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: "Open POS Terminal", href: "/billing/pos", icon: Receipt, color: "teal", sub: "Fast patient checkout" },
          { label: "File Insurance Claim", href: "/admin/finance#claims", icon: ShieldCheck, color: "violet", sub: "Electronic claim submission" },
          { label: "View General Ledger", href: "/admin/finance#ledger", icon: Landmark, color: "amber", sub: "Double-entry transactions" },
        ].map((link) => (
          <Link key={link.label} href={link.href} className={`p-4 rounded-2xl border border-slate-800 hover:border-${link.color}-500/40 hover:bg-${link.color}-500/5 transition-all group flex items-center gap-3`}>
            <div className={`p-2 rounded-xl bg-${link.color}-500/10 border border-${link.color}-500/20`}>
              <link.icon className={`w-4 h-4 text-${link.color}-400`} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors">{link.label}</p>
              <p className="text-[10px] text-slate-500">{link.sub}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Tab: POS & Billing ────────────────────────────────────────────────────────
function POSTab() {
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [paymentStep, setPaymentStep] = useState<"select" | "payment" | "receipt">("select");
  const [splits, setSplits] = useState({ cash: "", telebirr: "", cbe_birr: "", card: "", insurance: "" });

  const MOCK_PATIENTS_POS = [
    { id: "p1", name: "Almaz Tesfaye", mrn: "MRN-00923", items: [{ desc: "GP Consultation", amount: 1200 }, { desc: "CBC + CMP Lab Panel", amount: 3800 }, { desc: "Metformin 500mg × 60", amount: 480 }] },
    { id: "p2", name: "Bekele Mamo", mrn: "MRN-00924", items: [{ desc: "Emergency Triage", amount: 2500 }, { desc: "Chest X-Ray (PA view)", amount: 1800 }, { desc: "IV Antibiotics course", amount: 2200 }] },
  ];

  const filtered = patientSearch ? MOCK_PATIENTS_POS.filter((p) => p.name.toLowerCase().includes(patientSearch.toLowerCase()) || p.mrn.includes(patientSearch)) : MOCK_PATIENTS_POS;
  const total = selectedPatient ? selectedPatient.items.reduce((s: number, i: any) => s + i.amount, 0) : 0;
  const paid = Object.values(splits).reduce((s, v) => s + parseFloat(v || "0"), 0);
  const change = Math.max(0, paid - total);

  return (
    <div className="space-y-5">
      {paymentStep === "select" && (
        <>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              placeholder="Search by patient name or MRN…"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-teal-500/60"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => { setSelectedPatient(p); setPaymentStep("payment"); }}
                className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-teal-500/30 hover:bg-teal-500/5 text-left transition-all group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-bold text-slate-200 group-hover:text-white">{p.name}</p>
                    <p className="text-xs text-slate-500">{p.mrn}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-teal-400 transition-colors" />
                </div>
                <div className="space-y-1.5">
                  {p.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">{item.desc}</span>
                      <span className="text-xs font-semibold text-slate-300">{item.amount.toLocaleString()} ETB</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-500">Total Due</span>
                  <span className="text-sm font-black text-teal-300">{p.items.reduce((s, i) => s + i.amount, 0).toLocaleString()} ETB</span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {paymentStep === "payment" && selectedPatient && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Invoice summary */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white">Invoice Summary</h3>
              <button onClick={() => { setSelectedPatient(null); setPaymentStep("select"); }} className="text-xs text-slate-500 hover:text-slate-300">← Back</button>
            </div>
            <div className="mb-3 pb-3 border-b border-slate-800">
              <p className="text-sm font-bold text-slate-200">{selectedPatient.name}</p>
              <p className="text-xs text-slate-500">{selectedPatient.mrn}</p>
            </div>
            <div className="space-y-2">
              {selectedPatient.items.map((item: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-1">
                  <span className="text-xs text-slate-400">{item.desc}</span>
                  <span className="text-xs font-semibold text-slate-300">{item.amount.toLocaleString()} ETB</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-700 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-300">Total Due</span>
              <span className="text-xl font-black text-white">{total.toLocaleString()} ETB</span>
            </div>
          </div>

          {/* Payment collection */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800">
            <h3 className="text-sm font-bold text-white mb-4">Split Payment Collection</h3>
            <div className="space-y-3">
              {[
                { key: "cash", label: "Cash (ETB)", icon: Banknote, color: "amber" },
                { key: "telebirr", label: "Telebirr", icon: Wallet, color: "violet" },
                { key: "cbe_birr", label: "CBE Birr", icon: Wallet, color: "cyan" },
                { key: "card", label: "Card / POS", icon: CreditCard, color: "teal" },
                { key: "insurance", label: "Insurance Co-Pay", icon: ShieldCheck, color: "emerald" },
              ].map((m) => (
                <div key={m.key} className="flex items-center gap-3">
                  <m.icon className={`w-4 h-4 text-${m.color}-400 flex-shrink-0`} />
                  <label className="text-xs text-slate-400 w-28 flex-shrink-0">{m.label}</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={splits[m.key as keyof typeof splits]}
                    onChange={(e) => setSplits((s) => ({ ...s, [m.key]: e.target.value }))}
                    className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-teal-500/60 text-right"
                  />
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-700 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Total Collected</span>
                <span className={`font-bold ${paid >= total ? "text-emerald-400" : "text-amber-400"}`}>{paid.toLocaleString()} ETB</span>
              </div>
              {paid > total && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Change / Refund</span>
                  <span className="font-bold text-teal-300">{change.toLocaleString()} ETB</span>
                </div>
              )}
            </div>

            <button
              onClick={() => setPaymentStep("receipt")}
              disabled={paid < total}
              className="mt-4 w-full py-3 rounded-xl font-black text-sm transition-all disabled:opacity-40 bg-teal-500 hover:bg-teal-400 text-slate-950 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" /> Process Payment & Print Receipt
            </button>
          </div>
        </div>
      )}

      {paymentStep === "receipt" && selectedPatient && (
        <div className="max-w-md mx-auto">
          <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center mb-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <h3 className="text-lg font-black text-white">Payment Successful</h3>
            <p className="text-sm text-emerald-400 mt-1">{total.toLocaleString()} ETB collected</p>
          </div>
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 font-mono text-xs space-y-2">
            <p className="text-center font-black text-white text-sm">NiniMed Clinical Enterprise</p>
            <p className="text-center text-slate-500">Debre Birhan Habitat Clinic</p>
            <div className="border-t border-dashed border-slate-700 my-2" />
            <p>Patient: {selectedPatient.name}</p>
            <p>MRN: {selectedPatient.mrn}</p>
            <p>Date: {new Date().toLocaleDateString()}</p>
            <p>Receipt #: RCP-{Math.random().toString(36).slice(2, 8).toUpperCase()}</p>
            <div className="border-t border-dashed border-slate-700 my-2" />
            {selectedPatient.items.map((item: any, i: number) => (
              <div key={i} className="flex justify-between">
                <span className="text-slate-400 truncate max-w-[180px]">{item.desc}</span>
                <span>{item.amount.toLocaleString()} ETB</span>
              </div>
            ))}
            <div className="border-t border-dashed border-slate-700 my-2 pt-2 flex justify-between font-black text-white">
              <span>TOTAL PAID</span>
              <span>{total.toLocaleString()} ETB</span>
            </div>
            <p className="text-center text-slate-500 text-[10px]">Thank you for choosing NiniMed.</p>
          </div>
          <button
            onClick={() => { setSelectedPatient(null); setPaymentStep("select"); setSplits({ cash: "", telebirr: "", cbe_birr: "", card: "", insurance: "" }); }}
            className="mt-4 w-full py-2.5 rounded-xl border border-slate-700 text-slate-400 text-sm hover:border-teal-500/40 hover:text-teal-300 transition-all"
          >
            New Transaction
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Insurance Claims (Kanban) ─────────────────────────────────────────────
function ClaimsTab() {
  const COLUMNS = ["draft", "submitted", "under_review", "approved", "reimbursed", "rejected"];
  const colColors: Record<string, string> = {
    draft: "border-slate-600",
    submitted: "border-blue-500/40",
    under_review: "border-amber-500/40",
    approved: "border-emerald-500/40",
    reimbursed: "border-teal-500/40",
    rejected: "border-rose-500/40",
  };
  const colHeaders: Record<string, { label: string; color: string }> = {
    draft: { label: "Draft", color: "text-slate-400" },
    submitted: { label: "Submitted", color: "text-blue-300" },
    under_review: { label: "Under Review", color: "text-amber-300" },
    approved: { label: "Approved", color: "text-emerald-300" },
    reimbursed: { label: "Reimbursed", color: "text-teal-300" },
    rejected: { label: "Rejected", color: "text-rose-300" },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-200">Insurance Claims Adjudication Board</h3>
        <button className="px-3 py-1.5 rounded-xl bg-teal-500 text-slate-950 text-xs font-bold flex items-center gap-1.5 hover:bg-teal-400 transition-colors">
          <Plus className="w-3.5 h-3.5" /> File New Claim
        </button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {COLUMNS.map((col) => {
          const claims = MOCK_CLAIMS.filter((c) => c.status === col);
          const colInfo = colHeaders[col];
          return (
            <div key={col} className={`flex-shrink-0 w-64 rounded-2xl border ${colColors[col]} bg-slate-900/60 p-3`}>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs font-bold uppercase tracking-widest ${colInfo.color}`}>{colInfo.label}</span>
                <span className="text-[10px] text-slate-500 font-semibold px-1.5 py-0.5 rounded-full bg-slate-800">{claims.length}</span>
              </div>
              <div className="space-y-2">
                {claims.map((c) => (
                  <div key={c.id} className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-all">
                    <p className="text-[10px] text-slate-500 font-mono">{c.claimNumber}</p>
                    <p className="text-xs font-bold text-slate-200 mt-0.5 truncate">{c.patientName}</p>
                    <p className="text-[10px] text-slate-500">{c.mrn} · {c.payerCode}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {(c.icd10Codes as string[]).map((code) => (
                        <span key={code} className="px-1.5 py-0.5 rounded bg-slate-800 text-[9px] font-mono text-slate-400">{code}</span>
                      ))}
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500">Claim</span>
                      <span className="text-xs font-black text-white">{parseInt(c.totalClaimAmountEtb).toLocaleString()} ETB</span>
                    </div>
                    {c.approvedAmountEtb !== "0" && (
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-slate-500">Approved</span>
                        <span className="text-xs font-bold text-emerald-400">{parseInt(c.approvedAmountEtb).toLocaleString()} ETB</span>
                      </div>
                    )}
                  </div>
                ))}
                {claims.length === 0 && <p className="text-[10px] text-slate-600 text-center py-4">No claims</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Tab: Ledger ───────────────────────────────────────────────────────────────
function LedgerTab() {
  const [view, setView] = useState<"accounts" | "transactions" | "pl">("accounts");
  const totalRevenue = MOCK_LEDGER_ACCOUNTS.filter((a) => a.accountType === "revenue").reduce((s, a) => s + parseInt(a.currentBalance), 0);
  const totalExpense = MOCK_LEDGER_ACCOUNTS.filter((a) => a.accountType === "expense" || a.accountType === "cogs").reduce((s, a) => s + parseInt(a.currentBalance), 0);
  const netIncome = totalRevenue - totalExpense;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        {(["accounts", "transactions", "pl"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all capitalize ${view === v ? "bg-teal-500/20 border-teal-500/40 text-teal-300" : "border-slate-700 text-slate-400 hover:border-slate-600"}`}
          >
            {v === "pl" ? "Profit & Loss" : v.replace("_", " ")}
          </button>
        ))}
      </div>

      {view === "accounts" && (
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/50">
                {["Code", "Account Name", "Type", "Cost Center", "Balance (ETB)"].map((h) => (
                  <th key={h} className="py-3 px-4 text-left text-slate-400 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOCK_LEDGER_ACCOUNTS.map((a) => {
                const typeColors: Record<string, string> = { asset: "text-teal-300", liability: "text-rose-300", equity: "text-violet-300", revenue: "text-emerald-300", cogs: "text-amber-300", expense: "text-orange-300" };
                return (
                  <tr key={a.accountCode} className="border-b border-slate-800/50 hover:bg-slate-900/40 transition-colors">
                    <td className="py-2.5 px-4 font-mono text-slate-400">{a.accountCode}</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-200">{a.accountName}</td>
                    <td className="py-2.5 px-4"><span className={`capitalize font-bold ${typeColors[a.accountType]}`}>{a.accountType}</span></td>
                    <td className="py-2.5 px-4 text-slate-500">{a.department || "—"}</td>
                    <td className="py-2.5 px-4 font-black text-white text-right">{parseInt(a.currentBalance).toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {view === "transactions" && (
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/50">
                {["Entry #", "Date", "Description", "Type", "Debit (ETB)", "Status"].map((h) => (
                  <th key={h} className="py-3 px-4 text-left text-slate-400 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOCK_JOURNAL_ENTRIES.map((je) => (
                <tr key={je.entryNumber} className="border-b border-slate-800/50 hover:bg-slate-900/40 transition-colors">
                  <td className="py-2.5 px-4 font-mono text-teal-400">{je.entryNumber}</td>
                  <td className="py-2.5 px-4 text-slate-400">{je.entryDate}</td>
                  <td className="py-2.5 px-4 text-slate-200">{je.description}</td>
                  <td className="py-2.5 px-4 text-slate-500 capitalize">{je.referenceType.replace(/_/g, " ")}</td>
                  <td className="py-2.5 px-4 font-bold text-white">{parseInt(je.totalDebit).toLocaleString()}</td>
                  <td className="py-2.5 px-4"><StatusBadge status={je.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {view === "pl" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center">
            <p className="text-xs text-slate-400 mb-1">Total Revenue</p>
            <p className="text-3xl font-black text-emerald-400">{(totalRevenue / 1000).toFixed(0)}K</p>
            <p className="text-xs text-slate-500">ETB this month</p>
          </div>
          <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center">
            <p className="text-xs text-slate-400 mb-1">Total Expenses</p>
            <p className="text-3xl font-black text-rose-400">{(totalExpense / 1000).toFixed(0)}K</p>
            <p className="text-xs text-slate-500">ETB this month</p>
          </div>
          <div className={`p-5 rounded-2xl border text-center ${netIncome >= 0 ? "bg-teal-500/10 border-teal-500/30" : "bg-red-500/10 border-red-500/30"}`}>
            <p className="text-xs text-slate-400 mb-1">Net Income</p>
            <p className={`text-3xl font-black ${netIncome >= 0 ? "text-teal-400" : "text-red-400"}`}>{netIncome >= 0 ? "+" : ""}{(netIncome / 1000).toFixed(0)}K</p>
            <p className="text-xs text-slate-500">{((netIncome / totalRevenue) * 100).toFixed(1)}% net margin</p>
          </div>
          <div className="md:col-span-3 p-5 rounded-2xl bg-slate-900/90 border border-slate-800">
            <h3 className="text-sm font-bold text-white mb-4">Revenue Breakdown by Department</h3>
            <div className="space-y-2">
              {MOCK_LEDGER_ACCOUNTS.filter((a) => a.accountType === "revenue").map((a) => (
                <div key={a.accountCode} className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 w-40 truncate">{a.accountName}</span>
                  <div className="flex-1 h-2 rounded-full bg-slate-800">
                    <div className="h-2 rounded-full bg-teal-500" style={{ width: `${(parseInt(a.currentBalance) / totalRevenue) * 100}%` }} />
                  </div>
                  <span className="text-xs font-bold text-emerald-300 w-24 text-right">{parseInt(a.currentBalance).toLocaleString()} ETB</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: AR / AP ─────────────────────────────────────────────────────────────
function ARAPTab() {
  const [view, setView] = useState<"ap" | "aging">("aging");

  const agingBuckets = [
    { label: "0–30 Days (Current)", data: MOCK_AR_AGING.current, color: "emerald" },
    { label: "31–60 Days", data: MOCK_AR_AGING["31_60"], color: "amber" },
    { label: "61–90 Days", data: MOCK_AR_AGING["61_90"], color: "orange" },
    { label: "90+ Days (Critical)", data: MOCK_AR_AGING.over_90, color: "rose" },
  ];

  const colorMap: Record<string, string> = { emerald: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10", amber: "text-amber-300 border-amber-500/30 bg-amber-500/10", orange: "text-orange-300 border-orange-500/30 bg-orange-500/10", rose: "text-rose-300 border-rose-500/30 bg-rose-500/10" };
  const apCatColors: Record<string, string> = { pharmaceuticals: "bg-violet-500/15 text-violet-300", medical_equipment: "bg-cyan-500/15 text-cyan-300", ict: "bg-blue-500/15 text-blue-300", other: "bg-slate-700 text-slate-300" };

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        {(["aging", "ap"] as const).map((v) => (
          <button key={v} onClick={() => setView(v)} className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all ${view === v ? "bg-teal-500/20 border-teal-500/40 text-teal-300" : "border-slate-700 text-slate-400 hover:border-slate-600"}`}>
            {v === "aging" ? "Accounts Receivable (AR)" : "Accounts Payable (AP)"}
          </button>
        ))}
      </div>

      {view === "aging" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {agingBuckets.map((b) => (
              <div key={b.label} className={`p-4 rounded-2xl border ${colorMap[b.color]} text-center`}>
                <p className="text-[10px] font-semibold mb-1">{b.label}</p>
                <p className="text-2xl font-black">{b.data.total.toLocaleString()}</p>
                <p className="text-[10px] opacity-70">ETB · {b.data.count} invoices</p>
              </div>
            ))}
          </div>
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-400/80">
              <strong className="text-amber-300">29,800 ETB</strong> in accounts receivable is 90+ days overdue. Consider escalating insurance claims or issuing patient payment reminders.
            </p>
          </div>
        </div>
      )}

      {view === "ap" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">{MOCK_VENDOR_AP.length} outstanding vendor invoices · Total: {MOCK_VENDOR_AP.reduce((s, v) => s + parseInt(v.amountEtb), 0).toLocaleString()} ETB</p>
            <button className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-400 hover:border-teal-500/40 hover:text-teal-300 transition-all flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add Vendor Invoice
            </button>
          </div>
          {MOCK_VENDOR_AP.map((v) => (
            <div key={v.id} className={`p-4 rounded-2xl bg-slate-900/90 border transition-all ${v.paymentStatus === "overdue" ? "border-rose-500/30 bg-rose-500/5" : "border-slate-800 hover:border-slate-700"}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="text-sm font-bold text-slate-200">{v.vendorName}</p>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${apCatColors[v.category] || apCatColors.other}`}>{v.category.replace(/_/g, " ")}</span>
                    <StatusBadge status={v.paymentStatus} />
                  </div>
                  <p className="text-xs text-slate-500">{v.description}</p>
                  <p className="text-[10px] text-slate-600 mt-1">Invoice #{v.invoiceNumber} · Due: {v.dueDate}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-white">{parseInt(v.amountEtb).toLocaleString()}</p>
                  <p className="text-[10px] text-slate-500">ETB</p>
                </div>
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-slate-800">
                <button className="px-3 py-1.5 rounded-lg bg-teal-500/15 border border-teal-500/30 text-teal-300 text-xs font-semibold hover:bg-teal-500/25 transition-colors flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5" /> Pay Now
                </button>
                <button className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 text-xs hover:border-slate-600 transition-colors flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" /> View Invoice
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Cash Drawer ─────────────────────────────────────────────────────────
function DrawerTab() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [denominations, setDenominations] = useState<Record<string, string>>({ "1000": "", "500": "", "200": "", "100": "", "50": "", "10": "", "5": "", "1": "" });
  const [closingStep, setClosingStep] = useState<"open" | "counting" | "closed">("open");

  const totalCounted = Object.entries(denominations).reduce((s, [denom, count]) => s + parseInt(denom) * parseFloat(count || "0"), 0);
  const expectedClosing = 12000 + 48500; // opening + cash collected
  const discrepancy = totalCounted - expectedClosing;

  return (
    <div className="space-y-5 max-w-2xl">
      {!drawerOpen ? (
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 text-center space-y-4">
          <Wallet className="w-10 h-10 text-teal-400 mx-auto" />
          <div>
            <h3 className="text-sm font-bold text-white">Open Register Session</h3>
            <p className="text-xs text-slate-500 mt-1">Start a new cashier shift with an opening float</p>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block text-left">Opening Cash Float (ETB)</label>
            <input type="number" defaultValue="12000" className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-teal-500/60" />
          </div>
          <button onClick={() => setDrawerOpen(true)} className="w-full py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-sm transition-all flex items-center justify-center gap-2">
            <Zap className="w-4 h-4" /> Open Register — Morning Shift
          </button>
        </div>
      ) : closingStep === "open" ? (
        <>
          <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-300">Register Open — Morning Shift · Cashier A</p>
              <p className="text-xs text-emerald-400/80">Opening float: 12,000 ETB · 47 transactions today · 48,500 ETB cash collected</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Opening Float", value: "12,000 ETB", color: "teal" },
              { label: "Cash Collected", value: "48,500 ETB", color: "amber" },
              { label: "Mobile Money", value: "112,300 ETB", color: "violet" },
              { label: "Insurance Payments", value: "203,500 ETB", color: "cyan" },
            ].map((kpi) => (
              <div key={kpi.label} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                <p className="text-xs text-slate-500">{kpi.label}</p>
                <p className={`text-lg font-black text-${kpi.color}-300`}>{kpi.value}</p>
              </div>
            ))}
          </div>
          <button onClick={() => setClosingStep("counting")} className="w-full py-3 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-300 font-bold text-sm transition-all hover:bg-rose-500/20 flex items-center justify-center gap-2">
            <Clock className="w-4 h-4" /> Close Register & Count Cash
          </button>
        </>
      ) : closingStep === "counting" ? (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white mb-1">Physical Cash Count by Denomination</h3>
            <p className="text-xs text-slate-500">Enter the physical count for each denomination in the drawer</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(denominations).map(([denom, count]) => (
              <div key={denom} className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-sm font-black text-amber-300 w-12 text-right">{denom}</span>
                <span className="text-xs text-slate-500">×</span>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={count}
                  onChange={(e) => setDenominations((d) => ({ ...d, [denom]: e.target.value }))}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-teal-500/60 text-right"
                />
                <span className="text-xs text-slate-500 w-20 text-right">{(parseInt(denom) * parseFloat(count || "0")).toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-400">Total Counted</span><span className="font-black text-white">{totalCounted.toLocaleString()} ETB</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Expected (Float + Collections)</span><span className="font-bold text-slate-300">{expectedClosing.toLocaleString()} ETB</span></div>
            <div className={`flex justify-between border-t border-slate-800 pt-2 ${Math.abs(discrepancy) > 1 ? "text-rose-300" : "text-emerald-300"}`}>
              <span className="font-bold">Discrepancy</span>
              <span className="font-black">{discrepancy >= 0 ? "+" : ""}{discrepancy.toLocaleString()} ETB</span>
            </div>
          </div>
          {Math.abs(discrepancy) > 1 && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400">
              <AlertTriangle className="w-3.5 h-3.5 inline mr-1.5" />
              Discrepancy detected. Please re-count and note the reason before supervisor sign-off.
            </div>
          )}
          <button onClick={() => setClosingStep("closed")} className="w-full py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-sm transition-all flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4" /> Submit for Supervisor Sign-Off
          </button>
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
          <h3 className="text-lg font-black text-white">Register Closed & Verified</h3>
          <p className="text-sm text-emerald-400">Cash handover completed. Supervisor sign-off recorded.</p>
          <button onClick={() => { setDrawerOpen(false); setClosingStep("open"); setDenominations(Object.fromEntries(Object.keys(denominations).map((k) => [k, ""]))); }} className="px-6 py-2.5 rounded-xl border border-slate-700 text-slate-400 text-sm hover:border-teal-500/40 hover:text-teal-300 transition-all">
            Open New Shift
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────
function FinanceManagementContent() {
  const [activeTab, setActiveTab] = useState<FinTab>("command");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link href="/admin" className="p-2 rounded-lg hover:bg-slate-800 transition-colors">
                <ArrowLeft className="w-4 h-4 text-slate-400" />
              </Link>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-black text-white">Financial Management & Revenue Cycle</h1>
                <p className="text-[10px] text-slate-400">POS · Insurance RCM · Ledger · AR/AP · Cash Register</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/billing/pos" className="px-3 py-1.5 rounded-lg bg-teal-500 text-slate-950 text-xs font-bold flex items-center gap-1.5 hover:bg-teal-400 transition-all">
                <Receipt className="w-3.5 h-3.5" /> POS Terminal
              </Link>
              <button className="p-2 rounded-lg border border-slate-700 text-slate-400 hover:text-white transition-all">
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex gap-1 pb-0.5 overflow-x-auto scrollbar-hide">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-t-lg border-b-2 whitespace-nowrap transition-all ${activeTab === tab.id ? "border-emerald-400 text-emerald-300 bg-emerald-500/5" : "border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-700"}`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === "command" && <CommandTab />}
        {activeTab === "pos" && <POSTab />}
        {activeTab === "claims" && <ClaimsTab />}
        {activeTab === "ledger" && <LedgerTab />}
        {activeTab === "ar_ap" && <ARAPTab />}
        {activeTab === "drawer" && <DrawerTab />}
      </div>
    </div>
  );
}
