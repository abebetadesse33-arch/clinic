"use client";

import { useState, useEffect, useRef } from "react";
import RoleGuard from "@/components/auth/RoleGuard";
import {
  MapPin,
  Wifi,
  WifiOff,
  Plus,
  RefreshCw,
  Users,
  Pill,
  TestTube,
  CheckCircle,
  Clock,
  AlertTriangle,
  Loader2,
  ChevronRight,
  Activity,
  Upload,
  UserPlus,
  Package,
  Navigation,
} from "lucide-react";
import {
  openOfflineDB,
  saveSession,
  saveEncounter,
  getActiveSessions,
  getInventory,
  dispenseMedication,
  getLowStockAlerts,
  runBackgroundSync,
  generateSessionId,
  generateEncounterId,
  type OfflineEncounter,
  type MobileInventoryItem,
} from "@/lib/mobile-clinic/sync-engine";

type AppView = "home" | "new_session" | "encounter" | "inventory" | "sync";

interface GpsPosition { lat: number; lng: number; accuracy: number }

interface SyncSummary { pending: number; synced: number; failed: number }

export default function MobileClinicPage() {
  return (
    <RoleGuard
      allowedRoles={[
        "physician",
        "nurse_practitioner",
        "nurse",
        "care_coordinator",
        "social_worker",
        "pharmacist",
        "system_admin",
        "tenant_admin",
      ]}
      fallbackTitle="Mobile Van Clinic & Offline Sync"
      fallbackMessage="Access to field triage, mobile medication stock, and offline sync engines is restricted to mobile clinical team staff."
    >
      <MobileClinicContent />
    </RoleGuard>
  );
}

