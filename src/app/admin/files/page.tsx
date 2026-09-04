"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useClinic } from "@/context/ClinicContext";
import RoleGuard from "@/components/auth/RoleGuard";
import DocumentPreviewModal, { ClinicalDocument } from "@/components/documents/DocumentPreviewModal";
import DocumentUploadModal from "@/components/documents/DocumentUploadModal";
import {
  FolderOpen,
  Search,
  Filter,
  Download,
  UploadCloud,
  FileText,
  Pill,
  FlaskConical,
  Activity,
  Receipt,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Eye,
  Trash2,
  Tag,
  Calendar,
  User,
  Plus,
} from "lucide-react";

const CATEGORIES = [
  { id: "all", label: "All Documents", icon: FolderOpen },
  { id: "prescription", label: "e-Prescriptions", icon: Pill },
  { id: "lab_report", label: "Lab Reports", icon: FlaskConical },
  { id: "imaging", label: "Diagnostic Scans", icon: Activity },
  { id: "clinical_note", label: "Clinical Notes", icon: FileText },
  { id: "invoice", label: "Billing & Invoices", icon: Receipt },
];

export default function AdminClinicalFilesPage() {
  const { currentUser } = useClinic();
  const [documents, setDocuments] = useState<ClinicalDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewDoc, setPreviewDoc] = useState<ClinicalDocument | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const url = new URL("/api/v1/documents", window.location.origin);
      if (selectedCategory !== "all") url.searchParams.set("category", selectedCategory);
      if (searchQuery.trim()) url.searchParams.set("search", searchQuery.trim());

      const res = await fetch(url.toString(), { cache: "no-store" });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setDocuments(data.data);
      }
    } catch (err) {
      console.error("Failed to load documents:", err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory, searchQuery]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleDocumentDownload = async (doc: ClinicalDocument) => {
    try {
      await fetch(`/api/v1/documents/${doc.id}/access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser?.id || "00000000-0000-0000-0000-000000000001",
          accessType: "download",
        }),
      });
      showToast(`Downloaded: ${doc.fileName}`);
    } catch { }
  };

  const handleToggleVerification = async (docId: string, currentStatus?: string) => {
    const nextStatus = currentStatus === "verified" ? "unverified" : "verified";
    try {
      const res = await fetch(`/api/v1/documents/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verificationStatus: nextStatus,
          actorUserId: currentUser?.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Document status marked as ${nextStatus}`);
        fetchDocuments();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleArchiveDocument = async (docId: string) => {
    if (!confirm("Are you sure you want to archive this clinical record?")) return;
    try {
      const res = await fetch(`/api/v1/documents/${docId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        showToast("Document archived successfully.");
        fetchDocuments();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "140 KB";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <RoleGuard
      allowedRoles={["system_admin", "tenant_admin", "care_coordinator", "physician", "pharmacist", "radiologist", "lab_technician"]}
      fallbackTitle="Clinical Records Vault & File Management"
      fallbackMessage="This administrative portal manages confidential patient documents, e-prescriptions, and laboratory diagnostics."
    >
      <div className="space-y-6 pb-16 max-w-7xl mx-auto animate-fade-in">
        {/* Toast Alert */}
        {toastMsg && (
          <div
            className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl text-xs font-bold shadow-warm-lg flex items-center gap-2 animate-fade-in ${
              toastMsg.type === "success" ? "bg-[#005C4B] text-white" : "bg-rose-600 text-white"
            }`}
          >
            {toastMsg.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-white" />
            )}
            <span>{toastMsg.text}</span>
          </div>
        )}

        {/* Header Bar */}
        <div className="bg-slate-900 text-white rounded-3xl border border-slate-800 p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-bold uppercase tracking-wider">
                EHR Vault & Compliance
              </span>
              <span className="text-xs text-slate-400">Manager: {currentUser.fullName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-serif-heading">
              Clinical Records & File Vault
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              Manage, verify, and inspect electronic prescriptions, lab diagnostic sheets, radiology scans, and clinical notes.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setShowUploadModal(true)}
              className="btn-pill-primary py-2.5 px-4 text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload Record</span>
            </button>
            <button
              onClick={fetchDocuments}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
              title="Refresh Records"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-teal-400" : ""}`} />
            </button>
          </div>
        </div>

        {/* Category Tabs & Search Bar */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-[#E7E2D8] dark:border-slate-800 p-5 shadow-warm space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              {CATEGORIES.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setSelectedCategory(id)}
                  className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    selectedCategory === id
                      ? "bg-[#005C4B] text-white shadow-xs"
                      : "bg-[#FAF8F5] dark:bg-slate-800 text-[#33413C] dark:text-slate-300 border border-[#E7E2D8] dark:border-slate-700 hover:bg-[#E8F4F0]"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full lg:w-72 shrink-0">
              <Search className="w-4 h-4 text-[#687B74] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by patient, MRN, file..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-warm text-xs w-full pl-9 pr-3.5 py-2 rounded-2xl border border-[#E7E2D8] dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          {/* Files Grid / Table */}
          {isLoading ? (
            <div className="py-16 text-center text-xs text-[#687B74] space-y-2">
              <RefreshCw className="w-6 h-6 mx-auto text-[#005C4B] animate-spin" />
              <p>Scanning clinical file repository...</p>
            </div>
          ) : documents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="p-5 rounded-2xl bg-[#FAF8F5] dark:bg-slate-950 border border-[#E7E2D8] dark:border-slate-800 hover:border-[#005C4B]/50 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2.5">
                    {/* Top Row: Category & Status */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-[#005C4B] dark:text-emerald-400 bg-[#E8F4F0] dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                        {doc.category.replace("_", " ")}
                      </span>
                      <button
                        onClick={() => handleToggleVerification(doc.id, doc.verificationStatus)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          doc.verificationStatus === "verified"
                            ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300"
                            : "bg-amber-100 text-amber-900 border border-amber-300"
                        }`}
                        title="Click to toggle verification"
                      >
                        <ShieldCheck className="w-3 h-3" />
                        <span>{doc.verificationStatus || "Verified"}</span>
                      </button>
                    </div>

                    {/* File Title */}
                    <div>
                      <h4 className="font-bold text-sm text-[#162E27] dark:text-white line-clamp-1" title={doc.fileName}>
                        {doc.fileName}
                      </h4>
                      <p className="text-[11px] text-[#687B74] dark:text-slate-400">
                        Patient: <strong className="text-[#162E27] dark:text-slate-200">{doc.patientName || "Sara Tesfaye"}</strong> • {doc.patientMrn || "MRN-2026"}
                      </p>
                    </div>

                    {/* Tags */}
                    {doc.tags && doc.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {doc.tags.slice(0, 3).map((tag, idx) => (
                          <span
                            key={idx}
                            className="text-[9px] bg-white dark:bg-slate-800 border border-[#E7E2D8] dark:border-slate-700 text-[#687B74] dark:text-slate-300 px-2 py-0.5 rounded-md font-medium"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Metadata & Actions */}
                  <div className="pt-3 border-t border-[#E7E2D8] dark:border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-[#687B74] dark:text-slate-400 font-mono">
                      {formatFileSize(doc.fileSize)} • {new Date(doc.createdAt).toLocaleDateString()}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setPreviewDoc(doc)}
                        className="p-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-[#E8F4F0] dark:hover:bg-slate-700 border border-[#E7E2D8] dark:border-slate-700 text-[#005C4B] dark:text-emerald-400 transition-all"
                        title="Preview Document"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDocumentDownload(doc)}
                        className="p-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-[#E8F4F0] dark:hover:bg-slate-700 border border-[#E7E2D8] dark:border-slate-700 text-[#005C4B] dark:text-emerald-400 transition-all"
                        title="Download Document"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleArchiveDocument(doc.id)}
                        className="p-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-[#E7E2D8] dark:border-slate-700 text-rose-600 transition-all"
                        title="Archive File"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center text-xs text-[#687B74] space-y-2">
              <FolderOpen className="w-8 h-8 mx-auto text-[#687B74]/40" />
              <p>No clinical documents found matching your query.</p>
            </div>
          )}
        </div>
      </div>

      {/* In-App Document Preview Modal */}
      {previewDoc && (
        <DocumentPreviewModal
          document={previewDoc}
          onClose={() => setPreviewDoc(null)}
          onDownload={handleDocumentDownload}
        />
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <DocumentUploadModal
          onClose={() => setShowUploadModal(false)}
          onUploaded={() => {
            showToast("Clinical document successfully registered & uploaded.");
            fetchDocuments();
          }}
        />
      )}
    </RoleGuard>
  );
}
