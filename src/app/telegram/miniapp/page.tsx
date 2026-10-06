"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Calendar,
  Video,
  User,
  RefreshCw,
  Zap,
  Building2,
  ShieldCheck,
  LogIn,
} from "lucide-react";

declare global {
  interface Window {
    Telegram?: { WebApp?: any };
  }
}

interface TelegramAppt {
  id: string;
  patientName: string;
  queueToken: string;
  scheduledTime: string;
  appointmentType: string;
  reason: string;
  status: string;
}

interface MiniAppUser {
  fullName: string;
  role: string;
  department?: string | null;
  licenseNumber?: string | null;
}

type AuthState = "loading" | "ready" | "not_linked" | "not_telegram" | "error";

const QUEUE_STATUSES = new Set(["scheduled", "confirmed", "checked_in"]);

function clinicToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Addis_Ababa" }).format(new Date());
}

function prettyRole(role: string): string {
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Telegram injects window.Telegram.WebApp via this script; initData is only available once it has run. */
function loadTelegramSdk(): Promise<void> {
  if (window.Telegram?.WebApp) return Promise.resolve();
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-web-app.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => resolve(); // not fatal: fall back to an existing browser session
    document.head.appendChild(script);
  });
}

export default function TelegramMiniAppPage() {
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [me, setMe] = useState<MiniAppUser | null>(null);
  const [isOnDuty, setIsOnDuty] = useState(true);
  const [appointments, setAppointments] = useState<TelegramAppt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"queue" | "schedule" | "status">("queue");

  const fetchToday = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/v1/appointments?date=${clinicToday()}&limit=50`, { credentials: "include" });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.data)) {
        setAppointments(
          data.data.map((a: any) => ({
            id: a.id,
            patientName: a.patientName || "Patient",
            queueToken: a.queueToken || "—",
            scheduledTime: a.scheduledTime || "",
            appointmentType: a.appointmentType || "in_person",
            reason: a.reason || a.specialty || "Consultation",
            status: a.status || "scheduled",
          }))
        );
      }
    } catch {
      /* leave the list empty; the empty state explains it */
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await loadTelegramSdk();
      const tg = window.Telegram?.WebApp;
      tg?.ready?.();
      tg?.expand?.();

      const initData: string = tg?.initData || "";
      try {
        if (initData) {
          const res = await fetch("/api/v1/telegram/miniapp/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ initData }),
          });
          const json = await res.json().catch(() => ({}));
          if (cancelled) return;
          if (res.ok && json.success) {
            setMe(json.user);
            setIsOnDuty(Boolean(json.isOnDuty));
            setAuthState("ready");
          } else {
            setAuthState(json.error === "not_linked" ? "not_linked" : "error");
          }
          return;
        }

        // Opened in a normal browser rather than inside Telegram: use an existing sign-in if there is one.
        const meRes = await fetch("/api/v1/auth/me", { credentials: "include" });
        const meJson = await meRes.json().catch(() => ({}));
        if (cancelled) return;
        if (meRes.ok && meJson.authenticated && meJson.user) {
          setMe(meJson.user);
          setAuthState("ready");
        } else {
          setAuthState("not_telegram");
        }
      } catch {
        if (!cancelled) setAuthState("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (authState === "ready") fetchToday();
    else if (authState !== "loading") setIsLoading(false);
  }, [authState, fetchToday]);

  const toggleDuty = async () => {
    const next = !isOnDuty;
    setIsOnDuty(next);
    try {
      const res = await fetch("/api/v1/telegram/miniapp/duty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ enabled: next }),
      });
      if (!res.ok) setIsOnDuty(!next);
    } catch {
      setIsOnDuty(!next);
    }
  };

  const queue = appointments.filter((a) => QUEUE_STATUSES.has(a.status));

  // ── Gate screens ───────────────────────────────────────────────────────────
  if (authState !== "ready") {
    return (
      <div className="min-h-screen bg-[#0f172a] text-slate-100 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto font-sans">
        <div className="w-12 h-12 rounded-full bg-teal-500/20 text-teal-300 flex items-center justify-center font-bold border border-teal-500/30 mb-4">
          NM
        </div>
        {authState === "loading" && (
          <>
            <RefreshCw className="w-5 h-5 text-teal-400 animate-spin mb-2" />
            <p className="text-xs text-slate-400">Signing you in with Telegram…</p>
          </>
        )}
        {authState === "not_linked" && (
          <>
            <h1 className="text-sm font-bold text-white mb-2">Link your NiniMed account</h1>
            <p className="text-xs text-slate-400 mb-4">
              This Telegram account isn&apos;t linked to a NiniMed user yet. Sign in to NiniMed, open your profile, tap{" "}
              <b>Link Telegram Account</b>, then open the link it gives you.
            </p>
            <Link
              href="/signin"
              className="px-4 py-2 rounded-xl bg-teal-500 text-slate-950 text-xs font-bold flex items-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5" /> Sign in to NiniMed
            </Link>
          </>
        )}
        {authState === "not_telegram" && (
          <>
            <h1 className="text-sm font-bold text-white mb-2">Open this inside Telegram</h1>
            <p className="text-xs text-slate-400 mb-4">
              This is the NiniMed Telegram Mini App. Launch it from the bot&apos;s menu button, or sign in to use the
              full web app.
            </p>
            <Link
              href="/signin"
              className="px-4 py-2 rounded-xl bg-teal-500 text-slate-950 text-xs font-bold flex items-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5" /> Sign in to NiniMed
            </Link>
          </>
        )}
        {authState === "error" && (
          <>
            <h1 className="text-sm font-bold text-white mb-2">Couldn&apos;t sign you in</h1>
            <p className="text-xs text-slate-400 mb-4">
              The session from Telegram could not be verified. Close the Mini App and reopen it from the bot.
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 flex flex-col p-4 max-w-md mx-auto animate-fade-in font-sans">
      {/* Mini App Top App Bar */}
      <header className="flex items-center justify-between py-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-teal-500/20 text-teal-300 flex items-center justify-center font-bold text-xs border border-teal-500/30">
            NM
          </div>
          <div>
            <h1 className="text-sm font-bold text-white leading-tight">NiniMed TMA</h1>
            <p className="text-[10px] text-teal-400">Clinical Provider Mobile Hub</p>
          </div>
        </div>

        {/* On-Duty Toggle (persisted to the same flag the bot's /status button flips) */}
        <button
          onClick={toggleDuty}
          className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all flex items-center gap-1.5 ${
            isOnDuty
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
              : "bg-slate-800 text-slate-400 border border-slate-700"
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${isOnDuty ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`} />
          <span>{isOnDuty ? "On Duty" : "Off Duty"}</span>
        </button>
      </header>

      {/* Tabs */}
      <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-2xl my-3 border border-slate-800 text-xs">
        {(
          [
            ["queue", "Live Queue"],
            ["schedule", "Today"],
            ["status", "Profile"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`py-2 rounded-xl font-bold transition-all ${
              activeTab === key ? "bg-teal-500 text-slate-950 shadow-sm" : "text-slate-400 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 space-y-3">
        {activeTab === "queue" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span>Patients in Queue: {queue.length}</span>
              <button onClick={fetchToday} className="text-teal-400 flex items-center gap-1">
                <Zap className="w-3 h-3" /> Refresh
              </button>
            </div>

            {isLoading ? (
              <div className="py-12 text-center text-xs text-slate-400">
                <RefreshCw className="w-5 h-5 mx-auto text-teal-400 animate-spin mb-2" />
                Loading queue...
              </div>
            ) : queue.length > 0 ? (
              queue.map((appt) => {
                const isVideo = appt.appointmentType === "telehealth";
                return (
                  <div
                    key={appt.id}
                    className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-teal-500/40 space-y-2.5 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{appt.patientName}</span>
                        <span className="font-mono text-[10px] bg-slate-800 text-teal-300 px-1.5 py-0.5 rounded">
                          {appt.queueToken}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">{appt.scheduledTime}</span>
                    </div>

                    <p className="text-xs text-slate-300">{appt.reason}</p>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                      {isVideo ? (
                        <span className="text-[10px] text-blue-400 flex items-center gap-1 font-semibold">
                          <Video className="w-3 h-3" /> Video Visit
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                          <Building2 className="w-3 h-3" /> In-Person Clinic
                        </span>
                      )}

                      {isVideo && (
                        <a
                          href={`/telemedicine/room-${appt.id.slice(0, 8)}?role=clinician&sessionId=${appt.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 rounded-full bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold flex items-center gap-1 shadow-sm"
                        >
                          <Video className="w-3 h-3" />
                          <span>Launch Call</span>
                        </a>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center bg-slate-900/60 rounded-2xl border border-slate-800 text-xs text-slate-400">
                No active patients in the queue today.
              </div>
            )}
          </div>
        )}

        {activeTab === "schedule" && (
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 text-xs">
            <h3 className="font-bold text-white flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-teal-400" />
              Today&apos;s Appointments ({appointments.length})
            </h3>
            {appointments.length === 0 ? (
              <p className="text-slate-400">Nothing scheduled for today.</p>
            ) : (
              <div className="space-y-2">
                {[...appointments]
                  .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))
                  .map((a) => (
                    <div
                      key={a.id}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between gap-3 text-slate-300"
                    >
                      <div>
                        <div className="font-bold text-white">{a.patientName}</div>
                        <div className="text-[11px] text-slate-400">{a.reason}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono text-white">{a.scheduledTime}</div>
                        <div className="text-[10px] text-teal-400">{a.status.replace(/_/g, " ")}</div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "status" && me && (
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 text-xs text-slate-300">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/40 flex items-center justify-center font-bold">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">{me.fullName}</h4>
                <p className="text-[11px] text-teal-400">{prettyRole(me.role)}</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
              {me.department && (
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Department:</span>
                  <span className="text-white">{me.department}</span>
                </div>
              )}
              {me.licenseNumber && (
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">License:</span>
                  <span className="text-white font-mono">{me.licenseNumber}</span>
                </div>
              )}
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Account:</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Verified via Telegram
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="py-2 text-center text-[10px] text-slate-500 border-t border-slate-800/60 mt-4">
        NiniMed Telegram Mini App · Encrypted Healthcare Network
      </footer>
    </div>
  );
}
