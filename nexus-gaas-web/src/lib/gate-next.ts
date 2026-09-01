/** Internal redirect after gate / login. Reject open redirects. */

const AUTH_PREFIXES = ["/gate", "/masuk", "/daftar", "/api"];

export function safeInternalNext(raw: string | null | undefined): string {
  if (!raw) return "/";
  const value = raw.trim();
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("://")) {
    return "/";
  }
  if (AUTH_PREFIXES.some((p) => value === p || value.startsWith(`${p}/`) || value.startsWith(`${p}?`))) {
    return "/";
  }
  return value;
}
