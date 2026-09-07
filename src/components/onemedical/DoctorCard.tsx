"use client";

import React from "react";
import Link from "next/link";
import { Star, MapPin, Calendar, Check, ArrowRight } from "lucide-react";

export interface DoctorCardProps {
  id: string;
  name: string;
  credentials: string;
  specialty: string;
  focusAreas: string[];
  officeLocation: string;
  rating: number;
  reviewsCount: number;
  nextAvailable: string;
  initials: string;
  imageBg?: string;
}

export default function DoctorCard({
  id,
  name,
  credentials,
  specialty,
  focusAreas,
  officeLocation,
  rating,
  reviewsCount,
  nextAvailable,
  initials,
}: DoctorCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-[#E7E2D8] p-6 hover:border-[#005C4B] hover:shadow-warm transition-all duration-200 flex flex-col justify-between">
      <div>
        {/* Header with Avatar & Rating */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-full bg-[#005C4B] text-white flex items-center justify-center font-bold text-base shadow-sm ring-4 ring-[#E8F4F0]">
              {initials}
            </div>
            <div>
              <h4 className="font-bold text-base text-[#162E27] font-display">{name}</h4>
              <p className="text-xs text-[#005C4B] font-semibold">{credentials}</p>
              <p className="text-xs text-[#687B74]">{specialty}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-[#FEF7E6] border border-[#F9E2A8] px-2 py-0.5 rounded-full text-xs text-[#B8801C] font-bold">
            <Star className="w-3.5 h-3.5 fill-[#E5A93C] text-[#E5A93C]" />
            <span>{rating}</span>
            <span className="text-[#687B74] font-normal text-[10px]">({reviewsCount})</span>
          </div>
        </div>

        {/* Focus Tags */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {focusAreas.map((area, idx) => (
            <span key={idx} className="badge-mint text-[10px] py-0.5 px-2">
              {area}
            </span>
          ))}
        </div>

        {/* Office Location */}
        <div className="mt-4 pt-3 border-t border-[#F2EFE9] text-xs text-[#687B74] flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-[#005C4B] shrink-0" />
          <span>{officeLocation}</span>
        </div>
      </div>

      {/* Footer Booking Action */}
      <div className="mt-5 pt-3 border-t border-[#F2EFE9] flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-[#687B74] font-semibold block">Next Opening</span>
          <span className="text-xs font-bold text-[#005C4B]">{nextAvailable}</span>
        </div>
        <Link
          href={`/patient/book?doctor=${id}`}
          className="btn-pill-primary text-xs py-2 px-4"
        >
          <span>Book Visit</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
