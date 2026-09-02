import { existsSync, readFileSync } from "node:fs";
import { assertSafeId, defaultDataDir, identitiesPath, orderCodeFromId, type IdentityKind } from "./identity-paths.ts";

export type OperatorParty = {
  email: string | null;
  displayName: string | null;
  orderCode: string;
  identityId: string;
};

type IdentityFile = {
  version?: number;
  accounts?: { id?: string; email?: string; name?: string; displayName?: string }[];
};

function optionalText(value: string | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Email/nama akun dari portal-identities (tanpa hash). Tamu = ORDER dari id. Panggil di dalam withLock. */
export function lookupOperatorPartyUnlocked(
  kind: IdentityKind,
  identityId: string,
  dataDir = defaultDataDir(),
): OperatorParty {
  const id = assertSafeId(identityId);
  const orderCode = orderCodeFromId(id);
  if (kind !== "account") {
    return { email: null, displayName: null, orderCode, identityId: id };
  }
  const filePath = identitiesPath(dataDir);
  if (!existsSync(filePath)) {
    return { email: null, displayName: null, orderCode, identityId: id };
  }
  let parsed: IdentityFile;
  try {
    parsed = JSON.parse(readFileSync(filePath, "utf8")) as IdentityFile;
  } catch {
    return { email: null, displayName: null, orderCode, identityId: id };
  }
  const account = Array.isArray(parsed.accounts)
    ? parsed.accounts.find((row) => typeof row.id === "string" && row.id.toLowerCase() === id)
    : undefined;
  return {
    email: optionalText(account?.email),
    displayName: optionalText(account?.displayName) ?? optionalText(account?.name),
    orderCode,
    identityId: id,
  };
}
