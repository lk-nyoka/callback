import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Files read at runtime with fs must be bundled into the serverless functions.
  outputFileTracingIncludes: {
    "/api/demo": ["./data/demo/**/*"],
    "/api/discover": ["./data/demo/**/*"],
    "/api/watch": ["./data/demo/**/*"],
    "/api/cron/watch": ["./data/demo/**/*"],
  },
};

export default nextConfig;
