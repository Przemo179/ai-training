import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse", "tesseract.js"],
  },
};

export default nextConfig;
