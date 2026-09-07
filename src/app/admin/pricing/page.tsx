"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import RoleGuard from "@/components/auth/RoleGuard";
import {
  DollarSign,
  ShieldAlert,
  ToggleLeft,
  ToggleRight,
  Plus,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Sparkles,
  ArrowLeft,
  Layers,
  FlaskConical,
  Activity,
  HeartPulse,
  Pill,
  Calendar,
  Lock,
  Unlock,
  Check,
  X,
  Sliders,
  TrendingUp,
} from "lucide-react";

interface PricingService {
  id: string;
  serviceCode: string;
  category: string;
  name: string;
  description: string | null;
  basePrice: string;
  currency: string;
  isFree: boolean;
  isActive: boolean;
  validityDays: number | null;
  updatedAt: string;
}

interface PaymentSettings {
  id: string;
  globalFreeMode: boolean;
  registrationValidityDays: number;
  gracePeriodDays: number;
  allowCashReconciliation: boolean;
}

export default function AdminPricingPage() {
  const [services, setServices] = useState<PricingService[]>([]);
  const [settings, setSettings] = useState<PaymentSettings>({
    id: "",
    globalFreeMode: false,
    registrationValidityDays: 90,
    gracePeriodDays: 7,
    allowCashReconciliation: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Edit / Add Modals
  const [editingService, setEditingService] = useState<PricingService | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newService, setNewService] = useState({
    serviceCode: "",
    category: "consultation",
    name: "",
    description: "",
    basePrice: 450,
    currency: "ETB",
    isFree: false,
    validityDays: "",
  });

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const fetchPricingData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/v1/admin/pricing").then((r) => r.json());
      if (res.success && res.data) {
        setServices(res.data.services || []);
        if (res.data.settings) setSettings(res.data.settings);
      }
    } catch {
      showToast("Failed to connect to pricing catalog engine.", "error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPricingData();
  }, [fetchPricingData]);

  // Master Global Free Toggle
  const handleToggleGlobalFree = async () => {
    const nextVal = !settings.globalFreeMode;
    try {
      const res = await fetch("/api/v1/admin/pricing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ globalFreeMode: nextVal }),
      }).then((r) => r.json());

      if (res.success) {
        setSettings((prev) => ({ ...prev, globalFreeMode: nextVal }));
        showToast(
          nextVal
            ? "⚠️ GLOBAL FREE HEALTHCARE ENABLED: All clinic fees are currently waived."
            : "✅ ENFORCE PAYMENTS ENABLED: Dynamic fee matrix is now actively enforced."
        );
      } else {
        showToast(res.error || "Failed to update global payment setting.", "error");
      }
    } catch {
      showToast("Network error updating master switch.", "error");
    }
  };

  // Quick Toggle isFree for Single Service
  const handleToggleServiceFree = async (svc: PricingService) => {
    const nextFree = !svc.isFree;
    try {
      const res = await fetch(`/api/v1/admin/pricing/${svc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFree: nextFree }),
      }).then((r) => r.json());

      if (res.success) {
        setServices((prev) =>
          prev.map((s) => (s.id === svc.id ? { ...s, isFree: nextFree } : s))
        );
        showToast(`'${svc.name}' is now ${nextFree ? "100% FREE" : "BILLABLE"}.`);
      } else {
        showToast(res.error || "Update failed", "error");
      }
    } catch {
      showToast("Network error updating service.", "error");
    }
  };

  // Quick Toggle isActive
  const handleToggleServiceActive = async (svc: PricingService) => {
    const nextActive = !svc.isActive;
    try {
      const res = await fetch(`/api/v1/admin/pricing/${svc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextActive }),
      }).then((r) => r.json());

      if (res.success) {
        setServices((prev) =>
          prev.map((s) => (s.id === svc.id ? { ...s, isActive: nextActive } : s))
        );
        showToast(`'${svc.name}' is now ${nextActive ? "ACTIVE" : "INACTIVE"}.`);
      }
    } catch {}
  };

  // Save Modal Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;

    try {
      const res = await fetch(`/api/v1/admin/pricing/${editingService.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingService.name,
          description: editingService.description,
          basePrice: editingService.basePrice,
          isFree: editingService.isFree,
          isActive: editingService.isActive,
          validityDays: editingService.validityDays,
        }),
      }).then((r) => r.json());

      if (res.success) {
        showToast(`Updated '${editingService.name}' pricing configuration.`);
        setServices((prev) =>
          prev.map((s) => (s.id === editingService.id ? res.data : s))
        );
        setEditingService(null);
      } else {
        showToast(res.error || "Failed to save edits.", "error");
      }
    } catch {
      showToast("Network error saving changes.", "error");
    }
  };

  // Add New Service
  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/v1/admin/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newService),
      }).then((r) => r.json());

      if (res.success) {
        showToast(`Added '${newService.name}' to the live billing catalog!`);
        setServices((prev) => [res.data, ...prev]);
        setShowAddModal(false);
        setNewService({
          serviceCode: "",
          category: "consultation",
          name: "",
          description: "",
          basePrice: 450,
          currency: "ETB",
          isFree: false,
          validityDays: "",
        });
      } else {
        showToast(res.error || "Failed to add service.", "error");
      }
    } catch {
      showToast("Network error adding service.", "error");
    }
  };

  // Filtered List
  const filteredServices = services.filter((s) => {
    const matchesCat = selectedCategory === "all" || s.category === selectedCategory;
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.serviceCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const totalServices = services.length;
  const freeServicesCount = services.filter((s) => s.isFree).length;
  const paidServicesCount = totalServices - freeServicesCount;

  return (
    <RoleGuard
      allowedRoles={["system_admin", "tenant_admin"]}
      fallbackTitle="Admin Authorization Required"
      fallbackMessage="Only Enterprise System Administrators can access financial pricing and payment toggle controls."
    >
      <div className="space-y-6 pb-16">
        {/* Toast Notification */}
        {toastMsg && (
          <div
            className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl text-xs font-bold shadow-warm-lg flex items-center gap-2 animate-fade-in ${
              toastMsg.type === "error"
                ? "bg-rose-900 text-rose-100 border border-rose-700"
                : "bg-[#005C4B] text-white"
            }`}
          >
            {toastMsg.type === "error" ? (
              <AlertTriangle className="w-4 h-4 text-rose-300" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            )}
            <span>{toastMsg.text}</span>
          </div>
        )}

        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E7E2D8] pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Link
                href="/admin"
                className="text-xs font-bold text-[#005C4B] hover:text-[#0B3B32] flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Admin
              </Link>
              <span className="text-[#687B74]">•</span>
              <span className="badge-mint text-[11px]">Financial Governance</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#162E27] font-display flex items-center gap-2.5">
              <DollarSign className="w-7 h-7 text-[#005C4B]" />
              Fee & Pricing Control Center
            </h1>
            <p className="text-xs text-[#687B74]">
              Real-time administrative control over patient registration fees, lab tests, medications, consultations, and global free toggles.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchPricingData}
              className="p-2 rounded-full border border-[#E7E2D8] bg-white hover:bg-[#FAF8F5] text-[#33413C]"
              title="Refresh Pricing"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-[#005C4B]" : ""}`} />
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-pill-primary text-xs py-2 px-4 flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Add Billable Service
            </button>
          </div>
        </div>

        {/* MASTER GLOBAL FREE SWITCH BANNER */}
        <div
          className={`p-6 rounded-3xl border transition-all ${
            settings.globalFreeMode
              ? "bg-amber-50 border-amber-300 shadow-warm-md"
              : "card-warm"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                  settings.globalFreeMode
                    ? "bg-amber-500 text-white"
                    : "bg-[#005C4B] text-white"
                }`}
              >
                {settings.globalFreeMode ? (
                  <Unlock className="w-5 h-5" />
                ) : (
                  <Lock className="w-5 h-5" />
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-[#162E27]">
                    Master Global Switch:{" "}
                    {settings.globalFreeMode ? (
                      <span className="text-amber-800 font-extrabold uppercase">
                        Global Free Mode (Active)
                      </span>
                    ) : (
                      <span className="text-[#005C4B] font-extrabold uppercase">
                        Enforce Payments Mode
                      </span>
                    )}
                  </h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      settings.globalFreeMode
                        ? "bg-amber-200 text-amber-900 border border-amber-400"
                        : "bg-[#E8F4F0] text-[#005C4B]"
                    }`}
                  >
                    {settings.globalFreeMode ? "ALL SERVICES FREE (0.00 Birr)" : "DYNAMIC PRICING (Birr)"}
                  </span>
                </div>
                <p className="text-xs text-[#687B74] max-w-2xl">
                  {settings.globalFreeMode
                    ? "Emergency waiver active: All patient registration fees, specialist visits, laboratory tests, and medications are currently 100% free with zero checkout gating."
                    : "Standard operational mode: Individual service pricing, 3-month registration validity, and checkout gates are enforced per the catalog below."}
                </p>
              </div>
            </div>

            <button
              onClick={handleToggleGlobalFree}
              className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 shadow-sm ${
                settings.globalFreeMode
                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                  : "bg-[#162E27] hover:bg-[#0B3B32] text-white"
              }`}
            >
              {settings.globalFreeMode ? (
                <>
                  <ToggleRight className="w-5 h-5 text-amber-300" />
                  <span>Disable Global Free (Enforce Fees)</span>
                </>
              ) : (
                <>
                  <ToggleLeft className="w-5 h-5 text-slate-400" />
                  <span>Enable Global Free (Waive All)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card-warm p-4 space-y-1">
            <span className="text-[11px] font-bold text-[#687B74] uppercase">Catalog Services</span>
            <div className="text-2xl font-black text-[#162E27]">{totalServices}</div>
            <span className="text-[10px] text-[#005C4B]">Active across all specialties</span>
          </div>
          <div className="card-warm p-4 space-y-1">
            <span className="text-[11px] font-bold text-[#687B74] uppercase">Billable vs Free</span>
            <div className="text-2xl font-black text-[#162E27]">
              {paidServicesCount} <span className="text-sm font-medium text-[#687B74]">Paid</span> / {freeServicesCount} <span className="text-sm font-medium text-emerald-600">Free</span>
            </div>
            <span className="text-[10px] text-[#687B74]">Individual toggles enabled</span>
          </div>
          <div className="card-warm p-4 space-y-1">
            <span className="text-[11px] font-bold text-[#687B74] uppercase">Registration Validity</span>
            <div className="text-2xl font-black text-[#162E27]">{settings.registrationValidityDays} Days</div>
            <span className="text-[10px] text-[#005C4B]">3-Month renewable cycle</span>
          </div>
          <div className="card-warm p-4 space-y-1">
            <span className="text-[11px] font-bold text-[#687B74] uppercase">Grace Period</span>
            <div className="text-2xl font-black text-[#162E27]">{settings.gracePeriodDays} Days</div>
            <span className="text-[10px] text-[#687B74]">Post-expiry booking buffer</span>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-2">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1">
            {[
              { id: "all", label: "All Categories", icon: Sliders },
              { id: "registration", label: "Registration (3-Mo)", icon: Calendar },
              { id: "consultation", label: "Consultations", icon: Activity },
              { id: "laboratory", label: "Labs & Diagnostics", icon: FlaskConical },
              { id: "therapy", label: "Therapies & Rehab", icon: HeartPulse },
              { id: "nursing", label: "Nursing & Procedures", icon: Pill },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setSelectedCategory(id)}
                className={`py-1.5 px-3.5 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                  selectedCategory === id
                    ? "bg-[#005C4B] text-white shadow-sm"
                    : "bg-white border border-[#E7E2D8] text-[#33413C] hover:bg-[#FAF8F5]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#687B74]" />
            <input
              type="text"
              placeholder="Search service or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-1.5 rounded-full bg-white border border-[#E7E2D8] text-xs text-[#162E27] placeholder-[#687B74] focus:outline-none focus:border-[#005C4B]"
            />
          </div>
        </div>

        {/* Service Matrix Table */}
        <div className="card-warm overflow-hidden rounded-3xl border border-[#E7E2D8]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E7E2D8] bg-[#F7F5F0] text-[#687B74] font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-5">Service & Code</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Base Fee</th>
                  <th className="py-3.5 px-4 text-center">Service Status</th>
                  <th className="py-3.5 px-4 text-center">Billable Toggle</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2EFE9] text-[#33413C]">
                {filteredServices.map((svc) => (
                  <tr
                    key={svc.id}
                    className={`hover:bg-[#FAF8F5] transition-colors ${
                      !svc.isActive ? "opacity-50" : ""
                    }`}
                  >
                    {/* Service Name & Code */}
                    <td className="py-4 px-5">
                      <div className="font-bold text-[#162E27] text-sm">{svc.name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-[10px] text-[#005C4B] bg-[#E8F4F0] px-2 py-0.5 rounded-md font-bold">
                          {svc.serviceCode}
                        </span>
                        {svc.validityDays && (
                          <span className="text-[10px] text-[#687B74]">
                            Valid for {svc.validityDays} days
                          </span>
                        )}
                      </div>
                      {svc.description && (
                        <p className="text-[11px] text-[#687B74] line-clamp-1 mt-1 max-w-md">
                          {svc.description}
                        </p>
                      )}
                    </td>

                    {/* Category */}
                    <td className="py-4 px-4">
                      <span className="capitalize text-xs font-semibold px-2.5 py-1 rounded-full bg-[#FAF8F5] border border-[#E7E2D8] text-[#162E27]">
                        {svc.category}
                      </span>
                    </td>

                    {/* Base Fee */}
                    <td className="py-4 px-4">
                      <div className="font-bold text-sm text-[#162E27] font-mono">
                        {svc.isFree ? (
                          <span className="text-emerald-600 line-through mr-1.5 opacity-60">
                            {svc.basePrice} {svc.currency}
                          </span>
                        ) : (
                          <span>{svc.basePrice} {svc.currency}</span>
                        )}
                      </div>
                      {svc.isFree && (
                        <span className="badge-mint text-[10px] font-bold">FREE (0.00 Birr)</span>
                      )}
                    </td>

                    {/* Active Status */}
                    <td className="py-4 px-4 text-center">
                      <button
                        onClick={() => handleToggleServiceActive(svc)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${
                          svc.isActive
                            ? "bg-[#E8F4F0] text-[#005C4B] border-[#005C4B]/30"
                            : "bg-slate-100 text-slate-500 border-slate-300"
                        }`}
                      >
                        {svc.isActive ? "ACTIVE" : "INACTIVE"}
                      </button>
                    </td>

                    {/* Paid ↔ Free Toggle */}
                    <td className="py-4 px-4 text-center">
                      <button
                        onClick={() => handleToggleServiceFree(svc)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 mx-auto ${
                          svc.isFree
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "bg-[#162E27] text-white hover:bg-[#005C4B]"
                        }`}
                      >
                        {svc.isFree ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>100% FREE</span>
                          </>
                        ) : (
                          <>
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>BILLABLE</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-5 text-right">
                      <button
                        onClick={() => setEditingService(svc)}
                        className="p-2 rounded-full border border-[#E7E2D8] hover:bg-[#FAF8F5] text-[#005C4B] transition-colors"
                        title="Edit Price & Details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* EDIT SERVICE MODAL */}
        {editingService && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="max-w-lg w-full bg-white rounded-3xl p-6 sm:p-8 border border-[#E7E2D8] shadow-warm-lg space-y-6">
              <div className="flex items-center justify-between border-b border-[#F2EFE9] pb-4">
                <div className="space-y-0.5">
                  <h3 className="text-lg font-bold text-[#162E27]">Edit Billable Service</h3>
                  <span className="font-mono text-xs text-[#005C4B] font-bold">
                    {editingService.serviceCode}
                  </span>
                </div>
                <button
                  onClick={() => setEditingService(null)}
                  className="p-1.5 rounded-full hover:bg-[#FAF8F5] text-[#687B74]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-[#162E27] block mb-1">
                    Service Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editingService.name}
                    onChange={(e) =>
                      setEditingService({ ...editingService, name: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E2D8] text-xs text-[#162E27] focus:outline-none focus:border-[#005C4B]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-[#162E27] block mb-1">
                      Base Fee ({editingService.currency})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={editingService.basePrice}
                      onChange={(e) =>
                        setEditingService({ ...editingService, basePrice: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E2D8] text-xs font-mono font-bold text-[#162E27] focus:outline-none focus:border-[#005C4B]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#162E27] block mb-1">
                      Validity (Days)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 90 (or empty)"
                      value={editingService.validityDays || ""}
                      onChange={(e) =>
                        setEditingService({
                          ...editingService,
                          validityDays: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E2D8] text-xs text-[#162E27] focus:outline-none focus:border-[#005C4B]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#162E27] block mb-1">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={editingService.description || ""}
                    onChange={(e) =>
                      setEditingService({ ...editingService, description: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-[#E7E2D8] text-xs text-[#162E27] focus:outline-none focus:border-[#005C4B]"
                  />
                </div>

                <div className="flex items-center gap-6 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingService.isFree}
                      onChange={(e) =>
                        setEditingService({ ...editingService, isFree: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-[#005C4B] focus:ring-[#005C4B]"
                    />
                    <span className="text-xs font-bold text-[#162E27]">Mark as 100% Free</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingService.isActive}
                      onChange={(e) =>
                        setEditingService({ ...editingService, isActive: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-[#005C4B] focus:ring-[#005C4B]"
                    />
                    <span className="text-xs font-bold text-[#162E27]">Service Active</span>
                  </label>
                </div>

                <div className="flex justify-end gap-2.5 pt-4 border-t border-[#F2EFE9]">
                  <button
                    type="button"
                    onClick={() => setEditingService(null)}
                    className="btn-pill-ghost text-xs py-2 px-4"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-pill-primary text-xs py-2 px-5 shadow-sm"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ADD SERVICE MODAL */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="max-w-lg w-full bg-white rounded-3xl p-6 sm:p-8 border border-[#E7E2D8] shadow-warm-lg space-y-6">
              <div className="flex items-center justify-between border-b border-[#F2EFE9] pb-4">
                <h3 className="text-lg font-bold text-[#162E27]">Add New Billable Service</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1.5 rounded-full hover:bg-[#FAF8F5] text-[#687B74]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddService} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-[#162E27] block mb-1">
                      Service Code
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. LAB_URINALYSIS"
                      value={newService.serviceCode}
                      onChange={(e) =>
                        setNewService({ ...newService, serviceCode: e.target.value.toUpperCase() })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E2D8] text-xs font-mono font-bold text-[#162E27] uppercase focus:outline-none focus:border-[#005C4B]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#162E27] block mb-1">
                      Category
                    </label>
                    <select
                      value={newService.category}
                      onChange={(e) =>
                        setNewService({ ...newService, category: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E2D8] text-xs text-[#162E27] bg-white focus:outline-none focus:border-[#005C4B]"
                    >
                      <option value="consultation">Consultation</option>
                      <option value="registration">Registration</option>
                      <option value="laboratory">Laboratory</option>
                      <option value="therapy">Therapy</option>
                      <option value="nursing">Nursing Procedure</option>
                      <option value="pharmacy">Pharmacy</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#162E27] block mb-1">
                    Service Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Urine Routine & Microscopy"
                    value={newService.name}
                    onChange={(e) =>
                      setNewService({ ...newService, name: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E2D8] text-xs text-[#162E27] focus:outline-none focus:border-[#005C4B]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-[#162E27] block mb-1">
                      Base Fee (ETB)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={newService.basePrice}
                      onChange={(e) =>
                        setNewService({ ...newService, basePrice: Number(e.target.value) })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E2D8] text-xs font-mono font-bold text-[#162E27] focus:outline-none focus:border-[#005C4B]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#162E27] block mb-1">
                      Validity Days (Optional)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 90 for membership"
                      value={newService.validityDays}
                      onChange={(e) =>
                        setNewService({ ...newService, validityDays: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E2D8] text-xs text-[#162E27] focus:outline-none focus:border-[#005C4B]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#162E27] block mb-1">
                    Clinical Description
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Brief description of the service and inclusion criteria..."
                    value={newService.description}
                    onChange={(e) =>
                      setNewService({ ...newService, description: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-[#E7E2D8] text-xs text-[#162E27] focus:outline-none focus:border-[#005C4B]"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-4 border-t border-[#F2EFE9]">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="btn-pill-ghost text-xs py-2 px-4"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-pill-primary text-xs py-2 px-5 shadow-sm"
                  >
                    Create Service
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
