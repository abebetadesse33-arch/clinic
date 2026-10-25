import { NextRequest, NextResponse } from "next/server";

const HEALTH_PREFIX = "/health";

const appHosts: Record<string, string> = {
  "/school": "https://school.wisdomcourse.com.et",
  "/feud": "https://feud.wisdomcourse.com.et",
  "/paraphrase": "https://paraphrase.wisdomcourse.com.et",
  "/wa": "https://app.wisdomcourse.com.et",
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === HEALTH_PREFIX) {
    const url = new URL(request.url);
    url.pathname = `${HEALTH_PREFIX}/`;
    return NextResponse.redirect(url);
  }

  if (pathname === HEALTH_PREFIX || pathname.startsWith(`${HEALTH_PREFIX}/`)) {
    const internalPath = pathname.slice(HEALTH_PREFIX.length) || "/";
    const url = new URL(request.url);
    url.pathname = internalPath === "/" ? "/ninimed-home" : internalPath;
    return NextResponse.rewrite(url);
  }

  for (const [prefix, host] of Object.entries(appHosts)) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      const url = new URL(`${host}${pathname.slice(prefix.length) || "/"}`);
      url.search = request.nextUrl.search;
      return NextResponse.redirect(url);
    }
  }

  if (pathname !== "/") {
    const url = new URL(request.url);
    url.pathname = `${HEALTH_PREFIX}${pathname}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
