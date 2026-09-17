/**
 * One-time import: reads the JSON file produced by
 * scripts/export-postgres-dump.ts and writes every row into the MySQL
 * database (this app's own DATABASE_URL). Run this on the host that can
 * actually reach the target MySQL server (e.g. via Plesk's "Run script").
 *
 * Usage:
 *   IN_FILE=postgres-dump.json bun run db:import-mysql-dump
 *
 * This is a one-time cutover: each table is TRUNCATEd immediately before its
 * rows are (re)inserted, so re-running always reflects the dump exactly
 * rather than leaving stale partial rows behind from an earlier run against
 * an incomplete schema (this bit us once: a schema apply had not finished
 * when this ran, several tables were missing most of their real columns,
 * INSERT IGNORE let those partial rows through, and because their IDs then
 * "existed" a later re-run silently skipped fixing them).
 *
 * Do not run this against a database that already has real production
 * traffic on it — it deletes existing rows in every table the dump touches.
 *
 * Contains PHI — delete the input JSON file from the server once this has
 * run successfully.
 */
import mysql from "mysql2/promise";
import fs from "fs";
import { loadDotEnv } from "./load-dotenv";

loadDotEnv();

const BATCH_SIZE = 200;

function serializeValue(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (Array.isArray(value) || (typeof value === "object" && value !== null)) {
    return JSON.stringify(value);
  }
  return value;
}

async function main() {
  const targetUrl = process.env.DATABASE_URL;
  if (!targetUrl || !/^mysql:\/\//i.test(targetUrl)) {
    throw new Error("DATABASE_URL must be set to this app's MySQL connection string.");
  }
  const inFile = process.env.IN_FILE || "postgres-dump.json";
  if (!fs.existsSync(inFile)) {
    throw new Error(`Dump file not found: ${inFile}`);
  }

  const dump: Record<string, any[]> = JSON.parse(fs.readFileSync(inFile, "utf8"));
  const my = mysql.createPool({ uri: targetUrl, connectionLimit: 5, connectTimeout: 15_000 });

  try {
    const [myTableRows] = await my.query<any[]>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE()`
    );
    const myTableSet = new Set(myTableRows.map((r) => r.table_name || r.TABLE_NAME));

    await my.query("SET FOREIGN_KEY_CHECKS=0");

    const summary: { table: string; rows: number; status: string }[] = [];

    for (const [table, rows] of Object.entries(dump)) {
      if (!myTableSet.has(table)) {
        summary.push({ table, rows: 0, status: "SKIPPED (no matching MySQL table)" });
        continue;
      }
      if (rows.length === 0) {
        summary.push({ table, rows: 0, status: "empty" });
        continue;
      }

      // The source schema may have evolved since these rows were written
      // (a handful of columns renamed/dropped). Only import columns the
      // current MySQL table actually has — but if a large fraction of the
      // source columns are missing, that's not schema drift, it's a schema
      // that was never fully applied; refuse rather than silently importing
      // gutted rows.
      const [colRows] = await my.query<any[]>(
        `SELECT column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ?`,
        [table]
      );
      const targetColumns = new Set(colRows.map((r) => r.column_name || r.COLUMN_NAME));
      const sourceColumns = Object.keys(rows[0]);
      const columns = sourceColumns.filter((c) => targetColumns.has(c));
      const droppedColumns = sourceColumns.filter((c) => !targetColumns.has(c));
      const droppedFraction = droppedColumns.length / sourceColumns.length;

      if (droppedFraction > 0.3) {
        summary.push({
          table,
          rows: 0,
          status: `ERROR: target table is missing ${droppedColumns.length}/${sourceColumns.length} source columns (${droppedColumns.join(", ")}) — schema looks incomplete, run db:migrate first`,
        });
        continue;
      }
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
        await my.query(`TRUNCATE TABLE \`${table}\``);
        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
          const batch = rows.slice(i, i + BATCH_SIZE);
          const placeholders = batch.map(() => `(${columns.map(() => "?").join(", ")})`).join(", ");
          const values = batch.flatMap((row) => columns.map((col) => serializeValue(row[col])));

          await my.query(`INSERT IGNORE INTO \`${table}\` (${columnList}) VALUES ${placeholders}`, values);
          migrated += batch.length;
        }
        summary.push({ table, rows: migrated, status: "OK" });
      } catch (err: any) {
        summary.push({ table, rows: migrated, status: `ERROR: ${err?.message || err}` });
      }
    }

    await my.query("SET FOREIGN_KEY_CHECKS=1");

    console.log("\n=== Import summary ===");
    for (const s of summary) {
      console.log(`${s.status.startsWith("ERROR") ? "❌" : "✅"} ${s.table}: ${s.rows} rows (${s.status})`);
    }
    const errors = summary.filter((s) => s.status.startsWith("ERROR"));
    if (errors.length > 0) {
      console.error(`\n${errors.length} table(s) had errors.`);
      process.exitCode = 1;
    } else {
      console.log("\nAll tables imported successfully.");
    }
  } finally {
    await my.end();
  }
}

main().catch((error) => {
  console.error("Import failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
