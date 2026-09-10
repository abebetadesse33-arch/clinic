import { ensureDatabaseInitialized } from "../src/db/migrate-and-seed";
import { connectToDatabase } from "./db-connection";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required for migrations.");
  }

  const sql = await connectToDatabase(connectionString, "Migration");
  try {
    await sql`select pg_advisory_lock(hashtext('ninimed-schema-migration'))`;
    process.env.NINIMED_STRICT_DB = "true";
    await ensureDatabaseInitialized(sql, { seed: false });
    console.log("Database migration completed successfully.");
  } finally {
    await sql`select pg_advisory_unlock(hashtext('ninimed-schema-migration'))`;
    await sql.end();
  }
}

main().catch((error) => {
  console.error("Database migration failed:", error instanceof Error ? error.message : JSON.stringify(error));
  process.exitCode = 1;
});
