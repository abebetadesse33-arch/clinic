"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Pill, CreditCard, UserCheck, FlaskConical, FileText, Activity,
  Bell, ArrowRight, AlertTriangle, CalendarClock, Stethoscope,
  HeartPulse, Microscope, Syringe, Truck, ShieldCheck, PhoneCall,
  ClipboardList, BarChart3, Users, Banknote, Receipt, BadgeCheck,
  Camera, FileWarning, MessageSquare, PackageCheck, Thermometer,
  BrainCircuit, ShieldAlert, Building2, ScanLine, BedDouble,
  ClipboardCheck, Send, Printer, Lock, Globe, Zap, Clock,
  Video, Radio, Dna, FlaskRound, TestTube, MonitorSmartphone,
  FileVideo, Mic, WifiOff, Wallet, Repeat, TicketCheck,
  CalendarX, FilePlus, FileDown, FileSearch, AlarmClock,
  UserPlus, UserMinus, UserCog, Shield, KeyRound, Target, Trophy,
  Play, Pause, Trash2, Edit2, X, Save, Plus
} from "lucide-react";

type WorkflowStep = {
  step: number;
  action: string;
  label?: string;
};

type Workflow = {
  id: string;
  name: string;
  description: string;
  triggerEvent: string;
  conditions: Record<string, unknown>;
  steps: WorkflowStep[];
  isActive: boolean;
  createdAt: string;
  createdByName?: string;
};

