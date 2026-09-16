const rawUrl = process.env.HEALTHCHECK_URL;
// Allow insecure TLS if explicitly enabled, if NODE_TLS_REJECT_UNAUTHORIZED=0, or default to true unless explicitly "false"
const allowInsecureTls =
  process.env.HEALTHCHECK_INSECURE_TLS !== "false" ||
  process.env.NODE_TLS_REJECT_UNAUTHORIZED === "0";

export {};

if (!rawUrl) {
  console.error("HEALTHCHECK_URL is required.");
  process.exit(1);
}

// Normalize double slashes in URL (e.g. https://domain.com//api/health -> https://domain.com/api/health)
const healthcheckUrl = rawUrl.replace(/([^:]\/)\/+/g, "$1");

if (allowInsecureTls) {
  // Process-wide setting required for Bun's fetch to ignore TLS errors on redirects & socket renegotiation
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

const controller = new AbortController();
// Give the app 20 s to respond
const timeout = setTimeout(() => controller.abort(), 20_000);

// Bun ignores NODE_TLS_REJECT_UNAUTHORIZED in some fetch signatures; pass tls option as well.
const fetchOptions: RequestInit & { tls?: { rejectUnauthorized?: boolean } } = {
  signal: controller.signal,
  headers: { Accept: "application/json, text/plain" },
};
if (allowInsecureTls) {
  fetchOptions.tls = { rejectUnauthorized: false };
}

let failed = false;
try {
  const response = await fetch(healthcheckUrl, fetchOptions);
  const body = await response.text();

  if (!response.ok) {
    throw new Error(
      `Health check returned HTTP ${response.status}: ${body.slice(0, 500)}`
    );
  }

  // When set, confirm the live server is actually running the commit this
  // pipeline just built — a plain 200 only proves *some* process answered,
  // which is also true of a stale Passenger process nothing ever restarted.
  const expectedShaFull = process.env.EXPECTED_BUILD_SHA;
  if (expectedShaFull) {
    const expectedSha = expectedShaFull.slice(0, 12);
    let liveSha = "unknown";
    try {
      liveSha = (JSON.parse(body)?.buildSha as string) ?? "unknown";
    } catch {}
    if (liveSha !== expectedSha) {
      throw new Error(
        `Live server is running build "${liveSha}", expected "${expectedSha}". ` +
          `The deployment step likely reported success without the running process ` +
          `actually picking up the new code (check Plesk Git deployment log / Passenger restart).`
      );
    }
    console.log(`Build verified live: ${liveSha}`);
  }

  console.log(`Health check passed: HTTP ${response.status} ${body.slice(0, 300)}`);
} catch (error) {
  console.error(
    "Health check failed:",
    error instanceof Error ? error.message : error
  );
  failed = true;
} finally {
  clearTimeout(timeout);
}

// Use process.exit() so Bun flushes stdout/stderr before the process ends.
process.exit(failed ? 1 : 0);

