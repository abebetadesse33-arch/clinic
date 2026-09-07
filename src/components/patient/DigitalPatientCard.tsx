"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  QrCode,
  Download,
  Copy,
  CheckCircle2,
  MapPin,
  Calendar,
  Heart,
  Droplet,
  Smartphone,
  Sparkles,
  ArrowRight,
  Printer,
  Building2,
  Key,
  Share2,
} from "lucide-react";

export interface PatientCardData {
  cardId: string;
  mrn: string;
  patientName: string;
  nationalId: string;
  nationalIdVerified?: boolean;
  phone?: string;
  email?: string;
  bloodType?: string;
  primaryClinic?: string;
  issuedAt?: string;
  validUntil?: string;
  status?: string;
  loginPasscode?: string;
  qrData?: string;
}

interface Props {
  card: PatientCardData;
  onProceed?: () => void;
  showProceedButton?: boolean;
  onShareMedicalRecord?: () => void;
}

export default function DigitalPatientCard({
  card,
  onProceed,
  showProceedButton = true,
  onShareMedicalRecord,
}: Props) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedCardId, setCopiedCardId] = useState(false);

  const handleCopyCode = () => {
    if (card.loginPasscode) {
      navigator.clipboard.writeText(card.loginPasscode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleCopyCardId = () => {
    navigator.clipboard.writeText(card.cardId);
    setCopiedCardId(true);
    setTimeout(() => setCopiedCardId(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full max-w-lg mx-auto space-y-4 animate-slide-up">
      {/* ── DIGITAL CARD ─────────────────────────────────────────────────── */}
      <div className="relative rounded-3xl overflow-hidden p-6 sm:p-7 bg-gradient-to-br from-[#005C4B] via-[#0A261E] to-[#04140F] border border-[#52B788]/30 shadow-2xl text-white space-y-5">
        {/* Holographic Watermark & Pattern */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Card Top Header */}
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-md">
              <span className="text-lg">🌿</span>
            </div>
            <div>
              <span className="text-xs font-black tracking-wider uppercase text-emerald-300 block">
                NiniMed Health Network
              </span>
              <span className="text-[10px] text-slate-300 font-medium">Digital Medical ID & Care Pass</span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-extrabold flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            3-Month Active Pass
          </span>
        </div>

        {/* Middle Section: Patient Details & QR */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 relative z-10 items-center">
          {/* Details */}
          <div className="sm:col-span-2 space-y-3">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                Patient Name
              </span>
              <h2 className="text-xl font-extrabold text-white tracking-tight mt-0.5">
                {card.patientName}
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[9px] uppercase text-slate-400 block font-bold">MRN Number</span>
                <span className="font-mono font-bold text-white text-sm">{card.mrn}</span>
              </div>
              {card.bloodType && (
                <div>
                  <span className="text-[9px] uppercase text-slate-400 block font-bold">Blood Type</span>
                  <span className="font-mono font-bold text-rose-300 text-sm flex items-center gap-1">
                    <Droplet className="w-3 h-3 text-rose-400" /> {card.bloodType}
                  </span>
                </div>
              )}
            </div>

            {/* National ID Badge */}
            <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 backdrop-blur-md space-y-0.5">
              <span className="text-[9px] uppercase text-slate-400 block font-bold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" /> Ethiopian National / Fayda ID
              </span>
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs text-emerald-200">{card.nationalId}</span>
                <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-black uppercase">
                  Verified ✓
                </span>
              </div>
            </div>
          </div>

          {/* QR Code */}
          <div className="sm:col-span-1 flex flex-col items-center justify-center p-3 rounded-2xl bg-white text-slate-950 shadow-xl space-y-1">
            <QrCode className="w-20 h-20 text-slate-900" />
            <span className="text-[8px] font-mono font-black text-slate-600 uppercase tracking-tighter text-center">
              Scan at Kiosk
            </span>
          </div>
        </div>

        {/* Primary Clinic Branch */}
        {card.primaryClinic && (
          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-slate-300 relative z-10">
            <span className="flex items-center gap-1.5 text-[11px]">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              {card.primaryClinic}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              Exp: {card.validUntil || "90 Days"}
            </span>
          </div>
        )}

        {/* Card Number Footer */}
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1 relative z-10 border-t border-white/10">
          <span>Card: {card.cardId}</span>
          <button
            onClick={handleCopyCardId}
            className="text-emerald-300 hover:text-white flex items-center gap-1 text-[10px] transition-colors"
          >
            {copiedCardId ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            {copiedCardId ? "Copied" : "Copy ID"}
          </button>
        </div>
      </div>

      {/* ── LOGIN PASSCODE BANNER ────────────────────────────────────────── */}
      {card.loginPasscode && (
        <div className="p-4 rounded-2xl bg-slate-900 border border-teal-500/40 flex items-center justify-between gap-3 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center shrink-0">
              <Key className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-teal-400 tracking-wider block">
                Instant Patient Login Passcode
              </span>
              <span className="text-lg font-mono font-black text-white tracking-widest block">
                {card.loginPasscode}
              </span>
            </div>
          </div>
          <button
            onClick={handleCopyCode}
            className="px-3 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-md"
          >
            {copiedCode ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedCode ? "Copied!" : "Copy Code"}
          </button>
        </div>
      )}

      {/* ── ACTION BUTTONS ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2.5 pt-1">
        <button
          onClick={handlePrint}
          className="flex-1 min-w-[130px] flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-bold transition-all"
        >
          <Printer className="w-4 h-4 text-slate-400" />
          Print Card
        </button>

        {onShareMedicalRecord && (
          <button
            onClick={onShareMedicalRecord}
            className="flex-1 min-w-[150px] flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-teal-900/60 hover:bg-teal-800/80 border border-teal-500/40 text-teal-200 text-xs font-bold transition-all shadow-md"
          >
            <Share2 className="w-4 h-4 text-teal-300" />
            Share Medical QR
          </button>
        )}

        {showProceedButton && onProceed && (
          <button
            onClick={onProceed}
            className="flex-1 min-w-[180px] flex items-center justify-center gap-2 py-3 px-5 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs transition-all shadow-xl shadow-teal-950/40"
          >
            <span>Proceed to Patient Portal</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
