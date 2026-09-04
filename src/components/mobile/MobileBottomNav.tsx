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
    <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0A1612]/95 backdrop-blur-xl border-t border-[#005C4B]/30 px-3 py-2 safe-area-bottom">
      <div className="flex items-center justify-around">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = item.isActive;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
                active
                  ? "text-[#52B788] font-bold scale-105"
                  : "text-[#8E9F98] hover:text-white font-medium"
              }`}
            >
              <div
                className={`p-1 rounded-lg transition-colors ${
                  active ? "bg-[#005C4B]/40 text-[#52B788]" : ""
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-0.5 whitespace-nowrap">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
