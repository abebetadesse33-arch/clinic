import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { ensureDatabaseInitialized } from "./migrate-and-seed";

// Polyfill BigInt JSON serialization globally so JSON.stringify never throws
if (typeof BigInt !== "undefined" && !(BigInt.prototype as any).toJSON) {
  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };
}

const connectionString =
  process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/clinic_enterprise";

// Connection pool configuration for high concurrency
const client = postgres(connectionString, {
  max: 20,
  idle_timeout: 30,
  connect_timeout: 10,
});

// Auto-run schema & seed check asynchronously at runtime (not during Next.js static build)
if (
  typeof window === "undefined" &&
  process.env.NEXT_PHASE !== "phase-production-build" &&
  !process.env.NEXT_IS_EXPORTING
) {
  ensureDatabaseInitialized(client).catch(() => {
    // Non-blocking: will retry on subsequent runtime queries if DB container is still spinning up
  });
}

export const db = drizzle(client, { schema });
export default db;
