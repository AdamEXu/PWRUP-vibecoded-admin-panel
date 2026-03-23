import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const turbopackRoot = fileURLToPath(new URL("../..", import.meta.url));

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@pwrup/shared-core", "@pwrup/shared-proto", "@pwrup/shared-ui"],
  devIndicators: false,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  turbopack: {
    root: turbopackRoot,
  },
};

export default nextConfig;
