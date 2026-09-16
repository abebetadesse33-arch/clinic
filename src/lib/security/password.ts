import { createHash, randomBytes, scrypt, timingSafeEqual } from "crypto";

/**
 * Password hashing built on Node's native scrypt (no external dependency).
 *
 * Stored format:  scrypt$<N>$<r>$<p>$<salt-base64url>$<key-base64url>
 *
 * Legacy support: accounts created before this module stored an unsalted
 * SHA-256 hex digest. Those still verify, but `needsRehash` is reported so the
 * caller can transparently upgrade the stored hash on the next successful login.
 */

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

const LEGACY_SHA256_HEX = /^[0-9a-f]{64}$/i;

function scryptAsync(password: string, salt: Buffer, N: number, r: number, p: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, { N, r, p, maxmem: 256 * N * r }, (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  if (typeof password !== "string" || password.length === 0) {
    throw new Error("Password must be a non-empty string.");
  }
  const salt = randomBytes(SALT_LENGTH);
  const key = await scryptAsync(password, salt, SCRYPT_N, SCRYPT_R, SCRYPT_P);
  return ["scrypt", SCRYPT_N, SCRYPT_R, SCRYPT_P, salt.toString("base64url"), key.toString("base64url")].join("$");
}

export interface PasswordVerification {
  ok: boolean;
  /** true when the stored hash uses a legacy/weaker scheme and should be replaced. */
  needsRehash: boolean;
}

export async function verifyPassword(password: string, storedHash: string | null | undefined): Promise<PasswordVerification> {
  if (typeof password !== "string" || !storedHash) {
    return { ok: false, needsRehash: false };
  }

  if (storedHash.startsWith("scrypt$")) {
    const parts = storedHash.split("$");
    if (parts.length !== 6) return { ok: false, needsRehash: false };
    const N = Number(parts[1]);
    const r = Number(parts[2]);
    const p = Number(parts[3]);
    const salt = Buffer.from(parts[4], "base64url");
    const expected = Buffer.from(parts[5], "base64url");
    if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p) || expected.length === 0) {
      return { ok: false, needsRehash: false };
    }
    const actual = await scryptAsync(password, salt, N, r, p);
    const ok = actual.length === expected.length && timingSafeEqual(actual, expected);
    const needsRehash = ok && (N !== SCRYPT_N || r !== SCRYPT_R || p !== SCRYPT_P);
    return { ok, needsRehash };
  }

  if (LEGACY_SHA256_HEX.test(storedHash)) {
    const actual = createHash("sha256").update(password, "utf8").digest();
    const expected = Buffer.from(storedHash, "hex");
    const ok = actual.length === expected.length && timingSafeEqual(actual, expected);
    return { ok, needsRehash: ok };
  }

  return { ok: false, needsRehash: false };
}
