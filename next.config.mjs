import { execSync } from "node:child_process";

// Stamps every build with the exact commit it was built from, so a deployed
// server can be asked "which commit are you actually running?" instead of
// only "are you running" (a plain 200 from /api/health cannot tell a fresh
// deploy apart from a Passenger process that never picked up the new code).
function resolveBuildSha() {
  const fromEnv = process.env.NEXT_PUBLIC_BUILD_SHA || process.env.GITHUB_SHA;
  if (fromEnv) return fromEnv.slice(0, 12);
  try {
    return execSync("git rev-parse HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim()
      .slice(0, 12);
  } catch {
    return "unknown";
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  env: {
    NEXT_PUBLIC_APP_NAME: "NiniMed Enterprise CDSS",
    NEXT_PUBLIC_APP_VERSION: "3.0.0-enterprise",
    NEXT_PUBLIC_BUILD_SHA: resolveBuildSha(),
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
  async redirects() {
    return [
      // /system-admin is an alias that was circulating in bookmarks and
      // external links — redirect permanently to the real admin dashboard.
      {
        source: "/system-admin",
        destination: "/admin",
        permanent: true,
      },
      // /system-admin/:path* deep links (e.g. /system-admin/users)
      {
        source: "/system-admin/:path*",
        destination: "/admin/:path*",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        // Next.js content-hashed build assets never change under a given name.
        source: "/_next/static/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/icons/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
    ];
  },
};

export default nextConfig;


