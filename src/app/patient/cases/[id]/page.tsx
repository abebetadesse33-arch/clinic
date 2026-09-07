"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import RoleGuard from "@/components/auth/RoleGuard";
import UniversalPaymentModal from "@/components/payment/UniversalPaymentModal";
import {
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  Clock,
  Stethoscope,
  Send,
  User,
  Star,
  ShieldCheck,
  FileText,
  MessageSquare,
  AlertTriangle,
  Upload,
  ChevronRight,
  HeartPulse,
  Pill,
  FlaskConical,
  Video,
  CreditCard,
  Building2,
  Phone,
  ThumbsUp,
  Download,
  Info,
  Loader2,
  Calendar,
} from "lucide-react";

interface CaseDetail {
  caseId: string;
  patient?: {
    fullName?: string;
    age?: number;
    gender?: string;
    mrn?: string;
    phone?: string;
    email?: string;
  };
  complaint?: {
    chiefComplaint?: string;
    severity?: string;
    duration?: string;
    onset?: string;
    location?: string;
    aggravating?: string;
    relieving?: string;
    associatedSymptoms?: string;
    seekingUrgent?: boolean;
  };
  history?: {
    chronicConditions?: string;
    currentMedications?: string;
    knownAllergies?: string;
  };
  assignedHandler?: string;
  handlerId?: string;
  status?: string;
  submittedAt?: string;
  aiAnalysis?: {
    summary?: string;
    urgencyLevel?: string;
    analysisConfidence?: number;
    potentialCauses?: string[];
    patientEducationPoints?: string[];
    suggestedOrders?: string[];
    pharmacologyNotes?: string;
  } | null;
  handlerNotes?: Array<{ text: string; author: string; time: string }>;
  timeline?: Array<{ time: string; event: string; actor: string }>;
}

export default function PatientCaseDetailPage() {
  return (
    <RoleGuard
      allowedRoles={["patient", "system_admin", "tenant_admin", "physician", "nurse"]}
      fallbackTitle="Case Progress Follow-up"
    >
      <PatientCaseDetailContent />
    </RoleGuard>
  );
}

function PatientCaseDetailContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"tracker" | "chat" | "education" | "files" | "review">("tracker");

  // Chat state
  const [messages, setMessages] = useState<Array<{ sender: string; text: string; time: string; isDoctor: boolean }>>([
    {
      sender: "Clinical Concierge AI",
      text: "Hello! Your health case has been received and analyzed. Dr. Sarah Mitchell has been assigned as your case handler.",
      time: "10 mins ago",
      isDoctor: true,
    },
  ]);
  const [chatInput, setChatInput] = useState("");

  // Review & Rating state
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // Payment Modal state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentCleared, setPaymentCleared] = useState(false);

  // Additional file upload state
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/v1/cases/${id}/messages`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setMessages(data.data);
      }
    } catch { }
  };

  const fetchCase = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/v1/cases/${id}`);
      const data = await res.json();
      if (data.success && data.data) {
        setCaseData(data.data);
      }
    } catch {
      // Handled by loading state
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchCase();
      fetchMessages();
    }
  }, [id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const patientName = caseData?.patient?.fullName || "You";
    const textToSend = chatInput.trim();
    setChatInput("");

    const optimisticMsg = {
      sender: patientName,
      text: textToSend,
      time: "Just now",
      isDoctor: false,
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const res = await fetch(`/api/v1/cases/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textToSend,
          sender: patientName,
          isDoctor: false,
        }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.allMessages)) {
        setMessages(data.allMessages);
      } else {
        fetchMessages();
      }
    } catch {
      // Fallback
    }
  };

  const handleRatingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReviewSubmitted(true);
    try {
      await fetch(`/api/v1/cases/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientRating: rating,
          reviewComment: reviewComment.trim(),
        }),
      });
    } catch { }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-teal-400 animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Loading case progress details...</p>
        </div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-amber-400" />
        <h2 className="text-lg font-bold text-white">Case Not Found</h2>
        <p className="text-xs text-slate-400">Unable to locate case reference {id}.</p>
        <button
          onClick={() => router.push("/patient/cases")}
          className="px-6 py-2.5 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs"
        >
          Return to My Cases
        </button>
      </div>
    );
  }

  const ai = caseData.aiAnalysis;

  const WORKFLOW_STEPS = [
    {
      id: 1,
      title: "Case Submitted",
      desc: "Patient history, symptoms & uploads received",
      status: "completed",
      time: caseData.submittedAt ? new Date(caseData.submittedAt).toLocaleTimeString() : "Recently",
    },
    {
      id: 2,
      title: "AI Clinical Triage",
      desc: "Gemini 1.5 Pro differential & risk analysis",
      status: "completed",
      time: "Completed",
    },
    {
      id: 3,
      title: "Specialist Assigned",
      desc: `Under review by ${caseData.assignedHandler}`,
      status: "in_progress",
      time: "In Progress",
    },
    {
      id: 4,
      title: "Diagnostic & Lab Workup",
      desc: "Recommended tests & panel orders",
      status: paymentCleared ? "completed" : "pending",
      time: paymentCleared ? "Orders Cleared" : "Requires Copay / Action",
    },
    {
      id: 5,
      title: "Prescription Safety Clearance",
      desc: "Medication reconciliation & DDI screening",
      status: "pending",
      time: "Upcoming",
    },
    {
      id: 6,
      title: "Consultation / Resolution",
      desc: "Telehealth consult or final care plan",
      status: "pending",
      time: "Upcoming",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 space-y-6 max-w-6xl mx-auto pb-20">
      {/* Universal Payment Modal */}
      <UniversalPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onSuccess={() => {
          setPaymentCleared(true);
          setIsPaymentModalOpen(false);
        }}
        serviceType="case_intake"
        serviceTitle={`Diagnostic Workup Copay for Case ${caseData.caseId}`}
        amountEtb={350}
        patientName={caseData.patient?.fullName || "Patient"}
        caseId={caseData.caseId}
      />

      {/* Back Navigation & Breadcrumb */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <Link
          href="/patient/cases"
          className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to My Cases
        </Link>
        <span className="font-mono text-xs text-teal-400 font-bold">{caseData.caseId}</span>
      </div>

      {/* Hero Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[10px] font-extrabold uppercase">
                Active Clinical Workflow
              </span>
              <span className="px-3 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-extrabold font-mono">
                AI CDSS Active
              </span>
            </div>
            <h1 className="text-xl font-extrabold text-white mt-1">{caseData.complaint?.chiefComplaint || "Clinical Case"}</h1>
            <p className="text-xs text-slate-400">
              Submitted on {caseData.submittedAt ? new Date(caseData.submittedAt).toLocaleDateString() : "Recent"} at {caseData.submittedAt ? new Date(caseData.submittedAt).toLocaleTimeString() : ""}
            </p>
          </div>

          {/* Assigned Doctor Card */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Assigned Specialist</span>
              <span className="text-xs font-bold text-white block">{caseData.assignedHandler || "Attending Clinician"}</span>
              <span className="text-[10px] text-teal-400 font-mono">Internal Medicine & CDSS</span>
            </div>
          </div>
        </div>

        {/* AI Plain Language Summary */}
        {ai && (
          <div className="bg-indigo-950/40 border border-indigo-800/40 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>What This Means For You (Plain Language AI Summary)</span>
              <span className="ml-auto text-[10px] text-indigo-400/70 font-mono">{ai.analysisConfidence}% confidence</span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed">{ai.summary}</p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        {[
          { id: "tracker", label: "🚦 Progress Tracker", icon: Clock },
          { id: "chat", label: "💬 Message Doctor", icon: MessageSquare },
          { id: "education", label: "📚 Patient Guidance", icon: HeartPulse },
          { id: "files", label: "📎 Attached Media", icon: FileText },
          { id: "review", label: "⭐ Rate Experience", icon: Star },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === id
                ? "bg-teal-500/20 border border-teal-500/40 text-teal-300 shadow-sm"
                : "border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: WORKFLOW STEPPER TRACKER */}
      {activeTab === "tracker" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                  Care Journey Milestones
                </h3>
                <span className="text-xs text-teal-400 font-bold">Step 3 of 6 Active</span>
              </div>

              <div className="space-y-4">
                {WORKFLOW_STEPS.map((step, idx) => {
                  const isDone = step.status === "completed";
                  const isCurrent = step.status === "in_progress";
                  return (
                    <div key={step.id} className="flex items-start gap-4">
                      {/* Step Circle & Connector */}
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-xs border transition-all ${
                            isDone
                              ? "bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-md shadow-emerald-950/40"
                              : isCurrent
                              ? "bg-teal-500 border-teal-400 text-slate-950 shadow-lg shadow-teal-500/30 animate-pulse"
                              : "bg-slate-950 border-slate-800 text-slate-500"
                          }`}
                        >
                          {isDone ? <CheckCircle2 className="w-4 h-4" /> : step.id}
                        </div>
                        {idx < WORKFLOW_STEPS.length - 1 && (
                          <div className={`w-0.5 h-10 my-1 ${isDone ? "bg-emerald-500/50" : "bg-slate-800"}`} />
                        )}
                      </div>

                      {/* Step Content */}
                      <div className="flex-1 bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{step.title}</span>
                            {isCurrent && (
                              <span className="px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-[9px] font-bold">
                                Current
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">{step.desc}</p>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 shrink-0">{step.time}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Side Panel: Quick Actions & Copay */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <h4 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-teal-400" />
                Service Payment Gate
              </h4>

              {paymentCleared ? (
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Payment verified. Diagnostic workup orders cleared for laboratory processing.</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    A copay of <strong className="text-white font-mono">350 ETB</strong> is required to clear laboratory panel testing.
                  </p>
                  <button
                    onClick={() => setIsPaymentModalOpen(true)}
                    className="w-full py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-teal-500/20 flex items-center justify-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4" /> Pay via Telebirr or Bank Transfer
                  </button>
                  <p className="text-[10px] text-slate-500 text-center">
                    Instant clearance with CBE, Awash, or Telebirr
                  </p>
                </div>
              )}
            </div>

            {/* Emergency Support Nudge */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Need Urgent Assistance?</span>
              <p className="text-xs text-slate-300">If your symptoms worsen, visit the nearest emergency room immediately.</p>
              <div className="text-xs font-bold text-teal-400 font-mono">Emergency Hotline: 907</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CHAT WITH DOCTOR */}
      {activeTab === "chat" && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 max-w-3xl mx-auto">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
                <Stethoscope className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">{caseData.assignedHandler}</h3>
                <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Online for Case Consult
                </span>
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div className="space-y-3 h-80 overflow-y-auto p-2 bg-slate-950/60 rounded-2xl border border-slate-800/80">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex flex-col ${msg.isDoctor ? "items-start" : "items-end"}`}
              >
                <div
                  className={`p-3.5 rounded-2xl text-xs max-w-md leading-relaxed ${
                    msg.isDoctor
                      ? "bg-slate-900 border border-slate-800 text-slate-200"
                      : "bg-teal-500 text-slate-950 font-medium"
                  }`}
                >
                  <span className="text-[10px] opacity-70 block font-bold mb-1">{msg.sender}</span>
                  {msg.text}
                </div>
                <span className="text-[9px] text-slate-500 mt-1 px-1">{msg.time}</span>
              </div>
            ))}
          </div>

          {/* Input Box */}
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask a question or update your clinician on symptoms..."
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-teal-500 transition-all"
            />
            <button
              type="submit"
              disabled={!chatInput.trim()}
              className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition-all flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" /> Send
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: PATIENT GUIDANCE & EDUCATION */}
      {activeTab === "education" && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
          <div>
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
              Personalized Guidance & What To Do Next
            </h3>
            <p className="text-xs text-slate-400 mt-1">AI-generated lifestyle, safety, and symptom management points</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ai?.patientEducationPoints && ai.patientEducationPoints.length > 0 ? (
              ai.patientEducationPoints.map((pt, i) => (
                <div key={i} className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-slate-200 leading-relaxed">{pt}</span>
                </div>
              ))
            ) : (
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300">
                Keep a log of any changes in blood pressure, heart rate, or pain levels while your case handler reviews your test results.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: ATTACHED MEDIA & FILES */}
      {activeTab === "files" && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                Case Files & Diagnostics Media
              </h3>
              <p className="text-xs text-slate-400 mt-1">Uploaded images, lab PDFs, and audio recordings</p>
            </div>
            <label className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/40 hover:bg-teal-500/30 text-xs font-bold cursor-pointer transition-all">
              <Upload className="w-3.5 h-3.5" /> Upload Additional File
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setUploadedFiles((prev) => [...prev, e.target.files![0].name]);
                  }
                }}
              />
            </label>
          </div>

          <div className="space-y-2">
            {[
              { name: "ecg-scan.jpg", type: "Cardiology Image", size: "1.2 MB" },
              { name: "lab-report-2026.pdf", type: "Lab Results PDF", size: "480 KB" },
              ...uploadedFiles.map((name) => ({ name, type: "Uploaded Document", size: "Recent" })),
            ].map((f, i) => (
              <div key={i} className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-teal-400" />
                  <div>
                    <span className="text-white font-bold block">{f.name}</span>
                    <span className="text-[10px] text-slate-400">{f.type} · {f.size}</span>
                  </div>
                </div>
                <button className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-colors">
                  View File
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: RATE EXPERIENCE & FEEDBACK */}
      {activeTab === "review" && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 max-w-2xl mx-auto">
          {reviewSubmitted ? (
            <div className="text-center py-8 space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
                <ThumbsUp className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-white">Thank You for Your Feedback!</h3>
              <p className="text-xs text-slate-400">Your review helps our clinical team continuously refine CDSS precision and care quality.</p>
            </div>
          ) : (
            <form onSubmit={handleRatingSubmit} className="space-y-4">
              <div>
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                  Rate Your Care & AI Triage Experience
                </h3>
                <p className="text-xs text-slate-400 mt-1">How would you rate the speed, clarity, and quality of your clinical review?</p>
              </div>

              {/* Star Rating Selector */}
              <div className="flex items-center gap-2 py-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 text-slate-600 hover:text-amber-400 transition-colors"
                  >
                    <Star
                      className={`w-7 h-7 ${star <= rating ? "text-amber-400 fill-amber-400" : "text-slate-700"}`}
                    />
                  </button>
                ))}
                <span className="ml-3 text-xs font-bold text-amber-300">{rating} out of 5 Stars</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 font-medium">Comments or Suggestions for Dr. {caseData.assignedHandler}</label>
                <textarea
                  rows={4}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share details regarding your clinical concierge experience..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-teal-500 transition-all resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition-all shadow-md"
              >
                Submit Clinical Review
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
