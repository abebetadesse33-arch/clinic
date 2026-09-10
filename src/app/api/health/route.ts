export function GET() {
  return Response.json({
    status: "ok",
    service: "ninimed",
    version: process.env.NEXT_PUBLIC_APP_VERSION ?? "unknown",
  });
}
