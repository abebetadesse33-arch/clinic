"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Archive,
  CheckCircle2,
  FlaskConical,
  Loader2,
  Pill,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Search,
  Filter,
  ShieldAlert,
  AlertTriangle,
  Clock,
  Download,
  ExternalLink,
  Info,
  Package,
  Boxes,
  Stethoscope,
  Activity,
  Layers,
  ChevronRight,
  X,
  Printer,
  Sparkles,
  ArrowUpDown,
  Tag,
  Syringe,
  Check,
  Copy,
} from "lucide-react";
import RoleGuard from "@/components/auth/RoleGuard";
import { useClinic } from "@/context/ClinicContext";
import {
  PHARMACY_MASTER_CATALOGUE,
  PharmacyCatalogueItem,
} from "@/lib/catalogue/pharmacy-master-catalogue";
import {
  LABORATORY_PROTOCOLS_CATALOGUE,
  LaboratoryProtocolItem,
} from "@/lib/catalogue/laboratory-protocols-catalogue";
import { getCatalogueSummary } from "@/lib/catalogue";

type CatalogEntry = {
  id: string;
  kind: "protocol" | "formulary";
  departmentId: string;
  name: string;
  indication: string;
  items: string[];
  metadata?: any;
  isActive: boolean;
  isSeeded?: boolean;
};

const EMPTY_FORM = {
  kind: "protocol",
  departmentId: "laboratory",
  name: "",
  indication: "",
  items: "",
};

const PHARMACY_SECTIONS = [
  { num: 0, label: "All Sections (1–18)", count: 376 },
  { num: 1, label: "1. Analgesics & Antipyretics", count: 35 },
  { num: 2, label: "2. Antibiotics", count: 70 },
  { num: 3, label: "3. Antifungals", count: 10 },
  { num: 4, label: "4. Antivirals", count: 10 },
  { num: 5, label: "5. Antimalarials & Antiparasitics", count: 10 },
  { num: 6, label: "6. Cardiovascular Medications", count: 22 },
  { num: 7, label: "7. Diabetes Medications", count: 14 },
  { num: 8, label: "8. Gastrointestinal Medications", count: 15 },
  { num: 9, label: "9. Respiratory Medications", count: 13 },
  { num: 10, label: "10. CNS Medications", count: 18 },
  { num: 11, label: "11. Dermatological Preparations", count: 10 },
  { num: 12, label: "12. Ophthalmic & Otic Preparations", count: 8 },
  { num: 13, label: "13. Vitamins, Minerals & Supplements", count: 10 },
  { num: 14, label: "14. Hormonal & Contraceptive Agents", count: 8 },
  { num: 15, label: "15. Vaccines & Immunologicals", count: 10 },
  { num: 16, label: "16. Intravenous Fluids & Solutions", count: 5 },
  { num: 17, label: "17. Anesthetics & Emergency Drugs", count: 8 },
  { num: 18, label: "18. Supplies & Non-Drug Inputs", count: 100 },
];

export default function ClinicalCatalogPage() {
  return (
    <RoleGuard
      allowedRoles={[
        "system_admin",
        "tenant_admin",
        "physician",
        "pharmacist",
        "lab_technician",
        "nurse_practitioner",
        "nurse",
        "auditor",
      ]}
      fallbackTitle="Clinical & Diagnostic Catalogue Suite"
      fallbackMessage="Access to governed pharmacy formulary, diagnostic laboratory protocols, and medical supplies catalog is restricted to credentialed clinical staff."
    >
      <EnhancedCatalogHub />
    </RoleGuard>
  );
}

