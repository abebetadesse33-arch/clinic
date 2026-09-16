import postgres from "postgres";
import { createHash } from "node:crypto";

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

const passwordHash = createHash("sha256").update(password, "utf8").digest("hex");
const sql = postgres(databaseUrl, { connect_timeout: 10 });

try {
  const [organization] = await sql`
    SELECT id FROM organizations
    ORDER BY created_at ASC
    LIMIT 1
  `;

  if (!organization) {
    throw new Error("No organization exists. Run database migrations first.");
  }

  const [user] = await sql`
    INSERT INTO users (
      organization_id,
      email,
      password_hash,
      full_name,
      role,
      department,
      is_admin_granted_by_super_admin,
      is_active
    )
    VALUES (
      ${organization.id},
      ${email},
      ${passwordHash},
      ${fullName},
      'system_admin',
      'Enterprise IT & Clinical Governance',
      TRUE,
      TRUE
    )
    ON CONFLICT (email) DO UPDATE SET
      organization_id = EXCLUDED.organization_id,
      password_hash = EXCLUDED.password_hash,
      full_name = EXCLUDED.full_name,
      role = 'system_admin',
      department = EXCLUDED.department,
      is_admin_granted_by_super_admin = TRUE,
      is_active = TRUE,
      updated_at = CURRENT_TIMESTAMP
    RETURNING id, email, role, is_active
  `;

  console.log(`Super administrator enabled: ${user.email} (${user.role})`);
} finally {
  await sql.end();
}
