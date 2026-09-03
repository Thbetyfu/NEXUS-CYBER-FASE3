import type { NextConfig } from "next";
import { channelStarterInternalUrl, isLoopbackHttpOrigin } from "./src/lib/channel-starter-urls";
import { channelStarterPublicRewrites } from "./src/lib/starter-public-rewrites";

const publicHost = process.env.NEXUS_PORTAL_PUBLIC_HOST?.trim().replace(/^https?:\/\//, "");
const starterInternal = channelStarterInternalUrl();

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    "*.trycloudflare.com",
    ...(publicHost ? [publicHost] : []),
  ],
  serverExternalPackages: ["nodemailer"],
  experimental: {
    proxyClientMaxBodySize: "6mb",
  },
  async rewrites() {
    if (!isLoopbackHttpOrigin(starterInternal)) {
      return [];
    }
    return channelStarterPublicRewrites(starterInternal);
  },
};

export default nextConfig;
