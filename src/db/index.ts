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

// Validate that we have a real connection string (not a Docker Compose service name)
if (
  typeof window === "undefined" &&
  process.env.NODE_ENV === "production" &&
  (connectionString.includes("@Nini_postgres_db") || connectionString.includes("@localhost"))
) {
  console.warn(
    "[NiniMed DB] ⚠️  DATABASE_URL appears to use a Docker Compose service hostname " +
    "(Nini_postgres_db / localhost). On a bare Plesk server this will fail. " +
    "Set DATABASE_URL in the Plesk Node.js environment panel to your actual DB host."
  );
}

// Connection pool configuration for high concurrency
const client = postgres(connectionString, {
  max: 20,
  idle_timeout: 30,
  connect_timeout: 10,
});

// Auto-run schema & seed check asynchronously at runtime (not during Next.js static build)
// Delay the first attempt by 10s to give database containers time to become ready.
if (
  typeof window === "undefined" &&
  process.env.NEXT_PHASE !== "phase-production-build" &&
  !process.env.NEXT_IS_EXPORTING
) {
  const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));
  delay(10_000)
    .then(() => ensureDatabaseInitialized(client))
    .catch((err) => {
      // Non-blocking: log clearly and allow app to serve static/client pages.
      // DB-dependent API routes will return 503 instead of crashing the process.
      console.error(
        "[NiniMed DB] ❌ Database initialization failed. Check DATABASE_URL and ensure " +
        "PostgreSQL is reachable from this host.\nError:",
        err?.message || err
      );
    });
}

export const db = drizzle(client, { schema });
export default db;
