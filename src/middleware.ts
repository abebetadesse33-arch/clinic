import { NextRequest, NextResponse } from "next/server";

const HEALTH_PREFIX = "/health";
const INTERNAL_REWRITE_HEADER = "x-wisdomcourse-internal-rewrite";

const appHosts: Record<string, string> = {
  "/school": "https://school.wisdomcourse.com.et",
  "/feud": "https://feud.wisdomcourse.com.et",
  "/paraphrase": "https://paraphrase.wisdomcourse.com.et",
  "/wa": "https://app.wisdomcourse.com.et",
};

// ─── API default-deny ────────────────────────────────────────────────────────
// Every /api/v1 request must carry a session cookie unless it is on one of the
// public lists below. This is a coarse first gate (the Edge runtime cannot query
// the session table); each route handler still verifies the session and role.

const SESSION_COOKIE_NAME = "Nini_session";

/** Reachable without a session, any method. Secrets/tokens are checked by the routes themselves. */
const PUBLIC_API_ANY = [
  "/api/v1/auth/signin",
  "/api/v1/auth/signup",
  "/api/v1/auth/signout",
  "/api/v1/auth/me",
  "/api/v1/auth/send-otp",
  "/api/v1/auth/verify-otp",
  "/api/v1/auth/verify-national-id",
  "/api/v1/auth/qr-login/create",
  "/api/v1/auth/qr-login/status",
  "/api/v1/public",
  "/api/v1/system/health",
  "/api/v1/system/ready",
  "/api/v1/fhir/smart-configuration",
  "/api/v1/telegram/webhook",
  "/api/v1/telegram/miniapp/auth",
  "/api/v1/notifications/reminder-cron",
  "/api/v1/patient/shared-record",
  "/api/v1/patients/register-with-triage",
  "/api/v1/treat-me-now",
  "/api/v1/providers/available",
];

/** Public website content: readable without a session, writable only with one. */
const PUBLIC_API_GET = [
  "/api/v1/landing-sections",
  "/api/v1/navigation",
  "/api/v1/translations",
  "/api/v1/tabs",
  "/api/v1/content",
  "/api/v1/forms",
  "/api/v1/service-pricing",
];

/** Paired waiting-room TVs carry a display token instead of a session; the route validates it. */
const DISPLAY_TOKEN_API = "/api/v1/display/waiting-room";

function matchesPrefix(path: string, prefixes: string[]): boolean {
  return prefixes.some((p) => path === p || path.startsWith(`${p}/`));
}

/** "/health/api/v1/x/" and "/api/v1/x" both map to "/api/v1/x"; non-API paths return null. */
function toApiPath(pathname: string): string | null {
  const p = pathname.startsWith(`${HEALTH_PREFIX}/api/`) ? pathname.slice(HEALTH_PREFIX.length) : pathname;
  if (!p.startsWith("/api/")) return null;
  return p.replace(/\/+$/, "") || "/";
}

function hasSessionCookie(request: NextRequest): boolean {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  return Boolean(token && token.length >= 32 && token.length <= 128);
}

function guardApi(request: NextRequest, apiPath: string): NextResponse | null {
  if (!apiPath.startsWith("/api/v1/")) return null;
  const method = request.method.toUpperCase();
  if (method === "OPTIONS") return null;
  if (matchesPrefix(apiPath, PUBLIC_API_ANY)) return null;
  if ((method === "GET" || method === "HEAD") && matchesPrefix(apiPath, PUBLIC_API_GET)) return null;
  if (hasSessionCookie(request)) return null;
  if (
    matchesPrefix(apiPath, [DISPLAY_TOKEN_API]) &&
    (request.nextUrl.searchParams.get("token") || request.headers.get("x-display-token"))
  ) {
    return null;
  }
  return NextResponse.json(
    { success: false, error: "Unauthorized: sign in to access this resource." },
    { status: 401, headers: { "Cache-Control": "no-store" } }
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Checked before the internal-rewrite bypass below so a client cannot skip it
  // by sending that header itself.
  const apiPath = toApiPath(pathname);
  if (apiPath) {
    const denied = guardApi(request, apiPath);
    if (denied) return denied;
  }

  // Prevent public-path redirects from running again on an internal rewrite.
  if (request.headers.get(INTERNAL_REWRITE_HEADER) === "1") {
    return NextResponse.next();
  }

  // 1. Direct API routes and health checks must never be redirected to /health
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // 2. Trailing-slash normalization for /health
  if (pathname === HEALTH_PREFIX) {
    const url = request.nextUrl.clone();
    url.pathname = `${HEALTH_PREFIX}/`;
    return NextResponse.redirect(url);
  }

  // 3. /health/api/ routes: allow /health/api/health directly, rewrite all other /health/api/v1/ to /api/
  if (pathname.startsWith(`${HEALTH_PREFIX}/api/`)) {
    if (pathname === `${HEALTH_PREFIX}/api/health` || pathname === `${HEALTH_PREFIX}/api/health/`) {
      return NextResponse.next();
    }
    const internalPath = pathname.slice(HEALTH_PREFIX.length);
    const url = request.nextUrl.clone();
    url.pathname = internalPath;
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(INTERNAL_REWRITE_HEADER, "1");
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  }

  // 4. /health/ or /health/<path> rewrites to internal application pages
  if (pathname === `${HEALTH_PREFIX}/` || pathname.startsWith(`${HEALTH_PREFIX}/`)) {
    const internalPath = pathname.slice(HEALTH_PREFIX.length) || "/";
    const url = request.nextUrl.clone();
    url.pathname = internalPath === "/" ? "/ninimed-home" : internalPath;
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(INTERNAL_REWRITE_HEADER, "1");
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  }

  // 5. External portal services redirect to their subdomains
  for (const [prefix, host] of Object.entries(appHosts)) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      const url = new URL(`${host}${pathname.slice(prefix.length) || "/"}`);
      url.search = request.nextUrl.search;
      return NextResponse.redirect(url);
    }
  }

  // 6. Wisdom Course Portal homepage
  if (pathname === "/") {
    return NextResponse.next();
  }

  // 7. If someone accesses /ninimed-home directly, redirect to /health/
  if (pathname === "/ninimed-home" || pathname === "/ninimed-home/") {
    const url = request.nextUrl.clone();
    url.pathname = `${HEALTH_PREFIX}/`;
    return NextResponse.redirect(url);
  }

  // 8. Redirect all other direct NiniMed page routes to /health/...
  const url = request.nextUrl.clone();
  url.pathname = `${HEALTH_PREFIX}${pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|manifest\\.webmanifest|sw\\.js|icons/|icon\\.svg).*)",
  ],
};
