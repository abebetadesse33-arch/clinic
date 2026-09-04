"use client";

import React, { useState } from "react";
import Link from "next/link";
import RoleGuard from "@/components/auth/RoleGuard";
import { useDynamicResource, useDynamicMutation } from "@/hooks/useDynamicResource";
import {
  Languages,
  Plus,
  Edit2,
  Trash2,
  ArrowLeft,
  Search,
  Globe2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function AdminTranslationsPage() {
  const { data: translations, isLoading, refetch } = useDynamicResource<any[]>("translations", { all: true });

  const createMutation = useDynamicMutation("translations", "POST", { onSuccess: () => refetch() });
  const updateMutation = useDynamicMutation("translations", "PUT", { onSuccess: () => refetch() });
  const deleteMutation = useDynamicMutation("translations", "DELETE", { onSuccess: () => refetch() });

  const [selectedLang, setSelectedLang] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form
  const [formData, setFormData] = useState({
    key: "",
    language: "en",
    value: "",
    isActive: true,
  });

  const openCreate = () => {
    setEditingItem(null);
    setFormData({
      key: "",
      language: selectedLang === "all" ? "en" : selectedLang,
      value: "",
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const openEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      key: item.key,
      language: item.language,
      value: item.value,
      isActive: item.isActive !== false,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      await updateMutation.mutateAsync({ id: editingItem.id, ...formData });
    } else {
      await createMutation.mutateAsync(formData);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this translation entry?")) {
      await deleteMutation.mutateAsync({ id });
    }
  };

  const filtered = (translations || []).filter((item) => {
    const matchesLang = selectedLang === "all" || item.language === selectedLang;
    const matchesSearch =
      !searchTerm ||
      item.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.value.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesLang && matchesSearch;
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
                <Languages className="w-5 h-5" />
              </div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">
                Internationalization (i18n) Translations
              </h1>
            </div>
            <p className="text-xs text-slate-400 pl-12">
              Database-driven UI translations supporting English, Amharic (አማርኛ), Oromo (Afaan Oromoo), and Tigrinya (ትግርኛ).
            </p>
          </div>

          <Button onClick={openCreate} className="space-x-2">
            <Plus className="w-4 h-4" />
            <span>Add Translation</span>
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            {[
              { code: "all", label: "All Languages" },
              { code: "en", label: "English (en)" },
              { code: "am", label: "Amharic (am)" },
              { code: "om", label: "Oromo (om)" },
              { code: "ti", label: "Tigrinya (ti)" },
            ].map((lang) => (
              <button
                key={lang.code}
                onClick={() => setSelectedLang(lang.code)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  selectedLang === lang.code
                    ? "bg-teal-500 text-slate-950 font-bold"
                    : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-white"
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search translation key or text..."
              className="w-full rounded-xl border border-slate-800 bg-slate-900/80 pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500"
            />
          </div>
        </div>

        {/* Table */}
        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-300">
              <thead className="border-b border-slate-800 bg-slate-950/40 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                <tr>
                  <th className="p-4">Translation Key</th>
                  <th className="p-4">Language</th>
                  <th className="p-4">Translated Value</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      Loading translations...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      No translation entries found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="p-4 font-mono font-bold text-teal-400">{item.key}</td>
                      <td className="p-4">
                        <Badge variant="outline" className="uppercase">
                          {item.language}
                        </Badge>
                      </td>
                      <td className="p-4 text-white font-medium max-w-md">{item.value}</td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.isActive
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {item.isActive ? "Active" : "Inactive"}
                        </span>
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

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-6 space-y-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <h3 className="text-base font-bold text-white">
                  {editingItem ? "Edit Translation" : "Add Translation"}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">Key *</label>
                    <input
                      type="text"
                      required
                      value={formData.key}
                      onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                      placeholder="e.g. nav.dashboard"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">Language *</label>
                    <select
                      value={formData.language}
                      onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-white"
                    >
                      <option value="en">English (en)</option>
                      <option value="am">Amharic (am)</option>
                      <option value="om">Oromo (om)</option>
                      <option value="ti">Tigrinya (ti)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Translated Text *</label>
                  <textarea
                    rows={4}
                    required
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    placeholder="Enter translated string..."
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-white"
                  />
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <input
                    type="checkbox"
                    id="tActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded border-slate-800 text-teal-500"
                  />
                  <label htmlFor="tActive" className="text-slate-300 cursor-pointer">
                    Is Active
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                  <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" isLoading={createMutation.isPending || updateMutation.isPending}>
                    {editingItem ? "Save Changes" : "Create Translation"}
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
