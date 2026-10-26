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
    // Keep every candidate's outcome. Reporting only the last one hid a stale build
    // behind a harmless 404 from a later fallback URL.
    const failures: string[] = [];
    let succeeded = false;
    const brief = (text: string) => text.replace(/\s+/g, " ").slice(0, 400);

    for (const targetUrl of allCandidateUrls) {
      try {
        const { response, body } = await tryFetchUrl(targetUrl, fetchOptions);

        if (!response.ok) {
          failures.push(`${targetUrl} -> HTTP ${response.status}: ${brief(body)}`);
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
          // Builds made by Plesk's own Git deployment have no .git directory, so they
          // cannot report a commit and say "unknown". That is still proof of a fresh
          // deploy when the build was produced after this deployment started, so accept
          // it then; an older "unknown" build (a stale process) is still rejected.
          const startedAtMs = Date.parse(process.env.DEPLOY_STARTED_AT || "");
          const builtAtMs = Date.parse(liveTime);
          const freshUnknownBuild =
            liveSha === "unknown" && !Number.isNaN(startedAtMs) && !Number.isNaN(builtAtMs) && builtAtMs >= startedAtMs;

          if (liveSha !== expectedSha && !freshUnknownBuild) {
            throw new Error(
              `Live server is running build "${liveSha}" (built: ${liveTime}), expected "${expectedSha}". ` +
                `The deployment step likely reported success without the running process ` +
                `actually picking up the new code (check Plesk Git deployment log / Passenger restart).`
            );
          }
          if (freshUnknownBuild && liveSha !== expectedSha) {
            console.log(
              `Fresh build verified by build time (commit unknown to the server): built ${liveTime}, ` +
                `deployment started ${process.env.DEPLOY_STARTED_AT} via ${targetUrl}`
            );
          } else {
            console.log(`Build verified live: ${liveSha} (${liveTime}) via ${targetUrl}`);
          }
        }

        console.log(`Health check passed: HTTP ${response.status} via ${targetUrl} ${body.slice(0, 300)}`);
        succeeded = true;
        break;
      } catch (err) {
        failures.push(`${targetUrl} -> ${brief(err instanceof Error ? err.message : String(err))}`);
      }
    }

    if (!succeeded) {
      throw new Error(
        `no health URL passed (${failures.length} tried):\n  - ${failures.join("\n  - ")}`
      );
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
