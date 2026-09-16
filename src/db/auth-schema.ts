import type postgres from "postgres";

/**
 * Minimal, idempotent DDL that the authentication flow depends on.
 *
 * This is deliberately kept separate from the large schema block in
 * migrate-and-seed.ts: that block runs as a single statement batch, so one
 * failure anywhere in it silently skips everything after it. Login must not
 * depend on that. Each statement here is executed on its own.
 */
export const AUTH_SCHEMA_STATEMENTS: readonly string[] = [
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS national_id TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin_granted_by_super_admin BOOLEAN DEFAULT FALSE NOT NULL`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE NOT NULL`,
  `CREATE TABLE IF NOT EXISTS auth_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      ip_address TEXT,
      user_agent TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS auth_sessions_user_id_idx ON auth_sessions(user_id)`,
  `CREATE INDEX IF NOT EXISTS auth_sessions_expires_at_idx ON auth_sessions(expires_at)`,
];

/** Run the auth DDL with a raw postgres-js client (used by migrations/seeding). */
export async function ensureAuthSchemaWithClient(client: postgres.Sql): Promise<void> {
  for (const statement of AUTH_SCHEMA_STATEMENTS) {
    await client.unsafe(statement);
  }
}
