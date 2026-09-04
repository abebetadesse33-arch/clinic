"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  MapPin,
  Building2,
  Clock,
  Phone,
  ArrowRight,
  ShieldCheck,
  Check,
  Compass,
  Navigation,
  Crosshair,
  ExternalLink,
  Search,
  Sparkles,
  PhoneCall,
  Calendar,
  Activity,
  Layers,
  HeartPulse,
} from "lucide-react";
import type { MapClinicLocation } from "@/components/map/ClinicLocationsMap";

// Dynamic import for Leaflet map component to prevent SSR issues
const ClinicLocationsMap = dynamic(
  () => import("@/components/map/ClinicLocationsMap"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[450px] sm:h-[520px] rounded-3xl bg-[#E8F4F0]/40 border border-[#E7E2D8] flex flex-col items-center justify-center gap-3 animate-pulse">
        <Compass className="w-8 h-8 text-[#005C4B] animate-spin" />
        <span className="text-xs font-bold text-[#162E27]">
          Loading Debre Birhan Interactive GIS Map...
        </span>
      </div>
    ),
  }
);

interface ClinicLocation {
  id: string;
  name: string;
  slug?: string;
  neighborhood: string;
  city: string;
  region?: string;
  address: string;
  latitude: number | string;
  longitude: number | string;
  hours: string;
  phone: string;
  email?: string;
  services: string[];
  amenities: string[];
  nextOpenSlot: string;
  isMain?: boolean;
  branchType?: string;
  googleMapsUrl?: string;
  osmUrl?: string;
}

