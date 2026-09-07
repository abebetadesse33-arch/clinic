"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import RoleGuard from "@/components/auth/RoleGuard";
import {
  Building2,
  MapPin,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  ExternalLink,
  Navigation,
  Compass,
  Phone,
  Clock,
  Sparkles,
  ArrowLeft,
  Sliders,
  Check,
  X,
  Radio,
  Share2,
} from "lucide-react";

interface ClinicLocationAdmin {
  id: string;
  name: string;
  slug: string;
  branchType: string;
  neighborhood: string;
  city: string;
  region: string;
  address: string;
  latitude: string;
  longitude: string;
  phone: string;
  email: string | null;
  hours: string;
  services: string[];
  amenities: string[];
  isActive: boolean;
  isMain: boolean;
  nextOpenSlot: string;
  googleMapsUrl: string | null;
  osmUrl: string | null;
  updatedAt: string;
}

const COMMON_SERVICES = [
  "24/7 Emergency & Trauma",
  "Primary Care Consultations",
  "Specialist In-Office Consultations",
  "Maternal Antenatal & Postnatal Care",
  "Pediatrics & Child Wellness",
  "ICU & Inpatient Care",
  "Digital CT & PA Radiography",
  "Ultrasound Sonography",
  "Automated Clinical Chemistry Lab",
  "Point-of-Care Rapid Testing",
  "Cardiopulmonary Physiotherapy",
  "Clinical Nutrition & MNT",
  "Specialized Compounding Pharmacy",
  "24/7 Prescription Dispensation",
  "Vaccination & Immunization",
];

const COMMON_AMENITIES = [
  "Dedicated Ambulance Standby",
  "On-Site Blood Bank",
  "Quiet Wellness Lounge",
  "Drive-Through Rx Pickup",
  "Free High-Speed Wi-Fi",
  "Child-Friendly Play Area",
  "Wheelchair Accessible Ramp",
  "Spacious Private Parking",
  "Direct Corporate Insurance Desk",
  "Emergency Generator Power Backup",
];

