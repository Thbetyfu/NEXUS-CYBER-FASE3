/** Paths that skip `nexus_portal_sid`. Storefront (hub/segmen/pesan/kredit) still uses /gate. */

const AUTH_PAGES = new Set(["/gate", "/masuk", "/daftar"]);

function stripTrailingSlash(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.replace(/\/+$/, "");
  }
  return pathname;
}

/**
 * Channel Starter funnel — any UMKM slug, not only bu-grace.
 * Public: GET wizard UI + GET preview. Not generate/publish/upsell/sites, /operator, or topup APIs.
 * Caddy/Next must not catch-all proxy /starter/* — this helper is middleware only.
 */
export function isPortalPublicPath(pathname: string): boolean {
  if (AUTH_PAGES.has(pathname)) {
    return true;
  }
  const path = stripTrailingSlash(pathname);
  if (path === "/starter") {
    return true;
  }
  if (path === "/starter/preview") {
    return true;
  }
  return /^\/starter\/preview\/[a-z0-9-]+$/i.test(path);
}
