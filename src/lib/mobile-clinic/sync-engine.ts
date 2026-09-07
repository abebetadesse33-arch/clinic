/**
 * Mobile Clinic Offline Sync Engine
 * Offline-first PWA data store using IndexedDB with idempotent
 * background synchronization. Supports mobile pharmacy dispensing,
 * point-of-care lab results, and GPS outreach session management.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type SyncStatus = "pending" | "syncing" | "synced" | "failed" | "conflict";

export interface SyncQueueItem<T = unknown> {
  id: string;
  entityType: "encounter" | "vitals" | "prescription" | "lab_result" | "medication_dispense" | "consent";
  entityId: string;
  operation: "create" | "update" | "delete";
  payload: T;
  createdAt: number; // ms timestamp
  attempts: number;
  lastAttemptAt?: number;
  status: SyncStatus;
  errorMessage?: string;
  checksum: string;
}

export interface OfflineMobileClinicSession {
  sessionId: string;
  staffId: string;
  gpsLat: number;
  gpsLng: number;
  locationName: string;
  startedAt: number;
  encounters: OfflineEncounter[];
  syncedAt?: number;
  isActive: boolean;
}

export interface OfflineEncounter {
  encounterId: string;
  sessionId: string;
  patientId?: string;
  tempPatientRef?: string; // for unregistered patients
  chiefComplaint: string;
  vitals: {
    systolicBP?: number;
    diastolicBP?: number;
    heartRate?: number;
    temperature?: number;
    oxygenSaturation?: number;
    weight?: number;
    height?: number;
    bloodGlucose?: number;
  };
  clinicalNotes: string;
  prescriptions: OfflinePrescription[];
  labTests: OfflineLabResult[];
  dispensedItems: OfflineDispensedItem[];
  createdAt: number;
  syncStatus: SyncStatus;
}

export interface OfflinePrescription {
  prescriptionId: string;
  drugName: string;
  dosage: string;
  frequency: string;
  durationDays: number;
  quantity: number;
  clinicianNotes?: string;
}

export interface OfflineLabResult {
  testId: string;
  testName: string;
  result: string;
  unit: string;
  referenceRange?: string;
  isAbnormal?: boolean;
  performedAt: number;
}

export interface OfflineDispensedItem {
  itemId: string;
  drugName: string;
  lotNumber: string;
  quantity: number;
  dispensedAt: number;
}

export interface MobileInventoryItem {
  drugName: string;
  genericName: string;
  dosageForm: string;
  strength: string;
  lotNumber: string;
  expiryDate: string;
  quantity: number;
  minStockLevel: number;
  storageRequirements: string;
}

// ─── IndexedDB Configuration ──────────────────────────────────────────────────

const DB_NAME = "mobile-clinic-offline-db";
const DB_VERSION = 1;

const STORES = {
  syncQueue: "sync_queue",
  sessions: "clinic_sessions",
  encounters: "encounters",
  inventory: "mobile_inventory",
  patients: "cached_patients",
} as const;

// ─── DB Initialiser ───────────────────────────────────────────────────────────

let dbInstance: IDBDatabase | null = null;

export function openOfflineDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not available (server-side render)"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORES.syncQueue)) {
        const syncStore = db.createObjectStore(STORES.syncQueue, { keyPath: "id" });
        syncStore.createIndex("status", "status", { unique: false });
        syncStore.createIndex("entityType", "entityType", { unique: false });
        syncStore.createIndex("createdAt", "createdAt", { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.sessions)) {
        const sessionStore = db.createObjectStore(STORES.sessions, { keyPath: "sessionId" });
        sessionStore.createIndex("staffId", "staffId", { unique: false });
        sessionStore.createIndex("isActive", "isActive", { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.encounters)) {
        const encStore = db.createObjectStore(STORES.encounters, { keyPath: "encounterId" });
        encStore.createIndex("sessionId", "sessionId", { unique: false });
        encStore.createIndex("syncStatus", "syncStatus", { unique: false });
        encStore.createIndex("patientId", "patientId", { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.inventory)) {
        db.createObjectStore(STORES.inventory, { keyPath: "drugName" });
      }

      if (!db.objectStoreNames.contains(STORES.patients)) {
        const patientStore = db.createObjectStore(STORES.patients, { keyPath: "id" });
        patientStore.createIndex("fullName", "fullName", { unique: false });
        patientStore.createIndex("phoneNumber", "phoneNumber", { unique: false });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onerror = () => reject(request.error);
  });
}

// ─── Generic DB Helpers ───────────────────────────────────────────────────────

async function dbGet<T>(storeName: string, key: string): Promise<T | undefined> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const req = tx.objectStore(storeName).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

async function dbPut<T>(storeName: string, value: T): Promise<void> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const req = tx.objectStore(storeName).put(value);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function dbGetAll<T>(storeName: string, indexName?: string, query?: IDBValidKey | IDBKeyRange): Promise<T[]> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const target = indexName ? store.index(indexName) : store;
    const req = query ? target.getAll(query) : target.getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

async function dbDelete(storeName: string, key: string): Promise<void> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const req = tx.objectStore(storeName).delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ─── Checksum ────────────────────────────────────────────────────────────────

function buildChecksum(payload: unknown): string {
  const str = JSON.stringify(payload);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}

// ─── Sync Queue API ───────────────────────────────────────────────────────────

export async function enqueueSync<T>(
  entityType: SyncQueueItem["entityType"],
  entityId: string,
  operation: SyncQueueItem["operation"],
  payload: T
): Promise<string> {
  const id = `${entityType}-${entityId}-${Date.now()}`;
  const item: SyncQueueItem<T> = {
    id,
    entityType,
    entityId,
    operation,
    payload,
    createdAt: Date.now(),
    attempts: 0,
    status: "pending",
    checksum: buildChecksum(payload),
  };
  await dbPut(STORES.syncQueue, item);
  return id;
}

export async function getPendingSyncItems(): Promise<SyncQueueItem[]> {
  return dbGetAll<SyncQueueItem>(STORES.syncQueue, "status", "pending");
}

export async function markSyncItemStatus(id: string, status: SyncStatus, errorMessage?: string): Promise<void> {
  const item = await dbGet<SyncQueueItem>(STORES.syncQueue, id);
  if (!item) return;
  await dbPut(STORES.syncQueue, {
    ...item,
    status,
    attempts: item.attempts + 1,
    lastAttemptAt: Date.now(),
    errorMessage,
  });
}

export async function clearSyncedItems(): Promise<void> {
  const synced = await dbGetAll<SyncQueueItem>(STORES.syncQueue, "status", "synced");
  for (const item of synced) {
    await dbDelete(STORES.syncQueue, item.id);
  }
}

// ─── Session API ──────────────────────────────────────────────────────────────

export async function saveSession(session: OfflineMobileClinicSession): Promise<void> {
  await dbPut(STORES.sessions, session);
}

export async function getSession(sessionId: string): Promise<OfflineMobileClinicSession | undefined> {
  return dbGet<OfflineMobileClinicSession>(STORES.sessions, sessionId);
}

export async function getActiveSessions(staffId: string): Promise<OfflineMobileClinicSession[]> {
  const all = await dbGetAll<OfflineMobileClinicSession>(STORES.sessions, "staffId", staffId);
  return all.filter((s) => s.isActive);
}

// ─── Encounter API ────────────────────────────────────────────────────────────

export async function saveEncounter(encounter: OfflineEncounter): Promise<void> {
  await dbPut(STORES.encounters, encounter);
  await enqueueSync("encounter", encounter.encounterId, "create", encounter);
}

export async function getEncountersBySession(sessionId: string): Promise<OfflineEncounter[]> {
  return dbGetAll<OfflineEncounter>(STORES.encounters, "sessionId", sessionId);
}

export async function getUnsyncedEncounters(): Promise<OfflineEncounter[]> {
  return dbGetAll<OfflineEncounter>(STORES.encounters, "syncStatus", "pending");
}

// ─── Inventory API ────────────────────────────────────────────────────────────

export async function updateInventory(item: MobileInventoryItem): Promise<void> {
  await dbPut(STORES.inventory, item);
}

export async function getInventory(): Promise<MobileInventoryItem[]> {
  return dbGetAll<MobileInventoryItem>(STORES.inventory);
}

export async function dispenseMedication(drugName: string, quantity: number): Promise<boolean> {
  const item = await dbGet<MobileInventoryItem>(STORES.inventory, drugName);
  if (!item || item.quantity < quantity) return false;
  await dbPut(STORES.inventory, { ...item, quantity: item.quantity - quantity });
  return true;
}

export async function getLowStockAlerts(): Promise<MobileInventoryItem[]> {
  const all = await getInventory();
  return all.filter((i) => i.quantity <= i.minStockLevel);
}

// ─── Background Sync Engine ───────────────────────────────────────────────────

export interface SyncResult {
  synced: number;
  failed: number;
  errors: { id: string; error: string }[];
}

export async function runBackgroundSync(apiBaseUrl: string, authToken: string): Promise<SyncResult> {
  const pending = await getPendingSyncItems();
  const result: SyncResult = { synced: 0, failed: 0, errors: [] };

  for (const item of pending) {
    try {
      const endpoint = `${apiBaseUrl}/api/v1/mobile-clinic-sessions/sync`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
          "X-Idempotency-Key": item.id,
          "X-Payload-Checksum": item.checksum,
        },
        body: JSON.stringify({
          entityType: item.entityType,
          entityId: item.entityId,
          operation: item.operation,
          payload: item.payload,
          clientTimestamp: item.createdAt,
        }),
      });

      if (response.ok) {
        await markSyncItemStatus(item.id, "synced");
        result.synced++;
      } else if (response.status === 409) {
        // Conflict – server wins
        await markSyncItemStatus(item.id, "conflict", `Server conflict: ${response.status}`);
        result.failed++;
        result.errors.push({ id: item.id, error: "Conflict detected; server version preserved." });
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      await markSyncItemStatus(item.id, "failed", String(error));
      result.failed++;
      result.errors.push({ id: item.id, error: String(error) });
    }
  }

  if (result.synced > 0) {
    await clearSyncedItems();
  }

  return result;
}

// ─── PWA Cache Prefetch ───────────────────────────────────────────────────────

export async function prefetchForOffline(apiBaseUrl: string, authToken: string): Promise<void> {
  if (typeof caches === "undefined") return;

  const urlsToPrefetch = [
    `${apiBaseUrl}/api/v1/mobile-clinic-sessions`,
    `${apiBaseUrl}/api/v1/medications/formulary`,
    `${apiBaseUrl}/api/v1/lab/test-catalog`,
  ];

  const cache = await caches.open("mobile-clinic-v1");
  for (const url of urlsToPrefetch) {
    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (response.ok) {
        await cache.put(url, response.clone());
      }
    } catch {
      // offline — skip
    }
  }
}

export function generateEncounterId(): string {
  return `enc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function generateSessionId(): string {
  return `sess-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
