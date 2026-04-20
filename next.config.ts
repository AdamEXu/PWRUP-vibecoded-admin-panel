// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produce a minimal server bundle for Docker/runtime deployments.
  output: "standalone",
};

export default nextConfig;
