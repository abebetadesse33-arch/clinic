"use client";

import { useState, useEffect } from "react";
import {
  Tv,
  Users,
  Bell,
  Volume2,
  VolumeX,
  Play,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sliders,
  Send,
  ShieldAlert,
  Radio,
  Building2,
  ExternalLink,
  Plus,
  Trash2,
  Sparkles,
  ArrowRight,
  Clock,
  Key,
} from "lucide-react";

export default function AdminWaitingRoomPage() {
  const [activeTab, setActiveTab] = useState<"call_patient" | "announcements" | "settings">("call_patient");
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Display State
  const [displayInfo, setDisplayInfo] = useState<any>(null);
  const [queueList, setQueueList] = useState<any[]>([]);
  const [currentlyServing, setCurrentlyServing] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);

  // Call Patient Form
  const [selectedQueueId, setSelectedQueueId] = useState<string>("");
  const [selectedServicePoint, setSelectedServicePoint] = useState<string>("Consultation Room 4");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("General Clinic");

  // Announcement Form
  const [announcementMsg, setAnnouncementMsg] = useState("");
  const [announcementType, setAnnouncementType] = useState<"info" | "important" | "critical" | "health_tip">("info");
  const [emergencyOverrideActive, setEmergencyOverrideActive] = useState(false);

  // Settings Form
  const [displayMode, setDisplayMode] = useState<"rotation" | "persistent_calling" | "emergency">("rotation");
  const [rotationInterval, setRotationInterval] = useState(20);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [audioVolume, setAudioVolume] = useState(80);
  const [audioVoice, setAudioVoice] = useState<"en" | "am" | "om">("en");
  const [enabledScreens, setEnabledScreens] = useState({
    nowServing: true,
    queueStatus: true,
    availableStaff: true,
    announcements: true,
  });

  const servicePoints = [
    "Consultation Room 1",
    "Consultation Room 2",
    "Consultation Room 3",
    "Consultation Room 4",
    "Lab Draw Station 1",
    "Lab Draw Station 2",
    "Pharmacy Counter A",
    "Pharmacy Counter B",
    "Triage & Vitals Station",
    "Ultrasound & Imaging",
  ];

  // Load state
  const loadState = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/v1/display/waiting-room/state");
      const json = await res.json();
      if (json.success && json.data) {
        setDisplayInfo(json.data.display);
        setCurrentlyServing(json.data.currentlyServing);
        setQueueList(json.data.queueList || []);
        setAnnouncements(json.data.announcements || []);
        setEmergencyOverrideActive(json.data.emergencyModeActive || false);

        if (json.data.display?.settings) {
          const s = json.data.display.settings;
          setDisplayMode(s.displayMode || "rotation");
          setRotationInterval(s.rotationIntervalSeconds || 20);
          setAudioEnabled(s.audioEnabled !== false);
          setAudioVolume(s.audioVolume || 80);
          setAudioVoice(s.audioVoice || "en");
          if (s.enabledScreens) setEnabledScreens(s.enabledScreens);
        }
      }
    } catch (err: any) {
      setErrorMessage("Failed to load display state");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadState();
    const interval = setInterval(loadState, 10000); // 10s auto-refresh
    return () => clearInterval(interval);
  }, []);

  // Call Next in Queue
  const handleCallNext = async () => {
    try {
      setIsLoading(true);
      setSuccessMessage("");
      setErrorMessage("");

      const res = await fetch("/api/v1/queue/call-next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queueId: selectedQueueId || undefined,
          servicePoint: selectedServicePoint,
          department: selectedDepartment,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setSuccessMessage(`Called patient to ${selectedServicePoint} successfully!`);
        setSelectedQueueId("");
        loadState();
      } else {
        setErrorMessage(json.message || json.error || "Failed to call patient");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Network error");
    } finally {
      setIsLoading(false);
    }
  };

  // Publish Announcement
  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementMsg.trim()) return;

    try {
      setIsLoading(true);
      const res = await fetch("/api/v1/display/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: announcementMsg,
          type: announcementType,
          audience: "all",
        }),
      });

      const json = await res.json();
      if (json.success) {
        setSuccessMessage("Announcement broadcasted to Waiting Room screens!");
        setAnnouncementMsg("");
        loadState();
      } else {
        setErrorMessage(json.error || "Failed to post announcement");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to broadcast");
    } finally {
      setIsLoading(false);
    }
  };

  // Delete Announcement
  const handleDeleteAnnouncement = async (id: string) => {
    try {
      await fetch(`/api/v1/display/announcements?id=${id}`, { method: "DELETE" });
      loadState();
    } catch {}
  };

  // Save Settings
  const handleSaveSettings = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/v1/display/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayId: displayInfo?.id,
          settings: {
            displayMode,
            rotationIntervalSeconds: Number(rotationInterval),
            audioEnabled,
            audioVolume: Number(audioVolume),
            audioVoice,
            enabledScreens,
          },
        }),
      });

      const json = await res.json();
      if (json.success) {
        setSuccessMessage("Display settings updated and broadcasted!");
        loadState();
      } else {
        setErrorMessage(json.error || "Failed to update settings");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Save settings error");
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle Fullscreen Emergency Override
  const handleToggleEmergency = async () => {
    const nextMode = emergencyOverrideActive ? "rotation" : "emergency";
    try {
      setIsLoading(true);
      await fetch("/api/v1/display/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayId: displayInfo?.id,
          settings: {
            displayMode: nextMode,
            rotationIntervalSeconds: rotationInterval,
            audioEnabled,
            audioVolume,
            audioVoice,
            enabledScreens,
          },
        }),
      });

      if (!emergencyOverrideActive) {
        // Also post critical announcement
        await fetch("/api/v1/display/announcements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: "⚠️ CLINICAL EMERGENCY OVERRIDE: All patients please remain seated. Follow staff instructions.",
            type: "critical",
          }),
        });
      }

      setEmergencyOverrideActive(!emergencyOverrideActive);
      setDisplayMode(nextMode);
      setSuccessMessage(
        nextMode === "emergency" ? "Emergency Mode ACTIVATED on all TVs!" : "Emergency Mode deactivated."
      );
      loadState();
    } catch (err: any) {
      setErrorMessage(err.message || "Emergency toggle failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090914] text-gray-100 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* ═══════════════════════════════════════════════════════════════════
            TOP HEADER & HARDWARE TELEMETRY
            ═══════════════════════════════════════════════════════════════════ */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800/80 pb-6">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-xl shadow-cyan-500/20">
              <Tv className="w-8 h-8 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black text-white tracking-tight">
                  Waiting Room Display Management
                </h1>
                <span className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Radio className="w-3 h-3 animate-pulse" /> Digital Signage
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Control queue calling, live TV previews, emergency overrides, and audio announcements.
              </p>
            </div>
          </div>

          {/* Action Links */}
          <div className="flex items-center gap-3">
            <a
              href="/display/waiting-room"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-600/30 transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Launch Fullscreen TV View</span>
            </a>

            <button
              onClick={handleToggleEmergency}
              className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 border transition-all ${
                emergencyOverrideActive
                  ? "bg-rose-600 hover:bg-rose-500 text-white border-rose-500 animate-pulse shadow-lg shadow-rose-600/40"
                  : "bg-rose-950/20 hover:bg-rose-900/30 text-rose-400 border-rose-800/40"
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>{emergencyOverrideActive ? "Deactivate Emergency Mode" : "Trigger Emergency Override"}</span>
            </button>
          </div>
        </div>

        {/* Feedback Toasts */}
        {successMessage && (
          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage("")} className="text-xs hover:text-white">✕</button>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage("")} className="text-xs hover:text-white">✕</button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            MINIATURE LIVE TV PREVIEW & STATS STRIP
            ═══════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Miniature TV Mirror */}
          <div className="lg:col-span-2 bg-[#0d0d1e] border border-gray-800 rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
                <Radio className="w-4 h-4" />
                <span>Live TV Screen Mirror (Real-Time Rendering)</span>
              </div>
              <span className="text-[11px] text-gray-400">Screen: {displayInfo?.name || "Main Waiting Room"}</span>
            </div>

            {/* Scaled TV Screen Simulator */}
            <div className="bg-[#070712] border-2 border-cyan-500/40 rounded-2xl p-6 text-center space-y-4 relative overflow-hidden">
              {emergencyOverrideActive ? (
                <div className="py-8 text-rose-400 animate-pulse">
                  <ShieldAlert className="w-12 h-12 mx-auto mb-2" />
                  <div className="text-xl font-black uppercase">Emergency Override Active</div>
                  <div className="text-xs text-rose-300 mt-1">TV screens are displaying emergency directives.</div>
                </div>
              ) : (
                <>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">
                    Now Calling at {currentlyServing?.servicePoint || "Room 1"}
                  </div>
                  <div className="text-5xl font-black text-white font-mono tracking-tight text-cyan-300 drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                    {currentlyServing?.queueNumber || "A-105"}
                  </div>
                  <div className="text-sm font-bold text-gray-300">
                    {currentlyServing?.anonymizedName || "Patient"} • {currentlyServing?.providerName || "Clinician"}
                  </div>
                  <div className="pt-2 border-t border-gray-800/80 flex items-center justify-center gap-6 text-xs text-gray-400">
                    <span>Active Queue: <strong className="text-white">{queueList.length} waiting</strong></span>
                    <span>Mode: <strong className="text-cyan-400 uppercase">{displayMode}</strong></span>
                    <span>Audio: <strong className={audioEnabled ? "text-emerald-400" : "text-amber-400"}>{audioEnabled ? "ON" : "MUTED"}</strong></span>
                  </div>
                </>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                Display Token: <code className="text-gray-400 font-mono">{displayInfo?.token || "disp_active"}</code>
              </span>
              <span>Last Heartbeat: {displayInfo?.lastHeartbeatAt ? new Date(displayInfo.lastHeartbeatAt).toLocaleTimeString() : "Just now"}</span>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="space-y-4">
            <div className="bg-[#0e0e22] border border-gray-800/80 rounded-3xl p-6">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold text-gray-400">Waiting Patients</span>
                <Users className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="text-4xl font-black text-white mt-2 font-mono">{queueList.length}</div>
              <p className="text-xs text-gray-400 mt-1">Average wait time: ~12 minutes</p>
            </div>

            <div className="bg-[#0e0e22] border border-gray-800/80 rounded-3xl p-6">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold text-gray-400">Display Status</span>
                <Tv className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-xl font-black text-emerald-400 mt-2 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                <span>Online & Streaming</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">1080p Fullscreen Sentinel active</p>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            NAVIGATION TABS
            ═══════════════════════════════════════════════════════════════════ */}
        <div className="flex items-center gap-2 border-b border-gray-800 pb-2">
          <button
            onClick={() => setActiveTab("call_patient")}
            className={`px-5 py-2.5 rounded-2xl font-bold text-sm transition-all flex items-center gap-2 ${
              activeTab === "call_patient"
                ? "bg-cyan-600 text-white shadow-lg shadow-cyan-600/30"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Play className="w-4 h-4" />
            <span>Call Patient Panel</span>
          </button>

          <button
            onClick={() => setActiveTab("announcements")}
            className={`px-5 py-2.5 rounded-2xl font-bold text-sm transition-all flex items-center gap-2 ${
              activeTab === "announcements"
                ? "bg-cyan-600 text-white shadow-lg shadow-cyan-600/30"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Announcements & Tickers</span>
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`px-5 py-2.5 rounded-2xl font-bold text-sm transition-all flex items-center gap-2 ${
              activeTab === "settings"
                ? "bg-cyan-600 text-white shadow-lg shadow-cyan-600/30"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Screen & Audio Settings</span>
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 1: CALL PATIENT PANEL
            ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "call_patient" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Quick Call Controls */}
            <div className="bg-[#0e0e22] border border-gray-800 rounded-3xl p-8 space-y-6">
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <Play className="w-5 h-5 text-cyan-400" />
                <span>Call Patient to Station</span>
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Select Waiting Patient (Or Leave Empty to Call Next in Line)
                  </label>
                  <select
                    value={selectedQueueId}
                    onChange={(e) => setSelectedQueueId(e.target.value)}
                    className="w-full px-4 py-3 bg-[#15152e] border border-gray-700 rounded-2xl text-white font-medium focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">-- Automatically Call Next in Line by Priority --</option>
                    {queueList.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.queueNumber} ({q.priority.toUpperCase()}) - {q.department} (Wait: ~{q.estimatedWaitMinutes}m)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Assigned Destination / Service Point
                  </label>
                  <select
                    value={selectedServicePoint}
                    onChange={(e) => setSelectedServicePoint(e.target.value)}
                    className="w-full px-4 py-3 bg-[#15152e] border border-gray-700 rounded-2xl text-white font-medium focus:outline-none focus:border-cyan-500"
                  >
                    {servicePoints.map((sp) => (
                      <option key={sp} value={sp}>
                        {sp}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Department Filter
                  </label>
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="w-full px-4 py-3 bg-[#15152e] border border-gray-700 rounded-2xl text-white font-medium focus:outline-none focus:border-cyan-500"
                  >
                    <option value="General Clinic">General Clinic</option>
                    <option value="Internal Medicine">Internal Medicine</option>
                    <option value="Pediatrics">Pediatrics</option>
                    <option value="Laboratory">Laboratory</option>
                    <option value="Pharmacy">Pharmacy</option>
                    <option value="Triage & Vitals">Triage & Vitals</option>
                  </select>
                </div>

                <button
                  onClick={handleCallNext}
                  disabled={isLoading}
                  className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-base rounded-2xl shadow-xl shadow-cyan-500/25 transition-all flex items-center justify-center gap-2"
                >
                  <Volume2 className="w-5 h-5" />
                  <span>Call to TV Screen & Sound Chime</span>
                </button>
              </div>
            </div>

            {/* Waiting Queue Table */}
            <div className="bg-[#0e0e22] border border-gray-800 rounded-3xl p-8 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-cyan-400" />
                  <span>Active Queue Line</span>
                </h3>
                <button
                  onClick={loadState}
                  className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              <div className="divide-y divide-gray-800/80 max-h-[420px] overflow-y-auto">
                {queueList.length === 0 ? (
                  <div className="py-12 text-center text-gray-500 text-sm">
                    No patients currently waiting in queue.
                  </div>
                ) : (
                  queueList.map((item, idx) => (
                    <div key={item.id} className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-lg bg-[#191938] flex items-center justify-center text-xs font-bold text-gray-400">
                          #{idx + 1}
                        </span>
                        <div>
                          <div className="font-mono font-bold text-white text-base">{item.queueNumber}</div>
                          <div className="text-xs text-gray-400">{item.department}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                            item.priority === "emergency"
                              ? "bg-rose-500/20 text-rose-400"
                              : item.priority === "urgent"
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-gray-800 text-gray-300"
                          }`}
                        >
                          {item.priority}
                        </span>
                        <button
                          onClick={() => {
                            setSelectedQueueId(item.id);
                            handleCallNext();
                          }}
                          className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-bold"
                        >
                          Call Now
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 2: ANNOUNCEMENTS & TICKERS
            ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "announcements" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Create Announcement */}
            <form onSubmit={handleCreateAnnouncement} className="bg-[#0e0e22] border border-gray-800 rounded-3xl p-8 space-y-6">
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-cyan-400" />
                <span>Broadcast New Announcement</span>
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Message Content
                  </label>
                  <textarea
                    rows={4}
                    value={announcementMsg}
                    onChange={(e) => setAnnouncementMsg(e.target.value)}
                    placeholder="e.g. Clinic laboratory will close at 5:00 PM today. Please submit samples promptly."
                    className="w-full px-4 py-3 bg-[#15152e] border border-gray-700 rounded-2xl text-white font-medium focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Announcement Category / Priority
                  </label>
                  <select
                    value={announcementType}
                    onChange={(e) => setAnnouncementType(e.target.value as any)}
                    className="w-full px-4 py-3 bg-[#15152e] border border-gray-700 rounded-2xl text-white font-medium focus:outline-none focus:border-cyan-500"
                  >
                    <option value="info">General Clinic Information (Blue Ticker)</option>
                    <option value="health_tip">Health Education & Tip (Cyan Card)</option>
                    <option value="important">Important Reminder (Amber Banner)</option>
                    <option value="critical">Critical Emergency Notice (Full-Screen Red Takeover)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !announcementMsg.trim()}
                  className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-base rounded-2xl shadow-xl shadow-cyan-500/25 transition-all flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Publish to Waiting Room TVs</span>
                </button>
              </div>
            </form>

            {/* Active Announcements List */}
            <div className="bg-[#0e0e22] border border-gray-800 rounded-3xl p-8 space-y-4">
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                <span>Active TV Announcements</span>
              </h3>

              <div className="space-y-3 max-h-[420px] overflow-y-auto">
                {announcements.map((ann) => (
                  <div
                    key={ann.id}
                    className="p-4 rounded-2xl bg-[#14142c] border border-gray-800 flex items-start justify-between gap-4"
                  >
                    <div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                        {ann.type}
                      </span>
                      <p className="text-sm font-medium text-gray-200 mt-2">{ann.message}</p>
                    </div>

                    <button
                      onClick={() => handleDeleteAnnouncement(ann.id)}
                      className="p-2 text-gray-400 hover:text-rose-400"
                      title="Deactivate Announcement"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 3: SCREEN & AUDIO SETTINGS
            ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "settings" && (
          <div className="bg-[#0e0e22] border border-gray-800 rounded-3xl p-8 space-y-8 max-w-3xl">
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-cyan-400" />
              <span>Waiting Room TV Hardware & Display Settings</span>
            </h3>

            <div className="space-y-6">
              {/* Display Mode */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Display Mode
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setDisplayMode("rotation")}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      displayMode === "rotation"
                        ? "bg-cyan-500/10 border-cyan-500 text-white shadow-lg shadow-cyan-500/20"
                        : "bg-[#14142c] border-gray-800 text-gray-400 hover:text-white"
                    }`}
                  >
                    <div className="font-bold text-sm text-white">Default Rotation Mode</div>
                    <div className="text-xs text-gray-400 mt-1">
                      Cycles through Now Serving, Queue Status, Staff, and Health Tips every {rotationInterval}s.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDisplayMode("persistent_calling")}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      displayMode === "persistent_calling"
                        ? "bg-cyan-500/10 border-cyan-500 text-white shadow-lg shadow-cyan-500/20"
                        : "bg-[#14142c] border-gray-800 text-gray-400 hover:text-white"
                    }`}
                  >
                    <div className="font-bold text-sm text-white">Single Persistent Calling</div>
                    <div className="text-xs text-gray-400 mt-1">
                      Always remains locked on the massive Now Serving ticket view with side queue.
                    </div>
                  </button>
                </div>
              </div>

              {/* Rotation Interval Slider */}
              {displayMode === "rotation" && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Rotation Interval Between Screens
                    </label>
                    <span className="font-bold text-cyan-400 text-sm font-mono">{rotationInterval} seconds</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="60"
                    step="5"
                    value={rotationInterval}
                    onChange={(e) => setRotationInterval(Number(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                </div>
              )}

              {/* Audio Chime Configuration */}
              <div className="pt-4 border-t border-gray-800 space-y-4">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-cyan-400" />
                  <span>Audio Alert & Voice Settings</span>
                </h4>

                <div className="flex items-center justify-between bg-[#14142c] p-4 rounded-2xl border border-gray-800">
                  <div>
                    <div className="font-bold text-sm text-white">Enable Audio Chimes on Call</div>
                    <div className="text-xs text-gray-400">Plays melodic chime and speaks patient code when called</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={audioEnabled}
                    onChange={(e) => setAudioEnabled(e.target.checked)}
                    className="w-5 h-5 accent-cyan-500 cursor-pointer"
                  />
                </div>

                {audioEnabled && (
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                          Audio Volume
                        </label>
                        <span className="font-bold text-cyan-400 text-sm font-mono">{audioVolume}%</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        step="5"
                        value={audioVolume}
                        onChange={(e) => setAudioVolume(Number(e.target.value))}
                        className="w-full accent-cyan-500 cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                        Announcement Voice Language
                      </label>
                      <select
                        value={audioVoice}
                        onChange={(e) => setAudioVoice(e.target.value as any)}
                        className="w-full px-4 py-3 bg-[#15152e] border border-gray-700 rounded-2xl text-white font-medium focus:outline-none focus:border-cyan-500"
                      >
                        <option value="en">English (e.g. &quot;Ticket A-105, please proceed to Room 4&quot;)</option>
                        <option value="am">Amharic / አማርኛ (e.g. &quot;ቲኬት A-105፣ እባክዎ ወደ ክፍል 4 ይሂዱ&quot;)</option>
                        <option value="om">Afaan Oromoo (e.g. &quot;Tikkeettii A-105፣ gara Kutaa 4 qajeelaa&quot;)</option>
                      </select>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={handleSaveSettings}
                disabled={isLoading}
                className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-base rounded-2xl shadow-xl shadow-cyan-500/25 transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Save and Broadcast to TV Screens</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
