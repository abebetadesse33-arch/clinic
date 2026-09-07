"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useClinic } from "@/context/ClinicContext";
import { soundAlerts } from "@/lib/audio/sound-alerts";
import {
  User,
  Calendar,
  Clock,
  ShieldCheck,
  Building2,
  Video,
  Send,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Plus,
  Trash2,
  Volume2,
  VolumeX,
  Smartphone,
  ExternalLink,
  DollarSign,
  FileText,
  BadgeCheck,
  GraduationCap,
  Award,
  Globe2,
  Stethoscope,
  HeartPulse,
  Activity,
  Check,
} from "lucide-react";

interface ScheduleShift {
  dayOfWeek: number; // 1 = Monday, ..., 7 = Sunday
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  isTelehealthAvailable: boolean;
  isInPersonAvailable: boolean;
  isActive: boolean;
}

interface ClinicalServiceItem {
  id: string;
  name: string;
  durationMinutes: number;
  feeEtb: number;
  isActive: boolean;
  description?: string;
}

const DAYS = [
  { id: 1, name: "Monday" },
  { id: 2, name: "Tuesday" },
  { id: 3, name: "Wednesday" },
  { id: 4, name: "Thursday" },
  { id: 5, name: "Friday" },
  { id: 6, name: "Saturday" },
  { id: 0, name: "Sunday" },
];

const DEFAULT_SERVICES: ClinicalServiceItem[] = [
  { id: "telehealth_consult", name: "Virtual Video Consultation", durationMinutes: 30, feeEtb: 500, isActive: true, description: "Full encrypted WebRTC consultation, digital prescription & clinical directives." },
  { id: "in_person_exam", name: "Comprehensive In-Person Physical Exam", durationMinutes: 45, feeEtb: 750, isActive: true, description: "Detailed clinical examination at NiniMed Medical Center branch." },
  { id: "urgent_triage", name: "Rapid Urgent Triage & Acute Follow-Up", durationMinutes: 15, feeEtb: 350, isActive: true, description: "Fast acute assessment for symptom flare-ups or post-procedure checks." },
  { id: "second_opinion", name: "Specialist Second Opinion & Diagnostics Review", durationMinutes: 60, feeEtb: 1200, isActive: true, description: "Multi-disciplinary review of lab reports, genomic findings, and imaging." },
  { id: "chronic_care", name: "Chronic Disease Plan & Medication Refill", durationMinutes: 20, feeEtb: 400, isActive: true, description: "Hypertension, diabetes, asthma routine follow-up & e-prescribing." },
  { id: "emergency_telehealth", name: "Emergency / Off-Hours Virtual Consultation", durationMinutes: 30, feeEtb: 900, isActive: false, description: "On-demand triage during nights or weekends." },
];

const AVAILABLE_INSURANCES = [
  "Ethiopian Community Health Insurance (CBHI)",
  "MedNet Global Healthcare",
  "Jubilee Life & Health",
  "Cigna Global Health",
  "Aetna International",
  "Nyala Insurance Health Cover",
  "Direct Self-Pay (Telebirr / CBE / Cash)",
];

