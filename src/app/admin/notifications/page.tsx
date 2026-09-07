"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Bell, Shield, Users, Settings, CheckCircle, XCircle, Smartphone,
  Filter, RefreshCw, Send, ChevronDown, ChevronRight, ChevronUp, Eye, EyeOff,
  Zap, CreditCard, Calendar, ShoppingCart, AlertCircle, UserCheck, Lock,
  MessageSquarePlus, CheckSquare, Trash2, Pause, Play, Activity, Clock,
  Stethoscope, Syringe, User
} from "lucide-react";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  priority: "critical" | "high" | "normal" | "low";
  isRead: boolean;
  actionUrl?: string;
  actionText?: string;
  targetRole?: string;
  recipientUserId?: string;
  senderUserId?: string;
  senderName?: string;
  senderRole?: string;
  createdAt: string;
}

interface Category {
  id: string;
  label: string;
  description: string;
}

interface PrivMatrix {
  [role: string]: {
    [category: string]: {
      isEnabled: boolean;
      channels: { inApp: boolean; telegram: boolean };
    };
  };
}

// ─────────────────────────────────────────────────────────────
// WORKFLOW BROADCAST TEMPLATES
// ─────────────────────────────────────────────────────────────
const BROADCAST_TEMPLATES = [
  { id: "sys_maint", title: "⚙️ System Maintenance", body: "EHR system will undergo scheduled maintenance at 02:00 AM. Expect 15 mins of downtime.", priority: "high", role: "all" },
  { id: "lab_delay", title: "🧪 Lab Processing Delay", body: "Chemistry analyzer 2 is offline. Expect 45-60 min delays for routine BMP/CMP panels.", priority: "high", role: "physician" },
  { id: "surge_cap", title: "🚨 ED Surge Capacity", body: "Emergency Department is at Level 3 Surge capacity. Expedite discharges where safe.", priority: "critical", role: "nurse" },
  { id: "billing_sync", title: "💳 Payment Gateway Sync", body: "Telebirr payment gateway sync completed successfully. Pending transactions resolved.", priority: "normal", role: "billing" },
  { id: "patient_alert", title: "🏥 Clinic Weather Advisory", body: "Due to severe weather, telemedicine is recommended today. Reply to reschedule to virtual.", priority: "normal", role: "patient" },
];

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  appointments: <Calendar className="w-4 h-4 text-teal-500" />,
  orders: <ShoppingCart className="w-4 h-4 text-indigo-500" />,
  billing: <CreditCard className="w-4 h-4 text-amber-500" />,
  clinical_alerts: <AlertCircle className="w-4 h-4 text-red-500" />,
  auth_shifts: <UserCheck className="w-4 h-4 text-purple-500" />,
  system: <Settings className="w-4 h-4 text-slate-500" />,
  workflow: <Activity className="w-4 h-4 text-cyan-500" />,
};

const PRIORITY_BADGES: Record<string, string> = {
  critical: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400 border border-red-200 dark:border-red-800/50",
  high: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50",
  normal: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50",
  low: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700",
};

const READABLE_ROLE: Record<string, string> = {
  physician: "Physician", nurse: "Nurse", pharmacist: "Pharmacist",
  lab_technician: "Lab Technician", physiotherapist: "Physiotherapist",
  dietitian: "Dietitian", patient: "Patient", billing: "Billing Cashier",
  triage_staff: "Triage Staff", system_admin: "System Admin",
};

const ROLE_ICONS: Record<string, React.ReactNode> = {
  system_admin: <Shield className="w-4 h-4 text-white" />,
  physician: <Stethoscope className="w-4 h-4 text-white" />,
  nurse: <Syringe className="w-4 h-4 text-white" />,
  patient: <User className="w-4 h-4 text-white" />,
};

