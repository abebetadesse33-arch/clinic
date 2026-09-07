"use client";

import React, { useState } from "react";
import Link from "next/link";
import RoleGuard from "@/components/auth/RoleGuard";
import { useDynamicResource, useDynamicMutation } from "@/hooks/useDynamicResource";
import { DynamicIcon } from "@/components/dynamic/DynamicIcon";
import {
  FolderKanban,
  Plus,
  Edit2,
  Trash2,
  ArrowLeft,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function AdminTabsPage() {
  const { data: tabs, isLoading, refetch } = useDynamicResource<any[]>("tabs", { all: true });

  const createMutation = useDynamicMutation("tabs", "POST", { onSuccess: () => refetch() });
  const updateMutation = useDynamicMutation("tabs", "PUT", { onSuccess: () => refetch() });
  const deleteMutation = useDynamicMutation("tabs", "DELETE", { onSuccess: () => refetch() });

  const [selectedPage, setSelectedPage] = useState<string>("all");
  const [editingTab, setEditingTab] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    pageKey: "patient_health",
    tabKey: "",
    label: "",
    icon: "Activity",
    badgeKey: "",
    order: 0,
    isActive: true,
  });

  const openCreate = () => {
    setEditingTab(null);
    setFormData({
      pageKey: selectedPage === "all" ? "patient_health" : selectedPage,
      tabKey: "",
      label: "",
      icon: "Activity",
      badgeKey: "",
      order: (tabs?.length || 0) + 1,
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const openEdit = (tab: any) => {
    setEditingTab(tab);
    setFormData({
      pageKey: tab.pageKey,
      tabKey: tab.tabKey,
      label: tab.label,
      icon: tab.icon || "Activity",
      badgeKey: tab.badgeKey || "",
      order: tab.order ?? 0,
      isActive: tab.isActive !== false,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      pageKey: formData.pageKey,
      tabKey: formData.tabKey,
      label: formData.label,
      icon: formData.icon || null,
      badgeKey: formData.badgeKey || null,
      order: Number(formData.order),
      isActive: formData.isActive,
    };

    if (editingTab) {
      await updateMutation.mutateAsync({ id: editingTab.id, ...payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this tab configuration?")) {
      await deleteMutation.mutateAsync({ id });
    }
  };

  // Unique pages
  const uniquePages = Array.from(new Set((tabs || []).map((t) => t.pageKey)));

  const filteredTabs = (tabs || []).filter((tab) => {
    return selectedPage === "all" || tab.pageKey === selectedPage;
  });

  return (
    <RoleGuard allowedRoles={["system_admin", "tenant_admin"]}>
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div className="space-y-1">
            <div className="flex items-center space-x-3">
              <Link
                href="/admin"
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center">
                <FolderKanban className="w-5 h-5" />
              </div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">
                Dynamic Tabs Configuration
              </h1>
            </div>
            <p className="text-xs text-slate-400 pl-12">
              Configure dynamic tab navigation, ordering, icons, and badge metrics across any page.
            </p>
          </div>

          <Button onClick={openCreate} className="space-x-2">
            <Plus className="w-4 h-4" />
            <span>Add Tab</span>
          </Button>
        </div>

        {/* Page Key Filters */}
        <div className="flex items-center space-x-2 overflow-x-auto">
          <button
            onClick={() => setSelectedPage("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              selectedPage === "all"
                ? "bg-teal-500 text-slate-950 font-bold"
                : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-white"
            }`}
          >
            All Pages
          </button>
          {uniquePages.map((page) => (
            <button
              key={page}
              onClick={() => setSelectedPage(page)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold font-mono transition-all ${
                selectedPage === page
                  ? "bg-teal-500 text-slate-950 font-bold"
                  : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-white"
              }`}
            >
              {page}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-300">
              <thead className="border-b border-slate-800 bg-slate-950/40 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                <tr>
                  <th className="p-4">Page Key</th>
                  <th className="p-4">Tab Key & Icon</th>
                  <th className="p-4">Label</th>
                  <th className="p-4">Order</th>
                  <th className="p-4">Badge Metric</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      Loading tab configurations...
                    </td>
                  </tr>
                ) : filteredTabs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      No tab configurations found.
                    </td>
                  </tr>
                ) : (
                  filteredTabs.map((tab) => (
                    <tr key={tab.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="p-4 font-mono font-bold text-teal-400">{tab.pageKey}</td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <DynamicIcon name={tab.icon || "Activity"} className="w-4 h-4 text-slate-400" />
                          <span className="font-mono text-white">{tab.tabKey}</span>
                        </div>
                      </td>
                      <td className="p-4 font-bold text-white">{tab.label}</td>
                      <td className="p-4 font-semibold text-white">#{tab.order}</td>
                      <td className="p-4 text-slate-400">{tab.badgeKey || "—"}</td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            tab.isActive
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {tab.isActive ? "Active" : "Disabled"}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => openEdit(tab)}
                          className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(tab.id)}
                          className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-rose-400 hover:bg-rose-950/40"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-6 space-y-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <h3 className="text-base font-bold text-white">
                  {editingTab ? "Edit Tab Configuration" : "Add Tab Configuration"}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">Page Key *</label>
                    <input
                      type="text"
                      required
                      value={formData.pageKey}
                      onChange={(e) => setFormData({ ...formData, pageKey: e.target.value })}
                      placeholder="e.g. patient_health"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">Tab Key *</label>
                    <input
                      type="text"
                      required
                      value={formData.tabKey}
                      onChange={(e) => setFormData({ ...formData, tabKey: e.target.value })}
                      placeholder="e.g. vitals, timeline"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">Label *</label>
                    <input
                      type="text"
                      required
                      value={formData.label}
                      onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                      placeholder="e.g. Vitals & Biometrics"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">Lucide Icon</label>
                    <input
                      type="text"
                      value={formData.icon}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      placeholder="e.g. Activity, HeartPulse"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">Display Order</label>
                    <input
                      type="number"
                      value={formData.order}
                      onChange={(e) => setFormData({ ...formData, order: Number(e.target.value) })}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">Badge Key</label>
                    <input
                      type="text"
                      value={formData.badgeKey}
                      onChange={(e) => setFormData({ ...formData, badgeKey: e.target.value })}
                      placeholder="e.g. activeMedsCount"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-white"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <input
                    type="checkbox"
                    id="tabActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded border-slate-800 text-teal-500"
                  />
                  <label htmlFor="tabActive" className="text-slate-300 cursor-pointer">
                    Is Active
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                  <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" isLoading={createMutation.isPending || updateMutation.isPending}>
                    {editingTab ? "Save Changes" : "Create Tab"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
