"use client";

import React, { useState, useEffect } from "react";
import RoleGuard from "@/components/auth/RoleGuard";
import {
  Mic,
  MicOff,
  Sparkles,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Send,
  Loader2,
  DollarSign,
  ShieldAlert,
  ClipboardList,
  RefreshCw,
} from "lucide-react";

export default function VoiceScribePage() {
  return (
    <RoleGuard
      allowedRoles={[
        "physician",
        "nurse_practitioner",
        "physiotherapist",
        "dietitian",
        "psychologist",
        "social_worker",
        "system_admin",
        "tenant_admin",
      ]}
      fallbackTitle="Ambient Clinical AI Scribe & Claim Engine"
      fallbackMessage="Access to ambient acoustic listening and instant SOAP charting is restricted to licensed providers."
    >
      <VoiceScribeContent />
    </RoleGuard>
  );
}

function VoiceScribeContent() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState(
    "Doctor: Hello, how have you been feeling since our last visit? Patient: Good morning doctor. My blood sugar numbers have been high in the mornings, around 155 to 170. I also have frequent morning headaches and some swelling around my ankles by evening. Doctor: Let's check your blood pressure today... It is 146 over 94. We need to order a comprehensive metabolic panel, a repeat HbA1c, and an ECG. I'll increase your Metformin to 1000mg twice daily with meals and add Lisinopril 10mg daily for your blood pressure."
  );

  const [isLoading, setIsLoading] = useState(false);
  const [scribeResult, setScribeResult] = useState<any>(null);
  const [claimResult, setClaimResult] = useState<any>(null);
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);
  const [patientCtx, setPatientCtx] = useState({
    name: "Consultation Patient",
    age: 50,
    knownConditions: ["Cardiometabolic Evaluation", "Hypertension"],
  });

  useEffect(() => {
    fetch("/api/v1/patient/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) {
          setPatientCtx({
            name: `${d.data.firstName || ""} ${d.data.lastName || ""}`.trim() || "Consultation Patient",
            age: d.data.age || 50,
            knownConditions: d.data.allergies?.length ? d.data.allergies : ["Clinical Encounter"],
          });
        }
      })
      .catch(() => {});
  }, []);

  const handleProcessTranscript = async () => {
    if (!transcript.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/ai/voice-scribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          patientContext: patientCtx,
        }),
      });
      const data = await res.json();
      if (data.result) {
        setScribeResult(data.result);
      }
    } catch (e) {
      console.error("Process voice transcript error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEvaluateClaim = async () => {
    setIsSubmittingClaim(true);
    try {
      const res = await fetch("/api/v1/admin/rcm/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          totalAmount: 290.0,
          diagnosisCodes: scribeResult?.suggestedBillingCodes?.filter((c: any) => c.codeType === "ICD-10") || [
            { code: "E11.9", description: "Type 2 Diabetes Mellitus", isPrimary: true },
            { code: "I10", description: "Essential Hypertension", isPrimary: false },
          ],
          procedureCodes: [
            { code: "99214", description: "Office visit established patient", chargeAmount: 180 },
            { code: "83036", description: "HbA1c Assay", chargeAmount: 45 },
            { code: "80053", description: "Comprehensive Metabolic Panel", chargeAmount: 65 },
          ],
          hasPriorAuthorization: true,
        }),
      });
      const data = await res.json();
      setClaimResult(data);
    } catch (e) {
      console.error("Evaluate claim error:", e);
    } finally {
      setIsSubmittingClaim(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a14] text-gray-100 p-6 md:p-10 font-sans">
      {/* Top Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800/80 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Mic className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white tracking-tight">Ambient Voice Scribe & RCM Console</h1>
                <span className="bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Voice-to-SOAP & Denial AI
                </span>
              </div>
              <p className="text-sm text-gray-400 mt-0.5">
                Ambient consultation transcription, clinical order extraction, CPT/ICD-10 billing, and claim denial risk evaluation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsRecording(!isRecording)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg transition-all ${
                isRecording
                  ? "bg-rose-600 hover:bg-rose-500 text-white animate-pulse shadow-rose-600/30"
                  : "bg-[#16162a] border border-gray-800 hover:border-gray-700 text-gray-200"
              }`}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-purple-400" />}
              {isRecording ? "Recording Live..." : "Start Ambient Mic"}
            </button>
            <button
              onClick={handleProcessTranscript}
              disabled={isLoading || !transcript.trim()}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-purple-600/25 transition-all disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Generate SOAP & Orders
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Audio Transcript */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#121222] border border-gray-800/80 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-400" /> Consultation Audio Transcript
              </h2>
              <span className="text-xs text-gray-500">Live or Pasted Audio Feed</span>
            </div>

            <textarea
              rows={12}
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Speak or paste doctor-patient conversation here..."
              className="w-full bg-[#18182e] border border-gray-700/60 rounded-xl p-4 text-sm text-gray-200 focus:outline-none focus:border-purple-500 leading-relaxed resize-none font-mono text-xs"
            />

            <div className="p-3 bg-[#18182e] rounded-xl border border-gray-800 text-xs text-gray-400">
              💡 Tip: The ambient engine extracts subjective symptoms, objective vitals, diagnostic orders, medications, CPT/ICD-10 billing codes, and missed clinical items.
            </div>
          </div>
        </div>

        {/* Right Column: Generated SOAP & RCM Claims */}
        <div className="lg:col-span-7 space-y-6">
          {!scribeResult ? (
            <div className="bg-[#121222] border border-gray-800/80 rounded-2xl p-12 text-center shadow-xl">
              <div className="w-16 h-16 rounded-3xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Structured Note Ready to Generate</h3>
              <p className="text-sm text-gray-400 max-w-md mx-auto mb-6">
                Click "Generate SOAP & Orders" to transform the audio conversation into clean clinical documentation and billing codes.
              </p>
              <button
                onClick={handleProcessTranscript}
                disabled={isLoading}
                className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-purple-600/20 transition-all"
              >
                {isLoading ? "Processing Ambient Audio..." : "Process Transcript"}
              </button>
            </div>
          ) : (
            <>
              {/* Structured SOAP Note */}
              <div className="bg-[#121222] border border-gray-800/80 rounded-2xl p-6 shadow-xl space-y-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-emerald-400" /> Structured SOAP Note
                </h3>

                <div className="space-y-3 text-xs leading-relaxed">
                  <div className="p-3.5 bg-[#18182e] rounded-xl border border-gray-800">
                    <span className="font-bold text-purple-400 uppercase text-[10px] tracking-wider block mb-1">Subjective (S)</span>
                    <p className="text-gray-200">{scribeResult.soapNote.subjective}</p>
                  </div>
                  <div className="p-3.5 bg-[#18182e] rounded-xl border border-gray-800">
                    <span className="font-bold text-emerald-400 uppercase text-[10px] tracking-wider block mb-1">Objective (O)</span>
                    <p className="text-gray-200">{scribeResult.soapNote.objective}</p>
                  </div>
                  <div className="p-3.5 bg-[#18182e] rounded-xl border border-gray-800">
                    <span className="font-bold text-blue-400 uppercase text-[10px] tracking-wider block mb-1">Assessment (A)</span>
                    <p className="text-gray-200">{scribeResult.soapNote.assessment}</p>
                  </div>
                  <div className="p-3.5 bg-[#18182e] rounded-xl border border-gray-800">
                    <span className="font-bold text-amber-400 uppercase text-[10px] tracking-wider block mb-1">Plan (P)</span>
                    <p className="text-gray-200">{scribeResult.soapNote.plan}</p>
                  </div>
                </div>
              </div>

              {/* Extracted Orders & Suggested Billing Codes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Extracted Orders */}
                <div className="bg-[#121222] border border-gray-800/80 rounded-2xl p-5 shadow-xl">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-3">Extracted Clinical Orders</h4>
                  <div className="space-y-2">
                    {scribeResult.extractedOrders.map((order: any, i: number) => (
                      <div key={i} className="p-2.5 bg-[#18182e] rounded-lg border border-gray-800 flex items-center justify-between text-xs">
                        <span className="font-medium text-gray-200">{order.item}</span>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                          {order.orderType}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Suggested Billing Codes */}
                <div className="bg-[#121222] border border-gray-800/80 rounded-2xl p-5 shadow-xl">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-3">Suggested Medical Codes</h4>
                  <div className="space-y-2">
                    {scribeResult.suggestedBillingCodes.map((code: any, i: number) => (
                      <div key={i} className="p-2.5 bg-[#18182e] rounded-lg border border-gray-800 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-mono font-bold text-purple-300">{code.code}</span>
                          <span className="text-gray-400 text-[11px] block">{code.description}</span>
                        </div>
                        <span className="text-[10px] text-gray-500 font-mono">{(code.confidenceScore * 100).toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Omission Alerts */}
              {scribeResult.omissionsDetected?.length > 0 && (
                <div className="bg-amber-950/20 border border-amber-800/40 rounded-2xl p-4 shadow-xl">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Clinical Topic Omission Alerts
                  </h4>
                  <div className="space-y-1.5 text-xs text-amber-200">
                    {scribeResult.omissionsDetected.map((o: any, i: number) => (
                      <div key={i} className="flex items-start gap-2">
                        <span>⚠️</span>
                        <div>
                          <strong>{o.missedTopic}:</strong> {o.recommendation} ({o.clinicalRationale})
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Revenue Cycle Claim & Denial Predictor */}
              <div className="bg-[#121222] border border-gray-800/80 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-400" /> RCM Clean Claim & Denial Predictor
                  </h3>
                  <button
                    onClick={handleEvaluateClaim}
                    disabled={isSubmittingClaim}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-4 py-2 rounded-xl font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5"
                  >
                    {isSubmittingClaim ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    Evaluate & Submit Claim
                  </button>
                </div>

                {claimResult ? (
                  <div className="p-4 bg-[#18182e] rounded-xl border border-gray-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Claim Number: <strong className="text-white font-mono">{claimResult.claim?.claimNumber}</strong></span>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                        claimResult.validation?.isCleanClaim
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                          : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                      }`}>
                        {claimResult.validation?.isCleanClaim ? "Clean Claim (Validated)" : "High Denial Risk"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs border-t border-gray-800 pt-2">
                      <span className="text-gray-400">AI Denial Probability:</span>
                      <span className="font-bold text-emerald-400">{(claimResult.validation?.aiDenialRiskScore * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">Click "Evaluate & Submit Claim" to run automated medical necessity checks against payer rules.</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
