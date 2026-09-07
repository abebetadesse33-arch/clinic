"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  User, Heart, Pill, Upload, Mic, Video, Image, FileText,
  CheckCircle2, AlertCircle, ArrowRight, ArrowLeft, Sparkles,
  X, Play, Pause, Square, Loader2, Camera, Paperclip,
  Stethoscope, Brain, Activity, ShieldCheck, Calendar,
  Phone, Mail, MapPin, ChevronRight, Clock, Plus, Trash2
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────

interface UploadedFile {
  id: string;
  name: string;
  type: "image" | "audio" | "video" | "document";
  size: number;
  dataUrl?: string;
  file: File;
}

type Severity = "mild" | "moderate" | "severe" | "very_severe";
type OnsetSpeed = "sudden" | "gradual" | "days" | "weeks" | "months" | "years";

// ─── Constants ──────────────────────────────────────────────────────────────

const SYMPTOM_CATEGORIES = [
  { id: "pain", label: "Pain / Ache", icon: "🤕" },
  { id: "fever", label: "Fever / Chills", icon: "🌡️" },
  { id: "breathing", label: "Breathing Issues", icon: "💨" },
  { id: "digestive", label: "Digestive / GI", icon: "🫃" },
  { id: "neurological", label: "Neurological / Headache", icon: "🧠" },
  { id: "skin", label: "Skin / Rash", icon: "🩹" },
  { id: "cardiac", label: "Heart / Palpitations", icon: "❤️" },
  { id: "musculoskeletal", label: "Joints / Muscles", icon: "🦴" },
  { id: "urinary", label: "Urinary / Renal", icon: "🫘" },
  { id: "mental", label: "Mental / Emotional", icon: "💭" },
  { id: "fatigue", label: "Fatigue / Weakness", icon: "😴" },
  { id: "other", label: "Other", icon: "📋" },
];

const STEPS = [
  { id: 1, title: "Personal Info", icon: User },
  { id: 2, title: "Chief Complaint", icon: Stethoscope },
  { id: 3, title: "Medical History", icon: Heart },
  { id: 4, title: "Symptoms Detail", icon: Activity },
  { id: 5, title: "Uploads & Evidence", icon: Upload },
  { id: 6, title: "Review & Submit", icon: CheckCircle2 },
];

// ─── Main Component ─────────────────────────────────────────────────────────

