/**
 * NiniMed Enterprise — Gemini REST API Key-Pool Client
 *
 * Features:
 *  • Round-robin / failover across GEMINI_API_KEY_1 … GEMINI_API_KEY_3
 *  • Per-key 60-second cooldown on 429 responses
 *  • Retries on 429 / 5xx only; fails-fast on 400 / 403 / 404
 *  • Structured console logs: key index, attempt count, latency
 *  • Pure fetch() — no SDK dependency
 *  • Server-side only — keys never reach the client
 */

const GEMINI_REST_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent";

const COOLDOWN_MS = 60_000; // 60 s per failed key

// ─── Key Pool ─────────────────────────────────────────────────────────────────
function loadKeyPool(): string[] {
  const keys = [
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    // Legacy single-key fallback for backwards compatibility
    process.env.GEMINI_API_KEY,
  ]
    .filter((k): k is string => !!k && k.trim().length > 0)
    .map((k) => k.trim());

  // Deduplicate (in case the same key is set under multiple env names)
  return Array.from(new Set(keys));
}

// ─── In-memory cooldown tracker ───────────────────────────────────────────────
const _cooldownUntil: Record<number, number> = {};

function isKeyCooling(index: number): boolean {
  return Date.now() < (_cooldownUntil[index] ?? 0);
}

function coolKey(index: number): void {
  _cooldownUntil[index] = Date.now() + COOLDOWN_MS;
  console.warn(
    `[GeminiPool] 🔴 Key #${index + 1} rate-limited — cooling for ${COOLDOWN_MS / 1000}s`
  );
}

// ─── Round-robin state ────────────────────────────────────────────────────────
let _nextKeyIndex = 0;

// ─── Request payload builder ──────────────────────────────────────────────────
export interface GeminiRestRequest {
  /** Raw prompt text or pre-built contents array */
  prompt?: string;
  contents?: Array<{ role: string; parts: Array<{ text: string }> }>;
  systemInstruction?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

function buildPayload(req: GeminiRestRequest): object {
  const contents =
    req.contents ??
    (req.prompt ? [{ role: "user", parts: [{ text: req.prompt }] }] : []);

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: req.temperature ?? 0.3,
      topP: 0.9,
      maxOutputTokens: req.maxOutputTokens ?? 8192,
    },
  };

  if (req.systemInstruction) {
    body.systemInstruction = { parts: [{ text: req.systemInstruction }] };
  }

  return body;
}

// ─── Main call function ───────────────────────────────────────────────────────
export interface GeminiRestResponse {
  text: string;
  keyIndexUsed: number;
  attemptsUsed: number;
  latencyMs: number;
}

/**
 * Call the Gemini REST API with automatic failover across the key pool.
 *
 * @throws Error if all keys are exhausted or all returned non-retryable errors.
 */
export async function callGeminiRest(
  req: GeminiRestRequest
): Promise<GeminiRestResponse> {
  const keys = loadKeyPool();

  if (keys.length === 0) {
    throw new Error(
      "[GeminiPool] No API keys configured. Set GEMINI_API_KEY_1 in your .env file."
    );
  }

  const payload = buildPayload(req);
  const startTime = Date.now();
  let attemptsUsed = 0;

  for (let offset = 0; offset < keys.length; offset++) {
    const index = (_nextKeyIndex + offset) % keys.length;

    // Skip keys in cooldown
    if (isKeyCooling(index)) {
      console.info(
        `[GeminiPool] ⏭  Key #${index + 1} is cooling — skipping`
      );
      continue;
    }

    attemptsUsed += 1;
    const key = keys[index];
    const url = `${GEMINI_REST_URL}?key=${encodeURIComponent(key)}`;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        // Next.js server-side fetch — disable caching for live AI calls
        cache: "no-store",
      });

      // ── Success ───────────────────────────────────────────────────────────
      if (res.ok) {
        const data = await res.json();
        const text: string =
          data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

        if (!text) {
          throw new Error("[GeminiPool] Empty candidate text in response");
        }

        // Advance round-robin pointer so next call starts from the next key
        _nextKeyIndex = (index + 1) % keys.length;

        const latencyMs = Date.now() - startTime;
        console.info(
          `[GeminiPool] ✅ Key #${index + 1} succeeded in ${latencyMs}ms (attempt ${attemptsUsed}/${keys.length})`
        );

        return { text, keyIndexUsed: index, attemptsUsed, latencyMs };
      }

      // ── Retryable errors — try next key ───────────────────────────────────
      if (res.status === 429 || res.status >= 500) {
        const body = await res.text().catch(() => "");
        console.warn(
          `[GeminiPool] ⚠️  Key #${index + 1} → HTTP ${res.status}. Reason: ${body.slice(0, 120)}`
        );
        if (res.status === 429) coolKey(index);
        continue; // try next key
      }

      // ── Non-retryable errors — stop immediately ───────────────────────────
      const body = await res.text().catch(() => "");
      console.error(
        `[GeminiPool] ❌ Key #${index + 1} → Non-retryable HTTP ${res.status}: ${body.slice(0, 200)}`
      );
      throw new Error(
        `Gemini REST API returned non-retryable status ${res.status}`
      );
    } catch (err: unknown) {
      // Network-level errors (DNS, timeout, ECONNRESET) — try next key
      if (
        err instanceof Error &&
        !err.message.startsWith("Gemini REST API returned non-retryable")
      ) {
        console.warn(
          `[GeminiPool] ⚠️  Key #${index + 1} → Network error: ${err.message}`
        );
        continue;
      }
      throw err; // Re-throw non-retryable HTTP errors
    }
  }

  // All keys exhausted
  const latencyMs = Date.now() - startTime;
  throw new Error(
    `[GeminiPool] All ${keys.length} API key(s) are unavailable (attempts: ${attemptsUsed}, elapsed: ${latencyMs}ms). Service overloaded.`
  );
}

// ─── Pool diagnostics (for /api/v1/system/health) ────────────────────────────
export interface KeyPoolStatus {
  totalKeys: number;
  availableKeys: number;
  coolingKeys: number;
  cooldownState: Array<{ keyIndex: number; coolsInMs: number }>;
}

export function getKeyPoolStatus(): KeyPoolStatus {
  const keys = loadKeyPool();
  const now = Date.now();

  const cooldownState = Object.entries(_cooldownUntil)
    .filter(([, until]) => now < until)
    .map(([idx, until]) => ({ keyIndex: Number(idx), coolsInMs: until - now }));

  return {
    totalKeys: keys.length,
    availableKeys: keys.length - cooldownState.length,
    coolingKeys: cooldownState.length,
    cooldownState,
  };
}
