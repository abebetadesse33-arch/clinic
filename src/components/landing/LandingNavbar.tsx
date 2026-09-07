"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Activity, ShieldCheck, Menu, X, ChevronRight, Phone, HeartPulse, Zap } from "lucide-react";

export function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <header
        aria-label="NiniMed public navigation"
        className={`sticky top-0 z-50 w-full transition-all duration-300 ${
          scrolled
            ? "bg-white/95 border-b border-[#E7E2D8] backdrop-blur-md shadow-warm"
            : "bg-transparent border-b border-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-8 min-h-20 py-3 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-2xl bg-[#005C4B] flex items-center justify-center text-white font-bold shadow-sm group-hover:scale-105 transition-transform">
              <HeartPulse className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-[#162E27] text-lg tracking-tight font-display">
                Nini<span className="text-[#005C4B]">Med</span>
              </div>
              <p className="text-[10px] text-[#687B74] font-medium">One Medical Clinical Network</p>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-7 text-xs font-semibold text-[#33413C]">
            <a href="#services" className="hover:text-[#005C4B] transition-colors">
              Services
            </a>
            <a href="#how-it-works" className="hover:text-[#005C4B] transition-colors">
              How It Works
            </a>
            <a href="#membership" className="hover:text-[#005C4B] transition-colors">
              Membership & Pricing
            </a>
            <a href="#doctors" className="hover:text-[#005C4B] transition-colors">
              Our Doctors
            </a>
            <a href="#faq" className="hover:text-[#005C4B] transition-colors">
              FAQ
            </a>
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden lg:flex items-center gap-3">
            <Link
              href="/services/virtual-urgent-care/triage"
              className="btn-pill-ghost text-xs flex items-center gap-1.5 text-[#005C4B]"
            >
              <Zap className="w-3.5 h-3.5 fill-[#E5A93C] text-[#E5A93C]" />
              <span>Treat Me Now™</span>
            </Link>
            <Link
              href="/signin"
              className="btn-pill-secondary text-xs py-2 px-4"
            >
              Sign In
            </Link>
            <Link
              href="/patient/book"
              className="btn-pill-primary text-xs py-2 px-5 shadow-sm flex items-center gap-1.5"
            >
              <span>Book Appointment</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Mobile Hamburger Toggle */}
          <button
            type="button"
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden min-w-11 min-h-11 p-2 rounded-xl bg-white border border-[#E7E2D8] text-[#162E27] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#005C4B]"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Drawer Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-b border-[#E7E2D8] bg-white/98 backdrop-blur-2xl px-6 py-6 space-y-4 animate-fade-in shadow-warm" role="dialog" aria-label="Mobile navigation">
            <nav className="flex flex-col space-y-3 text-sm font-semibold text-[#162E27]">
              <a
                href="#services"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 border-b border-[#F2EFE9]"
              >
                Services
              </a>
              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 border-b border-[#F2EFE9]"
              >
                How It Works
              </a>
              <a
                href="#membership"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 border-b border-[#F2EFE9]"
              >
                Membership & Pricing
              </a>
              <a
                href="#doctors"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 border-b border-[#F2EFE9]"
              >
                Our Doctors
              </a>
            </nav>
            <div className="flex flex-col gap-2 pt-2">
              <Link
                href="/services/virtual-urgent-care/triage"
                onClick={() => setMobileMenuOpen(false)}
                className="btn-pill-terracotta w-full text-xs text-center"
              >
                Treat Me Now™ (24/7 Virtual)
              </Link>
              <Link
                href="/patient/book"
                onClick={() => setMobileMenuOpen(false)}
                className="btn-pill-primary w-full text-xs text-center shadow-sm"
              >
                Book Appointment
              </Link>
            </div>
          </div>
        )}
      </header>

    </>
  );
}