// Fallback seed locations for Debre Birhan, Ethiopia
const INITIAL_LOCATIONS: ClinicLocation[] = [
  {
    id: "loc-habitat-main",
    name: "NiniMed Habitat Clinic& 24/7 Emergency",
    neighborhood: "Habitat Sub-City, Debre Birhan",
    city: "Debre Birhan",
    region: "Amhara, Ethiopia",
    address: "Main Campus Highway, Habitat Sub-City, Debre Birhan, Ethiopia",
    latitude: 9.6825,
    longitude: 39.5312,
    hours: "Open 24/7 (24 Hours Emergency, Inpatient & OPD)",
    phone: "+251 11 681 2000",
    email: "habitat@ninimed.org",
    services: [
      "24/7 Emergency & Trauma",
      "Specialist In-Office Consultations",
      "ICU & Inpatient Care",
      "Digital CT & PA Radiography",
      "Automated Clinical Chemistry Lab",
      "Central Hospital Pharmacy",
    ],
    amenities: [
      "Dedicated Ambulance Standby",
      "On-Site Blood Bank",
      "Spacious Private Parking",
      "Free High-Speed Wi-Fi",
    ],
    nextOpenSlot: "Open 24/7 · Immediate Walk-In & Booking",
    isMain: true,
    branchType: "main",
    googleMapsUrl: "https://www.google.com/maps/dir/?api=1&destination=9.6825,39.5312",
  },
  {
    id: "loc-tebasse-hub",
    name: "NiniMed Tebasse Clinic",
    neighborhood: "Tebasse District, Debre Birhan",
    city: "Debre Birhan",
    region: "Amhara, Ethiopia",
    address: "Commercial Avenue, Near Tebasse Square, Debre Birhan, Ethiopia",
    latitude: 9.691,
    longitude: 39.5445,
    hours: "Mon–Sat: 7:30 AM – 8:00 PM • Sun: 8:30 AM – 4:00 PM",
    phone: "+251 11 681 3311",
    email: "tebasse@ninimed.org",
    services: [
      "Primary Care Consultations",
      "Comprehensive Diagnostic Blood Lab",
      "Ultrasound Sonography",
      "Preventive Health Screening",
      "Retail Pharmacy",
    ],
    amenities: [
      "Express Lab Turnaround (<30 min)",
      "Quiet Wellness Lounge",
      "Wheelchair Accessible",
    ],
    nextOpenSlot: "Today at 11:30 AM",
    isMain: false,
    branchType: "diagnostic_hub",
    googleMapsUrl: "https://www.google.com/maps/dir/?api=1&destination=9.6910,39.5445",
  },
  {
    id: "loc-atakilt-branch",
    name: "NiniMed Atakilt Clinic",
    neighborhood: "Atakilt Market District, Debre Birhan",
    city: "Debre Birhan",
    region: "Amhara, Ethiopia",
    address: "Atakilt Center Street, Debre Birhan, Ethiopia",
    latitude: 9.673,
    longitude: 39.526,
    hours: "Mon–Sat: 8:00 AM – 7:00 PM",
    phone: "+251 11 681 4422",
    email: "atakilt@ninimed.org",
    services: [
      "Family Medicine & Pediatrics",
      "Maternal Antenatal & Postnatal Care",
      "Chronic Disease Management",
      "Rapid Point-of-Care Testing",
    ],
    amenities: [
      "Child-Friendly Playroom",
      "Nutrition Counseling Room",
      "Direct Insurance Billing",
    ],
    nextOpenSlot: "Today at 2:15 PM",
    isMain: false,
    branchType: "branch",
    googleMapsUrl: "https://www.google.com/maps/dir/?api=1&destination=9.6730,39.5260",
  },
  {
    id: "loc-liche-pharmacy",
    name: "NiniMed Liche Clinic",
    neighborhood: "Liche District, Debre Birhan",
    city: "Debre Birhan",
    region: "Amhara, Ethiopia",
    address: "Liche North Boulevard, Debre Birhan, Ethiopia",
    latitude: 9.6645,
    longitude: 39.518,
    hours: "Mon–Sat: 8:00 AM – 9:00 PM • Sun: 9:00 AM – 6:00 PM",
    phone: "+251 11 681 5533",
    email: "liche@ninimed.org",
    services: [
      "Urgent Care Walk-In Triage",
      "Specialized Compounding Pharmacy",
      "Blood Pressure & Glucose Checks",
      "Telehealth Video Consultation Kiosk",
    ],
    amenities: [
      "Drive-Through Rx Pickup",
      "Digital Prescription Lockers",
      "Emergency Medicine Dispenser",
    ],
    nextOpenSlot: "Today at 3:45 PM",
    isMain: false,
    branchType: "pharmacy_clinic",
    googleMapsUrl: "https://www.google.com/maps/dir/?api=1&destination=9.6645,39.5180",
  },
];

// Haversine formula to compute distance in KM between two GPS coordinates
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in KM
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