export default function AdminLocationsPage() {
  const [locations, setLocations] = useState<ClinicLocationAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<ClinicLocationAdmin | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    branchType: "branch",
    neighborhood: "",
    city: "Debre Birhan",
    region: "Amhara, Ethiopia",
    address: "",
    latitude: "9.6780",
    longitude: "39.5320",
    phone: "+251 11 681 ",
    email: "info@ninimed.org",
    hours: "Mon–Sat: 8:00 AM – 7:00 PM",
    nextOpenSlot: "Today at 2:00 PM",
    isMain: false,
    services: [] as string[],
    amenities: [] as string[],
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchLocations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/locations");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setLocations(json.data);
      }
    } catch (err) {
      console.error("Error loading locations:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const handleOpenAddModal = () => {
    setFormData({
      name: "",
      branchType: "branch",
      neighborhood: "",
      city: "Debre Birhan",
      region: "Amhara, Ethiopia",
      address: "",
      latitude: "9.6780",
      longitude: "39.5320",
      phone: "+251 11 681 ",
      email: "info@ninimed.org",
      hours: "Mon–Sat: 8:00 AM – 7:00 PM",
      nextOpenSlot: "Today at 2:00 PM",
      isMain: false,
      services: ["Primary Care Consultations", "Point-of-Care Rapid Testing", "Retail Pharmacy"],
      amenities: ["Wheelchair Accessible Ramp", "Spacious Private Parking", "Free High-Speed Wi-Fi"],
    });
    setEditingLocation(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (loc: ClinicLocationAdmin) => {
    setEditingLocation(loc);
    setFormData({
      name: loc.name,
      branchType: loc.branchType,
      neighborhood: loc.neighborhood,
      city: loc.city,
      region: loc.region,
      address: loc.address,
      latitude: loc.latitude,
      longitude: loc.longitude,
      phone: loc.phone,
      email: loc.email || "info@ninimed.org",
      hours: loc.hours,
      nextOpenSlot: loc.nextOpenSlot,
      isMain: loc.isMain,
      services: loc.services || [],
      amenities: loc.amenities || [],
    });
    setIsAddModalOpen(true);
  };

  const handleToggleActive = async (loc: ClinicLocationAdmin) => {
    try {
      const res = await fetch(`/api/v1/admin/locations/${loc.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !loc.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`'${loc.name}' is now ${!loc.isActive ? "ACTIVE & BOOKABLE" : "DEACTIVATED"}.`);
        fetchLocations();
      }
    } catch {
      showToast("Failed to update status.");
    }
  };

  const handleToggleServiceTag = (svc: string) => {
    setFormData((prev) => ({
      ...prev,
      services: prev.services.includes(svc)
        ? prev.services.filter((s) => s !== svc)
        : [...prev.services, svc],
    }));
  };

  const handleToggleAmenityTag = (amenity: string) => {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = editingLocation
        ? `/api/v1/admin/locations/${editingLocation.id}`
        : "/api/v1/admin/locations";
      const method = editingLocation ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (json.success) {
        showToast(
          editingLocation
            ? `Successfully updated "${formData.name}"!`
            : `New clinic "${formData.name}" integrated into NiniMed network!`
        );
        setIsAddModalOpen(false);
        fetchLocations();
      } else {
        alert(json.error || "Failed to save location.");
      }
    } catch {
      alert("Network error saving location.");
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = locations.filter((l) => {
    const matchesSearch =
      l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.neighborhood.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.city.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = selectedType === "all" || l.branchType === selectedType;
    return matchesSearch && matchesType;
  });

  const totalActive = locations.filter((l) => l.isActive).length;
  const mainFacility = locations.find((l) => l.isMain);

  return (
    <RoleGuard allowedRoles={["system_admin", "tenant_admin"]}>
      <div className="space-y-8 py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-[#162E27] text-white px-5 py-3.5 rounded-2xl shadow-warm-lg border border-[#005C4B] flex items-center gap-3 animate-slide-up">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-xs font-bold">{toastMessage}</span>
          </div>
        )}

        {/* Top Navigation & Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E7E2D8] pb-6">
          <div className="space-y-1">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#005C4B] hover:underline mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Enterprise Admin
            </Link>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#162E27] font-display flex items-center gap-3">
              <Building2 className="w-8 h-8 text-[#005C4B]" />
              Clinic Locations & Geolocation Network
            </h1>
            <p className="text-xs sm:text-sm text-[#687B74]">
              Manage multi-branch physical facilities, real-time GPS coordinates, Clinics, and online appointment routing in Debre Birhan, Ethiopia.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/locations"
              target="_blank"
              className="btn-pill-ghost text-xs py-2 px-3.5 flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" /> View Public Map
            </Link>
            <button
              onClick={handleOpenAddModal}
              className="btn-pill-primary text-xs py-2 px-4 flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Add New Clinic
            </button>
          </div>
        </div>

        {/* Overview Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-5 rounded-3xl bg-white border border-[#E7E2D8] space-y-2 shadow-warm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#687B74] block">
              Total Facilities
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#162E27] font-display">{locations.length}</span>
              <span className="text-xs text-[#005C4B] font-bold">Network Hubs</span>
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-white border border-[#E7E2D8] space-y-2 shadow-warm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#687B74] block">
              Active Bookable
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-emerald-600 font-display">{totalActive}</span>
              <span className="text-xs text-slate-500 font-medium">of {locations.length} branches</span>
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-white border border-[#E7E2D8] space-y-2 shadow-warm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#687B74] block">
              Main Campus
            </span>
            <div className="text-xs font-bold text-[#162E27] truncate">
              {mainFacility ? mainFacility.neighborhood : "Habitat Hospital"}
            </div>
            <span className="badge-mint text-[10px] py-0.5 px-2">24/7 Level 1 Emergency</span>
          </div>

          <div className="p-5 rounded-3xl bg-white border border-[#E7E2D8] space-y-2 shadow-warm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#687B74] block">
              City Region
            </span>
            <div className="text-xs font-bold text-[#162E27]">Debre Birhan, Amhara</div>
            <span className="text-[10px] text-[#687B74] block">Leaflet & OpenStreetMap GIS</span>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white p-4 rounded-3xl border border-[#E7E2D8] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-warm">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#687B74] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by clinic name, neighborhood, or street address..."
              className="input-warm text-xs pl-9 w-full"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: "all", label: "All Types" },
              { id: "main", label: "Main Hospital" },
              { id: "diagnostic_hub", label: "Clinics" },
              { id: "branch", label: "Community Clinics" },
              { id: "pharmacy_clinic", label: "Pharmacy Clinics" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedType(t.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${selectedType === t.id
                  ? "bg-[#005C4B] text-white shadow-sm"
                  : "bg-[#FAF8F5] text-[#687B74] hover:bg-[#E8F4F0] hover:text-[#005C4B]"
                  }`}
              >
                {t.label}
              </button>
            ))}

            <button
              onClick={fetchLocations}
              title="Refresh locations list"
              className="p-2 rounded-full border border-[#E7E2D8] hover:bg-[#FAF8F5] text-[#687B74]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Locations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((loc) => (
            <div
              key={loc.id}
              className={`p-6 sm:p-7 rounded-3xl border transition-all space-y-5 bg-white ${loc.isMain
                ? "border-[#005C4B] ring-2 ring-[#005C4B]/20 shadow-warm-lg"
                : loc.isActive
                  ? "border-[#E7E2D8] hover:border-[#005C4B]/60 shadow-warm"
                  : "border-slate-200 bg-slate-50/70 opacity-75"
                }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="badge-mint text-[10px]">{loc.neighborhood}</span>
                    {loc.isMain && (
                      <span className="px-2 py-0.5 rounded-full bg-[#005C4B] text-white text-[10px] font-bold">
                        ★ Main Specialty Hospital
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${loc.isActive
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-200 text-slate-700"
                        }`}
                    >
                      {loc.isActive ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-[#162E27] font-display mt-1">{loc.name}</h3>
                  <p className="text-xs text-[#687B74] mt-0.5">{loc.address}</p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleOpenEditModal(loc)}
                    title="Edit clinic details"
                    className="p-2 rounded-xl border border-[#E7E2D8] hover:bg-[#E8F4F0] text-[#005C4B] transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleToggleActive(loc)}
                    title={loc.isActive ? "Deactivate clinic" : "Activate clinic"}
                    className={`p-2 rounded-xl border transition-colors ${loc.isActive
                      ? "border-amber-200 hover:bg-amber-50 text-amber-700"
                      : "border-emerald-200 hover:bg-emerald-50 text-emerald-700"
                      }`}
                  >
                    {loc.isActive ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Geo & Contact Specs */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-[#FAF8F5] p-3.5 rounded-2xl border border-[#E7E2D8]/60">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                    Operating Hours
                  </span>
                  <span className="font-semibold text-[#162E27] leading-tight block">{loc.hours}</span>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                    Phone & Triage
                  </span>
                  <a href={`tel:${loc.phone}`} className="font-bold text-[#005C4B] hover:underline block">
                    {loc.phone}
                  </a>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                    GPS Coordinates
                  </span>
                  <span className="font-mono text-[11px] text-[#33413C] block">
                    {Number(loc.latitude).toFixed(4)}° N, {Number(loc.longitude).toFixed(4)}° E
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                    Next Slot
                  </span>
                  <span className="text-xs font-bold text-emerald-700 block">{loc.nextOpenSlot}</span>
                </div>
              </div>

              {/* Services Tags */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#687B74] block">
                  Integrated Services ({loc.services?.length || 0})
                </span>
                <div className="flex flex-wrap gap-1">
                  {loc.services?.map((svc, i) => (
                    <span key={i} className="badge-sage text-[10px] py-0.5 px-2">
                      {svc}
                    </span>
                  ))}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="pt-3 border-t border-[#F2EFE9] flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${loc.latitude},${loc.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-pill-ghost text-[11px] py-1 px-3 flex items-center gap-1"
                  >
                    <Navigation className="w-3 h-3 text-[#005C4B]" /> Google Maps
                  </a>
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${loc.latitude}&mlon=${loc.longitude}#map=16/${loc.latitude}/${loc.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-pill-ghost text-[11px] py-1 px-3 flex items-center gap-1"
                  >
                    <Compass className="w-3 h-3 text-[#005C4B]" /> OpenStreetMap
                  </a>
                </div>

                <Link
                  href={`/patient/book?location=${loc.id}`}
                  target="_blank"
                  className="btn-pill-primary text-[11px] py-1 px-3.5 flex items-center gap-1 shadow-sm"
                >
                  <span>Book Visit</span>
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* ADD / EDIT LOCATION MODAL */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-[#E7E2D8] my-8 space-y-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[#E7E2D8] pb-4">
                <div>
                  <h3 className="text-xl font-bold text-[#162E27] font-display flex items-center gap-2">
                    <Building2 className="w-6 h-6 text-[#005C4B]" />
                    {editingLocation ? "Edit Clinic Location" : "Add New Clinic Location"}
                  </h3>
                  <p className="text-xs text-[#687B74]">
                    Configure real-time GPS coordinates, services, and live appointment booking integration.
                  </p>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-2 rounded-full hover:bg-slate-100 text-slate-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-bold text-[#162E27] block mb-1">Clinic Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. NiniMed Chacha Branch"
                      className="input-warm w-full text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[#162E27] block mb-1">Branch Type *</label>
                    <select
                      value={formData.branchType}
                      onChange={(e) => setFormData({ ...formData, branchType: e.target.value })}
                      className="input-warm w-full text-xs"
                    >
                      <option value="main">Clinic(Level 1)</option>
                      <option value="diagnostic_hub">Clinic</option>
                      <option value="branch">Community Health Clinic</option>
                      <option value="pharmacy_clinic">Pharmacy & Outpatient Clinic</option>
                      <option value="mobile_unit">Mobile Care Outreach Unit</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-[#162E27] block mb-1">Neighborhood / Sub-City *</label>
                    <input
                      type="text"
                      required
                      value={formData.neighborhood}
                      onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                      placeholder="e.g. Habitat Sub-City"
                      className="input-warm w-full text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[#162E27] block mb-1">City / Town *</label>
                    <input
                      type="text"
                      required
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="Debre Birhan"
                      className="input-warm w-full text-xs"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="font-bold text-[#162E27] block mb-1">Full Street Address *</label>
                    <input
                      type="text"
                      required
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="e.g. Main Campus Highway, Habitat Sub-City, Debre Birhan, Ethiopia"
                      className="input-warm w-full text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[#162E27] block mb-1">GPS Latitude (e.g. 9.6825) *</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                      placeholder="9.6825"
                      className="input-warm w-full text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[#162E27] block mb-1">GPS Longitude (e.g. 39.5312) *</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      placeholder="39.5312"
                      className="input-warm w-full text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[#162E27] block mb-1">Phone Number *</label>
                    <input
                      type="text"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+251 11 681 2000"
                      className="input-warm w-full text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[#162E27] block mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="info@ninimed.org"
                      className="input-warm w-full text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[#162E27] block mb-1">Operating Hours</label>
                    <input
                      type="text"
                      value={formData.hours}
                      onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                      placeholder="Mon–Sat: 8:00 AM – 8:00 PM"
                      className="input-warm w-full text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[#162E27] block mb-1">Next Open Slot Description</label>
                    <input
                      type="text"
                      value={formData.nextOpenSlot}
                      onChange={(e) => setFormData({ ...formData, nextOpenSlot: e.target.value })}
                      placeholder="Today at 2:30 PM"
                      className="input-warm w-full text-xs"
                    />
                  </div>
                </div>

                {/* Main Branch Switch */}
                <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-[#E7E2D8] flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[#162E27] block">Designate as Main Hospital Campus</span>
                    <span className="text-[11px] text-[#687B74]">
                      Featured as primary level-1 medical hub on maps and navigation.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.isMain}
                    onChange={(e) => setFormData({ ...formData, isMain: e.target.checked })}
                    className="w-4 h-4 text-[#005C4B] rounded accent-[#005C4B]"
                  />
                </div>

                {/* Services Checkboxes */}
                <div className="space-y-2">
                  <label className="font-bold text-[#162E27] block">Services Offered (Select all that apply)</label>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 border border-[#E7E2D8] rounded-2xl bg-[#FAF8F5]">
                    {COMMON_SERVICES.map((svc) => {
                      const selected = formData.services.includes(svc);
                      return (
                        <button
                          type="button"
                          key={svc}
                          onClick={() => handleToggleServiceTag(svc)}
                          className={`text-[10px] px-2.5 py-1 rounded-full font-bold border transition-all ${selected
                            ? "bg-[#005C4B] text-white border-[#005C4B]"
                            : "bg-white text-[#687B74] border-slate-300 hover:bg-[#E8F4F0]"
                            }`}
                        >
                          {selected ? "✓ " : "+ "}
                          {svc}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Amenities Checkboxes */}
                <div className="space-y-2">
                  <label className="font-bold text-[#162E27] block">Amenities & Facilities</label>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 border border-[#E7E2D8] rounded-2xl bg-[#FAF8F5]">
                    {COMMON_AMENITIES.map((amenity) => {
                      const selected = formData.amenities.includes(amenity);
                      return (
                        <button
                          type="button"
                          key={amenity}
                          onClick={() => handleToggleAmenityTag(amenity)}
                          className={`text-[10px] px-2.5 py-1 rounded-full font-bold border transition-all ${selected
                            ? "bg-teal-700 text-white border-teal-700"
                            : "bg-white text-[#687B74] border-slate-300 hover:bg-[#E8F4F0]"
                            }`}
                        >
                          {selected ? "✓ " : "+ "}
                          {amenity}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E7E2D8]">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="btn-pill-ghost text-xs py-2 px-4"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-pill-primary text-xs py-2.5 px-6 font-bold flex items-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    {submitting ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : editingLocation ? (
                      "Save Changes"
                    ) : (
                      "Integrate Location"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
