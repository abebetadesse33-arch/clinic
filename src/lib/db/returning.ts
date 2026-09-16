import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import type { AnyMySqlTable } from "drizzle-orm/mysql-core";

/**
 * MySQL (mysql2) has no `RETURNING` clause, unlike the PostgreSQL driver this
 * codebase used previously. Every column this app relies on getting back
 * from an insert is either supplied by the caller or computed client-side by
 * Drizzle ($defaultFn/.default() in src/db/schema.ts, never a DB-side
 * `DEFAULT` expression) — so an inserted row is fully known in JS *before*
 * the INSERT executes. `insertReturning` computes those defaults up front,
 * runs the insert, and hands back the same complete row(s) as an array,
 * exactly matching Postgres's `.returning()` shape.
 *
 * There is no such shortcut for `.update().returning()`: the new row values
 * are only fully known in the database (partial `.set()`, computed columns).
 * `updateReturning` runs the update and then re-selects the affected rows by
 * the same `where` condition.
 */

type Db = {
  insert: (table: any) => { values: (v: any) => Promise<unknown> };
  update: (table: any) => { set: (v: any) => { where: (c: any) => Promise<unknown> } & Promise<unknown> };
  select: () => { from: (table: any) => { where: (c: any) => Promise<any[]> } & Promise<any[]> };
};

function applyDefaults(table: AnyMySqlTable, values: Record<string, any>): Record<string, any> {
  const complete: Record<string, any> = { ...values };
  for (const [key, col] of Object.entries(table)) {
    if (!col || typeof col !== "object" || !("hasDefault" in col)) continue;
    if (complete[key] !== undefined) continue;
    if (typeof (col as any).defaultFn === "function") {
      complete[key] = (col as any).defaultFn();
    } else if ((col as any).hasDefault && (col as any).default !== undefined) {
      complete[key] = (col as any).default;
    }
  }
  return complete;
}

/**
 * Replaces `db.insert(table).values(values).returning()`. Accepts either a
 * single row or an array of rows, always returns an array (matching
 * Postgres's `.returning()`), so `const [row] = await insertReturning(...)`
 * keeps working unchanged at call sites written for the single-row case.
 * The return type is the table's full row shape, not just the properties
 * the caller happened to supply, since defaulted columns (id, createdAt, …)
 * are filled in before the insert.
 */
export async function insertReturning<TTable extends AnyMySqlTable>(
  db: Db,
  table: TTable,
  values: InferInsertModel<TTable> | InferInsertModel<TTable>[]
): Promise<InferSelectModel<TTable>[]> {
  const list = Array.isArray(values) ? values : [values];
  const complete = list.map((v) => applyDefaults(table, v as Record<string, any>));
  if (complete.length > 0) {
    await db.insert(table).values(complete);
  }
  return complete as InferSelectModel<TTable>[];
}

/**
 * Replaces `db.delete(table).where(condition).returning()`. Since a deleted
 * row can't be re-selected afterward, this selects the about-to-be-deleted
 * rows first, then deletes them, and returns the pre-deletion snapshot.
 */
export async function deleteReturning<TTable extends AnyMySqlTable>(
  db: Db,
  table: TTable,
  condition: any
): Promise<InferSelectModel<TTable>[]> {
  const rows = await (db.select().from(table) as any).where(condition);
  if (rows.length > 0) {
    await (db as any).delete(table).where(condition);
  }
  return rows;
}

/**
 * Replaces `db.update(table).set(values).where(condition).returning()`
 * (condition omitted for a singleton/settings-style table that has no
 * `.where()` at all). Runs the update, then re-selects by the same
 * condition to return the affected row(s).
 */
export async function updateReturning<TTable extends AnyMySqlTable>(
  db: Db,
  table: TTable,
  values: Partial<InferInsertModel<TTable>>,
  condition?: any
): Promise<InferSelectModel<TTable>[]> {
  const updateBuilder = db.update(table).set(values);
  if (condition) {
    await (updateBuilder as any).where(condition);
  } else {
    await updateBuilder;
  }
  const selectBuilder = db.select().from(table);
  return condition ? (selectBuilder as any).where(condition) : selectBuilder;
}
