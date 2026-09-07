"use client";

import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Phone,
  Monitor,
  MessageSquare,
  Bot,
  Heart,
  FileText,
  Send,
  Loader2,
  X,
  Wifi,
  WifiOff,
  ChevronUp,
  ChevronDown,
  Sparkles,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: Date;
}

interface AIAssistantState {
  isOpen: boolean;
  messages: Message[];
  input: string;
  isThinking: boolean;
}

interface VitalStream {
  heartRate?: number;
  spo2?: number;
  systolicBP?: number;
  diastolicBP?: number;
  temperature?: number;
  lastUpdated?: Date;
}

type CallState = "idle" | "connecting" | "connected" | "ended";

export default function TelemedicineRoomPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[80vh] flex items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
        </div>
      }
    >
      <TelemedicineRoomContent />
    </Suspense>
  );
}

function TelemedicineRoomContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const roomId = params.roomId as string;
  const role = searchParams.get("role") || "patient";
  const sessionId = searchParams.get("sessionId") || "";

  // Video refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // State
  const [callState, setCallState] = useState<CallState>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [sessionData, setSessionData] = useState<Record<string, unknown> | null>(null);
  const [vitals, setVitals] = useState<VitalStream>({});
  const [showNotesPanel, setShowNotesPanel] = useState(false);
  const [notes, setNotes] = useState("");
  const [showVitalsPanel, setShowVitalsPanel] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [aiSummary, setAiSummary] = useState<Record<string, unknown> | null>(null);
  const [ai, setAi] = useState<AIAssistantState>({
    isOpen: false,
    messages: [
      {
        id: "welcome",
        role: "assistant",
        text: "I'm your clinical AI assistant. Ask me anything about this patient's condition, medications, differential diagnoses, or treatment guidelines.",
        timestamp: new Date(),
      },
    ],
    input: "",
    isThinking: false,
  });

  // Duration timer
  useEffect(() => {
    if (callState !== "connected") return;
    const interval = setInterval(() => setSessionDuration((d) => d + 1), 1000);
    return () => clearInterval(interval);
  }, [callState]);

  // Simulate remote vitals stream
  useEffect(() => {
    if (callState !== "connected") return;
    const interval = setInterval(() => {
      setVitals({
        heartRate: 70 + Math.floor(Math.random() * 20),
        spo2: 96 + Math.floor(Math.random() * 4),
        systolicBP: 115 + Math.floor(Math.random() * 25),
        diastolicBP: 75 + Math.floor(Math.random() * 15),
        temperature: 36.5 + Math.random() * 1.2,
        lastUpdated: new Date(),
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [callState]);

  // Load session
  useEffect(() => {
    fetch(`/api/v1/telemedicine/sessions/${roomId}`)
      .then((r) => r.json())
      .then((d) => setSessionData(d.session || null))
      .catch(() => null);
  }, [roomId]);

  const startCall = useCallback(async () => {
    setCallState("connecting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      setCallState("connected");
      await fetch(`/api/v1/telemedicine/sessions/${roomId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "in_progress", startedAt: new Date().toISOString() }),
      });
    } catch (e) {
      console.error("Camera/mic error:", e);
      setCallState("idle");
    }
  }, [roomId]);

  const endCall = useCallback(async () => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    peerConnectionRef.current?.close();
    setCallState("ended");
    await fetch(`/api/v1/telemedicine/sessions/${roomId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "completed",
        endedAt: new Date().toISOString(),
        durationSeconds: sessionDuration,
        consultationNotes: notes,
      }),
    });
  }, [roomId, sessionDuration, notes]);

  const toggleMute = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => (t.enabled = isMuted));
    setIsMuted(!isMuted);
  };

  const toggleVideo = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getVideoTracks().forEach((t) => (t.enabled = isVideoOff));
    setIsVideoOff(!isVideoOff);
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      setIsScreenSharing(false);
    } else {
      try {
        const screen = await navigator.mediaDevices.getDisplayMedia({ video: true });
        if (localVideoRef.current) localVideoRef.current.srcObject = screen;
        setIsScreenSharing(true);
      } catch (e) {
        console.error("Screen share failed:", e);
      }
    }
  };

  const requestAiSummary = async () => {
    setIsSummarizing(true);
    try {
      const response = await fetch(`/api/v1/telemedicine/sessions/${roomId}/ai-summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consultationNotes: notes,
          chiefComplaint: sessionData?.chiefComplaint,
        }),
      });
      const data = await response.json();
      setAiSummary(data.summary || null);
    } catch (e) {
      console.error("AI summarize error:", e);
    } finally {
      setIsSummarizing(false);
    }
  };

  const sendAiMessage = async () => {
    const text = ai.input.trim();
    if (!text) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", text, timestamp: new Date() };
    setAi((prev) => ({ ...prev, messages: [...prev.messages, userMsg], input: "", isThinking: true }));

    // Mock AI response (in prod, call a dedicated AI assistant endpoint)
    setTimeout(() => {
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        text: `Based on clinical guidelines: ${text.toLowerCase().includes("metformin")
          ? "Metformin is first-line for T2DM. Start at 500mg twice daily with meals, titrate to 1000mg twice daily over 4 weeks. Monitor eGFR at baseline and annually."
          : text.toLowerCase().includes("hypertension")
          ? "For Stage 1 HTN (BP 130-139/80-89), lifestyle modification is first-line. ACE inhibitors or ARBs preferred in diabetics or CKD. Target < 130/80 mmHg."
          : "I'm reviewing the clinical evidence for your question. Based on current evidence-based guidelines, I recommend evaluating the full clinical picture including comorbidities, contraindications, and patient preferences before making a treatment decision."}`,
        timestamp: new Date(),
      };
      setAi((prev) => ({ ...prev, messages: [...prev.messages, assistantMsg], isThinking: false }));
    }, 1500);
  };

  const formatDuration = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // Quick In-Call / Post-Call Order State
  const [showRxModal, setShowRxModal] = useState(false);
  const [rxName, setRxName] = useState("");
  const [rxDosage, setRxDosage] = useState("500mg PO BID");
  const [rxInstructions, setRxInstructions] = useState("Take with food as directed for 7 days.");
  const [isOrderingRx, setIsOrderingRx] = useState(false);
  const [placedOrders, setPlacedOrders] = useState<string[]>([]);

  const handleOrderRx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rxName.trim()) return;
    setIsOrderingRx(true);
    try {
      const patientId = (sessionData as any)?.patientId || "00000000-0000-0000-0000-000000000001";
      await fetch("/api/v1/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          medicationName: rxName.trim(),
          dosage: rxDosage.trim(),
          frequency: "As directed",
          durationDays: 14,
          quantity: 28,
          instructions: rxInstructions.trim(),
          indication: "Telemedicine Consultation",
        }),
      });
      setPlacedOrders((prev) => [...prev, `${rxName.trim()} (${rxDosage.trim()})`]);
      setRxName("");
      setShowRxModal(false);
    } catch (err) {
      console.error("Prescription ordering error:", err);
    } finally {
      setIsOrderingRx(false);
    }
  };

  const getVitalStatus = (hr?: number) => {
    if (!hr) return "normal";
    if (hr > 100 || hr < 55) return "alert";
    if (hr > 90 || hr < 60) return "warning";
    return "normal";
  };

  if (callState === "ended") {
    const returnPath = role === "patient" ? "/patient/dashboard" : "/cases";
    return (
      <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center p-4">
        <div className="bg-[#1a1a2e] border border-[#2d2d4e] rounded-3xl p-8 max-w-2xl w-full text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
            <Phone className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Consultation Completed</h2>
            <p className="text-gray-400 text-xs">Call Duration: <strong className="text-white">{formatDuration(sessionDuration)}</strong> • Room: {roomId.slice(0, 18)}...</p>
          </div>

          {/* Placed Orders Banner */}
          {placedOrders.length > 0 && (
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-left">
              <span className="text-xs font-bold text-emerald-400 block mb-1.5">✓ Prescriptions Sent to Pharmacy Queue</span>
              <ul className="text-xs text-slate-200 space-y-1">
                {placedOrders.map((ord, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span>{ord}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* AI SOAP Note */}
          {aiSummary ? (
            <div className="bg-[#12122a] rounded-2xl p-6 text-left border border-[#2d2d4e] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  <h3 className="text-sm font-bold text-white">AI-Generated SOAP Note</h3>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold">Verified EHR Record</span>
              </div>
              {Object.entries(((aiSummary as any)?.soapNote as Record<string, string>) || {}).map(([key, value]) => (
                <div key={key} className="pt-2 border-t border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-purple-400 block">{key}</span>
                  <p className="text-gray-300 text-xs mt-0.5 leading-relaxed">{value}</p>
                </div>
              ))}
            </div>
          ) : (
            <button
              onClick={requestAiSummary}
              disabled={isSummarizing}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30"
            >
              {isSummarizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Generate Clinical AI SOAP Note Summary
            </button>
          )}

          {/* Quick Prescribe Button for Clinician */}
          {role === "clinician" && (
            <button
              onClick={() => setShowRxModal(true)}
              className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" />
              <span>Write & Route Prescription to Pharmacy</span>
            </button>
          )}

          <button
            onClick={() => window.location.href = returnPath}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold text-xs transition-all"
          >
            {role === "patient" ? "Return to Patient Dashboard" : "Return to Clinical Cases"}
          </button>
        </div>

        {/* Modal for Quick Prescribe */}
        {showRxModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
            <div className="bg-[#1a1a2e] border border-[#2d2d4e] rounded-3xl p-6 max-w-md w-full text-left space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white">E-Prescribe Medication</h3>
                <button onClick={() => setShowRxModal(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleOrderRx} className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Medication Name</label>
                  <input
                    type="text"
                    required
                    value={rxName}
                    onChange={(e) => setRxName(e.target.value)}
                    placeholder="e.g. Amoxicillin, Metformin, Lisinopril"
                    className="w-full p-2.5 rounded-xl bg-[#12122a] border border-[#2d2d4e] text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Dosage & Frequency</label>
                  <input
                    type="text"
                    required
                    value={rxDosage}
                    onChange={(e) => setRxDosage(e.target.value)}
                    placeholder="e.g. 500mg PO BID"
                    className="w-full p-2.5 rounded-xl bg-[#12122a] border border-[#2d2d4e] text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Instructions for Patient</label>
                  <textarea
                    rows={2}
                    value={rxInstructions}
                    onChange={(e) => setRxInstructions(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#12122a] border border-[#2d2d4e] text-white resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isOrderingRx}
                  className="w-full py-2.5 bg-teal-500 text-slate-950 font-bold rounded-xl hover:bg-teal-400 transition-all flex items-center justify-center gap-2 mt-2"
                >
                  {isOrderingRx ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign & Transmit to Pharmacy"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f1a] flex flex-col">
      {/* Header */}
      <header className="h-14 bg-[#1a1a2e] border-b border-[#2d2d4e] flex items-center justify-between px-4 z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
            {isConnected ? <Wifi className="w-4 h-4 text-green-400" /> : <WifiOff className="w-4 h-4 text-red-400" />}
          </div>
          <span className="text-white font-semibold text-sm">Room: {roomId.slice(0, 20)}…</span>
          {callState === "connected" && (
            <span className="text-red-400 text-sm font-mono bg-red-400/10 px-2 py-0.5 rounded">
              ● {formatDuration(sessionDuration)}
            </span>
          )}
        </div>
        <div className="text-gray-400 text-sm capitalize">{role} View</div>
      </header>

      {/* Main Video Area */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative bg-black">
          {/* Remote video (main) */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />

          {/* Placeholder when no remote stream */}
          {callState !== "connected" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0f0f1a]">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center mb-4">
                <Video className="w-10 h-10 text-white" />
              </div>
              <p className="text-white text-lg font-semibold mb-2">
                {callState === "idle" ? "Ready to Connect" : "Connecting…"}
              </p>
              <p className="text-gray-400 text-sm mb-6">Virtual Consultation Room</p>
              {callState === "idle" && (
                <button
                  onClick={startCall}
                  className="px-8 py-3 bg-green-500 hover:bg-green-600 text-white rounded-full font-semibold transition-all shadow-lg shadow-green-500/30"
                >
                  Join Call
                </button>
              )}
              {callState === "connecting" && (
                <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
              )}
            </div>
          )}

          {/* Local video (PIP) */}
          <div className="absolute bottom-20 right-4 w-40 h-28 rounded-xl overflow-hidden border-2 border-[#3d3d5e] shadow-2xl">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {isVideoOff && (
              <div className="absolute inset-0 bg-[#1a1a2e] flex items-center justify-center">
                <VideoOff className="w-6 h-6 text-gray-400" />
              </div>
            )}
          </div>

          {/* Vitals overlay (clinician view) */}
          {role === "clinician" && callState === "connected" && vitals.heartRate && (
            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md rounded-xl p-3 border border-white/10">
              <div className="text-xs text-gray-400 mb-1 font-medium">Remote Patient Vitals</div>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <Heart className={`w-4 h-4 mx-auto mb-1 ${getVitalStatus(vitals.heartRate) === "alert" ? "text-red-400" : "text-pink-400"}`} />
                  <div className={`text-base font-bold ${getVitalStatus(vitals.heartRate) === "alert" ? "text-red-400" : "text-white"}`}>
                    {vitals.heartRate}
                  </div>
                  <div className="text-xs text-gray-500">HR</div>
                </div>
                <div className="text-center">
                  <div className="text-base font-bold text-blue-400">{vitals.spo2}%</div>
                  <div className="text-xs text-gray-500">SpO₂</div>
                </div>
                <div className="text-center">
                  <div className="text-base font-bold text-yellow-400">
                    {vitals.systolicBP}/{vitals.diastolicBP}
                  </div>
                  <div className="text-xs text-gray-500">BP</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: Notes / AI / Summary */}
        <div className="w-80 bg-[#1a1a2e] border-l border-[#2d2d4e] flex flex-col">
          {/* Panel Tabs */}
          <div className="flex border-b border-[#2d2d4e]">
            {[
              { id: "notes", icon: FileText, label: "Notes" },
              { id: "ai", icon: Bot, label: "AI Assistant" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id === "notes") { setShowNotesPanel(true); setAi((prev) => ({ ...prev, isOpen: false })); }
                  else { setAi((prev) => ({ ...prev, isOpen: true })); setShowNotesPanel(false); }
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-all ${
                  (tab.id === "notes" && showNotesPanel) || (tab.id === "ai" && ai.isOpen)
                    ? "text-blue-400 border-b-2 border-blue-400"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Notes Panel */}
          {(showNotesPanel || (!ai.isOpen && !showNotesPanel)) && (
            <div className="flex-1 flex flex-col p-4">
              <h3 className="text-sm font-semibold text-white mb-2">Consultation Notes</h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Type clinical notes, SOAP findings, and plan here…"
                className="flex-1 bg-[#12122a] border border-[#2d2d4e] rounded-lg p-3 text-sm text-gray-200 placeholder-gray-600 resize-none focus:outline-none focus:border-blue-500 leading-relaxed"
              />
              {role === "clinician" && callState === "connected" && (
                <button
                  onClick={requestAiSummary}
                  disabled={isSummarizing}
                  className="mt-3 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
                >
                  {isSummarizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  AI SOAP Summary
                </button>
              )}
              {aiSummary && (
                <div className="mt-3 bg-purple-900/20 border border-purple-800/40 rounded-lg p-3 text-xs text-gray-300 max-h-40 overflow-y-auto">
                  <span className="text-purple-400 font-semibold block mb-1">AI Summary Ready ✓</span>
                  {(aiSummary as any).soapNote ? Object.entries((aiSummary as any).soapNote).map(([k, v]: [string, any]) => (
                    <div key={k} className="mb-1.5">
                      <span className="text-purple-300 uppercase text-[10px] font-bold">{k}: </span>
                      <span className="text-gray-400">{String(v)}</span>
                    </div>
                  )) : null}
                </div>
              )}
            </div>
          )}

          {/* AI Assistant Panel */}
          {ai.isOpen && (
            <div className="flex-1 flex flex-col">
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {ai.messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-[#2d2d4e] text-gray-200"
                    }`}>
                      {msg.role === "assistant" && (
                        <div className="flex items-center gap-1 mb-1">
                          <Bot className="w-3 h-3 text-purple-400" />
                          <span className="text-[10px] text-purple-400 font-medium">AI Assistant</span>
                        </div>
                      )}
                      {msg.text}
                    </div>
                  </div>
                ))}
                {ai.isThinking && (
                  <div className="flex justify-start">
                    <div className="bg-[#2d2d4e] rounded-xl px-4 py-3">
                      <div className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                          <div
                            key={i}
                            className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce"
                            style={{ animationDelay: `${i * 0.15}s` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="p-3 border-t border-[#2d2d4e]">
                <div className="flex gap-2">
                  <input
                    value={ai.input}
                    onChange={(e) => setAi((prev) => ({ ...prev, input: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && sendAiMessage()}
                    placeholder="Ask about diagnosis, meds…"
                    className="flex-1 bg-[#12122a] border border-[#2d2d4e] rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={sendAiMessage}
                    className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-all"
                  >
                    <Send className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="h-20 bg-[#1a1a2e] border-t border-[#2d2d4e] flex items-center justify-center gap-4 px-6">
        <button
          onClick={toggleMute}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            isMuted ? "bg-red-600 hover:bg-red-700" : "bg-[#2d2d4e] hover:bg-[#3d3d5e]"
          }`}
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5 text-white" />}
        </button>

        <button
          onClick={toggleVideo}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            isVideoOff ? "bg-red-600 hover:bg-red-700" : "bg-[#2d2d4e] hover:bg-[#3d3d5e]"
          }`}
          title={isVideoOff ? "Enable Camera" : "Disable Camera"}
        >
          {isVideoOff ? <VideoOff className="w-5 h-5 text-white" /> : <Video className="w-5 h-5 text-white" />}
        </button>

        {role === "clinician" && (
          <button
            onClick={toggleScreenShare}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              isScreenSharing ? "bg-blue-600 hover:bg-blue-700" : "bg-[#2d2d4e] hover:bg-[#3d3d5e]"
            }`}
            title="Share Screen (scans/reports)"
          >
            <Monitor className="w-5 h-5 text-white" />
          </button>
        )}

        {callState === "connected" ? (
          <button
            onClick={endCall}
            className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition-all shadow-lg shadow-red-600/30"
            title="End Call"
          >
            <Phone className="w-6 h-6 text-white rotate-135" />
          </button>
        ) : callState === "idle" ? (
          <button
            onClick={startCall}
            className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center transition-all shadow-lg shadow-green-500/30"
          >
            <Phone className="w-6 h-6 text-white" />
          </button>
        ) : (
          <div className="w-14 h-14 rounded-full bg-yellow-500 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          </div>
        )}

        <button
          onClick={() => { setShowNotesPanel(true); setAi((prev) => ({ ...prev, isOpen: false })); }}
          className="w-12 h-12 rounded-full bg-[#2d2d4e] hover:bg-[#3d3d5e] flex items-center justify-center transition-all"
          title="Clinical Notes"
        >
          <FileText className="w-5 h-5 text-white" />
        </button>

        <button
          onClick={() => setAi((prev) => ({ ...prev, isOpen: !prev.isOpen }))}
          className="w-12 h-12 rounded-full bg-purple-700 hover:bg-purple-800 flex items-center justify-center transition-all"
          title="AI Assistant"
        >
          <Bot className="w-5 h-5 text-white" />
        </button>
      </div>
    </div>
  );
}
