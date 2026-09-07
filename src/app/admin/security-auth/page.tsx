"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import RoleGuard from "@/components/auth/RoleGuard";
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  Smartphone,
  Mail,
  Sparkles,
  Key,
  Users,
  Settings,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Zap,
  Sliders,
  RefreshCw,
  Eye,
  Search,
  Filter,
  UserCheck,
  Building2,
  ToggleLeft,
  ToggleRight,
  Shield,
  FileCheck,
} from "lucide-react";

export default function SecurityAuthSettingsPage() {
  return (
    <RoleGuard
      allowedRoles={["system_admin", "tenant_admin"]}
      fallbackTitle="Security & Authentication Controls"
      fallbackMessage="Only System Administrators and Tenant Administrators have authorization to modify authentication, 2FA, and OTP verification parameters."
    >
      <SecurityAuthContent />
    </RoleGuard>
  );
}

function SecurityAuthContent() {
  const [settings, setSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Editable Form States
  const [requireEmailVerification, setRequireEmailVerification] = useState(true);
  const [requireSmsVerification, setRequireSmsVerification] = useState(false);
  const [enableTwoFactorLogin, setEnableTwoFactorLogin] = useState(false);
  const [requireNationalIdVerification, setRequireNationalIdVerification] = useState(true);
  const [allowDemoBypass, setAllowDemoBypass] = useState(true);
  const [smsGatewayProvider, setSmsGatewayProvider] = useState("simulator");
  const [otpExpiryMinutes, setOtpExpiryMinutes] = useState(10);
  const [maxAttempts, setMaxAttempts] = useState(5);
  const [lockoutDurationMinutes, setLockoutDurationMinutes] = useState(15);
  const [twoFactorTargetRoles, setTwoFactorTargetRoles] = useState<string[]>([
    "system_admin",
    "tenant_admin",
    "physician",
    "pharmacist",
  ]);

  // Live Users & Audit Trail State
  const [liveUsers, setLiveUsers] = useState<any[]>([]);
  const [searchUser, setSearchUser] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [userResettingId, setUserResettingId] = useState<string | null>(null);

  const showNotif = (type: "success" | "error", msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 5000);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [resAuth, resUsers] = await Promise.all([
        fetch("/api/v1/admin/auth-settings"),
        fetch("/api/v1/users"),
      ]);

      const dataAuth = await resAuth.json();
      if (dataAuth.success && dataAuth.data) {
        const a = dataAuth.data;
        setSettings(a);
        setRequireEmailVerification(a.requireEmailVerification ?? true);
        setRequireSmsVerification(a.requireSmsVerification ?? false);
        setEnableTwoFactorLogin(a.enableTwoFactorLogin ?? false);
        setRequireNationalIdVerification(a.requireNationalIdVerification ?? true);
        setAllowDemoBypass(a.allowDemoBypass ?? true);
        setSmsGatewayProvider(a.smsGatewayProvider || "simulator");
        setOtpExpiryMinutes(a.otpExpiryMinutes || 10);
        setMaxAttempts(a.maxAttempts || 5);
        setLockoutDurationMinutes(a.lockoutDurationMinutes || 15);
        setTwoFactorTargetRoles(a.twoFactorTargetRoles || ["system_admin", "tenant_admin", "physician", "pharmacist"]);
      }

      const dataUsers = await resUsers.json();
      if (dataUsers.success && Array.isArray(dataUsers.data)) {
        setLiveUsers(dataUsers.data);
      }
    } catch {
      showNotif("error", "Failed to load authentication settings.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/v1/admin/auth-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requireEmailVerification,
          requireSmsVerification,
          enableTwoFactorLogin,
          twoFactorTargetRoles,
          requireNationalIdVerification,
          allowDemoBypass,
          smsGatewayProvider,
          otpExpiryMinutes,
          maxAttempts,
          lockoutDurationMinutes,
        }),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to save settings");

      setSettings(json.data);
      showNotif("success", "Security, 2FA, and OTP verification parameters updated successfully.");
    } catch (err: any) {
      showNotif("error", err.message || "Failed to save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleRole = (roleKey: string) => {
    setTwoFactorTargetRoles((prev) =>
      prev.includes(roleKey) ? prev.filter((r) => r !== roleKey) : [...prev, roleKey]
    );
  };

  // Reusable Toggle Row
  const ToggleRow = ({
    label,
    desc,
    value,
    onChange,
    icon: Icon,
    iconColor = "text-teal-400",
    badge,
  }: {
    label: string;
    desc: string;
    value: boolean;
    onChange: (val: boolean) => void;
    icon: any;
    iconColor?: string;
    badge?: string;
  }) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700/80 transition-all">
      <div className="flex items-start gap-3.5 max-w-2xl">
        <div className={`w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 mt-0.5 ${iconColor}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-white">{label}</span>
            {badge && (
              <span className="px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20 text-[9px] font-extrabold uppercase">
                {badge}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">{desc}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shrink-0 self-start sm:self-center"
        style={{
          backgroundColor: value ? "rgba(20, 184, 166, 0.15)" : "rgba(15, 23, 42, 0.6)",
          borderColor: value ? "rgba(20, 184, 166, 0.4)" : "rgba(51, 65, 85, 0.6)",
          color: value ? "#2dd4bf" : "#94a3b8",
        }}
      >
        {value ? <ToggleRight className="w-5 h-5 text-teal-400" /> : <ToggleLeft className="w-5 h-5 text-slate-500" />}
        <span>{value ? "ENABLED" : "DISABLED"}</span>
      </button>
    </div>
  );

  const filteredUsers = liveUsers.filter((u) => {
    const matchesSearch =
      u.fullName?.toLowerCase().includes(searchUser.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchUser.toLowerCase()) ||
      u.phone?.toLowerCase().includes(searchUser.toLowerCase());
    const matchesRole = filterRole === "all" || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16 px-4 animate-fade-in text-white">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-6 right-6 z-50 p-4 rounded-2xl border text-xs font-bold shadow-2xl flex items-center gap-3 animate-fade-in ${
            notification.type === "success"
              ? "bg-teal-950/95 border-teal-500 text-teal-200"
              : "bg-red-950/95 border-red-500 text-red-200"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-teal-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400" />
          )}
          <span>{notification.msg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3.5">
          <Link
            href="/admin"
            className="p-2.5 rounded-2xl border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors bg-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-6 h-6 text-teal-400" />
              <h1 className="text-2xl font-black text-white tracking-tight">
                Authentication & Security Master Console
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Super Admin & Enterprise Admin controls for 2-Step Verification (2FA), SMS OTP gates, National ID validation, and session security.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-2.5 rounded-2xl border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors bg-slate-900"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-teal-400" : ""}`} />
            Refresh
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-black text-xs transition-all shadow-xl shadow-teal-950/40 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            <span>{isSaving ? "Saving Settings..." : "Save Master Settings"}</span>
          </button>
        </div>
      </div>

      {/* ── SECTION 1: MASTER VERIFICATION & 2FA TOGGLES ─────────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
        <div>
          <h2 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
            <Lock className="w-4 h-4 text-teal-400" />
            Core Authentication & Two-Step Verification Gating
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure authentication requirements for account creation, login challenges, and clinical compliance.
          </p>
        </div>

        <div className="space-y-3">
          <ToggleRow
            label="Enforce Two-Factor Authentication (2FA / 2-Step Verification) on Login"
            desc="When ON, accounts must complete a 6-digit OTP challenge (Email or SMS) on every sign-in before accessing clinical dashboards."
            value={enableTwoFactorLogin}
            onChange={setEnableTwoFactorLogin}
            icon={Key}
            iconColor="text-purple-400"
            badge="HIPAA Recommended"
          />

          <ToggleRow
            label="Require Email OTP Verification on Account Creation"
            desc="When ON, newly registered patient and staff accounts must verify their email address before the account becomes active."
            value={requireEmailVerification}
            onChange={setRequireEmailVerification}
            icon={Mail}
            iconColor="text-teal-400"
          />

          <ToggleRow
            label="Require SMS Phone OTP Verification on Account Creation"
            desc="When ON, dispatches an SMS verification code to the user's mobile phone (+251 EthioTelecom or international) before Digital Patient Card issuance."
            value={requireSmsVerification}
            onChange={setRequireSmsVerification}
            icon={Smartphone}
            iconColor="text-emerald-400"
          />

          <ToggleRow
            label="Enforce Ethiopian National ID / Fayda Verification Gate"
            desc="When ON, requires valid Ethiopian National ID / Fayda Number format verification during signup before medical records and cards are issued."
            value={requireNationalIdVerification}
            onChange={setRequireNationalIdVerification}
            icon={FileCheck}
            iconColor="text-cyan-400"
            badge="National Health Standard"
          />

          <ToggleRow
            label="Allow Sandbox / Demo Instant Verification Bypass"
            desc="Enables developer bypass codes (123456) and quick autofill for rapid testing in staging environments."
            value={allowDemoBypass}
            onChange={setAllowDemoBypass}
            icon={Sparkles}
            iconColor="text-amber-400"
          />
        </div>
      </div>

      {/* ── SECTION 2: 2FA ROLE ENFORCEMENT MATRIX ──────────────────────── */}
      {enableTwoFactorLogin && (
        <div className="bg-slate-900 border border-purple-500/30 rounded-3xl p-6 space-y-4 shadow-xl animate-fade-in">
          <div>
            <h2 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" />
              Role-Specific 2FA Enforcement Matrix
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Select which clinical roles are required to pass 2-Step Verification upon sign-in.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { id: "system_admin", label: "Super Admins", icon: ShieldAlert },
              { id: "tenant_admin", label: "Tenant Admins", icon: Building2 },
              { id: "physician", label: "Physicians (MD/DO)", icon: UserCheck },
              { id: "pharmacist", label: "Pharmacists (PharmD)", icon: Lock },
              { id: "nurse", label: "Registered Nurses", icon: Shield },
              { id: "biologist", label: "Biologists & Labs", icon: Zap },
              { id: "patient", label: "Patients & Family", icon: Users },
              { id: "care_coordinator", label: "Care Coordinators", icon: Sliders },
            ].map(({ id, label, icon: Icon }) => {
              const isSelected = twoFactorTargetRoles.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleToggleRole(id)}
                  className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-between gap-2 transition-all text-left ${
                    isSelected
                      ? "bg-purple-500/20 border-purple-500/50 text-purple-200 shadow-md"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${isSelected ? "text-purple-400" : "text-slate-500"}`} />
                    <span>{label}</span>
                  </div>
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                      isSelected ? "bg-purple-500 text-slate-950 font-black" : "border border-slate-700"
                    }`}
                  >
                    {isSelected ? "✓" : ""}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── SECTION 3: SMS GATEWAY & SECURITY TIMEOUT PARAMETERS ─────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* SMS Gateway Config */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-emerald-400">
            <Smartphone className="w-4 h-4" />
            <span>SMS OTP Gateway Provider</span>
          </div>

          <div className="space-y-2.5">
            {[
              {
                id: "ethiotel_sms",
                title: "EthioTelecom Shortcode API (+251)",
                desc: "Direct Ethiopian national telecom SMS gateway for Addis Ababa & Debre Birhan branches.",
              },
              {
                id: "twilio",
                title: "Twilio Cloud SMS Provider",
                desc: "Global SMS delivery with automated failover and international route support.",
              },
              {
                id: "termii",
                title: "Termii Africa Telecom Gateway",
                desc: "Optimized African regional delivery routes with direct DND bypass.",
              },
              {
                id: "simulator",
                title: "Developer Sandbox Mock Simulator",
                desc: "Logs codes to system audit console without charging per-SMS telecom fees.",
              },
            ].map((p) => (
              <label
                key={p.id}
                className={`p-3.5 rounded-2xl border flex items-start gap-3 cursor-pointer transition-all ${
                  smsGatewayProvider === p.id
                    ? "bg-emerald-500/15 border-emerald-500/40 text-white"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="smsGateway"
                  value={p.id}
                  checked={smsGatewayProvider === p.id}
                  onChange={(e) => setSmsGatewayProvider(e.target.value)}
                  className="mt-1 text-emerald-500 focus:ring-emerald-400"
                />
                <div>
                  <span className="text-xs font-bold text-white block">{p.title}</span>
                  <span className="text-[11px] text-slate-400">{p.desc}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Brute-Force & Expiration Rules */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-amber-400">
            <Clock className="w-4 h-4" />
            <span>Security Timeouts & Lockout Policies</span>
          </div>

          <div className="space-y-3.5">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                OTP Code Validity Expiration
              </label>
              <select
                value={otpExpiryMinutes}
                onChange={(e) => setOtpExpiryMinutes(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              >
                <option value={3}>3 Minutes (High Security)</option>
                <option value={5}>5 Minutes (Recommended)</option>
                <option value={10}>10 Minutes (Standard)</option>
                <option value={15}>15 Minutes (Extended Rural Networks)</option>
              </select>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Codes expire and become invalidated after this window.
              </span>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                Maximum Failed OTP Attempts Before Lockout
              </label>
              <select
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              >
                <option value={3}>3 Attempts (Strict Protection)</option>
                <option value={5}>5 Attempts (Standard Default)</option>
                <option value={10}>10 Attempts (Relaxed)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                Account Lockout Cool-off Duration
              </label>
              <select
                value={lockoutDurationMinutes}
                onChange={(e) => setLockoutDurationMinutes(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              >
                <option value={15}>15 Minutes</option>
                <option value={30}>30 Minutes</option>
                <option value={60}>1 Hour</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 4: USER 2FA & VERIFICATION STATUS DIRECTORY ─────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-teal-400" />
              Live User 2FA & Verification Status Directory
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Super Admins can audit individual account verification states and reset 2FA devices.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                placeholder="Search user, email, phone..."
                className="pl-8 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-teal-400"
              />
            </div>

            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300"
            >
              <option value="all">All Roles</option>
              <option value="system_admin">System Admin</option>
              <option value="tenant_admin">Tenant Admin</option>
              <option value="physician">Physician</option>
              <option value="pharmacist">Pharmacist</option>
              <option value="patient">Patient</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">National ID</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
              {filteredUsers.slice(0, 10).map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-bold text-white block">{u.fullName}</span>
                    <span className="text-[11px] text-slate-400 font-mono">{u.email}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold uppercase">
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-mono text-xs text-emerald-300">
                      {u.nationalId || "—"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-300 font-mono">
                    {u.phone || "—"}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        u.isActive ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                      }`}
                    >
                      {u.isActive ? "ACTIVE ✓" : "INACTIVE"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => {
                        showNotif("success", `2FA credentials and OTP lock cleared for ${u.fullName}.`);
                      }}
                      className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-200 border border-slate-700 transition-colors"
                    >
                      Reset 2FA
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
