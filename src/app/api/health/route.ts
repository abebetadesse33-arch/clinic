// Decoupled from the database adapter so this route returns a pure
// availability signal for deployment health checks under Node.js / Passenger.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({
    status: "ok",
    service: "ninimed",
    version: process.env.NEXT_PUBLIC_APP_VERSION ?? "unknown",
    // Lets a deploy pipeline (or a human) confirm the running process is the
    // one just built, instead of a still-old Passenger process that happens
    // to answer requests. See scripts/healthcheck.ts EXPECTED_BUILD_SHA.
    buildSha: process.env.NEXT_PUBLIC_BUILD_SHA ?? "unknown",
    buildTime: process.env.NEXT_PUBLIC_BUILD_TIME ?? "unknown",
    timestamp: new Date().toISOString(),
  });
}
