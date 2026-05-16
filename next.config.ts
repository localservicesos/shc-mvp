import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Job photos are capped at 10MB by the storage bucket; allow some
      // multipart overhead.
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