// ─────────────────────────────────────────────────────────────
// EXTENDED TRIGGER OPTIONS – Full Enterprise Coverage
// ─────────────────────────────────────────────────────────────
const TRIGGER_OPTIONS = [
  // ── AI & Decision Support
  { value: "AI_TRIAGE_COMPLETED", label: "AI Triage Completed", icon: <BrainCircuit size={14} />, color: "text-violet-400" },
  { value: "AI_CLINICAL_COPILOT_ENGAGED", label: "AI Clinical Copilot Engaged", icon: <BrainCircuit size={14} />, color: "text-violet-400" },
  { value: "AI_RISK_SCORE_CALCULATED", label: "AI Risk Score Calculated", icon: <BarChart3 size={14} />, color: "text-blue-400" },
  { value: "AI_DIAGNOSIS_SUGGESTED", label: "AI Diagnosis Suggested", icon: <Stethoscope size={14} />, color: "text-emerald-400" },
  { value: "AI_TREATMENT_PLAN_PROPOSED", label: "AI Treatment Plan Proposed", icon: <ClipboardList size={14} />, color: "text-teal-400" },
  { value: "AI_DRUG_INTERACTION_FLAGGED", label: "AI Drug Interaction Flagged", icon: <ShieldAlert size={14} />, color: "text-red-500" },
  { value: "AI_PHARMACOGENOMIC_ALERT", label: "AI Pharmacogenomic Alert", icon: <Dna size={14} />, color: "text-purple-400" },
  { value: "AI_CARE_GAP_IDENTIFIED", label: "AI Care Gap Identified", icon: <BrainCircuit size={14} />, color: "text-orange-400" },
  { value: "AI_PROACTIVE_INSIGHT_GENERATED", label: "AI Proactive Insight Generated", icon: <BrainCircuit size={14} />, color: "text-blue-400" },

  // ── Patient Engagement & Self‑Service
  { value: "PATIENT_SELF_REGISTERED", label: "Patient Self‑Registered", icon: <UserPlus size={14} />, color: "text-teal-400" },
  { value: "PATIENT_DASHBOARD_ACCESSED", label: "Patient Dashboard Accessed", icon: <MonitorSmartphone size={14} />, color: "text-blue-400" },
  { value: "PATIENT_CONSENT_SIGNED", label: "Patient Consent Signed", icon: <ShieldCheck size={14} />, color: "text-emerald-400" },
  { value: "PATIENT_CONSENT_REVOKED", label: "Patient Consent Revoked", icon: <Lock size={14} />, color: "text-red-500" },
  { value: "PATIENT_QUESTIONNAIRE_SUBMITTED", label: "Patient Questionnaire Submitted", icon: <ClipboardCheck size={14} />, color: "text-teal-400" },
  { value: "PATIENT_GOAL_SET", label: "Patient Goal Set", icon: <Target size={14} />, color: "text-emerald-400" },
  { value: "PATIENT_GOAL_ACHIEVED", label: "Patient Goal Achieved", icon: <Trophy size={14} />, color: "text-emerald-400" },
  { value: "PATIENT_SURVEY_COMPLETED", label: "Patient Survey Completed", icon: <ClipboardCheck size={14} />, color: "text-emerald-400" },

  // ── Telemedicine & Virtual Care
  { value: "TELEHEALTH_SESSION_SCHEDULED", label: "Telehealth Session Scheduled", icon: <Video size={14} />, color: "text-blue-400" },
  { value: "TELEHEALTH_SESSION_STARTED", label: "Telehealth Session Started", icon: <Video size={14} />, color: "text-emerald-400" },
  { value: "TELEHEALTH_SESSION_COMPLETED", label: "Telehealth Session Completed", icon: <Video size={14} />, color: "text-slate-400" },
  { value: "TELEHEALTH_NO_SHOW", label: "Telehealth No‑show", icon: <Video size={14} />, color: "text-amber-400" },
  { value: "REMOTE_CONSULTATION_REQUESTED", label: "Remote Consultation Requested", icon: <PhoneCall size={14} />, color: "text-teal-400" },
  { value: "VIRTUAL_WAITING_ROOM_JOINED", label: "Virtual Waiting Room Joined", icon: <MonitorSmartphone size={14} />, color: "text-blue-400" },
  { value: "TELEHEALTH_RECORDING_READY", label: "Telehealth Recording Ready", icon: <FileVideo size={14} />, color: "text-violet-400" },
  { value: "E_PRESCRIPTION_SENT", label: "E‑Prescription Sent", icon: <Pill size={14} />, color: "text-emerald-400" },

  // ── Remote Patient Monitoring & Devices
  { value: "DEVICE_CONNECTED", label: "Device Connected", icon: <Radio size={14} />, color: "text-blue-400" },
  { value: "DEVICE_DISCONNECTED", label: "Device Disconnected", icon: <WifiOff size={14} />, color: "text-amber-400" },
  { value: "DEVICE_READING_CRITICAL", label: "Device Reading Critical", icon: <Thermometer size={14} />, color: "text-red-500" },
  { value: "REMOTE_MONITORING_ALERT", label: "Remote Monitoring Alert", icon: <Radio size={14} />, color: "text-red-500" },
  { value: "RPM_COMPLIANCE_BREACH", label: "RPM Compliance Breach", icon: <AlarmClock size={14} />, color: "text-orange-400" },
  { value: "RPM_ENROLLMENT_CREATED", label: "RPM Enrollment Created", icon: <Users size={14} />, color: "text-teal-400" },
  { value: "RPM_PROGRAM_COMPLETED", label: "RPM Program Completed", icon: <BadgeCheck size={14} />, color: "text-emerald-400" },

  // ── Laboratory & Biochemical
  { value: "LAB_ORDER_SUBMITTED", label: "Lab Order Submitted", icon: <FlaskConical size={14} />, color: "text-amber-400" },
  { value: "LAB_RESULT_READY", label: "Lab Result Ready", icon: <FlaskConical size={14} />, color: "text-amber-400" },
  { value: "LAB_RESULT_CRITICAL", label: "Lab Result Critical", icon: <AlertTriangle size={14} />, color: "text-red-500" },
  { value: "LAB_RESULT_ABNORMAL", label: "Lab Result Abnormal", icon: <AlertTriangle size={14} />, color: "text-orange-400" },
  { value: "BIOCHEMICAL_PANEL_ORDERED", label: "Biochemical Panel Ordered", icon: <FlaskRound size={14} />, color: "text-amber-400" },
  { value: "BIOCHEMICAL_RESULT_READY", label: "Biochemical Result Ready", icon: <FlaskRound size={14} />, color: "text-amber-400" },
  { value: "BIOCHEMICAL_CRITICAL_VALUE", label: "Biochemical Critical Value", icon: <AlertTriangle size={14} />, color: "text-red-500" },
  { value: "METABOLIC_PANEL_ABNORMAL", label: "Metabolic Panel Abnormal", icon: <Activity size={14} />, color: "text-orange-400" },
  { value: "ELECTROLYTE_IMBALANCE", label: "Electrolyte Imbalance", icon: <FlaskRound size={14} />, color: "text-red-500" },
  { value: "DRUG_LEVEL_OUT_OF_RANGE", label: "Drug Level Out of Range", icon: <TestTube size={14} />, color: "text-red-500" },
  { value: "TOXICOLOGY_SCREEN_POSITIVE", label: "Toxicology Screen Positive", icon: <TestTube size={14} />, color: "text-red-600" },
  { value: "GENETIC_TEST_ORDERED", label: "Genetic Test Ordered", icon: <Dna size={14} />, color: "text-purple-400" },
  { value: "GENETIC_RESULT_READY", label: "Genetic Result Ready", icon: <Dna size={14} />, color: "text-purple-400" },
  { value: "PHARMACOGENOMIC_ALERT", label: "Pharmacogenomic Alert", icon: <Dna size={14} />, color: "text-red-500" },

  // ── Pharmacy & Medication
  { value: "PRESCRIPTION_SIGNED", label: "Prescription Signed", icon: <Pill size={14} />, color: "text-emerald-400" },
  { value: "MEDICATION_ORDER_MODIFIED", label: "Medication Order Modified", icon: <Pill size={14} />, color: "text-amber-400" },
  { value: "MEDICATION_DISPENSED", label: "Medication Dispensed", icon: <PackageCheck size={14} />, color: "text-emerald-400" },
  { value: "MEDICATION_ADMINISTERED", label: "Medication Administered", icon: <Syringe size={14} />, color: "text-blue-400" },
  { value: "DRUG_INTERACTION_DETECTED", label: "Drug Interaction Detected", icon: <AlertTriangle size={14} />, color: "text-red-500" },
  { value: "CONTROLLED_SUBSTANCE_ORDERED", label: "Controlled Substance Ordered", icon: <Lock size={14} />, color: "text-violet-400" },
  { value: "MEDICATION_REFILL_REQUESTED", label: "Medication Refill Requested", icon: <Pill size={14} />, color: "text-blue-400" },
  { value: "MEDICATION_STOCK_LOW", label: "Medication Stock Low", icon: <PackageCheck size={14} />, color: "text-amber-400" },

  // ── Specialist Consultations & Referrals
  { value: "SPECIALIST_REFERRAL_CREATED", label: "Specialist Referral Created", icon: <Users size={14} />, color: "text-teal-400" },
  { value: "SPECIALIST_REFERRAL_ACCEPTED", label: "Specialist Referral Accepted", icon: <Users size={14} />, color: "text-emerald-400" },
  { value: "SPECIALIST_REFERRAL_COMPLETED", label: "Specialist Referral Completed", icon: <Users size={14} />, color: "text-slate-400" },
  { value: "MULTIDISCIPLINARY_TEAM_MEETING_SCHEDULED", label: "MDT Meeting Scheduled", icon: <CalendarClock size={14} />, color: "text-blue-400" },
  { value: "MULTIDISCIPLINARY_TEAM_MEETING_COMPLETED", label: "MDT Meeting Completed", icon: <CalendarClock size={14} />, color: "text-slate-400" },
  { value: "SECOND_OPINION_REQUESTED", label: "Second Opinion Requested", icon: <Stethoscope size={14} />, color: "text-violet-400" },
  { value: "SECOND_OPINION_RECEIVED", label: "Second Opinion Received", icon: <Stethoscope size={14} />, color: "text-emerald-400" },

  // ── Billing, Payments & Subscriptions
  { value: "PAYMENT_COMPLETED", label: "Payment Completed", icon: <CreditCard size={14} />, color: "text-blue-400" },
  { value: "PAYMENT_FAILED", label: "Payment Failed", icon: <CreditCard size={14} />, color: "text-red-500" },
  { value: "PAYMENT_REFUNDED", label: "Payment Refunded", icon: <CreditCard size={14} />, color: "text-slate-400" },
  { value: "INVOICE_GENERATED", label: "Invoice Generated", icon: <Receipt size={14} />, color: "text-blue-400" },
  { value: "INSURANCE_PREAUTH_REQUIRED", label: "Insurance Pre‑auth Required", icon: <ShieldCheck size={14} />, color: "text-amber-400" },
  { value: "INSURANCE_CLAIM_DENIED", label: "Insurance Claim Denied", icon: <ShieldAlert size={14} />, color: "text-red-500" },
  { value: "BILLING_DISCREPANCY", label: "Billing Discrepancy", icon: <Banknote size={14} />, color: "text-orange-400" },
  { value: "SUBSCRIPTION_RENEWAL_DUE", label: "Subscription Renewal Due", icon: <CalendarClock size={14} />, color: "text-blue-400" },
  { value: "SUBSCRIPTION_CANCELLED", label: "Subscription Cancelled", icon: <CalendarX size={14} />, color: "text-slate-400" },

  // ── Staff & Compliance
  { value: "STAFF_LICENSE_EXPIRING", label: "Staff License Expiring", icon: <FileText size={14} />, color: "text-red-400" },
  { value: "STAFF_CREDENTIAL_VERIFIED", label: "Staff Credential Verified", icon: <BadgeCheck size={14} />, color: "text-emerald-400" },
  { value: "AUDIT_LOG_ANOMALY", label: "Audit Log Anomaly", icon: <FileWarning size={14} />, color: "text-red-500" },
  { value: "CONSENT_REVOKED", label: "Consent Revoked", icon: <Lock size={14} />, color: "text-red-500" },
  { value: "DATA_BREACH_SUSPECTED", label: "Data Breach Suspected", icon: <ShieldAlert size={14} />, color: "text-red-600" },
  { value: "REGULATORY_REPORT_DUE", label: "Regulatory Report Due", icon: <FileText size={14} />, color: "text-amber-400" },

  // ── Operational & Care Coordination
  { value: "CARE_PLAN_UPDATED", label: "Care Plan Updated", icon: <ClipboardList size={14} />, color: "text-blue-400" },
  { value: "TASK_OVERDUE", label: "Task Overdue", icon: <Clock size={14} />, color: "text-red-500" },
  { value: "PATIENT_MESSAGE_RECEIVED", label: "Patient Message Received", icon: <MessageSquare size={14} />, color: "text-blue-400" },
  { value: "PATIENT_NO_SHOW", label: "Patient No‑show", icon: <CalendarClock size={14} />, color: "text-amber-400" },
  { value: "WAIT_TIME_EXCEEDED", label: "Wait Time Exceeded", icon: <Clock size={14} />, color: "text-orange-400" },
  { value: "CASE_CREATED", label: "Case Created", icon: <FilePlus size={14} />, color: "text-teal-400" },
  { value: "CASE_CLOSED", label: "Case Closed", icon: <FileDown size={14} />, color: "text-slate-400" },
];

