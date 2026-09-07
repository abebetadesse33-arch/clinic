"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import RoleGuard from "@/components/auth/RoleGuard";
import {
  Users, Calendar, Clock, ClipboardList, DollarSign, TrendingUp,
  AlertTriangle, CheckCircle2, XCircle, ChevronRight, Plus, Search,
  Filter, RefreshCw, Download, Upload, Edit2, Eye, Shield, ShieldCheck,
  ShieldAlert, Award, Activity, Stethoscope, UserCheck, UserPlus, UserMinus,
  Building2, Briefcase, FileText, Bell, Star, BarChart3, Loader2,
  ChevronDown, ChevronUp, ArrowLeft, CreditCard, Zap, Target, Hash,
  Phone, Mail, MapPin, CalendarDays, Timer, Banknote, Wallet,
  AlertCircle, Info, Check, X, ArrowRightLeft,
} from "lucide-react";

export default function HRManagementPage() {
  return (
    <RoleGuard
      allowedRoles={["system_admin", "tenant_admin"]}
      fallbackTitle="HR Management Hub"
      fallbackMessage="Access restricted to Administrators."
    >
      <HRManagementContent />
    </RoleGuard>
  );
}

type HRTab = "overview" | "directory" | "departments" | "roster" | "attendance" | "leave" | "payroll";

const TABS: { id: HRTab; label: string; icon: any }[] = [
  { id: "overview", label: "Command Center", icon: Activity },
  { id: "directory", label: "Staff Directory", icon: Users },
  { id: "departments", label: "Department Allocation", icon: Building2 },
  { id: "roster", label: "Duty Roster", icon: Calendar },
  { id: "attendance", label: "Attendance Register", icon: Clock },
  { id: "leave", label: "Leave Management", icon: CalendarDays },
  { id: "payroll", label: "Payroll Engine", icon: Banknote },
];

const STANDARD_DEPARTMENTS = [
  "Emergency",
  "Internal Medicine",
  "Paediatrics",
  "Surgery",
  "Obstetrics & Gynaecology",
  "Laboratory",
  "Radiology",
  "Pharmacy",
  "ICU & Critical Care",
  "Outpatient",
  "Advanced Primary Care",
  "Cardiometabolic Care",
  "Cardiopulmonary Rehabilitation",
  "Nutrition",
  "Social Work",
  "Clinical Operations",
  "System Administration",
];

const SHIFT_TEMPLATES = [
  { id: "morning", label: "Morning", time: "07:00 – 15:00", color: "amber" },
  { id: "evening", label: "Evening", time: "15:00 – 23:00", color: "violet" },
  { id: "night", label: "Night", time: "23:00 – 07:00", color: "indigo" },
  { id: "on_call_24h", label: "24h ER On-Call", time: "All Day", color: "rose" },
  { id: "ward_rounds", label: "Ward Rounds", time: "08:00 – 12:00", color: "teal" },
];

const LEAVE_TYPES: Record<string, { label: string; color: string }> = {
  annual: { label: "Annual Leave", color: "teal" },
  clinical_cme: { label: "CME / Conference", color: "violet" },
  sick: { label: "Sick Leave", color: "amber" },
  maternity_paternity: { label: "Maternity / Paternity", color: "pink" },
  emergency_bereavement: { label: "Emergency / Bereavement", color: "rose" },
  unpaid: { label: "Unpaid Leave", color: "slate" },
  compensatory: { label: "Compensatory", color: "cyan" },
};

export interface StaffMember {
  id: string;
  userId: string;
  employeeCode: string;
  fullName: string;
  email: string;
  phone?: string;
  role: string;
  department: string;
  designation: string;
  specialization?: string;
  licenseNumber?: string;
  licenseExpiryDate?: string;
  cmePoints: number;
  employmentType: string;
  baseSalaryEtb: string;
  status: string;
  hiredAt: string;
}

export interface CandidateUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
  department?: string;
  phone?: string;
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function StatusBadge({ status, size = "sm" }: { status: string; size?: "xs" | "sm" }) {
  const map: Record<string, string> = {
    active: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    on_leave: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    probation: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
    suspended: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    terminated: "bg-slate-500/15 text-slate-400 border-slate-500/30",
    present: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    absent: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    late: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    approved_by_hod: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
    approved_by_hr: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    rejected: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    cancelled: "bg-slate-500/15 text-slate-400 border-slate-500/30",
    draft: "bg-slate-500/15 text-slate-400 border-slate-500/30",
    calculated: "bg-violet-500/15 text-violet-300 border-violet-500/30",
    approved: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    disbursed: "bg-teal-500/15 text-teal-300 border-teal-500/30",
  };
  const px = size === "xs" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-[11px]";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border font-semibold uppercase tracking-wide ${px} ${map[status] || "bg-slate-700 text-slate-300 border-slate-600"}`}>
      {status ? status.replace(/_/g, " ") : "Unknown"}
    </span>
  );
}