export default function ProviderProfileEditor() {
  const { currentUser } = useClinic();
  const [activeTab, setActiveTab] = useState<"bio" | "services" | "schedule" | "notifications" | "telegram">("bio");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Tab 1: Bio & Credentials Expanded Fields
  const [academicTitle, setAcademicTitle] = useState("MD, FACP");
  const [yearsOfExperience, setYearsOfExperience] = useState<number | string>(9);
  const [medicalSchool, setMedicalSchool] = useState("Addis Ababa University School of Medicine");
  const [residencyFellowship, setResidencyFellowship] = useState("Tikur Anbessa Specialized Hospital / St. Paul's");
  const [licenseNumber, setLicenseNumber] = useState("MD-782914-TX");
  const [licenseIssuingBody, setLicenseIssuingBody] = useState("Federal Ministry of Health & Medical Board");
  const [licenseExpiryDate, setLicenseExpiryDate] = useState("2028-12-31");
  const [npiNumber, setNpiNumber] = useState("ETH-MED-84920");
  const [hospitalAffiliations, setHospitalAffiliations] = useState("NiniMed Debre Birhan Center, Tikur Anbessa Hospital");
  const [boardCertifications, setBoardCertifications] = useState("Ethiopian Medical Association Board Certified in Internal Medicine");
  const [bio, setBio] = useState("Dedicated healthcare clinician focused on holistic biopsychosocial care, rapid diagnostics, and preventative cardiometabolic wellness.");
  const [specialties, setSpecialties] = useState<string[]>(["Internal Medicine", "Preventative Cardiology", "Metabolic Health"]);
  const [newSpecialty, setNewSpecialty] = useState("");
  const [languages, setLanguages] = useState<string[]>(["English", "Amharic", "Oromo"]);
  const [newLanguage, setNewLanguage] = useState("");
  const [telehealthReadiness, setTelehealthReadiness] = useState("Available for same-day encrypted WebRTC video consults and urgent electronic prescriptions.");
  const [approvalStatus, setApprovalStatus] = useState<string>("draft");
  const [hrFeedback, setHrFeedback] = useState<string | null>(null);

  // Tab 2: Clinical Services & Pricing Expanded Fields
  const [clinicalServices, setClinicalServices] = useState<ClinicalServiceItem[]>(DEFAULT_SERVICES);
  const [consultationFeeEtb, setConsultationFeeEtb] = useState("500.00");
  const [currency, setCurrency] = useState("ETB");
  const [followUpGracePeriodDays, setFollowUpGracePeriodDays] = useState<number>(7);
  const [acceptedInsurances, setAcceptedInsurances] = useState<string[]>([
    "Ethiopian Community Health Insurance (CBHI)",
    "MedNet Global Healthcare",
    "Direct Self-Pay (Telebirr / CBE / Cash)",
  ]);
  const [cancellationNotice, setCancellationNotice] = useState("Free cancellation & full reschedule flexibility up to 2 hours prior to scheduled start time.");
  const [emergencySurchargeEnabled, setEmergencySurchargeEnabled] = useState(true);

  // New Custom Service Form
  const [customServiceName, setCustomServiceName] = useState("");
  const [customServiceDuration, setCustomServiceDuration] = useState(30);
  const [customServiceFee, setCustomServiceFee] = useState(500);

  // Tab 3: Schedule Shifts
  const [schedules, setSchedules] = useState<ScheduleShift[]>([
    { dayOfWeek: 1, startTime: "09:00", endTime: "17:00", slotDurationMinutes: 30, isTelehealthAvailable: true, isInPersonAvailable: true, isActive: true },
    { dayOfWeek: 2, startTime: "09:00", endTime: "17:00", slotDurationMinutes: 30, isTelehealthAvailable: true, isInPersonAvailable: true, isActive: true },
    { dayOfWeek: 3, startTime: "09:00", endTime: "17:00", slotDurationMinutes: 30, isTelehealthAvailable: true, isInPersonAvailable: true, isActive: true },
    { dayOfWeek: 4, startTime: "09:00", endTime: "17:00", slotDurationMinutes: 30, isTelehealthAvailable: true, isInPersonAvailable: true, isActive: true },
    { dayOfWeek: 5, startTime: "09:00", endTime: "17:00", slotDurationMinutes: 30, isTelehealthAvailable: true, isInPersonAvailable: true, isActive: true },
  ]);

  // Tab 4: Audio Settings
  const [isAudioMuted, setIsAudioMuted] = useState(soundAlerts.getIsMuted());

  // Tab 5: Telegram Integration State
  const [telegramData, setTelegramData] = useState<{
    token: string;
    botUsername: string;
    telegramLink: string;
    isConnected: boolean;
    telegramUsername: string | null;
  } | null>(null);
  const [isGeneratingTg, setIsGeneratingTg] = useState(false);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const fetchProfileData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/v1/provider/profile/me?userId=${currentUser?.id || ""}`, { cache: "no-store" });
      const d = await res.json();
      if (d.success && d.data) {
        const p = d.data.profile;
        if (p) {
          setBio(p.bio || "");
          setLicenseNumber(p.licenseNumber || "MD-782914-TX");
          setLicenseIssuingBody(p.licenseIssuingBody || "Federal Ministry of Health");
          setConsultationFeeEtb(p.consultationFeeEtb || "500.00");
          setSpecialties(p.specialties || ["Internal Medicine"]);
          setLanguages(p.languages || ["English", "Amharic"]);
          setApprovalStatus(p.approvalStatus || "draft");
          setHrFeedback(p.hrFeedback);

          const meta = p.metadata || {};
          if (meta.academicTitle) setAcademicTitle(meta.academicTitle);
          if (meta.yearsOfExperience) setYearsOfExperience(meta.yearsOfExperience);
          if (meta.medicalSchool) setMedicalSchool(meta.medicalSchool);
          if (meta.residencyFellowship) setResidencyFellowship(meta.residencyFellowship);
          if (meta.licenseExpiryDate) setLicenseExpiryDate(meta.licenseExpiryDate);
          if (meta.npiNumber) setNpiNumber(meta.npiNumber);
          if (meta.hospitalAffiliations) setHospitalAffiliations(meta.hospitalAffiliations);
          if (meta.boardCertifications) setBoardCertifications(meta.boardCertifications);
          if (meta.telehealthReadiness) setTelehealthReadiness(meta.telehealthReadiness);
          if (meta.currency) setCurrency(meta.currency);
          if (meta.followUpGracePeriodDays !== undefined) setFollowUpGracePeriodDays(meta.followUpGracePeriodDays);
          if (Array.isArray(meta.acceptedInsurances)) setAcceptedInsurances(meta.acceptedInsurances);
          if (meta.cancellationPolicyNotice) setCancellationNotice(meta.cancellationPolicyNotice);
          if (Array.isArray(meta.clinicalServices) && meta.clinicalServices.length > 0) {
            setClinicalServices(meta.clinicalServices);
          }
        }
        if (Array.isArray(d.data.schedules) && d.data.schedules.length > 0) {
          setSchedules(d.data.schedules);
        }
      }
    } catch (err) {
      console.error("Failed to load provider profile:", err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  // Save Draft Handler
  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/v1/provider/profile/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser?.id || "00000000-0000-0000-0000-000000000001",
          bio,
          specialties,
          languages,
          licenseNumber,
          licenseIssuingBody,
          consultationFeeEtb,
          metadata: {
            academicTitle,
            yearsOfExperience: Number(yearsOfExperience),
            medicalSchool,
            residencyFellowship,
            licenseExpiryDate,
            npiNumber,
            hospitalAffiliations,
            boardCertifications,
            telehealthReadiness,
            currency,
            followUpGracePeriodDays,
            acceptedInsurances,
            cancellationPolicyNotice: cancellationNotice,
            emergencySurchargeEnabled,
            clinicalServices,
          },
          schedules,
        }),
      });
      const d = await res.json();
      if (d.success) {
        showToast("Draft profile & services saved successfully!");
        setApprovalStatus("draft");
      } else {
        showToast(d.error || "Failed to save draft", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Network error saving draft", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Submit for HR Review
  const handleSubmitToHr = async () => {
    setIsSubmitting(true);
    try {
      await handleSaveDraft();

      const res = await fetch("/api/v1/provider/profile/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser?.id || "00000000-0000-0000-0000-000000000001",
        }),
      });
      const d = await res.json();
      if (d.success) {
        showToast("Profile & schedule submitted to HR queue! Awaiting verification.");
        setApprovalStatus("pending_hr");
      } else {
        showToast(d.error || "Failed to submit to HR", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Network error submitting to HR", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Telegram Connect
  const handleConnectTelegram = async () => {
    setIsGeneratingTg(true);
    try {
      const res = await fetch("/api/v1/telegram/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser?.id || "00000000-0000-0000-0000-000000000001",
        }),
      });
      const d = await res.json();
      if (d.success) {
        setTelegramData(d.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingTg(false);
    }
  };

  const toggleDaySchedule = (dayId: number) => {
    setSchedules((prev) => {
      const exists = prev.find((s) => s.dayOfWeek === dayId);
      if (exists) {
        return prev.map((s) => (s.dayOfWeek === dayId ? { ...s, isActive: !s.isActive } : s));
      }
      return [
        ...prev,
        {
          dayOfWeek: dayId,
          startTime: "09:00",
          endTime: "17:00",
          slotDurationMinutes: 30,
          isTelehealthAvailable: true,
          isInPersonAvailable: true,
          isActive: true,
        },
      ];
    });
  };

  const updateShiftTimes = (dayId: number, field: "startTime" | "endTime" | "slotDurationMinutes", val: any) => {
    setSchedules((prev) =>
      prev.map((s) => (s.dayOfWeek === dayId ? { ...s, [field]: val } : s))
    );
  };

  const toggleServiceActive = (serviceId: string) => {
    setClinicalServices((prev) =>
      prev.map((s) => (s.id === serviceId ? { ...s, isActive: !s.isActive } : s))
    );
  };

  const updateServiceFee = (serviceId: string, fee: number) => {
    setClinicalServices((prev) =>
      prev.map((s) => (s.id === serviceId ? { ...s, feeEtb: fee } : s))
    );
  };

  const updateServiceDuration = (serviceId: string, duration: number) => {
    setClinicalServices((prev) =>
      prev.map((s) => (s.id === serviceId ? { ...s, durationMinutes: duration } : s))
    );
  };

  const handleAddCustomService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customServiceName.trim()) return;
    const newService: ClinicalServiceItem = {
      id: `custom_${Date.now()}`,
      name: customServiceName.trim(),
      durationMinutes: Number(customServiceDuration) || 30,
      feeEtb: Number(customServiceFee) || 500,
      isActive: true,
      description: "Custom practitioner clinical encounter.",
    };
    setClinicalServices([...clinicalServices, newService]);
    setCustomServiceName("");
    showToast(`Added service: ${newService.name}`);
  };

  const toggleInsurance = (insName: string) => {
    setAcceptedInsurances((prev) =>
      prev.includes(insName) ? prev.filter((i) => i !== insName) : [...prev, insName]
    );
  };

  return (
    <div className="space-y-6 pb-16 max-w-5xl mx-auto animate-fade-in">
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
            <AlertCircle className="w-4 h-4 text-white" />
          )}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Top Banner & Verification Status */}
      <div className="bg-white rounded-3xl border border-[#E7E2D8] p-6 sm:p-8 shadow-warm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="badge-mint text-xs">Provider Credentials</span>
            {approvalStatus === "approved" && (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold flex items-center gap-1">
                <BadgeCheck className="w-3.5 h-3.5" /> Approved & Live for Patients
              </span>
            )}
            {approvalStatus === "pending_hr" && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold flex items-center gap-1 animate-pulse">
                <Clock className="w-3.5 h-3.5" /> Awaiting HR Verification
              </span>
            )}
            {approvalStatus === "rejected" && (
              <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 text-xs font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Changes Requested by HR
              </span>
            )}
            {approvalStatus === "draft" && (
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold">
                Draft Mode (Not Submitted)
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-[#162E27] font-serif-heading">
            {currentUser.fullName} <span className="text-[#005C4B] text-xl font-sans font-normal">({academicTitle})</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#687B74]">
            Manage your credentials, training bio, service pricing catalogue, weekly shifts, audio alerts, and Telegram bot.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleSaveDraft}
            disabled={isSaving}
            className="btn-pill-secondary text-xs py-2.5 px-4 font-bold"
          >
            {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Save Draft"}
          </button>
          <button
            onClick={handleSubmitToHr}
            disabled={isSubmitting || approvalStatus === "pending_hr"}
            className="btn-pill-primary text-xs py-2.5 px-5 font-bold flex items-center gap-1.5 shadow-sm"
          >
            {isSubmitting ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>{approvalStatus === "pending_hr" ? "Pending HR Approval" : "Submit for HR Approval"}</span>
          </button>
        </div>
      </div>

      {/* HR Feedback Banner if rejected */}
      {hrFeedback && approvalStatus === "rejected" && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 text-xs space-y-1">
          <div className="font-bold flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-rose-600" /> HR Reviewer Feedback:
          </div>
          <p>{hrFeedback}</p>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E7E2D8] pb-1 overflow-x-auto scrollbar-hide">
        {[
          { id: "bio", label: "Professional Bio & License", icon: User },
          { id: "services", label: "Clinical Services & Pricing", icon: DollarSign },
          { id: "schedule", label: "Weekly Schedule Matrix", icon: Calendar },
          { id: "notifications", label: "Audio & Beep Alerts", icon: Volume2 },
          { id: "telegram", label: "Telegram Bot & Mini App", icon: Smartphone },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === id
                ? "bg-[#005C4B] text-white shadow-sm"
                : "bg-white text-[#33413C] border border-[#E7E2D8] hover:bg-[#FAF8F5]"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PROFESSIONAL BIO & LICENSE (EXPANDED FIELDS)                       */}
      {/* ========================================================================= */}
      {activeTab === "bio" && (
        <div className="bg-white rounded-3xl border border-[#E7E2D8] p-6 sm:p-8 shadow-warm space-y-6 animate-fade-in">
          <div className="border-b border-[#F2EFE9] pb-4">
            <h3 className="text-base font-bold text-[#162E27] flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-[#005C4B]" />
              Academic Credentials, Licensing & Training
            </h3>
            <p className="text-xs text-[#687B74]">
              These verified credentials will be verified by HR and shown on your patient profile card.
            </p>
          </div>

          {/* Row 1: Academic Title, Years of Experience, NPI */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#162E27]">Professional Title / Degrees</label>
              <input
                type="text"
                value={academicTitle}
                onChange={(e) => setAcademicTitle(e.target.value)}
                placeholder="e.g. MD, MBBS, FACP, PhD, BSN, RN, PharmD"
                className="input-warm text-xs w-full p-2.5 rounded-xl border border-[#E7E2D8] font-bold text-[#162E27]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#162E27]">Years in Clinical Practice</label>
              <input
                type="number"
                min="0"
                max="60"
                value={yearsOfExperience}
                onChange={(e) => setYearsOfExperience(e.target.value)}
                className="input-warm text-xs w-full p-2.5 rounded-xl border border-[#E7E2D8]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#162E27]">NPI / Regulatory Registry ID</label>
              <input
                type="text"
                value={npiNumber}
                onChange={(e) => setNpiNumber(e.target.value)}
                placeholder="e.g. ETH-MED-84920"
                className="input-warm text-xs w-full p-2.5 rounded-xl border border-[#E7E2D8] font-mono"
              />
            </div>
          </div>

          {/* Row 2: Medical School & Residency */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#162E27]">Primary Medical School / University</label>
              <input
                type="text"
                value={medicalSchool}
                onChange={(e) => setMedicalSchool(e.target.value)}
                placeholder="e.g. Addis Ababa University School of Medicine"
                className="input-warm text-xs w-full p-2.5 rounded-xl border border-[#E7E2D8]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#162E27]">Residency & Fellowship Training Hospital</label>
              <input
                type="text"
                value={residencyFellowship}
                onChange={(e) => setResidencyFellowship(e.target.value)}
                placeholder="e.g. Tikur Anbessa Specialized Hospital / Johns Hopkins"
                className="input-warm text-xs w-full p-2.5 rounded-xl border border-[#E7E2D8]"
              />
            </div>
          </div>

          {/* Row 3: License Number, Issuing Body, Expiry Date */}
          <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E7E2D8] space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#162E27] uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#005C4B]" />
                Medical Board License & Verification
              </span>
              <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold">
                Government Verified
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#687B74]">License Number</label>
                <input
                  type="text"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="e.g. MD-782914-TX"
                  className="input-warm text-xs w-full p-2 rounded-xl border border-[#E7E2D8] font-mono font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#687B74]">Issuing Authority / Board</label>
                <input
                  type="text"
                  value={licenseIssuingBody}
                  onChange={(e) => setLicenseIssuingBody(e.target.value)}
                  placeholder="e.g. Federal Ministry of Health"
                  className="input-warm text-xs w-full p-2 rounded-xl border border-[#E7E2D8]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#687B74]">License Expiration Date</label>
                <input
                  type="date"
                  value={licenseExpiryDate}
                  onChange={(e) => setLicenseExpiryDate(e.target.value)}
                  className="input-warm text-xs w-full p-2 rounded-xl border border-[#E7E2D8]"
                />
              </div>
            </div>
          </div>

          {/* Row 4: Hospital Affiliations & Board Certifications */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#162E27]">Hospital & Clinical Affiliations</label>
              <input
                type="text"
                value={hospitalAffiliations}
                onChange={(e) => setHospitalAffiliations(e.target.value)}
                placeholder="e.g. NiniMed Debre Birhan Center, St. Paul's Hospital"
                className="input-warm text-xs w-full p-2.5 rounded-xl border border-[#E7E2D8]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#162E27]">Board Certifications & Honors</label>
              <input
                type="text"
                value={boardCertifications}
                onChange={(e) => setBoardCertifications(e.target.value)}
                placeholder="e.g. Ethiopian Medical Association Fellow, Board Certified"
                className="input-warm text-xs w-full p-2.5 rounded-xl border border-[#E7E2D8]"
              />
            </div>
          </div>

          {/* Row 5: Professional Biography */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#162E27]">
              Professional Biography & Philosophy of Care
            </label>
            <textarea
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Describe your clinical training, clinical interests, and holistic approach to patient care..."
              className="input-warm text-xs w-full p-3 rounded-2xl border border-[#E7E2D8] resize-none"
            />
          </div>

          {/* Row 6: Specialties & Sub-disciplines */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#162E27]">Clinical Specialties & Sub-disciplines</label>
            <div className="flex flex-wrap items-center gap-2">
              {specialties.map((s, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-full bg-[#E8F4F0] text-[#005C4B] border border-[#005C4B]/20 text-xs font-bold flex items-center gap-1.5"
                >
                  <span>{s}</span>
                  <button
                    type="button"
                    onClick={() => setSpecialties(specialties.filter((_, i) => i !== idx))}
                    className="hover:text-rose-600 font-bold"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add specialty tag (e.g. Preventive Cardiology, Diabetes Care)..."
                value={newSpecialty}
                onChange={(e) => setNewSpecialty(e.target.value)}
                className="input-warm text-xs flex-1 p-2 rounded-xl border border-[#E7E2D8]"
              />
              <button
                type="button"
                onClick={() => {
                  if (newSpecialty.trim()) {
                    setSpecialties([...specialties, newSpecialty.trim()]);
                    setNewSpecialty("");
                  }
                }}
                className="btn-pill-primary text-xs py-2 px-3"
              >
                Add Tag
              </button>
            </div>
          </div>

          {/* Row 7: Languages Spoken & Telehealth Motto */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#162E27] flex items-center gap-1.5">
                <Globe2 className="w-4 h-4 text-[#005C4B]" /> Languages Spoken
              </label>
              <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                {languages.map((l, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-0.5 rounded-full bg-[#FAF8F5] border border-[#E7E2D8] text-xs font-semibold text-[#162E27] flex items-center gap-1"
                  >
                    <span>{l}</span>
                    <button
                      type="button"
                      onClick={() => setLanguages(languages.filter((_, i) => i !== idx))}
                      className="text-[#687B74] hover:text-rose-600"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add language (e.g. French, Tigrinya)..."
                  value={newLanguage}
                  onChange={(e) => setNewLanguage(e.target.value)}
                  className="input-warm text-xs flex-1 p-2 rounded-xl border border-[#E7E2D8]"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newLanguage.trim()) {
                      setLanguages([...languages, newLanguage.trim()]);
                      setNewLanguage("");
                    }
                  }}
                  className="btn-pill-secondary text-xs py-2 px-3"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#162E27] flex items-center gap-1.5">
                <Video className="w-4 h-4 text-blue-600" /> Telehealth & Urgent Care Motto
              </label>
              <input
                type="text"
                value={telehealthReadiness}
                onChange={(e) => setTelehealthReadiness(e.target.value)}
                placeholder="e.g. Available for same-day encrypted WebRTC video visits..."
                className="input-warm text-xs w-full p-2.5 rounded-xl border border-[#E7E2D8]"
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CLINICAL SERVICES & PRICING (EXPANDED FIELDS)                     */}
      {/* ========================================================================= */}
      {activeTab === "services" && (
        <div className="bg-white rounded-3xl border border-[#E7E2D8] p-6 sm:p-8 shadow-warm space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F2EFE9] pb-4">
            <div>
              <h3 className="text-base font-bold text-[#162E27] flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-[#005C4B]" />
                Clinical Services Catalogue & Consultation Pricing
              </h3>
              <p className="text-xs text-[#687B74]">
                Configure distinct consultation durations, fee structures, follow-up rules, and accepted billing networks.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#687B74]">Currency:</span>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="input-warm text-xs py-1.5 px-3 rounded-xl border border-[#E7E2D8] font-bold text-[#162E27]"
              >
                <option value="ETB">ETB (Ethiopian Birr)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
          </div>

          {/* Configurable Clinical Services List */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-[#162E27] uppercase tracking-wider block">
              Active Service Offerings
            </span>

            {clinicalServices.map((service) => (
              <div
                key={service.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  service.isActive
                    ? "bg-white border-[#005C4B]/30 shadow-sm"
                    : "bg-[#FAF8F5] border-[#E7E2D8] opacity-60"
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => toggleServiceActive(service.id)}
                    className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs transition-all ${
                      service.isActive
                        ? "bg-[#005C4B] text-white"
                        : "border border-[#E7E2D8] bg-white text-transparent"
                    }`}
                  >
                    ✓
                  </button>
                  <div>
                    <div className="font-bold text-sm text-[#162E27] flex items-center gap-2">
                      <span>{service.name}</span>
                      {service.id.includes("telehealth") ? (
                        <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                          Video
                        </span>
                      ) : (
                        <span className="text-[10px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                          In-Person
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#687B74] mt-0.5">{service.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#687B74]">Duration:</span>
                    <input
                      type="number"
                      min="5"
                      step="5"
                      value={service.durationMinutes}
                      onChange={(e) => updateServiceDuration(service.id, Number(e.target.value))}
                      className="input-warm text-xs w-16 p-1.5 rounded-lg border border-[#E7E2D8] font-mono text-center"
                    />
                    <span className="text-[#687B74]">min</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-[#162E27]">Fee ({currency}):</span>
                    <input
                      type="number"
                      step="50"
                      value={service.feeEtb}
                      onChange={(e) => updateServiceFee(service.id, Number(e.target.value))}
                      className="input-warm text-xs w-24 p-1.5 rounded-lg border border-[#E7E2D8] font-mono font-bold text-center"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add Custom Clinical Service Form */}
          <form onSubmit={handleAddCustomService} className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E7E2D8] space-y-3">
            <span className="text-xs font-bold text-[#162E27] flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-[#005C4B]" />
              Add Specialized Clinical Service
            </span>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs">
              <input
                type="text"
                placeholder="Service Name (e.g. ECG Review, Nutritional Audit)..."
                value={customServiceName}
                onChange={(e) => setCustomServiceName(e.target.value)}
                className="input-warm p-2 rounded-xl border border-[#E7E2D8] md:col-span-2"
              />
              <input
                type="number"
                placeholder="Duration (mins)"
                value={customServiceDuration}
                onChange={(e) => setCustomServiceDuration(Number(e.target.value))}
                className="input-warm p-2 rounded-xl border border-[#E7E2D8]"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder={`Fee (${currency})`}
                  value={customServiceFee}
                  onChange={(e) => setCustomServiceFee(Number(e.target.value))}
                  className="input-warm p-2 rounded-xl border border-[#E7E2D8] flex-1 font-bold font-mono"
                />
                <button type="submit" className="btn-pill-primary px-3 text-xs">
                  Add
                </button>
              </div>
            </div>
          </form>

          {/* Follow-up Grace Period & Policy Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E7E2D8] space-y-2">
              <label className="text-xs font-bold text-[#162E27] block">
                Free Follow-Up Grace Period
              </label>
              <select
                value={followUpGracePeriodDays}
                onChange={(e) => setFollowUpGracePeriodDays(Number(e.target.value))}
                className="input-warm text-xs w-full p-2.5 rounded-xl border border-[#E7E2D8] font-bold text-[#162E27]"
              >
                <option value={7}>Free follow-up messaging & labs review within 7 Days</option>
                <option value={14}>Free follow-up messaging & labs review within 14 Days</option>
                <option value={30}>Comprehensive 30-Day Follow-Up included</option>
                <option value={0}>No free follow-up (Standard pay-per-encounter)</option>
              </select>
              <p className="text-[11px] text-[#687B74]">
                Allows patient to message care team for lab clarifications without additional visit fee.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E7E2D8] space-y-2">
              <label className="text-xs font-bold text-[#162E27] block">
                Patient Cancellation & Reschedule Notice
              </label>
              <input
                type="text"
                value={cancellationNotice}
                onChange={(e) => setCancellationNotice(e.target.value)}
                className="input-warm text-xs w-full p-2.5 rounded-xl border border-[#E7E2D8]"
              />
              <p className="text-[11px] text-[#687B74]">
                Visible in the patient booking wizard before appointment confirmation.
              </p>
            </div>
          </div>

          {/* Accepted Insurance & Direct Billing Networks */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#162E27] block">
              Accepted Insurance Networks & Direct Billing
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {AVAILABLE_INSURANCES.map((ins) => {
                const isSelected = acceptedInsurances.includes(ins);
                return (
                  <button
                    type="button"
                    key={ins}
                    onClick={() => toggleInsurance(ins)}
                    className={`p-3 rounded-xl border text-left text-xs transition-all flex items-center justify-between ${
                      isSelected
                        ? "bg-[#E8F4F0] border-[#005C4B] font-bold text-[#005C4B]"
                        : "bg-white border-[#E7E2D8] text-[#33413C] hover:bg-[#FAF8F5]"
                    }`}
                  >
                    <span>{ins}</span>
                    {isSelected && <Check className="w-4 h-4 text-[#005C4B] shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: WEEKLY AVAILABILITY MATRIX                                         */}
      {/* ========================================================================= */}
      {activeTab === "schedule" && (
        <div className="bg-white rounded-3xl border border-[#E7E2D8] p-6 sm:p-8 shadow-warm space-y-5 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#F2EFE9] pb-3">
            <div>
              <h3 className="text-base font-bold text-[#162E27]">Weekly Consultation Shift Matrix</h3>
              <p className="text-xs text-[#687B74]">Configure working days, hours, and format availability.</p>
            </div>
            <span className="badge-mint text-xs">Awaiting HR Review Upon Submit</span>
          </div>

          <div className="space-y-3">
            {DAYS.map((day) => {
              const shift = schedules.find((s) => s.dayOfWeek === day.id);
              const isActive = shift ? shift.isActive : false;

              return (
                <div
                  key={day.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isActive ? "bg-white border-[#005C4B]/30 shadow-sm" : "bg-[#FAF8F5] border-[#E7E2D8] opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggleDaySchedule(day.id)}
                      className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs transition-all ${
                        isActive ? "bg-[#005C4B] text-white" : "border border-[#E7E2D8] bg-white text-transparent"
                      }`}
                    >
                      ✓
                    </button>
                    <span className="font-bold text-sm text-[#162E27] w-28">{day.name}</span>
                  </div>

                  {isActive ? (
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#687B74]" />
                        <input
                          type="time"
                          value={shift?.startTime || "09:00"}
                          onChange={(e) => updateShiftTimes(day.id, "startTime", e.target.value)}
                          className="input-warm text-xs p-1.5 rounded-lg border border-[#E7E2D8]"
                        />
                        <span>to</span>
                        <input
                          type="time"
                          value={shift?.endTime || "17:00"}
                          onChange={(e) => updateShiftTimes(day.id, "endTime", e.target.value)}
                          className="input-warm text-xs p-1.5 rounded-lg border border-[#E7E2D8]"
                        />
                      </div>

                      <div className="flex items-center gap-2 pl-2 border-l border-[#E7E2D8]">
                        <span className="text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1">
                          <Video className="w-3 h-3" /> Telehealth
                        </span>
                        <span className="text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1">
                          <Building2 className="w-3 h-3" /> In-Person
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-[#687B74] italic">Off Duty / Closed</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: AUDIO & BEEP ALERTS                                                */}
      {/* ========================================================================= */}
      {activeTab === "notifications" && (
        <div className="bg-white rounded-3xl border border-[#E7E2D8] p-6 sm:p-8 shadow-warm space-y-5 animate-fade-in">
          <div className="flex items-center justify-between border-b border-[#F2EFE9] pb-3">
            <div>
              <h3 className="text-base font-bold text-[#162E27]">Real-Time In-App Audio & Beep Alerts</h3>
              <p className="text-xs text-[#687B74]">
                Audible chime notifications when new appointment bookings, urgent triage cases, or follow-ups arrive.
              </p>
            </div>
            <button
              onClick={() => {
                const nextMuted = !isAudioMuted;
                setIsAudioMuted(nextMuted);
                soundAlerts.setMuted(nextMuted);
              }}
              className={`p-2.5 rounded-full border text-xs font-bold flex items-center gap-1.5 transition-all ${
                !isAudioMuted
                  ? "bg-[#E8F4F0] text-[#005C4B] border-[#005C4B]/30"
                  : "bg-rose-50 text-rose-700 border-rose-300"
              }`}
            >
              {!isAudioMuted ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span>{!isAudioMuted ? "Sound Enabled" : "Sound Muted"}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E7E2D8] space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[#162E27]">Booking Chime (Standard)</span>
                <button
                  onClick={() => soundAlerts.playBookingAlertBeep()}
                  className="px-3 py-1.5 rounded-full bg-[#005C4B] text-white text-xs font-bold hover:bg-[#004A3C]"
                >
                  🔊 Test Chime
                </button>
              </div>
              <p className="text-[11px] text-[#687B74]">Plays pleasant dual-tone chime when a client books a slot.</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E7E2D8] space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[#162E27]">Emergency Triage Beep (Urgent)</span>
                <button
                  onClick={() => soundAlerts.playUrgentAlertBeep()}
                  className="px-3 py-1.5 rounded-full bg-rose-600 text-white text-xs font-bold hover:bg-rose-700"
                >
                  🚨 Test Alert
                </button>
              </div>
              <p className="text-[11px] text-[#687B74]">Plays pulsing audio alert for severe or critical triage cases.</p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: TELEGRAM BOT & MINI APP                                            */}
      {/* ========================================================================= */}
      {activeTab === "telegram" && (
        <div className="bg-white rounded-3xl border border-[#E7E2D8] p-6 sm:p-8 shadow-warm space-y-5 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F2EFE9] pb-3">
            <div>
              <h3 className="text-base font-bold text-[#162E27]">Telegram Bot & Mini App Integration</h3>
              <p className="text-xs text-[#687B74]">
                Receive instant Telegram push alerts, manage live queue, and launch video calls on mobile.
              </p>
            </div>
            <a
              href="/telegram/miniapp"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-pill-secondary text-xs py-2 px-3.5 flex items-center gap-1.5"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Preview Mini App</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="p-5 rounded-2xl bg-[#FAF8F5] border border-[#E7E2D8] space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-500 text-white flex items-center justify-center font-bold text-lg">
                ✈️
              </div>
              <div>
                <h4 className="font-bold text-sm text-[#162E27]">
                  Connect @{process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "Ninimedbot"}
                </h4>
                <p className="text-xs text-[#687B74]">
                  Link your personal Telegram account to receive 1-click video consultation links directly in chat.
                </p>
              </div>
            </div>

            {telegramData ? (
              <div className="space-y-3 pt-2 border-t border-[#E7E2D8]">
                <div className="p-3 rounded-xl bg-white border border-[#E7E2D8] text-xs space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[#687B74]">Deep Link Generated:</span>
                  <div className="font-mono text-blue-700 font-bold break-all">{telegramData.telegramLink}</div>
                </div>
                <a
                  href={telegramData.telegramLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
                >
                  <span>Open in Telegram & Authorize Bot</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            ) : (
              <button
                onClick={handleConnectTelegram}
                disabled={isGeneratingTg}
                className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
              >
                {isGeneratingTg ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
                <span>Generate Secure Telegram Connect Link</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
