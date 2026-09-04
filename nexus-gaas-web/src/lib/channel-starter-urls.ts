/** Channel Starter wizard :3010 — internal (Node on the PC) vs public (browser). */

import { isVercelRuntime } from "./runtime-host.ts";

const DEFAULT_INTERNAL = "http://127.0.0.1:3010";
const DEFAULT_PUBLIC_PATH = "/starter";

export function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

export function isLoopbackHttpOrigin(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    return host === "127.0.0.1" || host === "localhost" || host === "::1";
  } catch {
    return false;
  }
}

/** Server-side generate / Next rewrite target. Never use NEXT_PUBLIC_* here. */
export function channelStarterInternalUrl(
  env: NodeJS.Dict<string | undefined> = process.env,
): string {
  const raw = env.CHANNEL_STARTER_URL?.trim();
  if (isVercelRuntime(env)) {
    if (raw && !isLoopbackHttpOrigin(raw)) {
      return stripTrailingSlash(raw);
    }
    return "";
  }
  return stripTrailingSlash(raw || DEFAULT_INTERNAL);
}

/**
 * Browser preview / wizard links.
 * Default `/starter` so a tunnel to the portal (:3003) can GET-proxy wizard UI + preview to :3010.
 * Lab override: CHANNEL_STARTER_PUBLIC_URL=http://127.0.0.1:3010
 */
export function channelStarterPublicBase(
  env: NodeJS.Dict<string | undefined> = process.env,
): string {
  const explicit = env.CHANNEL_STARTER_PUBLIC_URL?.trim() || env.NEXT_PUBLIC_CHANNEL_STARTER_URL?.trim();
  if (explicit) {
    return stripTrailingSlash(explicit);
  }
  return DEFAULT_PUBLIC_PATH;
}

export function channelStarterPreviewUrl(
  slug: string,
  env: NodeJS.Dict<string | undefined> = process.env,
): string {
  return `${channelStarterPublicBase(env)}/preview/${slug}`;
}

/** Wizard mutate: tepi only. Never attach create_loop (Cowork is a separate SKU). */
export function channelStarterUpsellEnableUrl(base: string, slug: string): string {
  const origin = stripTrailingSlash(base);
  return `${origin}/upsell/${encodeURIComponent(slug)}/enable?tier=tepi`;
}
