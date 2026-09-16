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

function resolveConnectionString(): string {
  let conn = process.env.DATABASE_URL || "";
  const isDummy = (s: string) =>
    !s || s.includes("@localhost") || s.includes("@127.0.0.1") || s.includes("@Nini_postgres_db");

  if (isDummy(conn) && typeof window === "undefined") {
    try {
      const fs = require("fs");
      const path = require("path");
      const candidates = [
        path.resolve(process.cwd(), ".env"),
        path.resolve(process.cwd(), ".env.production"),
        path.resolve(process.cwd(), "..", ".env"),
        path.resolve(__dirname, ".env"),
        path.resolve(__dirname, "..", ".env"),
      ];
      for (const file of candidates) {
        if (fs.existsSync(file)) {
          const content = fs.readFileSync(file, "utf8");
          const match = content.match(/^DATABASE_URL\s*=\s*["']?([^"'\r\n]+)["']?/m);
          if (match && match[1] && !isDummy(match[1].trim())) {
            conn = match[1].trim();
            process.env.DATABASE_URL = conn;
            break;
          }
        }
      }
    } catch {}
  }

  return conn || "postgres://postgres:postgres@localhost:5432/clinic_enterprise";
}

const connectionString = resolveConnectionString();
let validConnectionString = connectionString;

if (/^mysql:\/\//i.test(connectionString)) {
  console.error(
    "[NiniMed DB] ❌ DATABASE_URL uses MySQL (mysql://). NiniMed requires PostgreSQL. " +
      "Please create a PostgreSQL database in Plesk or set DATABASE_URL to a PostgreSQL instance (postgresql://)."
  );
  // Use dummy postgres connection string to prevent postgres client from throwing protocol parse errors on startup
  validConnectionString = "postgres://postgres:invalid@127.0.0.1:5432/clinic_enterprise";
}

// Check for unencoded '@' in password (e.g., postgresql://user:pass@word@host...)
const atMatches = connectionString.match(/@/g);
if (atMatches && atMatches.length > 1) {
  console.warn(
    "[NiniMed DB] ⚠️  DATABASE_URL contains multiple '@' characters. " +
      "If your password contains '@' or '&', you MUST URL-encode them ('@' -> '%40', '&' -> '%26'). " +
      "Example: postgresql://user:pass%40%261@host:port/dbname"
  );
}

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

// Connection pool configuration for high concurrency (non-fatal client creation)
const client = postgres(validConnectionString, {
  max: 20,
  idle_timeout: 30,
  connect_timeout: 10,
  onnotice: () => {},
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
