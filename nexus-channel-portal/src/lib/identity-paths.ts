import path from "node:path";

export const COOKIE_SID = "nexus_portal_sid";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type IdentityKind = "guest" | "account";

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function assertSafeId(id: string): string {
  if (!isUuid(id)) {
    throw new Error("identity id tidak valid");
  }
  return id.toLowerCase();
}

export function orderCodeFromId(id: string): string {
  return `ORDER-${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

export function defaultDataDir(): string {
  return process.env.NEXUS_PORTAL_DATA_DIR?.trim() || path.join(process.cwd(), "data");
}

export function identitiesPath(dataDir = defaultDataDir()): string {
  return path.join(dataDir, "portal-identities.json");
}

export function ledgerPathFor(kind: IdentityKind, id: string, dataDir = defaultDataDir()): string {
  const safe = assertSafeId(id);
  const name = kind === "guest" ? `kredit-guest-${safe}.json` : `kredit-account-${safe}.json`;
  return path.join(dataDir, name);
}

export function walletIdFor(kind: IdentityKind, id: string): string {
  return `${kind}:${assertSafeId(id)}`;
}
