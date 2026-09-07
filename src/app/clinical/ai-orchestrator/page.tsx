"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import RoleGuard from "@/components/auth/RoleGuard";
import ClinicalAIResponseCard, { ClinicalAIResponse } from "@/components/ai/ClinicalAIResponseCard";
import { useSpeechInput, SpeechLang } from "@/hooks/useSpeechInput";
import { speakText, stopSpeaking, isSpeaking, isTTSSupported } from "@/lib/ai/text-to-speech";
import {
  Bot,
  Sparkles,
  Mic,
  MicOff,
  Send,
  RefreshCw,
  Loader2,
  Volume2,
  VolumeX,
  Trash2,
  ChevronLeft,
  ChevronRight,
  User,
  Settings2,
  ShieldCheck,
  Activity,
  Heart,
  Pill,
  TestTube,
  FileImage,
  Utensils,
  Brain,
  Users,
  CalendarCheck,
  BookOpen,
  AlertTriangle,
  MessageSquare,
  Clock,
  Zap,
} from "lucide-react";

// ─── Quick Prompts ─────────────────────────────────────────────────────────

const QUICK_PROMPTS = [
  { label: "Chest Pain Work-Up", text: "Differential diagnosis for a 45-year-old male with acute chest pain, diaphoresis, and elevated troponin T at 0.42 ng/mL" },
  { label: "Drug Interaction Check", text: "Drug interaction check: Metformin 1000mg BID + Lisinopril 10mg daily + Aspirin 81mg daily + Atorvastatin 40mg nightly" },
  { label: "ESI Triage Score", text: "Assign ESI triage level for a patient presenting with SpO2 of 86% on room air, respiratory rate 28/min, and productive cough with fever 38.9°C" },
  { label: "FMOH Diabetes Protocol", text: "Ethiopian FMOH first-line treatment protocol for newly diagnosed Type 2 Diabetes Mellitus with co-existing essential hypertension, eGFR 72 mL/min" },
  { label: "Pediatric Drug Dosing", text: "Calculate safe dosing for Amoxicillin-Clavulanate in a 22 kg child aged 6 years with acute otitis media — include frequency and max dose" },
  { label: "ICD-10 Code Lookup", text: "Provide ICD-10-CM codes for: acute exacerbation of COPD with secondary community-acquired pneumonia and type 2 respiratory failure" },
  { label: "Pre-op Clearance", text: "Pre-operative cardiac risk assessment for a 62-year-old with controlled hypertension, HbA1c 7.4%, and prior MI 5 years ago, scheduled for elective hip replacement" },
  { label: "Sepsis Protocol", text: "Initiate sepsis 3.0 protocol: 68-year-old with qSOFA score 2, suspected urinary source, WBC 22.4 × 10³/μL, lactate 3.1 mmol/L, temperature 39.4°C" },
];

// ─── Types ──────────────────────────────────────────────────────────────────

interface ConversationMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  response?: ClinicalAIResponse;
  timestamp: string;
}

// ─── Main Page Wrapper ───────────────────────────────────────────────────────

export default function AIOrchestratorPage() {
  return (
    <RoleGuard
      allowedRoles={[
        "physician", "nurse_practitioner", "nurse", "pharmacist", "dietitian",
        "physiotherapist", "occupational_therapist", "social_worker", "psychologist",
        "biologist", "genetic_counselor", "radiologist", "pathologist", "lab_technician",
        "respiratory_therapist", "care_coordinator", "system_admin", "tenant_admin", "auditor",
      ]}
      fallbackTitle="AI Clinical Decision Support Terminal"
      fallbackMessage="Access to NiniMed Clinical AI is restricted to authorized clinical staff and administrators."
    >
      <AITerminalContent />
    </RoleGuard>
  );
}

// ─── Core Terminal Content ───────────────────────────────────────────────────

