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
const normalizedRawUrl = rawUrl.replace(/([^:]\/)\/+/g, "$1");

if (allowInsecureTls) {
  // Process-wide setting required for Bun's fetch to ignore TLS errors on redirects & socket renegotiation
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

// Build candidate health URLs to ensure checks succeed regardless of path prefixing (/api/health or /health/api/health) or trailing slashes
const candidateUrls: string[] = [normalizedRawUrl];
if (normalizedRawUrl.includes("/health/api/health")) {
  candidateUrls.push(normalizedRawUrl.replace("/health/api/health", "/api/health"));
} else if (normalizedRawUrl.includes("/api/health")) {
  candidateUrls.push(normalizedRawUrl.replace("/api/health", "/health/api/health"));
}

const allCandidateUrls = [
  ...new Set(
    candidateUrls.flatMap((u) => [u, u.endsWith("/") ? u.slice(0, -1) : `${u}/`])
  ),
];

async function tryFetchUrl(url: string, fetchOptions: RequestInit) {
  const response = await fetch(url, fetchOptions);
  const body = await response.text();
  return { response, body };
}

async function run() {
  const controller = new AbortController();
  // Give the app 20 s to respond
  const timeout = setTimeout(() => controller.abort(), 20_000);

  // Bun ignores NODE_TLS_REJECT_UNAUTHORIZED in some fetch signatures; pass tls option as well.
  const fetchOptions: RequestInit & { tls?: { rejectUnauthorized?: boolean } } = {
    signal: controller.signal,
    headers: { Accept: "application/json, text/plain" },
    redirect: "follow",
  };
  if (allowInsecureTls) {
    fetchOptions.tls = { rejectUnauthorized: false };
  }

  try {
    let lastError: Error | null = null;
    let succeeded = false;

    for (const targetUrl of allCandidateUrls) {
      try {
        const { response, body } = await tryFetchUrl(targetUrl, fetchOptions);

        if (!response.ok) {
          lastError = new Error(
            `Health check returned HTTP ${response.status}: ${body.slice(0, 500)}`
          );
          continue;
        }

        // When set, confirm the live server is actually running the commit this
        // pipeline just built — a plain 200 only proves *some* process answered,
        // which is also true of a stale Passenger process nothing ever restarted.
        const expectedShaFull = process.env.EXPECTED_BUILD_SHA;
        if (expectedShaFull) {
          const expectedSha = expectedShaFull.slice(0, 12);
          let liveSha = "unknown";
          let liveTime = "unknown";
          try {
            const parsed = JSON.parse(body);
            liveSha = (parsed?.buildSha as string) ?? "unknown";
            liveTime = (parsed?.buildTime as string) ?? "unknown";
          } catch {}
          if (liveSha !== expectedSha) {
            throw new Error(
              `Live server is running build "${liveSha}" (built: ${liveTime}), expected "${expectedSha}". ` +
                `The deployment step likely reported success without the running process ` +
                `actually picking up the new code (check Plesk Git deployment log / Passenger restart).`
            );
          }
          console.log(`Build verified live: ${liveSha} (${liveTime}) via ${targetUrl}`);
        }

        console.log(`Health check passed: HTTP ${response.status} via ${targetUrl} ${body.slice(0, 300)}`);
        succeeded = true;
        break;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }

    if (!succeeded && lastError) {
      throw lastError;
    }
  } finally {
    clearTimeout(timeout);
  }
}

run()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(
      "Health check failed:",
      error instanceof Error ? error.message : error
    );
    process.exit(1);
  });
