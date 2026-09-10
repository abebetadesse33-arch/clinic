"use client";

import React, { useState, useEffect } from "react";
import {
  Building2, Video, Calendar, Clock, User, CheckCircle2,
  MapPin, ShieldCheck, ArrowRight, ArrowLeft, Star, Sparkles, ChevronRight,
  AlertCircle, CreditCard
} from "lucide-react";
import UniversalPaymentModal from "@/components/payment/UniversalPaymentModal";

import { useClinic } from "@/context/ClinicContext";

interface DoctorOption {
  id: string;
  name: string;
  title: string;
  specialty: string;
  rating: number;
  reviewsCount: number;
  initials: string;
  location: string;
  nextAvailable: string;
  role?: string;
}

const VISIT_REASONS = [
  { id: "annual-wellness", label: "Annual Wellness Checkup", icon: "🌱", time: "45 min", durationMinutes: 45, desc: "Comprehensive physical exam, bloodwork order & prevention goals" },
  { id: "illness-injury", label: "New Illness or Injury", icon: "🩺", time: "30 min", durationMinutes: 30, desc: "Cough, sprain, rash, abdominal pain, sudden symptoms" },
  { id: "mental-health", label: "Mental Health & Stress", icon: "🧠", time: "45 min", durationMinutes: 45, desc: "Anxiety, depression, burnout, therapy referral, medication review" },
  { id: "chronic-followup", label: "Chronic Condition Follow-up", icon: "📊", time: "30 min", durationMinutes: 30, desc: "Hypertension, diabetes, thyroid, cholesterol management" },
  { id: "lab-draw", label: "In-Office Lab Draw & Vitals", icon: "🧪", time: "15 min", durationMinutes: 15, desc: "Routine blood test, urine panel, vaccine administration" },
  { id: "rx-consult", label: "Medication Review & Refill", icon: "💊", time: "20 min", durationMinutes: 20, desc: "Adjust dosing, discuss side effects, ongoing refills" },
];

const TIME_SLOTS = [
  { time: "09:00", display: "9:00 AM", label: "Morning" },
  { time: "09:45", display: "9:45 AM", label: "Morning" },
  { time: "11:15", display: "11:15 AM", label: "Morning" },
  { time: "13:30", display: "1:30 PM", label: "Afternoon" },
  { time: "14:30", display: "2:30 PM", label: "Afternoon", popular: true },
  { time: "15:45", display: "3:45 PM", label: "Afternoon" },
  { time: "16:30", display: "4:30 PM", label: "Evening" },
  { time: "17:15", display: "5:15 PM", label: "Evening" },
];

function formatLocalDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function AppointmentBookingWizard() {
  const { currentUser, patients, refreshData } = useClinic();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [modality, setModality] = useState<"in_person" | "video">("in_person");
  const [reason, setReason] = useState<string>("annual-wellness");
  const [doctorsList, setDoctorsList] = useState<DoctorOption[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<string>("");
  const [providerError, setProviderError] = useState<string | null>(null);
  const [providersLoading, setProvidersLoading] = useState(true);
  
  // Format today as YYYY-MM-DD for real DB queries
  const todayStr = formatLocalDate(new Date());
  const initialTime = TIME_SLOTS.find((slot) => {
    const [hours, minutes] = slot.time.split(":").map(Number);
    const now = new Date();
    return hours * 60 + minutes > now.getHours() * 60 + now.getMinutes();
  })?.time || TIME_SLOTS[0].time;
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedDateLabel, setSelectedDateLabel] = useState<string>("Today");
  const [selectedTime, setSelectedTime] = useState<string>(initialTime);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [bookingResult, setBookingResult] = useState<any>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [isBooking, setIsBooking] = useState(false);

  // Clinic Locations state
  const [locationsList, setLocationsList] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationsLoading, setLocationsLoading] = useState(true);

  // Payment gating state
  const [regStatus, setRegStatus] = useState<any>(null);
  const [showPayGate, setShowPayGate] = useState(false);
  const [consultFeeData, setConsultFeeData] = useState<{ amountEtb: number; serviceCode: string } | null>(null);

  // Fetch providers & registration status
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const locParam = urlParams.get("location");
      if (locParam) {
        setSelectedLocation(locParam);
      }
    }

    fetch("/api/v1/patient/registration-status")
      .then((r) => r.json())
      .then((d) => d.success && setRegStatus(d.data))
      .catch(() => { });

    fetch("/api/v1/locations")
      .then((r) => r.json())
      .then((d) => {
        setLocationsLoading(false);
        if (d.success && Array.isArray(d.data) && d.data.length > 0) {
          setLocationsList(d.data);
          setSelectedLocation((current) => d.data.some((location: any) => location.id === current) ? current : d.data[0].id);
        } else {
          setLocationError(d.error || "No active clinic locations are available.");
        }
      })
      .catch(() => {
        setLocationsLoading(false);
        setLocationError("Clinic locations could not be loaded. Please try again.");
      });

    // Fetch real clinicians from public providers API
    fetch("/api/v1/public/providers")
      .then((r) => r.json())
      .then((d) => {
        setProvidersLoading(false);
        if (d.success && Array.isArray(d.data) && d.data.length > 0) {
          const list: DoctorOption[] = d.data.map((doc: any) => ({
            id: doc.id,
            name: doc.name,
            title: doc.title || "Attending Physician, MD",
            specialty: doc.specialty || "Internal Medicine",
            rating: doc.rating || 4.96,
            reviewsCount: doc.reviewsCount || 120,
            initials: doc.initials || (doc.name ? doc.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2) : "MD"),
            location: doc.location || "Main Medical Campus & Virtual",
            nextAvailable: "Available on Demand",
            role: doc.role || "physician",
          }));
          setDoctorsList(list);
          setSelectedDoctor(list[0].id);
        } else {
          setProviderError(d.error || "No active clinicians are available.");
        }
      })
      .catch(() => {
        setProvidersLoading(false);
        setProviderError("Clinicians could not be loaded. Please try again.");
      });
  }, []);

  // Fetch booked slots for the selected doctor & date
  useEffect(() => {
    if (!selectedDoctor || !selectedDate) return;
    let cancelled = false;
    const loadAvailability = () => {
      setBookedSlots([]);
      setAvailabilityError(null);
      fetch(`/api/v1/appointments?clinicianId=${encodeURIComponent(selectedDoctor)}&date=${encodeURIComponent(selectedDate)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d.success && Array.isArray(d.data)) {
          const booked = d.data
            .filter((a: any) => a.status !== "cancelled")
            .map((a: any) => a.scheduledTime);
          setBookedSlots(booked);
          setSelectedTime((current) => booked.includes(current) ? "" : current);
        } else if (!cancelled) {
          setAvailabilityError(d.error || "Availability could not be loaded.");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBookedSlots([]);
          setAvailabilityError("Availability could not be loaded. Please refresh and try again.");
        }
      });
    };

    loadAvailability();
    window.addEventListener("focus", loadAvailability);
    window.addEventListener("online", loadAvailability);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", loadAvailability);
      window.removeEventListener("online", loadAvailability);
    };
  }, [selectedDoctor, selectedDate]);

  const activeDoc = doctorsList.find((d) => d.id === selectedDoctor);
  const activeReason = VISIT_REASONS.find((r) => r.id === reason) || VISIT_REASONS[0];
  const activeLoc = locationsList.find((l) => l.id === selectedLocation);
  const isPastTimeForDate = (date: string, time: string) => {
    if (date !== todayStr) return false;
    const [hours, minutes] = time.split(":").map(Number);
    const now = new Date();
    return hours * 60 + minutes <= now.getHours() * 60 + now.getMinutes();
  };
  const isPastTime = (time: string) => isPastTimeForDate(selectedDate, time);

  // Map visit reason → service code for billing
  const REASON_SERVICE_MAP: Record<string, { code: string; price: number }> = {
    "annual-wellness": { code: "CONSULT_GENERAL", price: 500 },
    "illness-injury": { code: "CONSULT_GENERAL", price: 500 },
    "mental-health": { code: "CONSULT_PSYCHOLOGY", price: 600 },
    "chronic-followup": { code: "CONSULT_GENERAL", price: 400 },
    "follow-up": { code: "CONSULT_GENERAL", price: 300 },
    "lab-draw": { code: "LAB_LIPID_PANEL", price: 250 },
    "specialist": { code: "CONSULT_SPECIALIST", price: 800 },
    "prescription": { code: "CONSULT_GENERAL", price: 400 },
    "rx-consult": { code: "CONSULT_GENERAL", price: 400 },
  };

  const handleConfirmBooking = () => {
    if (!activeDoc || (modality === "in_person" && !activeLoc)) {
      setBookingError("Please select an available clinician and clinic location before continuing.");
      return;
    }
    if (!selectedDate || !selectedTime) {
      setBookingError("Please choose an available date and time before continuing.");
      return;
    }
    if (bookedSlots.includes(selectedTime)) {
      setBookingError("That time was just booked. Please choose another available time.");
      return;
    }
    setBookingError(null);
    if (regStatus?.isFreeGlobal) {
      proceedBooking();
      return;
    }

    const serviceInfo = REASON_SERVICE_MAP[reason] ?? { code: "CONSULT_GENERAL", price: 500 };

    if (!regStatus?.isActive) {
      setConsultFeeData({ amountEtb: serviceInfo.price, serviceCode: serviceInfo.code });
      setShowPayGate(true);
      return;
    }

    setConsultFeeData({ amountEtb: serviceInfo.price, serviceCode: serviceInfo.code });
    setShowPayGate(true);
  };

  const proceedBooking = async () => {
    if (isBooking) return;
    setBookingError(null);
    setIsBooking(true);
    try {
      const resolvedPatientId = (currentUser as any)?.patientId || patients?.[0]?.id;
      if (!resolvedPatientId) {
        throw new Error("We could not find your patient profile. Please refresh or contact support before booking.");
      }

      const resolvedClinicianId =
        activeDoc?.id && activeDoc.id.length === 36 && !activeDoc.id.endsWith("99") ? activeDoc.id : undefined;

      const appointmentType = modality === "video" ? "telehealth" : "in_person";

      const payload = {
        patientId: resolvedPatientId,
        clinicianId: resolvedClinicianId,
        facilityId: activeLoc?.id && /^[0-9a-f-]{36}$/i.test(activeLoc.id) ? activeLoc.id : undefined,
        appointmentType,
        specialty: activeDoc?.specialty || "Internal Medicine",
        scheduledDate: selectedDate,
        scheduledTime: selectedTime,
        durationMinutes: activeReason.durationMinutes,
        reason: activeReason.label,
        notes: activeReason.desc,
      };

      const res = await fetch("/api/v1/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.data) {
        throw new Error(data.error || "We could not confirm this appointment. Please choose another time and try again.");
      }
      setBookingResult(data.data);

      await refreshData?.();
      setIsConfirmed(true);
      setStep(5);
    } catch (err) {
      console.error("Booking error:", err);
      setBookingError(err instanceof Error ? err.message : "Booking failed. Please try again.");
    } finally {
      setIsBooking(false);
    }
  };


  return (
    <div className="bg-white rounded-3xl border border-[#E7E2D8] shadow-warm overflow-hidden">
      {/* Top Wizard Steps Header */}
      <div className="bg-[#FAF8F5] border-b border-[#E7E2D8] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="badge-mint font-semibold text-xs">Step {step} of 5</span>
            <h2 className="text-base font-bold text-[#162E27]">
              {step === 1 && "Select Visit Format"}
              {step === 2 && "Reason for Visit"}
              {step === 3 && "Choose Your Provider"}
              {step === 4 && "Select Date & Time"}
              {step === 5 && "Appointment Confirmed"}
            </h2>
          </div>
          {step > 1 && step < 5 && (
            <button
              onClick={() => setStep((s) => (s - 1) as any)}
              className="text-xs font-semibold text-[#005C4B] hover:underline flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          )}
        </div>

        {/* Progress Bar */}
        {step < 5 && (
          <div className="w-full bg-[#E7E2D8] h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-[#005C4B] h-full transition-all duration-300 rounded-full"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        )}
      </div>

      <div className="p-6 sm:p-8">
        {/* Step 1: Modality Selection */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-[#162E27] font-display">
                How would you like to see your doctor?
              </h3>
              <p className="text-xs text-[#687B74] mt-1">
                Choose between visiting one of our quiet, beautifully designed offices or having a secure video visit from anywhere.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setModality("in_person")}
                className={`p-6 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${modality === "in_person"
                  ? "border-[#005C4B] bg-[#E8F4F0]/40 ring-2 ring-[#005C4B]/20"
                  : "border-[#E7E2D8] bg-white hover:border-[#B5DACF]"
                  }`}
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-[#E8F4F0] text-[#005C4B] flex items-center justify-center mb-4">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="badge-mint text-[10px]">On-Site Labs Included</span>
                  </div>
                  <h4 className="text-base font-bold text-[#162E27]">In-Office Clinic Visit</h4>
                  <p className="text-xs text-[#687B74] mt-1">
                    Walk in with zero waiting room delay. Complimentary organic tea, calm lighting, and full physical diagnostics.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-[#E7E2D8] flex items-center justify-between text-xs font-semibold text-[#005C4B]">
                  <span>{locationsList.length} Debre Birhan branches</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>

              <button
                type="button"
                onClick={() => setModality("video")}
                className={`p-6 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${modality === "video"
                  ? "border-[#005C4B] bg-[#E8F4F0]/40 ring-2 ring-[#005C4B]/20"
                  : "border-[#E7E2D8] bg-white hover:border-[#B5DACF]"
                  }`}
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-[#EEF3F0] text-[#005C4B] flex items-center justify-center mb-4">
                    <Video className="w-6 h-6" />
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="badge-mint text-[10px]">From Phone or Laptop</span>
                  </div>
                  <h4 className="text-base font-bold text-[#162E27]">Scheduled Video Visit</h4>
                  <p className="text-xs text-[#687B74] mt-1">
                    Meet Face-to-Face with your dedicated clinician over secure encrypted HD video. Prescriptions and labs ordered immediately.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-[#E7E2D8] flex items-center justify-between text-xs font-semibold text-[#005C4B]">
                  <span>Available same-day</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>
            </div>

            {/* In-Person Branch Picker */}
            {modality === "in_person" && (
              <div className="space-y-3 pt-2">
                <label className="text-xs font-bold text-[#162E27] uppercase tracking-wider block">
                  Select Clinic Office (Debre Birhan Network)
                </label>
                {locationsLoading && (
                  <div className="rounded-xl border border-[#E7E2D8] bg-[#FAF8F5] p-4 text-xs text-[#687B74]">
                    Loading available clinic locations…
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {locationsList.map((loc) => (
                    <div
                      key={loc.id}
                      onClick={() => setSelectedLocation(loc.id)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all ${selectedLocation === loc.id
                        ? "border-[#005C4B] bg-[#E8F4F0]/50 ring-2 ring-[#005C4B]/20 shadow-sm"
                        : "border-[#E7E2D8] bg-white hover:border-[#005C4B]/40"
                        }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="badge-mint text-[10px]">{loc.neighborhood || "Debre Birhan"}</span>
                        {loc.isMain && (
                          <span className="text-[10px] font-bold text-[#005C4B]">★ Main Hospital</span>
                        )}
                      </div>
                      <h5 className="font-bold text-xs text-[#162E27] mt-1">{loc.name}</h5>
                      <p className="text-[11px] text-[#687B74] mt-0.5 leading-tight">{loc.address}</p>
                    </div>
                  ))}
                </div>
                {locationError && (
                  <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                    {locationError}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-4">
              <button
                onClick={() => setStep(2)}
                disabled={modality === "in_person" && !activeLoc}
                className="btn-pill-primary w-full sm:w-auto"
              >
                <span>Continue to Reason</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Reason for Visit */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-[#162E27] font-display">
                What is the primary reason for this visit?
              </h3>
              <p className="text-xs text-[#687B74] mt-1">
                This helps us allot sufficient un-rushed time with your provider.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {VISIT_REASONS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setReason(r.id)}
                  className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3.5 ${reason === r.id
                    ? "border-[#005C4B] bg-[#E8F4F0]/50 ring-2 ring-[#005C4B]/20"
                    : "border-[#E7E2D8] bg-white hover:border-[#B5DACF]"
                    }`}
                >
                  <span className="text-2xl shrink-0">{r.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-[#162E27]">{r.label}</span>
                      <span className="text-[10px] text-[#687B74] font-medium bg-[#F2EFE9] px-2 py-0.5 rounded-md">{r.time}</span>
                    </div>
                    <p className="text-[11px] text-[#687B74] mt-1 leading-tight">{r.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex justify-between items-center pt-4">
              <button onClick={() => setStep(1)} className="btn-pill-ghost text-xs">Back</button>
              <button onClick={() => setStep(3)} className="btn-pill-primary">
                <span>Choose Provider</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Provider Selection */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-[#162E27] font-display">
                Select your preferred clinician
              </h3>
              <p className="text-xs text-[#687B74] mt-1">
                All providers are salaried and spend twice as much time with patients as traditional practices.
              </p>
            </div>

            <div className="space-y-3">
              {providersLoading && (
                <div className="rounded-xl border border-[#E7E2D8] bg-[#FAF8F5] p-4 text-xs text-[#687B74]">
                  Loading available clinicians…
                </div>
              )}
              {doctorsList.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDoctor(doc.id)}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${selectedDoctor === doc.id
                    ? "border-[#005C4B] bg-[#E8F4F0]/40 ring-2 ring-[#005C4B]/20"
                    : "border-[#E7E2D8] bg-white hover:border-[#B5DACF]"
                    }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-full bg-[#005C4B] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
                      {doc.initials}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-[#162E27]">{doc.name}</h4>
                        <span className="flex items-center gap-1 text-[11px] text-[#B8801C] font-semibold">
                          <Star className="w-3.5 h-3.5 fill-[#E5A93C] text-[#E5A93C]" />
                          <span>{doc.rating}</span>
                          <span className="text-[#687B74] font-normal">({doc.reviewsCount})</span>
                        </span>
                      </div>
                      <p className="text-xs text-[#005C4B] font-medium mt-0.5">{doc.title}</p>
                      <p className="text-[11px] text-[#687B74] mt-0.5">{doc.specialty}</p>
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-[#687B74]">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#005C4B]" />
                          <span>{doc.location}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-[#F2EFE9]">
                    <span className="badge-mint text-[11px]">
                      Next: {doc.nextAvailable}
                    </span>
                    <span className={`text-xs font-bold mt-2 ${selectedDoctor === doc.id ? "text-[#005C4B]" : "text-[#687B74]"}`}>
                      {selectedDoctor === doc.id ? "Selected ✓" : "Select Doctor"}
                    </span>
                  </div>
                </div>
              ))}
              {providerError && (
                <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                  {providerError}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-4">
              <button onClick={() => setStep(2)} className="btn-pill-ghost text-xs">Back</button>
              <button onClick={() => setStep(4)} disabled={!activeDoc} className="btn-pill-primary disabled:opacity-60">
                <span>Select Time Slot</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Time Slot & Final Confirmation */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-[#162E27] font-display">
                Choose date & time
              </h3>
              <p className="text-xs text-[#687B74] mt-1">
                Appointment with <strong className="text-[#162E27]">{activeDoc?.name || "your selected clinician"}</strong>
              </p>
            </div>

            {/* Date Pill Selector */}
            <div>
              <label className="block text-xs font-bold text-[#162E27] uppercase tracking-wider mb-2">
                Available Dates
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[0, 1, 2, 3].map((offset) => {
                  const d = new Date();
                  d.setDate(d.getDate() + offset);
                  const dateStr = formatLocalDate(d);
                  const label = offset === 0 ? "Today" : offset === 1 ? "Tomorrow" : d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
                  const isSel = selectedDate === dateStr;
                  return (
                    <button
                      key={dateStr}
                      type="button"
                      onClick={() => {
                        setSelectedDate(dateStr);
                        setSelectedDateLabel(label);
                        setBookingError(null);
                        if (dateStr === todayStr && isPastTimeForDate(dateStr, selectedTime)) {
                          setSelectedTime("");
                        }
                      }}
                      className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all text-center ${
                        isSel
                          ? "bg-[#005C4B] text-white border-[#005C4B] shadow-sm"
                          : "bg-white text-[#33413C] border-[#E7E2D8] hover:bg-[#FAF8F5]"
                      }`}
                    >
                      <div className="font-bold">{label}</div>
                      <div className={`text-[10px] ${isSel ? "text-white/80" : "text-[#687B74]"}`}>{dateStr}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Slot Grid */}
            <div>
              <label className="block text-xs font-bold text-[#162E27] uppercase tracking-wider mb-2">
                Available Times
              </label>
              {availabilityError && (
                <div role="alert" className="mb-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                  {availabilityError}
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {TIME_SLOTS.map((slot) => {
                  const isBooked = bookedSlots.includes(slot.time);
                  const isUnavailable = isBooked || isPastTime(slot.time);
                  const isSelected = selectedTime === slot.time;
                  return (
                    <button
                      key={slot.time}
                      type="button"
                        disabled={isUnavailable || isBooking}
                        onClick={() => {
                          setSelectedTime(slot.time);
                          setBookingError(null);
                        }}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        isUnavailable
                          ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60"
                          : isSelected
                          ? "border-[#005C4B] bg-[#E8F4F0] text-[#005C4B] font-bold ring-2 ring-[#005C4B]/20"
                          : "border-[#E7E2D8] bg-white text-[#33413C] hover:border-[#B5DACF]"
                      }`}
                    >
                      <div className="text-xs">{slot.display}</div>
                      <div className="text-[10px] text-[#687B74]">{isBooked ? "Booked" : isPastTime(slot.time) ? "Unavailable" : slot.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Summary Review Card */}
            <div className="bg-[#FAF8F5] p-5 rounded-2xl border border-[#E7E2D8] space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-[#005C4B]">Booking Summary</div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[#687B74]">Visit Type:</span>
                  <div className="font-bold text-[#162E27] mt-0.5">
                    {modality === "in_person" ? "In-Person Clinic Visit" : "Live Video Visit"}
                  </div>
                </div>
                <div>
                  <span className="text-[#687B74]">Location:</span>
                  <div className="font-bold text-[#005C4B] mt-0.5 truncate">
                    {modality === "in_person" ? activeLoc?.name || "Selected clinic" : "Telehealth Room"}
                  </div>
                </div>
                <div>
                  <span className="text-[#687B74]">Reason:</span>
                  <div className="font-bold text-[#162E27] mt-0.5">{activeReason.label}</div>
                </div>
                <div>
                  <span className="text-[#687B74]">Date & Time:</span>
                  <div className="font-bold text-[#162E27] mt-0.5">{selectedDate} at {selectedTime}</div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4">
              <button onClick={() => setStep(3)} className="btn-pill-ghost text-xs">Back</button>
              <button onClick={handleConfirmBooking} disabled={isBooking} className="btn-pill-primary disabled:opacity-60 disabled:cursor-wait">
                {regStatus && !regStatus.isFreeGlobal ? (
                  <><CreditCard className="w-4 h-4" /><span>{isBooking ? "Booking…" : "Review & Pay to Confirm"}</span></>
                ) : (
                  <><span>{isBooking ? "Booking…" : "Confirm & Book Appointment"}</span><CheckCircle2 className="w-4 h-4" /></>
                )}
              </button>
            </div>

            {bookingError && (
              <div role="alert" className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span>{bookingError}</span>
              </div>
            )}

            {/* Registration expired warning */}
            {regStatus && !regStatus.isActive && !regStatus.isFreeGlobal && (
              <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <span>
                  Your 3-month registration has expired. You will be prompted to renew it before your booking is confirmed.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Payment Gate Modal */}
        {consultFeeData && (
          <UniversalPaymentModal
            isOpen={showPayGate}
            onClose={() => setShowPayGate(false)}
            onSuccess={() => {
              setShowPayGate(false);
              proceedBooking();
            }}
            serviceType="consultation"
            serviceCode={consultFeeData.serviceCode}
            serviceTitle={`${activeReason.label} — ${modality === "video" ? "Video Visit" : "In-Person Visit"}`}
            amountEtb={consultFeeData.amountEtb}
            patientName={(currentUser as any)?.fullName || "Patient"}
          />
        )}

        {/* Step 5: Booking Confirmed */}
        {step === 5 && isConfirmed && (
          <div className="text-center py-6 space-y-5">
            <div className="w-16 h-16 rounded-full bg-[#E8F4F0] text-[#005C4B] flex items-center justify-center mx-auto ring-8 ring-[#E8F4F0]/60">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold mb-2">
                <span>Queue Token:</span>
                <span className="font-mono bg-emerald-600 text-white px-2 py-0.5 rounded text-xs">
                  {bookingResult?.queueToken || "Pending"}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-[#162E27] font-display">
                You’re all set for {selectedDate} at {selectedTime}!
              </h3>
              <p className="text-xs text-[#687B74] mt-1.5 max-w-md mx-auto">
                Your {modality === "video" ? "video visit" : "visit"} with {bookingResult?.assignedClinician?.name || activeDoc?.name || "your clinician"} is confirmed.
                {modality === "in_person" ? ` Please arrive at ${activeLoc?.name || "the selected clinic"}.` : " Your secure visit link will be available from your dashboard."}
              </p>
            </div>

            <div className="bg-[#FAF8F5] p-5 rounded-2xl border border-[#E7E2D8] max-w-md mx-auto text-left space-y-2.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#005C4B] text-white flex items-center justify-center font-bold text-sm">
                  {bookingResult?.assignedClinician?.name ? bookingResult.assignedClinician.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2) : activeDoc?.initials || "MD"}
                </div>
                <div>
                  <div className="text-xs font-bold text-[#162E27]">{bookingResult?.assignedClinician?.name || activeDoc?.name || "Assigned clinician"}</div>
                  <div className="text-[11px] text-[#687B74]">{activeDoc?.title || "Clinical provider"}</div>
                </div>
              </div>
              <div className="pt-2 border-t border-[#E7E2D8] flex items-center justify-between text-xs text-[#687B74]">
                <span>Modality:</span>
                <strong className="text-[#162E27]">{modality === "in_person" ? "In-Person Clinic" : "Live Video Visit"}</strong>
              </div>
              <div className="flex items-center justify-between text-xs text-[#687B74]">
                <span>Location:</span>
                <strong className="text-[#005C4B]">{modality === "in_person" ? activeLoc?.name || "Selected clinic" : "Secure HD Video Room"}</strong>
              </div>
              <div className="pt-2 border-t border-[#E7E2D8] flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Assigned staff and patient notified. Both connected for service.</span>
              </div>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              {modality === "video" && (
                <a
                  href={bookingResult?.joinUrls?.patient || `/telemedicine/room-live-${selectedDoctor.slice(0, 8)}?role=patient`}
                  className="btn-pill-terracotta w-full sm:w-auto flex items-center justify-center gap-2"
                >
                  <Video className="w-4 h-4" />
                  <span>Enter Video Room</span>
                </a>
              )}
              <a href="/patient/dashboard" className="btn-pill-primary w-full sm:w-auto">
                Return to Patient Dashboard
              </a>
              <button
                onClick={() => {
                  setStep(1);
                  setIsConfirmed(false);
                }}
                className="btn-pill-ghost text-xs w-full sm:w-auto"
              >
                Book Another Visit
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
