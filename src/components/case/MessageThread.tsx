"use client";

import React, { useState, useEffect, useRef } from "react";
import { Send, Paperclip, CheckCheck, User, Sparkles, Stethoscope, ShieldCheck, Loader2 } from "lucide-react";

export interface CaseMessageItem {
  id: string;
  senderId?: string;
  senderName: string;
  senderType: "patient" | "provider" | "care_coordinator" | "system";
  message: string;
  attachments?: Array<{ name: string; url: string; type: string }>;
  createdAt: string;
  readAt?: string | null;
}

interface MessageThreadProps {
  caseId: string;
  currentUserId?: string;
  currentUserName?: string;
  currentUserRole?: string;
}

export default function MessageThread({
  caseId,
  currentUserId,
  currentUserName = "Me",
  currentUserRole = "patient",
}: MessageThreadProps) {
  const [messages, setMessages] = useState<CaseMessageItem[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/v1/cases/${caseId}/messages`);
      const data = await res.json();
      if (data.success && data.data?.messages) {
        setMessages(data.data.messages);
      }
    } catch (e) {
      console.error("Fetch messages error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 4000); // 4s polling sync
    return () => clearInterval(interval);
  }, [caseId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || sending) return;

    setSending(true);
    const tempText = inputMessage.trim();
    setInputMessage("");

    try {
      const res = await fetch(`/api/v1/cases/${caseId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: currentUserId,
          senderName: currentUserName,
          senderType: currentUserRole === "patient" ? "patient" : "provider",
          message: tempText,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setMessages((prev) => [data.data, ...prev]);
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[480px] bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Chat Header */}
      <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center font-bold">
            <Stethoscope className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-white block">Case Care Team Channel</span>
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Secure HIPAA-compliant chat
            </span>
          </div>
        </div>
        <span className="text-[11px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700">
          Case: {caseId}
        </span>
      </div>

      {/* Message List */}
      <div
        ref={scrollRef}
        className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-gradient-to-b from-slate-950 via-slate-900/30 to-slate-950 flex flex-col-reverse"
      >
        {loading ? (
          <div className="flex items-center justify-center h-full text-slate-400 text-xs gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
            Loading secure conversation...
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs space-y-2">
            <Sparkles className="w-6 h-6 text-teal-500/50 mx-auto" />
            <p className="font-semibold text-slate-400">Care thread initiated</p>
            <p className="text-[11px] max-w-xs mx-auto">
              Ask questions or provide additional clinical details directly to your care team.
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const isMe =
              (currentUserRole === "patient" && m.senderType === "patient") ||
              (currentUserRole !== "patient" && m.senderType === "provider");

            const isSystem = m.senderType === "system";

            if (isSystem) {
              return (
                <div key={m.id} className="text-center my-2">
                  <span className="inline-block text-[10px] font-mono uppercase bg-slate-900 border border-slate-800 text-slate-400 px-3 py-1 rounded-full">
                    ⚡ {m.message}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={m.id}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"} space-y-1 max-w-[85%] ${
                  isMe ? "ml-auto" : "mr-auto"
                }`}
              >
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 px-1">
                  <span className="font-bold text-slate-300">{m.senderName}</span>
                  <span className="font-mono text-[9px] uppercase px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                    {m.senderType}
                  </span>
                  <span>·</span>
                  <span>
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                <div
                  className={`p-3.5 rounded-2xl text-xs leading-relaxed transition-all shadow-md ${
                    isMe
                      ? "bg-gradient-to-tr from-teal-600 to-teal-500 text-slate-950 font-medium rounded-tr-none"
                      : "bg-slate-900 border border-slate-800 text-slate-100 rounded-tl-none"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.message}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800 bg-slate-900/90 flex items-center gap-2">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Type a message to your doctor or care coordinator..."
          className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 transition-all"
        />
        <button
          type="submit"
          disabled={!inputMessage.trim() || sending}
          className="p-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-teal-900/30 flex items-center justify-center shrink-0"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
    </div>
  );
}
