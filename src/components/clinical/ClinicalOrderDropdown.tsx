"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Zap,
  FlaskConical,
  Pill,
  Activity,
  Stethoscope,
  FileImage,
  Utensils,
  Brain,
  Users,
  Building,
  Plus,
  ArrowRight,
} from "lucide-react";
import { HospitalDepartment } from "./ClinicalOrderModal";

export interface DepartmentItem {
  id: HospitalDepartment;
  label: string;
  badge: string;
  icon: React.ElementType;
  iconColor: string;
  description: string;
}

export const HOSPITAL_DEPARTMENTS: DepartmentItem[] = [
  {
    id: "laboratory",
    label: "Laboratory & Diagnostics",
    badge: "Pathology / LIS",
    icon: FlaskConical,
    iconColor: "text-blue-400",
    description: "Requisition diagnostic blood panels, urine, microbiology cultures & molecular assays",
  },
  {
    id: "imaging",
    label: "Radiology & Diagnostic Imaging",
    badge: "Imaging Suite",
    icon: FileImage,
    iconColor: "text-cyan-400",
    description: "Requisition X-Rays, CT scans, diagnostic ultrasounds and magnetic resonance imaging",
  },
  {
    id: "pharmacy",
    label: "Pharmacy & Medication Dispense",
    badge: "In-Clinic / Dispensing",
    icon: Pill,
    iconColor: "text-emerald-400",
    description: "Issue electronic prescription, STAT IV/infusion, or continuous medication order",
  },
  {
    id: "physiotherapy",
    label: "Physiotherapy & Physical Rehab",
    badge: "Rehab Clinic",
    icon: Activity,
    iconColor: "text-amber-400",
    description: "Requisition gait analysis, post-op mobility training, and pain conditioning",
  },
  {
    id: "specialist",
    label: "Specialist & MD Referral",
    badge: "Consultation",
    icon: Stethoscope,
    iconColor: "text-indigo-400",
    description: "Schedule secondary consultation with cardiology, neurology, or surgery specialists",
  },
  {
    id: "nutrition",
    label: "Clinical Nutrition & Dietetics",
    badge: "Dietetics",
    icon: Utensils,
    iconColor: "text-emerald-300",
    description: "Initiate diabetic medical nutrition therapy, renal diet plans, and BMI counseling",
  },
  {
    id: "psychology",
    label: "Behavioral Health & Psychology",
    badge: "Behavioral Health",
    icon: Brain,
    iconColor: "text-purple-400",
    description: "Schedule cognitive behavioral therapy, anxiety/depression intake, and trauma support",
  },
  {
    id: "social_work",
    label: "Medical Social Work & SDOH",
    badge: "Support Services",
    icon: Users,
    iconColor: "text-rose-400",
    description: "Coordinate patient community food resources, housing assistance, and family transport",
  },
  {
    id: "admission",
    label: "Hospital & Inpatient Admission",
    badge: "Inpatient / Ward",
    icon: Building,
    iconColor: "text-amber-300",
    description: "Admit patient for observation bed, step-down monitoring, or immediate acute ward stay",
  },
];


interface ClinicalOrderDropdownProps {
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    mrn: string;
    age?: number;
    gender?: string;
  };
  buttonClassName?: string;
  buttonLabel?: string;
  compact?: boolean;
  onOrderCompleted?: (order: any) => void;
}

export default function ClinicalOrderDropdown({
  patient,
  buttonClassName,
  buttonLabel = "Clinical Order",
  compact = false,
  onOrderCompleted,
}: ClinicalOrderDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDeptForModal, setSelectedDeptForModal] = useState<HospitalDepartment | null>(null);
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOpenDepartment = (dept: HospitalDepartment) => {
    router.push(`/clinical/orders?patientId=${encodeURIComponent(patient.id)}&department=${dept}`);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left z-40" ref={dropdownRef}>
      {/* Dropdown Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={
          buttonClassName ||
          `px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ${
            compact
              ? "bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40"
              : "bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-extrabold shadow-lg shadow-teal-950/40"
          }`
        }
        title="Issue Clinical Order to Hospital Departments"
      >
        <Zap className="w-3.5 h-3.5" />
        <span>{buttonLabel}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Floating Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-[#0f111a] border border-slate-700 shadow-2xl z-[100] overflow-hidden animate-fade-in divide-y divide-slate-800/60 ring-1 ring-white/10">
          {/* Header */}
          <div className="px-4 py-3 bg-[#141824] flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono text-teal-400 font-bold uppercase tracking-wider block">
                Hospital Order System
              </span>
              <span className="text-xs font-bold text-white">Send Patient To:</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/30 font-bold">
              {HOSPITAL_DEPARTMENTS.length} Units
            </span>
          </div>

          {/* Department List */}
          <div className="p-2 space-y-1 max-h-[380px] overflow-y-auto scrollbar-hide">
            {HOSPITAL_DEPARTMENTS.map((dept) => {
              const Icon = dept.icon;
              return (
                <button
                  key={dept.id}
                  type="button"
                  onClick={() => handleOpenDepartment(dept.id)}
                  className="w-full text-left p-2.5 rounded-xl hover:bg-slate-900/90 transition-all flex items-start gap-3 group border border-transparent hover:border-slate-800"
                >
                  <div className={`w-8 h-8 rounded-lg bg-slate-950 flex items-center justify-center shrink-0 border border-slate-800 group-hover:border-teal-500/40 transition-colors`}>
                    <Icon className={`w-4 h-4 ${dept.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200 group-hover:text-teal-300 transition-colors truncate">
                        {dept.label}
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 shrink-0 ml-1">
                        {dept.badge}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      {dept.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Direct Quick Launch Footer */}
          <div className="p-2 bg-[#141824]/60 flex items-center justify-between text-[11px] text-slate-400">
            <span className="italic">Standard Hospital Protocols</span>
            <button
              type="button"
              onClick={() => handleOpenDepartment("laboratory")}
              className="text-teal-400 hover:text-teal-300 font-bold flex items-center gap-1 text-xs"
            >
              <span>Full Order Sheet</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