// ─────────────────────────────────────────────────────────────
// EXTENDED STEP ACTIONS – Full Enterprise Coverage
// ─────────────────────────────────────────────────────────────
const STEP_ACTIONS = [
  // ── AI & Decision Support
  "TRIGGER_AI_TRIAGE",
  "ENGAGE_AI_COPILOT",
  "CALCULATE_RISK_SCORE",
  "SUGGEST_DIAGNOSIS",
  "SUGGEST_TREATMENT_PLAN",
  "RUN_DRUG_INTERACTION_CHECK",
  "RUN_PHARMACOGENOMIC_CHECK",
  "IDENTIFY_CARE_GAPS",
  "GENERATE_PROACTIVE_INSIGHT",

  // ── Patient Engagement & Self‑Service
  "SEND_PATIENT_EDUCATION",
  "SEND_GOAL_REMINDER",
  "SEND_SATISFACTION_SURVEY",
  "SEND_QUESTIONNAIRE",
  "CREATE_PATIENT_GOAL",
  "TRACK_GOAL_PROGRESS",

  // ── Telemedicine & Virtual Care
  "INITIATE_VIDEO_CALL",
  "SEND_TELEHEALTH_LINK",
  "CREATE_TELEHEALTH_ROOM",
  "START_TELEHEALTH_SESSION",
  "END_TELEHEALTH_SESSION",
  "RECORD_CONSULTATION",
  "TRANSCRIBE_CONSULTATION",
  "GENERATE_TELEHEALTH_SUMMARY",
  "PRESCRIBE_DURING_TELEHEALTH",
  "ORDER_LAB_FROM_TELEHEALTH",
  "SCHEDULE_FOLLOW_UP_TELEHEALTH",
  "SEND_REMOTE_MONITORING_ALERT",
  "SYNC_REMOTE_DEVICE_DATA",
  "SEND_E_PRESCRIPTION",
  "SEND_VIRTUAL_WAITING_ROOM_LINK",

  // ── Remote Patient Monitoring & Devices
  "CONNECT_DEVICE",
  "DISCONNECT_DEVICE",
  "READ_DEVICE_DATA",
  "ENROLL_IN_RPM_PROGRAM",
  "COMPLETE_RPM_PROGRAM",
  "SEND_RPM_REMINDER",

  // ── Laboratory & Biochemical
  "CREATE_LAB_ORDER",
  "RECEIVE_SPECIMEN",
  "VALIDATE_LAB_RESULT",
  "FLAG_CRITICAL_LAB_VALUE",
  "INTERPRET_BIOCHEMICAL_RESULTS",
  "CALCULATE_ANION_GAP",
  "CALCULATE_OSMOLALITY",
  "CHECK_DRUG_LEVELS",
  "SUGGEST_BIOCHEMICAL_FOLLOWUP",
  "REFER_TO_BIOCHEMIST",
  "CREATE_BIOCHEMICAL_CONSULT",
  "ORDER_METABOLIC_PANEL",
  "ORDER_LIPID_PROFILE",
  "ORDER_LIVER_FUNCTION_TEST",
  "ORDER_RENAL_FUNCTION_TEST",
  "ORDER_ELECTROLYTE_PANEL",
  "ORDER_TOXICOLOGY_SCREEN",
  "ORDER_GENETIC_TEST",

  // ── Pharmacy & Medication
  "CREATE_PRESCRIPTION",
  "ENQUEUE_PHARMACY",
  "MARK_PRESCRIPTION_CLEARED",
  "ALERT_PHARMACIST_DISPENSE",
  "DISPENSE_MEDICATION",
  "ADMINISTER_MEDICATION",
  "CHECK_DRUG_INVENTORY",
  "REORDER_DRUG",
  "TRACK_BATCH_EXPIRY",
  "VERIFY_BARCODE",
  "RECONCILE_MEDICATION",

  // ── Specialist Referrals & MDT
  "CREATE_SPECIALIST_REFERRAL",
  "ACCEPT_SPECIALIST_REFERRAL",
  "SCHEDULE_SPECIALIST_APPOINTMENT",
  "COMPLETE_SPECIALIST_CONSULT",
  "SCHEDULE_MDT_MEETING",
  "INVITE_MDT_MEMBERS",
  "GENERATE_MDT_SUMMARY",
  "REQUEST_SECOND_OPINION",
  "UPLOAD_SECOND_OPINION_REPORT",

  // ── Billing & Payments
  "AUTO_CALCULATE_PRICE",
  "CREATE_INVOICE",
  "GENERATE_FISCAL_RECEIPT",
  "POST_GENERAL_LEDGER",
  "PROCESS_PAYMENT",
  "ISSUE_REFUND",
  "SEND_PAYMENT_LINK",
  "VERIFY_INSURANCE_ELIGIBILITY",
  "SUBMIT_INSURANCE_CLAIM",
  "CHECK_PRIOR_AUTHORIZATION",
  "UPDATE_PATIENT_BALANCE",
  "CANCEL_SUBSCRIPTION",

  // ── Notifications & Communication
  "NOTIFY_PATIENT_PAYMENT_DUE",
  "SEND_SMS_NOTIFICATION",
  "SEND_EMAIL_NOTIFICATION",
  "SEND_PUSH_NOTIFICATION",
  "SEND_WHATSAPP_MESSAGE",
  "NOTIFY_CARE_TEAM",
  "ALERT_ATTENDING_PHYSICIAN",
  "ALERT_ATTENDING_NURSE",
  "ESCALATE_TO_SUPERVISOR",
  "PAGE_ON_CALL_STAFF",
  "SEND_REMINDER",

  // ── Documentation & Compliance
  "CREATE_AUDIT_LOG",
  "CREATE_CLINICAL_NOTE",
  "GENERATE_SOAP_NOTE",
  "UPDATE_CARE_PLAN",
  "RECORD_CONSENT",
  "REVOKE_CONSENT",
  "FLAG_FOR_REVIEW",
  "ESCALATE_TO_COMPLIANCE",
  "GENERATE_COMPLIANCE_REPORT",
  "LOCK_RECORD",

  // ── Operational & Case Management
  "ASSIGN_CARE_COORDINATOR",
  "CREATE_TASK",
  "COMPLETE_TASK",
  "ESCALATE_TASK",
  "UPDATE_DASHBOARD",
  "SEND_DAILY_REPORT",
  "SYNC_WITH_EHR",
  "EXPORT_DATA",
  "CREATE_CASE",
  "CLOSE_CASE",
  "ASSIGN_PROVIDER",
  "CHANGE_PROVIDER",
];

