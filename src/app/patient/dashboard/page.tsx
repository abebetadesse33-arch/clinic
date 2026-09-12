"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useClinic } from "@/context/ClinicContext";
import RoleGuard from "@/components/auth/RoleGuard";
import QuickActionGrid from "@/components/onemedical/QuickActionGrid";
import LabResultCard from "@/components/onemedical/LabResultCard";
import TreatMeNowModal from "@/components/onemedical/TreatMeNowModal";
import UniversalPaymentModal from "@/components/payment/UniversalPaymentModal";
import DigitalPatientCard from "@/components/patient/DigitalPatientCard";
import ShareMedicalRecordModal from "@/components/patient/ShareMedicalRecordModal";
import PatientContextSwitcher from "@/components/patient/PatientContextSwitcher";
import {
  Activity,
  Calendar,
  CheckCircle2,
  Clock,
  HeartPulse,
  Pill,
  ShieldCheck,
  Sparkles,
  User,
  Users,
  Video,
  Send,
  Plus,
  AlertCircle,
  FileText,
  HelpCircle,
  TrendingDown,
  MessageSquare,
  GitMerge,
  Layers,
  ChevronRight,
  FolderOpen,
  MapPin,
  PhoneCall,
  Zap,
  DollarSign,
  Receipt,
  Printer,
  CreditCard,
  QrCode,
  X,
  Share2,
  Smartphone,
  Check,
  ArrowRight,
} from "lucide-react";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function PatientDashboardContent() {
  const [activeTab, setActiveTab] = useState<
    "overview" | "cases" | "records" | "appointments" | "referrals" | "messages" | "care_plan" | "invoices" | "questionnaires" | "consents"
  >("overview");

  // Data states
  const [patient, setPatient] = useState<any>(null);
  const [records, setRecords] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [myCases, setMyCases] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [carePlan, setCarePlan] = useState<any>(null);
  const [questionnaires, setQuestionnaires] = useState<any[]>([]);
  const [consents, setConsents] = useState<any[]>([]);
  const [regStatus, setRegStatus] = useState<any>(null);
  const [invoicesList, setInvoicesList] = useState<any[]>([]);
  const [showTreatMeNow, setShowTreatMeNow] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payModalConfig, setPayModalConfig] = useState<{
    serviceType: any;
    serviceTitle: string;
    amountEtb: number;
    serviceCode?: string;
  }>({
    serviceType: "registration",
    serviceTitle: "Patient 3-Month Registration",
    amountEtb: 350,
  });

  // Modals & form states
  const [newMsgText, setNewMsgText] = useState("");
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [inTelehealthCall, setInTelehealthCall] = useState(false);
  const [showDigitalCardModal, setShowDigitalCardModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAuthorizeDeviceModal, setShowAuthorizeDeviceModal] = useState(false);
  const [authChallengeInput, setAuthChallengeInput] = useState("");
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [authFeedback, setAuthFeedback] = useState<string | null>(null);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();
  const queryPatientId = searchParams.get("patientId") || searchParams.get("id");
  const queryMrn = searchParams.get("mrn");
  const { currentUser, selectedPatient, selectPatient } = useClinic();

  const [activePatientId, setActivePatientId] = useState<string>("");

  const fetchDashboardData = (pId?: string, mrn?: string) => {
    // For /patient/me, only pass an explicit patientId if this is a staff/admin override.
    // Patient-role users have their identity resolved server-side from the session cookie.
    const isPatientRole = currentUser?.role === "patient";
    const targetId = pId || (!isPatientRole ? (activePatientId || queryPatientId || selectedPatient?.id) : undefined);
    const targetMrn = mrn || (!isPatientRole ? queryMrn : undefined);

    let meUrl = "/api/v1/patient/me";
    if (targetId) {
      meUrl += `?patientId=${encodeURIComponent(targetId)}`;
    } else if (targetMrn) {
      meUrl += `?mrn=${encodeURIComponent(targetMrn)}`;
    }

    fetch(meUrl)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) {
          setPatient(d.data);
          const resolvedId = d.data.id;
          setActivePatientId(resolvedId);
          if (resolvedId && resolvedId !== selectedPatient?.id) {
            selectPatient(resolvedId);
          }

          const param = `?patientId=${encodeURIComponent(resolvedId)}`;
          fetch(`/api/v1/patient/records${param}`).then((r) => r.json()).then((d) => d.success && setRecords(d.data));
          fetch(`/api/v1/patient/appointments${param}`).then((r) => r.json()).then((d) => d.success && setAppointments(d.data));
          fetch(`/api/v1/cases?limit=15&patientId=${encodeURIComponent(resolvedId)}`).then((r) => r.json()).then((d) => d.success && setMyCases(d.data?.cases || []));
          fetch(`/api/v1/patient/referrals${param}`).then((r) => r.json()).then((d) => d.success && setReferrals(d.data));
          fetch(`/api/v1/patient/messages${param}`).then((r) => r.json()).then((d) => d.success && setMessages(d.data));
          fetch(`/api/v1/patient/care-plan${param}`).then((r) => r.json()).then((d) => d.success && setCarePlan(d.data));
          fetch(`/api/v1/patient/questionnaires${param}`).then((r) => r.json()).then((d) => d.success && setQuestionnaires(d.data));
          fetch(`/api/v1/patient/consents${param}`).then((r) => r.json()).then((d) => d.success && setConsents(d.data));
          fetch(`/api/v1/patient/registration-status${param}`).then((r) => r.json()).then((d) => d.success && setRegStatus(d.data));
          fetch(`/api/v1/patient/invoices${param}`).then((r) => r.json()).then((d) => d.success && setInvoicesList(d.data));
        }
      })
      .catch((err) => console.error("Error fetching patient dashboard:", err));
  };

  useEffect(() => {
    const isPatientRole = currentUser?.role === "patient";
    // Patients: always resolve from session — don't pass URL params to avoid spoofing
    if (isPatientRole) {
      fetchDashboardData();
    } else {
      fetchDashboardData(queryPatientId || undefined, queryMrn || undefined);
    }
  }, [queryPatientId, queryMrn, selectedPatient?.id, currentUser?.role]);

  const showNotification = (msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(null), 4000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsgText.trim()) return;

    try {
      const res = await fetch("/api/v1/patient/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageText: newMsgText }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages((prev) => [...prev, data.data]);
        setNewMsgText("");
        showNotification("Message sent to your care team!");
      }
    } catch { }
  };

  // Derive first name: prefer loaded patient profile, then logged-in user's name
  const patientFirstName = patient?.firstName ||
    (currentUser?.fullName ? currentUser.fullName.trim().split(" ")[0] : "there");

  const pData = patient || {
    firstName: patientFirstName,
    lastName: currentUser?.fullName ? currentUser.fullName.trim().split(" ").slice(1).join(" ") : "",
    mrn: "Pending MRN",
    primaryDoctor: "Assigned Physician",
    age: null,
    bloodType: "O+",
  };

  return (
    <RoleGuard
      allowedRoles={["patient", "system_admin", "tenant_admin", "physician", "nurse", "pharmacist"]}
      fallbackTitle="Patient Health Portal"
      fallbackMessage="Please sign in with your verified patient credentials to access your personal health records."
    >
      <div className="space-y-6 pb-12 w-full max-w-full overflow-x-hidden">
        {/* Notification Toast */}
        {notificationMsg && (
          <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-[#005C4B] text-white text-xs font-bold shadow-warm-lg flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            <span>{notificationMsg}</span>
          </div>
        )}

        {/* Sub-Navigation Tabs & Patient Context Switcher */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-2 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-hide min-w-0">
            {[
              { id: "overview", label: "Dashboard", icon: Activity },
              { id: "cases", label: "My Cases & AI Triage", icon: Sparkles },
              { id: "records", label: "My Health Records & Labs", icon: FileText },
              { id: "appointments", label: "Visits & Calendar", icon: Calendar },
              { id: "referrals", label: "Specialist Referrals", icon: GitMerge },
              { id: "messages", label: "Care Messages", icon: MessageSquare },
              { id: "care_plan", label: "Care Plan & Goals", icon: Layers },
              { id: "invoices", label: "Billing & Receipts", icon: Receipt },
              { id: "questionnaires", label: "Health Intake Forms", icon: HeartPulse },
              { id: "consents", label: "Privacy & Consents", icon: ShieldCheck },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`px-3.5 py-2 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === id
                    ? "bg-teal-700 dark:bg-teal-600 text-white shadow-sm scale-[1.02]"
                    : "bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${activeTab === id ? "text-white" : "text-teal-600 dark:text-teal-400"}`} />
                <span>{label}</span>
              </button>
            ))}
          </div>

          <div className="shrink-0 flex items-center">
            <PatientContextSwitcher
              currentPatientId={activePatientId || patient?.id}
              currentPatientName={patient ? `${patient.firstName} ${patient.lastName}` : pData ? `${pData.firstName} ${pData.lastName}` : undefined}
              currentMrn={patient?.mrn || pData?.mrn}
              onPatientChange={(newPat) => {
                setActivePatientId(newPat.id);
                fetchDashboardData(newPat.id);
              }}
            />
          </div>
        </div>

        {/* TAB 1: OVERVIEW (ONE MEDICAL SIGNATURE LAYOUT) */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-fade-in">
            {/* 3-Month Registration Status Alert */}
            {regStatus && (
              <div
                className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${regStatus.isActive
                    ? "bg-[#E8F4F0] border-[#005C4B]/30"
                    : "bg-amber-50 border-amber-300 shadow-sm"
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${regStatus.isActive
                        ? "bg-[#005C4B] text-white"
                        : "bg-amber-500 text-white"
                      }`}
                  >
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-[#162E27]">
                        3-Month Patient Registration & Care Access
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${regStatus.isActive
                            ? "bg-[#005C4B] text-white"
                            : "bg-amber-200 text-amber-900"
                          }`}
                      >
                        {regStatus.isActive ? "ACTIVE" : "RENEWAL REQUIRED"}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#687B74] mt-0.5">
                      {regStatus.message ||
                        (regStatus.isActive
                          ? `${regStatus.daysRemaining} days remaining on your quarterly health pass.`
                          : "Renew for 350 ETB to continue on-demand visits, care chat, and lab discounts.")}
                    </p>
                  </div>
                </div>

                {!regStatus.isActive && !regStatus.isFreeGlobal && (
                  <button
                    onClick={() => {
                      setPayModalConfig({
                        serviceType: "registration",
                        serviceCode: "REGISTRATION_3MO",
                        serviceTitle: "Patient 3-Month Registration & Health Pass",
                        amountEtb: Number(regStatus.basePrice || 350),
                      });
                      setShowPayModal(true);
                    }}
                    className="btn-pill-primary text-xs py-2 px-4 whitespace-nowrap shadow-sm"
                  >
                    Renew Pass ({regStatus.basePrice || 350} ETB) →
                  </button>
                )}
              </div>
            )}

            {/* 1. Welcome & Next Appointment Hero Card */}
            <div className="bg-white rounded-3xl border border-[#E7E2D8] p-6 sm:p-8 shadow-warm flex flex-col lg:flex-row lg:items-center justify-between gap-6 min-w-0 overflow-hidden">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="badge-mint text-xs">Welcome Back</span>
                  <button
                    onClick={() => setShowDigitalCardModal(true)}
                    className="px-2.5 py-1 rounded-full bg-[#005C4B]/10 hover:bg-[#005C4B]/20 text-[#005C4B] border border-[#005C4B]/30 text-[11px] font-bold flex items-center gap-1 transition-all"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    Digital Patient Card
                  </button>
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="px-2.5 py-1 rounded-full bg-teal-500/10 hover:bg-teal-500/20 text-teal-800 border border-teal-500/30 text-[11px] font-bold flex items-center gap-1 transition-all"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    Share Medical Info (QR)
                  </button>
                  <button
                    onClick={() => setShowAuthorizeDeviceModal(true)}
                    className="px-2.5 py-1 rounded-full bg-purple-500/10 hover:bg-purple-500/20 text-purple-800 border border-purple-500/30 text-[11px] font-bold flex items-center gap-1 transition-all"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    Authorize Other Device
                  </button>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-[#162E27] font-serif-heading">
                  {getGreeting()}, {patientFirstName} 👋
                </h1>
                <p className="text-xs sm:text-sm text-[#687B74]">
                  Primary Care Provider: <strong className="text-[#162E27]">{pData.primaryDoctor || "NiniMed Clinical Care Team"}</strong> • Medical Network
                </p>
              </div>

              {/* Next Scheduled Visit Card */}
              {appointments && appointments.length > 0 ? (
                <div className="bg-[#FAF8F5] p-4 sm:p-5 rounded-2xl border border-[#E7E2D8] flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#E8F4F0] text-[#005C4B] flex items-center justify-center shrink-0">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-[#005C4B] block">Next Visit</span>
                    <div className="text-sm font-bold text-[#162E27]">{appointments[0].type}</div>
                    <div className="text-xs text-[#687B74]">
                      {appointments[0].date} {appointments[0].time && `at ${appointments[0].time}`} • {appointments[0].isTelehealth ? "Virtual Room" : appointments[0].location}
                    </div>
                  </div>
                  <Link
                    href="/patient/appointments"
                    className="btn-pill-primary text-xs py-2 px-3.5 ml-2 hidden sm:inline-flex"
                  >
                    Manage / Reschedule
                  </Link>
                </div>
              ) : (
                <div className="bg-[#FAF8F5] p-4 sm:p-5 rounded-2xl border border-[#E7E2D8] flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#E8F4F0] text-[#005C4B] flex items-center justify-center shrink-0">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-[#005C4B] block">Care Visits</span>
                    <div className="text-sm font-bold text-[#162E27]">No upcoming visit scheduled</div>
                    <div className="text-xs text-[#687B74]">Book on-demand in-person or telehealth visit</div>
                  </div>
                  <Link
                    href="/patient/book"
                    className="btn-pill-primary text-xs py-2 px-3.5 ml-2 hidden sm:inline-flex"
                  >
                    Book Visit
                  </Link>
                </div>
              )}
            </div>

            {/* 2. Signature 4-Card Quick Action Grid */}
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-sm font-bold text-[#162E27] uppercase tracking-wider">
                  Quick Care Launcher
                </h2>
                <span className="text-xs text-[#005C4B] font-semibold">24/7 Available</span>
              </div>
              <QuickActionGrid />
            </div>

            {/* 3. Preventive Care Gaps & Reminders Strip */}
            <div className="bg-white rounded-3xl border border-[#E7E2D8] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#005C4B]"></span>
                  <h3 className="font-bold text-sm text-[#162E27] font-display">
                    Preventive Care & Health Recommendations
                  </h3>
                </div>
                <span className="text-xs text-[#687B74]">Up to date</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E7E2D8] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🌱</span>
                    <div>
                      <h4 className="font-bold text-xs text-[#162E27]">Annual Comprehensive Physical</h4>
                      <p className="text-[11px] text-[#687B74]">Zero-wait comprehensive wellness screening</p>
                    </div>
                  </div>
                  <Link href="/patient/book?reason=annual-wellness" className="btn-pill-primary text-xs py-1.5 px-3">
                    Schedule
                  </Link>
                </div>

                <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E7E2D8] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🩸</span>
                    <div>
                      <h4 className="font-bold text-xs text-[#162E27]">Comprehensive Biomarker Panel</h4>
                      <p className="text-[11px] text-[#687B74]">Lipid, Metabolic, HbA1c & CBC profiling</p>
                    </div>
                  </div>
                  <Link href="/patient/book?reason=lab-draw" className="btn-pill-primary text-xs py-1.5 px-3">
                    Order Labs
                  </Link>
                </div>
              </div>
            </div>

            {/* 4. Active Submitted Cases & AI CDSS Triage Strip */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
                  <h3 className="text-sm font-bold text-[#162E27] uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-500" /> Active Health Cases & AI Triage
                  </h3>
                </div>
                <button onClick={() => setActiveTab("cases")} className="text-xs text-indigo-600 font-semibold hover:underline">
                  View All Cases ({myCases.length}) →
                </button>
              </div>

              {myCases && myCases.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {myCases.slice(0, 2).map((c: any) => (
                    <div key={c.id || c.caseId} className="p-4 rounded-2xl bg-white border border-[#E7E2D8] hover:border-indigo-400 hover:shadow-warm transition-all flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                            Case #{c.caseId || c.caseNumber || "REF"}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            c.status === "resolved" ? "bg-emerald-100 text-emerald-800" :
                            c.status === "escalated" ? "bg-rose-100 text-rose-800" :
                            "bg-amber-100 text-amber-800"
                          }`}>
                            {(c.status || "ai_analyzed").replace(/_/g, " ").toUpperCase()}
                          </span>
                        </div>
                        <h4 className="font-bold text-xs text-[#162E27] line-clamp-1">
                          {c.chiefComplaint || c.complaint?.chiefComplaint || "Clinical Intake Assessment"}
                        </h4>
                        <p className="text-[11px] text-[#687B74] mt-1 line-clamp-2">
                          {c.aiSummary || c.complaint?.description || "Multimodal triage complete. Under review by assigned clinician."}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-[#F2EFE9] flex items-center justify-between text-xs">
                        <span className="text-[11px] text-[#687B74]">
                          Doctor: <strong className="text-[#162E27]">{c.assignedHandlerName || c.assignedHandler || "Attending MD"}</strong>
                        </span>
                        <Link
                          href={`/patient/cases/${c.caseId || c.id}`}
                          className="px-3 py-1 rounded-xl bg-indigo-600 text-white font-bold text-[11px] hover:bg-indigo-700 transition-all flex items-center gap-1"
                        >
                          Track Case <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-white border border-[#E7E2D8] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-[#162E27]">No Open Clinical Cases</h4>
                      <p className="text-[11px] text-[#687B74]">Submit symptoms or photos anytime for instant AI analysis and doctor review.</p>
                    </div>
                  </div>
                  <Link href="/patient/submit-case" className="btn-pill-primary text-xs py-2 px-3.5 whitespace-nowrap">
                    Submit Case →
                  </Link>
                </div>
              )}
            </div>

            {/* 5. Recent Lab Results */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-bold text-[#162E27] uppercase tracking-wider">
                  Recent Diagnostic Lab Reports
                </h3>
                <button onClick={() => setActiveTab("records")} className="text-xs text-[#005C4B] font-semibold hover:underline">
                  View All Reports →
                </button>
              </div>

              {records?.labResults && records.labResults.length > 0 ? (
                <div className="space-y-3">
                  {records.labResults.slice(0, 2).map((lab: any) => (
                    <LabResultCard
                      key={lab.id}
                      id={lab.id}
                      testName={lab.testName}
                      date={lab.performedAt || "Recent"}
                      orderedBy={pData.primaryDoctor || "Attending Physician"}
                      doctorNote={lab.plainLanguageExplanation || "Results reviewed by care team."}
                      status={lab.isAbnormal ? "attention" : "normal"}
                      items={[
                        {
                          name: lab.testName,
                          value: String(lab.value),
                          unit: lab.unit,
                          referenceRange: lab.referenceRange || "Standard",
                          status: lab.isAbnormal ? "abnormal" : "normal",
                        },
                      ]}
                    />
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-white border border-[#E7E2D8] text-center text-xs text-[#687B74]">
                  No diagnostic lab reports recorded yet. Lab results will be published here as soon as they are processed.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: CASES & AI TRIAGE */}
        {activeTab === "cases" && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-[#162E27] font-display flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-600" /> My Health Cases & AI CDSS Triage
                </h2>
                <p className="text-xs text-[#687B74]">Track submitted symptom intakes, multimodal evidence, AI analysis, and attending doctor responses.</p>
              </div>
              <Link href="/patient/submit-case" className="btn-pill-primary text-xs py-2 px-4 shadow-sm">
                <Plus className="w-3.5 h-3.5" /> Submit New Case
              </Link>
            </div>

            {myCases.length > 0 ? (
              <div className="space-y-4">
                {myCases.map((c: any) => (
                  <div
                    key={c.id || c.caseId}
                    className="p-5 rounded-3xl bg-white border border-[#E7E2D8] hover:border-indigo-400 hover:shadow-warm-md transition-all space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F2EFE9] pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-[#162E27]">Case #{c.caseId || c.caseNumber || "REF"}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              c.status === "resolved" ? "bg-emerald-100 text-emerald-800" :
                              c.status === "escalated" ? "bg-rose-100 text-rose-800" :
                              "bg-indigo-100 text-indigo-800"
                            }`}>
                              {(c.status || "ai_analyzed").replace(/_/g, " ").toUpperCase()}
                            </span>
                          </div>
                          <p className="text-xs text-[#687B74]">Submitted on {c.submittedAt ? new Date(c.submittedAt).toLocaleDateString() : "Recently"}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          href={`/patient/cases/${c.caseId || c.id}`}
                          className="px-4 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-sm"
                        >
                          <span>Open Case Tracker</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#E7E2D8]">
                        <span className="text-[10px] uppercase font-bold text-[#687B74] block">Chief Complaint</span>
                        <p className="text-xs font-bold text-[#162E27] mt-0.5 line-clamp-2">
                          {c.chiefComplaint || c.complaint?.chiefComplaint || "General Symptom Evaluation"}
                        </p>
                      </div>

                      <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#E7E2D8]">
                        <span className="text-[10px] uppercase font-bold text-[#687B74] block">Assigned Doctor</span>
                        <p className="text-xs font-bold text-[#162E27] mt-0.5">
                          {c.assignedHandlerName || c.assignedHandler || "Clinical Care Team"}
                        </p>
                      </div>

                      <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#E7E2D8]">
                        <span className="text-[10px] uppercase font-bold text-[#687B74] block">Triage Urgency</span>
                        <p className={`text-xs font-bold mt-0.5 capitalize ${
                          c.severity === "very_severe" ? "text-rose-600" :
                          c.severity === "severe" ? "text-amber-600" : "text-emerald-700"
                        }`}>
                          {c.severity || "Moderate"} Priority
                        </p>
                      </div>
                    </div>

                    {c.aiSummary && (
                      <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-start gap-2.5">
                        <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] uppercase font-bold text-indigo-800 block">AI Clinical Decision Support Summary</span>
                          <p className="text-xs text-indigo-950 mt-0.5 leading-relaxed">{c.aiSummary}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white p-12 rounded-3xl border border-[#E7E2D8] text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-[#162E27]">No Health Cases Submitted Yet</h3>
                  <p className="text-xs text-[#687B74]">Submit your symptoms, audio voice memo, and photos for 24/7 AI pre-triage & clinician review.</p>
                </div>
                <Link href="/patient/submit-case" className="btn-pill-primary text-xs py-2.5 px-5 inline-flex items-center gap-1.5 shadow-sm">
                  <Plus className="w-3.5 h-3.5" /> Submit a New Health Case
                </Link>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: RECORDS */}
        {activeTab === "records" && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#162E27] font-display">My Health Records & Labs</h2>
                <p className="text-xs text-[#687B74]">Live diagnostic results annotated with care team explanations.</p>
              </div>
              <Link href="/patient/book?reason=lab-draw" className="btn-pill-primary text-xs py-2 px-4">
                <Plus className="w-3.5 h-3.5" /> Schedule Lab Test
              </Link>
            </div>

            {/* Diagnostic Labs Section */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-[#162E27] uppercase tracking-wider">Laboratory Reports</h3>
              {records?.labResults && records.labResults.length > 0 ? (
                <div className="space-y-4">
                  {records.labResults.map((lab: any) => (
                    <LabResultCard
                      key={lab.id}
                      id={lab.id}
                      testName={lab.testName}
                      date={lab.performedAt || "Recent"}
                      orderedBy={pData.primaryDoctor || "Attending Physician"}
                      doctorNote={lab.plainLanguageExplanation || "Verified by clinical laboratory."}
                      status={lab.isAbnormal ? "attention" : "normal"}
                      items={[
                        {
                          name: lab.testName,
                          value: String(lab.value),
                          unit: lab.unit,
                          referenceRange: lab.referenceRange || "Standard",
                          status: lab.isAbnormal ? "abnormal" : "normal",
                        },
                      ]}
                    />
                  ))}
                </div>
              ) : (
                <div className="p-8 rounded-2xl bg-white border border-[#E7E2D8] text-center text-xs text-[#687B74]">
                  No laboratory records available. Diagnostic tests ordered during clinical visits will automatically appear here.
                </div>
              )}
            </div>

            {/* Active Medications Section */}
            <div className="space-y-3 pt-4 border-t border-[#E7E2D8]">
              <h3 className="text-xs font-bold text-[#162E27] uppercase tracking-wider">Active Prescriptions & Medications</h3>
              {records?.medications && records.medications.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {records.medications.map((med: any, i: number) => (
                    <div key={i} className="p-4 rounded-2xl bg-white border border-[#E7E2D8] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-[#162E27] flex items-center gap-1.5">
                          <Pill className="w-3.5 h-3.5 text-[#005C4B]" /> {med.name}
                        </span>
                        <span className="badge-mint text-[10px]">Active</span>
                      </div>
                      <p className="text-[11px] text-[#687B74]">{med.dosage} • {med.frequency}</p>
                      <p className="text-[10px] text-[#33413C] italic">{med.instructions}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-white border border-[#E7E2D8] text-center text-xs text-[#687B74]">
                  No active prescription medications on file.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: APPOINTMENTS */}
        {activeTab === "appointments" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-[#162E27] font-display">Appointments & Visits</h2>
                <p className="text-xs text-[#687B74]">Manage your upcoming in-office and virtual video visits.</p>
              </div>
              <div className="flex items-center gap-2">
                <Link href="/patient/appointments" className="btn-pill-secondary text-xs py-2 px-3.5 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Manage / Reschedule</span>
                </Link>
                <Link href="/patient/book" className="btn-pill-primary text-xs py-2 px-4 flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Book New Visit</span>
                </Link>
              </div>
            </div>

            {appointments.length > 0 ? (
              <div className="space-y-3">
                {appointments.map((apt: any, idx: number) => (
                  <div key={apt.id || idx} className="bg-white p-5 rounded-2xl border border-[#E7E2D8] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <span className="badge-mint text-[10px]">{apt.isTelehealth ? "Video Visit" : "In-Person Clinic"}</span>
                      <h4 className="font-bold text-sm text-[#162E27] mt-1">{apt.type || apt.reason || "General Consultation"}</h4>
                      <p className="text-xs text-[#687B74]">{apt.provider || "Attending Physician"} • {apt.location || "NiniMed Medical Center"}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right text-xs">
                        <span className="font-bold text-[#162E27] block">{apt.date}</span>
                        <span className="text-[#687B74]">{apt.time}</span>
                      </div>
                      {apt.isTelehealth ? (
                        <Link
                          href={apt.joinUrl || `/telemedicine/${apt.roomId || `room-${apt.id || "live"}`}?role=patient&sessionId=${apt.id || ""}`}
                          className="btn-pill-primary text-xs py-2 px-3.5 flex items-center gap-1.5 shadow-sm"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>Join Video Room</span>
                        </Link>
                      ) : (
                        <Link
                          href="/patient/appointments"
                          className="btn-pill-secondary text-xs py-2 px-3.5"
                        >
                          Manage
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white p-12 rounded-3xl border border-[#E7E2D8] text-center space-y-4">
                <Calendar className="w-10 h-10 text-[#687B74]/50 mx-auto" />
                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-[#162E27]">No Scheduled Appointments</h3>
                  <p className="text-xs text-[#687B74]">You have no upcoming clinic visits or telehealth consultations.</p>
                </div>
                <Link href="/patient/book" className="btn-pill-primary text-xs py-2 px-4 inline-flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Schedule an Appointment
                </Link>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: MESSAGES */}
        {activeTab === "messages" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#162E27] font-display">Care Messages</h2>
                <p className="text-xs text-[#687B74]">Direct asynchronous communication with your assigned clinical care team.</p>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-[#E7E2D8] p-5 space-y-4">
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {messages.length > 0 ? (
                  messages.map((m: any, i: number) => (
                    <div
                      key={m.id || i}
                      className={`p-4 rounded-2xl border text-xs space-y-1 ${m.senderType === "patient"
                          ? "bg-[#E8F4F0] border-[#005C4B]/20 ml-6"
                          : "bg-[#FAF8F5] border-[#E7E2D8] mr-6"
                        }`}
                    >
                      <div className="flex items-center justify-between font-bold text-[#162E27]">
                        <span>{m.senderName || (m.senderType === "patient" ? "You" : "Care Provider")}</span>
                        <span className="text-[10px] text-[#687B74]">
                          {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : ""}
                        </span>
                      </div>
                      <p className="text-[#33413C] leading-relaxed">{m.body}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-xs text-[#687B74]">
                    No messages yet. Use the message composer below to reach your doctor or clinical coordinator.
                  </div>
                )}
              </div>

              <form onSubmit={handleSendMessage} className="flex gap-2 pt-2 border-t border-[#F2EFE9]">
                <input
                  type="text"
                  placeholder="Type a clinical query to your care team..."
                  value={newMsgText}
                  onChange={(e) => setNewMsgText(e.target.value)}
                  className="input-warm text-xs flex-1"
                />
                <button type="submit" className="btn-pill-primary text-xs py-2 px-4 flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 5: CARE PLAN */}
        {activeTab === "care_plan" && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-white p-6 rounded-3xl border border-[#E7E2D8] space-y-4">
              <h3 className="text-lg font-bold text-[#162E27] font-display">
                {carePlan?.overallTitle || "Personalized Health & Prevention Plan"}
              </h3>
              <p className="text-xs text-[#687B74]">
                Lead Clinician: {pData.primaryDoctor || "NiniMed Care Team"} • Active Plan
              </p>

              {carePlan?.goals && carePlan.goals.length > 0 ? (
                <div className="space-y-3 pt-2">
                  {carePlan.goals.map((goal: any, i: number) => (
                    <div key={i} className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E7E2D8] space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-[#162E27]">{goal.title || goal.name}</span>
                        <span className="text-[#005C4B]">{goal.status || "Active"}</span>
                      </div>
                      {goal.notes && <p className="text-[11px] text-[#687B74]">{goal.notes}</p>}
                    </div>
                  ))}
                </div>
              ) : carePlan?.lifestyleDirectives && carePlan.lifestyleDirectives.length > 0 ? (
                <div className="space-y-3 pt-2">
                  {carePlan.lifestyleDirectives.map((item: any, i: number) => (
                    <div key={i} className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E7E2D8] flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-[#162E27] block">{item.category}</span>
                        <span className="text-[#687B74] text-[11px]">{item.text}</span>
                      </div>
                      <span className="badge-mint text-[10px]">Active Goal</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-[#687B74]">
                  Your care plan will be populated with goals, nutrition guidelines, and treatment protocols after your clinical visit.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: INVOICES & BILLING */}
        {activeTab === "invoices" && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E7E2D8] space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F2EFE9] pb-4">
                <div>
                  <h3 className="text-xl font-bold text-[#162E27] font-display flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-[#005C4B]" />
                    Billing & Payment Receipts
                  </h3>
                  <p className="text-xs text-[#687B74]">
                    Itemized medical statements, 3-month registration records, and official tax receipts.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setPayModalConfig({
                      serviceType: "registration",
                      serviceCode: "REGISTRATION_3MO",
                      serviceTitle: "Patient 3-Month Registration & Health Pass",
                      amountEtb: Number(regStatus?.basePrice || 350),
                    });
                    setShowPayModal(true);
                  }}
                  className="btn-pill-primary text-xs py-2 px-4 flex items-center gap-1.5 shadow-sm"
                >
                  <CreditCard className="w-3.5 h-3.5" /> Make a Payment
                </button>
              </div>

              {invoicesList.length === 0 ? (
                <div className="text-center py-12 text-xs text-[#687B74] space-y-2">
                  <Receipt className="w-8 h-8 text-[#687B74]/40 mx-auto" />
                  <p>No billing invoices found. When you book visits or pay for labs, receipts will appear here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {invoicesList.map((inv) => (
                    <div
                      key={inv.id}
                      className="p-5 rounded-2xl bg-[#FAF8F5] border border-[#E7E2D8] space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E7E2D8]/60 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-[#005C4B]">
                            {inv.invoiceNumber}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${inv.status === "paid"
                                ? "bg-[#E8F4F0] text-[#005C4B]"
                                : "bg-amber-100 text-amber-900"
                              }`}
                          >
                            {inv.status.toUpperCase()}
                          </span>
                          {inv.paymentMethod && (
                            <span className="text-[10px] uppercase text-[#687B74] font-medium">
                              via {inv.paymentMethod}
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-black text-sm text-[#162E27]">
                            {Number(inv.totalAmount).toLocaleString()} {inv.currency || "Birr"}
                          </span>
                          <span className="text-[10px] text-[#687B74] block">
                            {inv.paidAt ? new Date(inv.paidAt).toLocaleDateString() : new Date(inv.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Items */}
                      <div className="space-y-1.5 text-xs text-[#33413C]">
                        {inv.items?.map((item: any, i: number) => (
                          <div key={i} className="flex justify-between">
                            <span className="text-[#687B74]">{item.description}</span>
                            <span className="font-mono font-semibold">
                              {Number(item.totalPrice).toLocaleString()} Birr
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t border-[#E7E2D8]/60">
                        <button
                          onClick={() => window.print()}
                          className="btn-pill-ghost text-[11px] py-1 px-3 flex items-center gap-1"
                        >
                          <Printer className="w-3 h-3" /> Print
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: QUESTIONNAIRES */}
        {activeTab === "questionnaires" && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-white p-6 rounded-3xl border border-[#E7E2D8] space-y-4">
              <h3 className="text-lg font-bold text-[#162E27] font-display">Health Intake & Questionnaires</h3>
              <p className="text-xs text-[#687B74]">Complete periodic health checks to help your care team prepare for visits.</p>

              <div className="space-y-3">
                {[
                  { title: "Annual Comprehensive Health History", status: "Completed", date: "Aug 10, 2026" },
                  { title: "PHQ-9 Mood & Wellness Screen", status: "Completed", date: "Aug 10, 2026" },
                  { title: "Sleep & Energy Biometrics Check", status: "Available", date: "Due in 2 weeks" },
                ].map((q, i) => (
                  <div key={i} className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E7E2D8] flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-[#162E27] block">{q.title}</span>
                      <span className="text-[#687B74] text-[11px]">{q.date}</span>
                    </div>
                    <span className={q.status === "Completed" ? "badge-mint text-[10px]" : "badge-terracotta text-[10px]"}>
                      {q.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: CONSENTS */}
        {activeTab === "consents" && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-white p-6 rounded-3xl border border-[#E7E2D8] space-y-4">
              <h3 className="text-lg font-bold text-[#162E27] font-display">Privacy & Telehealth Consents</h3>
              <p className="text-xs text-[#687B74]">Manage your electronic consents and HIPAA authorizations.</p>

              <div className="space-y-3 text-xs">
                {[
                  { title: "Telehealth Informed Consent & Video Recording Agreement", active: true },
                  { title: "HIPAA Notice of Privacy Practices", active: true },
                  { title: "Electronic Prescription (e-Rx) Transmission Authorization", active: true },
                  { title: "Care Team Information Sharing across Multi-Specialists", active: true },
                ].map((c, i) => (
                  <div key={i} className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E7E2D8] flex items-center justify-between">
                    <span className="font-bold text-[#162E27]">{c.title}</span>
                    <span className="badge-mint text-[10px]">Active Consent ✓</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {showTreatMeNow && <TreatMeNowModal onClose={() => setShowTreatMeNow(false)} />}
      <UniversalPaymentModal
        isOpen={showPayModal}
        onClose={() => setShowPayModal(false)}
        onSuccess={(receipt) => {
          showNotification(`Payment of ${receipt.amount} ETB cleared! (Ref: ${receipt.receiptNumber})`);
          setShowPayModal(false);
          fetchDashboardData();
        }}
        serviceType={payModalConfig.serviceType}
        serviceCode={payModalConfig.serviceCode}
        serviceTitle={payModalConfig.serviceTitle}
        amountEtb={payModalConfig.amountEtb}
        patientId={patient?.id}
        patientName={pData ? `${pData.firstName} ${pData.lastName}` : "Patient Member"}
      />

      {/* Digital Patient Card Modal */}
      {showDigitalCardModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in"
          onClick={(e) => e.target === e.currentTarget && setShowDigitalCardModal(false)}
        >
          <div className="w-full max-w-lg relative bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl">
            <button
              onClick={() => setShowDigitalCardModal(false)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <DigitalPatientCard
              card={{
                cardId: patient?.digitalCardNumber || `NINI-2026-${patient?.mrn?.replace(/\D/g, "") || "9482"}`,
                mrn: patient?.mrn || "MRN-PENDING",
                patientName: `${pData.firstName} ${pData.lastName}`,
                nationalId: patient?.nationalId || "ETH-VERIFIED-ID",
                nationalIdVerified: true,
                bloodType: pData.bloodType || "O+",
                primaryClinic: "NiniMed Habitat Main Clinic & 24/7 ER",
                issuedAt: "Aug 2026",
                validUntil: "Nov 2026",
                status: "Active 3-Month Membership",
                loginPasscode: `NN-${patient?.mrn?.replace(/\D/g, "") || "849201"}`,
              }}
              onProceed={() => setShowDigitalCardModal(false)}
              showProceedButton={false}
              onShareMedicalRecord={() => {
                setShowDigitalCardModal(false);
                setShowShareModal(true);
              }}
            />
          </div>
        </div>
      )}

      {/* Share Medical Info via QR Modal */}
      <ShareMedicalRecordModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        patientId={patient?.id}
        patientName={`${pData.firstName} ${pData.lastName}`}
      />

      {/* Authorize Other Device via QR Challenge Modal */}
      {showAuthorizeDeviceModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in"
          onClick={(e) => e.target === e.currentTarget && setShowAuthorizeDeviceModal(false)}
        >
          <div className="w-full max-w-md relative bg-slate-950 border border-purple-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-white text-center">
            <button
              onClick={() => {
                setShowAuthorizeDeviceModal(false);
                setAuthFeedback(null);
                setAuthChallengeInput("");
              }}
              className="absolute top-4 right-4 p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-14 h-14 mx-auto rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Smartphone className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-extrabold text-white">Authorize Login on Other Device</h2>
              <p className="text-xs text-slate-400">
                Enter the session code displayed on your other computer, tablet, or clinic kiosk to sign in instantly.
              </p>
            </div>

            {authFeedback && (
              <div
                className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${
                  authFeedback?.includes("successful") || authFeedback?.includes("authorized")
                    ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-300"
                    : "bg-rose-500/15 border border-rose-500/30 text-rose-300"
                }`}
              >
                <Check className="w-4 h-4 shrink-0" />
                <span>{authFeedback}</span>
              </div>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!authChallengeInput.trim()) return;
                setIsAuthorizing(true);
                setAuthFeedback(null);
                try {
                  const res = await fetch("/api/v1/auth/qr-login/authorize", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      sessionChallenge: authChallengeInput.trim(),
                    }),
                  });
                  const json = await res.json();
                  if (json.success) {
                    setAuthFeedback("Device successfully authorized! You are now logged in on that screen.");
                    setTimeout(() => {
                      setShowAuthorizeDeviceModal(false);
                      setAuthFeedback(null);
                      setAuthChallengeInput("");
                    }, 2500);
                  } else {
                    setAuthFeedback(json.error || "Failed to authorize session.");
                  }
                } catch {
                  setAuthFeedback("Network error connecting to authorization server.");
                } finally {
                  setIsAuthorizing(false);
                }
              }}
              className="space-y-4"
            >
              <div>
                <input
                  type="text"
                  required
                  value={authChallengeInput}
                  onChange={(e) => setAuthChallengeInput(e.target.value)}
                  placeholder="Paste or enter qr_sess_..."
                  className="w-full text-center font-mono py-3 px-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-400"
                />
              </div>

              <button
                type="submit"
                disabled={isAuthorizing || !authChallengeInput.trim()}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-xl shadow-purple-950/50 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{isAuthorizing ? "Authorizing Device..." : "Approve & Sign In Other Device"}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </RoleGuard>
  );
}

export default function PatientDashboardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs font-semibold text-slate-500">Loading patient dashboard...</div>}>
      <PatientDashboardContent />
    </Suspense>
  );
}
