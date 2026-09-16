import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The floating badge overlaps the pipeline bar in the bottom-left corner.
  devIndicators: false,
  /* config options here */
  reactCompiler: true,
};

export default nextConfig;
