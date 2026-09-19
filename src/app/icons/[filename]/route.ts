import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

/**
 * Fallback route handler for /icons/[filename]
 *
 * When Next.js is running in standalone mode on Plesk/Passenger the static
 * file middleware may not serve `public/icons/` correctly depending on how
 * Passenger maps the request root. This handler guarantees that icon requests
 * always succeed by reading the file from disk and streaming it back with the
 * correct Content-Type header, regardless of the static-assets configuration.
 */
export async function GET(
  _req: Request,
  { params }: { params: { filename: string } }
) {
  const { filename } = params;

  // Only allow .svg, .png, .webp, .ico to prevent path traversal
  if (!/^[\w\-]+\.(svg|png|webp|ico)$/.test(filename)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // Try public/icons/ (both standalone and normal Next.js setups)
  const candidates = [
    path.join(process.cwd(), "public", "icons", filename),
    path.join(process.cwd(), "..", "public", "icons", filename),
  ];

  for (const candidate of candidates) {
    try {
      const buffer = fs.readFileSync(candidate);
      const ext = path.extname(filename).toLowerCase();
      const contentType =
        ext === ".svg"
          ? "image/svg+xml"
          : ext === ".png"
          ? "image/png"
          : ext === ".webp"
          ? "image/webp"
          : "image/x-icon";

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        },
      });
    } catch {
      // try next candidate
    }
  }

  return new NextResponse("Not Found", { status: 404 });
}
