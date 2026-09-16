// Decoupled from the database adapter so this route returns a pure
// availability signal for deployment health checks under Node.js / Passenger.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({
    status: "ok",
    service: "ninimed",
    version: process.env.NEXT_PUBLIC_APP_VERSION ?? "unknown",
    timestamp: new Date().toISOString(),
  });
}