function KpiCard({ label, value, sub, icon: Icon, color = "teal", trend }: { label: string; value: string | number; sub?: string; icon: any; color?: string; trend?: "up" | "down" }) {
  const colorMap: Record<string, string> = { teal: "text-teal-400", amber: "text-amber-400", rose: "text-rose-400", violet: "text-violet-400", cyan: "text-cyan-400", emerald: "text-emerald-400" };
  const bgMap: Record<string, string> = { teal: "bg-teal-500/10 border-teal-500/20", amber: "bg-amber-500/10 border-amber-500/20", rose: "bg-rose-500/10 border-rose-500/20", violet: "bg-violet-500/10 border-violet-500/20", cyan: "bg-cyan-500/10 border-cyan-500/20", emerald: "bg-emerald-500/10 border-emerald-500/20" };
  return (
    <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">{label}</p>
          <p className="text-3xl font-black text-white">{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-xl border ${bgMap[color] || bgMap.teal}`}>
          <Icon className={`w-5 h-5 ${colorMap[color] || colorMap.teal}`} />
        </div>
      </div>
      {trend && (
        <div className={`mt-3 flex items-center gap-1 text-xs ${trend === "up" ? "text-emerald-400" : "text-rose-400"}`}>
          <TrendingUp className={`w-3 h-3 ${trend === "down" ? "rotate-180 text-rose-400" : "text-emerald-400"}`} />
          <span>{trend === "up" ? "+4.8% headcount" : "-1.2% active"}</span>
        </div>
      )}
    </div>
  );
}

// ─── Modal: Assign Staff to Department ─────────────────────────────────────────
function AssignDepartmentModal({
  staffMember,
  isOpen,
  onClose,
  onSaved,
}: {
  staffMember: StaffMember | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const [department, setDepartment] = useState("");
  const [designation, setDesignation] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [status, setStatus] = useState("active");
  const [baseSalaryEtb, setBaseSalaryEtb] = useState("");
  const [employmentType, setEmploymentType] = useState("full_time");
  const [licenseExpiryDate, setLicenseExpiryDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customDept, setCustomDept] = useState("");

  useEffect(() => {
    if (staffMember) {
      setDepartment(staffMember.department || "Internal Medicine");
      setDesignation(staffMember.designation || "");
      setSpecialization(staffMember.specialization || "");
      setStatus(staffMember.status || "active");
      setBaseSalaryEtb(staffMember.baseSalaryEtb ? parseFloat(staffMember.baseSalaryEtb).toString() : "25000");
      setEmploymentType(staffMember.employmentType || "full_time");
      setLicenseExpiryDate(staffMember.licenseExpiryDate || "");
      setCustomDept("");
    }
  }, [staffMember]);

  if (!isOpen || !staffMember) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const selectedDept = department === "custom" ? customDept.trim() : department;
      if (!selectedDept) {
        alert("Please select or specify a department.");
        setIsSubmitting(false);
        return;
      }

      const res = await fetch("/api/v1/hr/staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: staffMember.id,
          userId: staffMember.userId,
          department: selectedDept,
          designation,
          specialization,
          status,
          baseSalaryEtb,
          employmentType,
          licenseExpiryDate: licenseExpiryDate || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update department assignment.");
      }

      onSaved(`Successfully assigned ${staffMember.fullName} to ${selectedDept}!`);
      onClose();
    } catch (err: any) {
      alert(err.message || "An error occurred during department assignment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Assign Staff to Department</h3>
              <p className="text-xs text-slate-400">{staffMember.fullName} ({staffMember.employeeCode})</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Target Department *</label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
            >
              {STANDARD_DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
              <option value="custom">+ Add Custom Department...</option>
            </select>
          </div>

          {department === "custom" && (
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Custom Department Name *</label>
              <input
                type="text"
                value={customDept}
                onChange={(e) => setCustomDept(e.target.value)}
                placeholder="e.g. Oncology Ward"
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Designation / Role Title *</label>
              <input
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="e.g. Senior Attending Physician"
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Clinical Specialization</label>
              <input
                type="text"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                placeholder="e.g. Cardiology"
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Staff Employment Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
              >
                <option value="active">Active (On Duty)</option>
                <option value="on_leave">On Leave</option>
                <option value="probation">Probation</option>
                <option value="suspended">Suspended</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Employment Type</label>
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
              >
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
                <option value="contract">Contract</option>
                <option value="locum">Locum</option>
                <option value="intern">Intern</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Base Salary (ETB/mo)</label>
              <input
                type="number"
                value={baseSalaryEtb}
                onChange={(e) => setBaseSalaryEtb(e.target.value)}
                placeholder="25000"
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">License Expiry Date</label>
              <input
                type="date"
                value={licenseExpiryDate}
                onChange={(e) => setLicenseExpiryDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 text-xs text-slate-400 space-y-1">
            <p className="flex items-center gap-1.5 text-teal-300 font-semibold">
              <Check className="w-3.5 h-3.5" /> Department Synchronized Across Systems
            </p>
            <p>Saving will update both staff HR credentials and EHR care-coordination routing in real-time.</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 font-semibold text-sm hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Save Assignment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal: Onboard New Staff ──────────────────────────────────────────────────
function OnboardStaffModal({
  isOpen,
  onClose,
  unassignedUsers,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  unassignedUsers: CandidateUser[];
  onSaved: (msg: string) => void;
}) {
  const [selectedUserId, setSelectedUserId] = useState("");
  const [department, setDepartment] = useState(STANDARD_DEPARTMENTS[0]);
  const [designation, setDesignation] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [baseSalaryEtb, setBaseSalaryEtb] = useState("25000");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (unassignedUsers.length > 0 && !selectedUserId) {
      setSelectedUserId(unassignedUsers[0].id);
    }
  }, [unassignedUsers, selectedUserId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (!selectedUserId) {
        alert("Please select a candidate user.");
        setIsSubmitting(false);
        return;
      }

      const res = await fetch("/api/v1/hr/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUserId,
          department,
          designation,
          employeeCode: employeeCode || `EMP-${Date.now().toString().slice(-4)}`,
          baseSalaryEtb,
          licenseNumber,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to onboard staff member.");
      }

      onSaved(`Successfully onboarded staff member to ${department}!`);
      onClose();
    } catch (err: any) {
      alert(err.message || "An error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Onboard Clinical or Support Staff</h3>
              <p className="text-xs text-slate-400">Assign role and initial department</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Select User from System *</label>
            {unassignedUsers.length > 0 ? (
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
              >
                {unassignedUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} ({u.role.replace(/_/g, " ")}) — {u.email}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-xs text-amber-400 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                All existing non-patient users are currently assigned to staff profiles.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Department *</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
              >
                {STANDARD_DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Designation / Title *</label>
              <input
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="e.g. Clinical Specialist"
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Employee Code</label>
              <input
                type="text"
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
                placeholder="Auto-generated if empty"
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Base Salary (ETB)</label>
              <input
                type="number"
                value={baseSalaryEtb}
                onChange={(e) => setBaseSalaryEtb(e.target.value)}
                placeholder="25000"
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Medical License / Certification #</label>
            <input
              type="text"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              placeholder="e.g. MD-ET-2024-5501"
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 font-semibold text-sm hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || unassignedUsers.length === 0}
              className="flex-1 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              Complete Onboarding
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal: Assign Duty Shift ──────────────────────────────────────────────────
function AssignShiftModal({
  isOpen,
  onClose,
  staffList,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  staffList: StaffMember[];
  onSaved: (msg: string) => void;
}) {
  const [staffId, setStaffId] = useState("");
  const [shiftTemplate, setShiftTemplate] = useState("morning");
  const [shiftDate, setShiftDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (staffList.length > 0 && !staffId) {
      setStaffId(staffList[0].id);
    }
  }, [staffList, staffId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const selectedStaff = staffList.find((s) => s.id === staffId);
      const res = await fetch("/api/v1/hr/roster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "assign_shift",
          staffId,
          shiftDate,
          shiftTemplate,
          department: selectedStaff?.department || "General Outpatient",
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to assign duty shift.");
      }

      onSaved(`Assigned ${shiftTemplate} shift to ${selectedStaff?.fullName} on ${shiftDate}!`);
      onClose();
    } catch (err: any) {
      alert(err.message || "Error assigning shift.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Assign Duty Shift</h3>
              <p className="text-xs text-slate-400">Schedule clinical coverage</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Staff Member *</label>
            <select
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
            >
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName} ({s.department} · {s.designation})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Shift Type *</label>
            <select
              value={shiftTemplate}
              onChange={(e) => setShiftTemplate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
            >
              {SHIFT_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label} ({t.time})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Shift Date *</label>
            <input
              type="date"
              value={shiftDate}
              onChange={(e) => setShiftDate(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Notes / Instructions</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Lead triage station coverage"
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 font-semibold text-sm hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Assign Shift
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal: Record Attendance ──────────────────────────────────────────────────
function RecordAttendanceModal({
  isOpen,
  onClose,
  staffList,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  staffList: StaffMember[];
  onSaved: (msg: string) => void;
}) {
  const [staffId, setStaffId] = useState("");
  const [status, setStatus] = useState("present");
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split("T")[0]);
  const [regularHours, setRegularHours] = useState("8.00");
  const [overtimeHours, setOvertimeHours] = useState("0.00");
  const [verificationMethod, setVerificationMethod] = useState("biometric");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (staffList.length > 0 && !staffId) {
      setStaffId(staffList[0].id);
    }
  }, [staffList, staffId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const selectedStaff = staffList.find((s) => s.id === staffId);
      const res = await fetch("/api/v1/hr/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "manual_record",
          staffId,
          attendanceDate,
          status,
          regularHours,
          overtimeHours,
          verificationMethod,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to record attendance.");
      }

      onSaved(`Attendance recorded for ${selectedStaff?.fullName} (${status})!`);
      onClose();
    } catch (err: any) {
      alert(err.message || "Error recording attendance.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Record Daily Attendance</h3>
              <p className="text-xs text-slate-400">Log presence, late arrivals, or shifts</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Staff Member *</label>
            <select
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
            >
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName} ({s.department})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Attendance Date</label>
              <input
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Status *</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
              >
                <option value="present">Present (On-Time)</option>
                <option value="late">Late Arrival</option>
                <option value="half_day">Half Day</option>
                <option value="absent">Absent</option>
                <option value="excused">Excused Absence</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Regular Hours</label>
              <input
                type="number"
                step="0.25"
                value={regularHours}
                onChange={(e) => setRegularHours(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Overtime Hours</label>
              <input
                type="number"
                step="0.25"
                value={overtimeHours}
                onChange={(e) => setOvertimeHours(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Verification Method</label>
            <select
              value={verificationMethod}
              onChange={(e) => setVerificationMethod(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
            >
              <option value="biometric">Biometric Scanner</option>
              <option value="pin">Terminal PIN Entry</option>
              <option value="manual">Manual Admin Override</option>
              <option value="geolocation">Hospital Geo-Fence</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 font-semibold text-sm hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Save Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal: Request Leave ──────────────────────────────────────────────────────
function RequestLeaveModal({
  isOpen,
  onClose,
  staffList,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  staffList: StaffMember[];
  onSaved: (msg: string) => void;
}) {
  const [staffId, setStaffId] = useState("");
  const [leaveType, setLeaveType] = useState("annual");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [totalDays, setTotalDays] = useState("3");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (staffList.length > 0 && !staffId) {
      setStaffId(staffList[0].id);
    }
  }, [staffList, staffId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const selectedStaff = staffList.find((s) => s.id === staffId);
      const res = await fetch("/api/v1/hr/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId,
          tenantId: "00000000-0000-0000-0000-000000000001",
          leaveType,
          startDate,
          endDate,
          totalDays: parseInt(totalDays) || 1,
          reason,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit leave request.");
      }

      onSaved(`Leave request submitted for ${selectedStaff?.fullName}!`);
      onClose();
    } catch (err: any) {
      alert(err.message || "Error submitting leave.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">New Leave Request</h3>
              <p className="text-xs text-slate-400">Submit staff leave application</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Staff Member *</label>
            <select
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
            >
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName} ({s.department})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Leave Category *</label>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
            >
              {Object.entries(LEAVE_TYPES).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Total Days</label>
            <input
              type="number"
              value={totalDays}
              onChange={(e) => setTotalDays(e.target.value)}
              required
              min="1"
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Reason / Clinical Context *</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Attending Annual Clinical Genetics Symposium in Addis Ababa"
              required
              rows={3}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 font-semibold text-sm hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Submit Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Tab: Overview ─────────────────────────────────────────────────────────────
function OverviewTab({
  staff,
  onOpenAssignModal,
  onNavigateTab,
}: {
  staff: StaffMember[];
  onOpenAssignModal: (s: StaffMember) => void;
  onNavigateTab: (tab: HRTab) => void;
}) {
  const active = staff.filter((s) => s.status === "active").length;
  const onLeave = staff.filter((s) => s.status === "on_leave").length;
  const expiringLicenses = staff.filter((s) => {
    if (!s.licenseExpiryDate) return false;
    const exp = new Date(s.licenseExpiryDate);
    const diff = (exp.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diff <= 120;
  });

  const deptCounts = staff.reduce((acc, s) => {
    acc[s.department] = (acc[s.department] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {expiringLicenses.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-300">Medical License Renewal Notice</p>
            <p className="text-xs text-amber-400/80 mt-0.5">
              {expiringLicenses.map((s) => s.fullName).join(", ")} — medical credentials approaching renewal deadline within 120 days.
            </p>
          </div>
          <button
            onClick={() => onNavigateTab("directory")}
            className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold hover:bg-amber-500/30 transition-colors"
          >
            Review Staff
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Staff" value={staff.length} sub="Across all units" icon={Users} color="teal" trend="up" />
        <KpiCard label="Active on Duty" value={active} sub="Operational status" icon={UserCheck} color="emerald" />
        <KpiCard label="On Approved Leave" value={onLeave} sub="Authorized absences" icon={CalendarDays} color="amber" />
        <KpiCard label="Licensure Alerts" value={expiringLicenses.length} sub="Impending renewals" icon={ShieldAlert} color="rose" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Department Headcount */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-teal-400" /> Department Staffing Headcount
            </h3>
            <button
              onClick={() => onNavigateTab("departments")}
              className="text-xs text-teal-400 hover:text-teal-300 font-semibold flex items-center gap-1"
            >
              Manage Allocations <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-3">
            {Object.entries(deptCounts).map(([dept, count]) => (
              <div key={dept} className="flex items-center gap-3">
                <span className="text-xs text-slate-300 w-44 truncate font-medium">{dept}</span>
                <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-500"
                    style={{ width: `${Math.max((count / Math.max(staff.length, 1)) * 100, 8)}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-teal-300 w-8 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Rapid Staff Department Assignment Table */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-teal-400" /> Quick Department Reassignment
            </h3>
            <span className="text-xs text-slate-500">Live Database Sync</span>
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {staff.slice(0, 6).map((s) => (
              <div key={s.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/80 hover:border-slate-700 transition-colors">
                <div className="min-w-0 flex-1 pr-2">
                  <p className="text-xs font-bold text-slate-200 truncate">{s.fullName}</p>
                  <p className="text-[11px] text-teal-400 truncate">{s.department} · {s.designation}</p>
                </div>
                <button
                  onClick={() => onOpenAssignModal(s)}
                  className="px-2.5 py-1 rounded-lg bg-teal-500/10 text-teal-300 border border-teal-500/30 text-xs font-semibold hover:bg-teal-500/20 transition-all flex items-center gap-1 flex-shrink-0"
                >
                  <Building2 className="w-3 h-3" /> Reassign
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Staff Directory ──────────────────────────────────────────────────────
function DirectoryTab({
  staff,
  onOpenAssignModal,
  onOpenOnboardModal,
}: {
  staff: StaffMember[];
  onOpenAssignModal: (s: StaffMember) => void;
  onOpenOnboardModal: () => void;
}) {
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("All");
  const [expanded, setExpanded] = useState<string | null>(null);

  const departments = ["All", ...Array.from(new Set(staff.map((s) => s.department)))];

  const filtered = staff.filter((s) => {
    const matchesDept = selectedDept === "All" || s.department === selectedDept;
    const q = search.toLowerCase();
    const matchesSearch =
      !search ||
      s.fullName.toLowerCase().includes(q) ||
      s.department.toLowerCase().includes(q) ||
      s.designation.toLowerCase().includes(q) ||
      s.employeeCode.toLowerCase().includes(q) ||
      (s.email && s.email.toLowerCase().includes(q));
    return matchesDept && matchesSearch;
  });

  return (
    <div className="space-y-4">
      {/* Action Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by staff name, department, role, code..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
          >
            {departments.map((d) => (
              <option key={d} value={d}>{d === "All" ? "All Departments" : d}</option>
            ))}
          </select>
          <button
            onClick={onOpenOnboardModal}
            className="px-4 py-2 rounded-xl bg-teal-500 text-slate-950 text-sm font-bold flex items-center gap-2 hover:bg-teal-400 transition-colors shadow-lg shadow-teal-500/10"
          >
            <UserPlus className="w-4 h-4" /> Onboard Staff
          </button>
        </div>
      </div>

      {/* Staff List */}
      <div className="space-y-2.5">
        {filtered.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-slate-900/60 border border-slate-800 text-slate-400">
            <Users className="w-8 h-8 mx-auto mb-2 text-slate-600" />
            <p className="text-sm font-semibold">No staff members found matching criteria.</p>
            <p className="text-xs text-slate-500 mt-1">Try clearing filters or onboarding a new member.</p>
          </div>
        ) : (
          filtered.map((s) => {
            const isExp = expanded === s.id;
            const daysToExpiry = s.licenseExpiryDate
              ? Math.floor((new Date(s.licenseExpiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              : null;

            return (
              <div
                key={s.id}
                className={`rounded-2xl border transition-all ${
                  isExp ? "bg-slate-900 border-teal-500/40 shadow-xl" : "bg-slate-900/70 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center gap-4 p-4">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white font-black text-sm flex-shrink-0 shadow-md">
                    {s.fullName.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-slate-100">{s.fullName}</p>
                      <StatusBadge status={s.status} size="xs" />
                      <span className="px-2 py-0.5 rounded-md bg-teal-500/10 border border-teal-500/30 text-teal-300 text-[11px] font-bold">
                        {s.department}
                      </span>
                      {daysToExpiry !== null && daysToExpiry <= 90 && (
                        <span className={`px-1.5 py-0.5 rounded-full border text-[10px] font-bold ${daysToExpiry <= 30 ? "bg-rose-500/15 border-rose-500/30 text-rose-300" : "bg-amber-500/15 border-amber-500/30 text-amber-300"}`}>
                          License: {daysToExpiry}d
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{s.designation} · {s.employeeCode} · {s.role.replace(/_/g, " ")}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right hidden md:block">
                      <p className="text-xs font-bold text-emerald-400">
                        {s.baseSalaryEtb ? parseInt(s.baseSalaryEtb).toLocaleString() : "0"} ETB
                      </p>
                      <p className="text-[10px] text-slate-500">Base Salary</p>
                    </div>

                    <button
                      onClick={() => onOpenAssignModal(s)}
                      className="px-3 py-1.5 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-300 text-xs font-bold transition-all flex items-center gap-1.5"
                      title="Assign or reassign staff department"
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>Assign Department</span>
                    </button>

                    <button
                      onClick={() => setExpanded(isExp ? null : s.id)}
                      className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                    >
                      {isExp ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {isExp && (
                  <div className="px-5 pb-5 pt-3 border-t border-slate-800/80 grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-950/40 rounded-b-2xl animate-in fade-in">
                    <div>
                      <p className="text-[10px] text-slate-500 mb-0.5">Email Address</p>
                      <p className="text-xs text-slate-200 font-medium truncate">{s.email || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 mb-0.5">Phone Number</p>
                      <p className="text-xs text-slate-200 font-medium">{s.phone || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 mb-0.5">Specialization</p>
                      <p className="text-xs text-slate-200 font-medium">{s.specialization || "General Medicine"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 mb-0.5">License Number & Expiry</p>
                      <p className="text-xs text-slate-200 font-medium">
                        {s.licenseNumber || "N/A"} {s.licenseExpiryDate ? `(${s.licenseExpiryDate})` : ""}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 mb-0.5">Employment Type</p>
                      <p className="text-xs text-slate-200 capitalize font-medium">{s.employmentType.replace(/_/g, " ")}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 mb-0.5">CME Credits</p>
                      <p className="text-xs text-violet-300 font-bold">{s.cmePoints} Points</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 mb-0.5">Hire Date</p>
                      <p className="text-xs text-slate-200 font-medium">{s.hiredAt}</p>
                    </div>
                    <div className="flex items-center">
                      <button
                        onClick={() => onOpenAssignModal(s)}
                        className="w-full py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 text-xs font-semibold border border-slate-700 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Edit Full Profile
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Tab: Department Allocation ───────────────────────────────────────────────
function DepartmentAllocationTab({
  staff,
  onOpenAssignModal,
  onOpenOnboardModal,
}: {
  staff: StaffMember[];
  onOpenAssignModal: (s: StaffMember) => void;
  onOpenOnboardModal: () => void;
}) {
  const departments = STANDARD_DEPARTMENTS;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">Department Allocation Matrix</h3>
          <p className="text-xs text-slate-400">Real-time staffing and operational unit distribution</p>
        </div>
        <button
          onClick={onOpenOnboardModal}
          className="px-4 py-2 rounded-xl bg-teal-500 text-slate-950 text-xs font-bold flex items-center gap-2 hover:bg-teal-400 transition-colors"
        >
          <UserPlus className="w-4 h-4" /> Onboard Staff to Department
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map((dept) => {
          const deptStaff = staff.filter((s) => s.department === dept);
          return (
            <div key={dept} className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 flex flex-col justify-between hover:border-slate-700 transition-all">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <h4 className="text-sm font-bold text-white truncate max-w-[180px]">{dept}</h4>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-teal-300 text-xs font-bold">
                    {deptStaff.length} Staff
                  </span>
                </div>

                <div className="space-y-2 mt-3 min-h-[90px]">
                  {deptStaff.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-2">No staff currently assigned to this department.</p>
                  ) : (
                    deptStaff.map((s) => (
                      <div key={s.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-950/40 border border-slate-800/80">
                        <div className="min-w-0 pr-2">
                          <p className="text-xs font-semibold text-slate-200 truncate">{s.fullName}</p>
                          <p className="text-[10px] text-slate-400 truncate">{s.designation}</p>
                        </div>
                        <button
                          onClick={() => onOpenAssignModal(s)}
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-teal-300 transition-colors"
                          title="Reassign to another department"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-medium">
                  {deptStaff.filter((s) => s.status === "active").length} Active
                </span>
                <button
                  onClick={onOpenOnboardModal}
                  className="text-xs text-teal-400 hover:text-teal-300 font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Assign Staff
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Tab: Duty Roster ─────────────────────────────────────────────────────────
function RosterTab({
  staff,
  rosterData,
  onOpenAssignShiftModal,
}: {
  staff: StaffMember[];
  rosterData: { rosters: any[]; shifts: any[] };
  onOpenAssignShiftModal: () => void;
}) {
  const [selectedDept, setSelectedDept] = useState("All");
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i - today.getDay());
    return d;
  });

  const shiftColors: Record<string, string> = {
    morning: "bg-amber-500/20 border-amber-500/40 text-amber-300",
    evening: "bg-violet-500/20 border-violet-500/40 text-violet-300",
    night: "bg-indigo-500/20 border-indigo-500/40 text-indigo-300",
    on_call_24h: "bg-rose-500/20 border-rose-500/40 text-rose-300",
    ward_rounds: "bg-teal-500/20 border-teal-500/40 text-teal-300",
  };

  const departments = ["All", ...Array.from(new Set(staff.map((s) => s.department)))];

  const filteredStaff = staff.filter((s) => selectedDept === "All" || s.department === selectedDept);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {departments.slice(0, 6).map((d) => (
            <button
              key={d}
              onClick={() => setSelectedDept(d)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                selectedDept === d ? "bg-teal-500/20 border-teal-500/40 text-teal-300" : "border-slate-700 text-slate-400 hover:border-slate-600"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
        <button
          onClick={onOpenAssignShiftModal}
          className="px-3.5 py-2 rounded-xl bg-teal-500 text-slate-950 text-xs font-bold flex items-center gap-1.5 hover:bg-teal-400 transition-colors shadow-md"
        >
          <Plus className="w-3.5 h-3.5" /> Assign Duty Shift
        </button>
      </div>

      {/* Shift Legend */}
      <div className="flex flex-wrap gap-2">
        {SHIFT_TEMPLATES.map((t) => (
          <span key={t.id} className={`px-2.5 py-1 rounded-full border text-[11px] font-semibold ${shiftColors[t.id] || "bg-slate-700 text-slate-400 border-slate-600"}`}>
            {t.label} · {t.time}
          </span>
        ))}
      </div>

      {/* Weekly Calendar Grid */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/60">
              <th className="text-left py-3 px-4 text-slate-400 font-semibold w-52">Staff Member</th>
              {days.map((d) => (
                <th
                  key={d.toISOString()}
                  className={`text-center py-3 px-2 border-b border-slate-800 font-semibold ${
                    d.toDateString() === today.toDateString() ? "text-teal-300 bg-teal-500/5" : "text-slate-400"
                  }`}
                >
                  <div>{d.toLocaleDateString("en", { weekday: "short" })}</div>
                  <div className={`text-[10px] mt-0.5 ${d.toDateString() === today.toDateString() ? "text-teal-400 font-black" : "text-slate-500"}`}>
                    {d.getDate()}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredStaff.map((s) => (
              <tr key={s.id} className="border-b border-slate-800/50 hover:bg-slate-900/40 transition-colors">
                <td className="py-2.5 px-4">
                  <p className="font-bold text-slate-200 truncate">{s.fullName}</p>
                  <p className="text-slate-500 text-[10px]">{s.designation} · {s.department}</p>
                </td>
                {days.map((d, di) => {
                  const dateStr = d.toISOString().split("T")[0];
                  const staffShift = rosterData.shifts.find(
                    (sh: any) => sh.staffId === s.id && sh.shiftDate === dateStr
                  );

                  return (
                    <td key={di} className={`py-2 px-1 text-center ${d.toDateString() === today.toDateString() ? "bg-teal-500/5" : ""}`}>
                      {staffShift ? (
                        <span className="inline-block px-2 py-0.5 rounded-lg border text-[10px] font-bold bg-teal-500/20 border-teal-500/40 text-teal-300">
                          {staffShift.status || "Scheduled"}
                        </span>
                      ) : (
                        <span className="text-slate-700">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Tab: Attendance Register ──────────────────────────────────────────────────
function AttendanceTab({
  attendanceList,
  onOpenRecordModal,
}: {
  attendanceList: any[];
  onOpenRecordModal: () => void;
}) {
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const statusIcons: Record<string, { icon: any; color: string }> = {
    present: { icon: CheckCircle2, color: "text-emerald-400" },
    absent: { icon: XCircle, color: "text-rose-400" },
    late: { icon: AlertCircle, color: "text-amber-400" },
    half_day: { icon: Clock, color: "text-cyan-400" },
    excused: { icon: Info, color: "text-slate-400" },
  };

  const presentCount = attendanceList.filter((a) => a.status === "present").length;
  const lateCount = attendanceList.filter((a) => a.status === "late").length;
  const absentCount = attendanceList.filter((a) => a.status === "absent").length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-200">Daily Clinical Attendance Register</h3>
          <p className="text-xs text-slate-500">{today}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            <div className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-xs font-bold text-emerald-300">
              {presentCount} Present
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-xs font-bold text-amber-300">
              {lateCount} Late
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-xs font-bold text-rose-300">
              {absentCount} Absent
            </div>
          </div>
          <button
            onClick={onOpenRecordModal}
            className="px-3.5 py-1.5 rounded-xl bg-teal-500 text-slate-950 text-xs font-bold flex items-center gap-1.5 hover:bg-teal-400 transition-colors shadow-md"
          >
            <Plus className="w-3.5 h-3.5" /> Record Attendance
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/60">
              <th className="text-left py-3 px-4 text-slate-400 font-semibold">Staff Member</th>
              <th className="text-left py-3 px-4 text-slate-400 font-semibold">Department</th>
              <th className="text-center py-3 px-4 text-slate-400 font-semibold">Date</th>
              <th className="text-center py-3 px-4 text-slate-400 font-semibold">Clock In</th>
              <th className="text-center py-3 px-4 text-slate-400 font-semibold">Clock Out</th>
              <th className="text-center py-3 px-4 text-slate-400 font-semibold">Hours</th>
              <th className="text-center py-3 px-4 text-slate-400 font-semibold">Method</th>
              <th className="text-center py-3 px-4 text-slate-400 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {attendanceList.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-6 text-center text-slate-500">
                  No attendance records recorded for today yet.
                </td>
              </tr>
            ) : (
              attendanceList.map((a, i) => {
                const si = statusIcons[a.status] || { icon: Info, color: "text-slate-400" };
                const clockInTime = a.clockIn ? new Date(a.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";
                const clockOutTime = a.clockOut ? new Date(a.clockOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";

                return (
                  <tr key={a.id || i} className="border-b border-slate-800/50 hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-200">{a.fullName || "Staff"}</td>
                    <td className="py-3 px-4 text-slate-400">{a.department || "Clinical"}</td>
                    <td className="py-3 px-4 text-center font-mono text-slate-400">{a.attendanceDate}</td>
                    <td className="py-3 px-4 text-center font-mono text-teal-300">{clockInTime}</td>
                    <td className="py-3 px-4 text-center font-mono text-teal-300">{clockOutTime}</td>
                    <td className="py-3 px-4 text-center text-slate-300">{a.regularHours || "8.00"}h</td>
                    <td className="py-3 px-4 text-center text-slate-400 capitalize">{a.verificationMethod || "PIN"}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="flex items-center justify-center gap-1">
                        <si.icon className={`w-3.5 h-3.5 ${si.color}`} />
                        <StatusBadge status={a.status} size="xs" />
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Tab: Leave Management ─────────────────────────────────────────────────────
function LeaveTab({
  leaveList,
  onOpenRequestModal,
  onAction,
}: {
  leaveList: any[];
  onOpenRequestModal: () => void;
  onAction: (leaveId: string, action: string) => Promise<void>;
}) {
  const [activeFilter, setActiveFilter] = useState("all");

  const filtered = activeFilter === "all"
    ? leaveList
    : leaveList.filter((l) => l.status === activeFilter);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          {["all", "pending", "approved_by_hod", "approved_by_hr", "rejected"].map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all capitalize ${
                activeFilter === f ? "bg-teal-500/20 border-teal-500/40 text-teal-300" : "border-slate-700 text-slate-400 hover:border-slate-600"
              }`}
            >
              {f.replace(/_/g, " ")}
            </button>
          ))}
        </div>
        <button
          onClick={onOpenRequestModal}
          className="px-3.5 py-1.5 rounded-xl bg-teal-500 text-slate-950 text-xs font-bold flex items-center gap-1.5 hover:bg-teal-400 transition-colors shadow-md"
        >
          <Plus className="w-3.5 h-3.5" /> Submit Leave Request
        </button>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-slate-900/60 border border-slate-800 text-slate-400">
            <CalendarDays className="w-8 h-8 mx-auto mb-2 text-slate-600" />
            <p className="text-sm font-semibold">No leave requests found.</p>
          </div>
        ) : (
          filtered.map((l) => {
            const lt = LEAVE_TYPES[l.leaveType] || { label: l.leaveType, color: "teal" };
            return (
              <div key={l.id} className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-bold text-slate-100">{l.fullName}</p>
                      <span className="px-2 py-0.5 rounded-full border text-[10px] font-bold bg-teal-500/10 border-teal-500/30 text-teal-300">
                        {lt.label}
                      </span>
                      <StatusBadge status={l.status} size="xs" />
                    </div>
                    <p className="text-xs text-slate-400">{l.designation} · {l.department}</p>
                    <p className="text-xs text-slate-300 mt-1">{l.reason}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-black text-white">{l.totalDays} days</p>
                    <p className="text-[10px] text-slate-500">{l.startDate} → {l.endDate}</p>
                  </div>
                </div>

                {l.status === "pending" && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-slate-800">
                    <button
                      onClick={() => onAction(l.id, "approve_hod")}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/25 transition-colors flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" /> Approve (HOD)
                    </button>
                    <button
                      onClick={() => onAction(l.id, "reject")}
                      className="px-3 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold hover:bg-rose-500/25 transition-colors flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                )}
                {l.status === "approved_by_hod" && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-slate-800">
                    <button
                      onClick={() => onAction(l.id, "approve_hr")}
                      className="px-3 py-1.5 rounded-lg bg-teal-500/15 border border-teal-500/30 text-teal-300 text-xs font-semibold hover:bg-teal-500/25 transition-colors flex items-center gap-1"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" /> Final HR Approval
                    </button>
                    <button
                      onClick={() => onAction(l.id, "reject")}
                      className="px-3 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold hover:bg-rose-500/25 transition-colors flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Tab: Payroll Engine ───────────────────────────────────────────────────────
function PayrollTab({ staff }: { staff: StaffMember[] }) {
  const [step, setStep] = useState(1);
  const [isComputing, setIsComputing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(9);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [computedRun, setComputedRun] = useState<any>(null);
  const [payrollItems, setPayrollItems] = useState<any[]>([]);
  const [isApproving, setIsApproving] = useState(false);

  const handleCompute = async () => {
    setIsComputing(true);
    try {
      const res = await fetch("/api/v1/hr/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "compute",
          tenantId: "00000000-0000-0000-0000-000000000001",
          periodMonth: selectedMonth,
          periodYear: selectedYear,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to compute payroll.");
      }

      setComputedRun(data.data.run);

      // Fetch items
      const itemsRes = await fetch("/api/v1/hr/payroll", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId: data.data.run.id }),
      });
      const itemsData = await itemsRes.json();
      if (itemsData.success) {
        setPayrollItems(itemsData.data);
      }

      setStep(2);
    } catch (err: any) {
      alert(err.message || "Error computing payroll.");
    } finally {
      setIsComputing(false);
    }
  };

  const handleApprove = async () => {
    if (!computedRun) return;
    setIsApproving(true);
    try {
      const res = await fetch("/api/v1/hr/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve",
          runId: computedRun.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setComputedRun(data.data);
        setStep(3);
      }
    } catch (err: any) {
      alert("Error approving payroll.");
    } finally {
      setIsApproving(false);
    }
  };

  const handleDisburse = async () => {
    if (!computedRun) return;
    try {
      const res = await fetch("/api/v1/hr/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "disburse",
          runId: computedRun.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setComputedRun(data.data);
        alert("Payroll disbursement executed via Telebirr & CBE Core Banking.");
      }
    } catch (err: any) {
      alert("Error executing disbursement.");
    }
  };

  return (
    <div className="space-y-5">
      {/* Wizard Steps */}
      <div className="flex items-center gap-2">
        {["Select Period & Compute", "Review & Verify PAYE", "Approve & Disburse"].map((label, i) => (
          <React.Fragment key={i}>
            <div className={`flex items-center gap-2 ${step > i + 1 ? "text-emerald-400" : step === i + 1 ? "text-teal-300" : "text-slate-500"}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black border ${step > i + 1 ? "bg-emerald-500/20 border-emerald-500/40" : step === i + 1 ? "bg-teal-500/20 border-teal-500/40" : "bg-slate-800 border-slate-700"}`}>
                {step > i + 1 ? <Check className="w-3 h-3" /> : i + 1}
              </div>
              <span className="text-xs font-semibold hidden sm:inline">{label}</span>
            </div>
            {i < 2 && <div className={`flex-1 h-0.5 rounded-full ${step > i + 1 ? "bg-emerald-500/40" : "bg-slate-800"}`} />}
          </React.Fragment>
        ))}
      </div>

      {step === 1 && (
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-5">
          <h3 className="text-sm font-bold text-slate-200">Ethiopian Clinical Payroll Configuration</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Payroll Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-teal-500"
              >
                {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-teal-500"
              >
                <option value={2026}>2026</option>
                <option value={2025}>2025</option>
              </select>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 text-xs text-slate-400 space-y-1.5">
            <p className="font-semibold text-teal-300">✓ Regulatory Tax Framework Applied:</p>
            <p>• Ethiopian PAYE Tax progressive brackets (0% up to 35% on gross salary)</p>
            <p>• Pension deductions: 7% employee contribution · 11% employer liability</p>
            <p>• Clinical on-call allowance and verified overtime integrated into gross computations</p>
          </div>

          <button
            onClick={handleCompute}
            disabled={isComputing || staff.length === 0}
            className="w-full py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg"
          >
            {isComputing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Compute Payroll Engine ({staff.length} Staff Members)
          </button>
        </div>
      )}

      {step >= 2 && computedRun && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-center">
              <p className="text-xs text-slate-500 mb-1">Total Gross Payroll</p>
              <p className="text-2xl font-black text-white">{parseFloat(computedRun.totalGrossEtb || "0").toLocaleString()}</p>
              <p className="text-xs text-slate-500">ETB</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-center">
              <p className="text-xs text-slate-500 mb-1">Total PAYE Tax Withheld</p>
              <p className="text-2xl font-black text-rose-400">{parseFloat(computedRun.totalPayeTaxEtb || "0").toLocaleString()}</p>
              <p className="text-xs text-slate-500">ETB</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/30 text-center">
              <p className="text-xs text-slate-500 mb-1">Total Net Payable</p>
              <p className="text-2xl font-black text-emerald-400">{parseFloat(computedRun.totalNetEtb || "0").toLocaleString()}</p>
              <p className="text-xs text-slate-500">ETB</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60">
                  {["Staff Member", "Department", "Base Salary", "Gross Pay", "PAYE Tax", "Pension (7%)", "Net Pay"].map((h) => (
                    <th key={h} className="py-3 px-3 text-left text-slate-400 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payrollItems.map((item) => (
                  <tr key={item.id} className="border-b border-slate-800/50 hover:bg-slate-900/40 transition-colors">
                    <td className="py-2.5 px-3">
                      <p className="font-bold text-slate-200">{item.fullName}</p>
                      <p className="text-slate-500 text-[10px]">{item.employeeCode}</p>
                    </td>
                    <td className="py-2.5 px-3 text-teal-300 font-medium">{item.department}</td>
                    <td className="py-2.5 px-3 text-slate-300">{parseFloat(item.baseSalaryEtb).toLocaleString()}</td>
                    <td className="py-2.5 px-3 font-bold text-white">{parseFloat(item.grossPayEtb).toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-rose-300">{parseFloat(item.payeTaxEtb).toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-slate-400">{parseFloat(item.pensionEmployeeEtb).toLocaleString()}</td>
                    <td className="py-2.5 px-3 font-black text-emerald-400">{parseFloat(item.netPayEtb).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {step === 2 && (
            <button
              onClick={handleApprove}
              disabled={isApproving}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm transition-all flex items-center justify-center gap-2 shadow-lg"
            >
              {isApproving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              Approve Payroll Run for Month {selectedMonth}/{selectedYear}
            </button>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-bold text-emerald-300">Payroll Approved & Ready for Bank / Mobile Wallet Transfer</p>
                  <p className="text-xs text-emerald-400/80 mt-0.5">
                    {parseFloat(computedRun.totalNetEtb || "0").toLocaleString()} ETB net pay computed for {payrollItems.length} staff members.
                  </p>
                </div>
                <button
                  onClick={handleDisburse}
                  className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-black transition-colors"
                >
                  Disburse Now
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
function HRManagementContent() {
  const [activeTab, setActiveTab] = useState<HRTab>("overview");
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [unassignedUsers, setUnassignedUsers] = useState<CandidateUser[]>([]);
  const [rosterData, setRosterData] = useState<{ rosters: any[]; shifts: any[] }>({ rosters: [], shifts: [] });
  const [attendanceList, setAttendanceList] = useState<any[]>([]);
  const [leaveList, setLeaveList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Modals
  const [selectedStaffForDept, setSelectedStaffForDept] = useState<StaffMember | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isOnboardModalOpen, setIsOnboardModalOpen] = useState(false);
  const [isAssignShiftModalOpen, setIsAssignShiftModalOpen] = useState(false);
  const [isRecordAttendanceModalOpen, setIsRecordAttendanceModalOpen] = useState(false);
  const [isRequestLeaveModalOpen, setIsRequestLeaveModalOpen] = useState(false);

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 5000);
  };

  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [staffRes, rosterRes, attendanceRes, leaveRes] = await Promise.all([
        fetch("/api/v1/hr/staff"),
        fetch("/api/v1/hr/roster"),
        fetch("/api/v1/hr/attendance"),
        fetch("/api/v1/hr/leave"),
      ]);

      if (staffRes.ok) {
        const data = await staffRes.json();
        if (data.success) {
          setStaff(data.data || []);
          setUnassignedUsers(data.unassignedUsers || []);
        }
      }

      if (rosterRes.ok) {
        const data = await rosterRes.json();
        if (data.success) {
          setRosterData(data.data || { rosters: [], shifts: [] });
        }
      }

      if (attendanceRes.ok) {
        const data = await attendanceRes.json();
        if (data.success) {
          setAttendanceList(data.data || []);
        }
      }

      if (leaveRes.ok) {
        const data = await leaveRes.json();
        if (data.success) {
          setLeaveList(data.data || []);
        }
      }
    } catch (err) {
      console.error("Error loading HR data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const handleLeaveAction = async (leaveId: string, action: string) => {
    try {
      const res = await fetch("/api/v1/hr/leave", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leaveId, action }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Leave request ${action.replace(/_/g, " ")} successfully.`);
        loadAllData();
      }
    } catch (err) {
      alert("Error updating leave request.");
    }
  };

  const openAssignModal = (member: StaffMember) => {
    setSelectedStaffForDept(member);
    setIsAssignModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Toast Notification */}
      {feedbackToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-emerald-500 text-slate-950 font-bold text-sm shadow-2xl animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{feedbackToast}</span>
          <button onClick={() => setFeedbackToast(null)} className="ml-2 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link href="/admin" className="p-2 rounded-lg hover:bg-slate-800 transition-colors">
                <ArrowLeft className="w-4 h-4 text-slate-400" />
              </Link>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-black text-white">Human Resource Management Hub</h1>
                <p className="text-[10px] text-slate-400">Department Assignments · Shift Rostering · Attendance · Payroll</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadAllData}
                disabled={isLoading}
                className="p-2 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 transition-all flex items-center gap-1 text-xs"
                title="Refresh Live HR Data"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-teal-400" : ""}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <Link
                href="/admin/hr/approvals"
                className="px-3 py-1.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold hover:border-teal-500/50 hover:text-teal-300 transition-colors flex items-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                <span className="hidden md:inline">Provider Approvals</span>
              </Link>
              <button
                onClick={() => setIsOnboardModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-teal-500 text-slate-950 text-xs font-bold flex items-center gap-1.5 hover:bg-teal-400 transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" /> Onboard Staff
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-1 pb-0.5 overflow-x-auto scrollbar-hide">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-t-lg border-b-2 whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? "border-teal-400 text-teal-300 bg-teal-500/5 font-bold"
                    : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700"
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoading && staff.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-teal-400 mb-2" />
            <p className="text-sm font-semibold">Synchronizing with Clinical HR Database…</p>
          </div>
        ) : (
          <>
            {activeTab === "overview" && (
              <OverviewTab
                staff={staff}
                onOpenAssignModal={openAssignModal}
                onNavigateTab={(tab) => setActiveTab(tab)}
              />
            )}
            {activeTab === "directory" && (
              <DirectoryTab
                staff={staff}
                onOpenAssignModal={openAssignModal}
                onOpenOnboardModal={() => setIsOnboardModalOpen(true)}
              />
            )}
            {activeTab === "departments" && (
              <DepartmentAllocationTab
                staff={staff}
                onOpenAssignModal={openAssignModal}
                onOpenOnboardModal={() => setIsOnboardModalOpen(true)}
              />
            )}
            {activeTab === "roster" && (
              <RosterTab
                staff={staff}
                rosterData={rosterData}
                onOpenAssignShiftModal={() => setIsAssignShiftModalOpen(true)}
              />
            )}
            {activeTab === "attendance" && (
              <AttendanceTab
                attendanceList={attendanceList}
                onOpenRecordModal={() => setIsRecordAttendanceModalOpen(true)}
              />
            )}
            {activeTab === "leave" && (
              <LeaveTab
                leaveList={leaveList}
                onOpenRequestModal={() => setIsRequestLeaveModalOpen(true)}
                onAction={handleLeaveAction}
              />
            )}
            {activeTab === "payroll" && <PayrollTab staff={staff} />}
          </>
        )}
      </div>

      {/* Interactive Modals */}
      <AssignDepartmentModal
        staffMember={selectedStaffForDept}
        isOpen={isAssignModalOpen}
        onClose={() => {
          setIsAssignModalOpen(false);
          setSelectedStaffForDept(null);
        }}
        onSaved={(msg) => {
          showToast(msg);
          loadAllData();
        }}
      />

      <OnboardStaffModal
        isOpen={isOnboardModalOpen}
        onClose={() => setIsOnboardModalOpen(false)}
        unassignedUsers={unassignedUsers}
        onSaved={(msg) => {
          showToast(msg);
          loadAllData();
        }}
      />

      <AssignShiftModal
        isOpen={isAssignShiftModalOpen}
        onClose={() => setIsAssignShiftModalOpen(false)}
        staffList={staff}
        onSaved={(msg) => {
          showToast(msg);
          loadAllData();
        }}
      />

      <RecordAttendanceModal
        isOpen={isRecordAttendanceModalOpen}
        onClose={() => setIsRecordAttendanceModalOpen(false)}
        staffList={staff}
        onSaved={(msg) => {
          showToast(msg);
          loadAllData();
        }}
      />

      <RequestLeaveModal
        isOpen={isRequestLeaveModalOpen}
        onClose={() => setIsRequestLeaveModalOpen(false)}
        staffList={staff}
        onSaved={(msg) => {
          showToast(msg);
          loadAllData();
        }}
      />
    </div>
  );
}
