/**
 * Drops every table in the target MySQL database, so db:migrate can recreate
 * the full schema from scratch instead of getting stuck on tables left in a
 * partial/stale shape by an earlier interrupted deploy (CREATE TABLE is not
 * retried once a table already exists, even an incomplete one).
 *
 * Usage: bun run db:reset-mysql-schema   (or: npx tsx scripts/reset-mysql-schema.ts)
 *
 * Destructive — deletes every row in every table. Only run this when you
 * intend to rebuild the schema from scratch (e.g. before a fresh
 * db:migrate + db:import-mysql-dump cutover), never against a database with
 * real production traffic you want to keep.
 */
import mysql from "mysql2/promise";
import { loadDotEnv } from "./load-dotenv";

loadDotEnv();

async function main() {
  const targetUrl = process.env.DATABASE_URL;
  if (!targetUrl || !/^mysql:\/\//i.test(targetUrl)) {
    throw new Error("DATABASE_URL must be set to this app's MySQL connection string.");
  }

  const my = mysql.createPool({ uri: targetUrl, connectionLimit: 2, connectTimeout: 15_000 });
  try {
    const [tableRows] = await my.query<any[]>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE()`
    );
    const tables = tableRows.map((r) => r.table_name || r.TABLE_NAME);

    if (tables.length === 0) {
      console.log("No tables found; nothing to drop.");
      return;
    }

    console.log(`Dropping ${tables.length} tables...`);
    await my.query("SET FOREIGN_KEY_CHECKS=0");
    for (const table of tables) {
      await my.query(`DROP TABLE \`${table}\``);
      console.log(`  dropped ${table}`);
    }
    await my.query("SET FOREIGN_KEY_CHECKS=1");
    console.log("\nAll tables dropped. Run db:migrate next to recreate the schema.");
  } finally {
    await my.end();
  }
}

main().catch((error) => {
  console.error("Reset failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
