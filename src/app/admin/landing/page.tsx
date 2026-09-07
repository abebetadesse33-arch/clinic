"use client";

import React, { useState } from "react";
import Link from "next/link";
import RoleGuard from "@/components/auth/RoleGuard";
import { useDynamicResource, useDynamicMutation } from "@/hooks/useDynamicResource";
import {
  LayoutTemplate,
  Plus,
  Edit2,
  Trash2,
  ArrowLeft,
  Search,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function AdminLandingPage() {
  const { data: sections, isLoading, refetch } = useDynamicResource<any[]>("landing-sections", { all: true });

  const createMutation = useDynamicMutation("landing-sections", "POST", { onSuccess: () => refetch() });
  const updateMutation = useDynamicMutation("landing-sections", "PUT", { onSuccess: () => refetch() });
  const deleteMutation = useDynamicMutation("landing-sections", "DELETE", { onSuccess: () => refetch() });

  const [editingSection, setEditingSection] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    sectionKey: "services",
    title: "",
    subtitle: "",
    content: "",
    order: 0,
    isActive: true,
  });

  const openCreate = () => {
    setEditingSection(null);
    setFormData({
      sectionKey: "services",
      title: "New Clinical Section",
      subtitle: "Section description",
      content: JSON.stringify({ items: [] }, null, 2),
      order: (sections?.length || 0) + 1,
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const openEdit = (sec: any) => {
    setEditingSection(sec);
    setFormData({
      sectionKey: sec.sectionKey,
      title: sec.title || "",
      subtitle: sec.subtitle || "",
      content: JSON.stringify(sec.content || {}, null, 2),
      order: sec.order ?? 0,
      isActive: sec.isActive !== false,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let parsedContent: any = {};
    try {
      parsedContent = JSON.parse(formData.content);
    } catch {
      alert("Invalid JSON format in content field. Please check syntax.");
      return;
    }

    const payload = {
      sectionKey: formData.sectionKey,
      title: formData.title || null,
      subtitle: formData.subtitle || null,
      content: parsedContent,
      order: Number(formData.order),
      isActive: formData.isActive,
    };

    if (editingSection) {
      await updateMutation.mutateAsync({ id: editingSection.id, ...payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this landing section?")) {
      await deleteMutation.mutateAsync({ id });
    }
  };

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
                <LayoutTemplate className="w-5 h-5" />
              </div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">
                Landing Page Sections Configuration
              </h1>
            </div>
            <p className="text-xs text-slate-400 pl-12">
              Dynamically order, add, and update public landing page sections (Hero, Trust, Services, FAQ, CTA).
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Link href="/" target="_blank">
              <Button variant="outline" className="space-x-2">
                <Eye className="w-4 h-4" />
                <span>View Live Landing Page</span>
              </Button>
            </Link>
            <Button onClick={openCreate} className="space-x-2">
              <Plus className="w-4 h-4" />
              <span>Add Section</span>
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-300">
              <thead className="border-b border-slate-800 bg-slate-950/40 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                <tr>
                  <th className="p-4">Order</th>
                  <th className="p-4">Section Key</th>
                  <th className="p-4">Title & Subtitle</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      Loading sections...
                    </td>
                  </tr>
                ) : !sections || sections.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      No landing sections found.
                    </td>
                  </tr>
                ) : (
                  sections.map((sec) => (
                    <tr key={sec.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="p-4 font-bold text-white">#{sec.order}</td>
                      <td className="p-4">
                        <Badge variant="outline" className="font-mono text-teal-400">
                          {sec.sectionKey}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-white">{sec.title || "—"}</div>
                        {sec.subtitle && (
                          <div className="text-[11px] text-slate-400 truncate max-w-sm">
                            {sec.subtitle}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            sec.isActive
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {sec.isActive ? "Active" : "Hidden"}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => openEdit(sec)}
                          className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(sec.id)}
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
                  {editingSection ? "Edit Landing Section" : "Add Landing Section"}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">Section Key *</label>
                    <select
                      value={formData.sectionKey}
                      onChange={(e) => setFormData({ ...formData, sectionKey: e.target.value })}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-white"
                    >
                      <option value="hero">hero</option>
                      <option value="trust">trust</option>
                      <option value="services">services</option>
                      <option value="pricing">pricing</option>
                      <option value="faq">faq</option>
                      <option value="cta">cta</option>
                      <option value="custom">custom</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">Display Order</label>
                    <input
                      type="number"
                      value={formData.order}
                      onChange={(e) => setFormData({ ...formData, order: Number(e.target.value) })}
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
                  <label className="text-slate-300 font-semibold">Subtitle</label>
                  <input
                    type="text"
                    value={formData.subtitle}
                    onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Content (Structured JSON)</label>
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
                    id="secActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded border-slate-800 text-teal-500"
                  />
                  <label htmlFor="secActive" className="text-slate-300 cursor-pointer">
                    Is Active
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                  <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" isLoading={createMutation.isPending || updateMutation.isPending}>
                    {editingSection ? "Save Changes" : "Create Section"}
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
