/**
 * Universal Device Geolocation Bridge for K4B-Pro
 * Abstracts Capacitor Native Geolocation and HTML5 Web Geolocation
 * with permission management, distance gating, and graceful fallbacks.
 */

import { Coordinates, PermissionState } from "./geo-types";
import { calculateHaversineDistanceKm } from "./geo-math";

export interface GetPositionOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  fallbackToLowAccuracyOnTimeout?: boolean;
}

export interface WatchPositionOptions extends GetPositionOptions {
  minDistanceMeters?: number; // Distance gating: only trigger if moved >= X meters
  throttleMs?: number;        // Rate limit updates
}

export type PositionCallback = (coords: Coordinates) => void;
export type ErrorCallback = (error: { code: string; message: string }) => void;

/**
 * Checks current location permission state across Native and Web.
 */
export async function checkLocationPermission(): Promise<PermissionState> {
  if (typeof window === "undefined") return "unknown";

  try {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.isNativePlatform()) {
      const { Geolocation } = await import("@capacitor/geolocation");
      const status = await Geolocation.checkPermissions();
      if (status.location === "granted") return "granted";
      if (status.location === "denied") return "denied";
      return "prompt";
    }
  } catch (_e) {
    // Fall through to web permission check
  }

  if (navigator.permissions && navigator.permissions.query) {
    try {
      const status = await navigator.permissions.query({ name: "geolocation" as PermissionName });
      return status.state as PermissionState;
    } catch (_err) {
      return "prompt";
    }
  }

  return "prompt";
}

/**
 * Requests location permission across Native and Web.
 */
export async function requestLocationPermission(): Promise<PermissionState> {
  if (typeof window === "undefined") return "unknown";

  try {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.isNativePlatform()) {
      const { Geolocation } = await import("@capacitor/geolocation");
      const status = await Geolocation.requestPermissions();
      if (status.location === "granted") return "granted";
      if (status.location === "denied") return "denied";
      return "denied";
    }
  } catch (_e) {
    // Web permissions cannot be prompted explicitly without invoking getCurrentPosition
  }

  return checkLocationPermission();
}

/**
 * Acquires single current GPS position with multi-tiered fallback.
 */
export async function getDeviceCoordinates(
  options: GetPositionOptions = {}
): Promise<Coordinates> {
  if (typeof window === "undefined") {
    throw { code: "SSR_UNAVAILABLE", message: "Geolocation is not available on server" };
  }

  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 0,
    fallbackToLowAccuracyOnTimeout = true,
  } = options;

  // ── 1. Native Capacitor Environment ─────────────────────────────────────────
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.isNativePlatform()) {
      const { Geolocation } = await import("@capacitor/geolocation");
      const perm = await Geolocation.checkPermissions();
      if (perm.location !== "granted") {
        const req = await Geolocation.requestPermissions();
        if (req.location !== "granted") {
          throw { code: "PERMISSION_DENIED", message: "Location permission denied by user." };
        }
      }

      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy,
        timeout,
        maximumAge,
      });

      return {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        altitude: pos.coords.altitude,
        heading: pos.coords.heading,
        speed: pos.coords.speed,
        timestamp: pos.timestamp,
      };
    }
  } catch (nativeErr: any) {
    if (nativeErr?.code === "PERMISSION_DENIED") throw nativeErr;
    // If native failed unexpectedly, try web standard below
  }

  // ── 2. Web Standard Geolocation API ─────────────────────────────────────────
  if (!navigator.geolocation) {
    throw {
      code: "NOT_SUPPORTED",
      message: "Geolocation is not supported by your browser or device.",
    };
  }

  const fetchWebPosition = (highAccuracy: boolean, timeoutMs: number): Promise<Coordinates> => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            altitude: pos.coords.altitude,
            heading: pos.coords.heading,
            speed: pos.coords.speed,
            timestamp: pos.timestamp,
          });
        },
        (err) => {
          let code = "UNKNOWN";
          if (err.code === err.PERMISSION_DENIED) code = "PERMISSION_DENIED";
          else if (err.code === err.POSITION_UNAVAILABLE) code = "POSITION_UNAVAILABLE";
          else if (err.code === err.TIMEOUT) code = "TIMEOUT";
          reject({ code, message: err.message });
        },
        {
          enableHighAccuracy: highAccuracy,
          timeout: timeoutMs,
          maximumAge,
        }
      );
    });
  };

  try {
    return await fetchWebPosition(enableHighAccuracy, timeout);
  } catch (webErr: any) {
    // If high accuracy timed out, retry with low accuracy (cell/WiFi network)
    if (webErr.code === "TIMEOUT" && enableHighAccuracy && fallbackToLowAccuracyOnTimeout) {
      return await fetchWebPosition(false, 6000);
    }
    throw webErr;
  }
}

