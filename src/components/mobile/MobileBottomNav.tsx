"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Calendar,
  MapPin,
  Pill,
  User,
  Activity,
  PlusCircle,
} from "lucide-react";
import { useClinic } from "@/context/ClinicContext";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { currentUser } = useClinic();

  if (
    pathname.startsWith("/mobile-clinic") ||
    pathname === "/signin" ||
    pathname === "/login"
  ) {
    return null;
  }

  const NAV_ITEMS = [
    {
      label: "Home",
      href: "/",
      icon: Home,
      isActive: pathname === "/",
    },
    {
      label: "Book Visit",
      href: "/patient/book",
      icon: Calendar,
      isActive: pathname.startsWith("/patient/book"),
    },
    {
      label: "Clinics GPS",
      href: "/locations",
      icon: MapPin,
      isActive: pathname === "/locations",
    },
    {
      label: "Rx & Labs",
      href: currentUser?.role === "pharmacist" ? "/pharmacy" : currentUser?.role === "biologist" ? "/biologist" : "/patient/dashboard",
      icon: Pill,
      isActive: pathname === "/pharmacy" || pathname === "/biologist" || pathname === "/patient/dashboard",
    },
    {
      label: currentUser?.fullName ? "Profile" : "Sign In",
      href: currentUser?.role && currentUser.role !== "guest" ? `/${currentUser.role === "patient" ? "patient/dashboard" : currentUser.role.replace("_", "-")}` : "/signin",
      icon: User,
      isActive: pathname === "/signin" || pathname.startsWith("/patient") || pathname.startsWith("/admin"),
    },
  ];

  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-t border-slate-200/80 dark:border-slate-800 px-3 py-2 safe-area-bottom shadow-lg shadow-slate-900/5 dark:shadow-black/40">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = item.isActive;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all ${
                active
                  ? "text-[#005C4B] dark:text-teal-400 font-bold"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium"
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-all ${
                  active
                    ? "bg-[#005C4B]/10 dark:bg-teal-500/15 text-[#005C4B] dark:text-teal-400 scale-110"
                    : "hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[11px] mt-0.5 tracking-tight whitespace-nowrap">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
