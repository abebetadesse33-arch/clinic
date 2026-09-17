/**
 * One-time export: dumps every row from the local/source PostgreSQL database
 * into a single JSON file, for environments (like a locked-down Plesk host)
 * that can't directly reach the source database over the network. Pair with
 * scripts/import-mysql-dump.ts, which reads this file and writes to MySQL.
 *
 * Usage:
 *   SOURCE_DATABASE_URL=postgres://...  bun run db:export-postgres-dump
 *
 * Contains PHI — do not commit the output file to git, and delete it from
 * wherever you upload it once the import has run successfully.
 */
import postgres from "postgres";
import fs from "fs";

async function main() {
  const sourceUrl = process.env.SOURCE_DATABASE_URL;
  if (!sourceUrl || !/^postgres(ql)?:\/\//i.test(sourceUrl)) {
    throw new Error("SOURCE_DATABASE_URL must be set to the source PostgreSQL connection string.");
  }
  const outFile = process.env.OUT_FILE || "postgres-dump.json";

  const pg = postgres(sourceUrl, { max: 5, connect_timeout: 15 });
  try {
    const tables: { table_name: string }[] = await pg`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    const dump: Record<string, any[]> = {};
    let totalRows = 0;

    for (const { table_name: table } of tables) {
      const rows = await pg`SELECT * FROM ${pg(table)}`;
      dump[table] = rows as any[];
      totalRows += rows.length;
      console.log(`Exported ${table}: ${rows.length} rows`);
    }

    fs.writeFileSync(outFile, JSON.stringify(dump));
    const sizeMb = (fs.statSync(outFile).size / 1024 / 1024).toFixed(2);
    console.log(`\nWrote ${outFile} (${sizeMb} MB), ${tables.length} tables, ${totalRows} total rows.`);
  } finally {
    await pg.end({ timeout: 1 });
  }
}

main().catch((error) => {
  console.error("Export failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
