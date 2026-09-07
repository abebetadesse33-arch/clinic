"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Zap, ArrowRight, ShieldCheck, CheckCircle2, Video, MessageSquare, AlertCircle, Sparkles } from "lucide-react";

import { useClinic } from "@/context/ClinicContext";

interface TreatMeNowModalProps {
  onClose: () => void;
  pageMode?: boolean;
}

const COMMON_CONCERNS = [
  { id: "cold-flu", label: "Cold, Flu & COVID", icon: "🤧", desc: "Fever, congestion, cough, sore throat" },
  { id: "uti", label: "UTI & Bladder Symptoms", icon: "💧", desc: "Burning, urgency, frequency" },
  { id: "skin-rash", label: "Skin Rash & Bites", icon: "🩹", desc: "Allergic reaction, eczema, bug bites" },
  { id: "sinus-allergy", label: "Sinus & Seasonal Allergies", icon: "🌸", desc: "Nasal congestion, itchy watery eyes" },
  { id: "stomach", label: "Stomach & Digestion", icon: "🍵", desc: "Nausea, mild abdominal pain, diarrhea" },
  { id: "rx-renewal", label: "Emergency Rx Refill", icon: "💊", desc: "Temporary 30-day bridge supply" },
];

export default function TreatMeNowModal({ onClose, pageMode = false }: TreatMeNowModalProps) {
  const { currentUser, patients, isAuthenticated, currentRole } = useClinic();
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedConcern, setSelectedConcern] = useState<string>("");
  const [symptoms, setSymptoms] = useState<string>("");
  const [duration, setDuration] = useState<string>("1-2 days");
  const [careFormat, setCareFormat] = useState<"video" | "chat">("video");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [connectedClinician, setConnectedClinician] = useState(false);
  const [joinUrl, setJoinUrl] = useState<string | null>(null);
  const [onCallDoctor, setOnCallDoctor] = useState<{
    name: string;
    title: string;
    initials: string;
  }>({
    name: "NiniMed On-Call Physician, MD",
    title: "Urgent Care & Telehealth Lead",
    initials: "AM",
  });

  React.useEffect(() => {
    fetch("/api/v1/public/providers")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data?.length > 0) {
          const doc = d.data[0];
          setOnCallDoctor({
            name: doc.name,
            title: `${doc.title} • On-Call Urgent Care Lead`,
            initials: doc.initials || "MD",
          });
        }
      })
      .catch(() => { });
  }, []);

  const handleStartTriage = () => {
    if (!selectedConcern) return;
    setStep(2);
  };

  const [createdCaseId, setCreatedCaseId] = useState<string | null>(null);

  const handleSubmitCareRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const concernObj = COMMON_CONCERNS.find((c) => c.id === selectedConcern);
      const patientRec = patients && patients.length > 0 ? patients[0] : null;
      const patientId = (currentUser as any)?.patientId || patientRec?.id;
      const patientName = patientRec ? `${patientRec.firstName} ${patientRec.lastName}` : (currentUser?.fullName || "Urgent Care Patient");

      const res = await fetch("/api/v1/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: patientId || undefined,
          seekingVideo: careFormat === "video",
          personal: {
            fullName: patientName,
            phone: patientRec?.phone || "",
            email: currentUser?.email || patientRec?.email || "",
          },
          complaint: {
            chiefComplaint: `${concernObj?.label || "Urgent Clinical Care"}: ${symptoms.substring(0, 100)}`,
            severity: "very_severe",
            duration: duration,
            seekingUrgent: true,
          },
          symptoms: {
            detailedDescription: symptoms,
            painScale: 8,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCreatedCaseId(data.data.caseId);
        if (data.data.joinUrls?.patient) {
          setJoinUrl(data.data.joinUrls.patient);
        }
        if (data.data.assignedHandler) {
          setOnCallDoctor({
            name: data.data.assignedHandler,
            title: "On-Call Urgent Care Lead",
            initials: data.data.assignedHandler.split(" ").map((n: string) => n[0]).join("").slice(0, 2),
          });
        }
      }
    } catch (err) {
      console.error("Urgent submission error:", err);
    } finally {
      setIsSubmitting(false);
      setConnectedClinician(true);
      setStep(3);
    }
  };

  return (
    <div className={pageMode ? "min-h-screen bg-[#FAF8F5] p-4 sm:p-8" : "drawer-backdrop"} onClick={pageMode ? undefined : onClose}>
      <div
        className={pageMode ? "max-w-2xl mx-auto bg-white border border-[#E7E2D8] rounded-3xl p-6 sm:p-8 shadow-warm-lg" : "drawer-content p-6 sm:p-8"}
        onClick={pageMode ? undefined : (e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#F2EFE9]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#E8F4F0] text-[#005C4B] flex items-center justify-center font-bold">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-[#162E27] font-display">Treat Me Now™</h2>
                <span className="badge-mint text-[11px] py-0.5 px-2">24/7 Virtual Urgent Care</span>
              </div>
              <p className="text-xs text-[#687B74]">No appointment needed. Average wait: Under 3 minutes.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F2EFE9] text-[#687B74] hover:text-[#162E27] flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step 1: Select Concern */}
        {step === 1 && (
          <div className="mt-6 space-y-4">
            <div className="bg-[#FAF8F5] p-3.5 rounded-xl border border-[#E7E2D8] flex items-center gap-3 text-xs text-[#162E27]">
              <ShieldCheck className="w-5 h-5 text-[#005C4B] shrink-0" />
              <span>
                Board-certified physicians and clinical nurse practitioners on call 24/7. Prescriptions sent to your pharmacy immediately.
              </span>
            </div>

            <div>
              <label className="block text-sm font-bold text-[#162E27] mb-2">
                What are you experiencing today?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {COMMON_CONCERNS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedConcern(c.id)}
                    className={`text-left p-3.5 rounded-xl border transition-all flex items-start gap-3 ${selectedConcern === c.id
                        ? "border-[#005C4B] bg-[#E8F4F0]/60 ring-2 ring-[#005C4B]/20"
                        : "border-[#E7E2D8] bg-white hover:border-[#B5DACF] hover:bg-[#FAF8F5]"
                      }`}
                  >
                    <span className="text-2xl shrink-0">{c.icon}</span>
                    <div>
                      <div className="font-semibold text-xs text-[#162E27]">{c.label}</div>
                      <div className="text-[11px] text-[#687B74] mt-0.5 leading-tight">{c.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Red Flag Warning */}
            <div className="bg-[#FEF7E6] border border-[#F9E2A8] p-3 rounded-xl flex items-start gap-2.5 text-xs text-[#8C5D08]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#D96B43]" />
              <span>
                If you are experiencing severe chest pain, shortness of breath, sudden numbness, or life-threatening symptoms, please call <strong>911</strong> or visit the nearest emergency room immediately.
              </span>
            </div>

            <div className="pt-3 flex justify-end">
              <button
                disabled={!selectedConcern}
                onClick={handleStartTriage}
                className="btn-pill-primary w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Continue to Triage</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Symptom details & Visit Preference */}
        {step === 2 && (
          <form onSubmit={handleSubmitCareRequest} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#162E27] uppercase tracking-wider mb-1.5">
                How long have you had these symptoms?
              </label>
              <div className="grid grid-cols-3 gap-2">
                {["Less than 24h", "1-3 days", "Over 1 week"].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDuration(d)}
                    className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all ${duration === d
                        ? "bg-[#005C4B] text-white border-[#005C4B]"
                        : "bg-white text-[#33413C] border-[#E7E2D8] hover:bg-[#FAF8F5]"
                      }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#162E27] uppercase tracking-wider mb-1.5">
                Briefly describe what you are feeling:
              </label>
              <textarea
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                placeholder="e.g., Started with a sore throat yesterday morning, mild fever around 100.2 F, slight headache..."
                rows={3}
                className="input-warm text-xs resize-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#162E27] uppercase tracking-wider mb-1.5">
                How would you prefer to connect with the on-call doctor?
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setCareFormat("video")}
                  className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all ${careFormat === "video"
                      ? "border-[#005C4B] bg-[#E8F4F0] text-[#005C4B] font-semibold"
                      : "border-[#E7E2D8] bg-white text-[#33413C]"
                    }`}
                >
                  <Video className="w-5 h-5 text-[#005C4B]" />
                  <div>
                    <div className="text-xs font-bold">Live Video Visit</div>
                    <div className="text-[10px] text-[#687B74]">High definition secure call</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setCareFormat("chat")}
                  className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all ${careFormat === "chat"
                      ? "border-[#005C4B] bg-[#E8F4F0] text-[#005C4B] font-semibold"
                      : "border-[#E7E2D8] bg-white text-[#33413C]"
                    }`}
                >
                  <MessageSquare className="w-5 h-5 text-[#005C4B]" />
                  <div>
                    <div className="text-xs font-bold">Secure Clinical Chat</div>
                    <div className="text-[10px] text-[#687B74]">Text & photo upload</div>
                  </div>
                </button>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-[#F2EFE9]">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn-pill-ghost text-xs"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-pill-primary text-xs"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></span>
                    Connecting to On-Call Physician...
                  </span>
                ) : (
                  <span>Connect with On-Call Provider</span>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Success / Live Room Ready */}
        {step === 3 && connectedClinician && (
          <div className="mt-6 text-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#E8F4F0] text-[#005C4B] flex items-center justify-center mx-auto ring-8 ring-[#E8F4F0]/50">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <span className="badge-mint text-xs mb-2">Clinician Assigned</span>
              <h3 className="text-xl font-bold text-[#162E27] font-display">
                {onCallDoctor.name} is ready for you
              </h3>
              <p className="text-xs text-[#687B74] mt-1 max-w-md mx-auto">
                Your intake information has been received and reviewed. Your secure {careFormat === "video" ? "video room" : "chat session"} is open.
              </p>
            </div>

            <div className="bg-[#FAF8F5] p-4 rounded-xl border border-[#E7E2D8] max-w-md mx-auto text-left flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#005C4B] text-white flex items-center justify-center font-bold text-sm">
                {onCallDoctor.initials}
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold text-[#162E27]">{onCallDoctor.name}</div>
                <div className="text-[11px] text-[#687B74]">{onCallDoctor.title}</div>
              </div>
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href={joinUrl || `/telemedicine/room-${createdCaseId || "urgent-queue"}?role=patient`}
                className="btn-pill-primary w-full sm:w-auto flex items-center justify-center gap-2"
              >
                <Video className="w-4 h-4" />
                <span>Enter Virtual Exam Room</span>
              </a>
              <button
                onClick={onClose}
                className="btn-pill-ghost text-xs w-full sm:w-auto"
              >
                Dismiss & Review in Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