function MobileClinicContent() {
  const [isOnline, setIsOnline] = useState(true);
  const [view, setView] = useState<AppView>("home");
  const [gps, setGps] = useState<GpsPosition | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [syncSummary, setSyncSummary] = useState<SyncSummary>({ pending: 0, synced: 0, failed: 0 });
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeSessions, setActiveSessions] = useState<Awaited<ReturnType<typeof getActiveSessions>>>([]);
  const [inventory, setInventory] = useState<MobileInventoryItem[]>([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<MobileInventoryItem[]>([]);
  const [currentEncounter, setCurrentEncounter] = useState<Partial<OfflineEncounter>>({});
  const [sessionForm, setSessionForm] = useState({ locationName: "", targetCount: 30 });
  const [isSavingSession, setIsSavingSession] = useState(false);
  const [isSavingEncounter, setIsSavingEncounter] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [dbReady, setDbReady] = useState(false);

  // Network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOnline(navigator.onLine);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Init IndexedDB
  useEffect(() => {
    openOfflineDB()
      .then(() => { setDbReady(true); refreshData(); })
      .catch((e) => console.error("IndexedDB init failed:", e));
  }, []);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && dbReady) {
      handleSync();
    }
  }, [isOnline, dbReady]);

  const refreshData = async () => {
    try {
      const inv = await getInventory();
      setInventory(inv);
      const low = await getLowStockAlerts();
      setLowStockAlerts(low);
      const sessions = await getActiveSessions("current-staff");
      setActiveSessions(sessions);
    } catch (e) {
      console.error("Refresh error:", e);
    }
  };

  const acquireGPS = () => {
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
        setIsLocating(false);
      },
      (err) => {
        console.error("GPS error:", err);
        // Fallback coordinates for Addis Ababa
        setGps({ lat: 9.0232, lng: 38.7469, accuracy: 100 });
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const createSession = async () => {
    if (!sessionForm.locationName) return;
    setIsSavingSession(true);
    try {
      const sessionId = generateSessionId();
      const session = {
        sessionId,
        staffId: "current-staff",
        gpsLat: gps?.lat || 0,
        gpsLng: gps?.lng || 0,
        locationName: sessionForm.locationName,
        startedAt: Date.now(),
        encounters: [],
        isActive: true,
      };
      await saveSession(session);

      // Also create on server if online
      if (isOnline) {
        await fetch("/api/v1/mobile-clinic-sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenantId: "00000000-0000-0000-0000-000000000001",
            staffLeadId: "11111111-1111-1111-1111-111111111101",
            locationName: sessionForm.locationName,
            gpsLatitude: gps?.lat,
            gpsLongitude: gps?.lng,
            targetPatientsCount: sessionForm.targetCount,
          }),
        });
      }

      await refreshData();
      setView("home");
    } catch (e) {
      console.error("Create session error:", e);
    } finally {
      setIsSavingSession(false);
    }
  };

  const saveCurrentEncounter = async () => {
    if (!currentEncounter.chiefComplaint) return;
    setIsSavingEncounter(true);
    try {
      const encounter: OfflineEncounter = {
        encounterId: generateEncounterId(),
        sessionId: activeSessions[0]?.sessionId || "offline-session",
        patientId: currentEncounter.patientId,
        tempPatientRef: currentEncounter.tempPatientRef || `TEMP-${Date.now()}`,
        chiefComplaint: currentEncounter.chiefComplaint || "",
        vitals: currentEncounter.vitals || {},
        clinicalNotes: currentEncounter.clinicalNotes || "",
        prescriptions: currentEncounter.prescriptions || [],
        labTests: currentEncounter.labTests || [],
        dispensedItems: currentEncounter.dispensedItems || [],
        createdAt: Date.now(),
        syncStatus: isOnline ? "synced" : "pending",
      };
      await saveEncounter(encounter);
      setSyncSummary((s) => ({ ...s, pending: s.pending + (isOnline ? 0 : 1) }));
      setCurrentEncounter({});
      setView("home");
    } catch (e) {
      console.error("Save encounter error:", e);
    } finally {
      setIsSavingEncounter(false);
    }
  };

  const handleSync = async () => {
    if (!isOnline) return;
    setIsSyncing(true);
    try {
      const result = await runBackgroundSync("", "demo-token");
      setSyncSummary((s) => ({
        pending: Math.max(0, s.pending - result.synced),
        synced: s.synced + result.synced,
        failed: result.failed,
      }));
      setLastSyncTime(new Date());
    } catch (e) {
      console.error("Sync error:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  const dispenseItem = async (drugName: string, qty: number) => {
    const success = await dispenseMedication(drugName, qty);
    if (success) {
      await refreshData();
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white">
      {/* PWA Top Bar */}
      <div className="bg-[#1a1a2e] border-b border-[#2d2d4e] sticky top-0 z-20 safe-area-inset-top">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-600 to-teal-600 flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Mobile Clinic</div>
              <div className="text-[10px] text-gray-400">Field Outreach PWA</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Sync status badge */}
            {syncSummary.pending > 0 && (
              <div className="flex items-center gap-1 bg-orange-900/40 border border-orange-700 text-orange-300 text-xs px-2 py-1 rounded-full">
                <Clock className="w-3 h-3" />
                {syncSummary.pending} pending
              </div>
            )}
            {/* Online/offline indicator */}
            <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
              isOnline ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"
            }`}>
              {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {isOnline ? "Online" : "Offline"}
            </div>
          </div>
        </div>

        {/* Nav tabs */}
        <div className="flex border-t border-[#2d2d4e]">
          {[
            { id: "home" as AppView, icon: Activity, label: "Dashboard" },
            { id: "encounter" as AppView, icon: UserPlus, label: "New Encounter" },
            { id: "inventory" as AppView, icon: Package, label: "Pharmacy" },
            { id: "sync" as AppView, icon: Upload, label: "Sync" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              className={`flex-1 flex flex-col items-center py-2 text-[10px] transition-all ${
                view === tab.id ? "text-green-400 border-t-2 border-green-400" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <tab.icon className="w-4 h-4 mb-0.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-5 max-w-lg mx-auto">
        {/* ── Dashboard ── */}
        {view === "home" && (
          <div className="space-y-4">
            {/* GPS Card */}
            <div className="bg-[#1a1a2e] border border-[#2d2d4e] rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-sm flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-green-400" />
                  GPS Location
                </h2>
                <button
                  onClick={acquireGPS}
                  disabled={isLocating}
                  className="text-xs px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-1 transition-all"
                >
                  {isLocating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />}
                  {isLocating ? "Acquiring…" : "Get GPS"}
                </button>
              </div>
              {gps ? (
                <div className="text-xs text-gray-400 space-y-1">
                  <div>📍 {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}</div>
                  <div className="text-green-400">Accuracy: ±{Math.round(gps.accuracy)}m</div>
                  <div className="h-24 rounded-lg bg-[#12122a] border border-[#2d2d4e] flex items-center justify-center text-gray-600 text-xs">
                    [Map would render here — Leaflet.js in production]
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-500">Tap "Get GPS" to confirm your field location before starting sessions.</p>
              )}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Today's Encounters", value: "0", color: "text-blue-400", icon: Users },
                { label: "Pending Sync", value: syncSummary.pending.toString(), color: "text-orange-400", icon: Upload },
                { label: "Low Stock Items", value: lowStockAlerts.length.toString(), color: "text-red-400", icon: AlertTriangle },
              ].map((stat) => (
                <div key={stat.label} className="bg-[#1a1a2e] border border-[#2d2d4e] rounded-xl p-3 text-center">
                  <stat.icon className={`w-5 h-5 mx-auto mb-1 ${stat.color}`} />
                  <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
                  <div className="text-[10px] text-gray-500 leading-tight">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Start Session */}
            <div className="bg-[#1a1a2e] border border-[#2d2d4e] rounded-2xl p-4">
              <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-teal-400" />
                Start Outreach Session
              </h2>
              <input
                value={sessionForm.locationName}
                onChange={(e) => setSessionForm((f) => ({ ...f, locationName: e.target.value }))}
                placeholder="Location name (e.g. Bole Community Center)"
                className="w-full bg-[#12122a] border border-[#2d2d4e] rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-500 mb-3"
              />
              <div className="flex items-center gap-2 mb-3">
                <label className="text-xs text-gray-400 whitespace-nowrap">Target patients:</label>
                <input
                  type="number"
                  value={sessionForm.targetCount}
                  onChange={(e) => setSessionForm((f) => ({ ...f, targetCount: parseInt(e.target.value) || 0 }))}
                  className="flex-1 bg-[#12122a] border border-[#2d2d4e] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
                />
              </div>
              <button
                onClick={createSession}
                disabled={isSavingSession || !sessionForm.locationName}
                className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
              >
                {isSavingSession ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Start Session
              </button>
            </div>

            {/* Low Stock Alerts */}
            {lowStockAlerts.length > 0 && (
              <div className="bg-red-900/20 border border-red-800 rounded-2xl p-4">
                <h3 className="text-red-300 font-semibold text-sm mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Low Stock Alerts
                </h3>
                <div className="space-y-1">
                  {lowStockAlerts.map((item) => (
                    <div key={item.drugName} className="flex items-center justify-between text-xs">
                      <span className="text-red-200">{item.drugName} {item.strength}</span>
                      <span className="text-red-400 font-bold">{item.quantity} left (min: {item.minStockLevel})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── New Encounter ── */}
        {view === "encounter" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <UserPlus className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-bold">New Patient Encounter</h2>
            </div>

            <div className="bg-[#1a1a2e] border border-[#2d2d4e] rounded-2xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-300">Patient Identification</h3>
              <input
                value={currentEncounter.patientId || ""}
                onChange={(e) => setCurrentEncounter((enc) => ({ ...enc, patientId: e.target.value }))}
                placeholder="Patient ID (leave blank for unregistered)"
                className="w-full bg-[#12122a] border border-[#2d2d4e] rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
              />
              <input
                value={currentEncounter.tempPatientRef || ""}
                onChange={(e) => setCurrentEncounter((enc) => ({ ...enc, tempPatientRef: e.target.value }))}
                placeholder="Patient name / temp reference"
                className="w-full bg-[#12122a] border border-[#2d2d4e] rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="bg-[#1a1a2e] border border-[#2d2d4e] rounded-2xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-300">Chief Complaint *</h3>
              <textarea
                value={currentEncounter.chiefComplaint || ""}
                onChange={(e) => setCurrentEncounter((enc) => ({ ...enc, chiefComplaint: e.target.value }))}
                placeholder="Describe the patient's main complaint…"
                rows={3}
                className="w-full bg-[#12122a] border border-[#2d2d4e] rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>

            <div className="bg-[#1a1a2e] border border-[#2d2d4e] rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-pink-400" /> Vital Signs
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: "systolicBP", label: "Systolic BP", unit: "mmHg", placeholder: "120" },
                  { key: "diastolicBP", label: "Diastolic BP", unit: "mmHg", placeholder: "80" },
                  { key: "heartRate", label: "Heart Rate", unit: "bpm", placeholder: "72" },
                  { key: "temperature", label: "Temperature", unit: "°C", placeholder: "36.6" },
                  { key: "oxygenSaturation", label: "SpO₂", unit: "%", placeholder: "98" },
                  { key: "bloodGlucose", label: "Blood Glucose", unit: "mg/dL", placeholder: "90" },
                ].map((v) => (
                  <div key={v.key}>
                    <label className="text-[10px] text-gray-500 block mb-1">{v.label} ({v.unit})</label>
                    <input
                      type="number"
                      placeholder={v.placeholder}
                      value={(currentEncounter.vitals as Record<string, number | undefined>)?.[v.key] || ""}
                      onChange={(e) =>
                        setCurrentEncounter((enc) => ({
                          ...enc,
                          vitals: { ...(enc.vitals || {}), [v.key]: parseFloat(e.target.value) || undefined },
                        }))
                      }
                      className="w-full bg-[#12122a] border border-[#2d2d4e] rounded-lg px-2 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#1a1a2e] border border-[#2d2d4e] rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Clinical Notes</h3>
              <textarea
                value={currentEncounter.clinicalNotes || ""}
                onChange={(e) => setCurrentEncounter((enc) => ({ ...enc, clinicalNotes: e.target.value }))}
                placeholder="Examination findings, assessment, and plan…"
                rows={4}
                className="w-full bg-[#12122a] border border-[#2d2d4e] rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>

            <button
              onClick={saveCurrentEncounter}
              disabled={isSavingEncounter || !currentEncounter.chiefComplaint}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
            >
              {isSavingEncounter ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Save Encounter {!isOnline && "(Offline)"}
            </button>
          </div>
        )}

        {/* ── Pharmacy Inventory ── */}
        {view === "inventory" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Package className="w-5 h-5 text-purple-400" /> Mobile Pharmacy
              </h2>
              <button onClick={refreshData} className="p-2 bg-[#2d2d4e] rounded-lg text-gray-400 hover:text-white transition-all">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {inventory.length === 0 ? (
              <div className="bg-[#1a1a2e] border border-[#2d2d4e] rounded-2xl p-8 text-center">
                <Package className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                <p className="text-gray-400 text-sm">No inventory loaded.</p>
                <p className="text-gray-600 text-xs mt-1">Inventory syncs from the main pharmacy when online.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {inventory.map((item) => {
                  const isLow = item.quantity <= item.minStockLevel;
                  return (
                    <div key={item.drugName} className={`rounded-xl p-4 border ${isLow ? "bg-red-900/20 border-red-800" : "bg-[#1a1a2e] border-[#2d2d4e]"}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="font-semibold text-sm text-white">{item.drugName} {item.strength}</div>
                          <div className="text-xs text-gray-500">{item.dosageForm} · Lot: {item.lotNumber}</div>
                        </div>
                        <div className="text-right">
                          <div className={`text-lg font-bold ${isLow ? "text-red-400" : "text-white"}`}>{item.quantity}</div>
                          <div className="text-[10px] text-gray-500">in stock</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-500">Expires: {item.expiryDate}</div>
                        <button
                          onClick={() => dispenseItem(item.drugName, 1)}
                          className="text-xs px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all flex items-center gap-1"
                        >
                          <Pill className="w-3 h-3" /> Dispense 1
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Sync Panel ── */}
        {view === "sync" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-400" /> Data Synchronization
            </h2>

            <div className="bg-[#1a1a2e] border border-[#2d2d4e] rounded-2xl p-5">
              <div className={`flex items-center gap-3 mb-4 p-3 rounded-xl ${isOnline ? "bg-green-900/20 border border-green-800" : "bg-red-900/20 border border-red-800"}`}>
                {isOnline ? <Wifi className="w-5 h-5 text-green-400" /> : <WifiOff className="w-5 h-5 text-red-400" />}
                <div>
                  <div className={`text-sm font-semibold ${isOnline ? "text-green-300" : "text-red-300"}`}>
                    {isOnline ? "Connected to Server" : "Working Offline"}
                  </div>
                  {lastSyncTime && (
                    <div className="text-xs text-gray-500">Last sync: {lastSyncTime.toLocaleTimeString()}</div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { label: "Pending", value: syncSummary.pending, color: "text-orange-400" },
                  { label: "Synced", value: syncSummary.synced, color: "text-green-400" },
                  { label: "Failed", value: syncSummary.failed, color: "text-red-400" },
                ].map((s) => (
                  <div key={s.label} className="bg-[#12122a] rounded-xl p-3 text-center">
                    <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-[10px] text-gray-500">{s.label}</div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleSync}
                disabled={isSyncing || !isOnline}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
              >
                {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {isSyncing ? "Syncing…" : isOnline ? "Sync Now" : "Unavailable Offline"}
              </button>
            </div>

            <div className="bg-[#1a1a2e] border border-[#2d2d4e] rounded-2xl p-4">
              <h3 className="text-sm font-semibold mb-3 text-gray-300">Sync Protocol</h3>
              <div className="space-y-2 text-xs text-gray-500">
                <div className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-400" /> Idempotent requests (safe to retry)</div>
                <div className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-400" /> Conflict detection via payload checksums</div>
                <div className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-400" /> Encounters stored locally until sync succeeds</div>
                <div className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-400" /> Automatic retry on reconnect</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
