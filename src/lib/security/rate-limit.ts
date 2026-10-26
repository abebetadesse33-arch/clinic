import { NextRequest, NextResponse } from "next/server";

/**
 * Fixed-window, in-memory rate limiter.
 *
 * State lives in the Node process, which matches the single Passenger/standalone
 * process this app is deployed as. If it is ever scaled to several instances,
 * swap the `hits` map for a shared store (Redis) behind the same `rateLimit` API.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const hits = new Map<string, Bucket>();
const MAX_TRACKED_KEYS = 50_000;

function sweep(now: number) {
  for (const [key, bucket] of hits) {
    if (bucket.resetAt <= now) hits.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

/** Counts one hit against `key`; `allowed` is false once `limit` is exceeded inside `windowMs`. */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  if (hits.size > MAX_TRACKED_KEYS) sweep(now);

  const bucket = hits.get(key);
  if (!bucket || bucket.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

/** Clears a key, e.g. after a successful sign-in so legitimate users are not penalised. */
export function resetRateLimit(key: string) {
  hits.delete(key);
}

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return (forwarded ? forwarded.split(",")[0] : req.headers.get("x-real-ip") || "").trim() || "unknown";
}

/**
 * Applies every `[key, limit, windowMs]` rule and returns a 429 response for the
 * first one that is exceeded, or null when the request may proceed.
 */
export function enforceRateLimit(
  scope: string,
  rules: Array<{ key: string; limit: number; windowMs: number }>
): NextResponse | null {
  for (const rule of rules) {
    const result = rateLimit(`${scope}:${rule.key}`, rule.limit, rule.windowMs);
    if (!result.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many attempts. Please wait before trying again." },
        { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } }
      );
    }
  }
  return null;
}
