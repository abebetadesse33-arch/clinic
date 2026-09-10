"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Bell, BellRing, X, CheckCheck, Video, Calendar, AlertCircle, MessageSquare,
  Zap, ShoppingCart, FlaskConical, Pill, CreditCard, UserCheck, LogIn, LogOut,
  ExternalLink, Filter, Volume2, BellOff, Clock
} from "lucide-react";
import { useClinic } from "@/context/ClinicContext";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  priority: "low" | "normal" | "high" | "critical";
  isRead: boolean;
  actionUrl?: string;
  actionText?: string;
  requiresAction?: boolean;
  targetRole?: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

function timeSince(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function notifIcon(type: string, priority: string) {
  if (priority === "critical") return <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />;
  if (type.includes("reminder")) return <BellRing className="w-4 h-4 text-amber-500 shrink-0" />;
  if (type === "appointment_booked" || type === "treat_me_now") return <Calendar className="w-4 h-4 text-teal-500 shrink-0" />;
  if (type === "order_placed") return <ShoppingCart className="w-4 h-4 text-indigo-500 shrink-0" />;
  if (type === "payment_pending") return <CreditCard className="w-4 h-4 text-amber-500 shrink-0" />;
  if (type === "payment_received") return <CreditCard className="w-4 h-4 text-emerald-500 shrink-0" />;
  if (type === "lab_result_ready") return <FlaskConical className="w-4 h-4 text-blue-500 shrink-0" />;

  if (type === "clinician_signed_in") return <LogIn className="w-4 h-4 text-green-500 shrink-0" />;
  if (type === "clinician_signed_out") return <LogOut className="w-4 h-4 text-rose-400 shrink-0" />;
  if (type === "role_switch") return <UserCheck className="w-4 h-4 text-purple-500 shrink-0" />;
  if (type === "patient_registered") return <UserCheck className="w-4 h-4 text-cyan-500 shrink-0" />;
  if (type === "consult_request") return <Zap className="w-4 h-4 text-amber-500 shrink-0" />;
  if (type === "message_received") return <MessageSquare className="w-4 h-4 text-blue-500 shrink-0" />;
  if (type.includes("referral")) return <ExternalLink className="w-4 h-4 text-orange-500 shrink-0" />;
  if (type === "appointment_reminder") return <Clock className="w-4 h-4 text-teal-400 shrink-0 animate-pulse" />;
  return <Bell className="w-4 h-4 text-[#005C4B] shrink-0" />;
}

const PRIORITY_STYLES: Record<string, { border: string; bg: string; badge: string }> = {
  critical:            { border: "border-l-4 border-l-red-500",   bg: "bg-red-50/80 dark:bg-red-950/40",    badge: "bg-red-500 text-white" },
  high:                { border: "border-l-4 border-l-amber-400", bg: "bg-amber-50/60 dark:bg-amber-950/30", badge: "bg-amber-400 text-white" },
  normal:              { border: "border-l-4 border-l-emerald-400", bg: "bg-white dark:bg-slate-800",          badge: "bg-emerald-500 text-white" },
  low:                 { border: "border-l-4 border-l-slate-300", bg: "bg-slate-50/60 dark:bg-slate-800/50", badge: "bg-slate-400 text-white" },
  appointment_reminder:{ border: "border-l-4 border-l-teal-400",  bg: "bg-teal-50/60 dark:bg-teal-950/30",  badge: "bg-teal-500 text-white" },
};

function playChime(priority: string) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const freqs = priority === "critical" ? [880, 660, 440] : priority === "high" ? [660, 880] : [880, 1100];
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "sine";
      const start = ctx.currentTime + i * 0.12;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.18, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
      osc.start(start);
      osc.stop(start + 0.25);
    });
  } catch { /* no audio context */ }
}

type FilterTab = "all" | "unread" | "critical" | "action";

