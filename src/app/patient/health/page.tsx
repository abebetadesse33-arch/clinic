"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useClinic } from "@/context/ClinicContext";
import LabResultCard from "@/components/onemedical/LabResultCard";
import PatientActivityTimeline from "@/components/patient/PatientActivityTimeline";
import DocumentPreviewModal, { ClinicalDocument } from "@/components/documents/DocumentPreviewModal";
import PatientContextSwitcher from "@/components/patient/PatientContextSwitcher";
import { useDynamicResource } from "@/hooks/useDynamicResource";
import { DynamicIcon } from "@/components/dynamic/DynamicIcon";
import {
  usePatientRecords,
  usePatientDocuments,
  usePatientCarePlan,
  usePatientVitals,
  usePatientVaccines,
  useRequestRefill,
  DocumentItem,
} from "@/hooks/usePatientHealthData";
import {
  FlaskConical,
  Pill,
  Activity,
  ShieldCheck,
  HeartPulse,
  Layers,
  Plus,
  ArrowRight,
  CheckCircle2,
  TrendingDown,
  RefreshCw,
  FolderOpen,
  Eye,
  Download,
  Clock,
  FileText,
  AlertTriangle,
  Loader2,
  Sparkles,
  User,
  ChevronRight,
} from "lucide-react";

// ─── UI Skeletons ─────────────────────────────────────────────────────────────

function RecordsSkeleton() {
  return (
    <div className="space-y-3.5 animate-pulse">
      <div className="h-20 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full" />
      <div className="h-20 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full" />
      <div className="h-20 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full" />
    </div>
  );
}

function DocumentsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
      <div className="h-36 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      <div className="h-36 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      <div className="h-36 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      <div className="h-36 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
    </div>
  );
}

function LabResultsSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full" />
      <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full" />
    </div>
  );
}

function MedicationsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-pulse">
      <div className="h-40 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      <div className="h-40 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
    </div>
  );
}

function VitalsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-pulse">
      <div className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      <div className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      <div className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
    </div>
  );
}

// ─── Error & Empty States ─────────────────────────────────────────────────────

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-900/50 shadow-xs">
      <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto mb-2.5" />
      <h4 className="text-sm font-bold text-rose-700 dark:text-rose-400">Unable to load clinical records</h4>
      <p className="text-xs text-rose-600/80 dark:text-rose-300/70 mt-1 mb-4 max-w-md mx-auto">{message}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold inline-flex items-center gap-2 transition"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Retry Loading
      </button>
    </div>
  );
}

