import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  srcDir: "./src",
  reactCompiler: true,
  images: {
    remotePatterns: [],
    unoptimized: false,
  },
};

export default nextConfig;
