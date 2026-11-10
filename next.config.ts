import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets a second server (e.g. a test build) use its own folder so it never
  // overwrites the files of a dev server that is already running.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
