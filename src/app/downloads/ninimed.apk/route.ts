import { NextResponse } from "next/server";

/**
 * /downloads/ninimed.apk — redirect to the download page.
 *
 * Once a real APK is available, replace the redirect with:
 *   return NextResponse.redirect("https://cdn.example.com/ninimed.apk");
 * or place the file at public/downloads/ninimed.apk and remove this handler.
 */
export async function GET() {
  return NextResponse.redirect(
    new URL("/downloads", process.env.NEXT_PUBLIC_APP_URL || "https://www.wisdomcourse.com.et"),
    { status: 302 }
  );
}