export default function LocationsPage() {
  const [locations, setLocations] = useState<ClinicLocation[]>(INITIAL_LOCATIONS);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Fetch dynamic Admin-managed locations from API
  useEffect(() => {
    fetch("/api/v1/locations")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.data) && d.data.length > 0) {
          setLocations(d.data);
        }
      })
      .catch((e) => console.log("Using cached Debre Birhan clinic network", e));
  }, []);

  // Auto-GPS Geolocation trigger
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser.");
      return;
    }

    setIsDetectingLocation(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setUserCoords(coords);
        setIsDetectingLocation(false);
      },
      (err) => {
        console.warn("GPS error:", err);
        // Default to Debre Birhan center if permission denied/mocking
        setUserCoords({ lat: 9.678, lng: 39.5325 });
        setIsDetectingLocation(false);
        setGpsError("GPS simulated from Debre Birhan Town Center.");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Enriched locations with distance calculation and filtering
  const enrichedLocations = useMemo(() => {
    return locations.map((loc) => {
      const lat = Number(loc.latitude);
      const lng = Number(loc.longitude);
      let distanceKm: number | null = null;

      if (userCoords && !isNaN(lat) && !isNaN(lng)) {
        distanceKm = calculateDistanceKm(userCoords.lat, userCoords.lng, lat, lng);
      }

      return {
        ...loc,
        distanceKm,
      };
    });
  }, [locations, userCoords]);

  // Sort & Filter
  const filtered = useMemo(() => {
    let list = enrichedLocations.filter((l) => {
      const matchText =
        l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.neighborhood.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.city.toLowerCase().includes(searchTerm.toLowerCase());

      const matchType = selectedType === "all" || l.branchType === selectedType;
      return matchText && matchType;
    });

    // If user GPS is active, sort by nearest distance first
    if (userCoords) {
      list.sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));
    } else {
      list.sort((a, b) => (b.isMain ? 1 : 0) - (a.isMain ? 1 : 0));
    }

    return list;
  }, [enrichedLocations, searchTerm, selectedType, userCoords]);

  return (
    <div className="space-y-8 py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in">
      {/* Hero Header */}
      <div className="bg-white rounded-3xl border border-[#E7E2D8] p-8 sm:p-12 shadow-warm relative overflow-hidden">
        <div className="max-w-3xl space-y-4 relative z-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge-mint text-xs">Debre Birhan Clinic Network</span>
            <span className="px-2.5 py-0.5 rounded-full bg-[#E8F4F0] text-[#005C4B] text-[11px] font-bold">
              4 Integrated Locations
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-bold text-[#162E27] font-serif-heading leading-tight">
            Find a NiniMed clinic near you
          </h1>
          <p className="text-sm sm:text-base text-[#687B74] leading-relaxed">
            Every NiniMed facility in Debre Birhan offers compassionate relationship medicine, on-site diagnostics, digital prescriptions, and zero waiting room delays.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[#687B74] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search Habitat, Tebasse, Atakilt, Liche..."
                className="input-warm pl-9 text-xs sm:text-sm w-full"
              />
            </div>

            <button
              onClick={handleDetectLocation}
              disabled={isDetectingLocation}
              className="btn-pill-primary text-xs py-2.5 px-5 flex items-center justify-center gap-2 shadow-sm shrink-0"
            >
              <Crosshair className={`w-4 h-4 ${isDetectingLocation ? "animate-spin" : ""}`} />
              <span>{isDetectingLocation ? "Locating..." : "Find Nearest to Me (GPS)"}</span>
            </button>
          </div>

          {gpsError && (
            <p className="text-[11px] text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 inline-block">
              {gpsError}
            </p>
          )}
        </div>
      </div>

      {/* Interactive Leaflet Map Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-[#005C4B]" />
            <h2 className="text-lg font-bold text-[#162E27] font-display">
              Debre Birhan Interactive Geolocation Map
            </h2>
          </div>
          <span className="text-xs text-[#687B74]">
            Click any pin marker for clinic directions & booking
          </span>
        </div>

        <ClinicLocationsMap
          locations={filtered as any}
          selectedLocationId={selectedLocationId}
          onSelectLocation={(loc) => setSelectedLocationId(loc.id)}
          userCoords={userCoords}
          onDetectLocation={handleDetectLocation}
          isDetectingLocation={isDetectingLocation}
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {[
          { id: "all", label: "All Facilities (4)" },
          { id: "main", label: "Habitat (Main Hospital 24/7)" },
          { id: "diagnostic_hub", label: "Tebasse (Clinic)" },
          { id: "branch", label: "Atakilt (Maternal & Family)" },
          { id: "pharmacy_clinic", label: "Liche (Pharmacy & OPD)" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedType(tab.id)}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${selectedType === tab.id
              ? "bg-[#005C4B] text-white shadow-sm"
              : "bg-white border border-[#E7E2D8] text-[#687B74] hover:border-[#005C4B] hover:text-[#005C4B]"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Locations Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filtered.map((loc) => (
          <div
            key={loc.id}
            id={loc.id}
            className={`bg-white rounded-3xl border p-6 sm:p-8 space-y-6 transition-all duration-200 flex flex-col justify-between ${loc.isMain
              ? "border-[#005C4B] shadow-warm-lg ring-2 ring-[#005C4B]/20"
              : selectedLocationId === loc.id
                ? "border-teal-600 shadow-warm ring-2 ring-teal-600/20"
                : "border-[#E7E2D8] hover:border-[#005C4B] shadow-warm"
              }`}
          >
            <div className="space-y-4">
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="badge-mint text-[10px]">{loc.neighborhood}</span>
                    {loc.isMain && (
                      <span className="px-2 py-0.5 rounded-full bg-[#005C4B] text-white text-[10px] font-bold uppercase tracking-wider">
                        ★ Main Specialty Hospital
                      </span>
                    )}
                    {loc.distanceKm !== null && loc.distanceKm !== undefined && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold flex items-center gap-1">
                        <Navigation className="w-3 h-3 text-blue-600" />
                        {loc.distanceKm} km away
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-[#162E27] font-display">{loc.name}</h3>
                  <p className="text-xs text-[#687B74] mt-1">{loc.address}</p>
                </div>

                <div className="w-12 h-12 rounded-2xl bg-[#E8F4F0] text-[#005C4B] flex items-center justify-center shrink-0 shadow-sm">
                  <Building2 className="w-6 h-6" />
                </div>
              </div>

              {/* Operating Info */}
              <div className="space-y-2 text-xs text-[#33413C] pt-3 border-t border-[#F2EFE9]">
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-[#005C4B] shrink-0" />
                  <span className="font-semibold">{loc.hours}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-[#005C4B] shrink-0" />
                  <a href={`tel:${loc.phone}`} className="font-bold text-[#005C4B] hover:underline">
                    {loc.phone}
                  </a>
                </div>
                <div className="flex items-center gap-2.5 text-[#687B74]">
                  <Compass className="w-4 h-4 text-[#687B74] shrink-0" />
                  <span className="font-mono text-[11px]">
                    GPS: {Number(loc.latitude).toFixed(4)}° N, {Number(loc.longitude).toFixed(4)}° E
                  </span>
                </div>
              </div>

              {/* Services Offered */}
              <div className="pt-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#687B74] mb-1.5">
                  Clinical Services & Labs
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {loc.services.map((svc, idx) => (
                    <span key={idx} className="badge-sage text-[10px] py-0.5 px-2">
                      {svc}
                    </span>
                  ))}
                </div>
              </div>

              {/* Amenities */}
              {loc.amenities && loc.amenities.length > 0 && (
                <div className="pt-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#687B74] mb-1.5">
                    Facility Amenities
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {loc.amenities.map((amenity, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] bg-white border border-[#E7E2D8] text-[#33413C] px-2 py-0.5 rounded-full"
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div className="pt-4 border-t border-[#F2EFE9] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#687B74] block">
                    Next In-Person Slot
                  </span>
                  <span className="text-xs font-bold text-[#005C4B]">{loc.nextOpenSlot}</span>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${loc.latitude},${loc.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Get turn-by-turn navigation in Google Maps"
                    className="btn-pill-ghost text-xs py-2 px-3 flex items-center gap-1"
                  >
                    <Navigation className="w-3.5 h-3.5 text-[#005C4B]" /> Directions
                  </a>
                  <Link
                    href={`/patient/book?location=${loc.id}`}
                    className="btn-pill-primary text-xs py-2 px-4 shadow-sm"
                  >
                    Book at this Office
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Admin Link for Authorized Governance */}
      <div className="text-center pt-8 pb-4">
        <Link
          href="/admin/locations"
          className="inline-flex items-center gap-2 text-xs font-bold text-[#687B74] hover:text-[#005C4B] transition-colors"
        >
          <Building2 className="w-4 h-4" /> Manage Clinic Facilities & Geo-Locations (Admin Portal) →
        </Link>
      </div>
    </div>
  );
}
