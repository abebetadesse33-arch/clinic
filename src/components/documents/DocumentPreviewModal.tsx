"use client";

import React, { useState } from "react";
import {
  X,
  Download,
  FileText,
  ShieldCheck,
  Calendar,
  User,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  Pill,
  FlaskConical,
  Activity,
  Receipt,
  CheckCircle2,
} from "lucide-react";

export interface ClinicalDocument {
  id: string;
  fileName: string;
  fileUrl: string;
  category: "prescription" | "lab_report" | "imaging" | "clinical_note" | "invoice" | string;
  mimeType: string;
  fileSize?: number;
  patientId?: string;
  patientName?: string;
  patientMrn?: string;
  uploaderName?: string;
  uploaderRole?: string;
  verificationStatus?: string;
  tags?: string[];
  createdAt: string;
}

interface DocumentPreviewModalProps {
  document: ClinicalDocument | null;
  onClose: () => void;
  onDownload?: (doc: ClinicalDocument) => void;
  pageMode?: boolean;
}

export default function DocumentPreviewModal({
  document: clinicalDoc,
  onClose,
  onDownload,
  pageMode = false,
}: DocumentPreviewModalProps) {
  const [zoomLevel, setZoomLevel] = useState(100);

  if (!clinicalDoc) return null;

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case "prescription":
        return <Pill className="w-4 h-4 text-emerald-600" />;
      case "lab_report":
        return <FlaskConical className="w-4 h-4 text-blue-600" />;
      case "imaging":
        return <Activity className="w-4 h-4 text-purple-600" />;
      case "invoice":
        return <Receipt className="w-4 h-4 text-amber-600" />;
      default:
        return <FileText className="w-4 h-4 text-teal-600" />;
    }
  };

  const isImage = clinicalDoc.mimeType.startsWith("image/") || clinicalDoc.fileName.match(/\.(png|jpg|jpeg|webp)$/i);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "140 KB";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDownloadClick = () => {
    if (onDownload) {
      onDownload(clinicalDoc);
    }
    // Trigger download of demo or actual URL
    const a = window.document.createElement("a");
    a.href = clinicalDoc.fileUrl || "#";
    a.download = clinicalDoc.fileName;
    a.target = "_blank";
    a.click();
  };

  return (
    <div className={pageMode ? "min-h-screen bg-slate-100 dark:bg-slate-950 p-4 sm:p-8" : "fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 animate-fade-in"}>
      <div className={pageMode ? "bg-white dark:bg-slate-900 rounded-3xl border border-[#E7E2D8] dark:border-slate-800 shadow-2xl w-full max-w-4xl min-h-[calc(100vh-2rem)] mx-auto flex flex-col overflow-hidden" : "bg-white dark:bg-slate-900 rounded-3xl border border-[#E7E2D8] dark:border-slate-800 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"}>
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-[#F2EFE9] dark:border-slate-800 flex items-center justify-between bg-[#FAF8F5] dark:bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 border border-[#E7E2D8] dark:border-slate-700 flex items-center justify-center shadow-xs">
              {getCategoryIcon(clinicalDoc.category)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-[#162E27] dark:text-white truncate max-w-md">
                  {clinicalDoc.fileName}
                </h3>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> {clinicalDoc.verificationStatus || "Verified"}
                </span>
              </div>
              <p className="text-xs text-[#687B74] dark:text-slate-400">
                Patient: <strong className="text-[#162E27] dark:text-slate-200">{clinicalDoc.patientName || "Verified Patient"}</strong> • {clinicalDoc.patientMrn || "MRN-2026"} • {formatFileSize(clinicalDoc.fileSize)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadClick}
              className="btn-pill-primary text-xs py-2 px-3.5 flex items-center gap-1.5 shadow-sm"
              title="Download Medical Record"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-center text-[#687B74] dark:text-slate-400 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewer Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100 dark:bg-slate-950/90 flex flex-col items-center justify-center min-h-[380px]">
          {isImage ? (
            <div className="overflow-auto max-w-full max-h-[500px] flex items-center justify-center">
              <img
                src={clinicalDoc.fileUrl}
                alt={clinicalDoc.fileName}
                style={{ transform: `scale(${zoomLevel / 100})`, transition: "transform 0.2s" }}
                className="rounded-xl shadow-lg max-w-full object-contain"
                onError={(e) => {
                  // Fallback to placeholder if image asset missing
                  (e.target as any).src = "https://placehold.co/800x600/0f172a/38bdf8?text=Medical+Diagnostic+Scan";
                }}
              />
            </div>
          ) : (
            /* PDF & Electronic Document Sheet Simulation */
            <div
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "top center", transition: "transform 0.2s" }}
              className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl shadow-xl p-8 space-y-6 text-[#162E27] dark:text-slate-100 text-xs font-sans"
            >
              {/* Document Header */}
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#005C4B] text-white flex items-center justify-center font-bold text-xs">
                    NM
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-[#005C4B] dark:text-emerald-400">
                      NiniMed Healthcare Network
                    </h4>
                    <p className="text-[10px] text-[#687B74] dark:text-slate-400">
                      Official Verified Medical Record & Diagnostic File
                    </p>
                  </div>
                </div>
                <div className="text-right text-[11px]">
                  <div className="font-bold font-mono">DOC ID: {clinicalDoc.id.slice(0, 8).toUpperCase()}</div>
                  <div className="text-[#687B74] dark:text-slate-400">Issued: {new Date(clinicalDoc.createdAt).toLocaleDateString()}</div>
                </div>
              </div>

              {/* Patient & Practitioner Summary */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-[#FAF8F5] dark:bg-slate-950 border border-[#E7E2D8] dark:border-slate-800">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#687B74] dark:text-slate-400 block">Patient Details</span>
                  <div className="font-bold text-sm text-[#162E27] dark:text-white">{clinicalDoc.patientName || "Sara Tesfaye"}</div>
                  <div className="text-[11px] text-[#687B74] dark:text-slate-400">MRN: {clinicalDoc.patientMrn || "MRN-2026-9041"}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#687B74] dark:text-slate-400 block">Authorizing Clinician</span>
                  <div className="font-bold text-sm text-[#162E27] dark:text-white">{clinicalDoc.uploaderName || "Dr. Aster Solomon, MD"}</div>
                  <div className="text-[11px] text-[#687B74] dark:text-slate-400">Role: {clinicalDoc.uploaderRole || "Physician"}</div>
                </div>
              </div>

              {/* Dynamic Content Based on Category */}
              {clinicalDoc.category === "prescription" ? (
                <div className="space-y-3">
                  <span className="font-bold text-xs uppercase tracking-wider text-[#005C4B] dark:text-emerald-400 block">
                    e-Prescription Directives
                  </span>
                  <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-1">
                    <div className="font-bold text-[#162E27] dark:text-white">1. Metformin Hydrochloride 500mg Oral Tablet</div>
                    <p className="text-[#687B74] dark:text-slate-300 text-[11px]">Sig: Take 1 tablet by mouth twice daily with meals. Dispense #60. Refills: 3.</p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-1">
                    <div className="font-bold text-[#162E27] dark:text-white">2. Lisinopril 10mg Oral Tablet</div>
                    <p className="text-[#687B74] dark:text-slate-300 text-[11px]">Sig: Take 1 tablet once daily every morning. Dispense #30. Refills: 3.</p>
                  </div>
                </div>
              ) : clinicalDoc.category === "lab_report" ? (
                <div className="space-y-3">
                  <span className="font-bold text-xs uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                    Laboratory Diagnostics Panel
                  </span>
                  <table className="w-full text-left text-xs border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-[10px] uppercase font-bold text-slate-600 dark:text-slate-300">
                      <tr>
                        <th className="p-2.5">Test Parameter</th>
                        <th className="p-2.5">Observed Value</th>
                        <th className="p-2.5">Reference Range</th>
                        <th className="p-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      <tr>
                        <td className="p-2.5 font-bold">Hemoglobin A1c (HbA1c)</td>
                        <td className="p-2.5 font-mono font-bold text-emerald-700 dark:text-emerald-400">6.4 %</td>
                        <td className="p-2.5 text-slate-500">4.0 - 5.6 % (Target &lt; 7.0%)</td>
                        <td className="p-2.5"><span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Optimal</span></td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold">Fasting Blood Glucose</td>
                        <td className="p-2.5 font-mono font-bold text-emerald-700 dark:text-emerald-400">104 mg/dL</td>
                        <td className="p-2.5 text-slate-500">70 - 99 mg/dL</td>
                        <td className="p-2.5"><span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full">Borderline</span></td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold">Total Cholesterol</td>
                        <td className="p-2.5 font-mono font-bold text-emerald-700 dark:text-emerald-400">182 mg/dL</td>
                        <td className="p-2.5 text-slate-500">&lt; 200 mg/dL</td>
                        <td className="p-2.5"><span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Normal</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-[#FAF8F5] dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                  <span className="font-bold text-[#162E27] dark:text-white block">Medical Record Content Summary</span>
                  <p className="text-[#687B74] dark:text-slate-300">
                    Comprehensive clinical documentation uploaded to patient chart. Authenticated by licensed attending physician and verified by clinic operations.
                  </p>
                </div>
              )}

              {/* Tags & Security Footprint */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#687B74] dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#005C4B] dark:text-emerald-400" />
                  <span>256-bit Encrypted · HIPAA & Ethiopian DPA Compliant Audit Vault</span>
                </div>
                <div className="flex items-center gap-1 font-mono">
                  <span>SHA256: e8f94...821b</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Zoom & Action Bar */}
        <div className="px-6 py-3 border-t border-[#F2EFE9] dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoomLevel((z) => Math.max(50, z - 10))}
              className="p-1.5 rounded-lg border border-[#E7E2D8] dark:border-slate-700 hover:bg-[#FAF8F5] dark:hover:bg-slate-800"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4 text-[#687B74] dark:text-slate-300" />
            </button>
            <span className="font-mono text-xs font-bold text-[#162E27] dark:text-white w-12 text-center">
              {zoomLevel}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(150, z + 10))}
              className="p-1.5 rounded-lg border border-[#E7E2D8] dark:border-slate-700 hover:bg-[#FAF8F5] dark:hover:bg-slate-800"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4 text-[#687B74] dark:text-slate-300" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="btn-pill-secondary text-xs py-1.5 px-4 font-bold"
            >
              Close Preview
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
