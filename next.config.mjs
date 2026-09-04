/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  env: {
    NEXT_PUBLIC_APP_NAME: "NiniMed Enterprise CDSS",
    NEXT_PUBLIC_APP_VERSION: "3.0.0-enterprise",
  },
};

export default nextConfig;

