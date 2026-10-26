import { NextRequest, NextResponse } from "next/server";

const HEALTH_PREFIX = "/health";
const INTERNAL_REWRITE_HEADER = "x-wisdomcourse-internal-rewrite";

const appHosts: Record<string, string> = {
  "/school": "https://school.wisdomcourse.com.et",
  "/feud": "https://feud.wisdomcourse.com.et",
  "/paraphrase": "https://paraphrase.wisdomcourse.com.et",
  "/wa": "https://app.wisdomcourse.com.et",
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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

  // 5. External portal services redirect to their subdomains. Disabled with
  // NINIMED_LEGACY_APP_REDIRECTS=false where the web server routes these
  // prefixes itself (service.echat.et).
  const legacyRedirects = process.env.NINIMED_LEGACY_APP_REDIRECTS !== "false";
  for (const [prefix, host] of legacyRedirects ? Object.entries(appHosts) : []) {
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
