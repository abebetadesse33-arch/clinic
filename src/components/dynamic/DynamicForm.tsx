"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

export interface FormFieldOption {
  value: string;
  label: string;
}

export interface DynamicFormField {
  name?: string;
  fieldName?: string; // from DB
  label: string;
  type?: "text" | "number" | "date" | "select" | "multiselect" | "textarea" | "checkbox" | "radio" | "file" | "phone" | "email";
  fieldType?: string; // from DB
  placeholder?: string | null;
  required?: boolean;
  options?: FormFieldOption[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  defaultValue?: any;
}

export interface DynamicFormProps {
  fields: DynamicFormField[];
  onSubmit: (values: Record<string, any>) => Promise<void> | void;
  defaultValues?: Record<string, any>;
  submitLabel?: string;
  isLoading?: boolean;
  className?: string;
}

export function DynamicForm({
  fields,
  onSubmit,
  defaultValues = {},
  submitLabel = "Submit",
  isLoading = false,
  className = "",
}: DynamicFormProps) {
  // Initialize form state
  const [formData, setFormData] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = { ...defaultValues };
    fields.forEach((f) => {
      const key = f.fieldName || f.name || "";
      if (initial[key] === undefined) {
        initial[key] = f.defaultValue ?? (f.type === "checkbox" || f.fieldType === "checkbox" ? false : "");
      }
    });
    return initial;
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    fields.forEach((field) => {
      const key = field.fieldName || field.name || "";
      const val = formData[key];
      const type = field.fieldType || field.type || "text";

      if (field.required) {
        if (type === "checkbox" && !val) {
          newErrors[key] = `${field.label} must be checked`;
        } else if (val === undefined || val === null || String(val).trim() === "") {
          newErrors[key] = `${field.label} is required`;
        }
      }

      if (val) {
        if (type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
          newErrors[key] = "Please enter a valid email address";
        }
        if (type === "phone" && !/^[\d\+\-\s\(\)]{7,20}$/.test(val)) {
          newErrors[key] = "Please enter a valid phone number";
        }
        if (field.validation?.pattern && !new RegExp(field.validation.pattern).test(val)) {
          newErrors[key] = field.validation.message || "Invalid format";
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setIsSubmitting(true);
      setSubmitSuccess(false);
      await onSubmit(formData);
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 4000);
    } catch (err: any) {
      setErrors({ form: err.message || "An error occurred while submitting." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${className}`}>
      {errors.form && (
        <div className="flex items-center space-x-2 rounded-xl border border-rose-500/30 bg-rose-950/30 p-3 text-xs text-rose-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errors.form}</span>
        </div>
      )}

      {submitSuccess && (
        <div className="flex items-center space-x-2 rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3 text-xs text-emerald-400">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Form submitted successfully!</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map((field) => {
          const key = field.fieldName || field.name || "";
          const type = field.fieldType || field.type || "text";
          const error = errors[key];
          const isFullWidth = type === "textarea" || type === "multiselect";

          return (
            <div key={key} className={`space-y-1.5 ${isFullWidth ? "md:col-span-2" : ""}`}>
              <label className="block text-xs font-semibold text-slate-300">
                {field.label}
                {field.required && <span className="text-rose-400 ml-1">*</span>}
              </label>

              {type === "textarea" ? (
                <textarea
                  value={formData[key] || ""}
                  onChange={(e) => handleChange(key, e.target.value)}
                  placeholder={field.placeholder || ""}
                  rows={4}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                />
              ) : type === "select" ? (
                <select
                  value={formData[key] || ""}
                  onChange={(e) => handleChange(key, e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                >
                  <option value="">{field.placeholder || "Select option..."}</option>
                  {(field.options || []).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : type === "checkbox" ? (
                <label className="flex items-center space-x-2.5 cursor-pointer py-1">
                  <input
                    type="checkbox"
                    checked={Boolean(formData[key])}
                    onChange={(e) => handleChange(key, e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-teal-500 focus:ring-teal-500/50"
                  />
                  <span className="text-xs text-slate-400">{field.placeholder || field.label}</span>
                </label>
              ) : (
                <input
                  type={type === "phone" ? "tel" : type}
                  value={formData[key] ?? ""}
                  onChange={(e) =>
                    handleChange(key, type === "number" ? Number(e.target.value) : e.target.value)
                  }
                  placeholder={field.placeholder || ""}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                />
              )}

              {error && <p className="text-[11px] text-rose-400">{error}</p>}
            </div>
          );
        })}
      </div>

      <div className="pt-2">
        <Button
          type="submit"
          isLoading={isSubmitting || isLoading}
          className="w-full md:w-auto min-w-[140px]"
        >
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
