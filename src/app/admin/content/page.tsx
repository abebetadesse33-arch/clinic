"use client";

import React, { useState } from "react";
import Link from "next/link";
import RoleGuard from "@/components/auth/RoleGuard";
import { useDynamicResource, useDynamicMutation } from "@/hooks/useDynamicResource";
import {
  FileText,
  Plus,
  Edit2,
  Trash2,
  ArrowLeft,
  Search,
  Code2,
  Globe,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function AdminContentPage() {
  const { data: contents, isLoading, refetch } = useDynamicResource<any[]>("content", { all: true });

  const createMutation = useDynamicMutation("content", "POST", { onSuccess: () => refetch() });
  const updateMutation = useDynamicMutation("content", "PUT", { onSuccess: () => refetch() });
  const deleteMutation = useDynamicMutation("content", "DELETE", { onSuccess: () => refetch() });

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("all");
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form
  const [formData, setFormData] = useState({
    pageKey: "",
    sectionKey: "",
    contentType: "json",
    language: "en",
    content: "",
    version: 1,
    isActive: true,
  });

  const openCreate = () => {
    setEditingItem(null);
    setFormData({
      pageKey: "landing",
      sectionKey: "hero",
      contentType: "json",
      language: "en",
      content: JSON.stringify({ title: "New Section", subtitle: "Dynamic CMS description" }, null, 2),
      version: 1,
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const openEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      pageKey: item.pageKey,
      sectionKey: item.sectionKey,
      contentType: item.contentType || "json",
      language: item.language || "en",
      content:
        typeof item.content === "string"
          ? item.content
          : JSON.stringify(item.content, null, 2),
      version: item.version || 1,
      isActive: item.isActive !== false,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let parsedContent: any = formData.content;
    if (formData.contentType === "json") {
      try {
        parsedContent = JSON.parse(formData.content);
      } catch {
        alert("Invalid JSON format. Please fix syntax before saving.");
        return;
      }
    }

    const payload = {
      pageKey: formData.pageKey,
      sectionKey: formData.sectionKey,
      contentType: formData.contentType,
      language: formData.language,
      content: parsedContent,
      version: Number(formData.version),
      isActive: formData.isActive,
    };

    if (editingItem) {
      await updateMutation.mutateAsync({ id: editingItem.id, ...payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this content record?")) {
      await deleteMutation.mutateAsync({ id });
    }
  };

  const filteredContents = (contents || []).filter((item) => {
    const matchesLang = selectedLanguage === "all" || item.language === selectedLanguage;
    const matchesSearch =
      !searchTerm ||
      item.pageKey.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sectionKey.toLowerCase().includes(searchTerm.toLowerCase());
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
                <FileText className="w-5 h-5" />
              </div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">
                CMS Page Content Configuration
              </h1>
            </div>
            <p className="text-xs text-slate-400 pl-12">
              Manage database-driven text, HTML, markdown, and structured JSON content across pages.
            </p>
          </div>

          <Button onClick={openCreate} className="space-x-2">
            <Plus className="w-4 h-4" />
            <span>Add Page Content</span>
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            {["all", "en", "am", "om", "ti"].map((lang) => (
              <button
                key={lang}
                onClick={() => setSelectedLanguage(lang)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold uppercase transition-all ${
                  selectedLanguage === lang
                    ? "bg-teal-500 text-slate-950 font-bold"
                    : "bg-slate-900 text-slate-400 border border-slate-800"
                }`}
              >
                {lang}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search page or section..."
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
                  <th className="p-4">Page Key</th>
                  <th className="p-4">Section Key</th>
                  <th className="p-4">Format</th>
                  <th className="p-4">Lang</th>
                  <th className="p-4">Version</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      Loading CMS content records...
                    </td>
                  </tr>
                ) : filteredContents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      No content records found.
                    </td>
                  </tr>
                ) : (
                  filteredContents.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="p-4 font-bold text-white">{item.pageKey}</td>
                      <td className="p-4 font-mono text-teal-400">{item.sectionKey}</td>
                      <td className="p-4">
                        <Badge variant="outline">{item.contentType}</Badge>
                      </td>
                      <td className="p-4 uppercase font-semibold text-slate-400">{item.language}</td>
                      <td className="p-4 text-slate-300">v{item.version}</td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.isActive
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {item.isActive ? "Active" : "Archived"}
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
            <div className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900 p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <h3 className="text-base font-bold text-white">
                  {editingItem ? "Edit Content Block" : "New Content Block"}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
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
                      placeholder="e.g. landing, patient-health, about"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">Section Key *</label>
                    <input
                      type="text"
                      required
                      value={formData.sectionKey}
                      onChange={(e) => setFormData({ ...formData, sectionKey: e.target.value })}
                      placeholder="e.g. hero, services, pricing"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">Content Type</label>
                    <select
                      value={formData.contentType}
                      onChange={(e) => setFormData({ ...formData, contentType: e.target.value })}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-white"
                    >
                      <option value="json">JSON Object</option>
                      <option value="text">Plain Text</option>
                      <option value="markdown">Markdown</option>
                      <option value="html">HTML</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">Language</label>
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
                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">Version</label>
                    <input
                      type="number"
                      value={formData.version}
                      onChange={(e) => setFormData({ ...formData, version: Number(e.target.value) })}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Content (JSON / Text / HTML)</label>
                  <textarea
                    rows={8}
                    required
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="w-full font-mono rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-white"
                  />
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded border-slate-800 text-teal-500"
                  />
                  <label htmlFor="isActive" className="text-slate-300 cursor-pointer">
                    Is Active
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                  <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" isLoading={createMutation.isPending || updateMutation.isPending}>
                    {editingItem ? "Save Changes" : "Create Block"}
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