function AITerminalContent() {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [activePatientId, setActivePatientId] = useState<string | null>(null);
  const [activePatientName, setActivePatientName] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [autoRead, setAutoRead] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [voiceLang, setVoiceLang] = useState<SpeechLang>("en-US");
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const responseEndRef = useRef<HTMLDivElement>(null);
  const ttsSupported = isTTSSupported();

  // Auto-scroll to latest response
  useEffect(() => {
    responseEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Speech → Transcript → Append to query
  const handleTranscript = useCallback((text: string) => {
    setQuery((prev) => (prev ? `${prev} ${text}` : text));
  }, []);

  const { isListening, interimText, isSupported: speechSupported, toggleListening } =
    useSpeechInput(handleTranscript, voiceLang);

  // Submit Query
  const handleSubmit = async () => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery || isLoading) return;

    const userMsgId = crypto.randomUUID();
    const userMsg: ConversationMessage = {
      id: userMsgId,
      role: "user",
      content: trimmedQuery,
      timestamp: new Date().toISOString(),
    };

    setConversation((prev) => [...prev, userMsg]);
    setQuery("");
    setIsLoading(true);

    try {
      const contextMessages = conversation
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/v1/clinical/ai-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: trimmedQuery,
          context: contextMessages,
          patientId: activePatientId,
        }),
      });
      const data = await res.json();

      if (data.success && data.data) {
        const aiResponse = data.data as ClinicalAIResponse;
        const aiMsgId = crypto.randomUUID();
        const aiMsg: ConversationMessage = {
          id: aiMsgId,
          role: "assistant",
          content: aiResponse.headline,
          response: { ...aiResponse, queryId: data.queryId, provider: data.provider },
          timestamp: new Date().toISOString(),
        };
        setConversation((prev) => [...prev, aiMsg]);

        // Auto-read if enabled
        if (autoRead && ttsSupported) {
          setSpeakingId(aiMsgId);
          const readableText = `${aiResponse.headline}. ${aiResponse.sections
            .slice(0, 2)
            .map((s) => `${s.title}: ${s.content.slice(0, 2).join(". ")}`)
            .join(". ")}`;
          speakText(readableText, { lang: voiceLang });
        }
      } else {
        throw new Error(data.error || "AI response failed");
      }
    } catch (err: any) {
      const errMsgId = crypto.randomUUID();
      setConversation((prev) => [
        ...prev,
        {
          id: errMsgId,
          role: "assistant",
          content: `Error: ${err.message}. The AI endpoint could not be reached. Please verify the API key is configured.`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSpeakToggle = (msg: ConversationMessage) => {
    if (speakingId === msg.id) {
      stopSpeaking();
      setSpeakingId(null);
    } else {
      setSpeakingId(msg.id);
      if (msg.response) {
        const text = `${msg.response.headline}. ${msg.response.sections
          .slice(0, 3)
          .map((s) => `${s.title}: ${s.content.slice(0, 3).join(". ")}`)
          .join(". ")}`;
        speakText(text, { lang: voiceLang });
      }
    }
  };

  const handleSaveToChart = async (msg: ConversationMessage) => {
    if (!activePatientId || !msg.response) {
      showToast("Set an active patient to save responses to the chart.");
      return;
    }
    await fetch(`/api/v1/patients/${activePatientId}/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actorName: "NiniMed Clinical AI",
        actorRole: "system",
        activityType: "ai_decision_support_used",
        title: `AI Clinical Query: ${msg.content.slice(0, 100)}`,
        description: msg.response.headline,
        severity: msg.response.urgencyLevel === "critical" ? "critical" : "info",
        metadata: { queryId: msg.response.queryId, urgencyLevel: msg.response.urgencyLevel },
      }),
    });
    showToast("AI response saved to patient chart.");
  };

  const clearSession = () => {
    setConversation([]);
    stopSpeaking();
    setSpeakingId(null);
    showToast("Session cleared.");
  };

  return (
    <div className="min-h-screen bg-[#08080f] text-gray-100 flex flex-col font-sans relative">

      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-indigo-600 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-2xl animate-fade-in flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-200" />
          {toastMsg}
        </div>
      )}

      {/* ── Top Header ────────────────────────────────────────────────── */}
      <header className="shrink-0 px-4 sm:px-6 py-4 border-b border-gray-800 bg-[#0a0a14] flex items-center justify-between gap-4 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                NiniMed Clinical AI Terminal
              </h1>
              <span className="hidden sm:inline-flex bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-[10px] px-2 py-0.5 rounded-full font-bold items-center gap-1">
                <Sparkles className="w-3 h-3" /> Voice + Multi-Agent
              </span>
            </div>
            {activePatientName && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span className="text-[11px] text-emerald-400 font-medium">
                  Patient context: {activePatientName}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Language Toggle */}
          <div className="hidden sm:flex items-center gap-1 bg-[#18182e] border border-gray-700 rounded-xl p-1">
            {(["en-US", "am-ET"] as SpeechLang[]).map((lang) => (
              <button
                key={lang}
                onClick={() => setVoiceLang(lang)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  voiceLang === lang
                    ? "bg-indigo-600 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {lang === "en-US" ? "🇬🇧 EN" : "🇪🇹 አማ"}
              </button>
            ))}
          </div>

          {/* Auto-Read Toggle */}
          {ttsSupported && (
            <button
              onClick={() => setAutoRead((v) => !v)}
              title={autoRead ? "Disable auto-read" : "Enable auto-read aloud"}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                autoRead
                  ? "bg-indigo-600 border-indigo-500 text-white"
                  : "bg-[#18182e] border-gray-700 text-gray-400 hover:text-white"
              }`}
            >
              {autoRead ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{autoRead ? "Auto-Read On" : "Auto-Read"}</span>
            </button>
          )}

          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="p-2 rounded-xl bg-[#18182e] border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white transition-all"
            title="Toggle conversation history"
          >
            {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* ── Main Layout ───────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Sidebar — Conversation History */}
        {sidebarOpen && (
          <aside className="hidden lg:flex flex-col w-72 shrink-0 border-r border-gray-800 bg-[#0a0a14] overflow-y-auto">
            <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                <MessageSquare className="w-3.5 h-3.5 inline mr-1.5 text-indigo-400" />
                Session History
              </span>
              {conversation.length > 0 && (
                <button
                  onClick={clearSession}
                  className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {conversation.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-600">
                  Your clinical queries will appear here.
                </div>
              ) : (
                conversation
                  .filter((m) => m.role === "user")
                  .map((m) => (
                    <div
                      key={m.id}
                      className="p-3 rounded-xl bg-[#18182e] border border-gray-800 text-xs text-gray-300 cursor-default hover:border-indigo-700/40 transition-all"
                    >
                      <div className="flex items-center gap-1.5 mb-1.5 text-[10px] text-gray-500">
                        <User className="w-3 h-3" />
                        <Clock className="w-3 h-3" />
                        {new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                      <p className="line-clamp-2 text-gray-300">{m.content}</p>
                    </div>
                  ))
              )}
            </div>

            {/* Patient Context Setter */}
            <div className="p-4 border-t border-gray-800 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Active Patient Context</span>
              <input
                type="text"
                placeholder="Patient Name (optional)"
                value={activePatientName || ""}
                onChange={(e) => setActivePatientName(e.target.value || null)}
                className="w-full bg-[#18182e] border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </aside>
        )}

        {/* Main Response Stream */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6">

            {/* Empty State + Quick Prompts */}
            {conversation.length === 0 && (
              <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
                <div className="text-center space-y-3 pt-6">
                  <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center mx-auto shadow-2xl shadow-indigo-500/20">
                    <Bot className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-white">NiniMed Clinical AI</h2>
                  <p className="text-sm text-gray-400 max-w-md mx-auto leading-relaxed">
                    Ask any clinical question — differential diagnoses, drug interactions, treatment protocols,
                    ICD-10 codes, or FMOH guidelines. Supports typed <strong className="text-indigo-300">and voice</strong> input.
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Quick Clinical Prompts</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {QUICK_PROMPTS.map((prompt) => (
                      <button
                        key={prompt.label}
                        onClick={() => {
                          setQuery(prompt.text);
                          textareaRef.current?.focus();
                        }}
                        className="text-left p-3.5 bg-[#121222] border border-gray-800 hover:border-indigo-500/50 hover:bg-[#18182e] rounded-xl transition-all group"
                      >
                        <div className="text-xs font-bold text-indigo-400 group-hover:text-indigo-300 mb-1">
                          {prompt.label}
                        </div>
                        <div className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed">
                          {prompt.text}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Conversation Messages */}
            {conversation.map((msg) => (
              <div
                key={msg.id}
                className={`max-w-3xl mx-auto ${msg.role === "user" ? "flex justify-end" : "w-full"}`}
              >
                {msg.role === "user" ? (
                  <div className="max-w-xl bg-indigo-600/20 border border-indigo-500/30 rounded-2xl px-4 py-3 text-sm text-gray-100 shadow-lg">
                    <div className="flex items-center gap-1.5 mb-1.5 text-[10px] text-indigo-400 font-bold uppercase">
                      <User className="w-3 h-3" /> Clinician Query
                      <span className="text-gray-500 font-normal ml-auto">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="leading-relaxed text-xs sm:text-sm">{msg.content}</p>
                  </div>
                ) : msg.response ? (
                  <ClinicalAIResponseCard
                    response={msg.response}
                    query={conversation.find(
                      (m, i) => m.role === "user" && conversation[i + 1]?.id === msg.id
                    )?.content || ""}
                    isSpeaking={speakingId === msg.id}
                    onSpeakToggle={() => handleSpeakToggle(msg)}
                    onSaveToChart={() => handleSaveToChart(msg)}
                  />
                ) : (
                  <div className="bg-[#121222] border border-gray-800 rounded-2xl px-5 py-4 text-xs text-rose-300 max-w-2xl">
                    <AlertTriangle className="w-4 h-4 inline mr-1.5 text-rose-400" />
                    {msg.content}
                  </div>
                )}
              </div>
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="max-w-3xl mx-auto w-full animate-fade-in">
                <div className="bg-[#121222] border border-indigo-500/20 rounded-2xl px-5 py-5 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                    <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-xs font-bold text-white">Analyzing clinical data...</div>
                    <div className="flex gap-1">
                      {["Differential analysis", "Drug cross-check", "FMOH protocol match", "ICD-10 mapping"].map((step, i) => (
                        <span
                          key={step}
                          className="text-[10px] bg-indigo-950/60 border border-indigo-800/40 text-indigo-300 px-2 py-0.5 rounded-md animate-pulse"
                          style={{ animationDelay: `${i * 150}ms` }}
                        >
                          {step}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={responseEndRef} />
          </div>

          {/* ── Query Input Bar ─────────────────────────────────────────── */}
          <div className="shrink-0 border-t border-gray-800 bg-[#0a0a14] px-4 sm:px-6 py-4">
            <div className="max-w-3xl mx-auto space-y-2">
              {/* Voice interim text preview */}
              {isListening && (
                <div className="px-4 py-2 bg-indigo-950/40 border border-indigo-500/30 rounded-xl text-xs">
                  <span className="text-indigo-400 font-bold flex items-center gap-1.5 mb-1">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    Listening {voiceLang === "am-ET" ? "(Amharic)" : "(English)"}...
                  </span>
                  <span className="text-gray-400 italic">
                    {interimText || "Speak your clinical query..."}
                  </span>
                </div>
              )}

              {/* Main Input Row */}
              <div className="flex items-end gap-2">
                {/* Language toggle (mobile) */}
                <button
                  onClick={() => setVoiceLang((v) => v === "en-US" ? "am-ET" : "en-US")}
                  className="shrink-0 mb-0.5 w-9 h-9 rounded-xl bg-[#18182e] border border-gray-700 hover:border-indigo-500/50 text-gray-400 hover:text-indigo-300 flex items-center justify-center text-sm transition-all"
                  title={`Switch to ${voiceLang === "en-US" ? "Amharic" : "English"}`}
                >
                  {voiceLang === "en-US" ? "🇬🇧" : "🇪🇹"}
                </button>

                {/* Textarea */}
                <div className="flex-1 relative">
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      // Auto-grow
                      e.target.style.height = "auto";
                      e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Type or speak your clinical query... (Enter to submit, Shift+Enter for new line)"
                    className="w-full bg-[#18182e] border border-gray-700 focus:border-indigo-500 rounded-2xl px-4 py-3 pr-12 text-sm text-white placeholder-gray-600 focus:outline-none resize-none leading-relaxed transition-all"
                    style={{ minHeight: "48px", maxHeight: "160px" }}
                    disabled={isLoading}
                  />
                </div>

                {/* Mic Button */}
                {speechSupported && (
                  <button
                    onClick={toggleListening}
                    className={`shrink-0 mb-0.5 w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${
                      isListening
                        ? "bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-500/30 animate-pulse"
                        : "bg-[#18182e] border-gray-700 hover:border-indigo-500/50 text-gray-400 hover:text-indigo-300"
                    }`}
                    title={isListening ? "Stop recording" : "Start voice input"}
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                )}

                {/* Send Button */}
                <button
                  onClick={handleSubmit}
                  disabled={!query.trim() || isLoading}
                  className="shrink-0 mb-0.5 w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center shadow-lg shadow-indigo-600/25 transition-all"
                  title="Submit query"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>

              <p className="text-[10px] text-gray-600 text-center">
                NiniMed Clinical AI · For licensed clinical staff only · Evidence-based · FMOH guideline-aligned
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
