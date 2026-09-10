const healthcheckUrl = process.env.HEALTHCHECK_URL;
const allowInsecureTls = process.env.HEALTHCHECK_INSECURE_TLS === "true";

export {};

if (!healthcheckUrl) {
  console.error("HEALTHCHECK_URL is required.");
  process.exit(1);
}

const controller = new AbortController();
// Give the app 20 s to respond (was 15 s)
const timeout = setTimeout(() => controller.abort(), 20_000);

// Bun ignores NODE_TLS_REJECT_UNAUTHORIZED; we must pass tls options directly.
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

