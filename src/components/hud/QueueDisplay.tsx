"use client";

import React from "react";
import { HudPanel } from "./HudPanel";
import { StatusPill } from "./StatusPill";

export interface QueueTicket {
  ticketNumber: string;
  roomOrCounter: string;
  department: string;
  status: "calling" | "waiting" | "in-service";
}

export interface QueueDisplayProps {
  currentCall?: QueueTicket;
  upcomingQueue?: QueueTicket[];
  clinicName?: string;
  className?: string;
}

export function QueueDisplay({
  currentCall = {
    ticketNumber: "A-104",
    roomOrCounter: "EXAM ROOM 3",
    department: "CARDIOLOGY",
    status: "calling",
  },
  upcomingQueue = [
    { ticketNumber: "A-105", roomOrCounter: "WAITING", department: "CARDIOLOGY", status: "waiting" },
    { ticketNumber: "B-202", roomOrCounter: "EXAM ROOM 1", department: "GENERAL", status: "in-service" },
    { ticketNumber: "A-106", roomOrCounter: "WAITING", department: "CARDIOLOGY", status: "waiting" },
    { ticketNumber: "C-301", roomOrCounter: "LAB 2", department: "PATHOLOGY", status: "waiting" },
  ],
  clinicName = "NINIMED CENTRAL CLINICAL TRIAGE",
  className = "",
}: QueueDisplayProps) {
  return (
    <div className={`w-full max-w-6xl mx-auto select-none ${className}`}>
      {/* Top TV Bar */}
      <div className="flex items-center justify-between py-2.5 px-4 mb-4 bg-slate-950/80 border-b border-cyan-500/30 rounded-t-lg">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
          <h2 className="font-heading font-bold text-sm tracking-widest text-cyan-300 uppercase">
            {clinicName}
          </h2>
        </div>
        <StatusPill variant="online" label="DISPATCH ACTIVE" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Calling Spotlight (Large TV tile) */}
        <div className="lg:col-span-7">
          <HudPanel
            variant="refract"
            depth="lg"
            className="p-8 text-center border-cyan-400/40 relative overflow-hidden"
          >
            <span className="inline-block font-mono text-xs uppercase tracking-widest text-cyan-400 font-bold mb-2">
              NOW CALLING · አሁን የሚጠሩት
            </span>

            <div className="my-6">
              <span
                className="font-heading font-black text-7xl sm:text-8xl tracking-tight text-cyan-300 block"
                style={{
                  textShadow: "0 0 35px rgba(0, 240, 255, 0.6), 0 0 10px rgba(0, 240, 255, 0.9)",
                }}
              >
                {currentCall.ticketNumber}
              </span>
            </div>

            <div className="pt-4 border-t border-cyan-500/20 flex items-center justify-around font-mono">
              <div>
                <span className="text-xs text-slate-400 uppercase block">LOCATION</span>
                <span className="text-xl font-bold text-slate-100">{currentCall.roomOrCounter}</span>
              </div>
              <div className="h-8 w-px bg-slate-800" />
              <div>
                <span className="text-xs text-slate-400 uppercase block">DEPARTMENT</span>
                <span className="text-xl font-bold text-emerald-400">{currentCall.department}</span>
              </div>
            </div>
          </HudPanel>
        </div>

        {/* Next in Queue Queue list */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          <div className="px-1 flex items-center justify-between font-mono text-xs text-slate-400 uppercase tracking-wider">
            <span>UPCOMING TICKETS</span>
            <span>DESTINATION</span>
          </div>

          {upcomingQueue.map((item, idx) => (
            <HudPanel
              key={idx}
              variant="flat"
              depth="sm"
              className="p-3.5 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="font-heading font-bold text-xl text-cyan-400">
                  {item.ticketNumber}
                </span>
                <span className="font-mono text-xs text-slate-400">
                  {item.department}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-slate-300 font-semibold">
                  {item.roomOrCounter}
                </span>
                <StatusPill
                  variant={item.status === "in-service" ? "warning" : "info"}
                  label={item.status === "in-service" ? "IN EXAM" : "WAIT"}
                />
              </div>
            </HudPanel>
          ))}
        </div>
      </div>
    </div>
  );
}

export default QueueDisplay;
