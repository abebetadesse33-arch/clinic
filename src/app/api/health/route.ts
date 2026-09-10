// Force Edge runtime so this route stays decoupled from the Node.js DB adapter.
// It will respond even when the database is unreachable, making it a pure
// availability signal for deployment health checks.
export const runtime = "edge";

export function GET() {
  return Response.json({
    status: "ok",
    service: "ninimed",
    version: process.env.NEXT_PUBLIC_APP_VERSION ?? "unknown",
    timestamp: new Date().toISOString(),
  });
}
