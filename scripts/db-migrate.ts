import { ensureDatabaseInitialized } from "../src/db/migrate-and-seed";
import { connectToDatabase } from "./db-connection";
import { loadDotEnv } from "./load-dotenv";

loadDotEnv();

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required for migrations.");
  }

  const sql = await connectToDatabase(connectionString, "Migration");
  try {
    await sql.query("SELECT GET_LOCK('ninimed-schema-migration', 30)");
    process.env.NINIMED_STRICT_DB = "true";
    await ensureDatabaseInitialized(sql, { seed: false });
    console.log("Database migration completed successfully.");
  } finally {
    await sql.query("SELECT RELEASE_LOCK('ninimed-schema-migration')").catch(() => undefined);
    await sql.end();
  }
}

main().catch((error) => {
  console.error("Database migration failed:", error instanceof Error ? error.message : JSON.stringify(error));
  process.exitCode = 1;
});
