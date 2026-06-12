import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Job photos are capped at 10MB by the storage bucket; allow some
      // multipart overhead.
      bodySizeLimit: "12mb",
    },
    // Client Router Cache: re-visiting a dynamic page within 30s renders the
    // cached copy instantly instead of re-querying the server. Safe here
    // because every server action revalidates its paths after a write, which
    // purges this cache — the 30s window only applies to untouched data.
    staleTimes: {
      dynamic: 30,
    },
  },
};

export default nextConfig;
