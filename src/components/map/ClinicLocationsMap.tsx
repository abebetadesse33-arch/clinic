"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  MapPin,
  Navigation,
  ExternalLink,
  Phone,
  Clock,
  Compass,
  Sparkles,
  Building2,
  Crosshair,
} from "lucide-react";

export interface MapClinicLocation {
  id: string;
  name: string;
  neighborhood: string;
  address: string;
  latitude: number | string;
  longitude: number | string;
  phone: string;
  hours: string;
  isMain?: boolean;
  branchType?: string;
  services?: string[];
  distanceKm?: number | null;
  googleMapsUrl?: string;
}

interface ClinicLocationsMapProps {
  locations: MapClinicLocation[];
  selectedLocationId?: string | null;
  onSelectLocation?: (location: MapClinicLocation) => void;
  userCoords?: { lat: number; lng: number } | null;
  onDetectLocation?: () => void;
  isDetectingLocation?: boolean;
}

export default function ClinicLocationsMap({
  locations,
  selectedLocationId,
  onSelectLocation,
  userCoords,
  onDetectLocation,
  isDetectingLocation,
}: ClinicLocationsMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: any }>({});
  const userMarkerRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const [loadingTiles, setLoadingTiles] = useState(true);

  // Debre Birhan Default Center Coordinates
  const DEFAULT_CENTER: [number, number] = [9.6782, 39.532];

  useEffect(() => {
    let isMounted = true;

    function loadLeafletCDN(): Promise<any> {
      return new Promise((resolve, reject) => {
        if (typeof window === "undefined") return reject("SSR");

        if ((window as any).L) {
          return resolve((window as any).L);
        }

        // Add Leaflet CSS
        if (!document.getElementById("leaflet-css")) {
          const link = document.createElement("link");
          link.id = "leaflet-css";
          link.rel = "stylesheet";
          link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
          document.head.appendChild(link);
        }

        // Add Leaflet JS Script
        if (!document.getElementById("leaflet-js")) {
          const script = document.createElement("script");
          script.id = "leaflet-js";
          script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
          script.async = true;
          script.onload = () => {
            if ((window as any).L) resolve((window as any).L);
            else reject("Leaflet failed to attach to window");
          };
          script.onerror = () => reject("Leaflet script failed to load");
          document.body.appendChild(script);
        } else {
          const checkInterval = setInterval(() => {
            if ((window as any).L) {
              clearInterval(checkInterval);
              resolve((window as any).L);
            }
          }, 100);
        }
      });
    }

    async function initMap() {
      try {
        const L = await loadLeafletCDN();
        if (!isMounted || !mapContainerRef.current) return;

        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }

        const map = L.map(mapContainerRef.current, {
          center: DEFAULT_CENTER,
          zoom: 14,
          zoomControl: true,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | NiniMed GIS',
          maxZoom: 19,
        }).addTo(map);

        mapInstanceRef.current = map;
        setMapReady(true);
        setLoadingTiles(false);
      } catch (err) {
        console.error("Map initialization note:", err);
        setLoadingTiles(false);
      }
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update clinic markers whenever locations or mapReady changes
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || typeof window === "undefined") return;
    const L = (window as any).L;
    if (!L) return;

    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing clinic markers
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    const bounds: [number, number][] = [];

    locations.forEach((loc) => {
      const lat = Number(loc.latitude);
      const lng = Number(loc.longitude);
      if (isNaN(lat) || isNaN(lng)) return;

      bounds.push([lat, lng]);

      const isSelected = selectedLocationId === loc.id;
      const isMain = Boolean(loc.isMain);

      // Custom HTML marker for premium aesthetics
      const iconHtml = `
        <div class="relative flex items-center justify-center cursor-pointer group">
          ${isMain
          ? '<div class="absolute -inset-2 bg-emerald-500/30 rounded-full animate-ping"></div>'
          : ""
        }
          <div class="w-9 h-9 rounded-2xl flex items-center justify-center shadow-lg border-2 transition-transform duration-200 group-hover:scale-110 ${isMain
          ? "bg-[#005C4B] border-white text-white"
          : isSelected
            ? "bg-teal-600 border-white text-white"
            : "bg-white border-[#005C4B] text-[#005C4B]"
        }">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
          </div>
          <div class="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md pointer-events-none">
            ${loc.neighborhood}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: "custom-clinic-marker",
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36],
      });

      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);

      // Popup Content
      const popupContent = `
        <div class="p-1 max-w-xs space-y-2 text-[#162E27] font-sans">
          <div class="flex items-center gap-1.5">
            <span class="inline-block w-2 h-2 rounded-full ${isMain ? "bg-[#005C4B]" : "bg-teal-600"}"></span>
            <span class="text-[10px] font-extrabold uppercase tracking-wider text-[#005C4B]">
              ${isMain ? "★ Main Specialty Hospital" : "NiniMed Branch"}
            </span>
          </div>
          <h4 class="text-xs font-bold leading-snug">${loc.name}</h4>
          <p class="text-[11px] text-[#687B74] leading-tight">${loc.address}</p>
          
          <div class="text-[11px] text-[#33413C] space-y-1 pt-1 border-t border-slate-100">
            <div class="flex items-center gap-1.5">
              <span class="font-semibold text-[10px] text-slate-500">Hours:</span>
              <span>${loc.hours}</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="font-semibold text-[10px] text-slate-500">Phone:</span>
              <a href="tel:${loc.phone}" class="text-[#005C4B] font-bold hover:underline">${loc.phone}</a>
            </div>
          </div>

          <div class="pt-2 flex items-center gap-2">
            <a href="/patient/book?location=${loc.id}" class="flex-1 text-center text-[11px] font-bold bg-[#005C4B] text-white py-1.5 px-3 rounded-full hover:bg-[#004739] transition-colors">
              Book Visit
            </a>
            <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}" target="_blank" rel="noopener noreferrer" class="text-[11px] font-bold border border-slate-300 text-slate-700 py-1.5 px-2.5 rounded-full hover:bg-slate-50 transition-colors flex items-center gap-1">
              Directions ↗
            </a>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, { maxWidth: 280, className: "custom-leaflet-popup" });

      marker.on("click", () => {
        if (onSelectLocation) onSelectLocation(loc);
      });

      markersRef.current[loc.id] = marker;
    });

    // If user selected location, center and open popup
    if (selectedLocationId && markersRef.current[selectedLocationId]) {
      const activeMarker = markersRef.current[selectedLocationId];
      map.flyTo(activeMarker.getLatLng(), 15, { animate: true, duration: 0.8 });
      activeMarker.openPopup();
    } else if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [mapReady, locations, selectedLocationId, onSelectLocation]);

  // Update user GPS location pin
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || typeof window === "undefined") return;
    const L = (window as any).L;
    if (!L) return;

    const map = mapInstanceRef.current;
    if (!map) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }

    if (userCoords) {
      const userIcon = L.divIcon({
        html: `
          <div class="relative flex items-center justify-center">
            <div class="absolute -inset-3 bg-blue-500/30 rounded-full animate-ping"></div>
            <div class="w-7 h-7 rounded-full bg-blue-600 border-2 border-white shadow-xl flex items-center justify-center text-white">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <circle cx="12" cy="12" r="3" fill="currentColor"></circle>
              </svg>
            </div>
          </div>
        `,
        className: "custom-user-gps-marker",
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([userCoords.lat, userCoords.lng], { icon: userIcon }).addTo(map);
      marker.bindPopup(`
        <div class="p-1 text-center font-sans">
          <span class="text-xs font-bold text-blue-700 block">Your Current Location</span>
          <span class="text-[10px] text-slate-500">Auto-GPS Nearest Clinic Search Active</span>
        </div>
      `);

      userMarkerRef.current = marker;
    }
  }, [mapReady, userCoords]);

  const handleResetDebreBirhanView = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(DEFAULT_CENTER, 14, { animate: true, duration: 0.8 });
    }
  };

  return (
    <div className="relative w-full h-[450px] sm:h-[520px] rounded-3xl overflow-hidden border border-[#E7E2D8] shadow-warm bg-[#E8F4F0]/30">
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {loadingTiles && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#FAF8F5]/80 backdrop-blur-xs">
          <div className="flex items-center gap-2.5 text-xs font-bold text-[#005C4B]">
            <Compass className="w-5 h-5 animate-spin" />
            <span>Rendering Debre Birhan Clinic Network...</span>
          </div>
        </div>
      )}

      {/* Floating Map Controls & Overlays */}
      <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2">
        <button
          onClick={handleResetDebreBirhanView}
          title="Center on Debre Birhan Network"
          className="bg-white/95 backdrop-blur-md p-2.5 rounded-2xl shadow-md border border-[#E7E2D8] text-[#162E27] hover:text-[#005C4B] hover:scale-105 transition-all text-xs font-bold flex items-center gap-1.5"
        >
          <Compass className="w-4 h-4 text-[#005C4B]" />
          <span className="hidden sm:inline">Debre Birhan Hub</span>
        </button>

        {onDetectLocation && (
          <button
            onClick={onDetectLocation}
            disabled={isDetectingLocation}
            title="Locate Nearest Clinic to Me (GPS)"
            className="bg-white/95 backdrop-blur-md p-2.5 rounded-2xl shadow-md border border-[#E7E2D8] text-[#162E27] hover:text-blue-600 hover:scale-105 transition-all text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
          >
            <Crosshair
              className={`w-4 h-4 text-blue-600 ${isDetectingLocation ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">
              {isDetectingLocation ? "Detecting GPS..." : "Find Nearest (GPS)"}
            </span>
          </button>
        )}
      </div>

      {/* Map Legend Overlay */}
      <div className="absolute bottom-4 left-4 z-[400] bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-[#E7E2D8] shadow-md text-xs space-y-1.5 hidden sm:block">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-md bg-[#005C4B] inline-block shadow-sm"></span>
          <span className="font-semibold text-[#162E27] text-[11px]">
            Habitat Clinic(24/7)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-md bg-white border border-[#005C4B] inline-block shadow-sm"></span>
          <span className="text-[#687B74] text-[11px]">District Medical & Pharmacy Branches</span>
        </div>
        {userCoords && (
          <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
            <span className="w-3 h-3 rounded-full bg-blue-600 inline-block shadow-sm"></span>
            <span className="text-blue-700 font-bold text-[11px]">Your Live GPS Location</span>
          </div>
        )}
      </div>
    </div>
  );
}
