import type { NextConfig } from "next";

/** Lab: proxy SOC API same-origin → control plane :8081 (hindari CORS login gagal). */
const CONTROL_PLANE =
  process.env.NEXUS_CONTROL_PLANE_URL?.replace(/\/$/, "") || "http://127.0.0.1:8081";

const nextConfig: NextConfig = {
  async rewrites() {
    // fallback = hanya jika App Router route (/api/jobs, /api/gaas, …) tidak menangani path
    return {
      fallback: [
        {
          source: "/api/:path*",
          destination: `${CONTROL_PLANE}/api/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
