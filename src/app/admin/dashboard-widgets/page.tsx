"use client";

import React, { useState } from "react";
import Link from "next/link";
import RoleGuard from "@/components/auth/RoleGuard";
import { useDynamicResource, useDynamicMutation } from "@/hooks/useDynamicResource";
import {
  LayoutDashboard,
  Plus,
  Edit2,
  Trash2,
  ArrowLeft,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function AdminDashboardWidgetsPage() {
  const { data: widgets, isLoading, refetch } = useDynamicResource<any[]>("dashboard-widgets", { all: true });

  const createMutation = useDynamicMutation("dashboard-widgets", "POST", { onSuccess: () => refetch() });
  const updateMutation = useDynamicMutation("dashboard-widgets", "PUT", { onSuccess: () => refetch() });
  const deleteMutation = useDynamicMutation("dashboard-widgets", "DELETE", { onSuccess: () => refetch() });

  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [editingWidget, setEditingWidget] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    role: "physician",
    widgetName: "",
    widgetType: "stats",
    title: "",
    description: "",
    config: "",
    position: 0,
    gridSpan: 1,
    isActive: true,
  });

  const openCreate = () => {
    setEditingWidget(null);
    setFormData({
      role: "physician",
      widgetName: "admitted_patients",
      widgetType: "stats",
      title: "Admitted Inpatients",
      description: "Active inpatient ward census",
      config: JSON.stringify({ value: 18, unit: "patients", change: "+2", changeType: "positive", icon: "Bed" }, null, 2),
      position: (widgets?.length || 0) + 1,
      gridSpan: 1,
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const openEdit = (w: any) => {
    setEditingWidget(w);
    setFormData({
      role: w.role,
      widgetName: w.widgetName,
      widgetType: w.widgetType || "stats",
      title: w.title || "",
      description: w.description || "",
      config: JSON.stringify(w.config || {}, null, 2),
      position: w.position ?? 0,
      gridSpan: w.gridSpan ?? 1,
      isActive: w.isActive !== false,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let parsedConfig: any = {};
    try {
      parsedConfig = JSON.parse(formData.config);
    } catch {
      alert("Invalid JSON format in widget config. Please verify syntax.");
      return;
    }

    const payload = {
      role: formData.role,
      widgetName: formData.widgetName,
      widgetType: formData.widgetType,
      title: formData.title || null,
      description: formData.description || null,
      config: parsedConfig,
      position: Number(formData.position),
      gridSpan: Number(formData.gridSpan),
      isActive: formData.isActive,
    };

    if (editingWidget) {
      await updateMutation.mutateAsync({ id: editingWidget.id, ...payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this dashboard widget?")) {
      await deleteMutation.mutateAsync({ id });
    }
  };

  const filteredWidgets = (widgets || []).filter((w) => {
    return selectedRole === "all" || w.role === selectedRole;
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
                <LayoutDashboard className="w-5 h-5" />
              </div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">
                Dashboard Widgets Configuration
              </h1>
            </div>
            <p className="text-xs text-slate-400 pl-12">
              Configure dynamic analytics widgets, metrics, tables, and timelines per user role.
            </p>
          </div>

          <Button onClick={openCreate} className="space-x-2">
            <Plus className="w-4 h-4" />
            <span>Add Widget</span>
          </Button>
        </div>

        {/* Role Filters */}
        <div className="flex items-center space-x-2 overflow-x-auto">
          {["all", "physician", "nurse", "patient", "system_admin", "pharmacist"].map((role) => (
            <button
              key={role}
              onClick={() => setSelectedRole(role)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                selectedRole === role
                  ? "bg-teal-500 text-slate-950 font-bold shadow-md shadow-teal-500/20"
                  : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-white"
              }`}
            >
              {role}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-300">
              <thead className="border-b border-slate-800 bg-slate-950/40 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                <tr>
                  <th className="p-4">Widget Name & Title</th>
                  <th className="p-4">Target Role</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Grid Span</th>
                  <th className="p-4">Position</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      Loading widgets...
                    </td>
                  </tr>
                ) : filteredWidgets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      No dashboard widgets configured for selected role.
                    </td>
                  </tr>
                ) : (
                  filteredWidgets.map((w) => (
                    <tr key={w.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-white">{w.title || w.widgetName}</div>
                        <div className="text-[11px] font-mono text-slate-400">{w.widgetName}</div>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline">{w.role}</Badge>
                      </td>
                      <td className="p-4 uppercase font-semibold text-teal-400">{w.widgetType}</td>
                      <td className="p-4 text-slate-300">{w.gridSpan} col</td>
                      <td className="p-4 font-bold text-white">#{w.position}</td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            w.isActive
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {w.isActive ? "Active" : "Disabled"}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => openEdit(w)}
                          className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(w.id)}
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
            <div className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900 p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <h3 className="text-base font-bold text-white">
                  {editingWidget ? "Edit Widget" : "Add Dashboard Widget"}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">Target Role *</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-white"
                    >
                      <option value="physician">physician</option>
                      <option value="nurse">nurse</option>
                      <option value="patient">patient</option>
                      <option value="system_admin">system_admin</option>
                      <option value="pharmacist">pharmacist</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">Widget Name (Key) *</label>
                    <input
                      type="text"
                      required
                      value={formData.widgetName}
                      onChange={(e) => setFormData({ ...formData, widgetName: e.target.value })}
                      placeholder="e.g. daily_triage_stats"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">Widget Type</label>
                    <select
                      value={formData.widgetType}
                      onChange={(e) => setFormData({ ...formData, widgetType: e.target.value as any })}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-white"
                    >
                      <option value="stats">stats</option>
                      <option value="list">list</option>
                      <option value="table">table</option>
                      <option value="timeline">timeline</option>
                      <option value="chart">chart</option>
                      <option value="custom">custom</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">Grid Span</label>
                    <select
                      value={formData.gridSpan}
                      onChange={(e) => setFormData({ ...formData, gridSpan: Number(e.target.value) })}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-white"
                    >
                      <option value={1}>1 Column</option>
                      <option value={2}>2 Columns</option>
                      <option value={3}>3 Columns (Full Width)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">Position</label>
                    <input
                      type="number"
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: Number(e.target.value) })}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Widget Config (JSON)</label>
                  <textarea
                    rows={6}
                    required
                    value={formData.config}
                    onChange={(e) => setFormData({ ...formData, config: e.target.value })}
                    className="w-full font-mono rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-white"
                  />
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <input
                    type="checkbox"
                    id="wActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded border-slate-800 text-teal-500"
                  />
                  <label htmlFor="wActive" className="text-slate-300 cursor-pointer">
                    Is Active
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                  <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" isLoading={createMutation.isPending || updateMutation.isPending}>
                    {editingWidget ? "Save Changes" : "Create Widget"}
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
