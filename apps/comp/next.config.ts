import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@pwrup/shared-core", "@pwrup/shared-proto", "@pwrup/shared-ui"],
  devIndicators: false,
};

export default nextConfig;
