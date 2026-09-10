import postgres from "postgres";
import { ensureDatabaseInitialized } from "./migrate-and-seed";

async function main() {
  const connectionString =
    process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/clinic_enterprise";
  console.log("Connecting to the configured PostgreSQL database...");
  const sql = postgres(connectionString);
  try {
    await ensureDatabaseInitialized(sql);
    console.log("✅ Database initialized successfully with all new tables!");
  } catch (err) {
    console.error("❌ Init error:", err);
  } finally {
    await sql.end();
  }
}

main();
