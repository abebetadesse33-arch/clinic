const healthcheckUrl = process.env.HEALTHCHECK_URL;
const allowInsecureTls = process.env.HEALTHCHECK_INSECURE_TLS === "true";

export {};

if (!healthcheckUrl) {
  console.error("HEALTHCHECK_URL is required.");
  process.exit(1);
}

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 15_000);
const previousTlsSetting = process.env.NODE_TLS_REJECT_UNAUTHORIZED;

if (allowInsecureTls) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

try {
  const response = await fetch(healthcheckUrl, {
    signal: controller.signal,
    headers: { Accept: "application/json, text/plain" },
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Health check returned HTTP ${response.status}: ${body.slice(0, 500)}`);
  }

  console.log(`Health check passed: HTTP ${response.status} ${body.slice(0, 300)}`);
} catch (error) {
  console.error("Health check failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  if (previousTlsSetting === undefined) {
    delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  } else {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = previousTlsSetting;
  }
  clearTimeout(timeout);
}
