"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Star, Video, CheckCircle2, ChevronRight, Stethoscope, MapPin } from "lucide-react";
import DoctorCard from "../onemedical/DoctorCard";

export function DoctorDirectory() {
  const [doctors, setDoctors] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/v1/public/providers")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data?.length > 0) {
          setDoctors(
            d.data.map((doc: any) => ({
              id: doc.id,
              name: doc.name,
              credentials: doc.title,
              specialty: doc.specialty,
              focusAreas: ["Comprehensive Physicals", "Chronic Care", "Preventive Wellness"],
              officeLocation: doc.location || "Downtown Medical Pavilion & Virtual",
              rating: doc.rating || 4.95,
              reviewsCount: doc.reviewsCount || 100,
              nextAvailable: "Today / Available on Demand",
              initials: doc.initials || "MD",
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  return (
    <section id="doctors" className="py-16 px-4 sm:px-8 max-w-7xl mx-auto space-y-8">
      {/* Directory Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="badge-mint text-xs">Our Clinical Team</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 font-serif-heading mt-1">
            Meet our attending physicians & primary care leads
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Our salaried doctors spend twice as much time with each patient, listening with genuine care.
          </p>
        </div>
        <Link
          href="/patient/book"
          className="text-xs font-bold text-sky-600 hover:underline flex items-center gap-1 shrink-0"
        >
          <span>View All Available Providers</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {doctors.map((doc) => (
          <DoctorCard
            key={doc.id}
            id={doc.id}
            name={doc.name}
            credentials={doc.credentials}
            specialty={doc.specialty}
            focusAreas={doc.focusAreas}
            officeLocation={doc.officeLocation}
            rating={doc.rating}
            reviewsCount={doc.reviewsCount}
            nextAvailable={doc.nextAvailable}
            initials={doc.initials}
          />
        ))}
      </div>
    </section>
  );
}
