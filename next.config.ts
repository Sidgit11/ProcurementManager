import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent Next.js/Turbopack from bundling PGlite — it uses import.meta.url
  // and WASM file loading that only works with native Node.js imports.
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
