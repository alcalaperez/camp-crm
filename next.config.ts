import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // better-sqlite3 è un modulo nativo — permette di copiarlo nel container
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
