/**
 * One-time data migration: copies every row from the old PostgreSQL database
 * into the new MySQL database, table by table, matching on physical column
 * names (identical snake_case names on both sides — only the engine and the
 * Drizzle schema builders changed, not the column names).
 *
 * Usage:
 *   SOURCE_DATABASE_URL=postgres://...  (the old Neon/Postgres database)
 *   DATABASE_URL=mysql://...            (the new MySQL database)
 *   bun run db:migrate-from-postgres
 *
 * Safe to re-run: uses INSERT IGNORE, so rows already copied are skipped
 * rather than duplicated or erroring. It does not delete or modify anything
 * in the source Postgres database.
 */
import postgres from "postgres";
import mysql from "mysql2/promise";
import { loadDotEnv } from "./load-dotenv";

loadDotEnv();

const BATCH_SIZE = 200;

async function main() {
  const sourceUrl = process.env.SOURCE_DATABASE_URL;
  const targetUrl = process.env.DATABASE_URL;

  if (!sourceUrl || !/^postgres(ql)?:\/\//i.test(sourceUrl)) {
    throw new Error("SOURCE_DATABASE_URL must be set to the old PostgreSQL connection string.");
  }
  if (!targetUrl || !/^mysql:\/\//i.test(targetUrl)) {
    throw new Error("DATABASE_URL must be set to the new MySQL connection string.");
  }

  const pg = postgres(sourceUrl, { max: 5, connect_timeout: 15 });
  const my = mysql.createPool({ uri: targetUrl, connectionLimit: 5, connectTimeout: 15_000 });

  try {
    const pgTables: { table_name: string }[] = await pg`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    const [myTableRows] = await my.query<any[]>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE()`
    );
    const myTableSet = new Set(myTableRows.map((r) => r.table_name || r.TABLE_NAME));

    await my.query("SET FOREIGN_KEY_CHECKS=0");

    const summary: { table: string; rows: number; status: string }[] = [];

    for (const { table_name: table } of pgTables) {
      if (!myTableSet.has(table)) {
        summary.push({ table, rows: 0, status: "SKIPPED (no matching MySQL table)" });
        continue;
      }

      const rows = await pg`SELECT * FROM ${pg(table)}`;
      if (rows.length === 0) {
        summary.push({ table, rows: 0, status: "empty" });
        continue;
      }

      // The source schema may have evolved since these rows were written
      // (renamed/dropped columns). Only import columns the current MySQL
      // table actually has; drop the rest rather than failing the table.
      const [colRows] = await my.query<any[]>(
        `SELECT column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ?`,
        [table]
      );
      const targetColumns = new Set(colRows.map((r) => r.column_name || r.COLUMN_NAME));
      const sourceColumns = Object.keys(rows[0]);
      const columns = sourceColumns.filter((c) => targetColumns.has(c));
      const droppedColumns = sourceColumns.filter((c) => !targetColumns.has(c));
      if (droppedColumns.length > 0) {
        console.warn(`  ${table}: dropping columns no longer in the schema: ${droppedColumns.join(", ")}`);
      }
      if (columns.length === 0) {
        summary.push({ table, rows: 0, status: "SKIPPED (no matching columns)" });
        continue;
      }

      const columnList = columns.map((c) => `\`${c}\``).join(", ");
      let migrated = 0;

      try {
        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
          const batch = rows.slice(i, i + BATCH_SIZE);
          const placeholders = batch.map(() => `(${columns.map(() => "?").join(", ")})`).join(", ");
          const values = batch.flatMap((row) =>
            columns.map((col) => serializeValue((row as any)[col]))
          );

          await my.query(
            `INSERT IGNORE INTO \`${table}\` (${columnList}) VALUES ${placeholders}`,
            values
          );
          migrated += batch.length;
        }
        summary.push({ table, rows: migrated, status: "OK" });
      } catch (err: any) {
        summary.push({ table, rows: migrated, status: `ERROR: ${err?.message || err}` });
      }
    }

    await my.query("SET FOREIGN_KEY_CHECKS=1");

    console.log("\n=== Migration summary ===");
    for (const s of summary) {
      console.log(`${s.status.startsWith("ERROR") ? "❌" : "✅"} ${s.table}: ${s.rows} rows (${s.status})`);
    }
    const errors = summary.filter((s) => s.status.startsWith("ERROR"));
    if (errors.length > 0) {
      console.error(`\n${errors.length} table(s) had errors. Review them above before cutting over.`);
      process.exitCode = 1;
    } else {
      console.log("\nAll tables migrated successfully.");
    }
  } finally {
    await pg.end({ timeout: 1 });
    await my.end();
  }
}

/** Converts a Postgres-driver value into something mysql2 can bind directly. */
function serializeValue(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (Array.isArray(value) || (typeof value === "object" && value !== null)) {
    return JSON.stringify(value);
  }
  return value;
}

main().catch((error) => {
  console.error("Data migration failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
