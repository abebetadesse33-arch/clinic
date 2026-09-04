"use client";

import { useState } from "react";
import {
  UserCheck,
  CreditCard,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Shield,
  HelpCircle,
  Printer,
  Sparkles,
} from "lucide-react";

type KioskStep = "welcome" | "identification" | "confirm_details" | "symptom_screener" | "copay_payment" | "ticket_issued";

export default function WaitingRoomKioskPage() {
  const [step, setStep] = useState<KioskStep>("welcome");
  const [identifier, setIdentifier] = useState("");
  const [language, setLanguage] = useState<"en" | "am" | "om">("en");
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [ticketNumber, setTicketNumber] = useState("A-142");

  const [matchedPatient, setMatchedPatient] = useState<{
    name: string;
    mrn: string;
    doctor: string;
    time: string;
  }>({
    name: "Arriving Patient",
    mrn: "MRN-ACTIVE",
    doctor: "NiniMed Attending Clinician",
    time: "Today at 10:30 AM",
  });

  const handleIdConfirm = async () => {
    try {
      const res = await fetch("/api/v1/patient/me");
      const d = await res.json();
      if (d.success && d.data) {
        setMatchedPatient({
          name: `${d.data.firstName || ""} ${d.data.lastName || ""}`.trim() || "Verified Patient",
          mrn: d.data.mrn || `MRN-${identifier}`,
          doctor: d.data.primaryDoctor || "NiniMed Attending Physician",
          time: "Scheduled for Today",
        });
      } else {
        setMatchedPatient({
          name: "Verified Patient",
          mrn: `MRN-${identifier}`,
          doctor: "On-Duty Clinical Lead",
          time: "Today",
        });
      }
    } catch {
      setMatchedPatient({
        name: "Verified Patient",
        mrn: `MRN-${identifier}`,
        doctor: "On-Duty Clinical Lead",
        time: "Today",
      });
    }
    setStep("confirm_details");
  };

  const symptomsList = [
    { id: "routine", label: "Routine Follow-up / Prescription Refill" },
    { id: "fever", label: "Fever or Chills" },
    { id: "cough", label: "Cough or Shortness of Breath" },
    { id: "headache", label: "Headache or Dizziness" },
    { id: "pain", label: "Joint, Muscle, or Back Pain" },
    { id: "stomach", label: "Stomach Ache or Nausea" },
  ];

  const handleKeypadPress = (val: string) => {
    if (val === "clear") {
      setIdentifier("");
    } else if (val === "back") {
      setIdentifier((prev) => prev.slice(0, -1));
    } else if (identifier.length < 12) {
      setIdentifier((prev) => prev + val);
    }
  };

  const toggleSymptom = (id: string) => {
    if (selectedSymptoms.includes(id)) {
      setSelectedSymptoms(selectedSymptoms.filter((s) => s !== id));
    } else {
      setSelectedSymptoms([...selectedSymptoms, id]);
    }
  };

  const handleCheckInComplete = () => {
    const num = `A-${Math.floor(Math.random() * 800 + 100)}`;
    setTicketNumber(num);
    setStep("ticket_issued");
  };

  return (
    <div className="min-h-screen bg-[#070712] text-white flex flex-col justify-between select-none font-sans">
      {/* Kiosk Top Bar */}
      <div className="bg-[#0e0e1e] border-b border-gray-800/80 px-8 py-5 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <UserCheck className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Express Self-Service Check-In</h1>
            <p className="text-xs text-gray-400">Clinic Arrival & Queue Registration Kiosk</p>
          </div>
        </div>

        {/* Language Selector */}
        <div className="flex items-center gap-2 bg-[#16162a] p-1.5 rounded-2xl border border-gray-800">
          <button
            onClick={() => setLanguage("en")}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${language === "en" ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/30" : "text-gray-400 hover:text-white"
              }`}
          >
            English
          </button>
          <button
            onClick={() => setLanguage("am")}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${language === "am" ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/30" : "text-gray-400 hover:text-white"
              }`}
          >
            አማርኛ
          </button>
          <button
            onClick={() => setLanguage("om")}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${language === "om" ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/30" : "text-gray-400 hover:text-white"
              }`}
          >
            Afaan Oromoo
          </button>
        </div>
      </div>

      {/* Main Kiosk Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-4xl mx-auto w-full">
        {/* ── STEP 1: WELCOME SCREEN ── */}
        {step === "welcome" && (
          <div className="text-center space-y-8 animate-fade-in">
            <div className="inline-flex p-4 rounded-3xl bg-cyan-500/10 border border-cyan-500/30 mb-2">
              <Sparkles className="w-10 h-10 text-cyan-400 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h2 className="text-4xl font-extrabold tracking-tight">
                {language === "en" ? "Welcome to NiniMed" : language === "am" ? "ወደ ኤጂስሜድ እንኳን ደህና መጡ" : "Baga Nagaan Dhuftan"}
              </h2>
              <p className="text-gray-400 text-base max-w-md mx-auto">
                {language === "en"
                  ? "Touch the button below to start your express check-in and queue placement."
                  : language === "am"
                    ? "የቀጠሮ ምዝገባዎን ለመጀመር ከታች ያለውን ቁልፍ ይጫኑ።"
                    : "Galmee keessan jalqabuuf qabduu armaan gadii tuqaa."}
              </p>
            </div>

            <button
              onClick={() => setStep("identification")}
              className="px-10 py-6 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-xl rounded-2xl shadow-xl shadow-cyan-500/25 transition-all transform active:scale-95 flex items-center gap-3 mx-auto"
            >
              <span>{language === "en" ? "Touch Here to Check In" : "ምዝገባ ጀምር"}</span>
              <ArrowRight className="w-6 h-6" />
            </button>
          </div>
        )}

        {/* ── STEP 2: PATIENT IDENTIFICATION ── */}
        {step === "identification" && (
          <div className="w-full max-w-md space-y-6 animate-fade-in">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-1">Enter Phone or MRN</h2>
              <p className="text-xs text-gray-400">Type your registered phone number or Medical Record Number</p>
            </div>

            {/* Display Input */}
            <div className="bg-[#121224] border-2 border-cyan-500/50 rounded-2xl p-4 text-center">
              <span className="text-3xl font-mono tracking-widest text-cyan-400 font-bold min-h-[44px] block">
                {identifier || <span className="text-gray-600 font-sans text-lg">_ _ _ _ _ _ _ _ _ _</span>}
              </span>
            </div>

            {/* On-screen Keypad */}
            <div className="grid grid-cols-3 gap-3">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "back"].map((k) => (
                <button
                  key={k}
                  onClick={() => handleKeypadPress(k)}
                  className={`h-16 rounded-2xl text-xl font-bold transition-all active:scale-95 flex items-center justify-center ${k === "clear"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 text-sm font-black uppercase"
                      : k === "back"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 text-sm font-black uppercase"
                        : "bg-[#16162c] text-white border border-gray-800 hover:bg-gray-800"
                    }`}
                >
                  {k === "back" ? "DEL" : k === "clear" ? "CLR" : k}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep("welcome")}
                className="flex-1 py-4 bg-[#141428] hover:bg-gray-800 text-gray-300 font-bold rounded-xl border border-gray-700"
              >
                Back
              </button>
              <button
                onClick={() => setStep("confirm_details")}
                disabled={identifier.length < 4}
                className="flex-2 py-4 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white font-bold rounded-xl shadow-lg shadow-cyan-600/30"
              >
                Confirm ID
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: CONFIRM DETAILS ── */}
        {step === "confirm_details" && (
          <div className="w-full max-w-lg space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-1">Confirm Patient Identity</h2>
              <p className="text-xs text-gray-400">Is this your information?</p>
            </div>

            <div className="bg-[#121224] border border-gray-800 rounded-2xl p-6 space-y-3">
              <div className="flex justify-between text-sm py-2 border-b border-gray-800">
                <span className="text-gray-400">Patient Name:</span>
                <span className="font-bold text-white">{matchedPatient.name}</span>
              </div>
              <div className="flex justify-between text-sm py-2 border-b border-gray-800">
                <span className="text-gray-400">Medical Record (MRN):</span>
                <span className="font-mono text-cyan-400 font-bold">{matchedPatient.mrn}</span>
              </div>
              <div className="flex justify-between text-sm py-2 border-b border-gray-800">
                <span className="text-gray-400">Scheduled Doctor:</span>
                <span className="font-bold text-emerald-400">{matchedPatient.doctor}</span>
              </div>
              <div className="flex justify-between text-sm py-2">
                <span className="text-gray-400">Appointment Time:</span>
                <span className="font-bold text-amber-400">{matchedPatient.time}</span>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep("identification")}
                className="flex-1 py-4 bg-[#141428] hover:bg-gray-800 text-gray-300 font-bold rounded-xl border border-gray-700"
              >
                Not Me
              </button>
              <button
                onClick={() => setStep("symptom_screener")}
                className="flex-1 py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-600/30"
              >
                Yes, Continue
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: RAPID SYMPTOM SCREENER ── */}
        {step === "symptom_screener" && (
          <div className="w-full max-w-lg space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-1">Reason for Visit Today</h2>
              <p className="text-xs text-gray-400">Select all symptoms or reasons that apply:</p>
            </div>

            <div className="space-y-3">
              {symptomsList.map((sym) => {
                const isSelected = selectedSymptoms.includes(sym.id);
                return (
                  <button
                    key={sym.id}
                    onClick={() => toggleSymptom(sym.id)}
                    className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between transition-all ${isSelected
                        ? "bg-cyan-600/20 border-cyan-500 text-white shadow-lg shadow-cyan-500/10"
                        : "bg-[#121224] border-gray-800 text-gray-300 hover:border-gray-700"
                      }`}
                  >
                    <span className="text-sm font-semibold">{sym.label}</span>
                    <div className={`w-6 h-6 rounded-full border flex items-center justify-center ${isSelected ? "bg-cyan-500 border-cyan-500 text-black font-bold text-xs" : "border-gray-600"}`}>
                      {isSelected ? "✓" : ""}
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setStep("copay_payment")}
              className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-600/30"
            >
              Continue to Check-In
            </button>
          </div>
        )}

        {/* ── STEP 5: COPAY PAYMENT ── */}
        {step === "copay_payment" && (
          <div className="w-full max-w-lg space-y-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto">
              <CreditCard className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Consultation Copay Settlement</h2>
              <p className="text-xs text-gray-400">Total Due Today: 150 ETB / Covered by Subscription Plan</p>
            </div>

            <div className="p-4 bg-emerald-950/20 border border-emerald-800/40 rounded-2xl text-left text-sm text-emerald-300 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>Corporate / Family Health Plan active. 100% of today's visit fee is waived.</span>
            </div>

            <button
              onClick={handleCheckInComplete}
              className="w-full py-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-lg font-bold rounded-2xl shadow-xl shadow-emerald-600/30"
            >
              Complete Check-In & Print Ticket
            </button>
          </div>
        )}

        {/* ── STEP 6: TICKET ISSUED ── */}
        {step === "ticket_issued" && (
          <div className="w-full max-w-md space-y-6 text-center">
            <div className="w-20 h-20 rounded-full bg-emerald-500/15 border-2 border-emerald-500 flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/30">
              <Printer className="w-10 h-10 text-emerald-400" />
            </div>

            <div>
              <h2 className="text-3xl font-black text-white mb-1">You Are Checked In!</h2>
              <p className="text-xs text-gray-400">Please take your printed queue ticket and take a seat.</p>
            </div>

            {/* Ticket Card */}
            <div className="bg-[#121224] border-2 border-dashed border-cyan-500/60 rounded-3xl p-6 space-y-3">
              <div className="text-xs font-bold uppercase tracking-widest text-cyan-400">Your Queue Number</div>
              <div className="text-5xl font-black tracking-tight text-white font-mono">{ticketNumber}</div>
              <div className="text-xs text-gray-400 pt-2 border-t border-gray-800 flex justify-between">
                <span>Estimated Wait: ~12 mins</span>
                <span className="text-emerald-400 font-bold">Room 3B</span>
              </div>
            </div>

            <button
              onClick={() => {
                setStep("welcome");
                setIdentifier("");
                setSelectedSymptoms([]);
              }}
              className="w-full py-4 bg-[#141428] hover:bg-gray-800 text-gray-300 font-bold rounded-xl border border-gray-700"
            >
              Finish & Return to Start
            </button>
          </div>
        )}
      </div>

      {/* Kiosk Footer */}
      <div className="bg-[#0e0e1e] border-t border-gray-800/80 px-8 py-4 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-cyan-500" />
          <span>HIPAA / GDPR Encrypted Terminal</span>
        </div>
        <div className="flex items-center gap-1 text-gray-400">
          <HelpCircle className="w-4 h-4" />
          <span>Need assistance? Please ask the front desk reception staff.</span>
        </div>
      </div>
    </div>
  );
}
