import crypto from "crypto";

// ============================================================================
// ENTERPRISE E2EE & FIELD-LEVEL ENCRYPTION UTILITIES
// ============================================================================

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // Standard 96-bit IV for AES-GCM
const AUTH_TAG_LENGTH = 16; // 128-bit authentication tag

// Master Key Derivation: In production, derive from KMS secret / env var
function getMasterKey(): Buffer {
  const secret = process.env.ENCRYPTION_MASTER_KEY || "NiniMed_Enterprise_Secret_Key_2026_Prod_Env_Salt";
  return crypto.createHash("sha256").update(secret).digest();
}

export interface EncryptedPayload {
  ciphertext: string; // Base64
  iv: string;         // Base64
  authTag: string;    // Base64
  keyVersion: number;
  algorithm: string;
}

/**
 * Encrypt sensitive plain text field with AES-256-GCM
 */
export function encryptSensitiveField(plaintext: string, context?: { keyVersion?: number }): EncryptedPayload {
  const key = getMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");

  const authTag = cipher.getAuthTag();

  return {
    ciphertext: encrypted,
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    keyVersion: context?.keyVersion || 1,
    algorithm: "AES-256-GCM",
  };
}

/**
 * Decrypt sensitive field with authentication verification
 */
export function decryptSensitiveField(payload: EncryptedPayload): { success: boolean; plaintext?: string; error?: string } {
  try {
    const key = getMasterKey();
    const iv = Buffer.from(payload.iv, "base64");
    const authTag = Buffer.from(payload.authTag, "base64");
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(payload.ciphertext, "base64", "utf8");
    decrypted += decipher.final("utf8");

    return { success: true, plaintext: decrypted };
  } catch (err: any) {
    return { success: false, error: `Decryption failed or integrity compromised: ${err?.message}` };
  }
}

/**
 * Mask sensitive PII data for non-privileged viewers
 */
export function maskSensitiveData(data: string, type: "mrn" | "national_id" | "phone" | "clinical_note"): string {
  if (!data) return "";
  switch (type) {
    case "mrn":
      return data.length > 4 ? `MRN-***${data.slice(-4)}` : "MRN-****";
    case "national_id":
      return data.length > 4 ? `ID-******${data.slice(-4)}` : "ID-******";
    case "phone":
      return data.length > 6 ? `${data.slice(0, 4)}***${data.slice(-3)}` : "***-***";
    case "clinical_note":
      return "[ENCRYPTED CLINICAL RECORD - PRIVILEGED ACCESS REQUIRED]";
    default:
      return "******";
  }
}

// ============================================================================
// TAMPER-EVIDENT AUDIT HASH CHAINING (HMAC-SHA256)
// ============================================================================

export interface AuditEntryData {
  actorUserId: string;
  actorRole: string;
  actionType: string;
  targetResourceType: string;
  targetResourceId?: string;
  details?: Record<string, any>;
  timestamp: string;
}

/**
 * Computes an immutable SHA-256 HMAC entry hash linked to the previous log entry's hash
 */
export function generateAuditEntryHash(entry: AuditEntryData, previousEntryHash?: string | null): string {
  const secret = process.env.AUDIT_HMAC_SECRET || "NiniMed_Audit_HMAC_Chaining_Key_2026";
  const canonicalString = [
    previousEntryHash || "GENESIS_BLOCK_00000000000000000000000000000000",
    entry.actorUserId,
    entry.actorRole,
    entry.actionType,
    entry.targetResourceType,
    entry.targetResourceId || "NULL",
    JSON.stringify(entry.details || {}),
    entry.timestamp,
  ].join("|");

  return crypto.createHmac("sha256", secret).update(canonicalString).digest("hex");
}

/**
 * Verifies whether an audit trail chain is intact or has been tampered with
 */
export function verifyAuditChainIntegrity(
  entries: Array<AuditEntryData & { entryHash: string; previousEntryHash?: string | null }>
): { isValid: boolean; brokenAtEntryIndex?: number } {
  for (let i = 0; i < entries.length; i++) {
    const current = entries[i];
    const prevHash = i > 0 ? entries[i - 1].entryHash : (current.previousEntryHash || null);
    const expectedHash = generateAuditEntryHash(current, prevHash);

    if (current.entryHash !== expectedHash) {
      return { isValid: false, brokenAtEntryIndex: i };
    }
  }
  return { isValid: true };
}
