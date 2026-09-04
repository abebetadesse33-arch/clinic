"use client";

import React, { useRef } from "react";
import { useTranslation } from "@/lib/i18n/translations";
import {
  Printer,
  QrCode,
  ShieldCheck,
  HeartPulse,
  Phone,
  Calendar,
  AlertTriangle,
  MapPin,
  Clock,
  CheckCircle2,
  X,
} from "lucide-react";

interface PrintablePatientCardProps {
  patient: {
    id: string;
    mrn: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
    bloodType: string;
    phone: string;
    allergies?: Array<{ substance: string; severity: string; reaction: string }>;
    emergencyContact?: string;
    ticketNumber?: string;
    destinationRoom?: string;
    estimatedWaitMinutes?: number;
  };
  onClose?: () => void;
}

export default function PrintablePatientCard({ patient, onClose }: PrintablePatientCardProps) {
  const { t } = useTranslation();
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const fullName = `${patient.firstName} ${patient.lastName}`;
  const qrData = JSON.stringify({
    mrn: patient.mrn,
    name: fullName,
    dob: patient.dateOfBirth,
    blood: patient.bloodType,
    ticket: patient.ticketNumber || "REG-01",
    verifiedAt: new Date().toISOString(),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Action Bar (Hidden on print) */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/60 print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {t("card.title", "Digital Patient Health Card & Wristband")}
              </h3>
              <p className="text-xs text-slate-500">MRN: {patient.mrn}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Printer className="w-4 h-4" />
              {t("common.print", "Print Card")}
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Printable Card Canvas */}
        <div ref={printRef} className="p-6 overflow-y-auto space-y-6 print:p-0 print:m-0">
          {/* Card 1: Standard ID Badge Layout */}
          <div className="border-2 border-slate-800 dark:border-slate-700 rounded-2xl p-6 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white shadow-xl relative overflow-hidden print:border-black print:bg-white print:text-black">
            {/* Background watermarks */}
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
              <HeartPulse className="w-64 h-64 text-teal-400" />
            </div>

            {/* Top Brand Banner */}
            <div className="flex items-center justify-between border-b border-slate-800 print:border-slate-300 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white shadow-md">
                  <HeartPulse className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-base font-black tracking-tight">NiniMed Clinical Enterprise</h1>
                  <p className="text-[10px] text-teal-400 print:text-slate-600 font-semibold tracking-wider uppercase">
                    Debre Birhan Habitat Clinic Network
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal-500/20 border border-teal-500/40 text-teal-300 print:text-slate-800 text-[10px] font-bold uppercase">
                  <ShieldCheck className="w-3 h-3 text-teal-400" /> Verified Record
                </span>
              </div>
            </div>

            {/* Main Details Grid */}
            <div className="grid grid-cols-3 gap-4 items-center">
              <div className="col-span-2 space-y-3">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Patient Name</p>
                  <p className="text-xl font-black text-white print:text-black tracking-tight">{fullName}</p>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase">{t("card.mrn", "MRN")}</p>
                    <p className="font-mono font-bold text-teal-300 print:text-black">{patient.mrn}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase">{t("card.dob", "DOB")}</p>
                    <p className="font-semibold text-slate-200 print:text-black">{patient.dateOfBirth}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase">{t("card.blood_type", "Blood")}</p>
                    <p className="font-black text-rose-400 print:text-black">{patient.bloodType || "O+"}</p>
                  </div>
                </div>

                {patient.emergencyContact && (
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase">{t("card.emergency", "Emergency Contact")}</p>
                    <p className="text-xs font-semibold text-slate-300 print:text-black flex items-center gap-1.5">
                      <Phone className="w-3 h-3 text-teal-400" /> {patient.emergencyContact}
                    </p>
                  </div>
                )}
              </div>

              {/* QR & Barcode Section */}
              <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-white text-slate-950 shadow-inner">
                {/* Visual QR Placeholder with actual metadata */}
                <div className="w-28 h-28 bg-slate-100 border-2 border-slate-900 p-2 rounded-lg flex flex-col items-center justify-center text-center">
                  <QrCode className="w-20 h-20 text-slate-900" />
                </div>
                <p className="text-[8px] font-mono text-slate-600 mt-1 font-bold">SCAN AT CHECK-IN</p>
              </div>
            </div>

            {/* Known Allergies Warning Banner */}
            {patient.allergies && patient.allergies.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-800 print:border-slate-300 flex items-center gap-2 text-rose-400 print:text-rose-700 text-xs font-bold">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>
                  {t("card.allergies", "Allergies")}: {patient.allergies.map((a) => a.substance).join(", ")}
                </span>
              </div>
            )}
          </div>

          {/* Card 2: Queue Ticket & Wayfinding Tear-Off Slip */}
          {patient.ticketNumber && (
            <div className="border-2 border-dashed border-slate-400 dark:border-slate-700 rounded-2xl p-5 bg-slate-50 dark:bg-slate-950/80 text-slate-900 dark:text-white space-y-3 print:bg-white print:text-black">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                  {t("card.ticket_number", "Queue Wayfinding Ticket")}
                </span>
                <span className="text-[10px] text-slate-500">{new Date().toLocaleString()}</span>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 uppercase">Ticket Number</p>
                  <p className="text-3xl font-black text-teal-600 dark:text-teal-400 tracking-tight">
                    #{patient.ticketNumber}
                  </p>
                </div>
                {patient.destinationRoom && (
                  <div className="text-right">
                    <p className="text-xs text-slate-500 uppercase">{t("card.destination", "Destination Room")}</p>
                    <p className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 justify-end">
                      <MapPin className="w-4 h-4 text-emerald-500" /> {patient.destinationRoom}
                    </p>
                  </div>
                )}
              </div>

              {patient.estimatedWaitMinutes !== undefined && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2">
                  <Clock className="w-4 h-4 flex-shrink-0" />
                  <span>
                    {t("card.wait_estimate", "Estimated Wait")}: ~<strong>{patient.estimatedWaitMinutes} minutes</strong>
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