/**
 * Continuously watches device location with distance gating (e.g. 15 meters)
 * and battery-conscious updates.
 */
export function watchDeviceLocation(
  onPosition: PositionCallback,
  onError?: ErrorCallback,
  options: WatchPositionOptions = {}
): () => void {
  if (typeof window === "undefined") return () => {};

  const {
    enableHighAccuracy = true,
    timeout = 15000,
    maximumAge = 2000,
    minDistanceMeters = 15,
    throttleMs = 3000,
  } = options;

  let isCancelled = false;
  let lastDispatchedCoords: Coordinates | null = null;
  let lastDispatchedTime = 0;
  let clearNativeWatch: (() => void) | null = null;
  let webWatchId: number | null = null;

  const handlePosition = (coords: Coordinates) => {
    if (isCancelled) return;

    const now = Date.now();
    if (now - lastDispatchedTime < throttleMs) {
      return;
    }

    if (lastDispatchedCoords && minDistanceMeters > 0) {
      const distKm = calculateHaversineDistanceKm(
        lastDispatchedCoords.lat,
        lastDispatchedCoords.lng,
        coords.lat,
        coords.lng
      );
      if (distKm * 1000 < minDistanceMeters) {
        return; // Filter out jitter below threshold
      }
    }

    lastDispatchedCoords = coords;
    lastDispatchedTime = now;
    onPosition(coords);
  };

  const startWatching = async () => {
    try {
      const { Capacitor } = await import("@capacitor/core");
      if (Capacitor.isNativePlatform()) {
        const { Geolocation } = await import("@capacitor/geolocation");
        const watchId = await Geolocation.watchPosition(
          { enableHighAccuracy, timeout, maximumAge },
          (pos, err) => {
            if (err) {
              onError?.({ code: "NATIVE_WATCH_ERROR", message: err.message });
              return;
            }
            if (pos && pos.coords) {
              handlePosition({
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
                altitude: pos.coords.altitude,
                heading: pos.coords.heading,
                speed: pos.coords.speed,
                timestamp: pos.timestamp,
              });
            }
          }
        );

        clearNativeWatch = () => {
          Geolocation.clearWatch({ id: watchId }).catch(() => {});
        };
        return;
      }
    } catch (_e) {
      // Fallback to web watch
    }

    if (navigator.geolocation) {
      webWatchId = navigator.geolocation.watchPosition(
        (pos) => {
          handlePosition({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            altitude: pos.coords.altitude,
            heading: pos.coords.heading,
            speed: pos.coords.speed,
            timestamp: pos.timestamp,
          });
        },
        (err) => {
          onError?.({ code: String(err.code), message: err.message });
        },
        { enableHighAccuracy, timeout, maximumAge }
      );
    } else {
      onError?.({ code: "NOT_SUPPORTED", message: "Geolocation not supported" });
    }
  };

  startWatching();

  return () => {
    isCancelled = true;
    if (clearNativeWatch) {
      clearNativeWatch();
    }
    if (webWatchId !== null && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.clearWatch(webWatchId);
    }
  };
}
