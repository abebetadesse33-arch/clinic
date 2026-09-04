"use client";

import React, { useState } from "react";
import Link from "next/link";
import RoleGuard from "@/components/auth/RoleGuard";
import { useDynamicResource, useDynamicMutation } from "@/hooks/useDynamicResource";
import { DynamicIcon } from "@/components/dynamic/DynamicIcon";
import {
  MousePointerClick,
  Plus,
  Edit2,
  Trash2,
  ArrowLeft,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function AdminActionsPage() {
  const { data: actions, isLoading, refetch } = useDynamicResource<any[]>("actions", { all: true });

  const createMutation = useDynamicMutation("actions", "POST", { onSuccess: () => refetch() });
  const updateMutation = useDynamicMutation("actions", "PUT", { onSuccess: () => refetch() });
  const deleteMutation = useDynamicMutation("actions", "DELETE", { onSuccess: () => refetch() });

  const [selectedPage, setSelectedPage] = useState<string>("all");
  const [editingAction, setEditingAction] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    pageKey: "patient_health",
    actionKey: "",
    label: "",
    icon: "Play",
    actionType: "link",
    href: "",
    apiEndpoint: "",
    method: "POST",
    variant: "default",
    order: 0,
    isActive: true,
  });

  const openCreate = () => {
    setEditingAction(null);
    setFormData({
      pageKey: selectedPage === "all" ? "patient_health" : selectedPage,
      actionKey: "",
      label: "New Action",
      icon: "Play",
      actionType: "link",
      href: "/appointments/new",
      apiEndpoint: "",
      method: "POST",
      variant: "default",
      order: (actions?.length || 0) + 1,
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const openEdit = (act: any) => {
    setEditingAction(act);
    setFormData({
      pageKey: act.pageKey,
      actionKey: act.actionKey,
      label: act.label,
      icon: act.icon || "Play",
      actionType: act.actionType || "link",
      href: act.href || "",
      apiEndpoint: act.apiEndpoint || "",
      method: act.method || "POST",
      variant: act.variant || "default",
      order: act.order ?? 0,
      isActive: act.isActive !== false,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      pageKey: formData.pageKey,
      actionKey: formData.actionKey,
      label: formData.label,
      icon: formData.icon || null,
      actionType: formData.actionType,
      href: formData.href || null,
      apiEndpoint: formData.apiEndpoint || null,
      method: formData.method,
      variant: formData.variant,
      order: Number(formData.order),
      isActive: formData.isActive,
    };

    if (editingAction) {
      await updateMutation.mutateAsync({ id: editingAction.id, ...payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this action configuration?")) {
      await deleteMutation.mutateAsync({ id });
    }
  };

  const uniquePages = Array.from(new Set((actions || []).map((a) => a.pageKey)));

  const filteredActions = (actions || []).filter((act) => {
    return selectedPage === "all" || act.pageKey === selectedPage;
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
                <MousePointerClick className="w-5 h-5" />
              </div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">
                Dynamic Actions Configuration
              </h1>
            </div>
            <p className="text-xs text-slate-400 pl-12">
              Manage database-driven action buttons, link dispatches, API calls, and modal openers.
            </p>
          </div>

          <Button onClick={openCreate} className="space-x-2">
            <Plus className="w-4 h-4" />
            <span>Add Action Button</span>
          </Button>
        </div>

        {/* Page Filter */}
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
                  <th className="p-4">Action Key & Label</th>
                  <th className="p-4">Action Type</th>
                  <th className="p-4">Target (Href / API)</th>
                  <th className="p-4">Variant</th>
                  <th className="p-4">Order</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">
                      Loading action configurations...
                    </td>
                  </tr>
                ) : filteredActions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">
                      No action configurations found.
                    </td>
                  </tr>
                ) : (
                  filteredActions.map((act) => (
                    <tr key={act.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="p-4 font-mono font-bold text-teal-400">{act.pageKey}</td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <DynamicIcon name={act.icon || "Play"} className="w-4 h-4 text-slate-400" />
                          <span className="font-bold text-white">{act.label}</span>
                          <span className="text-[10px] font-mono text-slate-500">({act.actionKey})</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline">{act.actionType}</Badge>
                      </td>
                      <td className="p-4 font-mono text-slate-400 max-w-xs truncate">
                        {act.href || act.apiEndpoint || "—"}
                      </td>
                      <td className="p-4 capitalize text-slate-300">{act.variant}</td>
                      <td className="p-4 font-bold text-white">#{act.order}</td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            act.isActive
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {act.isActive ? "Active" : "Disabled"}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => openEdit(act)}
                          className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(act.id)}
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
                  {editingAction ? "Edit Action Button" : "Add Action Button"}
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
                    <label className="text-slate-300 font-semibold">Action Key *</label>
                    <input
                      type="text"
                      required
                      value={formData.actionKey}
                      onChange={(e) => setFormData({ ...formData, actionKey: e.target.value })}
                      placeholder="e.g. book_appointment"
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
                      placeholder="e.g. Book Appointment"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">Lucide Icon</label>
                    <input
                      type="text"
                      value={formData.icon}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      placeholder="e.g. Calendar, Plus, Download"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">Action Type</label>
                    <select
                      value={formData.actionType}
                      onChange={(e) => setFormData({ ...formData, actionType: e.target.value })}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-white"
                    >
                      <option value="link">Link (Navigation)</option>
                      <option value="api_call">API Call (Fetch)</option>
                      <option value="modal">Open Modal</option>
                      <option value="download">Download File</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">Button Variant</label>
                    <select
                      value={formData.variant}
                      onChange={(e) => setFormData({ ...formData, variant: e.target.value })}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-white"
                    >
                      <option value="default">Default (Teal)</option>
                      <option value="outline">Outline</option>
                      <option value="secondary">Secondary</option>
                      <option value="destructive">Destructive (Rose)</option>
                      <option value="ghost">Ghost</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">
                    Target URL (Href) or API Endpoint
                  </label>
                  <input
                    type="text"
                    value={formData.actionType === "link" ? formData.href : formData.apiEndpoint}
                    onChange={(e) =>
                      formData.actionType === "link"
                        ? setFormData({ ...formData, href: e.target.value })
                        : setFormData({ ...formData, apiEndpoint: e.target.value })
                    }
                    placeholder="e.g. /appointments/new or /api/v1/orders/export"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-white"
                  />
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <input
                    type="checkbox"
                    id="actActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded border-slate-800 text-teal-500"
                  />
                  <label htmlFor="actActive" className="text-slate-300 cursor-pointer">
                    Is Active
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                  <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" isLoading={createMutation.isPending || updateMutation.isPending}>
                    {editingAction ? "Save Changes" : "Create Action"}
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
