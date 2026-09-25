"use client";

import React from "react";
import Link from "next/link";
import { Stethoscope, HeartPulse, Utensils, ChevronRight, Zap, FlaskConical, Baby } from "lucide-react";

export function ServiceCards() {
  const services = [
    {
      id: "primary-care",
      title: "Primary Care",
      description: "Outpatient assessment, treatment, and follow-up with qualified clinicians.",
      icon: Stethoscope,
      badge: "Habitat Clinic",
      href: "/services/primary-care",
      badgeClass: "badge-mint",
    },
    {
      id: "specialist-care",
      title: "Specialist Outpatient Care",
      description: "Scheduled specialist consultations within the clinic's approved service scope.",
      icon: Zap,
      badge: "By Appointment",
      href: "/patient/book",
      badgeClass: "badge-terracotta",
    },
    {
      id: "chronic-care",
      title: "Chronic Condition Management",
      description: "Planned follow-up and health education for ongoing conditions.",
      icon: HeartPulse,
      badge: "Follow-up",
      href: "/patient/book",
      badgeClass: "badge-mint",
    },
    {
      id: "maternal-child",
      title: "Maternal & Child Outpatient Care",
      description: "Maternal and child health consultations where included in the clinic's approved scope.",
      icon: Baby,
      badge: "Scope Dependent",
      href: "/patient/book",
      badgeClass: "badge-mint",
    },
    {
      id: "rehabilitation-nutrition",
      title: "Rehabilitation & Nutrition",
      description: "Physiotherapy and nutrition services may be offered when appropriately staffed and approved.",
      icon: Utensils,
      badge: "Scope Dependent",
      href: "/patient/book",
      badgeClass: "badge-sage",
    },
    {
      id: "diagnostics",
      title: "Basic Diagnostics",
      description: "Point-of-care testing or specimen collection only where separately authorized and available.",
      icon: FlaskConical,
      badge: "Approval Required",
      href: "/patient/book",
      badgeClass: "badge-gold",
    },
  ];

  return (
    <section id="services" className="py-16 px-4 sm:px-8 max-w-7xl mx-auto space-y-10">
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <span className="badge-mint text-xs">Care Services</span>
        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 font-serif-heading">
          Medium-clinic outpatient care, centered on you
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          NiniMed Habitat Medium Clinic plans outpatient services in line with its approved scope. Confirm availability and clinic hours before visiting.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((svc) => (
          <Link
            key={svc.id}
            href={svc.href}
            className="group p-6 rounded-3xl bg-white hover:border-sky-500 border border-slate-200 transition-all duration-200 flex flex-col justify-between space-y-4 hover:shadow-warm"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <svc.icon className="w-6 h-6" />
                </div>
                <span className={svc.badgeClass}>
                  {svc.badge}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 group-hover:text-sky-600 transition-colors font-display">
                {svc.title}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">{svc.description}</p>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-bold text-sky-600 group-hover:translate-x-1 transition-transform pt-3 border-t border-slate-100">
              <span>Explore service & book</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
