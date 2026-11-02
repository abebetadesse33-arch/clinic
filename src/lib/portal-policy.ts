import { readFileSync, statSync } from "node:fs";

// The registration rules the super administrator sets in the portal (a small JSON file shared by the
// combined deployment). Without PORTAL_POLICY_FILE, which is the case when this app runs on its own,
// patients register as before and are signed in at once.
let cached: { mtime: number; selfRegistration: boolean } | null = null;

export type RegistrationMode = "immediate" | "approval" | "closed";

export function registrationMode(): RegistrationMode {
  const file = process.env.PORTAL_POLICY_FILE;
  if (!file) return "immediate";
  try {
    const mtime = statSync(file).mtimeMs;
    if (cached?.mtime !== mtime) {
      const parsed = JSON.parse(readFileSync(file, "utf8")) as { selfRegistration?: unknown };
      cached = { mtime, selfRegistration: parsed.selfRegistration !== false };
    }
    return cached.selfRegistration ? "approval" : "closed";
  } catch {
    return "approval"; // no policy file yet: open, with approval
  }
}

/** Set in the user's department while a registration waits (see gateway/approvals.js). */
export const PENDING_APPROVAL = "pending_approval";
export const REGISTRATION_REJECTED = "registration_rejected";