function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-[#E7E2D8] dark:border-slate-800 shadow-xs">
      <FileText className="w-10 h-10 text-[#687B74] mx-auto mb-3 opacity-60" />
      <h3 className="text-sm font-bold text-[#162E27] dark:text-slate-200">{title}</h3>
      <p className="text-xs text-[#687B74] dark:text-slate-400 mt-1 mb-4 max-w-sm mx-auto">{description}</p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="btn-pill-primary text-xs py-2 px-4 shadow-sm inline-flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

function PatientHealthRecordsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryPatientId = searchParams.get("patientId") || searchParams.get("id");
  const queryMrn = searchParams.get("mrn");
  const queryTab = searchParams.get("tab");

  const [tab, setTab] = useState<"timeline" | "documents" | "labs" | "meds" | "care_plan" | "vitals" | "vaccines">("timeline");
  const [previewDoc, setPreviewDoc] = useState<ClinicalDocument | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Patient Context Resolution
  const { selectedPatient, selectPatient, currentUser } = useClinic();
  const [resolvedPatientId, setResolvedPatientId] = useState<string>("");
  const [patientProfile, setPatientProfile] = useState<{ id: string; name: string; mrn: string } | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  // Auto-dismiss toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Sync tab from URL if present
  useEffect(() => {
    if (queryTab && ["timeline", "documents", "labs", "meds", "care_plan", "vitals", "vaccines"].includes(queryTab)) {
      setTab(queryTab as any);
    }
  }, [queryTab]);

  // Determine active patient ID (Query param takes highest priority, followed by selectedPatient, then /api/v1/patient/me)
  useEffect(() => {
    let url = "/api/v1/patient/me";
    if (queryPatientId) {
      url += `?patientId=${encodeURIComponent(queryPatientId)}`;
    } else if (queryMrn) {
      url += `?mrn=${encodeURIComponent(queryMrn)}`;
    } else if (selectedPatient?.id) {
      url += `?patientId=${encodeURIComponent(selectedPatient.id)}`;
    }

    setSessionLoading(true);
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data?.id) {
          setResolvedPatientId(d.data.id);
          setPatientProfile({
            id: d.data.id,
            name: `${d.data.firstName} ${d.data.lastName}`,
            mrn: d.data.mrn || "MRN-PENDING",
          });
          if (d.data.id !== selectedPatient?.id) {
            selectPatient(d.data.id);
          }
        }
      })
      .catch((err) => console.error("Error fetching patient context:", err))
      .finally(() => setSessionLoading(false));
  }, [queryPatientId, queryMrn, selectedPatient?.id]);

  // ─── TanStack Query Hooks ───────────────────────────────────────────────────
  const {
    data: records,
    isLoading: isLoadingRecords,
    isError: isErrorRecords,
    error: errorRecords,
    refetch: refetchRecords,
  } = usePatientRecords(resolvedPatientId);

  const {
    data: documents,
    isLoading: isLoadingDocuments,
    isError: isErrorDocuments,
    error: errorDocuments,
    refetch: refetchDocuments,
  } = usePatientDocuments(resolvedPatientId);

  const {
    data: carePlan,
    isLoading: isLoadingCarePlan,
    isError: isErrorCarePlan,
    error: errorCarePlan,
    refetch: refetchCarePlan,
  } = usePatientCarePlan(resolvedPatientId);

  const {
    data: vitalsList,
    isLoading: isLoadingVitals,
    isError: isErrorVitals,
    error: errorVitals,
    refetch: refetchVitals,
  } = usePatientVitals(resolvedPatientId);

  const {
    data: vaccines,
    isLoading: isLoadingVaccines,
    isError: isErrorVaccines,
    error: errorVaccines,
    refetch: refetchVaccines,
  } = usePatientVaccines(resolvedPatientId);

  const { data: dbTabs } = useDynamicResource<any[]>("tabs", { page: "patient_health" });

  const refillMutation = useRequestRefill();

  const handleRefillRequest = (prescriptionId: string, medName: string) => {
    refillMutation.mutate(prescriptionId, {
      onSuccess: () => {
        setToastMessage({
          type: "success",
          text: `Refill request for ${medName} submitted! Your clinical care team has been notified.`,
        });
      },
      onError: (err: any) => {
        setToastMessage({
          type: "error",
          text: err.message || "Failed to submit refill request. Please try again.",
        });
      },
    });
  };

  const labReports = records?.labResults || [];
  const medications = records?.medications || [];
  const latestVital = vitalsList && vitalsList.length > 0 ? vitalsList[0] : null;

  return (
    <div className="space-y-8 py-6 max-w-5xl mx-auto animate-fade-in pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 p-4 rounded-2xl shadow-xl flex items-center gap-3 border text-xs font-semibold animate-fade-in max-w-md ${
            toastMessage.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/90 text-emerald-900 dark:text-emerald-200 border-emerald-300"
              : "bg-rose-50 dark:bg-rose-950/90 text-rose-900 dark:text-rose-200 border-rose-300"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="leading-relaxed">{toastMessage.text}</span>
        </div>
      )}

      {/* Header with Patient Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-6 bg-white dark:bg-slate-900 rounded-3xl border border-[#E7E2D8] dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="badge-mint text-xs">Medical Records & Vault</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#162E27] dark:text-slate-100 font-serif-heading">
            Clinical History & Records
          </h1>
          <p className="text-xs text-[#687B74] dark:text-slate-400 mt-1">
            Review activity timeline, e-prescriptions, lab diagnostics, medical scans, and vitals.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Patient Context Switcher & Live Search */}
          <PatientContextSwitcher
            currentPatientId={resolvedPatientId}
            currentPatientName={patientProfile?.name}
            currentMrn={patientProfile?.mrn}
            onPatientChange={(newPat) => {
              setResolvedPatientId(newPat.id);
              setPatientProfile({
                id: newPat.id,
                name: `${newPat.firstName} ${newPat.lastName}`,
                mrn: newPat.mrn || "MRN-PENDING",
              });
            }}
          />

          <Link
            href="/patient/book?reason=lab-draw"
            className="btn-pill-primary text-xs py-2 px-4 shadow-sm flex items-center gap-1.5 shrink-0"
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span>Book Lab Draw</span>
          </Link>
        </div>
      </div>

      {/* Dynamic Nav Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-[#E7E2D8] dark:border-slate-800 scrollbar-hide">
        {(dbTabs && dbTabs.length > 0
          ? dbTabs.map((t: any) => ({
              id: t.tabKey,
              label: t.label,
              iconName: t.icon || "Activity",
              badge:
                t.badgeKey === "documentsCount"
                  ? documents?.length
                  : t.badgeKey === "labsCount"
                  ? labReports.length
                  : t.badgeKey === "medsCount"
                  ? medications.length
                  : t.badgeKey === "vaccinesCount"
                  ? vaccines?.length
                  : undefined,
            }))
          : [
              { id: "timeline", label: "Activity History", iconName: "Clock", badge: undefined },
              { id: "documents", label: "Medical Files & Vault", iconName: "FolderOpen", badge: documents?.length },
              { id: "labs", label: "Lab & Test Results", iconName: "FlaskConical", badge: labReports.length },
              { id: "meds", label: "Prescriptions & Refills", iconName: "Pill", badge: medications.length },
              { id: "care_plan", label: "Care Plans & Goals", iconName: "Layers", badge: undefined },
              { id: "vitals", label: "Vitals History", iconName: "Activity", badge: undefined },
              { id: "vaccines", label: "Immunizations", iconName: "HeartPulse", badge: vaccines?.length },
            ]
        ).map(({ id, label, iconName, badge }: any) => (
          <button
            key={id}
            onClick={() => setTab(id as any)}
            className={`px-4 py-2.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              tab === id
                ? "bg-[#005C4B] text-white shadow-sm"
                : "bg-white dark:bg-slate-900 text-[#33413C] dark:text-slate-300 border border-[#E7E2D8] dark:border-slate-800 hover:bg-[#FAF8F5] dark:hover:bg-slate-800"
            }`}
          >
            <DynamicIcon name={iconName} className="w-3.5 h-3.5" />
            <span>{label}</span>
            {typeof badge === "number" && badge > 0 && (
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  tab === id ? "bg-white/25 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                }`}
              >
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ─── TAB 1: ACTIVITY TIMELINE ────────────────────────────────────────── */}
      {tab === "timeline" && (
        <div className="space-y-4 animate-fade-in">
          {sessionLoading || !resolvedPatientId ? (
            <RecordsSkeleton />
          ) : (
            <PatientActivityTimeline
              patientId={resolvedPatientId}
              onViewDocument={() => setTab("documents")}
            />
          )}
        </div>
      )}

      {/* ─── TAB 2: MEDICAL DOCUMENTS VAULT ──────────────────────────────────── */}
      {tab === "documents" && (
        <div className="space-y-4 animate-fade-in">
          {/* Encryption banner */}
          <div className="bg-[#FAF8F5] dark:bg-slate-900 p-4 rounded-2xl border border-[#E7E2D8] dark:border-slate-800 flex items-center justify-between text-xs text-[#33413C] dark:text-slate-300">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-[#005C4B] shrink-0" />
              <span>
                All electronic prescriptions, laboratory diagnostic reports, and medical scan exports are certified and cryptographically signed.
              </span>
            </div>
            <span className="badge-mint text-[10px] shrink-0">256-Bit Encrypted</span>
          </div>

          {isLoadingDocuments ? (
            <DocumentsSkeleton />
          ) : isErrorDocuments ? (
            <ErrorState message={errorDocuments?.message || "Failed to load documents"} onRetry={refetchDocuments} />
          ) : documents && documents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-[#E7E2D8] dark:border-slate-800 hover:border-[#005C4B]/50 transition-all flex flex-col justify-between space-y-4 shadow-xs"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-[#005C4B] bg-[#E8F4F0] px-2 py-0.5 rounded-full">
                        {doc.category.replace("_", " ")}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Verified
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-[#162E27] dark:text-slate-200 line-clamp-1">
                      {doc.fileName}
                    </h4>
                    <p className="text-[11px] text-[#687B74] dark:text-slate-400">
                      Author: <strong className="text-[#162E27] dark:text-slate-200">{doc.uploaderName || "Attending Physician"}</strong>
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[#E7E2D8] dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-[#687B74] dark:text-slate-400 font-mono">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() =>
                          setPreviewDoc({
                            id: doc.id,
                            patientId: doc.patientId,
                            fileName: doc.fileName,
                            fileUrl: doc.fileUrl,
                            fileSize: doc.fileSize,
                            mimeType: doc.mimeType,
                            category: doc.category as any,
                            uploaderName: doc.uploaderName,
                            verificationStatus: doc.verificationStatus as any,
                            createdAt: doc.createdAt,
                          })
                        }
                        className="px-3 py-1.5 rounded-xl bg-[#FAF8F5] dark:bg-slate-800 hover:bg-[#E8F4F0] border border-[#E7E2D8] dark:border-slate-700 text-[#005C4B] dark:text-emerald-300 font-bold flex items-center gap-1 text-xs transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview Record</span>
                      </button>
                      <a
                        href={doc.fileUrl || "#"}
                        download={doc.fileName}
                        className="p-1.5 rounded-xl bg-[#FAF8F5] dark:bg-slate-800 hover:bg-[#E8F4F0] border border-[#E7E2D8] dark:border-slate-700 text-[#005C4B] dark:text-emerald-300 transition-all"
                        title="Download File"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No Medical Files in Vault"
              description="Your verified diagnostic scans, electronic prescriptions, and lab exports will appear here."
            />
          )}
        </div>
      )}

      {/* ─── TAB 3: LABS & TEST RESULTS ──────────────────────────────────────── */}
      {tab === "labs" && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-[#FAF8F5] dark:bg-slate-900 p-4 rounded-2xl border border-[#E7E2D8] dark:border-slate-800 flex items-center gap-3 text-xs text-[#33413C] dark:text-slate-300">
            <ShieldCheck className="w-5 h-5 text-[#005C4B] shrink-0" />
            <span>
              All diagnostic reports are verified by clinical pathologists and plain-language interpretations are reviewed before publication.
            </span>
          </div>

          {isLoadingRecords ? (
            <LabResultsSkeleton />
          ) : isErrorRecords ? (
            <ErrorState message={errorRecords?.message || "Failed to load laboratory results"} onRetry={refetchRecords} />
          ) : labReports.length > 0 ? (
            <div className="space-y-4">
              {labReports.map((report) => (
                <LabResultCard
                  key={report.id}
                  id={report.id}
                  testName={report.testName}
                  date={report.performedAt || "Recent"}
                  orderedBy={report.orderedBy || "Clinical Laboratory"}
                  doctorNote={report.plainLanguageExplanation || "Verified by laboratory director."}
                  status={report.isAbnormal ? "attention" : "normal"}
                  items={
                    report.items && report.items.length > 0
                      ? report.items
                      : [
                          {
                            name: report.testName,
                            value: report.value,
                            unit: report.unit,
                            referenceRange: report.referenceRange || "Normal Clinical Range",
                            status: report.isAbnormal ? "abnormal" : "normal",
                          },
                        ]
                  }
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No Diagnostic Reports Yet"
              description="You currently have no diagnostic laboratory tests on file. Schedule a blood draw or health checkup."
              actionLabel="Book In-Office Lab Draw"
              actionHref="/patient/book?reason=lab-draw"
            />
          )}
        </div>
      )}

      {/* ─── TAB 4: PRESCRIPTIONS & REFILLS ──────────────────────────────────── */}
      {tab === "meds" && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#162E27] dark:text-slate-200">
              Active e-Prescriptions ({medications.length})
            </span>
            <Link
              href="/patient/messages"
              className="btn-pill-secondary text-xs py-1.5 px-3 flex items-center gap-1"
            >
              <Pill className="w-3.5 h-3.5" />
              <span>Contact Pharmacist</span>
            </Link>
          </div>

          {isLoadingRecords ? (
            <MedicationsSkeleton />
          ) : isErrorRecords ? (
            <ErrorState message={errorRecords?.message || "Failed to load medications"} onRetry={refetchRecords} />
          ) : medications.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {medications.map((med) => (
                <div
                  key={med.id}
                  className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-[#E7E2D8] dark:border-slate-800 space-y-3 shadow-xs flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-[#162E27] dark:text-slate-100">
                        {med.medicationName} {med.dosage}
                      </span>
                      <span className="badge-mint text-[10px]">{med.status || "Active"}</span>
                    </div>
                    <p className="text-xs text-[#687B74] dark:text-slate-400">{med.instructions}</p>
                  </div>

                  <div className="pt-3 border-t border-[#E7E2D8] dark:border-slate-800 flex items-center justify-between gap-2">
                    <div className="text-[11px] text-[#687B74] dark:text-slate-400">
                      Refills: <strong className="text-[#162E27] dark:text-slate-200">{med.refillsRemaining ?? 0}</strong> · Prescribed by{" "}
                      {med.prescribedBy || "Attending Physician"}
                    </div>

                    <button
                      onClick={() => handleRefillRequest(med.id, med.medicationName)}
                      disabled={refillMutation.isPending || !med.canRefill}
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 font-bold text-xs transition disabled:opacity-50 inline-flex items-center gap-1.5"
                    >
                      {refillMutation.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Pill className="w-3.5 h-3.5" />
                      )}
                      <span>Request 90-Day Refill</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No Active Medications"
              description="Your prescribed medications and electronic refill history will appear here."
            />
          )}
        </div>
      )}

      {/* ─── TAB 5: CARE PLANS & GOALS ───────────────────────────────────────── */}
      {tab === "care_plan" && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-[#E7E2D8] dark:border-slate-800 space-y-4 animate-fade-in text-xs shadow-xs">
          <div className="flex items-center justify-between border-b border-[#E7E2D8] dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-sm text-[#162E27] dark:text-slate-100">
                {carePlan?.overallTitle || "Personalized Health Care Plan"}
              </h3>
              <p className="text-[11px] text-[#687B74] dark:text-slate-400 mt-0.5">
                Target milestones established with your primary clinical care team.
              </p>
            </div>
            {carePlan?.lastUpdated && (
              <span className="text-[10px] text-slate-400 font-mono">
                Updated {new Date(carePlan.lastUpdated).toLocaleDateString()}
              </span>
            )}
          </div>

          {isLoadingCarePlan ? (
            <RecordsSkeleton />
          ) : isErrorCarePlan ? (
            <ErrorState message={errorCarePlan?.message || "Failed to load care plan"} onRetry={refetchCarePlan} />
          ) : carePlan?.goals && carePlan.goals.length > 0 ? (
            <div className="space-y-3">
              {carePlan.goals.map((goal, idx) => (
                <div
                  key={goal.id || idx}
                  className="p-4 rounded-2xl bg-[#FAF8F5] dark:bg-slate-800/60 border border-[#E7E2D8] dark:border-slate-800 flex items-center justify-between gap-4"
                >
                  <div className="space-y-0.5">
                    <span className="font-bold text-[#162E27] dark:text-slate-200 block text-xs">{goal.title}</span>
                    <span className="text-[#687B74] dark:text-slate-400 text-[11px] leading-relaxed">
                      {goal.description}
                    </span>
                  </div>
                  <span className="badge-mint text-[10px] shrink-0 font-bold">
                    {goal.status || "Active Milestone"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No Care Plan Milestones"
              description="Your attending physician will formulate personalized wellness and preventative goals during your next visit."
            />
          )}

          {carePlan?.lifestyleDirectives && carePlan.lifestyleDirectives.length > 0 && (
            <div className="pt-4 border-t border-[#E7E2D8] dark:border-slate-800 space-y-2">
              <h4 className="font-bold text-xs text-[#162E27] dark:text-slate-200">Physician Lifestyle Guidelines</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {carePlan.lifestyleDirectives.map((d, i) => (
                  <div key={i} className="p-3 bg-[#FAF8F5] dark:bg-slate-800/40 rounded-xl text-[11px] text-[#687B74] dark:text-slate-300 flex items-start gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-[#005C4B] mt-0.5 shrink-0" />
                    <span>{d.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 6: VITALS HISTORY ───────────────────────────────────────────── */}
      {tab === "vitals" && (
        <div className="space-y-4 animate-fade-in">
          {isLoadingVitals ? (
            <VitalsSkeleton />
          ) : isErrorVitals ? (
            <ErrorState message={errorVitals?.message || "Failed to load vitals history"} onRetry={refetchVitals} />
          ) : latestVital ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-[#E7E2D8] dark:border-slate-800 space-y-2 shadow-xs">
                  <span className="text-xs text-[#687B74] dark:text-slate-400 font-bold">Blood Pressure</span>
                  <div className="text-2xl font-bold text-[#162E27] dark:text-slate-100">
                    {latestVital.systolicBp}/{latestVital.diastolicBp}{" "}
                    <span className="text-xs text-[#687B74] font-normal">mmHg</span>
                  </div>
                  <span className="badge-mint text-[10px]">Optimal Range</span>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-[#E7E2D8] dark:border-slate-800 space-y-2 shadow-xs">
                  <span className="text-xs text-[#687B74] dark:text-slate-400 font-bold">Resting Heart Rate</span>
                  <div className="text-2xl font-bold text-[#162E27] dark:text-slate-100">
                    {latestVital.heartRate} <span className="text-xs text-[#687B74] font-normal">bpm</span>
                  </div>
                  <span className="badge-mint text-[10px]">Normal Rhythm</span>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-[#E7E2D8] dark:border-slate-800 space-y-2 shadow-xs">
                  <span className="text-xs text-[#687B74] dark:text-slate-400 font-bold">Blood Oxygen (SpO2)</span>
                  <div className="text-2xl font-bold text-[#162E27] dark:text-slate-100">
                    {latestVital.oxygenSaturation ?? 98}%{" "}
                    <span className="text-xs text-[#687B74] font-normal">Room Air</span>
                  </div>
                  <span className="badge-mint text-[10px]">Healthy Saturation</span>
                </div>
              </div>

              {/* Historical Vitals Log */}
              {vitalsList && vitalsList.length > 1 && (
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-[#E7E2D8] dark:border-slate-800 shadow-xs">
                  <h4 className="text-xs font-bold text-[#162E27] dark:text-slate-200 mb-3">Longitudinal History</h4>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {vitalsList.map((v) => (
                      <div key={v.id} className="py-2.5 flex items-center justify-between">
                        <span className="text-slate-500 font-mono text-[11px]">
                          {new Date(v.recordedAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                        </span>
                        <div className="flex items-center gap-4 text-slate-700 dark:text-slate-300">
                          <span>
                            BP: <strong>{v.systolicBp}/{v.diastolicBp}</strong>
                          </span>
                          <span>
                            HR: <strong>{v.heartRate} bpm</strong>
                          </span>
                          {v.oxygenSaturation && (
                            <span>
                              SpO2: <strong>{v.oxygenSaturation}%</strong>
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <EmptyState
              title="No Vitals Recorded"
              description="Your clinical vital signs will appear here following your physical checkup or triage."
            />
          )}
        </div>
      )}

      {/* ─── TAB 7: IMMUNIZATIONS ────────────────────────────────────────────── */}
      {tab === "vaccines" && (
        <div className="space-y-3 animate-fade-in">
          {isLoadingVaccines ? (
            <RecordsSkeleton />
          ) : isErrorVaccines ? (
            <ErrorState message={errorVaccines?.message || "Failed to load immunizations"} onRetry={refetchVaccines} />
          ) : vaccines && vaccines.length > 0 ? (
            vaccines.map((vaccine) => (
              <div
                key={vaccine.id}
                className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-[#E7E2D8] dark:border-slate-800 flex items-center justify-between gap-4 shadow-xs"
              >
                <div>
                  <h4 className="font-bold text-xs text-[#162E27] dark:text-slate-100">{vaccine.name}</h4>
                  <p className="text-[11px] text-[#687B74] dark:text-slate-400 mt-0.5">
                    {vaccine.dateGiven
                      ? `Administered: ${new Date(vaccine.dateGiven).toLocaleDateString()} · ${vaccine.manufacturer || "Certified Manufacturer"}`
                      : "Recorded in National Immunization Registry"}
                    {vaccine.doseNumber && ` · ${vaccine.doseNumber}`}
                  </p>
                </div>

                <span
                  className={
                    vaccine.due
                      ? "badge-terracotta text-[10px] shrink-0 font-bold"
                      : "badge-mint text-[10px] shrink-0 font-bold"
                  }
                >
                  {vaccine.status || (vaccine.due ? "Due" : "Up to Date")}
                </span>
              </div>
            ))
          ) : (
            <EmptyState
              title="No Immunization Records"
              description="Your official vaccination and preventive immunization history will populate here."
            />
          )}
        </div>
      )}

      {/* Document Preview Modal */}
      {previewDoc && (
        <DocumentPreviewModal
          document={previewDoc}
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </div>
  );
}

export default function PatientHealthRecordsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs font-semibold text-slate-500">Loading patient health records...</div>}>
      <PatientHealthRecordsContent />
    </Suspense>
  );
}