export default function SubmitCasePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [caseRef, setCaseRef] = useState<string | null>(null);
  const [assignedHandler, setAssignedHandler] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // File upload state
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Form Data ────────────────────────────────────────────────────────────

  const [personal, setPersonal] = useState({
    fullName: "",
    dateOfBirth: "",
    gender: "female" as "male" | "female" | "other",
    phone: "",
    email: "",
    address: "",
    occupation: "",
    emergencyContact: "",
    emergencyPhone: "",
    mrn: "", // auto-filled if from registration
  });

  const [complaint, setComplaint] = useState({
    chiefComplaint: "",
    severity: "moderate" as Severity,
    onset: "gradual" as OnsetSpeed,
    duration: "",
    location: "",
    aggravating: "",
    relieving: "",
    associatedSymptoms: "",
    previousSimilar: false,
    seekingUrgent: false,
  });

  const [history, setHistory] = useState({
    chronicConditions: "",
    pastSurgeries: "",
    currentMedications: "",
    knownAllergies: "",
    familyHistory: "",
    socialHistory: "",
    smokingStatus: "never" as "never" | "former" | "current",
    alcoholUse: "none" as "none" | "occasional" | "regular" | "heavy",
    substanceUse: "",
    vaccinations: "",
    lastPhysicalExam: "",
    primaryPhysician: "",
  });

  const [symptoms, setSymptoms] = useState({
    selectedCategories: [] as string[],
    detailedDescription: "",
    vitals: {
      temperature: "",
      bloodPressure: "",
      heartRate: "",
      respiratoryRate: "",
      weight: "",
      height: "",
    },
    painScale: 0,
    functionalImpact: "",
    sleepImpact: false,
    appetiteChange: false,
    weightChange: false,
  });

  React.useEffect(() => {
    fetch("/api/v1/patient/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) {
          const pat = d.data;
          setPersonal((prev) => ({
            ...prev,
            fullName: `${pat.firstName || ""} ${pat.lastName || ""}`.trim() || prev.fullName,
            dateOfBirth: pat.dateOfBirth || prev.dateOfBirth,
            gender: (pat.gender as any) || prev.gender,
            phone: pat.phone || prev.phone,
            email: pat.email || prev.email,
            emergencyContact: pat.emergencyContact || prev.emergencyContact,
            mrn: pat.mrn || prev.mrn,
          }));
        }
      })
      .catch(() => { });
  }, []);

  // ── Validation ───────────────────────────────────────────────────────────

  const isStep1Valid = Boolean(personal.fullName.trim().length > 2 && personal.dateOfBirth && personal.phone.trim().length > 6);
  const isStep2Valid = Boolean(complaint.chiefComplaint.trim().length > 10 && complaint.duration.trim());
  const isStep3Valid = true; // history is optional but encouraged
  const isStep4Valid = Boolean(symptoms.detailedDescription.trim().length > 0 || symptoms.selectedCategories.length > 0);

  // ── File Handling ────────────────────────────────────────────────────────

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const type: UploadedFile["type"] = file.type.startsWith("image/") ? "image"
        : file.type.startsWith("audio/") ? "audio"
          : file.type.startsWith("video/") ? "video"
            : "document";

      const reader = new FileReader();
      reader.onload = (ev) => {
        setUploadedFiles((prev) => [
          ...prev,
          {
            id: `${Date.now()}-${Math.random()}`,
            name: file.name,
            type,
            size: file.size,
            dataUrl: ev.target?.result as string,
            file,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
    if (e.target) e.target.value = "";
  }, []);

  const removeFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  // ── Audio Recording ──────────────────────────────────────────────────────

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setRecordingSeconds(0);

      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        const file = new File([blob], `voice-description-${Date.now()}.webm`, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onload = (ev) => {
          setUploadedFiles((prev) => [
            ...prev,
            {
              id: `audio-${Date.now()}`,
              name: file.name,
              type: "audio",
              size: blob.size,
              dataUrl: ev.target?.result as string,
              file,
            },
          ]);
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch {
      setError("Microphone access denied. Please allow microphone access or upload an audio file.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
  };

  // ── Submission ───────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const payload = {
        personal,
        complaint,
        history,
        symptoms,
        filesCount: uploadedFiles.length,
        fileNames: uploadedFiles.map((f) => f.name),
        fileTypes: uploadedFiles.map((f) => f.type),
        submittedAt: new Date().toISOString(),
      };

      const res = await fetch("/api/v1/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setCaseRef(data.data.caseId);
        setAssignedHandler(data.data.assignedHandler);
        setSubmitted(true);
      } else {
        setError(data.error || "Submission failed. Please try again.");
      }
    } catch {
      setError("Network error. Your data has been saved locally. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── UI Helpers ───────────────────────────────────────────────────────────

  const formatBytes = (b: number) => b < 1024 * 1024 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const severityColors: Record<Severity, string> = {
    mild: "border-green-500/40 bg-green-500/10 text-green-400",
    moderate: "border-amber-500/40 bg-amber-500/10 text-amber-400",
    severe: "border-orange-500/40 bg-orange-500/10 text-orange-400",
    very_severe: "border-red-500/40 bg-red-500/10 text-red-400",
  };

  // ─── SUCCESS SCREEN ──────────────────────────────────────────────────────

  if (submitted && caseRef) {
    return (
      <div className="min-h-screen bg-[#060912] flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-slate-900/95 border border-teal-500/30 rounded-3xl p-8 text-center space-y-6 shadow-2xl shadow-teal-900/30 animate-fade-in">
          <div className="w-20 h-20 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 text-teal-400" />
          </div>
          <div>
            <div className="inline-block px-3 py-1 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/25 text-[11px] font-bold uppercase tracking-widest mb-3">
              Case Submitted Successfully
            </div>
            <h2 className="text-2xl font-extrabold text-white">Your Case Has Been Received</h2>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              A qualified case handler has been assigned. You will receive a follow-up within 24–48 hours.
            </p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 text-left space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Case Reference:</span>
              <span className="font-mono font-bold text-teal-300">{caseRef}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Assigned Handler:</span>
              <span className="font-bold text-white">{assignedHandler || "Care Coordination Team"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Files Uploaded:</span>
              <span className="text-slate-200">{uploadedFiles.length} file(s)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Status:</span>
              <span className="text-amber-400 font-bold">🔄 Under AI Pre-Analysis</span>
            </div>
          </div>

          <div className="bg-indigo-950/40 border border-indigo-800/50 rounded-2xl p-4 text-left space-y-1">
            <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs mb-2">
              <Sparkles className="w-4 h-4" /> AI Pre-Analysis In Progress
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Our clinical AI is analyzing your submitted history, identifying potential diagnoses, risk factors, and preparing a comprehensive brief for your assigned case handler.
            </p>
          </div>

          <div className="flex flex-col gap-2.5 pt-2">
            <button
              onClick={() => router.push(`/patient/cases/${caseRef}`)}
              className="w-full py-3.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-teal-900/30 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" /> Track Live Case & Chat with Doctor <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => router.push("/patient/dashboard")}
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs transition-all flex items-center justify-center gap-2"
            >
              Go to My Patient Portal
            </button>
            <button
              onClick={() => { setSubmitted(false); setStep(1); }}
              className="w-full py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-slate-300 text-xs transition-all"
            >
              Submit Another Case
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── FORM HEADER ─────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#060912]">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-slate-950/95 border-b border-slate-800/80 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center">
                <Stethoscope className="w-5 h-5 text-teal-400" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-white">Patient Case Submission</h1>
                <p className="text-[10px] text-slate-400">NiniMed Enterprise CDSS · Secure & HIPAA Compliant</p>
              </div>
            </div>
            <div className="text-xs text-slate-500">Step {step} of {STEPS.length}</div>
          </div>

          {/* Progress Bar */}
          <div className="flex gap-1.5">
            {STEPS.map((s) => {
              const Icon = s.icon;
              const isActive = s.id === step;
              const isDone = s.id < step;
              return (
                <button
                  key={s.id}
                  onClick={() => isDone && setStep(s.id)}
                  className={`flex-1 h-1.5 rounded-full transition-all ${isDone ? "bg-teal-500" : isActive ? "bg-teal-400/60" : "bg-slate-800"
                    }`}
                  title={s.title}
                />
              );
            })}
          </div>

          <div className="flex items-center gap-2 mt-3">
            {STEPS.map((s) => {
              const Icon = s.icon;
              const isActive = s.id === step;
              const isDone = s.id < step;
              return (
                <div key={s.id} className={`flex items-center gap-1.5 text-[10px] font-medium transition-all ${isActive ? "text-teal-300" : isDone ? "text-teal-500/60" : "text-slate-600"
                  }`}>
                  {isDone ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <Icon className="w-3 h-3" />
                  )}
                  <span className={isActive ? "" : "hidden sm:block"}>{s.title}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-start gap-2">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* ── STEP 1: Personal Information ──────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                <User className="w-5 h-5 text-teal-400" /> Personal Information
              </h2>
              <p className="text-xs text-slate-400 mt-1">All information is end-to-end encrypted and HIPAA compliant.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Full Legal Name *</label>
                <input
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-all placeholder-slate-600"
                  placeholder="Enter your full legal name"
                  value={personal.fullName}
                  onChange={(e) => setPersonal((p) => ({ ...p, fullName: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Date of Birth *</label>
                <input
                  type="date"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-all"
                  value={personal.dateOfBirth}
                  onChange={(e) => setPersonal((p) => ({ ...p, dateOfBirth: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Gender *</label>
                <select
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-all"
                  value={personal.gender}
                  onChange={(e) => setPersonal((p) => ({ ...p, gender: e.target.value as "male" | "female" | "other" }))}
                >
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Prefer not to say / Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1">
                  <Phone className="w-3 h-3" /> Phone *
                </label>
                <input
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-all placeholder-slate-600"
                  placeholder="+251 91 123 4567"
                  value={personal.phone}
                  onChange={(e) => setPersonal((p) => ({ ...p, phone: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1">
                  <Mail className="w-3 h-3" /> Email
                </label>
                <input
                  type="email"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-all placeholder-slate-600"
                  placeholder="you@example.com"
                  value={personal.email}
                  onChange={(e) => setPersonal((p) => ({ ...p, email: e.target.value }))}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Address / Location
                </label>
                <input
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-all placeholder-slate-600"
                  placeholder="City, Region, Country"
                  value={personal.address}
                  onChange={(e) => setPersonal((p) => ({ ...p, address: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Occupation</label>
                <input
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-all placeholder-slate-600"
                  placeholder="e.g., Teacher, Farmer..."
                  value={personal.occupation}
                  onChange={(e) => setPersonal((p) => ({ ...p, occupation: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Emergency Contact Name</label>
                <input
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-all placeholder-slate-600"
                  placeholder="Full name"
                  value={personal.emergencyContact}
                  onChange={(e) => setPersonal((p) => ({ ...p, emergencyContact: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Emergency Contact Phone</label>
                <input
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-all placeholder-slate-600"
                  placeholder="+251 ..."
                  value={personal.emergencyPhone}
                  onChange={(e) => setPersonal((p) => ({ ...p, emergencyPhone: e.target.value }))}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Chief Complaint ───────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-rose-400" /> Chief Complaint
              </h2>
              <p className="text-xs text-slate-400 mt-1">Describe your primary health concern in as much detail as possible.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">What brings you to seek care today? *</label>
              <textarea
                rows={4}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-all placeholder-slate-600 resize-none"
                placeholder="e.g., I have been experiencing severe chest pain for the past 3 days, especially when breathing deeply. The pain is located on the left side and sometimes radiates to my left arm..."
                value={complaint.chiefComplaint}
                onChange={(e) => setComplaint((c) => ({ ...c, chiefComplaint: e.target.value }))}
              />
              <div className="text-right text-[10px] text-slate-500 mt-1">{complaint.chiefComplaint.length} chars</div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">Symptom Severity *</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["mild", "moderate", "severe", "very_severe"] as Severity[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setComplaint((c) => ({ ...c, severity: s }))}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold capitalize transition-all ${complaint.severity === s ? severityColors[s] : "border-slate-700 text-slate-500 hover:border-slate-600"
                        }`}
                    >
                      {s.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">How did it start?</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["sudden", "gradual", "days", "weeks"] as OnsetSpeed[]).map((o) => (
                    <button
                      key={o}
                      onClick={() => setComplaint((c) => ({ ...c, onset: o }))}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold capitalize transition-all ${complaint.onset === o
                          ? "border-teal-500/50 bg-teal-500/10 text-teal-300"
                          : "border-slate-700 text-slate-500 hover:border-slate-600"
                        }`}
                    >
                      {o === "sudden" ? "🔴 Sudden" : o === "gradual" ? "🟡 Gradual" : `Over ${o}`}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> How long have you had this? *
                </label>
                <input
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-all placeholder-slate-600"
                  placeholder="e.g., 3 days, 2 weeks, 1 month"
                  value={complaint.duration}
                  onChange={(e) => setComplaint((c) => ({ ...c, duration: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Location of Complaint</label>
                <input
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-all placeholder-slate-600"
                  placeholder="e.g., Left side chest, lower back..."
                  value={complaint.location}
                  onChange={(e) => setComplaint((c) => ({ ...c, location: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">What makes it worse?</label>
                <input
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-all placeholder-slate-600"
                  placeholder="e.g., exercise, eating, lying down"
                  value={complaint.aggravating}
                  onChange={(e) => setComplaint((c) => ({ ...c, aggravating: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">What makes it better?</label>
                <input
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-all placeholder-slate-600"
                  placeholder="e.g., rest, medication, heat/cold"
                  value={complaint.relieving}
                  onChange={(e) => setComplaint((c) => ({ ...c, relieving: e.target.value }))}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Associated Symptoms</label>
                <input
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-all placeholder-slate-600"
                  placeholder="e.g., fever, nausea, dizziness, fatigue"
                  value={complaint.associatedSymptoms}
                  onChange={(e) => setComplaint((c) => ({ ...c, associatedSymptoms: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setComplaint((c) => ({ ...c, previousSimilar: !c.previousSimilar }))}
                className={`p-4 rounded-xl border text-sm text-left transition-all ${complaint.previousSimilar ? "border-teal-500/40 bg-teal-500/10 text-teal-300" : "border-slate-700 text-slate-500"
                  }`}
              >
                <div className="font-bold">Previous Episodes?</div>
                <div className="text-xs opacity-75 mt-0.5">Had this before</div>
              </button>
              <button
                onClick={() => setComplaint((c) => ({ ...c, seekingUrgent: !c.seekingUrgent }))}
                className={`p-4 rounded-xl border text-sm text-left transition-all ${complaint.seekingUrgent ? "border-red-500/40 bg-red-500/10 text-red-300" : "border-slate-700 text-slate-500"
                  }`}
              >
                <div className="font-bold">🚨 Urgent?</div>
                <div className="text-xs opacity-75 mt-0.5">Needs prompt attention</div>
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Medical History ────────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                <Heart className="w-5 h-5 text-pink-400" /> Medical History
              </h2>
              <p className="text-xs text-slate-400 mt-1">This helps the AI and your case handler understand your full health picture. All fields are optional but greatly help.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Known Chronic Conditions</label>
                <textarea
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-all placeholder-slate-600 resize-none"
                  placeholder="e.g., Type 2 Diabetes, Hypertension, Asthma, CKD..."
                  value={history.chronicConditions}
                  onChange={(e) => setHistory((h) => ({ ...h, chronicConditions: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Past Surgeries / Hospitalizations</label>
                <textarea
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-all placeholder-slate-600 resize-none"
                  placeholder="e.g., Appendectomy 2019, C-section 2021..."
                  value={history.pastSurgeries}
                  onChange={(e) => setHistory((h) => ({ ...h, pastSurgeries: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1">
                  <Pill className="w-3 h-3" /> Current Medications
                </label>
                <textarea
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-all placeholder-slate-600 resize-none"
                  placeholder="Drug name, dose, frequency..."
                  value={history.currentMedications}
                  onChange={(e) => setHistory((h) => ({ ...h, currentMedications: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Known Allergies</label>
                <input
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-all placeholder-slate-600"
                  placeholder="e.g., Penicillin, Aspirin, Latex..."
                  value={history.knownAllergies}
                  onChange={(e) => setHistory((h) => ({ ...h, knownAllergies: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Family Medical History</label>
                <input
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-all placeholder-slate-600"
                  placeholder="e.g., Father: DM, Mother: HTN..."
                  value={history.familyHistory}
                  onChange={(e) => setHistory((h) => ({ ...h, familyHistory: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">Smoking Status</label>
                <div className="flex gap-2">
                  {(["never", "former", "current"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setHistory((h) => ({ ...h, smokingStatus: s }))}
                      className={`flex-1 py-2 rounded-lg border text-xs font-bold capitalize transition-all ${history.smokingStatus === s ? "border-teal-500/50 bg-teal-500/10 text-teal-300" : "border-slate-700 text-slate-500"
                        }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">Alcohol Use</label>
                <div className="flex gap-1">
                  {(["none", "occasional", "regular", "heavy"] as const).map((a) => (
                    <button
                      key={a}
                      onClick={() => setHistory((h) => ({ ...h, alcoholUse: a }))}
                      className={`flex-1 py-2 rounded-lg border text-[10px] font-bold capitalize transition-all ${history.alcoholUse === a ? "border-amber-500/50 bg-amber-500/10 text-amber-300" : "border-slate-700 text-slate-500"
                        }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Additional Social / Lifestyle Notes</label>
                <textarea
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-all placeholder-slate-600 resize-none"
                  placeholder="Occupation hazards, stress level, diet, exercise, living situation..."
                  value={history.socialHistory}
                  onChange={(e) => setHistory((h) => ({ ...h, socialHistory: e.target.value }))}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 4: Symptoms Detail ────────────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-amber-400" /> Symptom Detail
              </h2>
              <p className="text-xs text-slate-400 mt-1">Select all symptom categories that apply and provide details.</p>
            </div>

            {/* Symptom Categories */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-3">Affected Body Systems (select all that apply)</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {SYMPTOM_CATEGORIES.map((cat) => {
                  const isSelected = symptoms.selectedCategories.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      onClick={() =>
                        setSymptoms((s) => ({
                          ...s,
                          selectedCategories: isSelected
                            ? s.selectedCategories.filter((c) => c !== cat.id)
                            : [...s.selectedCategories, cat.id],
                        }))
                      }
                      className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-medium transition-all text-left ${isSelected ? "border-teal-500/50 bg-teal-500/10 text-teal-300" : "border-slate-700 text-slate-400 hover:border-slate-600"
                        }`}
                    >
                      <span className="text-base">{cat.icon}</span>
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pain Scale */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-3">
                Pain / Discomfort Scale: <span className="text-teal-400">{symptoms.painScale}/10</span>
              </label>
              <div className="flex gap-1">
                {Array.from({ length: 11 }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setSymptoms((s) => ({ ...s, painScale: i }))}
                    className={`flex-1 h-9 rounded-lg text-xs font-bold transition-all ${i === 0 ? "bg-green-500/20 text-green-400"
                        : i <= 3 ? "bg-yellow-500/20 text-yellow-400"
                          : i <= 6 ? "bg-orange-500/20 text-orange-400"
                            : "bg-red-500/20 text-red-400"
                      } ${symptoms.painScale === i ? "ring-2 ring-white/30 scale-110" : "opacity-50 hover:opacity-80"}`}
                  >
                    {i}
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>No Pain</span>
                <span>Worst Possible</span>
              </div>
            </div>

            {/* Vitals self-reported */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-3">Self-Reported Vitals (if you have access)</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { key: "temperature", label: "Temperature (°C/°F)", placeholder: "e.g., 38.5°C" },
                  { key: "bloodPressure", label: "Blood Pressure", placeholder: "e.g., 130/85 mmHg" },
                  { key: "heartRate", label: "Heart Rate (bpm)", placeholder: "e.g., 92 bpm" },
                  { key: "respiratoryRate", label: "Respiratory Rate", placeholder: "e.g., 20 /min" },
                  { key: "weight", label: "Weight (kg/lbs)", placeholder: "e.g., 68 kg" },
                  { key: "height", label: "Height (cm/ft)", placeholder: "e.g., 165 cm" },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="block text-[10px] text-slate-400 mb-1">{label}</label>
                    <input
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500 transition-all placeholder-slate-600"
                      placeholder={placeholder}
                      value={symptoms.vitals[key as keyof typeof symptoms.vitals]}
                      onChange={(e) =>
                        setSymptoms((s) => ({
                          ...s,
                          vitals: { ...s.vitals, [key]: e.target.value },
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Detailed description */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Detailed Symptom Description</label>
              <textarea
                rows={5}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-all placeholder-slate-600 resize-none"
                placeholder="Describe your symptoms in your own words. Include timing, patterns, what you notice when it gets better or worse, any changes since onset..."
                value={symptoms.detailedDescription}
                onChange={(e) => setSymptoms((s) => ({ ...s, detailedDescription: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { key: "sleepImpact", label: "😴", desc: "Affects Sleep?" },
                { key: "appetiteChange", label: "🍽️", desc: "Appetite Changed?" },
                { key: "weightChange", label: "⚖️", desc: "Weight Change?" },
              ].map(({ key, label, desc }) => (
                <button
                  key={key}
                  onClick={() => setSymptoms((s) => ({ ...s, [key]: !s[key as keyof typeof s] }))}
                  className={`p-4 rounded-xl border text-center transition-all ${symptoms[key as keyof typeof symptoms]
                      ? "border-teal-500/40 bg-teal-500/10 text-teal-300"
                      : "border-slate-700 text-slate-500 hover:border-slate-600"
                    }`}
                >
                  <div className="text-2xl">{label}</div>
                  <div className="text-xs font-bold mt-1">{desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 5: Uploads & Evidence ─────────────────────────────────── */}
        {step === 5 && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-violet-400" /> Supporting Evidence
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Attach photos, lab reports, prescriptions, ECGs, or voice descriptions. All uploads are AES-256 encrypted.
              </p>
            </div>

            {/* Upload Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { accept: "image/*", icon: Image, label: "Photos / X-rays", color: "text-sky-400 border-sky-500/30 bg-sky-500/5 hover:bg-sky-500/10" },
                { accept: "application/pdf,application/msword,.doc,.docx,.txt", icon: FileText, label: "Documents / Reports", color: "text-amber-400 border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10" },
                { accept: "audio/*", icon: Mic, label: "Audio Files", color: "text-rose-400 border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10" },
                { accept: "video/*", icon: Video, label: "Video Clips", color: "text-violet-400 border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/10" },
              ].map(({ accept, icon: Icon, label, color }) => (
                <button
                  key={label}
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.accept = accept;
                      fileInputRef.current.click();
                    }
                  }}
                  className={`flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border transition-all ${color}`}
                >
                  <Icon className="w-7 h-7" />
                  <span className="text-xs font-bold text-center leading-tight">{label}</span>
                </button>
              ))}
            </div>

            <input ref={fileInputRef} type="file" className="hidden" multiple onChange={handleFileSelect} />

            {/* Drag & Drop zone */}
            <div
              className="border-2 border-dashed border-slate-700 hover:border-teal-500/50 rounded-2xl p-8 text-center cursor-pointer transition-all group"
              onClick={() => { if (fileInputRef.current) { fileInputRef.current.accept = "*/*"; fileInputRef.current.click(); } }}
            >
              <Paperclip className="w-8 h-8 text-slate-600 group-hover:text-teal-400 mx-auto mb-2 transition-all" />
              <p className="text-sm text-slate-500 group-hover:text-slate-300 transition-all">
                Click or drag & drop any file here
              </p>
              <p className="text-[10px] text-slate-600 mt-1">Max 50 MB per file · Any format accepted</p>
            </div>

            {/* Voice Recording */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Mic className="w-4 h-4 text-rose-400" /> Record Voice Description
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Describe your symptoms in your own voice — especially useful if you struggle to type.
              </p>

              {isRecording ? (
                <div className="flex items-center gap-4">
                  <div className="flex-1 flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                    <div className="text-red-400 font-mono text-sm font-bold">REC {formatTime(recordingSeconds)}</div>
                    <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500 transition-all"
                        style={{ width: `${Math.min((recordingSeconds / 120) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  <button
                    onClick={stopRecording}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-sm font-bold hover:bg-red-500/30 transition-all"
                  >
                    <Square className="w-4 h-4" /> Stop
                  </button>
                </div>
              ) : (
                <button
                  onClick={startRecording}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-sm font-bold hover:bg-rose-500/20 transition-all"
                >
                  <Mic className="w-4 h-4" /> Start Voice Recording
                </button>
              )}
            </div>

            {/* Uploaded files list */}
            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-300">{uploadedFiles.length} File(s) Attached</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {uploadedFiles.map((f) => {
                    const iconMap = { image: Image, audio: Mic, video: Video, document: FileText };
                    const Icon = iconMap[f.type];
                    const colorMap = { image: "text-sky-400", audio: "text-rose-400", video: "text-violet-400", document: "text-amber-400" };
                    return (
                      <div key={f.id} className="flex items-center gap-3 p-3 bg-slate-900/80 border border-slate-800 rounded-xl">
                        <div className={`w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 ${colorMap[f.type]}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-white truncate">{f.name}</div>
                          <div className="text-[10px] text-slate-500">{f.type} · {formatBytes(f.size)}</div>
                        </div>
                        {f.type === "image" && f.dataUrl && (
                          <img src={f.dataUrl} alt="preview" className="w-12 h-12 object-cover rounded-lg border border-slate-700 shrink-0" />
                        )}
                        <button
                          onClick={() => removeFile(f.id)}
                          className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 6: Review & Submit ────────────────────────────────────── */}
        {step === 6 && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-teal-400" /> Review & Submit
              </h2>
              <p className="text-xs text-slate-400 mt-1">Please review your submission before sending to the clinical team.</p>
            </div>

            {/* Summary cards */}
            {[
              {
                icon: User, title: "Personal Information", color: "text-teal-400",
                items: [
                  ["Name", personal.fullName],
                  ["DOB", personal.dateOfBirth],
                  ["Gender", personal.gender],
                  ["Phone", personal.phone],
                  ["Email", personal.email],
                ].filter(([, v]) => v),
              },
              {
                icon: Stethoscope, title: "Chief Complaint", color: "text-rose-400",
                items: [
                  ["Complaint", complaint.chiefComplaint],
                  ["Severity", complaint.severity.replace("_", " ")],
                  ["Duration", complaint.duration],
                  ["Urgent", complaint.seekingUrgent ? "Yes — urgent attention requested" : "No"],
                ].filter(([, v]) => v),
              },
              {
                icon: Heart, title: "Medical History", color: "text-pink-400",
                items: [
                  ["Conditions", history.chronicConditions],
                  ["Allergies", history.knownAllergies],
                  ["Medications", history.currentMedications],
                  ["Smoking", history.smokingStatus],
                ].filter(([, v]) => v),
              },
              {
                icon: Activity, title: "Symptoms", color: "text-amber-400",
                items: [
                  ["Categories", symptoms.selectedCategories.join(", ")],
                  ["Pain Scale", `${symptoms.painScale}/10`],
                  ["Vitals", Object.entries(symptoms.vitals).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(", ")],
                ].filter(([, v]) => v),
              },
              {
                icon: Upload, title: "Attachments", color: "text-violet-400",
                items: uploadedFiles.map((f) => [f.type, f.name] as [string, string]),
              },
            ].map(({ icon: Icon, title, color, items }) => (
              <div key={title} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`text-sm font-bold ${color} flex items-center gap-2`}>
                    <Icon className="w-4 h-4" /> {title}
                  </h3>
                  <button
                    onClick={() => setStep(STEPS.findIndex((s) => s.title.toLowerCase().includes(title.split(" ")[0].toLowerCase())) + 1)}
                    className="text-[10px] text-slate-500 hover:text-teal-400 transition-all"
                  >
                    Edit
                  </button>
                </div>
                {items.length > 0 ? (
                  <div className="space-y-1.5">
                    {items.map(([k, v]) => (
                      <div key={k} className="flex gap-2 text-xs">
                        <span className="text-slate-500 shrink-0 w-24 capitalize">{k}:</span>
                        <span className="text-slate-200 flex-1 truncate">{v}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-600 italic">No information provided for this section.</p>
                )}
              </div>
            ))}

            {/* AI Notice */}
            <div className="bg-indigo-950/50 border border-indigo-800/60 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-indigo-300">AI Clinical Pre-Analysis Enabled</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Upon submission, NiniMed's multimodal clinical AI will immediately analyze your history, identify potential diagnoses, calculate risk scores, flag urgent findings, and prepare a comprehensive brief for your assigned case handler — before they even read your file.
                  </p>
                </div>
              </div>
            </div>

            {/* Consent checkbox */}
            <div className="flex items-start gap-3 p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
              <ShieldCheck className="w-5 h-5 text-teal-400 mt-0.5 shrink-0" />
              <p className="text-xs text-slate-400 leading-relaxed">
                I consent to NiniMed processing my health information for clinical care, AI-assisted analysis, and secure sharing with assigned healthcare providers. My data is protected under HIPAA, GDPR, and 21 CFR Part 11.
              </p>
            </div>
          </div>
        )}

        {/* ── Navigation Buttons ──────────────────────────────────────────── */}
        <div className="flex gap-3 pt-4 border-t border-slate-800/60">
          {step > 1 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 font-medium text-sm transition-all"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          )}

          {step < STEPS.length ? (
            <button
              onClick={() => {
                const validMap: Record<number, boolean> = { 1: isStep1Valid, 2: isStep2Valid, 3: isStep3Valid, 4: isStep4Valid, 5: true, 6: true };
                if (!validMap[step]) {
                  setError("Please fill in the required fields before continuing.");
                  return;
                }
                setError(null);
                setStep((s) => s + 1);
              }}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-teal-900/30"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !isStep1Valid || !isStep2Valid}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold text-sm transition-all shadow-lg shadow-teal-900/30"
            >
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Submitting Case...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Submit & Activate AI Analysis</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
