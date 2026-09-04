"use client";

import React, { useState, useEffect, useRef } from "react";
import { useClinic } from "@/context/ClinicContext";
import {
  Sparkles,
  Bot,
  X,
  Send,
  Loader2,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  Stethoscope,
  Pill,
  FlaskConical,
  FileText,
  ShieldCheck,
  User,
  Zap,
  Mic,
  MicOff,
  ChevronDown,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  modelUsed?: string;
  citations?: string[];
  suggestedActions?: Array<{
    label: string;
    actionType: string;
    payload?: string;
  }>;
}

export default function ClinicalAiCopilot() {
  const { currentRole, selectedPatient } = useClinic();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [contextMode, setContextMode] = useState<
    "general" | "soap_draft" | "drug_safety" | "lab_explanation" | "patient_education"
  >("general");

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `👋 **NiniMed Enterprise Medical AI Copilot** is active. 

I am grounded in live clinical records and evidence-based medicine. How can I assist you with clinical reasoning, drug safety, or patient care today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Keyboard shortcut listener (Alt + A or Ctrl + J)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.altKey && e.key.toLowerCase() === "a") || (e.ctrlKey && e.key.toLowerCase() === "j")) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSendMessage = async (textToSend?: string, modeOverride?: typeof contextMode) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || loading) return;

    const activeMode = modeOverride || contextMode;
    const userMsgId = Date.now().toString();
    const userMsg: Message = {
      id: userMsgId,
      role: "user",
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setLoading(true);

    try {
      const response = await fetch("/api/v1/ai/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query,
          patientId: selectedPatient?.id,
          userRole: currentRole || "physician",
          contextMode: activeMode,
          history: messages.slice(-4).map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await response.json();
      if (data.success && data.data) {
        const assistantMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          modelUsed: data.data.modelUsed,
          citations: data.data.citations,
          suggestedActions: data.data.suggestedActions,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        throw new Error(data.error || "Failed to generate AI response");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error connecting to AI service";
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `⚠️ **AI Service Notification**: ${message}. Please check network or try again.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleSpeechRecognition = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputMessage((prev) => (prev ? `${prev} ${transcript}` : transcript));
      };

      recognition.start();
    } catch (e) {
      console.error(e);
      setIsListening(false);
    }
  };

  return (
    <>
      {/* Floating Launcher Button */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2">
        {!isOpen && (
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 text-slate-300 text-xs shadow-lg border border-slate-700 backdrop-blur-md animate-fade-in">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>AI Copilot</span>
            <kbd className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 border border-slate-600">
              Alt+A
            </kbd>
          </div>
        )}

        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle Clinical AI Copilot"
          className={`relative group p-3.5 rounded-full shadow-2xl transition-all duration-300 flex items-center justify-center ${
            isOpen
              ? "bg-slate-800 text-slate-300 hover:bg-slate-700 rotate-90"
              : "bg-gradient-to-r from-[#005C4B] via-emerald-600 to-teal-700 text-white hover:scale-105 hover:shadow-emerald-500/25 ring-4 ring-emerald-500/20"
          }`}
        >
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <>
              <Sparkles className="w-6 h-6 animate-pulse" />
              {selectedPatient && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-slate-900" />
              )}
            </>
          )}
        </button>
      </div>

      {/* Floating Copilot Modal / Window */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-300 flex flex-col bg-slate-950/95 backdrop-blur-xl border border-slate-800 shadow-2xl rounded-2xl overflow-hidden ${
            isExpanded
              ? "inset-4 md:inset-10"
              : "bottom-20 right-4 sm:right-6 w-[95vw] sm:w-[480px] h-[640px] max-h-[85vh]"
          }`}
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shrink-0 shadow-md">
                <Bot className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white truncate">NiniMed AI Copilot</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium border border-emerald-500/30">
                    Live Multimodal
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate">
                  {selectedPatient ? (
                    <span className="text-emerald-400">
                      Grounded on: {selectedPatient.firstName} {selectedPatient.lastName} ({selectedPatient.mrn})
                    </span>
                  ) : (
                    "Enterprise Clinical Decision Support"
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-slate-400">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-white transition"
                title={isExpanded ? "Collapse" : "Expand"}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-white transition"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Action Clinical Chips */}
          <div className="px-4 py-2 bg-slate-900/40 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {[
              {
                label: "SOAP Note",
                icon: <FileText className="w-3 h-3 text-blue-400" />,
                query: "Draft a comprehensive SOAP note from active patient vitals and findings",
                mode: "soap_draft" as const,
              },
              {
                label: "Drug Safety",
                icon: <Pill className="w-3 h-3 text-rose-400" />,
                query: "Screen patient's active prescriptions for DDI, renal clearance (eGFR), and allergy conflicts",
                mode: "drug_safety" as const,
              },
              {
                label: "Lab Analysis",
                icon: <FlaskConical className="w-3 h-3 text-amber-400" />,
                query: "Analyze recent abnormal lab trends and suggest follow-up diagnostic panels",
                mode: "lab_explanation" as const,
              },
              {
                label: "Patient Guide",
                icon: <User className="w-3 h-3 text-teal-400" />,
                query: "Explain current diagnosis and discharge instructions in clear patient-friendly terms",
                mode: "patient_education" as const,
              },
            ].map((chip, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setContextMode(chip.mode);
                  handleSendMessage(chip.query, chip.mode);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 text-xs font-medium border border-slate-700 whitespace-nowrap transition"
              >
                {chip.icon}
                <span>{chip.label}</span>
              </button>
            ))}
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs sm:text-sm">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center text-white shrink-0 mt-0.5 shadow">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 space-y-2 shadow-sm ${
                    msg.role === "user"
                      ? "bg-emerald-600 text-white rounded-br-none"
                      : "bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none"
                  }`}
                >
                  <div className="prose prose-invert prose-xs max-w-none whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                  </div>

                  {msg.role === "assistant" && (
                    <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500">
                      <div className="flex items-center gap-2">
                        {msg.modelUsed && <span>{msg.modelUsed}</span>}
                        <span>•</span>
                        <span>{msg.timestamp}</span>
                      </div>
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                    <div className="pt-2 flex flex-wrap gap-1.5">
                      {msg.suggestedActions.map((action, aidx) => (
                        <button
                          key={aidx}
                          onClick={() => {
                            if (action.payload) window.location.href = action.payload;
                            else handleCopy(`act-${aidx}`, msg.content);
                          }}
                          className="px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-[11px] font-medium border border-emerald-500/30 transition flex items-center gap-1"
                        >
                          <Zap className="w-3 h-3" />
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-3 items-center text-slate-400 text-xs">
                <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center animate-pulse">
                  <Bot className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Synthesizing EHR telemetry and medical guidelines…</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <div className="p-3 border-t border-slate-800 bg-slate-900/90">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <button
                type="button"
                onClick={toggleSpeechRecognition}
                className={`p-2.5 rounded-xl border transition ${
                  isListening
                    ? "bg-rose-500 text-white border-rose-400 animate-pulse"
                    : "bg-slate-800 text-slate-400 hover:text-white border-slate-700"
                }`}
                title="Dictate with Voice"
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={
                  selectedPatient
                    ? `Ask about ${selectedPatient.firstName} ${selectedPatient.lastName} or clinical guidance…`
                    : "Ask clinical, pharmaceutical, or workflow questions…"
                }
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
              />

              <button
                type="submit"
                disabled={!inputMessage.trim() || loading}
                className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white font-medium transition shadow-md flex items-center justify-center shrink-0"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
