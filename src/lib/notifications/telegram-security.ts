import { createHmac, timingSafeEqual } from "crypto";

/**
 * Trust boundaries for the Telegram integration. Everything here derives its
 * keys from TELEGRAM_BOT_TOKEN, so no extra secret has to be provisioned: if
 * the bot is configured at all, these are configured too.
 */

export function getBotToken(): string | null {
  return process.env.TELEGRAM_BOT_TOKEN || null;
}

function derive(label: string, token: string): Buffer {
  return createHmac("sha256", token).update(label).digest();
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

// ─── Webhook authenticity ────────────────────────────────────────────────────

/**
 * Value registered as `secret_token` with setWebhook. Telegram echoes it back
 * in the X-Telegram-Bot-Api-Secret-Token header on every update, which is the
 * only way to tell a real update from a forged POST to a public URL.
 * (Telegram allows 1-256 chars of [A-Za-z0-9_-]; hex qualifies.)
 */
export function getWebhookSecret(): string | null {
  const token = getBotToken();
  return token ? derive("ninimed-telegram-webhook-v1", token).toString("hex") : null;
}

export function verifyWebhookSecret(headerValue: string | null): boolean {
  const expected = getWebhookSecret();
  return Boolean(expected && headerValue && safeEqual(headerValue, expected));
}

// ─── Account-link tokens (/start <token>) ────────────────────────────────────

/**
 * Telegram caps a /start payload at 64 characters of [A-Za-z0-9_-]. The old
 * unsigned base64 JSON token was ~92 characters (Telegram drops it, so linking
 * could never work) and, being unsigned, could be forged for any userId to
 * subscribe an attacker's chat to a victim's clinical notifications.
 *
 * Fixed-width layout, 45 chars: userId (16 bytes, base64url, 22) ‖ expiry
 * (unix seconds, base36 zero-padded, 7) ‖ truncated HMAC (12 bytes, 16).
 */
const LINK_TTL_MS = 60 * 60 * 1000;
const LINK_TOKEN_RE = /^[A-Za-z0-9_-]{45}$/;

function linkMac(token: string, payload: string): string {
  return createHmac("sha256", derive("ninimed-telegram-link-v1", token))
    .update(payload)
    .digest()
    .subarray(0, 12)
    .toString("base64url");
}

export function createLinkToken(userId: string, now: number = Date.now()): string | null {
  const botToken = getBotToken();
  const hex = userId.replace(/-/g, "");
  if (!botToken || !/^[0-9a-f]{32}$/i.test(hex)) return null;

  const id = Buffer.from(hex, "hex").toString("base64url");
  const exp = Math.floor((now + LINK_TTL_MS) / 1000).toString(36).padStart(7, "0");
  return `${id}${exp}${linkMac(botToken, `${id}${exp}`)}`;
}

/** Returns the userId the token was issued for, or null if invalid/expired/forged. */
export function verifyLinkToken(raw: string, now: number = Date.now()): string | null {
  const botToken = getBotToken();
  if (!botToken || !LINK_TOKEN_RE.test(raw)) return null;

  const id = raw.slice(0, 22);
  const exp = raw.slice(22, 29);
  const sig = raw.slice(29);
  if (!safeEqual(sig, linkMac(botToken, `${id}${exp}`))) return null;

  const expSeconds = parseInt(exp, 36);
  if (!Number.isFinite(expSeconds) || expSeconds * 1000 < now) return null;

  const hex = Buffer.from(id, "base64url").toString("hex");
  if (hex.length !== 32) return null;
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// ─── Mini App identity (Telegram.WebApp.initData) ────────────────────────────

export interface MiniAppIdentity {
  telegramUserId: string;
  firstName?: string;
  username?: string;
  authDate: number;
}

/**
 * Validates `initData` per https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 * The client can put anything in the page, so identity is only trusted once
 * the HMAC (keyed from the bot token) checks out and the data is fresh.
 */
export function verifyMiniAppInitData(
  initData: string,
  maxAgeSeconds: number = 24 * 60 * 60,
  now: number = Date.now()
): MiniAppIdentity | null {
  const botToken = getBotToken();
  if (!botToken || !initData || initData.length > 4096) return null;

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const computed = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  if (!safeEqual(computed, hash.toLowerCase())) return null;

  const authDate = Number(params.get("auth_date"));
  if (!Number.isFinite(authDate)) return null;
  if (now / 1000 - authDate > maxAgeSeconds) return null;
  if (authDate * 1000 > now + 60_000) return null; // future-dated

  let user: any;
  try {
    user = JSON.parse(params.get("user") || "");
  } catch {
    return null;
  }
  if (!user || typeof user.id !== "number") return null;

  return {
    telegramUserId: String(user.id),
    firstName: typeof user.first_name === "string" ? user.first_name : undefined,
    username: typeof user.username === "string" ? user.username : undefined,
    authDate,
  };
}

// ─── Public base URL ─────────────────────────────────────────────────────────

/**
 * Telegram only accepts https web_app URLs, so a wrong base URL doesn't just
 * produce a bad link — the whole message fails. Prefer the configured URL;
 * if it's missing (or not https) derive it from the request Telegram made.
 */
export function resolveBaseUrl(req?: { headers: { get(name: string): string | null } }): string {
  const configured = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/+$/, "");
  if (/^https:\/\//i.test(configured)) return configured;

  const host = req?.headers.get("x-forwarded-host") || req?.headers.get("host");
  if (host) {
    const isLocal = /^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(host);
    const proto = req?.headers.get("x-forwarded-proto")?.split(",")[0].trim() || (isLocal ? "http" : "https");
    return `${proto}://${host}`;
  }
  return configured || "http://localhost:3000";
}
