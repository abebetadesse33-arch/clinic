"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClinic } from "../context/ClinicContext";
import { Role } from "../lib/types/clinical";
import {
  ROLE_CAPABILITIES_MATRIX,
  getRolePrimaryNav,
  getRoleScopeDetails,
  canAccessRoute,
} from "../lib/security/roles-permissions";
import CommandPalette from "./CommandPalette";
import ThemeToggle from "./ui/ThemeToggle";
import LanguageSelector from "./ui/LanguageSelector";
import NotificationBell from "./layout/NotificationBell";
import { useTranslation } from "../lib/i18n/translations";
import {
  Activity,
  Calendar,
  Zap,
  MessageSquare,
  FlaskConical,
  User,
  ShieldCheck,
  PhoneCall,
  ChevronDown,
  LogOut,
  Sparkles,
  Stethoscope,
  HeartPulse,
  Building2,
  FolderOpen,
  CheckCircle2,
  Users,
  DollarSign,
  Receipt,
  Pill,
  Menu,
  X,
  Smartphone,
  Mic,
  Cpu,
  HelpCircle,
  FileText,
  Sliders,
  Search,
} from "lucide-react";

export default function NavigationHeader() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const {
    currentRole,
    setCurrentRole,
    currentUser,
    isGuest,
    logout,
  } = useClinic();

  // Dropdown states
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  const navRef = useRef<HTMLDivElement>(null);

  // Global command palette event listener
  useEffect(() => {
    const handleOpenPalette = () => setIsCommandPaletteOpen(true);
    window.addEventListener("open-command-palette", handleOpenPalette);
    return () => window.removeEventListener("open-command-palette", handleOpenPalette);
  }, []);

  // Close dropdowns on route change or outside click
  useEffect(() => {
    setOpenDropdown(null);
    setShowRoleMenu(false);
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
        setShowRoleMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (pathname.startsWith("/mobile-clinic")) {
    return null;
  }

  const isPatientOrGuest = isGuest || currentRole === "guest" || currentRole === "patient";
  const isAdminRole = (currentRole === "system_admin" || currentRole === "tenant_admin") &&
    (currentRole === "system_admin" || Boolean(currentUser?.isAdminGrantedBySuperAdmin));

  const toggleDropdown = (name: string) => {
    setOpenDropdown((prev) => (prev === name ? null : name));
  };

  return (
    <>
      <header ref={navRef} className="hidden md:block sticky top-0 z-40 w-full border-b border-sky-200/80 dark:border-slate-800 bg-sky-50/95 dark:bg-slate-950/95 backdrop-blur-xl transition-colors">
        {/* Top 24/7 On-Demand Healthcare Sub-bar */}
        <div className="bg-gradient-to-r from-sky-100 via-cyan-50 to-blue-50 dark:from-slate-950 dark:via-sky-950/40 dark:to-slate-900 text-slate-700 dark:text-slate-300 py-1.5 px-4 sm:px-6 lg:px-8 text-xs border-b border-sky-200/80 dark:border-slate-800 transition-colors">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-sky-800 dark:text-sky-300 font-semibold">
                <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
                <span>24/7 On-Demand Care Active</span>
              </span>
              <span className="text-slate-400 dark:text-slate-500 hidden sm:inline">•</span>
              <span className="text-slate-600 dark:text-slate-400 hidden sm:inline">
                Virtual visits anywhere in minutes or same-day in-office appointments
              </span>
            </div>

            <div className="flex items-center gap-4 text-[11px]">
              <Link
                href="/services/virtual-urgent-care/triage"
                className="text-amber-700 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300 font-bold flex items-center gap-1 transition-colors"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Treat Me Now™</span>
              </Link>
              <span className="text-slate-300 dark:text-slate-700 hidden md:inline">•</span>
              <span className="hidden md:flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                <PhoneCall className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                <span>24/7 Nurse Hotline: <strong className="text-slate-900 dark:text-white font-bold">(888) 663-6331</strong></span>
              </span>
            </div>
          </div>
        </div>

        {/* Main Navigation Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3">
            {/* Logo & Brand */}
            <div className="flex items-center gap-4 shrink-0">
              <Link href="/" className="flex items-center gap-2.5 group">
                <div className="w-9 h-9 rounded-xl bg-[#075985] text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform shrink-0">
                  <HeartPulse className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-[#16324F] dark:text-white text-lg tracking-tight font-display">
                      Nini<span className="text-[#075985] dark:text-sky-400">Med</span>
                    </span>
                  </div>
                  <span className="text-[10px] text-[#58738A] dark:text-slate-400 tracking-wide font-medium block">
                    One Medical Clinical Network
                  </span>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation Menus */}
            <div className="hidden lg:flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              {/* 1. GUEST EXPLORATION NAV */}
              {isGuest && (
                <nav className="flex items-center gap-1">
                  <Link
                    href="/services/primary-care"
                    className="px-3 py-2 rounded-full text-slate-700 dark:text-slate-200 hover:bg-[#FAF8F5] dark:hover:bg-slate-800 hover:text-[#005C4B] transition-colors"
                  >
                    Services
                  </Link>
                  <Link
                    href="/locations"
                    className="px-3 py-2 rounded-full text-slate-700 dark:text-slate-200 hover:bg-[#FAF8F5] dark:hover:bg-slate-800 hover:text-[#005C4B] transition-colors"
                  >
                    Locations & Offices
                  </Link>
                  <Link
                    href="/#how-it-works"
                    className="px-3 py-2 rounded-full text-slate-700 dark:text-slate-200 hover:bg-[#FAF8F5] dark:hover:bg-slate-800 hover:text-[#005C4B] transition-colors"
                  >
                    How It Works
                  </Link>
                  <Link
                    href="/membership"
                    className="px-3 py-2 rounded-full text-slate-700 dark:text-slate-200 hover:bg-[#FAF8F5] dark:hover:bg-slate-800 hover:text-[#005C4B] transition-colors"
                  >
                    Membership & Pricing
                  </Link>
                </nav>
              )}

              {/* 2. PATIENT PORTAL NAV */}
              {currentRole === "patient" && (
                <nav className="flex items-center gap-1">
                  <Link
                    href="/patient/dashboard"
                    className={`px-3 py-2 rounded-full transition-colors flex items-center gap-1.5 ${
                      pathname === "/patient/dashboard"
                        ? "bg-[#E8F4F0] dark:bg-emerald-950/60 text-[#005C4B] dark:text-emerald-300"
                        : "text-slate-700 dark:text-slate-200 hover:bg-[#FAF8F5] dark:hover:bg-slate-800 hover:text-[#005C4B]"
                    }`}
                  >
                    <span>Dashboard</span>
                  </Link>
                  <Link
                    href="/patient/book"
                    className={`px-3 py-2 rounded-full transition-colors flex items-center gap-1.5 ${
                      pathname === "/patient/book"
                        ? "bg-[#E8F4F0] dark:bg-emerald-950/60 text-[#005C4B] dark:text-emerald-300"
                        : "text-slate-700 dark:text-slate-200 hover:bg-[#FAF8F5] dark:hover:bg-slate-800 hover:text-[#005C4B]"
                    }`}
                  >
                    <span>Book Visit</span>
                    <span className="badge-mint text-[9px] py-0 px-1.5">Same-day</span>
                  </Link>

                  {/* Patient Care Dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => toggleDropdown("patientCare")}
                      className={`px-3 py-2 rounded-full transition-colors flex items-center gap-1 ${
                        pathname.startsWith("/patient/") && pathname !== "/patient/dashboard" && pathname !== "/patient/book"
                          ? "bg-[#E8F4F0] dark:bg-emerald-950/60 text-[#005C4B] dark:text-emerald-300"
                          : "text-slate-700 dark:text-slate-200 hover:bg-[#FAF8F5] dark:hover:bg-slate-800 hover:text-[#005C4B]"
                      }`}
                    >
                      <HeartPulse className="w-3.5 h-3.5 text-[#005C4B]" />
                      <span>My Health & Records</span>
                      <ChevronDown className={`w-3 h-3 transition-transform ${openDropdown === "patientCare" ? "rotate-180" : ""}`} />
                    </button>

                    {openDropdown === "patientCare" && (
                      <div className="absolute left-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-2xl border border-[#E7E2D8] dark:border-slate-700 shadow-warm-lg p-2 z-50 animate-fade-in space-y-1">
                        <Link
                          href="/patient/appointments"
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#FAF8F5] dark:hover:bg-slate-700 text-[#33413C] dark:text-slate-200 flex items-center gap-2.5"
                        >
                          <Calendar className="w-4 h-4 text-[#005C4B]" />
                          <div>
                            <span className="block font-bold text-xs">My Appointments</span>
                            <span className="block text-[10px] text-[#687B74] dark:text-slate-400">View & reschedule visits</span>
                          </div>
                        </Link>
                        <Link
                          href="/patient/messages"
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#FAF8F5] dark:hover:bg-slate-700 text-[#33413C] dark:text-slate-200 flex items-center gap-2.5"
                        >
                          <MessageSquare className="w-4 h-4 text-[#005C4B]" />
                          <div>
                            <span className="block font-bold text-xs">Care Messages</span>
                            <span className="block text-[10px] text-[#687B74] dark:text-slate-400">Direct provider chat</span>
                          </div>
                        </Link>
                        <Link
                          href="/patient/health"
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#FAF8F5] dark:hover:bg-slate-700 text-[#33413C] dark:text-slate-200 flex items-center gap-2.5"
                        >
                          <FlaskConical className="w-4 h-4 text-[#005C4B]" />
                          <div>
                            <span className="block font-bold text-xs">Labs & Diagnostics</span>
                            <span className="block text-[10px] text-[#687B74] dark:text-slate-400">Test results & prescriptions</span>
                          </div>
                        </Link>
                        <Link
                          href="/patient/account"
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#FAF8F5] dark:hover:bg-slate-700 text-[#33413C] dark:text-slate-200 flex items-center gap-2.5"
                        >
                          <User className="w-4 h-4 text-[#005C4B]" />
                          <div>
                            <span className="block font-bold text-xs">Billing & Insurance</span>
                            <span className="block text-[10px] text-[#687B74] dark:text-slate-400">Coverage & payment history</span>
                          </div>
                        </Link>
                      </div>
                    )}
                  </div>
                </nav>
              )}

              {/* 3. CLINICAL STAFF & SPECIALIST ORGANIZED DROPDOWN NAV */}
              {!isPatientOrGuest && (
                <nav className="flex items-center gap-1">
                  {/* Top-Level Workstation */}
                  <Link
                    href="/"
                    className={`px-3 py-2 rounded-full flex items-center gap-1.5 transition-colors ${
                      pathname === "/"
                        ? "bg-[#E8F4F0] dark:bg-emerald-950/60 text-[#005C4B] dark:text-emerald-300"
                        : "hover:bg-[#FAF8F5] dark:hover:bg-slate-800 hover:text-[#005C4B]"
                    }`}
                  >
                    <Stethoscope className="w-3.5 h-3.5 text-[#005C4B]" />
                    <span>Workstation</span>
                  </Link>

                  {/* Dropdown 1: Clinical Care & Queue */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => toggleDropdown("clinicalCare")}
                      className={`px-3 py-2 rounded-full transition-colors flex items-center gap-1.5 ${
                        pathname.startsWith("/appointments") ||
                        pathname.startsWith("/triage") ||
                        pathname.startsWith("/cases") ||
                        pathname.startsWith("/clinical") ||
                        pathname.startsWith("/pharmacy")
                          ? "bg-[#E8F4F0] dark:bg-emerald-950/60 text-[#005C4B] dark:text-emerald-300 font-bold"
                          : "hover:bg-[#FAF8F5] dark:hover:bg-slate-800 hover:text-[#005C4B]"
                      }`}
                    >
                      <Activity className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Clinical Care</span>
                      <ChevronDown className={`w-3 h-3 transition-transform ${openDropdown === "clinicalCare" ? "rotate-180" : ""}`} />
                    </button>

                    {openDropdown === "clinicalCare" && (
                      <div className="absolute left-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-2xl border border-[#E7E2D8] dark:border-slate-700 shadow-warm-lg p-2 z-50 animate-fade-in space-y-1">
                        <Link
                          href="/appointments"
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#FAF8F5] dark:hover:bg-slate-700 text-[#33413C] dark:text-slate-200 flex items-center gap-2.5"
                        >
                          <Calendar className="w-4 h-4 text-[#005C4B]" />
                          <div>
                            <span className="block font-bold text-xs">Appointments Hub</span>
                            <span className="block text-[10px] text-[#687B74] dark:text-slate-400">Scheduled visits & tele-rooms</span>
                          </div>
                        </Link>
                        <Link
                          href="/triage"
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#FAF8F5] dark:hover:bg-slate-700 text-[#33413C] dark:text-slate-200 flex items-center gap-2.5"
                        >
                          <Sparkles className="w-4 h-4 text-amber-500" />
                          <div>
                            <span className="block font-bold text-xs">Triage & Intake Hub</span>
                            <span className="block text-[10px] text-[#687B74] dark:text-slate-400">ESI 1–5 scoring & routing</span>
                          </div>
                        </Link>
                        <Link
                          href="/cases"
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#FAF8F5] dark:hover:bg-slate-700 text-[#33413C] dark:text-slate-200 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2.5">
                            <FolderOpen className="w-4 h-4 text-[#005C4B]" />
                            <div>
                              <span className="block font-bold text-xs">Cases & Clinical Queue</span>
                              <span className="block text-[10px] text-[#687B74] dark:text-slate-400">Patient queues & handoffs</span>
                            </div>
                          </div>
                          <span className="badge-terracotta text-[9px] py-0 px-1.5">3 Due</span>
                        </Link>
                        <Link
                          href="/clinical/journey"
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#FAF8F5] dark:hover:bg-slate-700 text-[#33413C] dark:text-slate-200 flex items-center gap-2.5"
                        >
                          <Activity className="w-4 h-4 text-emerald-600" />
                          <div>
                            <span className="block font-bold text-xs">Patient Journey Timeline</span>
                            <span className="block text-[10px] text-[#687B74] dark:text-slate-400">Continuous care pathway</span>
                          </div>
                        </Link>
                        <Link
                          href="/pharmacy"
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#FAF8F5] dark:hover:bg-slate-700 text-[#33413C] dark:text-slate-200 flex items-center gap-2.5"
                        >
                          <Pill className="w-4 h-4 text-teal-600" />
                          <div>
                            <span className="block font-bold text-xs">Pharmacy & Dispensing</span>
                            <span className="block text-[10px] text-[#687B74] dark:text-slate-400">e-Prescriptions & inventory</span>
                          </div>
                        </Link>
                        <Link
                          href="/referrals"
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#FAF8F5] dark:hover:bg-slate-700 text-[#33413C] dark:text-slate-200 flex items-center gap-2.5"
                        >
                          <Zap className="w-4 h-4 text-teal-600" />
                          <div>
                            <span className="block font-bold text-xs">Hospital Orders & Referrals</span>
                            <span className="block text-[10px] text-[#687B74] dark:text-slate-400">Labs, PT, Imaging & Specialists</span>
                          </div>
                        </Link>
                        <div className="pt-1.5 mt-1.5 border-t border-[#F2EFE9] dark:border-slate-700/60">
                          <Link
                            href="/clinical/ai-orchestrator"
                            className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-[#FAF8F5] dark:hover:bg-slate-700 text-[#33413C] dark:text-slate-200 flex items-center gap-2 text-xs"
                          >
                            <Cpu className="w-3.5 h-3.5 text-indigo-500" />
                            <span>AI Decision Orchestrator</span>
                          </Link>
                          <Link
                            href="/clinical/voice-scribe"
                            className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-[#FAF8F5] dark:hover:bg-slate-700 text-[#33413C] dark:text-slate-200 flex items-center gap-2 text-xs"
                          >
                            <Mic className="w-3.5 h-3.5 text-rose-500" />
                            <span>Ambient Voice Scribe</span>
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Dropdown 2: Provider & Practice */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => toggleDropdown("providerPractice")}
                      className={`px-3 py-2 rounded-full transition-colors flex items-center gap-1.5 ${
                        pathname.startsWith("/provider/") || pathname.startsWith("/telegram") || pathname.startsWith("/messages") || pathname.startsWith("/patients")
                          ? "bg-[#E8F4F0] dark:bg-emerald-950/60 text-[#005C4B] dark:text-emerald-300 font-bold"
                          : "hover:bg-[#FAF8F5] dark:hover:bg-slate-800 hover:text-[#005C4B]"
                      }`}
                    >
                      <User className="w-3.5 h-3.5 text-[#005C4B]" />
                      <span>Practice & Shifts</span>
                      <ChevronDown className={`w-3 h-3 transition-transform ${openDropdown === "providerPractice" ? "rotate-180" : ""}`} />
                    </button>

                    {openDropdown === "providerPractice" && (
                      <div className="absolute left-0 mt-2 w-60 bg-white dark:bg-slate-800 rounded-2xl border border-[#E7E2D8] dark:border-slate-700 shadow-warm-lg p-2 z-50 animate-fade-in space-y-1">
                        <Link
                          href="/provider/profile"
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#FAF8F5] dark:hover:bg-slate-700 text-[#33413C] dark:text-slate-200 flex items-center gap-2.5"
                        >
                          <User className="w-4 h-4 text-[#005C4B]" />
                          <div>
                            <span className="block font-bold text-xs">My Profile & Services</span>
                            <span className="block text-[10px] text-[#687B74] dark:text-slate-400">Bio, pricing & weekly shifts</span>
                          </div>
                        </Link>
                        <Link
                          href="/telegram/miniapp"
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#FAF8F5] dark:hover:bg-slate-700 text-[#33413C] dark:text-slate-200 flex items-center gap-2.5"
                        >
                          <Smartphone className="w-4 h-4 text-blue-500" />
                          <div>
                            <span className="block font-bold text-xs">Telegram Bot & Mini App</span>
                            <span className="block text-[10px] text-[#687B74] dark:text-slate-400">Mobile queue & alerts</span>
                          </div>
                        </Link>
                        <Link
                          href="/patients"
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#FAF8F5] dark:hover:bg-slate-700 text-[#33413C] dark:text-slate-200 flex items-center gap-2.5"
                        >
                          <Users className="w-4 h-4 text-[#005C4B]" />
                          <div>
                            <span className="block font-bold text-xs">Patient Directory</span>
                            <span className="block text-[10px] text-[#687B74] dark:text-slate-400">Search EHR & histories</span>
                          </div>
                        </Link>
                        <Link
                          href="/messages"
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#FAF8F5] dark:hover:bg-slate-700 text-[#33413C] dark:text-slate-200 flex items-center gap-2.5"
                        >
                          <MessageSquare className="w-4 h-4 text-[#005C4B]" />
                          <div>
                            <span className="block font-bold text-xs">Team Messages</span>
                            <span className="block text-[10px] text-[#687B74] dark:text-slate-400">Internal clinical threads</span>
                          </div>
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Dropdown 3: Administration & HR (For Admins / Coordinators) */}
                  {isAdminRole && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => toggleDropdown("adminGov")}
                        className={`px-3 py-2 rounded-full transition-colors flex items-center gap-1.5 ${
                          pathname.startsWith("/admin/") || pathname.startsWith("/billing/")
                            ? "bg-[#E8F4F0] dark:bg-emerald-950/60 text-[#005C4B] dark:text-emerald-300 font-bold"
                            : "hover:bg-[#FAF8F5] dark:hover:bg-slate-800 hover:text-[#005C4B]"
                        }`}
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-[#005C4B]" />
                        <span>Administration</span>
                        <ChevronDown className={`w-3 h-3 transition-transform ${openDropdown === "adminGov" ? "rotate-180" : ""}`} />
                      </button>

                      {openDropdown === "adminGov" && (
                        <div className="absolute left-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-2xl border border-[#E7E2D8] dark:border-slate-700 shadow-warm-lg p-2 z-50 animate-fade-in space-y-1">
                          <Link
                            href="/admin/configuration"
                            className="w-full text-left px-3 py-2 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 flex items-center justify-between border border-teal-500/30"
                          >
                            <div className="flex items-center gap-2.5">
                              <Sliders className="w-4 h-4 text-teal-400" />
                              <div>
                                <span className="block font-bold text-xs">Dynamic App Config</span>
                                <span className="block text-[10px] text-teal-400/80">Navigation, CMS, widgets & forms</span>
                              </div>
                            </div>
                            <span className="badge-mint text-[9px] py-0 px-1.5 font-bold">Dynamic</span>
                          </Link>
                          <Link
                            href="/admin/hr/approvals"
                            className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#FAF8F5] dark:hover:bg-slate-700 text-[#33413C] dark:text-slate-200 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2.5">
                              <ShieldCheck className="w-4 h-4 text-[#005C4B]" />
                              <div>
                                <span className="block font-bold text-xs">HR Profile Approvals</span>
                                <span className="block text-[10px] text-[#687B74] dark:text-slate-400">Verify licenses & shifts</span>
                              </div>
                            </div>
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                          </Link>
                          <Link
                            href="/admin/files"
                            className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#FAF8F5] dark:hover:bg-slate-700 text-[#33413C] dark:text-slate-200 flex items-center gap-2.5"
                          >
                            <FolderOpen className="w-4 h-4 text-teal-600" />
                            <div>
                              <span className="block font-bold text-xs">Clinical Files & Vault</span>
                              <span className="block text-[10px] text-[#687B74] dark:text-slate-400">Prescriptions, labs & scans</span>
                            </div>
                          </Link>
                          <Link
                            href="/admin/hr"
                            className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#FAF8F5] dark:hover:bg-slate-700 text-[#33413C] dark:text-slate-200 flex items-center gap-2.5"
                          >
                            <Users className="w-4 h-4 text-[#005C4B]" />
                            <div>
                              <span className="block font-bold text-xs">HR Staff Directory</span>
                              <span className="block text-[10px] text-[#687B74] dark:text-slate-400">Recruitment & department</span>
                            </div>
                          </Link>
                          <Link
                            href="/admin/finance"
                            className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#FAF8F5] dark:hover:bg-slate-700 text-[#33413C] dark:text-slate-200 flex items-center gap-2.5"
                          >
                            <DollarSign className="w-4 h-4 text-emerald-600" />
                            <div>
                              <span className="block font-bold text-xs">Finance & Revenue Cycle</span>
                              <span className="block text-[10px] text-[#687B74] dark:text-slate-400">Claims & tariff billing</span>
                            </div>
                          </Link>
                          <Link
                            href="/billing/pos"
                            className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#FAF8F5] dark:hover:bg-slate-700 text-[#33413C] dark:text-slate-200 flex items-center gap-2.5"
                          >
                            <Receipt className="w-4 h-4 text-cyan-600" />
                            <div>
                              <span className="block font-bold text-xs">Point of Sale (POS)</span>
                              <span className="block text-[10px] text-[#687B74] dark:text-slate-400">Onsite register checkout</span>
                            </div>
                          </Link>
                          <div className="pt-1 mt-1 border-t border-[#F2EFE9] dark:border-slate-700/60">
                            <Link
                              href="/admin/roles"
                              className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-[#FAF8F5] dark:hover:bg-slate-700 text-[#33413C] dark:text-slate-200 flex items-center gap-2 text-xs"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 text-violet-500" />
                              <span>Roles & Permissions</span>
                            </Link>
                            <Link
                              href="/admin/workflows"
                              className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-[#FAF8F5] dark:hover:bg-slate-700 text-[#33413C] dark:text-slate-200 flex items-center gap-2 text-xs"
                            >
                              <Zap className="w-3.5 h-3.5 text-amber-500" />
                              <span>Clinical Workflows</span>
                            </Link>
                            <Link
                              href="/admin/feedback-analytics"
                              className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-[#FAF8F5] dark:hover:bg-slate-700 text-[#33413C] dark:text-slate-200 flex items-center gap-2 text-xs"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                              <span>Quality Analytics</span>
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </nav>
              )}
            </div>

            {/* Right CTAs & Profile Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Quick Spotlight Search / Command Palette Launcher */}
              <button
                type="button"
                onClick={() => setIsCommandPaletteOpen(true)}
                className="hidden md:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100/90 dark:bg-slate-850 hover:bg-teal-50/80 dark:hover:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 text-xs text-slate-600 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-300 transition-all shadow-xs group"
                title="Search EHR records, vitals, tools (Ctrl+K or ⌘K)"
              >
                <Search className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 group-hover:scale-110 transition-transform" />
                <span className="font-medium text-[11px]">Search EHR</span>
                <kbd className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded shadow-xs">
                  ⌘K
                </kbd>
              </button>

              {/* Mobile Search Icon Button */}
              <button
                type="button"
                onClick={() => setIsCommandPaletteOpen(true)}
                className="md:hidden p-1.5 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700"
                title="Search (⌘K)"
              >
                <Search className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              </button>

              {/* Localization Selector */}
              <LanguageSelector />

              {/* Theme Toggle */}
              <ThemeToggle />

              {/* Real-time Notifications Bell */}
              <NotificationBell />

              {/* Quick Treat Me Now Launcher */}
              <button
                onClick={() => {
                  window.location.href = !isGuest && currentRole === "patient"
                    ? "/services/virtual-urgent-care/triage"
                    : "/signin?redirect=" + encodeURIComponent("/services/virtual-urgent-care/triage");
                }}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#FEF7E6] border border-[#F9E2A8] text-[#B8801C] hover:bg-[#F9E2A8] text-xs font-bold transition-all shadow-sm shrink-0"
              >
                <Zap className="w-3.5 h-3.5 fill-[#E5A93C] text-[#E5A93C]" />
                <span>Treat Me Now</span>
              </button>

              {/* Guest CTA */}
              {isGuest && (
                <div className="flex items-center gap-2">
                  <Link
                    href="/signin"
                    className="btn-pill-ghost text-xs hidden sm:inline-flex"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/patient/book"
                    className="btn-pill-primary text-xs py-2 px-3 sm:px-4 shadow-sm"
                  >
                    Book Visit
                  </Link>
                </div>
              )}

              {/* Patient CTA */}
              {currentRole === "patient" && (
                <Link
                  href="/patient/book"
                  className="btn-pill-primary text-xs py-1.5 px-3 hidden sm:inline-flex"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Book</span>
                </Link>
              )}

              {/* Profile / Account Actions Dropdown */}
              {!isGuest && (
                <div className="relative">
                  <button
                    onClick={() => setShowRoleMenu(!showRoleMenu)}
                    className="flex items-center gap-2 p-1.5 rounded-full border border-[#E7E2D8] dark:border-slate-700 hover:border-[#005C4B] bg-[#FAF8F5] dark:bg-slate-800 transition-all"
                    title="Account Menu"
                  >
                    <div className="w-7 h-7 rounded-full bg-[#005C4B] text-white flex items-center justify-center font-bold text-xs shrink-0">
                      {(currentUser.fullName || "User")
                        .split(" ")
                        .map((n: string) => n[0] || "")
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div className="hidden md:block text-left pr-1.5 text-[11px] leading-tight">
                      <span className="font-bold text-[#162E27] dark:text-white block truncate max-w-[100px]">
                        {currentUser.fullName}
                      </span>
                      <span className="text-[#687B74] dark:text-slate-400 capitalize block text-[9px]">
                        {currentRole === "patient" ? "Patient" : currentRole.replace("_", " ")}
                      </span>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-[#687B74] dark:text-slate-400 pr-0.5" />
                  </button>

                  {/* Account Dropdown */}
                  {showRoleMenu && (
                    <div className="absolute right-0 mt-2 w-72 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.2)] p-3 z-50 animate-fade-in divide-y divide-slate-100 dark:divide-slate-800/80">
                      <div className="px-3 py-2.5 mb-1 bg-slate-50/80 dark:bg-slate-800/50 rounded-xl">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-white text-xs block truncate">{currentUser.fullName}</span>
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
                            {currentRole === "patient" ? "Patient" : currentRole.replace("_", " ")}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate mt-0.5">{currentUser.email}</span>
                      </div>

                      {/* Patient Links */}
                      {currentRole === "patient" && (
                        <div className="py-1.5 space-y-0.5 text-xs">
                          <Link
                            href="/patient/account"
                            onClick={() => setShowRoleMenu(false)}
                            className="w-full text-left px-3 py-2 rounded-xl text-[#33413C] dark:text-slate-200 hover:bg-[#FAF8F5] dark:hover:bg-slate-700 flex items-center gap-2"
                          >
                            <User className="w-3.5 h-3.5 text-[#005C4B]" />
                            <span>My Profile & Insurance</span>
                          </Link>
                          <Link
                            href="/patient/health"
                            onClick={() => setShowRoleMenu(false)}
                            className="w-full text-left px-3 py-2 rounded-xl text-[#33413C] dark:text-slate-200 hover:bg-[#FAF8F5] dark:hover:bg-slate-700 flex items-center gap-2"
                          >
                            <FlaskConical className="w-3.5 h-3.5 text-[#005C4B]" />
                            <span>Medical Records & Labs</span>
                          </Link>
                        </div>
                      )}

                      {/* Quick Workstation Switcher for Clinicians & Admins */}
                      {(currentRole === "system_admin" || currentRole === "tenant_admin" || currentRole === "physician" || currentRole === "nurse") && (
                        <div className="py-2 border-t border-[#F2EFE9] dark:border-slate-700 space-y-1">
                          <span className="px-3 text-[10px] font-bold text-[#687B74] dark:text-slate-400 uppercase tracking-wider block">
                            Workstation Switcher
                          </span>
                          <button
                            onClick={() => {
                              setCurrentRole("physician");
                              setShowRoleMenu(false);
                            }}
                            className={`w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center justify-between ${
                              currentRole === "physician"
                                ? "bg-[#E8F4F0] dark:bg-emerald-950/60 text-[#005C4B] dark:text-emerald-300 font-bold"
                                : "text-[#33413C] dark:text-slate-200 hover:bg-[#FAF8F5] dark:hover:bg-slate-700"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Stethoscope className="w-3.5 h-3.5" />
                              <span>Physician Workstation</span>
                            </div>
                            {currentRole === "physician" && <CheckCircle2 className="w-3.5 h-3.5 text-[#005C4B]" />}
                          </button>
                          <button
                            onClick={() => {
                              setCurrentRole("tenant_admin");
                              setShowRoleMenu(false);
                            }}
                            className={`w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center justify-between ${
                              currentRole === "tenant_admin"
                                ? "bg-[#E8F4F0] dark:bg-emerald-950/60 text-[#005C4B] dark:text-emerald-300 font-bold"
                                : "text-[#33413C] dark:text-slate-200 hover:bg-[#FAF8F5] dark:hover:bg-slate-700"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Building2 className="w-3.5 h-3.5" />
                              <span>Admin Portal</span>
                            </div>
                            {currentRole === "tenant_admin" && <CheckCircle2 className="w-3.5 h-3.5 text-[#005C4B]" />}
                          </button>
                        </div>
                      )}

                      <div className="pt-2 border-t border-[#F2EFE9] dark:border-slate-700">
                        <button
                          onClick={() => {
                            logout();
                            setShowRoleMenu(false);
                          }}
                          className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-[#D96B43] hover:bg-[#FBECE7] dark:hover:bg-rose-950/40 flex items-center gap-2 font-semibold"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Mobile Hamburger Toggle Button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-xl text-[#33413C] dark:text-slate-200 hover:bg-[#FAF8F5] dark:hover:bg-slate-800 border border-[#E7E2D8] dark:border-slate-700"
                aria-label="Toggle Mobile Menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile & Tablet Slide-Down Organized Menu Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-[#E7E2D8] dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-4 space-y-4 max-h-[80vh] overflow-y-auto animate-fade-in shadow-xl">
            {/* Quick Treat Me Now CTA */}
            <button
              onClick={() => {
                window.location.href = !isGuest && currentRole === "patient"
                  ? "/services/virtual-urgent-care/triage"
                  : "/signin?redirect=" + encodeURIComponent("/services/virtual-urgent-care/triage");
              }}
              className="w-full py-2.5 rounded-2xl bg-[#FEF7E6] border border-[#F9E2A8] text-[#B8801C] font-bold text-xs flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4 fill-[#E5A93C] text-[#E5A93C]" />
              <span>Launch Treat Me Now™</span>
            </button>

            {/* Guest Mobile Navigation */}
            {isGuest && (
              <div className="space-y-1 text-xs font-semibold">
                <Link
                  href="/services/primary-care"
                  className="block px-3 py-2 rounded-xl text-[#33413C] dark:text-slate-200 hover:bg-[#FAF8F5] dark:hover:bg-slate-800"
                >
                  Services & Specialty Care
                </Link>
                <Link
                  href="/locations"
                  className="block px-3 py-2 rounded-xl text-[#33413C] dark:text-slate-200 hover:bg-[#FAF8F5] dark:hover:bg-slate-800"
                >
                  Locations & Clinics
                </Link>
                <Link
                  href="/membership"
                  className="block px-3 py-2 rounded-xl text-[#33413C] dark:text-slate-200 hover:bg-[#FAF8F5] dark:hover:bg-slate-800"
                >
                  Membership & Pricing
                </Link>
              </div>
            )}

            {/* Patient Mobile Navigation */}
            {currentRole === "patient" && (
              <div className="space-y-3 text-xs">
                <div className="font-bold text-[11px] text-[#687B74] uppercase tracking-wider px-2">Patient Services</div>
                <div className="space-y-1 font-semibold">
                  <Link
                    href="/patient/dashboard"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-[#FAF8F5] dark:hover:bg-slate-800 text-[#33413C] dark:text-slate-200"
                  >
                    <HeartPulse className="w-4 h-4 text-[#005C4B]" />
                    <span>My Dashboard</span>
                  </Link>
                  <Link
                    href="/patient/appointments"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-[#FAF8F5] dark:hover:bg-slate-800 text-[#33413C] dark:text-slate-200"
                  >
                    <Calendar className="w-4 h-4 text-[#005C4B]" />
                    <span>My Booked Appointments</span>
                  </Link>
                  <Link
                    href="/patient/messages"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-[#FAF8F5] dark:hover:bg-slate-800 text-[#33413C] dark:text-slate-200"
                  >
                    <MessageSquare className="w-4 h-4 text-[#005C4B]" />
                    <span>Care Messages</span>
                  </Link>
                  <Link
                    href="/patient/health"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-[#FAF8F5] dark:hover:bg-slate-800 text-[#33413C] dark:text-slate-200"
                  >
                    <FlaskConical className="w-4 h-4 text-[#005C4B]" />
                    <span>Medical Records & Labs</span>
                  </Link>
                  <Link
                    href="/patient/account"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-[#FAF8F5] dark:hover:bg-slate-800 text-[#33413C] dark:text-slate-200"
                  >
                    <User className="w-4 h-4 text-[#005C4B]" />
                    <span>Account & Coverage</span>
                  </Link>
                </div>
              </div>
            )}

            {/* Clinician & Staff Mobile Sections */}
            {!isPatientOrGuest && (
              <div className="space-y-4 text-xs">
                {/* Section 1: Clinical Hub */}
                <div className="space-y-1">
                  <span className="font-bold text-[10px] text-[#687B74] uppercase tracking-wider px-2 block">
                    Clinical Workstation
                  </span>
                  <Link
                    href="/"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-[#FAF8F5] dark:hover:bg-slate-800 font-semibold text-[#33413C] dark:text-slate-200"
                  >
                    <Stethoscope className="w-4 h-4 text-[#005C4B]" />
                    <span>Clinical Workstation</span>
                  </Link>
                  <Link
                    href="/appointments"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-[#FAF8F5] dark:hover:bg-slate-800 font-semibold text-[#33413C] dark:text-slate-200"
                  >
                    <Calendar className="w-4 h-4 text-[#005C4B]" />
                    <span>Appointments Hub</span>
                  </Link>
                  <Link
                    href="/triage"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-[#FAF8F5] dark:hover:bg-slate-800 font-semibold text-[#33413C] dark:text-slate-200"
                  >
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Triage & Intake Hub</span>
                  </Link>
                  <Link
                    href="/cases"
                    className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[#FAF8F5] dark:hover:bg-slate-800 font-semibold text-[#33413C] dark:text-slate-200"
                  >
                    <div className="flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-[#005C4B]" />
                      <span>Cases & Queue</span>
                    </div>
                    <span className="badge-terracotta text-[9px] py-0 px-1.5">3 Due</span>
                  </Link>
                  <Link
                    href="/clinical/journey"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-[#FAF8F5] dark:hover:bg-slate-800 font-semibold text-[#33413C] dark:text-slate-200"
                  >
                    <Activity className="w-4 h-4 text-emerald-600" />
                    <span>Patient Journey Timeline</span>
                  </Link>
                  <Link
                    href="/pharmacy"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-[#FAF8F5] dark:hover:bg-slate-800 font-semibold text-[#33413C] dark:text-slate-200"
                  >
                    <Pill className="w-4 h-4 text-teal-600" />
                    <span>Pharmacy & Dispensing</span>
                  </Link>
                </div>

                {/* Section 2: Provider & Shifts */}
                <div className="space-y-1 border-t border-[#F2EFE9] dark:border-slate-800 pt-3">
                  <span className="font-bold text-[10px] text-[#687B74] uppercase tracking-wider px-2 block">
                    My Practice & Shifts
                  </span>
                  <Link
                    href="/provider/profile"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-[#FAF8F5] dark:hover:bg-slate-800 font-semibold text-[#33413C] dark:text-slate-200"
                  >
                    <User className="w-4 h-4 text-[#005C4B]" />
                    <span>My Profile, Services & Shifts</span>
                  </Link>
                  <Link
                    href="/telegram/miniapp"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-[#FAF8F5] dark:hover:bg-slate-800 font-semibold text-[#33413C] dark:text-slate-200"
                  >
                    <Smartphone className="w-4 h-4 text-blue-500" />
                    <span>Telegram Bot & Mini App</span>
                  </Link>
                </div>

                {/* Section 3: Admin & Operations */}
                {isAdminRole && (
                  <div className="space-y-1 border-t border-[#F2EFE9] dark:border-slate-800 pt-3">
                    <span className="font-bold text-[10px] text-[#687B74] uppercase tracking-wider px-2 block">
                      Operations & HR
                    </span>
                    <Link
                      href="/admin/hr/approvals"
                      className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[#FAF8F5] dark:hover:bg-slate-800 font-semibold text-[#33413C] dark:text-slate-200"
                    >
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-[#005C4B]" />
                        <span>HR Profile Approvals</span>
                      </div>
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                    </Link>
                    <Link
                      href="/admin/files"
                      className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-[#FAF8F5] dark:hover:bg-slate-800 font-semibold text-[#33413C] dark:text-slate-200"
                    >
                      <FolderOpen className="w-4 h-4 text-teal-600" />
                      <span>Clinical Files & Vault</span>
                    </Link>
                    <Link
                      href="/admin/hr"
                      className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-[#FAF8F5] dark:hover:bg-slate-800 font-semibold text-[#33413C] dark:text-slate-200"
                    >
                      <Users className="w-4 h-4 text-[#005C4B]" />
                      <span>HR Staff Directory</span>
                    </Link>
                    <Link
                      href="/admin/finance"
                      className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-[#FAF8F5] dark:hover:bg-slate-800 font-semibold text-[#33413C] dark:text-slate-200"
                    >
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      <span>Finance & Revenue Cycle</span>
                    </Link>
                    <Link
                      href="/billing/pos"
                      className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-[#FAF8F5] dark:hover:bg-slate-800 font-semibold text-[#33413C] dark:text-slate-200"
                    >
                      <Receipt className="w-4 h-4 text-cyan-600" />
                      <span>Point of Sale (POS)</span>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </header>

      {/* Global Clinical Command Palette & Quick Launcher */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />
    </>
  );
}
