/**
 * Nexus SOC OS Configuration
 *
 * Development: SOC APIs on localhost:8081 (public WAF stays on :8080).
 * Production (Caddy :3001): same-origin relative URLs; session cookie after login.
 */

const IS_PROD = process.env.NODE_ENV === "production";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (IS_PROD ? "" : "http://localhost:8081");

export function gatewayURL(path: string): string {
  const base = API_BASE_URL.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
