"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { soundAlerts } from "@/lib/audio/sound-alerts";
import {
  Calendar, Video, Building2, CheckCircle2, XCircle, Clock,
  RefreshCw, User, Zap, ChevronRight, Volume2, VolumeX
} from "lucide-react";

interface BookingCard {
  id: string;
  patientId: string;
  appointmentType: "telehealth" | "in_person" | string;
  specialty: string;
  scheduledDate: string;
  scheduledTime: string;
  reason: string;
  queueToken: string;
  status: string;
  joinUrls?: { patient: string; clinician: string } | null;
  patientName?: string;
}

interface IncomingBookingPanelProps {
  clinicianId: string;
}

export default function IncomingBookingPanel({ clinicianId }: IncomingBookingPanelProps) {
  const [bookings, setBookings] = useState<BookingCard[]>([]);
  const [responding, setResponding] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [isAudioMuted, setIsAudioMuted] = useState(soundAlerts.getIsMuted());
  const prevCountRef = useRef<number>(0);

  const fetchBookings = useCallback(async () => {
    if (!clinicianId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/v1/appointments?clinicianId=${clinicianId}&status=scheduled`, { cache: "no-store" });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        const enriched: BookingCard[] = data.data.map((appt: any) => ({
          id: appt.id,
          patientId: appt.patientId,
          appointmentType: appt.appointmentType,
          specialty: appt.specialty || "General",
          scheduledDate: appt.scheduledDate,
          scheduledTime: appt.scheduledTime,
          reason: appt.reason || "Consultation",
          queueToken: appt.queueToken || "—",
          status: appt.status,
          joinUrls: appt.joinUrls || null,
          patientName: appt.patientName || null,
        }));

        // Trigger Audio Chime if new bookings arrived!
        if (enriched.length > prevCountRef.current && prevCountRef.current !== 0) {
          soundAlerts.playBookingAlertBeep();
        }
        prevCountRef.current = enriched.length;

        setBookings(enriched);
        setLastRefreshed(new Date());
      }
    } catch { /* silent */ } finally {
      setIsLoading(false);
    }
  }, [clinicianId]);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    fetchBookings();
    const interval = setInterval(fetchBookings, 15000);
    return () => clearInterval(interval);
  }, [fetchBookings]);

  const respond = async (appointmentId: string, action: "accept" | "decline") => {
    setResponding(appointmentId);
    try {
      const res = await fetch(`/api/v1/appointments/${appointmentId}/respond`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, clinicianId }),
      });
      const data = await res.json();
      if (data.success) {
        // Remove from pending list on accept/decline
        setBookings((prev) => prev.filter((b) => b.id !== appointmentId));
      }
    } catch { /* silent */ } finally {
      setResponding(null);
    }
  };

  const isVideo = (type: string) => type === "telehealth";

  if (!clinicianId) return null;

  return (
    <div className="bg-white rounded-2xl border border-[#E7E2D8] shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#F2EFE9] bg-[#FAF8F5]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#E8F4F0] text-[#005C4B] flex items-center justify-center">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-sm text-[#162E27]">Incoming Bookings</div>
            <div className="text-[11px] text-[#687B74]">
              {isLoading ? "Refreshing…" : `${bookings.length} pending · Last updated ${lastRefreshed.toLocaleTimeString()}`}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              const nextMuted = !isAudioMuted;
              setIsAudioMuted(nextMuted);
              soundAlerts.setMuted(nextMuted);
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#E8F4F0] border border-[#E7E2D8] transition-all"
            title={isAudioMuted ? "Sound Muted (Click to Enable)" : "Sound Alerts Active"}
          >
            {isAudioMuted ? (
              <VolumeX className="w-3.5 h-3.5 text-rose-500" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-[#005C4B]" />
            )}
          </button>
          <button
            onClick={fetchBookings}
            disabled={isLoading}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#E8F4F0] border border-[#E7E2D8] transition-all disabled:opacity-50"
            title="Refresh bookings"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#005C4B] ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Booking Cards */}
      <div className="divide-y divide-[#F2EFE9] max-h-[420px] overflow-y-auto">
        {bookings.length === 0 ? (
          <div className="py-10 text-center">
            <CheckCircle2 className="w-8 h-8 mx-auto text-[#B5DACF] mb-2" />
            <p className="text-sm text-[#687B74]">No pending bookings</p>
            <p className="text-[11px] text-[#B5DACF] mt-0.5">New appointments will appear here automatically</p>
          </div>
        ) : (
          bookings.map((booking) => (
            <div key={booking.id} className="p-4 hover:bg-[#FAF8F5] transition-all">
              {/* Modality + Status Row */}
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  {isVideo(booking.appointmentType) ? (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2.5 py-0.5">
                      <Video className="w-3 h-3" /> Video Visit
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
                      <Building2 className="w-3 h-3" /> In-Person
                    </span>
                  )}
                  <span className="text-[11px] text-[#687B74] font-mono bg-[#F2EFE9] px-2 py-0.5 rounded">
                    {booking.queueToken}
                  </span>
                </div>
                <span className="flex items-center gap-1 text-[11px] text-[#687B74]">
                  <Clock className="w-3 h-3" />
                  {booking.scheduledDate} · {booking.scheduledTime}
                </span>
              </div>

              {/* Patient Info */}
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-[#005C4B] text-white text-xs font-bold flex items-center justify-center shrink-0">
                  <User className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#162E27]">
                    {booking.patientName || `Patient · ${booking.patientId.slice(0, 8)}…`}
                  </div>
                  <div className="text-[11px] text-[#687B74]">{booking.specialty} · {booking.reason}</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <button
                  id={`accept-booking-${booking.id}`}
                  onClick={() => respond(booking.id, "accept")}
                  disabled={responding === booking.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#005C4B] text-white text-xs font-bold hover:bg-[#004A3C] transition-all disabled:opacity-50 shadow-sm"
                >
                  {responding === booking.id ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  Accept & Notify Patient
                </button>

                {isVideo(booking.appointmentType) && (
                  <a
                    id={`join-room-${booking.id}`}
                    href={booking.joinUrls?.clinician || `/telemedicine/room-${booking.id.slice(0, 8)}?role=clinician`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-all shadow-sm"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Video className="w-3.5 h-3.5" />
                    Enter Video Room
                  </a>
                )}

                {!isVideo(booking.appointmentType) && (
                  <span className="flex items-center gap-1 text-[11px] text-[#687B74] bg-[#F2EFE9] px-2.5 py-1.5 rounded-full">
                    <Building2 className="w-3 h-3" />
                    In-person · Token: {booking.queueToken}
                  </span>
                )}

                <button
                  id={`decline-booking-${booking.id}`}
                  onClick={() => respond(booking.id, "decline")}
                  disabled={responding === booking.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#E7E2D8] text-[#687B74] text-xs font-medium hover:border-red-300 hover:text-red-600 hover:bg-red-50 transition-all disabled:opacity-50 ml-auto"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Decline
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer hint */}
      {bookings.length > 0 && (
        <div className="px-5 py-2.5 border-t border-[#F2EFE9] bg-[#FAF8F5] flex items-center justify-between">
          <span className="text-[11px] text-[#687B74] flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-500" />
            Auto-refreshes every 15 seconds
          </span>
          <a href="/cases" className="text-[11px] text-[#005C4B] font-semibold flex items-center gap-0.5 hover:underline">
            View all cases <ChevronRight className="w-3 h-3" />
          </a>
        </div>
      )}
    </div>
  );
}
