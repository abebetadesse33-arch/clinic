"use client";

import React, { useState } from "react";
import {
  X,
  UploadCloud,
  FileText,
  CheckCircle2,
  RefreshCw,
  User,
  ShieldCheck,
  Pill,
  FlaskConical,
  Activity,
  Receipt,
} from "lucide-react";

interface DocumentUploadModalProps {
  onClose: () => void;
  onUploaded: () => void;
  defaultPatientId?: string;
  pageMode?: boolean;
}

export default function DocumentUploadModal({
  onClose,
  onUploaded,
  defaultPatientId,
  pageMode = false,
}: DocumentUploadModalProps) {
  const [patientId, setPatientId] = useState(defaultPatientId || "00000000-0000-0000-0000-000000000001");
  const [patientName, setPatientName] = useState("Sara Tesfaye");
  const [category, setCategory] = useState<"prescription" | "lab_report" | "imaging" | "clinical_note" | "invoice">("lab_report");
  const [fileName, setFileName] = useState("");
  const [tagsString, setTagsString] = useState("Verified Lab, Panel 2026");
  const [isConfidential, setIsConfidential] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileName.trim()) {
      setErrorMsg("Please enter a valid document file name.");
      return;
    }

    setIsUploading(true);
    setErrorMsg("");
    try {
      const tags = tagsString.split(",").map((t) => t.trim()).filter(Boolean);
      const res = await fetch("/api/v1/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          category,
          fileName: fileName.trim(),
          fileUrl: `/uploads/${fileName.trim()}`,
          mimeType: fileName.endsWith(".png") || fileName.endsWith(".jpg") ? "image/png" : "application/pdf",
          fileSize: 245000,
          tags,
          isConfidential,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onUploaded();
        onClose();
      } else {
        setErrorMsg(data.error || "Failed to upload document.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Network error uploading document.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={pageMode ? "min-h-screen bg-slate-100 dark:bg-slate-950 p-4 sm:p-8" : "fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 animate-fade-in"}>
      <div className={pageMode ? "bg-white dark:bg-slate-900 rounded-3xl border border-[#E7E2D8] dark:border-slate-800 shadow-2xl w-full max-w-lg mx-auto overflow-hidden" : "bg-white dark:bg-slate-900 rounded-3xl border border-[#E7E2D8] dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden"}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#F2EFE9] dark:border-slate-800 flex items-center justify-between bg-[#FAF8F5] dark:bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#E8F4F0] dark:bg-emerald-950/60 text-[#005C4B] dark:text-emerald-300 flex items-center justify-center">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#162E27] dark:text-white">Upload Clinical Document</h3>
              <p className="text-[10px] text-[#687B74] dark:text-slate-400">Attach to patient medical record vault</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-center text-[#687B74] dark:text-slate-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleFormSubmit} className="p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-medium">
              {errorMsg}
            </div>
          )}

          {/* Patient Selector */}
          <div className="space-y-1">
            <label className="font-bold text-[#162E27] dark:text-slate-200">Patient Recipient</label>
            <select
              value={patientId}
              onChange={(e) => {
                setPatientId(e.target.value);
                const selectedText = e.target.options[e.target.selectedIndex].text;
                setPatientName(selectedText.split(" (")[0]);
              }}
              className="input-warm w-full p-2.5 rounded-xl border border-[#E7E2D8] dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="00000000-0000-0000-0000-000000000001">Sara Tesfaye (MRN-2026-9041)</option>
              <option value="00000000-0000-0000-0000-000000000002">Dawit Haile (MRN-2026-7832)</option>
              <option value="00000000-0000-0000-0000-000000000003">Almaz Kebede (MRN-2026-5519)</option>
            </select>
          </div>

          {/* Document Category */}
          <div className="space-y-1">
            <label className="font-bold text-[#162E27] dark:text-slate-200">Medical Document Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="input-warm w-full p-2.5 rounded-xl border border-[#E7E2D8] dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="prescription">💊 e-Prescription / Medication Slip</option>
              <option value="lab_report">🧪 Laboratory Diagnostics & Pathology Report</option>
              <option value="imaging">🩻 Diagnostic Imaging / Scan (X-Ray, Ultrasound, CT)</option>
              <option value="clinical_note">📋 Clinical SOAP Note & Discharge Summary</option>
              <option value="invoice">🧾 Billing Invoice & POS Receipt</option>
            </select>
          </div>

          {/* File Name */}
          <div className="space-y-1">
            <label className="font-bold text-[#162E27] dark:text-slate-200">File Name & Title</label>
            <input
              type="text"
              placeholder="e.g. CBC_Blood_Count_Sept2026.pdf"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="input-warm w-full p-2.5 rounded-xl border border-[#E7E2D8] dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              required
            />
          </div>

          {/* Clinical Tags */}
          <div className="space-y-1">
            <label className="font-bold text-[#162E27] dark:text-slate-200">Clinical Tags (comma-separated)</label>
            <input
              type="text"
              placeholder="e.g. Biochemistry, Routine, HbA1c, Verified"
              value={tagsString}
              onChange={(e) => setTagsString(e.target.value)}
              className="input-warm w-full p-2.5 rounded-xl border border-[#E7E2D8] dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Confidential Toggle */}
          <div className="p-3 rounded-xl bg-[#FAF8F5] dark:bg-slate-950 border border-[#E7E2D8] dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="font-bold text-[#162E27] dark:text-white block">Specialist Confidential Record</span>
              <p className="text-[10px] text-[#687B74] dark:text-slate-400">Restricts visibility to authorized medical personnel only</p>
            </div>
            <input
              type="checkbox"
              checked={isConfidential}
              onChange={(e) => setIsConfidential(e.target.checked)}
              className="w-4 h-4 rounded text-[#005C4B] focus:ring-[#005C4B]"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-pill-secondary text-xs py-2 px-4"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="btn-pill-primary text-xs py-2 px-5 flex items-center gap-1.5 shadow-sm"
            >
              {isUploading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
              <span>Upload & Register File</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
