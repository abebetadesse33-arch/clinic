/**
 * IndexedDB & LocalStorage Cache Sentinel for Waiting Room TV Display
 * Enables 100% offline resilience: if WiFi/LAN drops, the TV never shows a blank screen
 * or browser error page, seamlessly falling back to cached state.
 */

const DB_NAME = "ninimed_display_offline_db";
const DB_VERSION = 1;
const STORE_NAME = "display_state_store";

export interface CachedDisplayState {
  currentlyServing: any;
  queueList: any[];
  departmentWaitTimes: any[];
  availableStaff: any[];
  announcements: any[];
  emergencyModeActive: boolean;
  criticalAnnouncement: any;
  cachedAt: string;
}

function openDB(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e: any) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function saveCachedDisplayState(state: any): Promise<void> {
  if (typeof window === "undefined") return;

  const payload: CachedDisplayState = {
    currentlyServing: state.currentlyServing,
    queueList: state.queueList || [],
    departmentWaitTimes: state.departmentWaitTimes || [],
    availableStaff: state.availableStaff || [],
    announcements: state.announcements || [],
    emergencyModeActive: state.emergencyModeActive || false,
    criticalAnnouncement: state.criticalAnnouncement || null,
    cachedAt: new Date().toISOString(),
  };

  // 1. IndexedDB primary save
  const db = await openDB();
  if (db) {
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.put(payload, "latest_state");
    } catch (e) {
      console.warn("[DisplayCache] IndexedDB write failed:", e);
    }
  }

  // 2. LocalStorage fast redundancy backup
  try {
    localStorage.setItem("ninimed_waiting_room_cache", JSON.stringify(payload));
  } catch {}
}

export async function getCachedDisplayState(): Promise<CachedDisplayState | null> {
  if (typeof window === "undefined") return null;

  // 1. Try IndexedDB
  const db = await openDB();
  if (db) {
    try {
      const result = await new Promise<CachedDisplayState | null>((resolve) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.get("latest_state");
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
      if (result) return result;
    } catch (e) {
      console.warn("[DisplayCache] IndexedDB read failed:", e);
    }
  }

  // 2. Fallback to LocalStorage
  try {
    const raw = localStorage.getItem("ninimed_waiting_room_cache");
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}

  return null;
}
