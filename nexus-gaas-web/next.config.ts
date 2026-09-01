import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  serverExternalPackages: ["nodemailer"],
  experimental: {
    proxyClientMaxBodySize: "6mb",
  },
};

export default nextConfig;
