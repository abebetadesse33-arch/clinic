import mysql from "mysql2/promise";
import { randomUUID } from "crypto";
import { hashPassword } from "../src/lib/security/password";
import { ensureAuthSchemaWithClient } from "../src/db/auth-schema";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const email = (process.env.SUPERADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.SUPERADMIN_PASSWORD;
  const fullName = process.env.SUPERADMIN_NAME || "System Super Administrator";

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required.");
  }

  if (!email || !password) {
    throw new Error("SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD are required.");
  }

  if (password.length < 12) {
    throw new Error("SUPERADMIN_PASSWORD must be at least 12 characters.");
  }

  const passwordHash = await hashPassword(password);
  const sql = mysql.createPool({ uri: databaseUrl, connectionLimit: 1, connectTimeout: 10_000 });

  try {
    await ensureAuthSchemaWithClient(sql);

    const [[organization]] = await sql.query<any[]>(
      `SELECT id FROM organizations ORDER BY created_at ASC LIMIT 1`
    );

    if (!organization) {
      throw new Error("No organization exists. Run database migrations first.");
    }

    const candidateId = randomUUID();
    await sql.query(
      `INSERT INTO users (
        id, organization_id, email, password_hash, full_name, role, department,
        is_admin_granted_by_super_admin, is_active, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, 'system_admin', 'Enterprise IT & Clinical Governance', TRUE, TRUE, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        organization_id = VALUES(organization_id),
        password_hash = VALUES(password_hash),
        full_name = VALUES(full_name),
        role = 'system_admin',
        department = VALUES(department),
        is_admin_granted_by_super_admin = TRUE,
        is_active = TRUE,
        updated_at = NOW()`,
      [candidateId, organization.id, email, passwordHash, fullName]
    );

    const [[user]] = await sql.query<any[]>(
      `SELECT id, email, role, is_active FROM users WHERE email = ?`,
      [email]
    );

    // A password reset invalidates any sessions that may exist for this account.
    await sql.query(`DELETE FROM auth_sessions WHERE user_id = ?`, [user.id]);

    console.log(`Super administrator enabled: ${user.email} (${user.role})`);
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error("Superadmin bootstrap failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
