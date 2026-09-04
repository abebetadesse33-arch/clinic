"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useClinic } from "../context/ClinicContext";
import {
  ENTERPRISE_MODULES_CATALOG,
  ROLE_CAPABILITIES_MATRIX,
} from "../lib/security/roles-permissions";
import { Role } from "../lib/types/clinical";
import {
  Search,
  Users,
  Stethoscope,
  Activity,
  FileCheck,
  Pill,
  Brain,
  Utensils,
  HeartPulse,
  HeartHandshake,
  Dna,
  Video,
  Sparkles,
  Mic,
  Building2,
  ShieldCheck,
  CheckSquare,
  ClipboardList,
  Workflow,
  Bed,
  MapPin,
  Monitor,
  X,
  ArrowRight,
  Sparkle,
  Command,
  FolderOpen,
} from "lucide-react";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  Stethoscope,
  Users,
  Sparkles,
  Mic,
  Utensils,
  Activity,
  Brain,
  HeartHandshake,
  HeartPulse,
  Dna,
  FileCheck,
  Pill,
  ClipboardList,
  CheckSquare,
  Workflow,
  Video,
  Building2,
  Bed,
  ShieldCheck,
  MapPin,
  Monitor,
  FolderOpen,
};

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const { patients, selectPatient, setCurrentRole, currentRole } = useClinic();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const isPatientSession = currentRole === "patient";

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Keyboard shortcut listener (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open
          const evt = new CustomEvent("open-command-palette");
          window.dispatchEvent(evt);
        }
      } else if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Filter Patients
  const filteredPatients = isPatientSession
    ? []
    : patients.filter(
        (p) =>
          p.firstName.toLowerCase().includes(query.toLowerCase()) ||
          p.lastName.toLowerCase().includes(query.toLowerCase()) ||
          p.mrn.toLowerCase().includes(query.toLowerCase()) ||
          (p.allergies && p.allergies.some((a) => a.substance.toLowerCase().includes(query.toLowerCase())))
      );

  // Filter Modules
  const filteredModules = ENTERPRISE_MODULES_CATALOG.filter(
    (m) =>
      m.title.toLowerCase().includes(query.toLowerCase()) ||
      m.description.toLowerCase().includes(query.toLowerCase()) ||
      m.category.toLowerCase().includes(query.toLowerCase())
  );

  // Filter Roles
  const rolesList = Object.keys(ROLE_CAPABILITIES_MATRIX) as Role[];
  const filteredRoles = rolesList.filter((r) => {
    const conf = ROLE_CAPABILITIES_MATRIX[r];
    return (
      conf.label.toLowerCase().includes(query.toLowerCase()) ||
      conf.clinicalPrivilegesSummary.toLowerCase().includes(query.toLowerCase())
    );
  });

  const totalResults = filteredPatients.length + filteredModules.length + (query ? filteredRoles.length : 0);

  const handleSelectPatient = (patientId: string) => {
    selectPatient(patientId);
    router.push(`/patients/${patientId}`);
    onClose();
  };

  const handleSelectModule = (path: string) => {
    router.push(path);
    onClose();
  };

  const handleSelectRole = (r: Role) => {
    setCurrentRole(r);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] z-10">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-800 bg-slate-950/60 gap-3">
          <Search className="w-5 h-5 text-teal-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search patients by MRN/name, clinical studios, diagnostic tools, or roles..."
            className="flex-1 bg-transparent border-none text-sm text-white placeholder-slate-500 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <div className="hidden sm:flex items-center gap-1 text-[10px] font-mono text-slate-400 px-2 py-1 rounded bg-slate-800/80 border border-slate-700">
            <span>ESC</span>
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {!isPatientSession && filteredPatients.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Patients ({filteredPatients.length})</span>
                <span className="text-[9px] font-mono text-teal-400">Jump to Patient 360</span>
              </div>
              <div className="space-y-1">
                {filteredPatients.slice(0, 4).map((pat) => (
                  <button
                    key={pat.id}
                    onClick={() => handleSelectPatient(pat.id)}
                    className="w-full p-2.5 rounded-2xl flex items-center justify-between text-left hover:bg-slate-800/80 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-300 font-bold text-xs">
                        {pat.firstName[0]}{pat.lastName[0]}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white group-hover:text-teal-300 transition-colors">
                          {pat.firstName} {pat.lastName}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          MRN: {pat.mrn} • {pat.age}y / {pat.gender} • Priority: <span className="uppercase font-semibold text-teal-400">{pat.triagePriority}</span>
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-teal-400 opacity-0 group-hover:opacity-100 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Module / Studio Results */}
          {filteredModules.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Enterprise Studios & Modules ({filteredModules.length})
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {filteredModules.slice(0, 8).map((mod) => {
                  const Icon = ICON_MAP[mod.iconName] || Stethoscope;
                  return (
                    <button
                      key={mod.id}
                      onClick={() => handleSelectModule(mod.path)}
                      className="p-2.5 rounded-2xl flex items-start gap-3 text-left hover:bg-slate-800/80 transition-colors group border border-transparent hover:border-slate-700/60"
                    >
                      <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 group-hover:text-teal-300 group-hover:border-teal-500/40 transition-colors shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-200 group-hover:text-white truncate">
                          {mod.title}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {mod.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Roles Quick Switch (when searching) */}
          {query && filteredRoles.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Healthcare Roles ({filteredRoles.length})
              </div>
              <div className="space-y-1">
                {filteredRoles.slice(0, 3).map((r) => {
                  const conf = ROLE_CAPABILITIES_MATRIX[r];
                  return (
                    <button
                      key={r}
                      onClick={() => handleSelectRole(r)}
                      className="w-full p-2 rounded-xl flex items-center justify-between text-left hover:bg-slate-800/80 transition-colors text-xs"
                    >
                      <span className="font-semibold text-white">{conf.label}</span>
                      <span className="text-[10px] font-mono text-teal-400">Switch Role</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {totalResults === 0 && (
            <div className="text-center py-10 text-slate-400">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs font-semibold">No clinical records or modules match &quot;{query}&quot;</p>
              <p className="text-[10px] text-slate-500 mt-1">Try searching for a patient name, MRN, MNT, DDI, Voice Scribe, or Bed Telemetry.</p>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
          <div className="flex items-center gap-3">
            <span>Navigation: <kbd className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">↑</kbd> <kbd className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">↓</kbd></span>
            <span>Select: <kbd className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">↵</kbd></span>
          </div>
          <div className="flex items-center gap-1.5 text-teal-400 font-medium">
            <Sparkles className="w-3 h-3" />
            <span>NiniMed Omni-Search</span>
          </div>
        </div>
      </div>
    </div>
  );
}
