"use client";

import React, { useState } from "react";
import Link from "next/link";
import RoleGuard from "@/components/auth/RoleGuard";
import { useDynamicResource, useDynamicMutation } from "@/hooks/useDynamicResource";
import { DynamicIcon } from "@/components/dynamic/DynamicIcon";
import {
  Navigation,
  Plus,
  Edit2,
  Trash2,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Eye,
  Layers,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function AdminNavigationPage() {
  const { data: items, isLoading, refetch } = useDynamicResource<any[]>("navigation", { all: true });

  const createMutation = useDynamicMutation("navigation", "POST", { onSuccess: () => refetch() });
  const updateMutation = useDynamicMutation("navigation", "PUT", { onSuccess: () => refetch() });
  const deleteMutation = useDynamicMutation("navigation", "DELETE", { onSuccess: () => refetch() });

  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    label: "",
    href: "",
    icon: "Compass",
    role: "all",
    order: 0,
    isActive: true,
    requiresAuth: true,
    badgeKey: "",
  });

  const openCreate = () => {
    setEditingItem(null);
    setFormData({
      label: "",
      href: "",
      icon: "Compass",
      role: "all",
      order: (items?.length || 0) + 1,
      isActive: true,
      requiresAuth: true,
      badgeKey: "",
    });
    setIsModalOpen(true);
  };

  const openEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      label: item.label,
      href: item.href,
      icon: item.icon || "Compass",
      role: item.role || "all",
      order: item.order ?? 0,
      isActive: item.isActive !== false,
      requiresAuth: item.requiresAuth !== false,
      badgeKey: item.badgeKey || "",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      role: formData.role === "all" ? null : formData.role,
      order: Number(formData.order),
      badgeKey: formData.badgeKey || null,
    };

    if (editingItem) {
      await updateMutation.mutateAsync({ id: editingItem.id, ...payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this navigation item?")) {
      await deleteMutation.mutateAsync({ id });
    }
  };

  const filteredItems = (items || []).filter((item) => {
    const matchesRole =
      selectedRole === "all" ||
      (selectedRole === "global" ? !item.role : item.role === selectedRole);
    const matchesSearch =
      !searchTerm ||
      item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.href.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesRole && matchesSearch;
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
                <Navigation className="w-5 h-5" />
              </div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">
                Navigation Configuration
              </h1>
            </div>
            <p className="text-xs text-slate-400 pl-12">
              Dynamically control navigation items, menus, access permissions, and ordering across roles.
            </p>
          </div>

          <Button onClick={openCreate} className="space-x-2">
            <Plus className="w-4 h-4" />
            <span>Add Navigation Item</span>
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2 overflow-x-auto w-full md:w-auto">
            {["all", "global", "guest", "patient", "physician", "nurse", "system_admin"].map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                  selectedRole === role
                    ? "bg-teal-500 text-slate-950 font-bold shadow-md shadow-teal-500/20"
                    : "bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                {role}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search items..."
              className="w-full rounded-xl border border-slate-800 bg-slate-900/80 pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
            />
          </div>
        </div>

        {/* Table */}
        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-300">
              <thead className="border-b border-slate-800 bg-slate-950/40 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                <tr>
                  <th className="p-4">Item & Icon</th>
                  <th className="p-4">Target Route (Href)</th>
                  <th className="p-4">Target Role</th>
                  <th className="p-4">Order</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Auth Required</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      Loading dynamic navigation items...
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      No navigation items found for selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-teal-400">
                            <DynamicIcon name={item.icon || "Compass"} className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-white">{item.label}</span>
                            {item.badgeKey && (
                              <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-teal-400">
                                {item.badgeKey}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-slate-400">{item.href}</td>
                      <td className="p-4">
                        <Badge variant={item.role ? "outline" : "default"}>
                          {item.role || "Global (All Roles)"}
                        </Badge>
                      </td>
                      <td className="p-4 font-semibold text-white">{item.order}</td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.isActive
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {item.isActive ? "Active" : "Disabled"}
                        </span>
                      </td>
                      <td className="p-4 text-slate-400">
                        {item.requiresAuth ? "Yes" : "Public / No Auth"}
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => openEdit(item)}
                          className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
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

        {/* Create/Edit Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-6 space-y-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <h3 className="text-base font-bold text-white">
                  {editingItem ? "Edit Navigation Item" : "New Navigation Item"}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-white text-sm"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">Label *</label>
                    <input
                      type="text"
                      required
                      value={formData.label}
                      onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                      placeholder="e.g. Telemedicine"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">Href *</label>
                    <input
                      type="text"
                      required
                      value={formData.href}
                      onChange={(e) => setFormData({ ...formData, href: e.target.value })}
                      placeholder="e.g. /telemedicine"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">Lucide Icon Name</label>
                    <input
                      type="text"
                      value={formData.icon}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      placeholder="e.g. Video, Activity, FileText"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">Target Role</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-white"
                    >
                      <option value="all">Global (All Roles)</option>
                      <option value="guest">guest</option>
                      <option value="patient">patient</option>
                      <option value="physician">physician</option>
                      <option value="nurse">nurse</option>
                      <option value="system_admin">system_admin</option>
                    </select>
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
                    <label className="text-slate-300 font-semibold">Badge Key (Optional)</label>
                    <input
                      type="text"
                      value={formData.badgeKey}
                      onChange={(e) => setFormData({ ...formData, badgeKey: e.target.value })}
                      placeholder="e.g. unread_count"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-white"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-6 pt-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="rounded border-slate-800 text-teal-500"
                    />
                    <span className="text-slate-300">Is Active</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.requiresAuth}
                      onChange={(e) => setFormData({ ...formData, requiresAuth: e.target.checked })}
                      className="rounded border-slate-800 text-teal-500"
                    />
                    <span className="text-slate-300">Requires Authentication</span>
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    isLoading={createMutation.isPending || updateMutation.isPending}
                  >
                    {editingItem ? "Save Changes" : "Create Item"}
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
