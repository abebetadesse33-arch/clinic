"use client";

import React from "react";
import Link from "next/link";
import { Stethoscope, Video, HeartPulse, Brain, Utensils, Pill, ChevronRight, Zap, FlaskConical, Baby } from "lucide-react";

export function ServiceCards() {
  const services = [
    {
      id: "primary-care",
      title: "Primary Care & Family Medicine",
      description: "Comprehensive annual wellness exams, preventive screenings, immunizations, and un-rushed physicals with dedicated physicians.",
      icon: Stethoscope,
      badge: "In-Office & Virtual",
      href: "/services/primary-care",
      badgeClass: "badge-mint",
    },
    {
      id: "urgent-telehealth",
      title: "24/7 Virtual Urgent Care",
      description: "On-demand video visits and chat triage with board-certified physicians for flu, infections, rashes, and urgent symptoms.",
      icon: Zap,
      badge: "Treat Me Now™",
      href: "/services/virtual-urgent-care",
      badgeClass: "badge-terracotta",
    },
    {
      id: "chronic-care",
      title: "Chronic Condition Management",
      description: "Personalized biopsychosocial care for hypertension, diabetes, asthma, thyroid, and cardiovascular health with continuous monitoring.",
      icon: HeartPulse,
      badge: "Continuous Care",
      href: "/patient/book",
      badgeClass: "badge-mint",
    },
    {
      id: "mental-health",
      title: "Mental Health & Behavioral Therapy",
      description: "Compassionate therapy, anxiety and depression counseling, stress reduction programs, and psychiatric medication support.",
      icon: Brain,
      badge: "Confidential",
      href: "/patient/book",
      badgeClass: "badge-sage",
    },
    {
      id: "in-office-labs",
      title: "On-Site Diagnostic Blood Labs",
      description: "Walk-in blood draws, CLIA diagnostic panels, metabolic profiles, and fast digital results annotated with personal doctor notes.",
      icon: FlaskConical,
      badge: "Drop-In Available",
      href: "/patient/book",
      badgeClass: "badge-gold",
    },
    {
      id: "pediatrics",
      title: "Pediatrics & Family Care",
      description: "Gentle newborn checkups, milestone tracking, childhood vaccinations, and same-day sick visits for children of all ages.",
      icon: Baby,
      badge: "Whole Family",
      href: "/patient/book",
      badgeClass: "badge-mint",
    },
  ];

  return (
    <section id="services" className="py-16 px-4 sm:px-8 max-w-7xl mx-auto space-y-10">
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <span className="badge-mint text-xs">Care Services</span>
        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 font-serif-heading">
          Comprehensive care designed for every aspect of your life
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          From preventive annual physicals to 24/7 virtual urgent care and on-site blood labs, our salaried clinical team is with you every step of the way.
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
