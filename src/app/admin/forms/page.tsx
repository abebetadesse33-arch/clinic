"use client";

import React, { useState } from "react";
import Link from "next/link";
import RoleGuard from "@/components/auth/RoleGuard";
import { useDynamicResource, useDynamicMutation } from "@/hooks/useDynamicResource";
import {
  FormInput,
  Plus,
  Edit2,
  Trash2,
  ArrowLeft,
  Search,
  ListPlus,
  CheckCircle2,
  AlertCircle,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DynamicForm } from "@/components/dynamic/DynamicForm";

export default function AdminFormsPage() {
  const { data: forms, isLoading, refetch } = useDynamicResource<any[]>("forms", { all: true });

  const createMutation = useDynamicMutation("forms", "POST", { onSuccess: () => refetch() });
  const updateMutation = useDynamicMutation("forms", "PUT", { onSuccess: () => refetch() });
  const deleteMutation = useDynamicMutation("forms", "DELETE", { onSuccess: () => refetch() });

  const [searchTerm, setSearchTerm] = useState("");
  const [editingForm, setEditingForm] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewForm, setPreviewForm] = useState<any | null>(null);

  // Form State
  const [formData, setFormData] = useState<any>({
    formKey: "",
    title: "",
    description: "",
    submitLabel: "Submit",
    actionEndpoint: "",
    isActive: true,
    fields: [],
  });

  const openCreate = () => {
    setEditingForm(null);
    setFormData({
      formKey: "patient_feedback",
      title: "Patient Feedback Survey",
      description: "Collect patient care experience ratings and notes",
      submitLabel: "Submit Feedback",
      actionEndpoint: "",
      isActive: true,
      fields: [
        { fieldName: "rating", label: "Care Rating (1-10)", fieldType: "number", required: true },
        { fieldName: "comments", label: "Comments", fieldType: "textarea", required: false },
      ],
    });
    setIsModalOpen(true);
  };

  const openEdit = (form: any) => {
    setEditingForm(form);
    setFormData({
      formKey: form.formKey,
      title: form.title,
      description: form.description || "",
      submitLabel: form.submitLabel || "Submit",
      actionEndpoint: form.actionEndpoint || "",
      isActive: form.isActive !== false,
      fields: form.fields || [],
    });
    setIsModalOpen(true);
  };

  const addField = () => {
    setFormData({
      ...formData,
      fields: [
        ...formData.fields,
        {
          fieldName: `field_${formData.fields.length + 1}`,
          label: "New Field",
          fieldType: "text",
          required: false,
          placeholder: "",
        },
      ],
    });
  };

  const updateField = (idx: number, updates: any) => {
    const updated = [...formData.fields];
    updated[idx] = { ...updated[idx], ...updates };
    setFormData({ ...formData, fields: updated });
  };

  const removeField = (idx: number) => {
    const updated = formData.fields.filter((_: any, i: number) => i !== idx);
    setFormData({ ...formData, fields: updated });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingForm) {
      await updateMutation.mutateAsync({ id: editingForm.id, ...formData });
    } else {
      await createMutation.mutateAsync(formData);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this form and all its fields?")) {
      await deleteMutation.mutateAsync({ id });
    }
  };

  const filteredForms = (forms || []).filter((f) => {
    return (
      !searchTerm ||
      f.formKey.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
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
                <FormInput className="w-5 h-5" />
              </div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">
                Dynamic Forms & Field Builder
              </h1>
            </div>
            <p className="text-xs text-slate-400 pl-12">
              Design database-backed forms, custom clinical questionnaires, and dynamic input fields.
            </p>
          </div>

          <Button onClick={openCreate} className="space-x-2">
            <Plus className="w-4 h-4" />
            <span>Create Form</span>
          </Button>
        </div>

        {/* Search */}
        <div className="flex justify-between items-center">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search forms..."
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
                  <th className="p-4">Form Key</th>
                  <th className="p-4">Title & Description</th>
                  <th className="p-4">Fields Count</th>
                  <th className="p-4">Submit Label</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      Loading forms...
                    </td>
                  </tr>
                ) : filteredForms.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      No dynamic forms configured.
                    </td>
                  </tr>
                ) : (
                  filteredForms.map((form) => (
                    <tr key={form.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="p-4 font-mono font-bold text-teal-400">{form.formKey}</td>
                      <td className="p-4">
                        <div className="font-bold text-white">{form.title}</div>
                        {form.description && (
                          <div className="text-[11px] text-slate-400 truncate max-w-xs">
                            {form.description}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <Badge variant="outline">{form.fields?.length || 0} fields</Badge>
                      </td>
                      <td className="p-4 text-slate-300">{form.submitLabel}</td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            form.isActive
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {form.isActive ? "Active" : "Draft"}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => setPreviewForm(form)}
                          title="Preview Form"
                          className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEdit(form)}
                          className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(form.id)}
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

        {/* Preview Modal */}
        {previewForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-900 p-6 space-y-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-base font-bold text-white">{previewForm.title}</h3>
                  {previewForm.description && (
                    <p className="text-xs text-slate-400">{previewForm.description}</p>
                  )}
                </div>
                <button onClick={() => setPreviewForm(null)} className="text-slate-400 hover:text-white">
                  ✕
                </button>
              </div>

              <DynamicForm
                fields={previewForm.fields || []}
                submitLabel={previewForm.submitLabel || "Submit"}
                onSubmit={async (vals) => {
                  alert("Live Preview submitted: " + JSON.stringify(vals, null, 2));
                }}
              />
            </div>
          </div>
        )}

        {/* Create/Edit Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900 p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <h3 className="text-base font-bold text-white">
                  {editingForm ? "Edit Form & Fields" : "Create New Dynamic Form"}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">Form Key *</label>
                    <input
                      type="text"
                      required
                      value={formData.formKey}
                      onChange={(e) => setFormData({ ...formData, formKey: e.target.value })}
                      placeholder="e.g. vitals_entry, appointment_request"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">Title *</label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g. Appointment Request Form"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Description</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-white"
                  />
                </div>

                {/* Field Builder */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs uppercase tracking-wider">
                      Form Fields ({formData.fields.length})
                    </span>
                    <button
                      type="button"
                      onClick={addField}
                      className="flex items-center space-x-1 text-teal-400 hover:text-teal-300 font-semibold text-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Field</span>
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {formData.fields.map((field: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center space-x-2 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80"
                      >
                        <input
                          type="text"
                          value={field.fieldName}
                          onChange={(e) => updateField(idx, { fieldName: e.target.value })}
                          placeholder="field_key"
                          className="w-28 rounded-lg border border-slate-800 bg-slate-900 px-2 py-1.5 text-[11px] text-white"
                        />
                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) => updateField(idx, { label: e.target.value })}
                          placeholder="Field Label"
                          className="flex-1 rounded-lg border border-slate-800 bg-slate-900 px-2 py-1.5 text-[11px] text-white"
                        />
                        <select
                          value={field.fieldType}
                          onChange={(e) => updateField(idx, { fieldType: e.target.value })}
                          className="w-28 rounded-lg border border-slate-800 bg-slate-900 px-2 py-1.5 text-[11px] text-white"
                        >
                          <option value="text">text</option>
                          <option value="number">number</option>
                          <option value="date">date</option>
                          <option value="select">select</option>
                          <option value="textarea">textarea</option>
                          <option value="checkbox">checkbox</option>
                          <option value="phone">phone</option>
                          <option value="email">email</option>
                        </select>
                        <label className="flex items-center space-x-1 text-[11px] text-slate-400">
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) => updateField(idx, { required: e.target.checked })}
                          />
                          <span>Req</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => removeField(idx)}
                          className="text-rose-400 hover:text-rose-300 p-1"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                  <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" isLoading={createMutation.isPending || updateMutation.isPending}>
                    {editingForm ? "Save Changes" : "Create Form"}
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
