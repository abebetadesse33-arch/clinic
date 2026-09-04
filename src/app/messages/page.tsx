"use client";

import React, { useState } from "react";
import { useClinic } from "../../context/ClinicContext";
import RoleGuard from "../../components/auth/RoleGuard";
import {
  AlertTriangle,
  HeartHandshake,
  MessageSquare,
  Send,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserCheck,
  Users,
} from "lucide-react";

export default function ClinicalTeamMessagesPage() {
  return (
    <RoleGuard
      allowedRoles={[
        "physician",
        "nurse_practitioner",
        "nurse",
        "pharmacist",
        "dietitian",
        "physiotherapist",
        "occupational_therapist",
        "social_worker",
        "psychologist",
        "biologist",
        "genetic_counselor",
        "radiologist",
        "pathologist",
        "lab_technician",
        "respiratory_therapist",
        "care_coordinator",
        "system_admin",
        "tenant_admin",
      ]}
      fallbackTitle="Clinical Care Team Messaging Channel"
      fallbackMessage="Access to secure interdisciplinary clinical consultation threads is restricted to healthcare staff."
    >
      <ClinicalTeamMessagesContent />
    </RoleGuard>
  );
}

function ClinicalTeamMessagesContent() {
  const { teamMessages, patients, selectedPatient, selectPatient, sendTeamMessage, currentUser, currentRole } = useClinic();

  const patient = selectedPatient || patients[0];
  const patientMessages = teamMessages.filter((m) => m.patientId === patient.id);

  const [messageText, setMessageText] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    sendTeamMessage(patient.id, messageText, isUrgent);
    setMessageText("");
    setIsUrgent(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-teal-950/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-bold uppercase">
              HIPAA-Compliant Team Channel
            </span>
            <span className="text-xs text-slate-400 font-mono">MRN: {patient.mrn}</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white mt-1">
            Care Team Clinical Consultation Thread
          </h1>
          <p className="text-xs text-slate-300 mt-0.5">
            Real-time interdisciplinary messaging for <strong className="text-white">{patient.firstName} {patient.lastName}</strong>.
          </p>
        </div>

        {/* Patient Switcher */}
        <select
          value={patient.id}
          onChange={(e) => selectPatient(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
        >
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.firstName} {p.lastName} ({p.mrn})
            </option>
          ))}
        </select>
      </div>

      {/* Messages Thread Canvas */}
      <div className="glass-card p-6 rounded-2xl border border-slate-800 flex flex-col h-[550px]">
        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto space-y-3.5 pr-2">
          {patientMessages.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-40" />
              <p className="text-xs">No clinical consultation messages recorded yet for this patient.</p>
            </div>
          ) : (
            patientMessages.map((msg) => {
              const isMe = msg.senderId === currentUser.id;
              return (
                <div
                  key={msg.id}
                  className={`p-4 rounded-2xl border max-w-2xl ${
                    msg.isUrgentConsult
                      ? "bg-rose-950/70 border-rose-600/60 shadow-lg shadow-rose-950/40"
                      : isMe
                      ? "bg-teal-950/40 border-teal-600/40 ml-auto"
                      : "bg-slate-900/90 border-slate-800 mr-auto"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 text-xs mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{msg.senderName}</span>
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-teal-500/20 text-teal-300 font-bold">
                        {msg.senderRole.replace("_", " ")}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      {msg.isUrgentConsult && (
                        <span className="px-1.5 py-0.2 rounded bg-rose-500 text-slate-950 font-bold uppercase flex items-center gap-0.5">
                          <AlertTriangle className="w-3 h-3" /> URGENT CONSULT
                        </span>
                      )}
                      <span>{msg.createdAt ? msg.createdAt.substring(11, 16) : "--:--"} UTC</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
              );
            })
          )}
        </div>

        {/* Input & Action Bar */}
        <form onSubmit={handleSendMessage} className="mt-4 pt-4 border-t border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs px-1">
            <label className="flex items-center gap-2 text-slate-400 cursor-pointer hover:text-white">
              <input
                type="checkbox"
                checked={isUrgent}
                onChange={(e) => setIsUrgent(e.target.checked)}
                className="rounded border-slate-700 text-teal-500 focus:ring-0"
              />
              <span className="text-[11px] font-bold text-rose-400 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Flag as Urgent Interdisciplinary Consult
              </span>
            </label>
            <span className="text-[10px] text-slate-500">Posting as: {currentUser.fullName} ({currentRole})</span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              required
              placeholder="Type clinical consultation note or interdisciplinary question..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 transition-all"
            >
              <Send className="w-4 h-4" />
              Send Consult
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
