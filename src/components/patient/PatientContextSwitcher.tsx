"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useClinic } from "@/context/ClinicContext";
import {
  Search,
  User,
  Users,
  ChevronDown,
  Check,
  X,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Clock,
} from "lucide-react";

interface PatientContextSwitcherProps {
  currentPatientId?: string;
  currentPatientName?: string;
  currentMrn?: string;
  onPatientChange?: (patient: any) => void;
  className?: string;
}

export default function PatientContextSwitcher({
  currentPatientId,
  currentPatientName,
  currentMrn,
  onPatientChange,
  className = "",
}: PatientContextSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { patients, selectPatient, selectedPatient } = useClinic();

  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Live search debounced
  useEffect(() => {
    if (!isOpen) return;

    if (!searchTerm.trim()) {
      // Default to patients from clinic context or top recent patients
      setSearchResults(patients.slice(0, 8));
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/v1/patients?search=${encodeURIComponent(searchTerm.trim())}&limit=10`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setSearchResults(json.data);
        } else {
          // Fallback to local filter
          const term = searchTerm.toLowerCase();
          setSearchResults(
            patients.filter(
              (p) =>
                p.firstName.toLowerCase().includes(term) ||
                p.lastName.toLowerCase().includes(term) ||
                p.mrn.toLowerCase().includes(term) ||
                (p.phone && p.phone.includes(term))
            )
          );
        }
      } catch {
        const term = searchTerm.toLowerCase();
        setSearchResults(
          patients.filter(
            (p) =>
              p.firstName.toLowerCase().includes(term) ||
              p.lastName.toLowerCase().includes(term) ||
              p.mrn.toLowerCase().includes(term)
          )
        );
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchTerm, isOpen, patients]);

  const handleSelectPatient = (patient: any) => {
    selectPatient(patient.id);

    // Update URL query parameter without losing other params (e.g. active tab)
    const currentParams = new URLSearchParams(searchParams.toString());
    currentParams.set("patientId", patient.id);
    if (patient.mrn) {
      currentParams.set("mrn", patient.mrn);
    }
    router.push(`${pathname}?${currentParams.toString()}`);

    if (onPatientChange) {
      onPatientChange(patient);
    }

    setIsOpen(false);
    setSearchTerm("");
  };

  const displayName = currentPatientName || (selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : "Select Patient");
  const displayMrn = currentMrn || selectedPatient?.mrn || "";
  const activeId = currentPatientId || selectedPatient?.id;

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-[#E7E2D8] dark:border-slate-800 hover:border-[#005C4B] dark:hover:border-emerald-500 shadow-xs hover:shadow-sm transition-all text-xs group"
        title="Click to search and switch active patient"
      >
        <div className="w-6 h-6 rounded-full bg-[#E8F4F0] dark:bg-emerald-950 text-[#005C4B] dark:text-emerald-300 font-bold flex items-center justify-center text-[10px] shrink-0 border border-emerald-200 dark:border-emerald-800">
          <User className="w-3.5 h-3.5" />
        </div>

        <div className="text-left leading-tight">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[#162E27] dark:text-white truncate max-w-[160px] sm:max-w-[220px]">
              {displayName}
            </span>
            {displayMrn && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                {displayMrn}
              </span>
            )}
          </div>
          <span className="text-[10px] text-[#687B74] dark:text-slate-400 group-hover:text-[#005C4B] dark:group-hover:text-emerald-400 transition-colors flex items-center gap-1">
            <Search className="w-2.5 h-2.5" /> Click to search & switch patient
          </span>
        </div>

        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ml-1 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute left-0 sm:right-0 sm:left-auto mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl border border-[#E7E2D8] dark:border-slate-800 shadow-xl z-50 overflow-hidden animate-fade-in">
          {/* Search Header */}
          <div className="p-3 border-b border-[#F2EFE9] dark:border-slate-800 bg-[#FAF8F5] dark:bg-slate-950/60">
            <div className="relative">
              <Search className="w-4 h-4 text-[#687B74] dark:text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search patient by name or MRN..."
                className="w-full pl-9 pr-8 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-[#E7E2D8] dark:border-slate-800 text-[#162E27] dark:text-white placeholder-[#687B74] dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#005C4B]/20 focus:border-[#005C4B]"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center justify-between mt-2 px-1 text-[10px] text-[#687B74] dark:text-slate-400 font-medium">
              <span>Matching Clinic Records</span>
              {isSearching && <span className="text-[#005C4B] dark:text-emerald-400 animate-pulse font-semibold">Searching...</span>}
            </div>
          </div>

          {/* Patient Results List */}
          <div className="max-h-64 overflow-y-auto p-1.5 space-y-1 scrollbar-thin">
            {searchResults.length === 0 ? (
              <div className="py-8 px-4 text-center">
                <AlertCircle className="w-6 h-6 text-slate-400 mx-auto mb-2 opacity-60" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No matching patients found</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Try searching by first name, last name, or exact MRN.</p>
              </div>
            ) : (
              searchResults.map((p) => {
                const isCurrent = p.id === activeId;
                const pName = `${p.firstName} ${p.lastName}`;
                const initials = `${p.firstName?.[0] || ""}${p.lastName?.[0] || ""}`.toUpperCase();

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPatient(p)}
                    className={`w-full text-left p-2.5 rounded-xl flex items-center justify-between transition-all group ${
                      isCurrent
                        ? "bg-[#E8F4F0] dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800"
                        : "hover:bg-[#FAF8F5] dark:hover:bg-slate-800/80 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                          isCurrent
                            ? "bg-[#005C4B] text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 group-hover:bg-[#E8F4F0] group-hover:text-[#005C4B]"
                        }`}
                      >
                        {initials || <User className="w-4 h-4" />}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-[#162E27] dark:text-white truncate">
                            {pName}
                          </span>
                          {isCurrent && (
                            <span className="badge-mint text-[9px] py-0 px-1 font-semibold">Active</span>
                          )}
                        </div>
                        <div className="text-[10px] text-[#687B74] dark:text-slate-400 font-mono truncate flex items-center gap-1.5">
                          <span>{p.mrn}</span>
                          {p.gender && <span>• {p.gender}</span>}
                          {p.bloodType && <span>• {p.bloodType}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 ml-2">
                      {isCurrent ? (
                        <Check className="w-4 h-4 text-[#005C4B] dark:text-emerald-400" />
                      ) : (
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer Note */}
          <div className="p-2.5 bg-slate-50 dark:bg-slate-950/80 border-t border-[#F2EFE9] dark:border-slate-800 text-[10px] text-[#687B74] dark:text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" /> Multi-patient health access
            </span>
            <span className="font-mono text-[9px]">Total: {patients.length} records</span>
          </div>
        </div>
      )}
    </div>
  );
}
