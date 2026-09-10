const healthcheckUrl = process.env.HEALTHCHECK_URL;

export {};

if (!healthcheckUrl) {
  console.error("HEALTHCHECK_URL is required.");
  process.exit(1);
}

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 15_000);

try {
  const response = await fetch(healthcheckUrl, {
    signal: controller.signal,
    headers: { Accept: "application/json, text/plain" },
  });

  if (!response.ok) {
    throw new Error(`Health check returned HTTP ${response.status}.`);
  }

  console.log(`Health check passed: HTTP ${response.status}`);
} catch (error) {
  console.error("Health check failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  clearTimeout(timeout);
}
