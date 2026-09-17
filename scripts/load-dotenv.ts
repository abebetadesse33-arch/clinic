/**
 * Minimal, dependency-free .env loader for the one-off migration scripts.
 *
 * Plesk's Node.js "Environment Variables" panel setting is only injected
 * into the actual Passenger-managed app process; it does NOT propagate to
 * "NPM install" / "Run script" invocations or the Git deploy hook shell
 * (confirmed: DATABASE_URL is unset in both). Those standalone scripts
 * need their own values, so load a physical .env file directly, mirroring
 * scripts/server-prelude.js's approach for the main app.
 */
import fs from "fs";
import path from "path";

export function loadDotEnv(): void {
  const candidates = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), ".env.production"),
    path.resolve(__dirname, "..", ".env"),
  ];

  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    const lines = fs.readFileSync(file, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
    break;
  }
}
