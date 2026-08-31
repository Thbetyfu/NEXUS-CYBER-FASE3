/**
 * Nexus SOC OS Configuration
 *
 * Development: same-origin `/api/*` di-rewrite ke control plane :8081 (next.config).
 * Override: NEXT_PUBLIC_API_URL=http://127.0.0.1:8081 (cross-origin; butuh CORS).
 */

const IS_PROD = process.env.NODE_ENV === "production";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL !== undefined
    ? process.env.NEXT_PUBLIC_API_URL
    : IS_PROD
      ? ""
      : "";

export function gatewayURL(path: string): string {
  const base = API_BASE_URL.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