function EnhancedCatalogHub() {
  const { currentUser, currentRole } = useClinic();

  // Active Main Tab
  const [activeMainTab, setActiveMainTab] = useState<
    "pharmacy" | "laboratory" | "supplies" | "protocols"
  >("pharmacy");

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSection, setSelectedSection] = useState<number>(0);
  const [selectedLabCategory, setSelectedLabCategory] = useState<string>("all");
  const [selectedSupplyCategory, setSelectedSupplyCategory] = useState<string>("all");
  const [controlledOnly, setControlledOnly] = useState(false);
  const [rxFilter, setRxFilter] = useState<"all" | "Rx" | "OTC">("all");
  const [criticalOnly, setCriticalOnly] = useState(false);

  // Dynamic Protocols from Database
  const [dbProtocols, setDbProtocols] = useState<CatalogEntry[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoadingProtocols, setIsLoadingProtocols] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Modal / Monograph State
  const [selectedDrugModal, setSelectedDrugModal] = useState<PharmacyCatalogueItem | null>(null);
  const [selectedLabModal, setSelectedLabModal] = useState<LaboratoryProtocolItem | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Catalogue Stats Summary
  const summary = useMemo(() => getCatalogueSummary(), []);

  // Fetch Database Protocols
  const loadDbProtocols = async () => {
    setIsLoadingProtocols(true);
    try {
      const response = await fetch("/api/v1/clinical/protocols?includeDisabled=true");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load catalog");
      setDbProtocols(data.data || []);
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setIsLoadingProtocols(false);
    }
  };

  useEffect(() => {
    loadDbProtocols();
  }, []);

  // Filtered Pharmacy Items (Sections 1–17)
  const filteredPharmacy = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return PHARMACY_MASTER_CATALOGUE.filter((item) => {
      if (item.sectionNumber === 18) return false; // Handled in Supplies tab
      if (selectedSection > 0 && item.sectionNumber !== selectedSection) return false;
      if (controlledOnly && !item.isControlled) return false;
      if (rxFilter !== "all" && item.rxOtc !== rxFilter) return false;
      if (!q) return true;
      return (
        item.drugCode.toLowerCase().includes(q) ||
        item.genericName.toLowerCase().includes(q) ||
        item.brandName.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.form.toLowerCase().includes(q) ||
        item.strength.toLowerCase().includes(q) ||
        item.route.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, selectedSection, controlledOnly, rxFilter]);

  // Filtered Supplies (Section 18)
  const filteredSupplies = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return PHARMACY_MASTER_CATALOGUE.filter((item) => {
      if (item.sectionNumber !== 18) return false;
      if (selectedSupplyCategory !== "all" && item.category !== selectedSupplyCategory) {
        return false;
      }
      if (rxFilter !== "all" && item.rxOtc !== rxFilter) return false;
      if (!q) return true;
      return (
        item.drugCode.toLowerCase().includes(q) ||
        item.genericName.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.form.toLowerCase().includes(q) ||
        item.strength.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, selectedSupplyCategory, rxFilter]);

  // Distinct Supply Categories
  const supplyCategories = useMemo(() => {
    const cats = new Set(
      PHARMACY_MASTER_CATALOGUE.filter((i) => i.sectionNumber === 18).map((i) => i.category)
    );
    return ["all", ...Array.from(cats).sort()];
  }, []);

  // Filtered Laboratory Protocols (79 Tests)
  const filteredLabProtocols = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return LABORATORY_PROTOCOLS_CATALOGUE.filter((lab) => {
      if (selectedLabCategory !== "all" && lab.category !== selectedLabCategory) return false;
      if (criticalOnly && !lab.criticalValues) return false;
      if (!q) return true;
      return (
        lab.testCode.toLowerCase().includes(q) ||
        lab.testName.toLowerCase().includes(q) ||
        lab.specimen.toLowerCase().includes(q) ||
        lab.tubeContainer.toLowerCase().includes(q) ||
        lab.methodology.toLowerCase().includes(q) ||
        lab.category.toLowerCase().includes(q) ||
        lab.referenceRangeAdult.toLowerCase().includes(q) ||
        (lab.criticalValues && lab.criticalValues.toLowerCase().includes(q))
      );
    });
  }, [searchQuery, selectedLabCategory, criticalOnly]);

  // Distinct Lab Categories
  const labCategories = useMemo(() => {
    const cats = new Set(LABORATORY_PROTOCOLS_CATALOGUE.map((l) => l.category));
    return ["all", ...Array.from(cats).sort()];
  }, []);

  // Save / Toggle Custom Protocols
  const saveCustomProtocol = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.indication.trim()) return;
    setIsSaving(true);
    setMessage("");
    const payload = {
      ...form,
      id: editingId || undefined,
      items: form.items.split("\n").map((item) => item.trim()).filter(Boolean),
      actorId: currentUser?.id || undefined,
      role: currentRole,
    };
    try {
      const response = await fetch("/api/v1/clinical/protocols", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", "x-clinic-role": currentRole },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save catalog entry");
      setForm(EMPTY_FORM);
      setEditingId(null);
      setMessage(editingId ? "Catalog entry updated." : "Catalog entry created.");
      loadDbProtocols();
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleDbProtocol = async (entry: CatalogEntry) => {
    const response = await fetch("/api/v1/clinical/protocols", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-clinic-role": currentRole },
      body: JSON.stringify({
        id: entry.id,
        isActive: !entry.isActive,
        role: currentRole,
        actorId: currentUser?.id || undefined,
      }),
    });
    if (response.ok) loadDbProtocols();
  };

  // Copy helper
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Export CSV
  const handleExportCSV = () => {
    if (activeMainTab === "pharmacy" || activeMainTab === "supplies") {
      const targetItems = activeMainTab === "pharmacy" ? filteredPharmacy : filteredSupplies;
      const headers = [
        "Drug Code",
        "Generic/Item Name",
        "Brand Name",
        "Category",
        "Form",
        "Strength/Spec",
        "Route",
        "Price (ETB)",
        "Reorder Level",
        "Controlled",
        "Rx/OTC",
        "Section",
      ];
      const rows = targetItems.map((i) => [
        i.drugCode,
        `"${i.genericName.replace(/"/g, '""')}"`,
        `"${i.brandName.replace(/"/g, '""')}"`,
        `"${i.category}"`,
        `"${i.form}"`,
        `"${i.strength}"`,
        i.route,
        i.priceEtb.toFixed(2),
        `${i.reorderLevel} ${i.reorderUnit}`,
        i.isControlled ? "Yes" : "No",
        i.rxOtc,
        `"${i.sectionName}"`,
      ]);
      const csvContent =
        "data:text/csv;charset=utf-8," +
        [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute(
        "download",
        `ninimed_${activeMainTab}_catalogue_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (activeMainTab === "laboratory") {
      const headers = [
        "Test Code",
        "Test Name",
        "Specimen",
        "Tube/Container",
        "Collection Protocol",
        "Handling/Storage",
        "Reference Range (Adult)",
        "Critical Values",
        "Turnaround Time",
        "Methodology",
        "Category",
        "Price (ETB)",
      ];
      const rows = filteredLabProtocols.map((l) => [
        l.testCode,
        `"${l.testName.replace(/"/g, '""')}"`,
        `"${l.specimen}"`,
        `"${l.tubeContainer}"`,
        `"${l.collectionProtocol.replace(/"/g, '""')}"`,
        `"${l.handlingStorage.replace(/"/g, '""')}"`,
        `"${l.referenceRangeAdult.replace(/"/g, '""')}"`,
        `"${(l.criticalValues || "—").replace(/"/g, '""')}"`,
        `"${l.turnaroundTime}"`,
        `"${l.methodology.replace(/"/g, '""')}"`,
        `"${l.category}"`,
        l.priceEtb.toFixed(2),
      ]);
      const csvContent =
        "data:text/csv;charset=utf-8," +
        [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute(
        "download",
        `ninimed_laboratory_protocols_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Helper for tube badge style
  const getTubeBadgeStyle = (tube: string) => {
    const t = tube.toLowerCase();
    if (t.includes("lavender") || t.includes("edta")) {
      return "bg-purple-950/80 text-purple-300 border-purple-800/80";
    }
    if (t.includes("blue") || t.includes("citrate")) {
      return "bg-sky-950/80 text-sky-300 border-sky-800/80";
    }
    if (t.includes("gold") || t.includes("sst")) {
      return "bg-amber-950/80 text-amber-300 border-amber-800/80";
    }
    if (t.includes("green") || t.includes("heparin")) {
      return "bg-emerald-950/80 text-emerald-300 border-emerald-800/80";
    }
    if (t.includes("gray") || t.includes("fluoride")) {
      return "bg-slate-800 text-slate-300 border-slate-700";
    }
    if (t.includes("sterile") || t.includes("culture")) {
      return "bg-teal-950/80 text-teal-300 border-teal-800/80";
    }
    return "bg-slate-900 text-slate-400 border-slate-800";
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 space-y-6">
      {/* ── Top Header ─────────────────────────────────────────── */}
      <header className="max-w-7xl mx-auto border-b border-slate-800 pb-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-teal-400 text-xs font-bold uppercase tracking-[0.2em]">
              <ShieldCheck className="w-4 h-4" /> NiniMed Enterprise Clinical Reference
            </div>
            <h1 className="text-3xl font-black text-white mt-1.5 flex items-center gap-3">
              Master Clinical & Diagnostic Catalogue
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300">
                Complete Intensive Edition
              </span>
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl">
              Consolidated hospital pharmacotherapy formulary (376 items across 18 sections),
              intensive laboratory diagnostic protocols (79 tests), specimen handling guidelines,
              and critical alert thresholds.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 border border-slate-700 hover:border-teal-500 text-slate-200 flex items-center gap-2 transition-all shadow-sm"
              title="Export filtered data to CSV"
            >
              <Download className="w-4 h-4 text-teal-400" /> Export CSV
            </button>
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-200 flex items-center gap-2 transition-all"
              title="Print view"
            >
              <Printer className="w-4 h-4 text-slate-400" /> Print
            </button>
            <Link
              href="/prescriptions"
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-teal-500 hover:bg-teal-400 text-slate-950 flex items-center gap-2 transition-all font-semibold shadow-md shadow-teal-500/20"
            >
              <Stethoscope className="w-4 h-4" /> Order Diagnostics / Rx
            </Link>
          </div>
        </div>

        {/* ── Key Metrics Bar ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-6">
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-3">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              Medications
              <Pill className="w-3.5 h-3.5 text-teal-400" />
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {summary.totalMedications}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Sections 1–17</div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-3">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              Hospital Supplies
              <Package className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {summary.totalSupplies}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Section 18 inputs</div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-3">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              Total Catalogue
              <Boxes className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400 mt-1">
              {summary.totalPharmacyItems}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Full hospital coverage</div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-3">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              Lab Protocols
              <FlaskConical className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {summary.totalLabProtocols}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Diagnostic assays</div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-3">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              Controlled Meds
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-400 mt-1">
              {summary.totalControlledDrugs}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Strict double-sign</div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-3">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              Critical Panic Labs
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="text-2xl font-black text-rose-400 mt-1">
              {summary.criticalValueProtocols}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Emergency alerts defined</div>
          </div>
        </div>
      </header>

      {/* ── Main Tab Navigation Bar ────────────────────────────── */}
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        <div className="flex p-1 rounded-2xl bg-slate-900 border border-slate-800 shadow-inner">
          <button
            onClick={() => {
              setActiveMainTab("pharmacy");
              setSearchQuery("");
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeMainTab === "pharmacy"
                ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Pill className="w-4 h-4" />
            Pharmacy Master ({summary.totalMedications})
          </button>

          <button
            onClick={() => {
              setActiveMainTab("supplies");
              setSearchQuery("");
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeMainTab === "supplies"
                ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Package className="w-4 h-4" />
            Supplies & Equipment ({summary.totalSupplies})
          </button>

          <button
            onClick={() => {
              setActiveMainTab("laboratory");
              setSearchQuery("");
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeMainTab === "laboratory"
                ? "bg-purple-500 text-white shadow-md shadow-purple-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <FlaskConical className="w-4 h-4" />
            Intensive Laboratory Protocols ({summary.totalLabProtocols})
          </button>

          <button
            onClick={() => {
              setActiveMainTab("protocols");
              setSearchQuery("");
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeMainTab === "protocols"
                ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Layers className="w-4 h-4" />
            Custom Clinical Order Sets ({dbProtocols.length})
          </button>
        </div>

        {/* Global Instant Search Bar */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeMainTab === "pharmacy"
                ? "Search code (AN-001), name, brand, route..."
                : activeMainTab === "supplies"
                ? "Search supply code (SUP-021), size..."
                : activeMainTab === "laboratory"
                ? "Search test code (CBC), specimen, method..."
                : "Search clinical protocols..."
            }
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── TAB 1: PHARMACY MASTER CATALOGUE ────────────────────────────── */}
      {activeMainTab === "pharmacy" && (
        <section className="max-w-7xl mx-auto space-y-4">
          {/* Section Selector Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {PHARMACY_SECTIONS.filter((s) => s.num !== 18).map((sec) => (
              <button
                key={sec.num}
                onClick={() => setSelectedSection(sec.num)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  selectedSection === sec.num
                    ? "bg-teal-500 text-slate-950 font-extrabold shadow-sm"
                    : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                <span>{sec.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    selectedSection === sec.num
                      ? "bg-slate-950/30 text-slate-950"
                      : "bg-slate-800 text-slate-300"
                  }`}
                >
                  {sec.count}
                </span>
              </button>
            ))}
          </div>

          {/* Sub-Filters: Controlled & Rx/OTC */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-800/80 p-3 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Filter:</span>
              <button
                onClick={() => setControlledOnly(!controlledOnly)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  controlledOnly
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                    : "bg-slate-800/70 text-slate-400 border border-slate-700 hover:text-white"
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                Controlled Substances Only
              </button>

              <div className="h-4 w-px bg-slate-800" />

              <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
                {(["all", "Rx", "OTC"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setRxFilter(mode)}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                      rxFilter === mode
                        ? "bg-teal-500 text-slate-950 font-bold"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {mode === "all" ? "All Forms" : mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-xs text-slate-400">
              Showing <span className="font-bold text-white">{filteredPharmacy.length}</span> of{" "}
              {summary.totalMedications} medications
            </div>
          </div>

          {/* Pharmacy Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                    <th className="p-3.5">Code</th>
                    <th className="p-3.5">Generic Name</th>
                    <th className="p-3.5">Brand Name</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Form</th>
                    <th className="p-3.5">Strength</th>
                    <th className="p-3.5">Route</th>
                    <th className="p-3.5 text-right">Price (ETB)</th>
                    <th className="p-3.5 text-center">Reorder Trigger</th>
                    <th className="p-3.5 text-center">Classification</th>
                    <th className="p-3.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {filteredPharmacy.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-12 text-center text-slate-500">
                        No medications matched your query. Try resetting filters.
                      </td>
                    </tr>
                  ) : (
                    filteredPharmacy.map((item) => (
                      <tr
                        key={item.drugCode}
                        className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                        onClick={() => setSelectedDrugModal(item)}
                      >
                        <td className="p-3.5 font-mono font-bold text-teal-400 flex items-center gap-1.5">
                          {item.drugCode}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(item.drugCode);
                            }}
                            className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-teal-300 transition-opacity"
                            title="Copy drug code"
                          >
                            {copiedCode === item.drugCode ? (
                              <Check className="w-3 h-3 text-teal-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </td>
                        <td className="p-3.5 font-bold text-white max-w-[220px]">
                          {item.genericName}
                        </td>
                        <td className="p-3.5 text-slate-300">{item.brandName || "—"}</td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 text-[10px]">
                            {item.category}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-200">{item.form}</td>
                        <td className="p-3.5 font-semibold text-teal-200">{item.strength}</td>
                        <td className="p-3.5">
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                            {item.route}
                          </span>
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold text-white">
                          ETB {item.priceEtb.toFixed(2)}
                        </td>
                        <td className="p-3.5 text-center">
                          <span className="font-mono text-slate-400 text-[11px]">
                            {item.reorderLevel} {item.reorderUnit}
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {item.isControlled ? (
                              <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold flex items-center gap-0.5">
                                <ShieldAlert className="w-3 h-3" /> C-Rx
                              </span>
                            ) : null}
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                item.rxOtc === "Rx"
                                  ? "bg-amber-500/10 text-amber-300 border border-amber-500/30"
                                  : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
                              }`}
                            >
                              {item.rxOtc}
                            </span>
                          </div>
                        </td>
                        <td className="p-3.5 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDrugModal(item);
                            }}
                            className="p-1 rounded-lg text-slate-400 hover:text-teal-300 hover:bg-slate-800 transition-colors"
                            title="View clinical monograph"
                          >
                            <Info className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ── TAB 2: SUPPLIES & EQUIPMENT (SECTION 18) ────────────────────── */}
      {activeMainTab === "supplies" && (
        <section className="max-w-7xl mx-auto space-y-4">
          {/* Subcategory Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {supplyCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedSupplyCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedSupplyCategory === cat
                    ? "bg-teal-500 text-slate-950 font-extrabold"
                    : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                {cat === "all" ? "All Supplies Categories" : cat}
              </button>
            ))}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                    <th className="p-3.5">Item Code</th>
                    <th className="p-3.5">Item Name</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Packaging / Form</th>
                    <th className="p-3.5">Size / Specification</th>
                    <th className="p-3.5 text-right">Price (ETB)</th>
                    <th className="p-3.5 text-center">Reorder Threshold</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-center">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {filteredSupplies.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-slate-500">
                        No supplies match your search query.
                      </td>
                    </tr>
                  ) : (
                    filteredSupplies.map((item) => (
                      <tr
                        key={item.drugCode}
                        className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                        onClick={() => setSelectedDrugModal(item)}
                      >
                        <td className="p-3.5 font-mono font-bold text-blue-400 flex items-center gap-1.5">
                          {item.drugCode}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(item.drugCode);
                            }}
                            className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-blue-300 transition-opacity"
                            title="Copy code"
                          >
                            {copiedCode === item.drugCode ? (
                              <Check className="w-3 h-3 text-blue-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </td>
                        <td className="p-3.5 font-bold text-white">{item.genericName}</td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded-md bg-blue-950/60 text-blue-300 border border-blue-800/50 text-[10px]">
                            {item.category}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-300">{item.form}</td>
                        <td className="p-3.5 font-semibold text-teal-200">{item.strength}</td>
                        <td className="p-3.5 text-right font-mono font-bold text-white">
                          ETB {item.priceEtb.toFixed(2)}
                        </td>
                        <td className="p-3.5 text-center font-mono text-slate-400">
                          {item.reorderLevel} {item.reorderUnit}
                        </td>
                        <td className="p-3.5 text-center">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              item.rxOtc === "Rx"
                                ? "bg-amber-500/10 text-amber-300 border border-amber-500/30"
                                : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
                            }`}
                          >
                            {item.rxOtc}
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDrugModal(item);
                            }}
                            className="p-1 rounded-lg text-slate-400 hover:text-teal-300 hover:bg-slate-800 transition-colors"
                          >
                            <Info className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ── TAB 3: INTENSIVE LABORATORY PROTOCOLS (79 TESTS) ────────────── */}
      {activeMainTab === "laboratory" && (
        <section className="max-w-7xl mx-auto space-y-4">
          {/* Lab Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {labCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedLabCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedLabCategory === cat
                    ? "bg-purple-500 text-white font-extrabold shadow-sm shadow-purple-500/20"
                    : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                {cat === "all" ? "All Protocols (79)" : cat}
              </button>
            ))}
          </div>

          {/* Sub-Filters: Critical Values Only */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-800/80 p-3 rounded-xl">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 font-medium">Filter:</span>
              <button
                onClick={() => setCriticalOnly(!criticalOnly)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  criticalOnly
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                    : "bg-slate-800/70 text-slate-400 border border-slate-700 hover:text-white"
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                Tests with Critical Emergency Limits ({summary.criticalValueProtocols})
              </button>
            </div>

            <div className="text-xs text-slate-400">
              Showing <span className="font-bold text-white">{filteredLabProtocols.length}</span> of{" "}
              {summary.totalLabProtocols} diagnostic protocols
            </div>
          </div>

          {/* Laboratory Protocols Master Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                    <th className="p-3.5">Code</th>
                    <th className="p-3.5">Test Name</th>
                    <th className="p-3.5">Specimen</th>
                    <th className="p-3.5">Tube / Container</th>
                    <th className="p-3.5">Reference Range (Adult)</th>
                    <th className="p-3.5">Critical Emergency Values</th>
                    <th className="p-3.5 text-center">TAT</th>
                    <th className="p-3.5">Methodology</th>
                    <th className="p-3.5 text-right">Requisition Price</th>
                    <th className="p-3.5 text-center">Protocol</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {filteredLabProtocols.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-12 text-center text-slate-500">
                        No laboratory protocol found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredLabProtocols.map((lab) => (
                      <tr
                        key={lab.testCode}
                        className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                        onClick={() => setSelectedLabModal(lab)}
                      >
                        <td className="p-3.5 font-mono font-black text-purple-300">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded bg-purple-950/80 border border-purple-800/80">
                              {lab.testCode}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(lab.testCode);
                              }}
                              className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-purple-300 transition-opacity"
                              title="Copy test code"
                            >
                              {copiedCode === lab.testCode ? (
                                <Check className="w-3 h-3 text-purple-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="p-3.5 font-bold text-white max-w-[200px]">
                          <div>{lab.testName}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{lab.category}</div>
                        </td>
                        <td className="p-3.5 text-slate-300 font-semibold">{lab.specimen}</td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-md border text-[10px] font-bold inline-block ${getTubeBadgeStyle(
                              lab.tubeContainer
                            )}`}
                          >
                            {lab.tubeContainer}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono text-[11px] text-slate-300 max-w-[220px]">
                          {lab.referenceRangeAdult}
                        </td>
                        <td className="p-3.5 max-w-[180px]">
                          {lab.criticalValues ? (
                            <div className="flex items-start gap-1 p-1.5 rounded-lg bg-rose-950/60 border border-rose-900/60 text-rose-300 text-[10.5px] font-mono font-bold leading-tight">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                              <span>{lab.criticalValues}</span>
                            </div>
                          ) : (
                            <span className="text-slate-600 text-[11px]">—</span>
                          )}
                        </td>
                        <td className="p-3.5 text-center">
                          <span className="px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-300">
                            {lab.turnaroundTime}
                          </span>
                        </td>
                        <td className="p-3.5 text-[11px] text-slate-400">{lab.methodology}</td>
                        <td className="p-3.5 text-right font-mono font-bold text-white">
                          ETB {lab.priceEtb.toFixed(2)}
                        </td>
                        <td className="p-3.5 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLabModal(lab);
                            }}
                            className="p-1 rounded-lg text-slate-400 hover:text-purple-300 hover:bg-slate-800 transition-colors"
                            title="View full collection protocol"
                          >
                            <Info className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ── TAB 4: CUSTOM CLINICAL PROTOCOLS & ORDER SETS ───────────────── */}
      {activeMainTab === "protocols" && (
        <section className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-6">
          <form
            onSubmit={saveCustomProtocol}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 h-fit shadow-xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-teal-400" />
                {editingId ? "Edit Custom Order Set" : "Create Clinical Order Protocol"}
              </h2>
              {editingId && (
                <button
                  type="button"
                  className="text-xs text-slate-400 hover:text-white"
                  onClick={() => {
                    setEditingId(null);
                    setForm(EMPTY_FORM);
                  }}
                >
                  Cancel
                </button>
              )}
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Type
              </label>
              <select
                value={form.kind}
                onChange={(e) => setForm({ ...form, kind: e.target.value as any })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white mt-1 focus:border-teal-500"
              >
                <option value="protocol">Clinical Diagnostic Protocol</option>
                <option value="formulary">Formulary Item Set</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Department
              </label>
              <select
                value={form.departmentId}
                onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white mt-1 focus:border-teal-500"
              >
                <option value="laboratory">Laboratory</option>
                <option value="pharmacy">Pharmacy</option>
                <option value="imaging">Imaging</option>
                <option value="admission">Admission / Inpatient</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Protocol Name
              </label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Acute Chest Pain Biomarker Protocol"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white mt-1 focus:border-teal-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Clinical Indication
              </label>
              <textarea
                required
                value={form.indication}
                onChange={(e) => setForm({ ...form, indication: e.target.value })}
                placeholder="Primary clinical guidelines and criteria for ordering"
                rows={3}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white mt-1 resize-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Requisition Items / Directives (1 per line)
              </label>
              <textarea
                value={form.items}
                onChange={(e) => setForm({ ...form, items: e.target.value })}
                placeholder="Complete Blood Count with Differential&#10;Troponin I Stat&#10;Serum Creatinine&#10;12-Lead ECG"
                rows={5}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white mt-1 resize-none focus:border-teal-500"
              />
            </div>

            <button
              disabled={isSaving}
              className="w-full bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-bold rounded-lg p-2.5 flex items-center justify-center gap-2 text-xs shadow-md shadow-teal-500/20 transition-all"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Order Protocol
            </button>

            {message && <p className="text-xs text-teal-300 text-center">{message}</p>}
          </form>

          {/* Protocols List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 pb-2">
              <span>Governed active protocols: {dbProtocols.length}</span>
              <button
                onClick={loadDbProtocols}
                className="text-teal-400 hover:text-teal-300 flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>

            {isLoadingProtocols ? (
              <div className="p-12 text-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-teal-400" />
                <p className="mt-2 text-xs">Loading clinical protocols...</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {dbProtocols.map((entry) => (
                  <article
                    key={entry.id}
                    className={`bg-slate-900 border rounded-xl p-4 transition-all shadow-md ${
                      entry.isActive ? "border-slate-800" : "border-rose-900/50 opacity-60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                          <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-teal-400">
                            {entry.kind}
                          </span>
                          <span>·</span>
                          <span className="text-purple-300">{entry.departmentId}</span>
                          {entry.isSeeded && (
                            <span className="text-emerald-400 flex items-center gap-0.5">
                              <Sparkles className="w-3 h-3" /> Core
                            </span>
                          )}
                        </div>
                        <h3 className="text-base font-bold text-white mt-1.5">{entry.name}</h3>
                        <p className="text-xs text-slate-400 mt-1">{entry.indication}</p>
                      </div>

                      <button
                        onClick={() => toggleDbProtocol(entry)}
                        title={entry.isActive ? "Disable protocol" : "Enable protocol"}
                        className="text-slate-400 hover:text-teal-300"
                      >
                        {entry.isActive ? (
                          <ToggleRight className="w-6 h-6 text-teal-400" />
                        ) : (
                          <ToggleLeft className="w-6 h-6 text-slate-600" />
                        )}
                      </button>
                    </div>

                    {entry.items && entry.items.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-800/80">
                        <div className="text-[11px] font-bold text-slate-400 mb-1.5">
                          Linked Tests / Orders:
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {entry.items.map((it, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-[10.5px] text-slate-300"
                            >
                              {it}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── DRUG / SUPPLY MONOGRAPH MODAL ───────────────────────── */}
      {selectedDrugModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelectedDrugModal(null)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedDrugModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-4">
              <div
                className={`p-3 rounded-2xl ${
                  selectedDrugModal.sectionNumber === 18
                    ? "bg-blue-500/10 border border-blue-500/30 text-blue-400"
                    : "bg-teal-500/10 border border-teal-500/30 text-teal-400"
                }`}
              >
                {selectedDrugModal.sectionNumber === 18 ? (
                  <Package className="w-8 h-8" />
                ) : (
                  <Pill className="w-8 h-8" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-950 text-teal-300 border border-slate-800">
                    {selectedDrugModal.drugCode}
                  </span>
                  <span className="text-xs text-slate-400">
                    Section {selectedDrugModal.sectionNumber}: {selectedDrugModal.sectionName}
                  </span>
                </div>
                <h2 className="text-2xl font-black text-white mt-1">
                  {selectedDrugModal.genericName}
                </h2>
                {selectedDrugModal.brandName && (
                  <p className="text-xs text-teal-400 font-semibold">
                    Brand name(s): {selectedDrugModal.brandName}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                <div className="text-[10.5px] uppercase font-bold text-slate-500">
                  Strength / Spec
                </div>
                <div className="text-sm font-bold text-white mt-1">
                  {selectedDrugModal.strength}
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                <div className="text-[10.5px] uppercase font-bold text-slate-500">Dosage Form</div>
                <div className="text-sm font-bold text-white mt-1">{selectedDrugModal.form}</div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                <div className="text-[10.5px] uppercase font-bold text-slate-500">Route</div>
                <div className="text-sm font-bold text-white mt-1">{selectedDrugModal.route}</div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                <div className="text-[10.5px] uppercase font-bold text-slate-500">Selling Price</div>
                <div className="text-base font-black text-emerald-400 mt-1 font-mono">
                  ETB {selectedDrugModal.priceEtb.toFixed(2)}
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                <div className="text-[10.5px] uppercase font-bold text-slate-500">
                  Reorder Level
                </div>
                <div className="text-sm font-bold text-white mt-1">
                  {selectedDrugModal.reorderLevel} {selectedDrugModal.reorderUnit}
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                <div className="text-[10.5px] uppercase font-bold text-slate-500">
                  Regulation / Rx
                </div>
                <div className="text-sm font-bold text-white mt-1 flex items-center gap-1.5">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      selectedDrugModal.rxOtc === "Rx"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    }`}
                  >
                    {selectedDrugModal.rxOtc}
                  </span>
                  {selectedDrugModal.isControlled && (
                    <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold">
                      Controlled
                    </span>
                  )}
                </div>
              </div>
            </div>

            {selectedDrugModal.isControlled && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/50 flex items-start gap-2.5">
                <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="text-xs text-rose-200">
                  <span className="font-bold">Controlled Substance Alert:</span> Mandates verified
                  licensed clinician prescription with DEA/license signature, witness dual-sign at
                  dispense, and automated tamper-evident logging.
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedDrugModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white"
              >
                Close
              </button>
              <Link
                href={`/prescriptions`}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-teal-500 hover:bg-teal-400 text-slate-950 flex items-center gap-1.5 shadow-md shadow-teal-500/20"
              >
                <Stethoscope className="w-4 h-4" /> Prescribe in Chart
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── LAB PROTOCOL SPEC SHEET MODAL ───────────────────────── */}
      {selectedLabModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelectedLabModal(null)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedLabModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-4">
              <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
                <FlaskConical className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                    {selectedLabModal.testCode}
                  </span>
                  <span className="text-xs text-slate-400">{selectedLabModal.category}</span>
                  {selectedLabModal.isStatAvailable && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                      STAT Available
                    </span>
                  )}
                </div>
                <h2 className="text-2xl font-black text-white mt-1">
                  {selectedLabModal.testName}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Methodology: {selectedLabModal.methodology}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                  <Activity className="w-4 h-4" /> Specimen & Phlebotomy
                </h4>
                <div className="text-xs space-y-1.5">
                  <div>
                    <span className="text-slate-400">Specimen Type:</span>{" "}
                    <span className="font-bold text-white">{selectedLabModal.specimen}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Tube / Container:</span>{" "}
                    <span
                      className={`px-1.5 py-0.5 rounded border text-[10.5px] font-bold ${getTubeBadgeStyle(
                        selectedLabModal.tubeContainer
                      )}`}
                    >
                      {selectedLabModal.tubeContainer}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Collection Protocol:</span>{" "}
                    <span className="text-slate-200">{selectedLabModal.collectionProtocol}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Handling / Storage:</span>{" "}
                    <span className="text-slate-200">{selectedLabModal.handlingStorage}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                <h4 className="text-xs font-bold uppercase tracking-wider text-teal-300 flex items-center gap-1.5">
                  <Clock className="w-4 h-4" /> Clinical Reference & TAT
                </h4>
                <div className="text-xs space-y-1.5">
                  <div>
                    <span className="text-slate-400">Turnaround Time (TAT):</span>{" "}
                    <span className="font-bold text-white font-mono">
                      {selectedLabModal.turnaroundTime}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Standard Price:</span>{" "}
                    <span className="font-mono font-bold text-emerald-400">
                      ETB {selectedLabModal.priceEtb.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Adult Reference Range:</span>
                    <div className="mt-1 p-2 bg-slate-900 border border-slate-800 rounded font-mono text-[11px] text-teal-200">
                      {selectedLabModal.referenceRangeAdult}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {selectedLabModal.criticalValues && (
              <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/70 space-y-1.5">
                <div className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  EMERGENCY CRITICAL / PANIC VALUES:
                </div>
                <div className="text-xs font-mono font-bold text-rose-200 pl-5">
                  {selectedLabModal.criticalValues}
                </div>
                <p className="text-[11px] text-rose-300/80 pl-5">
                  Laboratory staff must immediately telephone the attending physician and document
                  read-back verification when results meet these thresholds.
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedLabModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white"
              >
                Close
              </button>
              <Link
                href={`/prescriptions`}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-500 hover:bg-purple-400 text-white flex items-center gap-1.5 shadow-md shadow-purple-500/20"
              >
                <FlaskConical className="w-4 h-4" /> Requisition Assay
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}