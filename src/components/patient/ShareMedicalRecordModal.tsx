"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  QrCode,
  Copy,
  CheckCircle2,
  Lock,
  Clock,
  ExternalLink,
  Share2,
  Sparkles,
  X,
  Loader2,
  Eye,
  AlertCircle,
} from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  patientId?: string;
  patientName?: string;
  pageMode?: boolean;
}

export default function ShareMedicalRecordModal({
  isOpen,
  onClose,
  patientId,
  patientName = "Patient",
  pageMode = false,
}: Props) {
  const [durationHours, setDurationHours] = useState(24);
  const [doctorName, setDoctorName] = useState("");
  const [passcode, setPasscode] = useState("");
  const [includeMedications, setIncludeMedications] = useState(true);
  const [includeLabs, setIncludeLabs] = useState(true);
  const [includeConditions, setIncludeConditions] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [shareData, setShareData] = useState<any>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen && !pageMode) return null;

  const handleGenerateSharePass = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    const accessScope: string[] = ["allergies", "emergency_contacts"];
    if (includeMedications) accessScope.push("medications");
    if (includeLabs) accessScope.push("lab_results");
    if (includeConditions) accessScope.push("conditions");

    try {
      const res = await fetch("/api/v1/patient/share-record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          durationHours,
          accessScope,
          passcode: passcode.trim() || undefined,
          doctorName: doctorName.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        setErrorMsg(json.error || "Failed to generate share pass.");
      } else {
        setShareData(json.data);
      }
    } catch {
      setErrorMsg("Network error generating QR pass.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (shareData?.shareUrl) {
      navigator.clipboard.writeText(shareData.shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div
      className={pageMode ? "min-h-screen bg-slate-950 p-4 sm:p-8" : "fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in"}
      onClick={pageMode ? undefined : (e) => e.target === e.currentTarget && onClose()}
    >
      <div className={pageMode ? "w-full max-w-lg relative bg-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-white mx-auto" : "w-full max-w-lg relative bg-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-white"}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-bold uppercase">
            <Share2 className="w-3.5 h-3.5" />
            Doctor & Hospital Record Sharing
          </div>
          <h2 className="text-xl font-extrabold text-white">
            Share Medical Info via QR Code
          </h2>
          <p className="text-xs text-slate-400">
            Generate a secure, time-limited QR code for consulting doctors and external clinics to view your clinical summary.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ── GENERATED QR CODE DISPLAY ───────────────────────────────────── */}
        {shareData ? (
          <div className="space-y-5 animate-fade-in">
            <div className="p-6 rounded-2xl bg-gradient-to-br from-teal-950 via-slate-900 to-slate-950 border border-teal-500/30 flex flex-col items-center justify-center text-center space-y-4">
              <div className="p-4 rounded-2xl bg-white text-slate-950 shadow-2xl">
                <QrCode className="w-36 h-36 text-slate-900" />
              </div>

              <div className="space-y-1">
                <span className="text-xs font-bold text-teal-300 flex items-center justify-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Active for {shareData.durationHours} Hours (Expires: {new Date(shareData.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                </span>
                <p className="text-[11px] text-slate-400">
                  Doctor can scan with any phone or tablet camera to open the read-only summary sheet.
                </p>
              </div>

              {/* Passcode Reminder */}
              {shareData.hasPasscode && (
                <div className="px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  <span>PIN Protected: Provide the PIN to your doctor</span>
                </div>
              )}
            </div>

            {/* Link Copy & Direct View */}
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="flex-1 py-3 px-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                {copiedLink ? <CheckCircle2 className="w-4 h-4 text-teal-400" /> : <Copy className="w-4 h-4" />}
                {copiedLink ? "Copied Share Link!" : "Copy Share Link"}
              </button>

              <a
                href={shareData.shareUrl}
                target="_blank"
                rel="noreferrer"
                className="py-3 px-4 rounded-2xl bg-teal-600 hover:bg-teal-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Eye className="w-4 h-4" />
                Preview Record
              </a>
            </div>

            <button
              onClick={() => setShareData(null)}
              className="w-full text-center text-xs text-slate-400 hover:text-white transition-colors"
            >
              ← Generate another QR share pass
            </button>
          </div>
        ) : (
          /* ── CONFIGURATION FORM ───────────────────────────────────────── */
          <form onSubmit={handleGenerateSharePass} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                Consulting Doctor / Clinic Name (Optional)
              </label>
              <input
                type="text"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                placeholder="e.g. Dr. Haile - St. Paul Hospital"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-teal-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Share Validity Duration
                </label>
                <select
                  value={durationHours}
                  onChange={(e) => setDurationHours(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                >
                  <option value={1}>1 Hour (Quick Visit)</option>
                  <option value={24}>24 Hours (Full Day)</option>
                  <option value={72}>3 Days (Hospitalization)</option>
                  <option value={168}>7 Days (Referral Follow-up)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Optional Security PIN
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="e.g. 4821"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-teal-400"
                />
              </div>
            </div>

            {/* Scope Checkboxes */}
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2 text-xs">
              <span className="text-[11px] font-bold text-slate-300 block">
                Include in Clinical Summary:
              </span>
              <div className="grid grid-cols-2 gap-2 text-slate-300">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeMedications}
                    onChange={(e) => setIncludeMedications(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-950 text-teal-500"
                  />
                  <span>Active Medications</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeLabs}
                    onChange={(e) => setIncludeLabs(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-950 text-teal-500"
                  />
                  <span>Diagnostic Lab Tests</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeConditions}
                    onChange={(e) => setIncludeConditions(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-950 text-teal-500"
                  />
                  <span>Managed Diagnoses</span>
                </label>
                <label className="flex items-center gap-2 text-slate-400 cursor-not-allowed">
                  <input type="checkbox" checked={true} disabled className="rounded text-teal-500" />
                  <span>Allergies & Vitals (Mandatory)</span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-xl shadow-teal-950/40 transition-all disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
              <span>{isLoading ? "Generating Pass..." : "Generate Medical Share QR Code"}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