function timeSince(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AdminNotificationsPage() {
  const [activeUserRole, setActiveUserRole] = useState<"system_admin" | "physician" | "nurse" | "patient">("system_admin");

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [matrix, setMatrix] = useState<PrivMatrix>({});

  const [isLoadingNotifs, setIsLoadingNotifs] = useState(true);
  const [isLoadingPrivs, setIsLoadingPrivs] = useState(true);
  const [activeTab, setActiveTab] = useState<"feed" | "privileges" | "telegram">("feed");
  const [expandedRoles, setExpandedRoles] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const [filterRole, setFilterRole] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedNotifs, setSelectedNotifs] = useState<Set<string>>(new Set());

  const [testTitle, setTestTitle] = useState("");
  const [testMsg, setTestMsg] = useState("");
  const [testRole, setTestRole] = useState("all");
  const [testPriority, setTestPriority] = useState("normal");
  const [isSendingTest, setIsSendingTest] = useState(false);

  // ─────────────────────────────────────────────────────────────
  // DATA FETCHING & POLLING
  // ─────────────────────────────────────────────────────────────
  const fetchNotifications = useCallback(async (silent = false) => {
    if (!silent) setIsLoadingNotifs(true);
    try {
      const params = new URLSearchParams({ role: activeUserRole, limit: "100" });
      if (filterRole !== "all") params.set("filterRole", filterRole);
      if (filterPriority !== "all") params.set("priority", filterPriority);

      const res = await fetch(`/api/v1/notifications?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();

      if (data.success) {
        setNotifications(data.data?.notifications || []);
      } else {
        // Fallback mock data with strict Notification[] type to fix TS Error 2345
        const mockData: Notification[] = [
          { id: "1", type: "clinical_alerts", title: "🚨 Critical Lab Result", body: "Patient John Doe (MRN: 1092) Potassium level is 6.5 mmol/L.", priority: "critical", isRead: false, targetRole: "physician", createdAt: new Date(Date.now() - 120000).toISOString(), actionUrl: "/patients/1092/labs", actionText: "Review Labs" },
          { id: "2", type: "workflow", title: "Patient Arrived", body: "Sarah Smith has checked in for her 10:00 AM Cardiology consult.", priority: "normal", isRead: true, targetRole: "physician", createdAt: new Date(Date.now() - 3600000).toISOString() },
          { id: "3", type: "system", title: "System Maintenance", body: "EHR will go offline at 2:00 AM EST.", priority: "low", isRead: false, targetRole: "all", createdAt: new Date(Date.now() - 86400000).toISOString() },
          { id: "4", type: "appointments", title: "Appointment Reminder", body: "Your telehealth visit with Dr. Adams is tomorrow at 9:00 AM.", priority: "high", isRead: false, targetRole: "patient", createdAt: new Date().toISOString(), actionUrl: "/telehealth/room/xyz", actionText: "Join Room" }
        ];

        setNotifications(mockData.filter(n => n.targetRole === activeUserRole || n.targetRole === 'all' || activeUserRole === 'system_admin'));
      }
    } catch { /* fallback handled */ } finally {
      if (!silent) setIsLoadingNotifs(false);
    }
  }, [filterRole, filterPriority, activeUserRole]);

  const fetchPrivileges = useCallback(async () => {
    setIsLoadingPrivs(true);
    try {
      const res = await fetch("/api/v1/notifications/privileges", { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setRoles(data.data.roles);
        setCategories(data.data.categories);
        setMatrix(data.data.matrix);
        const expanded: Record<string, boolean> = {};
        data.data.roles.forEach((r: string) => { expanded[r] = false; });
        setExpandedRoles(expanded);
      } else {
        setRoles(["system_admin", "physician", "nurse", "patient", "billing"]);
        setCategories([{ id: "clinical_alerts", label: "Clinical Alerts", description: "Critical lab and vitals." }, { id: "system", label: "System Alerts", description: "Maintenance and downtime." }, { id: "appointments", label: "Appointments", description: "Scheduling and telehealth links." }]);
      }
    } catch { /* ignore */ } finally {
      setIsLoadingPrivs(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    if (activeUserRole === "system_admin") fetchPrivileges();
    if (activeUserRole === "patient" && activeTab !== "feed") setActiveTab("feed");
  }, [fetchNotifications, fetchPrivileges, activeUserRole]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh && activeTab === "feed") {
      interval = setInterval(() => fetchNotifications(true), 15000);
    }
    return () => clearInterval(interval);
  }, [autoRefresh, activeTab, fetchNotifications]);

  // ─────────────────────────────────────────────────────────────
  // INTERACTIVE ACTIONS
  // ─────────────────────────────────────────────────────────────

  const markAsRead = async (ids: string[]) => {
    setNotifications(prev => prev.map(n => ids.includes(n.id) ? { ...n, isRead: true } : n));
    setSelectedNotifs(new Set());
    try {
      await fetch('/api/v1/notifications/mark-read', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      });
    } catch (e) { console.error("Failed to mark as read"); }
  };

  const deleteNotifications = async (ids: string[]) => {
    setNotifications(prev => prev.filter(n => !ids.includes(n.id)));
    setSelectedNotifs(new Set());
    try {
      await fetch('/api/v1/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      });
    } catch (e) { console.error("Failed to delete"); }
  };

  const togglePrivilege = async (role: string, category: string, field: "isEnabled" | "inApp" | "telegram") => {
    const key = `${role}-${category}-${field}`;
    setSaving(key);
    const current = matrix[role]?.[category] || { isEnabled: false, channels: { inApp: false, telegram: false } };

    let newIsEnabled = current.isEnabled;
    let newChannels = { ...current.channels };

    if (field === "isEnabled") newIsEnabled = !current.isEnabled;
    else if (field === "inApp") newChannels.inApp = !current.channels.inApp;
    else if (field === "telegram") newChannels.telegram = !current.channels.telegram;

    setMatrix((prev) => ({
      ...prev,
      [role]: { ...prev[role], [category]: { isEnabled: newIsEnabled, channels: newChannels } },
    }));

    try {
      await fetch("/api/v1/notifications/privileges", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, category, isEnabled: newIsEnabled, channels: newChannels }),
      });
    } catch { /* ignore */ } finally {
      setSaving(null);
    }
  };

  const toggleAllRolePrivileges = async (role: string, targetState: boolean) => {
    setSaving(`master-${role}`);
    try {
      const updatedRoleMatrix: any = {};
      categories.forEach(c => {
        updatedRoleMatrix[c.id] = { isEnabled: targetState, channels: { inApp: targetState, telegram: targetState } };
      });
      setMatrix(prev => ({ ...prev, [role]: updatedRoleMatrix }));

      await fetch("/api/v1/notifications/privileges/bulk", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, isEnabled: targetState })
      });
    } finally {
      setSaving(null);
    }
  };

  const sendBroadcastNotification = async () => {
    if (!testMsg.trim() || !testTitle.trim()) return;
    setIsSendingTest(true);

    const newNotif: Notification = {
      id: Date.now().toString(),
      type: "workflow_broadcast",
      title: testTitle,
      body: testMsg,
      priority: testPriority as any,
      isRead: false,
      targetRole: testRole,
      createdAt: new Date().toISOString()
    };

    if (testRole === "all" || testRole === activeUserRole || activeUserRole === "system_admin") {
      setNotifications(prev => [newNotif, ...prev]);
    }

    try {
      await fetch("/api/v1/notifications/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "workflow_broadcast",
          title: testTitle,
          body: testMsg,
          priority: testPriority,
          targetRole: testRole === "all" ? undefined : testRole,
        }),
      });
      setTestMsg("");
      setTestTitle("");
    } catch { /* ignore */ } finally {
      setIsSendingTest(false);
    }
  };

  const applyTemplate = (template: typeof BROADCAST_TEMPLATES[0]) => {
    setTestTitle(template.title);
    setTestMsg(template.body);
    setTestPriority(template.priority);
    setTestRole(template.role);
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedNotifs);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedNotifs(newSet);
  };

  const selectAll = () => {
    if (selectedNotifs.size === filteredNotifications.length) setSelectedNotifs(new Set());
    else setSelectedNotifs(new Set(filteredNotifications.map(n => n.id)));
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => filterType === "all" || n.type === filterType);
  }, [notifications, filterType]);

  const uniqueTypes = Array.from(new Set(notifications.map((n) => n.type))).sort();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-16">

      {/* ═══ CONTEXT SIMULATOR HEADER ═══ */}
      <div className="bg-slate-900 px-4 py-2 flex items-center justify-between shadow-md z-50 relative border-b border-slate-800">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <Zap className="w-3.5 h-3.5 text-amber-400" /> Environment Role Simulator
        </div>
        <div className="flex items-center gap-2">
          {(["system_admin", "physician", "nurse", "patient"] as const).map(role => (
            <button
              key={role}
              onClick={() => { setActiveUserRole(role); setSelectedNotifs(new Set()); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${activeUserRole === role
                  ? "bg-teal-500 text-slate-900 shadow-[0_0_10px_rgba(20,184,166,0.3)]"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
            >
              {ROLE_ICONS[role]} {READABLE_ROLE[role]}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* ═══ DYNAMIC HEADER ═══ */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
                <Bell className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {activeUserRole === "patient" ? "My Health Alerts" : "Notification & Workflow Center"}
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                  {activeUserRole === "patient"
                    ? "Your personal clinic messages and appointment updates."
                    : "System-wide event feed · Role privilege matrix · Pipeline broadcasting"}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition-all ${autoRefresh
                  ? "bg-teal-50 dark:bg-teal-500/10 border-teal-200 dark:border-teal-500/30 text-teal-700 dark:text-teal-400"
                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500"
                }`}
            >
              {autoRefresh ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {autoRefresh ? "Live Sync On" : "Live Sync Off"}
            </button>
            <button
              onClick={() => { fetchNotifications(); if (activeUserRole === "system_admin") fetchPrivileges(); }}
              className="flex items-center justify-center w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              title="Manual Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingNotifs ? "animate-spin text-teal-500" : ""}`} />
            </button>
          </div>
        </div>

        {/* ═══ TAB SWITCHER ═══ */}
        {activeUserRole === "system_admin" && (
          <div className="flex gap-1 p-1.5 bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 mb-6 w-fit shadow-sm backdrop-blur">
            {([
              { id: "feed", label: "Workflow Feed", icon: <Zap className="w-4 h-4" /> },
              { id: "privileges", label: "Privilege Matrix", icon: <Shield className="w-4 h-4" /> },
              { id: "telegram", label: "Bot Channels", icon: <Smartphone className="w-4 h-4" /> },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === tab.id
                    ? "bg-slate-900 text-white dark:bg-teal-500 dark:text-slate-950 shadow-md"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* ═══ TAB: LIVE FEED & BROADCAST ═══ */}
        {activeTab === "feed" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className={`lg:col-span-${activeUserRole === "patient" ? "12" : "8"} space-y-4`}>
              {/* Feed Filters & Bulk Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-400 mr-1" />

                  {activeUserRole === "system_admin" && (
                    <select
                      value={filterRole}
                      onChange={(e) => setFilterRole(e.target.value)}
                      className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-teal-500"
                    >
                      <option value="all">All Roles</option>
                      {roles.map((r) => <option key={r} value={r}>{READABLE_ROLE[r] || r}</option>)}
                    </select>
                  )}

                  <select
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                    className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-teal-500"
                  >
                    <option value="all">All Priorities</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="normal">Normal</option>
                    <option value="low">Low</option>
                  </select>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-teal-500"
                  >
                    <option value="all">All Event Types</option>
                    {uniqueTypes.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  {selectedNotifs.size > 0 && (
                    <>
                      <button
                        onClick={() => markAsRead(Array.from(selectedNotifs))}
                        className="text-xs font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-500/10 px-3 py-2 rounded-xl border border-teal-200 dark:border-teal-500/30 flex items-center gap-1.5 transition hover:bg-teal-100 dark:hover:bg-teal-500/20"
                      >
                        <CheckSquare className="w-3.5 h-3.5" /> Read ({selectedNotifs.size})
                      </button>
                      <button
                        onClick={() => deleteNotifications(Array.from(selectedNotifs))}
                        className="text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-xl border border-red-200 dark:border-red-500/30 flex items-center gap-1.5 transition hover:bg-red-100 dark:hover:bg-red-500/20"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Drop
                      </button>
                    </>
                  )}
                  <button onClick={selectAll} className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-xl hover:text-slate-700 dark:hover:text-white transition cursor-pointer">
                    {selectedNotifs.size === filteredNotifications.length ? "Deselect All" : "Select All"}
                  </button>
                </div>
              </div>

              {/* Feed List */}
              {isLoadingNotifs && notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-slate-400 bg-white dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-800 border-dashed">
                  <RefreshCw className="w-8 h-8 animate-spin mb-3 text-teal-500" />
                  <p className="font-semibold">Syncing workflow events...</p>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-slate-400 bg-white dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-800 border-dashed">
                  <CheckCircle className="w-10 h-10 mb-3 text-slate-300 dark:text-slate-600" />
                  <p className="font-bold text-slate-500 dark:text-slate-400">Your queue is clear</p>
                  <p className="text-xs mt-1">No events match your current filters.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredNotifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`flex gap-4 p-4 rounded-2xl border transition-all ${selectedNotifs.has(notif.id)
                          ? "border-teal-400 bg-teal-50/50 dark:border-teal-500/50 dark:bg-teal-900/20"
                          : notif.priority === "critical"
                            ? "border-red-200 bg-red-50/50 dark:border-red-900/40 dark:bg-red-950/20"
                            : notif.priority === "high"
                              ? "border-amber-200 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20"
                              : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80 hover:border-slate-300 dark:hover:border-slate-700"
                        } shadow-sm cursor-pointer`}
                      onClick={() => toggleSelection(notif.id)}
                    >
                      <div className="mt-1 shrink-0 flex flex-col items-center gap-2">
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedNotifs.has(notif.id) ? "bg-teal-500 border-teal-500" : "border-slate-300 dark:border-slate-600"}`}>
                          {selectedNotifs.has(notif.id) && <CheckSquare className="w-3 h-3 text-white" />}
                        </div>
                        {CATEGORY_ICONS[notif.type?.split("_")[0]] || <Activity className="w-4 h-4 text-slate-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 justify-between">
                          <p className={`text-sm font-bold ${notif.isRead ? "text-slate-500 dark:text-slate-400" : "text-slate-900 dark:text-white"}`}>
                            {notif.title}
                          </p>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-[10px] px-2 py-0.5 rounded-md font-extrabold uppercase tracking-wide ${PRIORITY_BADGES[notif.priority] || PRIORITY_BADGES.normal}`}>
                              {notif.priority}
                            </span>
                            {!notif.isRead && <span className="w-2.5 h-2.5 rounded-full bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.8)]" />}
                          </div>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">{notif.body}</p>

                        <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                          <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {timeSince(notif.createdAt)}
                          </span>
                          {notif.targetRole && (
                            <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-md text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                              <Users className="w-3 h-3 text-slate-400" /> {READABLE_ROLE[notif.targetRole] || notif.targetRole}
                            </span>
                          )}
                          {notif.senderName && (
                            <span className="text-[10px] font-bold bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 px-2 py-0.5 rounded-md text-teal-700 dark:text-teal-300 flex items-center gap-1.5">
                              <User className="w-3 h-3 text-teal-500" /> Triggered By: {notif.senderName}
                            </span>
                          )}
                          <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-md text-slate-500 dark:text-slate-400">
                            {notif.type}
                          </span>

                          {notif.actionUrl && (
                            <a
                              href={notif.actionUrl}
                              onClick={(e) => { e.stopPropagation(); markAsRead([notif.id]); }}
                              className="ml-auto text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 flex items-center gap-1 bg-teal-50 dark:bg-teal-500/10 px-3 py-1 rounded-lg transition"
                            >
                              {notif.actionText || "Resolve Issue"} <ChevronRight className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT 4 COLS: Broadcast Studio (Hidden for patients) */}
            {activeUserRole !== "patient" && (
              <div className="lg:col-span-4 space-y-4">
                <div className="p-5 bg-white dark:bg-slate-900/80 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm sticky top-24">
                  <div className="flex items-center gap-2 mb-4">
                    <MessageSquarePlus className="w-5 h-5 text-teal-500" />
                    <h2 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">Workflow Broadcast Studio</h2>
                  </div>

                  <div className="space-y-4">
                    {/* Quick Templates */}
                    <div>
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 block">Quick Templates</label>
                      <div className="flex flex-wrap gap-2">
                        {BROADCAST_TEMPLATES.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => applyTemplate(t)}
                            className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-2.5 py-1.5 rounded-lg hover:border-teal-400 dark:hover:border-teal-500 transition-colors"
                          >
                            {t.title.split(" ")[0]} {t.title.split(" ").slice(1).join(" ")}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="h-px w-full bg-slate-100 dark:bg-slate-800" />

                    {/* Broadcast Form */}
                    <div className="space-y-3">
                      {activeUserRole === "system_admin" && (
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1">Target Audience</label>
                          <select
                            value={testRole}
                            onChange={(e) => setTestRole(e.target.value)}
                            className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
                          >
                            <option value="all">Everyone (All Staff & Patients)</option>
                            {roles.map((r) => <option key={r} value={r}>{READABLE_ROLE[r] || r}</option>)}
                          </select>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1">Alert Title</label>
                          <input
                            value={testTitle}
                            onChange={(e) => setTestTitle(e.target.value)}
                            placeholder="e.g. Code Blue, Lab Delay..."
                            className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-teal-500"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1">Priority</label>
                          <select
                            value={testPriority}
                            onChange={(e) => setTestPriority(e.target.value)}
                            className={`w-full text-xs font-extrabold uppercase tracking-wider px-3 py-2.5 rounded-xl border focus:outline-none ${PRIORITY_BADGES[testPriority]}`}
                          >
                            <option value="critical">Critical</option>
                            <option value="high">High</option>
                            <option value="normal">Normal</option>
                            <option value="low">Low</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1">Message Body</label>
                        <textarea
                          value={testMsg}
                          onChange={(e) => setTestMsg(e.target.value)}
                          placeholder="Detailed notification instructions..."
                          rows={3}
                          className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-teal-500 resize-none"
                        />
                      </div>

                      <button
                        onClick={sendBroadcastNotification}
                        disabled={isSendingTest || !testMsg.trim() || !testTitle.trim()}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-900 dark:bg-teal-500 text-white dark:text-slate-950 text-xs font-extrabold hover:bg-slate-800 dark:hover:bg-teal-400 transition disabled:opacity-50 shadow-md active:scale-95"
                      >
                        <Send className="w-4 h-4" />
                        {isSendingTest ? "Dispatching..." : "Dispatch Broadcast"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ TAB: ROLE PRIVILEGES (Admin Only) ═══ */}
        {activeTab === "privileges" && activeUserRole === "system_admin" && (
          <div className="space-y-6 animate-fade-in">
            <div className="p-5 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800/50 rounded-3xl text-sm text-amber-800 dark:text-amber-300 flex items-start gap-4 shadow-sm">
              <div className="bg-amber-100 dark:bg-amber-900/50 p-2 rounded-full shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <strong className="block mb-1 font-bold">Dynamic Privilege Management</strong>
                <p className="text-xs opacity-90 leading-relaxed">Changes to this matrix take effect instantly across the infrastructure. Disabling a category entirely drops messages at the gateway, ensuring users are never spammed. Use the "Master Toggle" for rapid onboarding of new roles.</p>
              </div>
            </div>

            {isLoadingPrivs ? (
              <div className="flex flex-col items-center justify-center py-24 text-slate-400 bg-white dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-800 border-dashed">
                <RefreshCw className="w-8 h-8 animate-spin mb-3 text-teal-500" />
                <p className="font-semibold">Loading security matrix...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {roles.map((role) => {
                  const isRoleExpanded = expandedRoles[role];
                  const enabledCount = categories.filter((c) => matrix[role]?.[c.id]?.isEnabled).length;
                  const isAllEnabled = enabledCount === categories.length;

                  return (
                    <div key={role} className="bg-white dark:bg-slate-900/80 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                      {/* Role Header */}
                      <div className="flex items-center justify-between px-5 py-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                        <button
                          className="flex items-center gap-3 text-left flex-1"
                          onClick={() => setExpandedRoles((prev) => ({ ...prev, [role]: !prev[role] }))}
                        >
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center shadow-inner">
                            <Users className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wide text-sm">{READABLE_ROLE[role] || role}</p>
                            <p className="text-xs font-semibold text-teal-600 dark:text-teal-400">
                              {enabledCount}/{categories.length} Categories Active
                            </p>
                          </div>
                          <div className="ml-auto mr-4">
                            {isRoleExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                          </div>
                        </button>

                        {/* Master Quick Toggle */}
                        <div className="shrink-0 pl-4 border-l border-slate-200 dark:border-slate-800">
                          <button
                            disabled={saving?.startsWith(`master-${role}`)}
                            onClick={(e) => { e.stopPropagation(); toggleAllRolePrivileges(role, !isAllEnabled); }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${isAllEnabled
                                ? "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300"
                                : "bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-500/30 hover:bg-teal-200"
                              }`}
                          >
                            {isAllEnabled ? "Disable All" : "Enable All"}
                          </button>
                        </div>
                      </div>

                      {/* Expanded Matrix */}
                      {isRoleExpanded && (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800/50 bg-white dark:bg-slate-900/50">
                          {categories.map((cat) => {
                            const priv = matrix[role]?.[cat.id] || { isEnabled: false, channels: { inApp: false, telegram: false } };
                            const k = `${role}-${cat.id}`;
                            return (
                              <div key={cat.id} className={`px-5 py-4 flex items-center gap-4 transition-opacity ${!priv.isEnabled ? "opacity-40 grayscale-[50%]" : ""}`}>
                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                  {CATEGORY_ICONS[cat.id] || <Settings className="w-4 h-4 text-slate-500" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide">{cat.label}</p>
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{cat.description}</p>
                                </div>

                                <div className="flex items-center gap-4 shrink-0">
                                  {/* Channel Toggles */}
                                  <div className="flex flex-col gap-1.5 border-r border-slate-200 dark:border-slate-700 pr-4">
                                    <label className="flex items-center justify-between gap-3 text-[10px] font-bold text-slate-500 cursor-pointer group">
                                      <span className="uppercase">In-App</span>
                                      <button
                                        disabled={saving === `${k}-inApp` || !priv.isEnabled}
                                        onClick={() => togglePrivilege(role, cat.id, "inApp")}
                                        className={`w-7 h-3.5 rounded-full transition-colors relative disabled:cursor-not-allowed ${priv.channels.inApp && priv.isEnabled ? "bg-teal-500" : "bg-slate-300 dark:bg-slate-700"}`}
                                      >
                                        <span className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white shadow transition-transform ${priv.channels.inApp && priv.isEnabled ? "translate-x-4" : "translate-x-0.5"}`} />
                                      </button>
                                    </label>
                                    <label className="flex items-center justify-between gap-3 text-[10px] font-bold text-blue-500 cursor-pointer group">
                                      <span className="uppercase flex items-center gap-1"><Smartphone className="w-3 h-3" /> Bot</span>
                                      <button
                                        disabled={saving === `${k}-telegram` || !priv.isEnabled}
                                        onClick={() => togglePrivilege(role, cat.id, "telegram")}
                                        className={`w-7 h-3.5 rounded-full transition-colors relative disabled:cursor-not-allowed ${priv.channels.telegram && priv.isEnabled ? "bg-blue-500" : "bg-slate-300 dark:bg-slate-700"}`}
                                      >
                                        <span className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white shadow transition-transform ${priv.channels.telegram && priv.isEnabled ? "translate-x-4" : "translate-x-0.5"}`} />
                                      </button>
                                    </label>
                                  </div>

                                  {/* Master Enable/Disable */}
                                  <button
                                    disabled={saving === `${k}-isEnabled`}
                                    onClick={() => togglePrivilege(role, cat.id, "isEnabled")}
                                    className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${priv.isEnabled
                                        ? "bg-emerald-100 text-emerald-600 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30"
                                        : "bg-slate-100 text-slate-400 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-500 border border-slate-200 dark:border-slate-700"
                                      }`}
                                    title={priv.isEnabled ? "Disable Category" : "Enable Category"}
                                  >
                                    {priv.isEnabled ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══ TAB: TELEGRAM BOT (Admin Only) ═══ */}
        {activeTab === "telegram" && activeUserRole === "system_admin" && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-900/80 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <Smartphone className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Telegram Workflow Bot</h2>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Extending the pipeline directly to provider and patient devices securely.</p>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="p-6 rounded-3xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40">
                  <h3 className="text-sm font-extrabold text-blue-800 dark:text-blue-400 uppercase tracking-wider mb-2">Webhook Configuration</h3>
                  <p className="text-xs text-blue-600 dark:text-blue-300 mb-4 leading-relaxed">
                    Ensure the environment variable <code className="bg-blue-100 dark:bg-blue-900/50 px-1.5 py-0.5 rounded font-mono font-bold">TELEGRAM_BOT_TOKEN</code> is injected at runtime to mount the secure webhook.
                  </p>
                  <div className="space-y-2 text-xs font-mono text-blue-800 dark:text-blue-300 bg-white dark:bg-slate-950 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/50 shadow-inner">
                    <div className="flex items-center justify-between"><span className="opacity-60">Webhook URL:</span> <strong>/api/v1/telegram/webhook</strong></div>
                    <div className="flex items-center justify-between"><span className="opacity-60">OAuth Connect:</span> <strong>/api/v1/telegram/connect</strong></div>
                    <div className="flex items-center justify-between"><span className="opacity-60">Bot Handle:</span> <strong className="text-blue-500">@{process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "NiniMedClinicBot"}</strong></div>
                  </div>
                </div>

                <div className="p-6 rounded-3xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
                  <h3 className="text-sm font-extrabold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider mb-2">Connection Lifecycle</h3>
                  <ol className="text-xs font-medium text-emerald-700 dark:text-emerald-300 space-y-3 list-decimal list-inside">
                    <li>Clinician or patient authenticates into Web Portal.</li>
                    <li>Clicks <strong>"Connect Telegram"</strong> generating a time-limited OTP.</li>
                    <li>User scans the QR code or clicks the deeplink.</li>
                    <li>Bot executes <code className="bg-emerald-100 dark:bg-emerald-900/50 px-1 rounded">/start [OTP]</code> to bind the Chat ID.</li>
                    <li>System respects the <strong className="text-emerald-600 dark:text-emerald-400">Privilege Matrix</strong> before pushing alerts.</li>
                  </ol>
                </div>
              </div>

              <div className="mt-6 p-6 rounded-3xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800">
                <h3 className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" /> Interactive Bot Commands
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  {[
                    { cmd: "/start", desc: "Link Secure Account" },
                    { cmd: "/schedule", desc: "Today's Agenda" },
                    { cmd: "/queue", desc: "Live Triage Queue" },
                    { cmd: "/status", desc: "Toggle On-Call Status" },
                  ].map((c) => (
                    <div key={c.cmd} className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
                      <code className="block text-teal-600 dark:text-teal-400 font-black mb-1 text-sm">{c.cmd}</code>
                      <span className="text-slate-500 dark:text-slate-400 font-medium">{c.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}