export default function NotificationBell() {
  const { currentUser, currentRole } = useClinic();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isMarkingRead, setIsMarkingRead] = useState(false);
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [browserAlerts, setBrowserAlerts] = useState(false);
  const [popupNotification, setPopupNotification] = useState<Notification | null>(null);
  const [popupQueue, setPopupQueue] = useState<Notification[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const notificationIdsRef = useRef<Set<string>>(new Set());
  const hasHydratedNotificationsRef = useRef(false);
  const mutedRef = useRef(false);
  const browserAlertsRef = useRef(false);
  const reconnectTimerRef = useRef<number | null>(null);
  const disposedRef = useRef(false);

  useEffect(() => {
    if (popupNotification || popupQueue.length === 0) return;
    const [next, ...remaining] = popupQueue;
    setPopupNotification(next);
    setPopupQueue(remaining);
  }, [popupNotification, popupQueue]);

  useEffect(() => {
    if (!popupNotification) return;
    const timeout = window.setTimeout(() => {
      setPopupNotification((current) =>
        current?.id === popupNotification.id ? null : current
      );
    }, popupNotification.priority === "critical" ? 12000 : 7000);
    return () => window.clearTimeout(timeout);
  }, [popupNotification]);

  const enqueuePopup = useCallback((notification: Notification) => {
    setPopupQueue((queue) => [...queue, notification]);
  }, []);

  useEffect(() => {
    const muted = window.localStorage.getItem("Nini_notification_sound") === "muted";
    const alerts = typeof Notification !== "undefined" && Notification.permission === "granted";
    setIsMuted(muted);
    setBrowserAlerts(alerts);
    mutedRef.current = muted;
    browserAlertsRef.current = alerts;
  }, []);

  const userId = (currentUser as any)?.id || "";
  const role = (currentUser as any)?.role || (currentRole as string) || "";

  const notifyDevice = useCallback((notif: Notification) => {
    if (!mutedRef.current) playChime(notif.priority);
    if (notif.priority === "critical" || notif.priority === "high") {
      navigator.vibrate?.(notif.priority === "critical" ? [120, 60, 120] : [80]);
    }

    if (browserAlertsRef.current && typeof Notification !== "undefined") {
      new Notification(notif.title, { body: notif.body, tag: notif.id });
      return;
    }

    if (typeof Notification !== "undefined" && Notification.permission === "granted" && "serviceWorker" in navigator) {
      navigator.serviceWorker.ready
        .then((registration) => {
          registration.active?.postMessage({
            type: "NINIMED_NOTIFICATION",
            notification: {
              id: notif.id,
              title: notif.title,
              body: notif.body,
              priority: notif.priority,
              url: notif.actionUrl || "/",
            },
          });
        })
        .catch(() => {
          // The in-app popup remains available when the service worker is unavailable.
        });
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (userId) params.set("userId", userId);
      if (role) params.set("role", role);
      params.set("limit", "50");
      const res = await fetch(`/api/v1/notifications?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        const nextNotifications = data.data?.notifications || [];
        const unseen = hasHydratedNotificationsRef.current
          ? nextNotifications.filter((item: Notification) => !notificationIdsRef.current.has(item.id))
          : [];
        notificationIdsRef.current = new Set(nextNotifications.map((item: Notification) => item.id));
        setNotifications(nextNotifications);
        setUnreadCount(data.data?.unreadCount || 0);
        const latestUnseen = unseen[0];
        if (latestUnseen) {
          unseen.forEach(enqueuePopup);
          unseen.forEach(notifyDevice);
        }
        hasHydratedNotificationsRef.current = true;
      }
    } catch { /* silent */ }
  }, [userId, role, notifyDevice, enqueuePopup]);

  // SSE real-time stream
  useEffect(() => {
    if (!userId && !role) return;
    disposedRef.current = false;

    const connect = () => {
      if (disposedRef.current) return;
      const params = new URLSearchParams();
      if (userId) params.set("userId", userId);
      if (role) params.set("role", role);
      const es = new EventSource(`/api/v1/notifications/stream?${params.toString()}`);
      eventSourceRef.current = es;

      es.addEventListener("connected", () => setIsConnected(true));

      es.addEventListener("notification", (e) => {
        try {
          const notif: Notification = JSON.parse(e.data);
          if (notificationIdsRef.current.has(notif.id)) return;
          notificationIdsRef.current.add(notif.id);
          setNotifications((prev) => [{ ...notif, isRead: false }, ...prev.slice(0, 59)]);
          enqueuePopup(notif);
          setUnreadCount((c) => c + 1);
          notifyDevice(notif);
        } catch { /* ignore parse errors */ }
      });

      es.onerror = () => {
        setIsConnected(false);
        es.close();
        if (!disposedRef.current) {
          reconnectTimerRef.current = window.setTimeout(connect, 5000);
        }
      };
    };

    fetchNotifications();
    connect();

    // Fallback polling every 30s (in case SSE connection drops)
    const poll = setInterval(fetchNotifications, 30000);
    const refreshOnResume = () => {
      if (!document.hidden && navigator.onLine) {
        fetchNotifications();
      }
    };
    const refreshOnOnline = () => fetchNotifications();
    document.addEventListener("visibilitychange", refreshOnResume);
    window.addEventListener("online", refreshOnOnline);

    return () => {
      disposedRef.current = true;
      clearInterval(poll);
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      document.removeEventListener("visibilitychange", refreshOnResume);
      window.removeEventListener("online", refreshOnOnline);
      eventSourceRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, role]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  const markAllRead = async () => {
    setIsMarkingRead(true);
    try {
      await fetch("/api/v1/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true, userId }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch { /* silent */ } finally {
      setIsMarkingRead(false);
    }
  };

  const markOneRead = async (id: string) => {
    try {
      await fetch("/api/v1/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      });
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch { /* silent */ }
  };

  const enableBrowserAlerts = async () => {
    if (typeof Notification === "undefined") return;
    const permission = await Notification.requestPermission();
    const enabled = permission === "granted";
    setBrowserAlerts(enabled);
    browserAlertsRef.current = enabled;
  };

  const toggleSound = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    mutedRef.current = nextMuted;
    window.localStorage.setItem("Nini_notification_sound", nextMuted ? "muted" : "enabled");
  };

  const handleNotifClick = async (notif: Notification) => {
    if (!notif.isRead) await markOneRead(notif.id);
    if (notif.actionUrl) {
      window.location.href = notif.actionUrl;
    }
    setIsOpen(false);
  };

  // Filter logic
  const filteredNotifications = notifications.filter((n) => {
    if (filterTab === "unread") return !n.isRead;
    if (filterTab === "critical") return n.priority === "critical" || n.priority === "high";
    if (filterTab === "action") return Boolean(n.requiresAction ?? n.actionUrl);
    return true;
  });

  const filterTabs: { id: FilterTab; label: string }[] = [
    { id: "all", label: "All" },
    { id: "unread", label: `Unread${unreadCount > 0 ? ` (${unreadCount})` : ""}` },
    { id: "critical", label: "Priority" },
    { id: "action", label: `Action Required${notifications.filter((n) => !n.isRead && (n.requiresAction ?? n.actionUrl)).length ? ` (${notifications.filter((n) => !n.isRead && (n.requiresAction ?? n.actionUrl)).length})` : ""}` },
  ];

  return (
    <>
    {popupNotification && (
      <div className="fixed top-[calc(env(safe-area-inset-top)+1rem)] right-4 sm:right-6 z-[400] w-[calc(100vw-2rem)] max-w-sm animate-in slide-in-from-right-4 duration-200">
        <div
          onClick={() => {
            const notification = popupNotification;
            setPopupNotification(null);
            if (notification.actionUrl) window.location.href = notification.actionUrl;
            else setIsOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              const notification = popupNotification;
              setPopupNotification(null);
              if (notification.actionUrl) window.location.href = notification.actionUrl;
              else setIsOpen(true);
            }
          }}
          tabIndex={0}
          className={`w-full text-left rounded-2xl border bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl p-4 ${
            popupNotification.priority === "critical"
              ? "border-red-400 shadow-red-500/20"
              : popupNotification.priority === "high"
                ? "border-amber-400 shadow-amber-500/20"
                : "border-teal-400 shadow-teal-500/10"
          }`}
          role="status"
          aria-live={popupNotification.priority === "critical" ? "assertive" : "polite"}
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5">{notifIcon(popupNotification.type, popupNotification.priority)}</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{popupNotification.title}</p>
                <span className="text-[10px] font-semibold uppercase text-slate-400">New</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300 line-clamp-2">{popupNotification.body}</p>
              <p className="mt-2 text-[10px] font-semibold text-teal-700 dark:text-teal-300">
                {popupNotification.actionUrl ? (popupNotification.actionText || "Open notification") : "Tap to view notifications"}
              </p>
            </div>
            <button
              type="button"
              aria-label="Dismiss notification popup"
              onClick={(event) => { event.stopPropagation(); setPopupNotification(null); }}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    )}
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        id="notification-bell-btn"
        onClick={() => setIsOpen((o) => !o)}
        className="relative w-9 h-9 rounded-full flex items-center justify-center border border-[#E7E2D8] dark:border-slate-700 bg-[#FAF8F5] dark:bg-slate-800 hover:border-[#005C4B] hover:bg-[#E8F4F0] dark:hover:bg-slate-700 transition-all"
        title={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell className="w-4 h-4 text-[#33413C] dark:text-slate-300" />
        {/* Real-time connected dot */}
        <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white ${isConnected ? "bg-emerald-500" : "bg-slate-400"}`} title={isConnected ? "Live" : "Polling"} />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-[#D96B43] text-white text-[10px] font-bold flex items-center justify-center px-1 shadow-sm animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <div className="absolute right-0 top-11 w-[400px] max-w-[96vw] rounded-2xl shadow-2xl border border-[#E7E2D8] dark:border-slate-700 bg-white dark:bg-slate-900 z-[200] flex flex-col overflow-hidden animate-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E7E2D8] dark:border-slate-700 bg-gradient-to-r from-[#005C4B] to-teal-600">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-white" />
              <span className="text-white font-semibold text-sm">Notifications</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${isConnected ? "bg-emerald-400/30 text-emerald-200" : "bg-slate-400/30 text-slate-300"}`}>
                {isConnected ? "● LIVE" : "○ Polling"}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {!browserAlerts && typeof Notification !== "undefined" && Notification.permission !== "denied" && (
                <button
                  onClick={enableBrowserAlerts}
                  className="text-[10px] text-white/80 hover:text-white px-2 py-1 rounded-lg hover:bg-white/10 transition"
                  title="Enable desktop reminder alerts"
                >
                  Enable alerts
                </button>
              )}
              <button
                onClick={toggleSound}
                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition"
                title={isMuted ? "Unmute alerts" : "Mute alerts"}
              >
                {isMuted ? <BellOff className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  disabled={isMarkingRead}
                  className="flex items-center gap-1 text-[11px] text-white/80 hover:text-white px-2 py-1 rounded-lg hover:bg-white/10 transition disabled:opacity-50"
                >
                  <CheckCheck className="w-3 h-3" /> Mark all read
                </button>
              )}
              <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Urgent appointment reminder banner */}
          {(() => {
            const urgentReminder = notifications.find(
              (n) => n.type === "appointment_reminder" && n.metadata?.window === "1h" && !n.isRead
            );
            if (!urgentReminder) return null;
            return (
              <div className="mx-3 mt-2 mb-1 flex items-start gap-2.5 rounded-xl border border-teal-500/40 bg-teal-500/10 px-3 py-2.5 animate-pulse">
                <Clock className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold text-teal-300 leading-tight">⏰ Appointment in ~1 Hour</p>
                  <p className="text-[10px] text-teal-400/80 mt-0.5 line-clamp-2">{urgentReminder.body}</p>
                </div>
                {urgentReminder.actionUrl && (
                  <a
                    href={urgentReminder.actionUrl}
                    className="text-[10px] font-semibold text-teal-300 hover:text-white whitespace-nowrap transition"
                    onClick={() => { markOneRead(urgentReminder.id); setIsOpen(false); }}
                  >
                    View →
                  </a>
                )}
              </div>
            );
          })()}

          {/* Filter Tabs */}
          <div className="flex border-b border-[#E7E2D8] dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/60">
            {filterTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterTab(tab.id)}
                className={`flex-1 text-[11px] font-medium py-2 transition-colors ${
                  filterTab === tab.id
                    ? "text-[#005C4B] border-b-2 border-[#005C4B] bg-white dark:bg-slate-900 dark:text-teal-400"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Notification List */}
          <div className="overflow-y-auto max-h-[420px]">
            {filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-600">
                <Bell className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm font-medium">No notifications</p>
                <p className="text-xs mt-1">You're all caught up!</p>
              </div>
            ) : (
              filteredNotifications.map((notif) => {
                const styles = PRIORITY_STYLES[notif.priority] || PRIORITY_STYLES.normal;
                return (
                  <div
                    key={notif.id}
                    className={`${styles.border} ${styles.bg} ${!notif.isRead ? "opacity-100" : "opacity-70"} border-b border-[#E7E2D8]/60 dark:border-slate-700/60 transition-all hover:opacity-100`}
                  >
                    <div className="flex gap-3 px-4 py-3">
                      <div className="mt-0.5">{notifIcon(notif.type, notif.priority)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-[13px] leading-snug ${!notif.isRead ? "font-semibold text-slate-900 dark:text-slate-100" : "font-medium text-slate-700 dark:text-slate-300"}`}>
                            {notif.title}
                          </p>
                          <div className="flex items-center gap-1 shrink-0">
                            {!notif.isRead && (
                              <span className="w-2 h-2 rounded-full bg-[#005C4B] shrink-0" />
                            )}
                            {notif.priority !== "normal" && notif.priority !== "low" && (
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${styles.badge}`}>
                                {notif.priority}
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                          {notif.body}
                        </p>
                        <div className="flex items-center justify-between mt-2 gap-2">
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">{timeSince(notif.createdAt)}</span>
                          <div className="flex items-center gap-1.5">
                            {!notif.isRead && (
                              <button
                                onClick={(e) => { e.stopPropagation(); markOneRead(notif.id); }}
                                className="text-[10px] text-slate-400 hover:text-[#005C4B] transition"
                              >
                                Mark read
                              </button>
                            )}
                            {notif.actionUrl && (
                              <button
                                onClick={() => handleNotifClick(notif)}
                                className="flex items-center gap-1 text-[11px] font-semibold text-[#005C4B] hover:text-teal-700 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/40 dark:hover:bg-teal-900/50 dark:text-teal-400 px-2.5 py-1 rounded-lg transition"
                              >
                                {notif.actionText || "Act Now"}
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-[#E7E2D8] dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/60 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              {notifications.length} notification{notifications.length !== 1 ? "s" : ""}
            </span>
            {(currentRole as string) === "system_admin" || (currentRole as string) === "tenant_admin" ? (
              <a href="/admin/notifications" className="text-[11px] text-[#005C4B] dark:text-teal-400 hover:underline font-medium">
                Manage privileges →
              </a>
            ) : null}
          </div>
        </div>
      )}
    </div>
    </>
  );
}
