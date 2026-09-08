"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  Clock,
  Sparkles,
  Users,
  Activity,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  ChevronRight,
  Stethoscope,
  Pill,
  TestTube,
  Building2,
  RefreshCw,
  Bell,
  HeartPulse,
} from "lucide-react";
import { AudioAnnouncer } from "@/lib/display/audio-announcer";
import { saveCachedDisplayState, getCachedDisplayState } from "@/lib/display/display-cache";

type DisplayScreen = "now_serving" | "queue_board" | "available_staff" | "announcements";

interface ServingPatient {
  id: string;
  queueNumber: string;
  anonymizedName: string;
  servicePoint: string;
  department: string;
  providerName: string;
  priority: "routine" | "urgent" | "emergency";
  calledAt: string;
}

interface QueueItem {
  id: string;
  queueNumber: string;
  status: string;
  priority: "routine" | "urgent" | "emergency";
  servicePoint: string;
  department: string;
  estimatedWaitMinutes: number;
}

interface StaffMember {
  id: string;
  name: string;
  role: string;
  department: string;
  status: string;
  statusColor: string;
  waitingPatients: number;
}

interface Announcement {
  id: string;
  message: string;
  type: "info" | "important" | "critical" | "health_tip";
  audience: string;
}

interface ToastNotification {
  id: string;
  title: string;
  message: string;
  priority: "info" | "urgent" | "critical";
  timestamp: number;
}

