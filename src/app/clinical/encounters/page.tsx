"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Activity, ClipboardList, FileText, FlaskConical, History, Loader2, Pill, Plus, Save, Search, Stethoscope } from "lucide-react";
import { useClinic } from "../../../context/ClinicContext";

type Tab = "history" | "examination" | "orders" | "prescriptions" | "follow-up";

interface Encounter {
  id: string;
  encounterType: string;
  status: string;
  chiefComplaint: string | null;
  clinicalNotes: string | null;
  startTime: string | null;
}

interface RecordItem {
  id: string;
  [key: string]: unknown;
}

export default function ClinicalEncountersPage() {
  const { patients, currentRole } = useClinic();
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("history");
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [orders, setOrders] = useState<RecordItem[]>([]);
  const [prescriptions, setPrescriptions] = useState<RecordItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    encounterType: "in_person",
    chiefComplaint: "",
    history: "",
    examination: "",
    assessment: "",
    plan: "",
    followUpPlan: "",
  });

  const selectedPatient = useMemo(
    () => patients.find((patient) => patient.id === selectedPatientId),
    [patients, selectedPatientId],
  );

  useEffect(() => {
    if (!selectedPatientId && patients[0]) setSelectedPatientId(patients[0].id);
  }, [patients, selectedPatientId]);

  useEffect(() => {
    if (!selectedPatientId) return;
    let cancelled = false;
    setIsLoading(true);
    Promise.all([
      fetch(`/api/v1/clinical/encounters?patientId=${encodeURIComponent(selectedPatientId)}`).then((response) => response.json()),
      fetch(`/api/v1/clinical/orders?patientId=${encodeURIComponent(selectedPatientId)}`).then((response) => response.json()),
      fetch(`/api/v1/prescriptions?patientId=${encodeURIComponent(selectedPatientId)}`).then((response) => response.json()),
    ])
      .then(([encounterData, orderData, prescriptionData]) => {
        if (cancelled) return;
        setEncounters(encounterData.data || []);
        setOrders(orderData.data || []);
        setPrescriptions(prescriptionData.data || []);
      })
      .catch(() => {
        if (!cancelled) setMessage("Unable to load this patient's clinical record.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [selectedPatientId]);

  const updateForm = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));

  const saveEncounter = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedPatientId) return;
    setIsSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/v1/clinical/encounters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: selectedPatientId, ...form }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save encounter.");
      setEncounters((current) => [result.data, ...current]);
      setForm({ encounterType: "in_person", chiefComplaint: "", history: "", examination: "", assessment: "", plan: "", followUpPlan: "" });
      setActiveTab("history");
      setMessage("Clinical encounter saved to the patient record.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save encounter.");
    } finally {
      setIsSaving(false);
    }
  };

  const tabs: Array<{ id: Tab; label: string; icon: typeof History }> = [
    { id: "history", label: "Patient history", icon: History },
    { id: "examination", label: "New examination", icon: Stethoscope },
    { id: "orders", label: `Orders (${orders.length})`, icon: FlaskConical },
    { id: "prescriptions", label: `Prescriptions (${prescriptions.length})`, icon: Pill },
    { id: "follow-up", label: "Follow-up plan", icon: ClipboardList },
  ];

  if (currentRole === "patient" || currentRole === "guest") {
    return <div className="rounded-2xl border border-rose-200 bg-white p-8 text-center text-sm text-rose-700">This clinical workspace is available to authorized care-team roles.</div>;
  }

  return (
    <div className="space-y-5">
      <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-teal-700 dark:text-teal-300"><Activity className="h-5 w-5" /><span className="text-xs font-bold uppercase tracking-[0.18em]">Care team resource</span></div>
            <h1 className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">Clinical encounter workspace</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Record examination findings, history, orders, prescriptions, and follow-up in one patient-centered workspace.</p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-slate-50 p-2 dark:bg-slate-950">
            <Search className="ml-2 h-4 w-4 text-slate-400" />
            <select value={selectedPatientId} onChange={(event) => setSelectedPatientId(event.target.value)} className="min-w-[220px] bg-transparent px-2 py-2 text-sm font-semibold text-slate-800 outline-none dark:text-white">
              <option value="">Select patient</option>
              {patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.firstName} {patient.lastName} · {patient.mrn}</option>)}
            </select>
          </div>
        </div>
        {selectedPatient && <div className="mt-4 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-teal-50 px-3 py-1.5 font-bold text-teal-700 dark:bg-teal-950/50 dark:text-teal-300">{selectedPatient.firstName} {selectedPatient.lastName}</span><span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{selectedPatient.mrn}</span><span className="rounded-full bg-slate-100 px-3 py-1.5 capitalize text-slate-600 dark:bg-slate-800 dark:text-slate-300">{selectedPatient.triagePriority || "routine"} priority</span></div>}
      </header>

      {message && <div className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800 dark:border-teal-900 dark:bg-teal-950/30 dark:text-teal-200">{message}</div>}

      <div className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
        {tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => setActiveTab(id)} className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold ${activeTab === id ? "bg-teal-700 text-white" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"}`}><Icon className="h-4 w-4" />{label}</button>)}
      </div>

      {isLoading ? <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading clinical record...</div> : activeTab === "history" ? (
        <section className="space-y-3">{encounters.length === 0 ? <EmptyState text="No examination or follow-up history has been recorded for this patient." action="New examination" onAction={() => setActiveTab("examination")} /> : encounters.map((encounter) => <article key={encounter.id} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><FileText className="h-4 w-4 text-teal-600" /><h2 className="font-bold text-slate-900 dark:text-white">{encounter.chiefComplaint || "Clinical encounter"}</h2></div><span className="text-xs text-slate-500">{encounter.startTime ? new Date(encounter.startTime).toLocaleString() : "Date unavailable"}</span></div><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">{encounter.clinicalNotes || "No notes recorded."}</p></article>)}</section>
      ) : activeTab === "examination" || activeTab === "follow-up" ? (
        <form onSubmit={saveEncounter} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Encounter type<select value={form.encounterType} onChange={(event) => updateForm("encounterType", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-950"><option value="in_person">In-person examination</option><option value="telehealth">Telehealth</option><option value="consultation">Consultation</option><option value="follow_up">Follow-up</option></select></label>
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Chief complaint / reason for visit<input required value={form.chiefComplaint} onChange={(event) => updateForm("chiefComplaint", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-950" placeholder="What brought the patient in?" /></label>
            {([["history", "History / symptoms"], ["examination", "Examination findings"], ["assessment", "Assessment / diagnosis"], ["plan", "Treatment plan / issues"], ["followUpPlan", "Follow-up plan"]] as const).map(([field, label]) => <label key={field} className="text-xs font-bold text-slate-600 dark:text-slate-300 md:col-span-2">{label}<textarea required={field === "assessment"} value={form[field]} onChange={(event) => updateForm(field, event.target.value)} className="mt-1 min-h-24 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-950" placeholder={`Document ${label.toLowerCase()}...`} /></label>)}
          </div>
          <div className="mt-4 flex justify-end"><button disabled={isSaving || !selectedPatientId} className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"><Save className="h-4 w-4" />{isSaving ? "Saving..." : "Save clinical encounter"}</button></div>
        </form>
      ) : activeTab === "orders" ? <RecordList items={orders} empty="No orders recorded for this patient." actionHref={`/clinical/orders?patientId=${selectedPatientId}`} actionLabel="Place an order" labelKey="orderTitle" /> : <RecordList items={prescriptions} empty="No prescriptions recorded for this patient." actionHref={`/prescriptions?patientId=${selectedPatientId}`} actionLabel="Create prescription" labelKey="medicationName" />}
    </div>
  );
}

function EmptyState({ text, action, onAction }: { text: string; action: string; onAction: () => void }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900"><p>{text}</p><button type="button" onClick={onAction} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-teal-700 px-3 py-2 text-xs font-bold text-white"><Plus className="h-4 w-4" />{action}</button></div>;
}

function RecordList({ items, empty, actionHref, actionLabel, labelKey }: { items: RecordItem[]; empty: string; actionHref: string; actionLabel: string; labelKey: string }) {
  return <section className="space-y-3">{items.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900"><p>{empty}</p><Link href={actionHref} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-teal-700 px-3 py-2 text-xs font-bold text-white"><Plus className="h-4 w-4" />{actionLabel}</Link></div> : items.map((item) => <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between gap-3"><h2 className="font-bold text-slate-900 dark:text-white">{String(item[labelKey] || item.clinicalSummary || "Clinical record")}</h2><span className="text-xs capitalize text-slate-500">{String(item.status || "recorded").replace(/_/g, " ")}</span></div><p className="mt-1 text-xs text-slate-500">{item.createdAt ? new Date(String(item.createdAt)).toLocaleString() : "Date unavailable"}</p></article>)}</section>;
}
