import { ensureDatabaseInitialized } from "../src/db/migrate-and-seed";
import { connectToDatabase } from "./db-connection";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required for seeding.");
  }

  if (process.env.NODE_ENV === "production" && process.env.ALLOW_PRODUCTION_SEED !== "true") {
    throw new Error("Production seeding requires ALLOW_PRODUCTION_SEED=true.");
  }

  const sql = await connectToDatabase(connectionString, "Seed");
  try {
    await sql.query("SELECT GET_LOCK('ninimed-schema-migration', 30)");
    process.env.NINIMED_STRICT_DB = "true";
    await ensureDatabaseInitialized(sql, { seed: true });
    console.log("Database seed completed successfully.");
  } finally {
    await sql.query("SELECT RELEASE_LOCK('ninimed-schema-migration')").catch(() => undefined);
    await sql.end();
  }
}

main().catch((error) => {
  console.error("Database seed failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
