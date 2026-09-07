"use client";

import React, { useState, useEffect } from "react";
import { useClinic } from "@/context/ClinicContext";
import RoleGuard from "@/components/auth/RoleGuard";
import {
  Users, Brain, MessageCircle, CheckSquare, Zap,
  Clock, Send, ChevronDown, ChevronUp, Star, Video, Save, CheckCircle2, Loader2, FileText
} from "lucide-react";

export default function CaseConferencePage() {
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
        "auditor",
      ]}
      fallbackTitle="Multidisciplinary Case Conference Studio"
      fallbackMessage="Access to real-time case conferences and interdisciplinary team coordination is restricted to healthcare staff."
    >
      <CaseConferenceContent />
    </RoleGuard>
  );
}

function CaseConferenceContent() {
  const { currentRole, currentUser } = useClinic();
  const [activeCases, setActiveCases] = useState<any[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([
    {
      id: "msg-01",
      senderName: "Dr. Sarah Mitchell",
      senderRole: "Physician",
      content: "Good morning team. Case conference is open. Main focus is glycemic and blood pressure optimization alongside medication review.",
      timestamp: new Date().toISOString(),
    },
    {
      id: "msg-02",
      senderName: "David Sterling",
      senderRole: "Pharmacist",
      content: "Pharmacotherapy review complete. Renal dosing adjusted and DDI check cleared.",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [actionItems, setActionItems] = useState<any[]>([
    { id: "ai-01", assignedTo: "Pharmacist", task: "Review renal pharmacokinetics and medication reconciliation", priority: "urgent", done: false },
    { id: "ai-02", assignedTo: "Physician", task: "Adjust primary anti-hypertensive regimen", priority: "high", done: false },
    { id: "ai-03", assignedTo: "Dietitian", task: "Establish customized medical nutrition therapy protocol", priority: "routine", done: false },
  ]);
  const [newMessage, setNewMessage] = useState("");
  const [conferenceNotes, setConferenceNotes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "actions" | "notes">("chat");

  // Fetch real cases from DB
  useEffect(() => {
    fetch("/api/v1/cases?limit=20")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.data?.cases) && d.data.cases.length > 0) {
          setActiveCases(d.data.cases);
          setSelectedCaseId(d.data.cases[0].caseId || d.data.cases[0].id);
          setSelectedCase(d.data.cases[0]);
          setConferenceNotes(d.data.cases[0].conferenceNotes || "");
        }
      })
      .catch(() => {});

    // Fetch clinicians
    fetch("/api/v1/users")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.data)) {
          setUsersList(d.data);
        }
      })
      .catch(() => {});
  }, []);

  const handleSelectCase = (id: string) => {
    setSelectedCaseId(id);
    const found = activeCases.find((c) => (c.caseId || c.id) === id);
    if (found) {
      setSelectedCase(found);
      setConferenceNotes(found.conferenceNotes || "");
    }
  };

  const handleSaveConferenceNotes = async () => {
    if (!selectedCaseId) return;
    setIsSavingNotes(true);
    setSaveSuccess(false);
    try {
      await fetch(`/api/v1/cases/${selectedCaseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conferenceNotes: `${conferenceNotes}\n\n[Conference Decision logged on ${new Date().toLocaleString()} by ${currentUser?.fullName || "Clinician"}]`,
        }),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error("Save conference notes error:", e);
    } finally {
      setIsSavingNotes(false);
    }
  };

  const sendMessage = () => {
    if (!newMessage.trim()) return;
    const msg = {
      id: `msg-${Date.now()}`,
      senderName: currentUser?.fullName || "Clinician",
      senderRole: (currentRole || "Physician").replace(/_/g, " "),
      content: newMessage,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, msg]);
    setNewMessage("");
  };

  const toggleActionItem = (id: string) => {
    setActionItems((prev) => prev.map((a) => (a.id === id ? { ...a, done: !a.done } : a)));
  };

  const currentCaseNumber = selectedCase?.caseId || selectedCase?.caseNumber || "CASE-ACTIVE";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-md">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Multidisciplinary Case Conference Studio</h1>
            <p className="text-xs text-slate-400 mt-0.5">Real-time interdisciplinary case review, synchronous video & persistent EHR consensus</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={`/telemedicine/conf-${currentCaseNumber}?role=clinician`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-teal-500/20"
          >
            <Video className="w-4 h-4" /> Launch Team Video Room
          </a>
        </div>
      </div>

      {/* Case Selector Dropdown & Case Overview */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold text-teal-400 tracking-wider">Select Active Patient Case</label>
          <select
            value={selectedCaseId}
            onChange={(e) => handleSelectCase(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-medium focus:outline-none focus:border-teal-500"
          >
            {activeCases.map((c) => (
              <option key={c.caseId || c.id} value={c.caseId || c.id}>
                {c.caseId || c.caseNumber} — {c.patient?.fullName || "Patient"} ({c.complaint?.chiefComplaint?.slice(0, 40)}...)
              </option>
            ))}
          </select>
        </div>

        {selectedCase && (
          <div className="flex items-center gap-4 text-xs text-slate-300">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Chief Complaint</span>
              <span className="font-bold text-white">{selectedCase.complaint?.chiefComplaint}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Severity</span>
              <span className="capitalize text-amber-400 font-bold">{selectedCase.complaint?.severity}</span>
            </div>
          </div>
        )}
      </div>

      {/* Conference Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Chat, Actions, Consensus Notes */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden flex flex-col min-h-[500px]">
            {/* Tabs */}
            <div className="flex border-b border-slate-800 bg-slate-950/40">
              <button
                onClick={() => setActiveTab("chat")}
                className={`px-5 py-3 text-xs font-bold transition-all border-b-2 ${
                  activeTab === "chat" ? "border-teal-400 text-teal-400 bg-slate-900" : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                Live Clinical Discussion
              </button>
              <button
                onClick={() => setActiveTab("actions")}
                className={`px-5 py-3 text-xs font-bold transition-all border-b-2 ${
                  activeTab === "actions" ? "border-teal-400 text-teal-400 bg-slate-900" : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                Action Items ({actionItems.filter((a) => !a.done).length} Pending)
              </button>
              <button
                onClick={() => setActiveTab("notes")}
                className={`px-5 py-3 text-xs font-bold transition-all border-b-2 ${
                  activeTab === "notes" ? "border-teal-400 text-teal-400 bg-slate-900" : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                EHR Consensus Notes
              </button>
            </div>

            {/* Tab 1: Chat */}
            {activeTab === "chat" && (
              <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {messages.map((m) => (
                    <div key={m.id} className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-teal-300">{m.senderName}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{m.senderRole}</span>
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed">{m.content}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 pt-2 border-t border-slate-800">
                  <input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    placeholder="Share clinical recommendation or question..."
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                  />
                  <button
                    onClick={sendMessage}
                    className="px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-xl transition-all"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Tab 2: Action Items */}
            {activeTab === "actions" && (
              <div className="p-5 flex-1 space-y-3">
                {actionItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => toggleActionItem(item.id)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                      item.done ? "bg-slate-950/40 border-slate-800/50 opacity-60" : "bg-slate-950/80 border-slate-800 hover:border-teal-500/40"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input type="checkbox" checked={item.done} onChange={() => {}} className="accent-teal-500 w-4 h-4 rounded" />
                      <div>
                        <span className={`text-xs font-semibold text-white ${item.done ? "line-through text-slate-500" : ""}`}>
                          {item.task}
                        </span>
                        <span className="block text-[10px] text-teal-400 font-mono mt-0.5">Assigned to: {item.assignedTo}</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      {item.priority}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 3: EHR Consensus Notes */}
            {activeTab === "notes" && (
              <div className="p-5 flex-1 flex flex-col space-y-4">
                <p className="text-xs text-slate-400">
                  Document the final multidisciplinary team consensus. These notes will be persisted directly to the patient case record in PostgreSQL.
                </p>
                <textarea
                  value={conferenceNotes}
                  onChange={(e) => setConferenceNotes(e.target.value)}
                  rows={8}
                  placeholder="Enter multidisciplinary consensus, diagnostic decisions, and plan..."
                  className="w-full flex-1 bg-slate-950 border border-slate-700 rounded-2xl p-4 text-xs text-white leading-relaxed focus:outline-none focus:border-teal-500"
                />
                <div className="flex items-center justify-between pt-2">
                  {saveSuccess && (
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> Consensus Saved to Case Record
                    </span>
                  )}
                  <button
                    onClick={handleSaveConferenceNotes}
                    disabled={isSavingNotes}
                    className="ml-auto flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition-all shadow-md"
                  >
                    {isSavingNotes ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>Save to Case EHR</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Participating Clinicians Panel */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Available Clinicians</h3>
              <span className="text-[10px] text-emerald-400 font-bold">● Active Directory</span>
            </div>
            <div className="space-y-2.5 max-h-[450px] overflow-y-auto pr-1">
              {(usersList.length > 0 ? usersList : [
                { id: "1", fullName: "Dr. Sarah Mitchell, MD", role: "physician", department: "Internal Medicine" },
                { id: "2", fullName: "Rachel Adams, NP", role: "nurse_practitioner", department: "Primary Care" },
                { id: "3", fullName: "David Sterling, PharmD", role: "pharmacist", department: "Clinical Pharmacy" },
              ]).map((u) => (
                <div key={u.id} className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white">{u.fullName}</div>
                    <div className="text-[10px] text-teal-400 capitalize">{u.department || u.role?.replace(/_/g, " ")}</div>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