export default function WaitingRoomDisplayPage() {
  // Screen state
  const [activeScreen, setActiveScreen] = useState<DisplayScreen>("now_serving");
  const [displayMode, setDisplayMode] = useState<"rotation" | "persistent_calling" | "emergency">("rotation");
  const [rotationIntervalSeconds, setRotationIntervalSeconds] = useState(20);

  // Live Data
  const [currentlyServing, setCurrentlyServing] = useState<ServingPatient | null>({
    id: "demo-1",
    queueNumber: "A-105",
    anonymizedName: "Abebe K.",
    servicePoint: "Consultation Room 4",
    department: "Internal Medicine",
    providerName: "Dr. Aster Solomon",
    priority: "routine",
    calledAt: new Date().toISOString(),
  });

  const [queueList, setQueueList] = useState<QueueItem[]>([
    { id: "q1", queueNumber: "A-106", status: "waiting", priority: "routine", servicePoint: "Waiting Area", department: "General Clinic", estimatedWaitMinutes: 5 },
    { id: "q2", queueNumber: "A-107", status: "waiting", priority: "urgent", servicePoint: "Waiting Area", department: "Pediatrics", estimatedWaitMinutes: 10 },
    { id: "q3", queueNumber: "A-108", status: "waiting", priority: "routine", servicePoint: "Lab Draw 2", department: "Laboratory", estimatedWaitMinutes: 12 },
    { id: "q4", queueNumber: "A-109", status: "waiting", priority: "routine", servicePoint: "Pharmacy Window 1", department: "Pharmacy", estimatedWaitMinutes: 15 },
    { id: "q5", queueNumber: "A-110", status: "waiting", priority: "routine", servicePoint: "Waiting Area", department: "General Clinic", estimatedWaitMinutes: 20 },
    { id: "q6", queueNumber: "A-111", status: "waiting", priority: "emergency", servicePoint: "Triage Station", department: "Emergency Triage", estimatedWaitMinutes: 2 },
  ]);

  const [availableStaff, setAvailableStaff] = useState<StaffMember[]>([
    { id: "s1", name: "Dr. Aster Solomon", role: "Attending Physician", department: "Internal Medicine", status: "In Consultation", statusColor: "amber", waitingPatients: 2 },
    { id: "s2", name: "Dr. Yonas Haile", role: "General Practitioner", department: "Outpatient Clinic", status: "Available", statusColor: "emerald", waitingPatients: 1 },
    { id: "s3", name: "Sr. Bethlehem Tadesse", role: "Lead Clinical Nurse", department: "Triage & Vitals", status: "Available", statusColor: "emerald", waitingPatients: 1 },
    { id: "s4", name: "Pharm. Dawit Alemu", role: "Chief Pharmacist", department: "Dispensary A", status: "Available", statusColor: "emerald", waitingPatients: 3 },
    { id: "s5", name: "Tech. Selamawit Bekele", role: "Laboratory Lead", department: "Phlebotomy / Blood Draw", status: "Available", statusColor: "emerald", waitingPatients: 2 },
  ]);

  const [departmentWaitTimes, setDepartmentWaitTimes] = useState([
    { department: "General Clinic", estimatedMinutes: 12, waitingCount: 4 },
    { department: "Pharmacy Dispense", estimatedMinutes: 5, waitingCount: 2 },
    { department: "Clinical Laboratory", estimatedMinutes: 8, waitingCount: 1 },
    { department: "Triage & Vitals", estimatedMinutes: 3, waitingCount: 1 },
  ]);

  const [announcements, setAnnouncements] = useState<Announcement[]>([
    { id: "tip-1", message: "💧 Clean Water & Wellness: Remember to hydrate while waiting for your clinical consultation.", type: "health_tip", audience: "all" },
    { id: "tip-2", message: "🎟️ Please have your printed ticket or SMS queue code ready as your number is announced.", type: "info", audience: "queue" },
    { id: "tip-3", message: "💊 Fast-Track Pharmacy: Consultations that include e-prescriptions are sent immediately to the dispensary.", type: "info", audience: "all" },
  ]);

  const [emergencyAlert, setEmergencyAlert] = useState<Announcement | null>(null);

  // Connectivity & Telemetry
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>("");
  const [displayToken, setDisplayToken] = useState<string>("");
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  // Real-time toast notifications for directional alerts
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  // Clock
  const [currentTime, setCurrentTime] = useState<string>("");
  const [currentDate, setCurrentDate] = useState<string>("");

  const rotationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
      setCurrentDate(
        now.toLocaleDateString("en-US", {
          weekday: "long",
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch initial state & setup offline backup
  const fetchState = async () => {
    try {
      const url = new URL("/api/v1/display/waiting-room/state", window.location.href);
      if (displayToken) url.searchParams.set("token", displayToken);

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("HTTP error " + res.status);
      const json = await res.json();

      if (json.success && json.data) {
        const d = json.data;
        if (d.currentlyServing) setCurrentlyServing(d.currentlyServing);
        if (d.queueList) setQueueList(d.queueList);
        if (d.availableStaff) setAvailableStaff(d.availableStaff);
        if (d.departmentWaitTimes) setDepartmentWaitTimes(d.departmentWaitTimes);
        if (d.announcements) setAnnouncements(d.announcements);
        if (d.criticalAnnouncement) setEmergencyAlert(d.criticalAnnouncement);
        if (d.display?.token) setDisplayToken(d.display.token);

        if (d.display?.settings) {
          setDisplayMode(d.display.settings.displayMode || "rotation");
          setRotationIntervalSeconds(d.display.settings.rotationIntervalSeconds || 20);
          setAudioEnabled(d.display.settings.audioEnabled !== false);
        }

        setIsOffline(false);
        setLastSyncTime(new Date().toLocaleTimeString());

        // Cache to IndexedDB for offline protection
        saveCachedDisplayState(d);
      }
    } catch (err) {
      console.warn("[Waiting Room Display] Network fetch failed, reading from offline cache:", err);
      setIsOffline(true);
      const cached = await getCachedDisplayState();
      if (cached) {
        if (cached.currentlyServing) setCurrentlyServing(cached.currentlyServing);
        if (cached.queueList) setQueueList(cached.queueList);
        if (cached.availableStaff) setAvailableStaff(cached.availableStaff);
        if (cached.departmentWaitTimes) setDepartmentWaitTimes(cached.departmentWaitTimes);
        if (cached.announcements) setAnnouncements(cached.announcements);
        if (cached.criticalAnnouncement) setEmergencyAlert(cached.criticalAnnouncement);
        setLastSyncTime(new Date(cached.cachedAt).toLocaleTimeString() + " (Cached)");
      }
    }
  };

  // Online / Offline listener
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      fetchState();
    };
    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    fetchState();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [displayToken]);

  // Server-Sent Events (SSE) Real-Time Subscription
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connectSSE = () => {
      try {
        const streamUrl = new URL("/api/v1/display/waiting-room/stream", window.location.href);
        eventSource = new EventSource(streamUrl.toString());

        eventSource.onopen = () => {
          setIsLiveConnected(true);
          setIsOffline(false);
        };

        eventSource.addEventListener("connected", () => {
          setIsLiveConnected(true);
          setLastSyncTime(new Date().toLocaleTimeString());
        });

        eventSource.addEventListener("display_event", (e: MessageEvent) => {
          try {
            const eventData = JSON.parse(e.data);
            setLastSyncTime(new Date().toLocaleTimeString());

            if (eventData.type === "patient_called") {
              const p = eventData.payload;
              const newServing: ServingPatient = {
                id: p.queueId,
                queueNumber: p.queueNumber,
                anonymizedName: p.anonymizedName || "Patient",
                servicePoint: p.servicePoint || "Consultation Room",
                department: p.department || "General Clinic",
                providerName: p.providerName || "Attending Physician",
                priority: p.priority || "routine",
                calledAt: p.calledAt || new Date().toISOString(),
              };

              setCurrentlyServing(newServing);
              setActiveScreen("now_serving"); // Instantly switch TV screen to show who is called!

              // Trigger Audio announcement if enabled
              if (audioEnabled) {
                AudioAnnouncer.announcePatientCall({
                  ticketNumber: p.queueNumber,
                  servicePoint: p.servicePoint,
                  patientName: p.anonymizedName,
                  language: "en",
                });
              }

              // Also spawn directional toast
              addToast({
                id: `call-${Date.now()}`,
                title: `Now Calling: Ticket ${p.queueNumber}`,
                message: `Please proceed to ${p.servicePoint} (${p.department})`,
                priority: p.priority === "emergency" ? "critical" : p.priority === "urgent" ? "urgent" : "info",
                timestamp: Date.now(),
              });

              // Refresh full queue in background
              fetchState();
            } else if (eventData.type === "queue_updated") {
              fetchState();
            } else if (eventData.type === "emergency_override") {
              setEmergencyAlert(eventData.payload);
              setDisplayMode("emergency");
            } else if (eventData.type === "announcement") {
              fetchState();
            }
          } catch (err) {
            console.error("Failed to parse display SSE event:", err);
          }
        });

        eventSource.onerror = () => {
          setIsLiveConnected(false);
          eventSource?.close();
          // Auto-reconnect with 5-second backoff
          reconnectTimeout = setTimeout(connectSSE, 5000);
        };
      } catch (err) {
        setIsLiveConnected(false);
        reconnectTimeout = setTimeout(connectSSE, 5000);
      }
    };

    connectSSE();

    return () => {
      eventSource?.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [audioEnabled]);

  // Periodic display heartbeat telemetry
  useEffect(() => {
    const sendHeartbeat = async () => {
      if (!displayToken) return;
      try {
        await fetch("/api/v1/display/waiting-room/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: displayToken }),
        });
      } catch {}
    };

    const interval = setInterval(sendHeartbeat, 30000); // 30s heartbeat
    return () => clearInterval(interval);
  }, [displayToken]);

  // Screen Rotation Carousel
  useEffect(() => {
    if (displayMode !== "rotation" || emergencyAlert) return;

    const screens: DisplayScreen[] = ["now_serving", "queue_board", "available_staff", "announcements"];

    rotationTimerRef.current = setInterval(() => {
      setActiveScreen((prev) => {
        const nextIdx = (screens.indexOf(prev) + 1) % screens.length;
        return screens[nextIdx];
      });
    }, rotationIntervalSeconds * 1000);

    return () => {
      if (rotationTimerRef.current) clearInterval(rotationTimerRef.current);
    };
  }, [displayMode, rotationIntervalSeconds, emergencyAlert]);

  // Toast management
  const addToast = (toast: ToastNotification) => {
    setToasts((prev) => [toast, ...prev.slice(0, 3)]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toast.id));
    }, 9000);
  };

  // User gesture unlock for Web Audio
  const handleUnlockAudio = () => {
    const success = AudioAnnouncer.unlockAudio();
    if (success) {
      setAudioUnlocked(true);
      AudioAnnouncer.playChime(0.7);
    }
  };

  return (
    <div
      onClick={handleUnlockAudio}
      className="min-h-screen bg-[#070712] text-white select-none font-sans overflow-hidden flex flex-col justify-between"
    >
      {/* ═══════════════════════════════════════════════════════════════════
          1. TOP STATUS BAR (High-Visibility TV Header)
          ═══════════════════════════════════════════════════════════════════ */}
      <header className="bg-[#0b0b1a] border-b border-gray-800/80 px-8 py-4 flex items-center justify-between shadow-2xl relative z-40">
        {/* Clinic Identity */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
            <HeartPulse className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black tracking-tight text-white">NiniMed Clinical Care</h1>
              <span className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                Waiting Hall Display
              </span>
            </div>
            <p className="text-xs text-gray-400">Main Facility • Real-Time Patient Wayfinding & Queue Stream</p>
          </div>
        </div>

        {/* Live Rotation Pills (When in rotation mode) */}
        {displayMode === "rotation" && !emergencyAlert && (
          <div className="hidden lg:flex items-center gap-1.5 bg-[#121226] p-1 rounded-2xl border border-gray-800">
            <button
              onClick={(e) => { e.stopPropagation(); setActiveScreen("now_serving"); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeScreen === "now_serving" ? "bg-cyan-600 text-white shadow-lg shadow-cyan-600/30" : "text-gray-400 hover:text-white"
              }`}
            >
              Now Serving
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setActiveScreen("queue_board"); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeScreen === "queue_board" ? "bg-cyan-600 text-white shadow-lg shadow-cyan-600/30" : "text-gray-400 hover:text-white"
              }`}
            >
              Queue Status
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setActiveScreen("available_staff"); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeScreen === "available_staff" ? "bg-cyan-600 text-white shadow-lg shadow-cyan-600/30" : "text-gray-400 hover:text-white"
              }`}
            >
              On-Duty Staff
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setActiveScreen("announcements"); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeScreen === "announcements" ? "bg-cyan-600 text-white shadow-lg shadow-cyan-600/30" : "text-gray-400 hover:text-white"
              }`}
            >
              Health Info
            </button>
          </div>
        )}

        {/* Status Indicators & Clock */}
        <div className="flex items-center gap-6">
          {/* Live Stream Sentinel */}
          <div className="flex items-center gap-2 bg-[#141428] px-3.5 py-1.5 rounded-xl border border-gray-800">
            {isLiveConnected && !isOffline ? (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                Live Sync
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                <WifiOff className="w-3.5 h-3.5" />
                Offline Mode
              </span>
            )}
            <span className="text-[10px] text-gray-500">| {lastSyncTime || "Syncing..."}</span>
          </div>

          {/* Audio Chime State */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleUnlockAudio();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              audioUnlocked
                ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-400"
                : "bg-amber-950/30 border-amber-500/40 text-amber-300 animate-bounce"
            }`}
          >
            {audioUnlocked ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-amber-400" />}
            <span>{audioUnlocked ? "Chimes On" : "Touch for Audio"}</span>
          </button>

          {/* Digital Clock */}
          <div className="text-right">
            <div className="text-2xl font-black text-white font-mono tracking-tight">{currentTime || "--:--:--"}</div>
            <div className="text-[11px] font-medium text-cyan-400">{currentDate}</div>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════════
          OFFLINE BANNER (Graceful Degradation)
          ═══════════════════════════════════════════════════════════════════ */}
      {isOffline && (
        <div className="bg-amber-500 text-black px-6 py-2.5 flex items-center justify-between text-sm font-bold shadow-lg animate-pulse">
          <div className="flex items-center gap-2">
            <WifiOff className="w-5 h-5" />
            <span>Connection Interrupted — Displaying last known clinic queue snapshot from local cache.</span>
          </div>
          <span className="text-xs uppercase tracking-wider bg-black/10 px-2 py-0.5 rounded">Auto-Reconnecting</span>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          FLOATING DIRECTIONAL TOAST NOTIFICATIONS
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="fixed top-24 right-8 z-50 flex flex-col gap-3 max-w-md w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`p-5 rounded-3xl border shadow-2xl backdrop-blur-xl animate-fade-in pointer-events-auto flex items-start gap-4 ${
              toast.priority === "critical"
                ? "bg-rose-950/90 border-rose-500 text-white shadow-rose-500/30"
                : toast.priority === "urgent"
                ? "bg-amber-950/90 border-amber-500 text-white shadow-amber-500/30"
                : "bg-cyan-950/90 border-cyan-500 text-white shadow-cyan-500/30"
            }`}
          >
            <div className="p-2.5 rounded-2xl bg-white/10 shrink-0">
              <Bell className="w-6 h-6 text-white animate-bounce" />
            </div>
            <div className="flex-1">
              <h4 className="text-base font-black tracking-tight">{toast.title}</h4>
              <p className="text-sm text-gray-200 mt-0.5">{toast.message}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          MAIN STAGE: SCREENS
          ═══════════════════════════════════════════════════════════════════ */}
      <main className="flex-1 p-8 flex flex-col justify-center max-w-[1800px] w-full mx-auto">
        {/* ── EMERGENCY FULLSCREEN OVERRIDE ── */}
        {emergencyAlert && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-rose-950/30 border-4 border-rose-500/80 rounded-3xl shadow-2xl shadow-rose-900/50 animate-pulse">
            <div className="w-28 h-28 rounded-full bg-rose-600 flex items-center justify-center mb-6 shadow-2xl shadow-rose-600/50">
              <ShieldAlert className="w-16 h-16 text-white animate-bounce" />
            </div>
            <span className="text-rose-400 uppercase tracking-widest text-lg font-black mb-2">Priority Urgent Notice</span>
            <h2 className="text-5xl font-black text-white max-w-4xl leading-tight mb-6">
              {emergencyAlert.message}
            </h2>
            <p className="text-xl text-rose-200 max-w-2xl">
              Please remain seated and follow instructions provided by clinical staff and nursing leadership.
            </p>
          </div>
        )}

        {/* ── SCREEN 1: NOW SERVING / CALLING HERO ── */}
        {!emergencyAlert && activeScreen === "now_serving" && (
          <div className="flex-1 flex flex-col justify-between gap-8 animate-fade-in">
            {/* Massive Now Serving Hero Card */}
            <div className="bg-gradient-to-b from-[#111126] to-[#0c0c1e] border-2 border-cyan-500/60 rounded-3xl p-10 shadow-2xl shadow-cyan-900/20 relative overflow-hidden flex flex-col items-center justify-center text-center">
              {/* Background ambient glow */}
              <div className="absolute -top-32 -left-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* Header Label */}
              <div className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full bg-cyan-500/10 border border-cyan-500/40 text-cyan-300 font-extrabold text-sm uppercase tracking-widest mb-6">
                <Sparkles className="w-5 h-5 text-cyan-400 animate-spin" />
                <span>Now Serving • የአሁን ተረኛ</span>
              </div>

              {/* Patient Code & Masked Name */}
              <div className="space-y-2 mb-8">
                <div className="text-8xl md:text-9xl font-black tracking-tight text-white font-mono drop-shadow-[0_0_35px_rgba(6,182,212,0.4)]">
                  {currentlyServing?.queueNumber || "A-100"}
                </div>
                <div className="text-3xl font-bold text-gray-300 tracking-wide">
                  ({currentlyServing?.anonymizedName || "Patient"})
                </div>
              </div>

              {/* Destination Service Point */}
              <div className="w-full max-w-3xl bg-[#161633] border border-cyan-500/40 rounded-2xl p-6 mb-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-left">
                  <div className="text-xs uppercase tracking-widest font-bold text-cyan-400 mb-1">Assigned Station</div>
                  <div className="text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
                    <Building2 className="w-8 h-8 text-cyan-400" />
                    <span>{currentlyServing?.servicePoint || "Consultation Room 1"}</span>
                  </div>
                </div>

                <div className="text-right border-t md:border-t-0 md:border-l border-gray-800 pt-3 md:pt-0 md:pl-6">
                  <div className="text-xs uppercase tracking-widest font-bold text-gray-400 mb-1">Professional / Clinician</div>
                  <div className="text-2xl font-bold text-emerald-400 flex items-center gap-2">
                    <Stethoscope className="w-6 h-6 text-emerald-400" />
                    <span>{currentlyServing?.providerName || "Attending Physician"}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{currentlyServing?.department || "General Medicine"}</div>
                </div>
              </div>

              {/* Voice / Visual Direction Prompt */}
              <p className="text-lg text-gray-400 font-medium">
                Please proceed immediately to your assigned station with your queue ticket.
              </p>
            </div>

            {/* Next in Line Preview Strip */}
            <div className="bg-[#0e0e20] border border-gray-800 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400 pl-2">
                <Users className="w-4 h-4 text-cyan-400" />
                <span>Next in Queue:</span>
              </div>
              <div className="flex items-center gap-4">
                {queueList.slice(0, 5).map((q, idx) => (
                  <div
                    key={q.id}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#15152c] border border-gray-700/60"
                  >
                    <span className="text-xs font-semibold text-gray-400">#{idx + 1}</span>
                    <span className="text-base font-black font-mono text-cyan-300">{q.queueNumber}</span>
                    <span className="text-[11px] text-gray-400">({q.department})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── SCREEN 2: QUEUE STATUS BOARD ── */}
        {!emergencyAlert && activeScreen === "queue_board" && (
          <div className="flex-1 flex flex-col justify-between gap-6 animate-fade-in">
            {/* Header Title */}
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
              <div>
                <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                  <Activity className="w-8 h-8 text-cyan-400" />
                  <span>Live Queue Flow & Estimated Wait Times</span>
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  Active patients waiting in clinic. Patients are listed by anonymized ticket number.
                </p>
              </div>

              {/* Department Wait Time Badges */}
              <div className="flex items-center gap-3">
                {departmentWaitTimes.map((dept) => (
                  <div
                    key={dept.department}
                    className="bg-[#121226] border border-gray-800 px-4 py-2 rounded-xl text-center"
                  >
                    <div className="text-[11px] font-bold text-gray-400 uppercase">{dept.department}</div>
                    <div className="text-lg font-black text-emerald-400 font-mono">~{dept.estimatedMinutes} min</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Queue Grid (2-Column Cards) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 flex-1">
              {queueList.slice(0, 9).map((item, index) => (
                <div
                  key={item.id}
                  className={`p-5 rounded-2xl border transition-all flex items-center justify-between ${
                    item.priority === "emergency"
                      ? "bg-rose-950/30 border-rose-500/50"
                      : item.priority === "urgent"
                      ? "bg-amber-950/30 border-amber-500/50"
                      : "bg-[#0e0e22] border-gray-800 hover:border-cyan-500/40"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#181832] flex items-center justify-center font-mono font-black text-lg text-cyan-400 border border-gray-700">
                      {index + 1}
                    </div>
                    <div>
                      <div className="text-2xl font-black font-mono text-white tracking-tight">
                        {item.queueNumber}
                      </div>
                      <div className="text-xs text-gray-400 flex items-center gap-1.5 mt-0.5">
                        <span>{item.department}</span>
                        <span>•</span>
                        <span className="text-emerald-400">~{item.estimatedWaitMinutes} min wait</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        item.status === "called"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse"
                          : item.status === "in_service"
                          ? "bg-blue-500/20 text-blue-400 border border-blue-500/40"
                          : "bg-gray-800 text-gray-300"
                      }`}
                    >
                      {item.status.replace("_", " ")}
                    </span>
                    <div className="text-[11px] text-gray-400 mt-1">{item.servicePoint}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SCREEN 3: AVAILABLE PROFESSIONALS & STAFF ── */}
        {!emergencyAlert && activeScreen === "available_staff" && (
          <div className="flex-1 flex flex-col justify-between gap-6 animate-fade-in">
            <div className="border-b border-gray-800 pb-4">
              <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                <Users className="w-8 h-8 text-cyan-400" />
                <span>On-Duty Healthcare Professionals & Stations</span>
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Real-time physician, pharmacist, and laboratory personnel availability.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 flex-1">
              {availableStaff.map((staff) => (
                <div
                  key={staff.id}
                  className="bg-[#0e0e22] border border-gray-800/80 rounded-2xl p-6 flex flex-col justify-between hover:border-cyan-500/40 transition-all shadow-lg"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-700 flex items-center justify-center font-bold text-xl text-white shadow-md">
                        {staff.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)}
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-white">{staff.name}</h3>
                        <p className="text-xs text-cyan-400 font-semibold">{staff.role}</p>
                        <p className="text-[11px] text-gray-400">{staff.department}</p>
                      </div>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                        staff.status === "Available"
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          staff.status === "Available" ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                        }`}
                      />
                      {staff.status}
                    </span>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-800/80 flex items-center justify-between text-xs text-gray-400">
                    <span>Patients in queue:</span>
                    <span className="font-bold text-white font-mono text-sm">
                      {staff.waitingPatients} waiting
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SCREEN 4: HEALTH TIPS & ANNOUNCEMENTS ── */}
        {!emergencyAlert && activeScreen === "announcements" && (
          <div className="flex-1 flex flex-col justify-between gap-6 animate-fade-in">
            <div className="border-b border-gray-800 pb-4">
              <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                <Sparkles className="w-8 h-8 text-cyan-400" />
                <span>Patient Health Information & Clinic Announcements</span>
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Daily health recommendations, service updates, and waiting room guidelines.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
              {announcements.map((ann) => (
                <div
                  key={ann.id}
                  className="bg-gradient-to-br from-[#0e0e22] to-[#12122b] border border-cyan-500/30 rounded-3xl p-8 flex flex-col justify-between shadow-xl"
                >
                  <div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 mb-4 inline-block">
                      {ann.type.replace("_", " ")}
                    </span>
                    <p className="text-2xl font-bold text-white leading-snug mt-2">{ann.message}</p>
                  </div>
                  <div className="text-xs text-gray-400 pt-4 border-t border-gray-800 flex justify-between items-center mt-6">
                    <span>Audience: {ann.audience.toUpperCase()}</span>
                    <span className="text-cyan-400 font-semibold">NiniMed Health Education</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ═══════════════════════════════════════════════════════════════════
          BOTTOM TICKER & EMERGENCY BANNER
          ═══════════════════════════════════════════════════════════════════ */}
      <footer className="bg-[#0b0b1a] border-t border-gray-800 px-8 py-3.5 flex items-center justify-between text-xs text-gray-400 relative z-40">
        <div className="flex items-center gap-3 overflow-hidden">
          <span className="px-2.5 py-1 rounded bg-cyan-500/20 text-cyan-400 font-bold uppercase text-[10px] tracking-widest shrink-0">
            Live Notice
          </span>
          <div className="whitespace-nowrap overflow-hidden text-ellipsis font-medium text-gray-300">
            {announcements[0]?.message || "Welcome to NiniMed. Please maintain quiet and wait for your ticket call."}
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0 pl-6 border-l border-gray-800">
          <span>Need assistance? Inquire at reception desk.</span>
          <span className="text-cyan-400 font-bold">Emergency Code: Ext 99</span>
        </div>
      </footer>
    </div>
  );
}
