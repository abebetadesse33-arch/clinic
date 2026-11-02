/**
 * Sets NiniMed up inside the combined deployment. Run by the gateway before the app starts (bundled to
 * scripts/prepare.cjs by scripts/prepare-ninic.mjs), and by the portal when it adds an administrator.
 *
 *   prepare.cjs                         applies the schema, creates the organisation and clinic the first time,
 *                                       loads the pharmacy and laboratory catalogues once, and creates the
 *                                       super administrator (SUPERADMIN_EMAIL / _PASSWORD / _NAME), or resets
 *                                       its password when that no longer matches
 *   prepare.cjs --admin EMAIL --name N  only creates or promotes that administrator (password in NEW_ADMIN_PASSWORD)
 *
 * Nothing here creates demo accounts: the app's own start-up seeding (which does, with published
 * passwords) is switched off by NINIMED_AUTO_MIGRATE=false.
 */
import { randomUUID } from "node:crypto";
import mysql from "mysql2/promise";
import { ensureDatabaseInitialized, syncComprehensiveCatalogues } from "../src/db/migrate-and-seed";
import { hashPassword, verifyPassword } from "../src/lib/security/password";

const ORGANIZATION_ID = "00000000-0000-0000-0000-000000000001";
const FACILITY_ID = "00000000-0000-0000-0000-000000000002";

function argument(name: string) {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}

async function upsertAdmin(sql: mysql.Pool, input: { email: string; name: string; password: string; role: "system_admin" | "tenant_admin" }) {
  const [rows] = await sql.query<any[]>("SELECT id, password_hash FROM users WHERE email = ? LIMIT 1", [input.email]);
  const existing = rows[0];
  if (existing?.password_hash && (await verifyPassword(input.password, existing.password_hash)).ok) {
    // Already as wanted: keep the sessions that exist (a restart must not sign the administrator out).
    await sql.query("UPDATE users SET role = ?, is_admin_granted_by_super_admin = TRUE, is_active = TRUE, department = NULL, updated_at = NOW() WHERE id = ?", [input.role, existing.id]);
    return "ready";
  }
  const passwordHash = await hashPassword(input.password);
  if (existing) {
    await sql.query(
      "UPDATE users SET organization_id = ?, password_hash = ?, role = ?, is_admin_granted_by_super_admin = TRUE, is_active = TRUE, department = NULL, updated_at = NOW() WHERE id = ?",
      [ORGANIZATION_ID, passwordHash, input.role, existing.id],
    );
    await sql.query("DELETE FROM auth_sessions WHERE user_id = ?", [existing.id]); // a changed password ends the old sessions
    return "password reset";
  }
  await sql.query(
    `INSERT INTO users (id, organization_id, email, password_hash, full_name, role, department, is_admin_granted_by_super_admin, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, NULL, TRUE, TRUE, NOW(), NOW())`,
    [randomUUID(), ORGANIZATION_ID, input.email, passwordHash, input.name, input.role],
  );
  return "created";
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");
  const sql = mysql.createPool({ uri: databaseUrl, connectionLimit: 2, connectTimeout: 10_000 });
  try {
    const adminEmail = argument("--admin")?.trim().toLowerCase();
    if (adminEmail) {
      const password = process.env.NEW_ADMIN_PASSWORD || "";
      if (password.length < 12) throw new Error("NEW_ADMIN_PASSWORD must be at least 12 characters.");
      const outcome = await upsertAdmin(sql, { email: adminEmail, name: argument("--name") || adminEmail, password, role: "tenant_admin" });
      console.log(`Administrator ${adminEmail}: ${outcome}.`);
      return;
    }

    const email = (process.env.SUPERADMIN_EMAIL || "").trim().toLowerCase();
    const password = process.env.SUPERADMIN_PASSWORD || "";
    if (!email || password.length < 12) throw new Error("SUPERADMIN_EMAIL and a SUPERADMIN_PASSWORD of 12 or more characters are required.");

    await sql.query("SELECT GET_LOCK('ninimed-schema-migration', 60)");
    try {
      process.env.NINIMED_STRICT_DB = "true";
      await ensureDatabaseInitialized(sql, { seed: false });

      await sql.query(
        `INSERT IGNORE INTO organizations (id, name, slug, status, settings)
         VALUES (?, 'NiniMed Enterprise Health System', 'org-Nini', 'active', '{"theme": "dark", "multitenancy": true, "auditLevel": "21CFR11"}')`,
        [ORGANIZATION_ID],
      );
      await sql.query(
        `INSERT IGNORE INTO facilities (id, organization_id, name, address, timezone)
         VALUES (?, ?, 'NiniMed Clinic', 'Addis Ababa, Ethiopia', 'Africa/Addis_Ababa')`,
        [FACILITY_ID, ORGANIZATION_ID],
      );

      const [[catalogue]] = await sql.query<any[]>("SELECT COUNT(*) AS n FROM drug_catalog");
      if (Number(catalogue.n) === 0) await syncComprehensiveCatalogues(sql); // a few hundred rows, once

      const outcome = await upsertAdmin(sql, { email, name: process.env.SUPERADMIN_NAME || "System Super Administrator", password, role: "system_admin" });
      console.log(`Super administrator ${email}: ${outcome}.`);
    } finally {
      await sql.query("SELECT RELEASE_LOCK('ninimed-schema-migration')").catch(() => undefined);
    }
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error("NiniMed setup failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
