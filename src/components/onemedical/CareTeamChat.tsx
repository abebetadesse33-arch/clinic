"use client";

import React, { useState, useEffect } from "react";
import { Send, Paperclip, ShieldCheck, Clock, CheckCheck, User, Sparkles } from "lucide-react";

interface Message {
  id: string;
  sender: "patient" | "doctor" | "nurse";
  senderName: string;
  senderRole: string;
  text: string;
  timestamp: string;
  avatarText: string;
}

export default function CareTeamChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);

  const fetchMessages = () => {
    fetch("/api/v1/patient/messages")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.data)) {
          const list = d.data.map((m: any) => {
            const isPatient = m.senderType === "patient";
            return {
              id: m.id,
              sender: isPatient ? "patient" : "doctor",
              senderName: m.senderName || (isPatient ? "You" : "Care Provider"),
              senderRole: isPatient ? "Patient" : "Care Team",
              text: m.body,
              timestamp: m.createdAt
                ? new Date(m.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
                : "Just now",
              avatarText: (m.senderName || (isPatient ? "PT" : "MD")).substring(0, 2).toUpperCase(),
            } as Message;
          });
          setMessages(list);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending) return;

    const textToSend = inputText.trim();
    setInputText("");
    setIsSending(true);

    try {
      const res = await fetch("/api/v1/patient/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageText: textToSend }),
      });
      const d = await res.json();
      if (d.success) {
        fetchMessages();
      }
    } catch {
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-[#E7E2D8] shadow-warm flex flex-col h-[600px] overflow-hidden">
      {/* Chat Header */}
      <div className="bg-[#FAF8F5] border-b border-[#E7E2D8] p-4 sm:px-6 sm:py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#005C4B] text-white flex items-center justify-center font-bold text-sm">
            AM
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-[#162E27]">Your Dedicated Care Team</h3>
              <span className="badge-mint text-[10px] py-0.5 px-2">Active</span>
            </div>
            <p className="text-[11px] text-[#687B74]">
              Primary Care Leads & Triage Staff • Encrypted clinical inbox
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-[#005C4B] font-semibold bg-[#E8F4F0] px-3 py-1 rounded-full">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>HIPAA Compliant</span>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#FAF8F5]/30">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-2 text-[#687B74]">
            <Sparkles className="w-8 h-8 text-[#005C4B]/60" />
            <h4 className="font-bold text-xs text-[#162E27]">Start a Conversation</h4>
            <p className="text-xs max-w-sm">
              Your care team is here to help with questions about prescriptions, lab orders, and ongoing health goals.
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const isPatient = m.sender === "patient";
            return (
              <div
                key={m.id}
                className={`flex items-end gap-2.5 ${isPatient ? "justify-end" : "justify-start"}`}
              >
                {!isPatient && (
                  <div className="w-8 h-8 rounded-full bg-[#005C4B] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                    {m.avatarText}
                  </div>
                )}

                <div
                  className={`max-w-[80%] sm:max-w-[70%] rounded-2xl p-4 shadow-sm ${
                    isPatient
                      ? "bg-[#005C4B] text-white rounded-br-none"
                      : "bg-white border border-[#E7E2D8] text-[#33413C] rounded-bl-none"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <span className={`text-[11px] font-bold ${isPatient ? "text-[#E8F4F0]" : "text-[#162E27]"}`}>
                      {m.senderName} <span className="font-normal opacity-80">({m.senderRole})</span>
                    </span>
                    <span className={`text-[10px] ${isPatient ? "text-[#E8F4F0]/70" : "text-[#687B74]"}`}>
                      {m.timestamp}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed">{m.text}</p>
                </div>

                {isPatient && (
                  <div className="w-8 h-8 rounded-full bg-[#D96B43] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                    {m.avatarText}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Message Input Box */}
      <form
        onSubmit={handleSendMessage}
        className="p-3 sm:p-4 bg-white border-t border-[#E7E2D8] flex items-center gap-2"
      >
        <button
          type="button"
          className="w-10 h-10 rounded-full bg-[#FAF8F5] border border-[#E7E2D8] text-[#687B74] hover:text-[#005C4B] flex items-center justify-center transition-colors shrink-0"
          title="Attach clinical document"
          onClick={() => alert("Document attachment available during active encounters.")}
        >
          <Paperclip className="w-4 h-4" />
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Message your doctor or triage team (non-emergency)..."
          className="input-warm text-xs flex-1"
        />

        <button
          type="submit"
          disabled={!inputText.trim() || isSending}
          className="btn-pill-primary text-xs py-2.5 px-4 shrink-0 disabled:opacity-50 flex items-center gap-1.5"
        >
          <span>{isSending ? "Sending..." : "Send"}</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