function TriggerBadge({ event }: { event: string }) {
  const t = TRIGGER_OPTIONS.find(o => o.value === event);
  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${t?.color ?? "text-slate-400"}`}>
      {t?.icon} {t?.label ?? event}
    </span>
  );
}

export default function AdminWorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editWf, setEditWf] = useState<Workflow | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    triggerEvent: "PRESCRIPTION_SIGNED",
    steps: [{ step: 1, action: "AUTO_CALCULATE_PRICE" }] as WorkflowStep[],
  });

  const fetchWorkflows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/workflows");
      const data = await res.json();
      if (data.success) setWorkflows(data.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchWorkflows(); }, [fetchWorkflows]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/v1/admin/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editWf
            ? { action: "update", workflowId: editWf.id, ...form }
            : { action: "create", ...form }
        ),
      });
      setShowModal(false);
      setEditWf(null);
      setForm({ name: "", description: "", triggerEvent: "PRESCRIPTION_SIGNED", steps: [{ step: 1, action: "AUTO_CALCULATE_PRICE" }] });
      fetchWorkflows();
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const toggleActive = async (wf: Workflow) => {
    await fetch("/api/v1/admin/workflows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle", workflowId: wf.id, isActive: !wf.isActive }),
    });
    fetchWorkflows();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this workflow?")) return;
    await fetch("/api/v1/admin/workflows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", workflowId: id }),
    });
    fetchWorkflows();
  };

  const openEdit = (wf: Workflow) => {
    setEditWf(wf);
    setForm({ name: wf.name, description: wf.description ?? "", triggerEvent: wf.triggerEvent, steps: Array.isArray(wf.steps) ? wf.steps : [] });
    setShowModal(true);
  };

  const addStep = () => setForm(f => ({
    ...f,
    steps: [...f.steps, { step: f.steps.length + 1, action: "NOTIFY_PATIENT_PAYMENT_DUE" }],
  }));

  const removeStep = (idx: number) => setForm(f => ({
    ...f,
    steps: f.steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, step: i + 1 })),
  }));

  const updateStepAction = (idx: number, action: string) => setForm(f => ({
    ...f,
    steps: f.steps.map((s, i) => i === idx ? { ...s, action } : s),
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center">
              <Zap size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Clinic</h1>
              <p className="text-slate-400 text-xs">Define trigger-based automated pipelines across clinical and financial operations</p>
            </div>
          </div>
          <button
            onClick={() => { setEditWf(null); setForm({ name: "", description: "", triggerEvent: "PRESCRIPTION_SIGNED", steps: [{ step: 1, action: "AUTO_CALCULATE_PRICE" }] }); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 rounded-lg text-sm text-white font-medium transition"
          >
            <Plus size={15} /> New Workflow
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-slate-500">Loading workflows…</div>
        ) : (
          <div className="space-y-4">
            {workflows.map(wf => (
              <div key={wf.id} className={`bg-slate-900 border rounded-2xl overflow-hidden transition ${wf.isActive ? "border-slate-700" : "border-slate-800 opacity-60"}`}>
                <div className="p-5 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <TriggerBadge event={wf.triggerEvent} />
                      <ArrowRight size={12} className="text-slate-600" />
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${wf.isActive ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-slate-700 text-slate-500 border border-slate-600"}`}>
                        {wf.isActive ? "Active" : "Paused"}
                      </span>
                    </div>
                    <h3 className="text-white font-semibold text-base mb-1">{wf.name}</h3>
                    {wf.description && <p className="text-slate-400 text-xs mb-3">{wf.description}</p>}

                    {/* Pipeline Steps */}
                    <div className="flex flex-wrap items-center gap-2">
                      {(Array.isArray(wf.steps) ? wf.steps : []).map((step, idx) => (
                        <React.Fragment key={idx}>
                          <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5">
                            <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 text-xs flex items-center justify-center font-bold">{step.step}</span>
                            <span className="text-xs text-slate-300">{step.action.replace(/_/g, " ")}</span>
                          </div>
                          {idx < (Array.isArray(wf.steps) ? wf.steps : []).length - 1 && (
                            <ArrowRight size={12} className="text-slate-600 shrink-0" />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => toggleActive(wf)}
                      className={`p-2 rounded-lg border transition ${wf.isActive ? "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20" : "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200"}`}>
                      {wf.isActive ? <Pause size={15} /> : <Play size={15} />}
                    </button>
                    <button onClick={() => openEdit(wf)} className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 transition">
                      <Edit2 size={15} />
                    </button>
                    <button onClick={() => handleDelete(wf.id)} className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {workflows.length === 0 && (
              <div className="text-center py-24 text-slate-500">No workflows yet. Create one to automate clinical and financial operations.</div>
            )}
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-white font-semibold">{editWf ? "Edit Workflow" : "New Workflow"}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-slate-300"><X size={18} /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Workflow Name *</label>
                <input className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Automated Rx-to-Dispense Pipeline" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Description</label>
                <textarea className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 resize-none"
                  rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Trigger Event *</label>
                <select className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  value={form.triggerEvent} onChange={e => setForm(f => ({ ...f, triggerEvent: e.target.value }))}>
                  {TRIGGER_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs text-slate-400">Pipeline Steps</label>
                  <button onClick={addStep} className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition">
                    <Plus size={12} /> Add Step
                  </button>
                </div>
                <div className="space-y-2">
                  {form.steps.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-xl p-3">
                      <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 text-xs flex items-center justify-center font-bold shrink-0">
                        {step.step}
                      </div>
                      <select className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                        value={step.action} onChange={e => updateStepAction(idx, e.target.value)}>
                        {STEP_ACTIONS.map(a => <option key={a} value={a}>{a.replace(/_/g, " ")}</option>)}
                      </select>
                      {form.steps.length > 1 && (
                        <button onClick={() => removeStep(idx)} className="text-slate-500 hover:text-red-400 transition">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-800 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.name}
                className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 rounded-lg text-sm text-white font-medium transition">
                <Save size={14} /> {saving ? "Saving…" : editWf ? "Update" : "Create Workflow"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
