import { existsSync, readFileSync } from "node:fs";
import { assertSafeId, defaultDataDir, identitiesPath, orderCodeFromId, type IdentityKind } from "./identity-paths.ts";

export type OperatorParty = {
  email: string | null;
  orderCode: string;
  identityId: string;
};

type IdentityFile = {
  version?: number;
  accounts?: { id?: string; email?: string }[];
};

/** Email akun dari portal-identities (tanpa hash). Tamu = ORDER dari id. Panggil di dalam withLock. */
export function lookupOperatorPartyUnlocked(
  kind: IdentityKind,
  identityId: string,
  dataDir = defaultDataDir(),
): OperatorParty {
  const id = assertSafeId(identityId);
  const orderCode = orderCodeFromId(id);
  if (kind !== "account") {
    return { email: null, orderCode, identityId: id };
  }
  const filePath = identitiesPath(dataDir);
  if (!existsSync(filePath)) {
    return { email: null, orderCode, identityId: id };
  }
  const parsed = JSON.parse(readFileSync(filePath, "utf8")) as IdentityFile;
  const account = Array.isArray(parsed.accounts) ? parsed.accounts.find((row) => row.id === id) : undefined;
  const email = typeof account?.email === "string" ? account.email : null;
  return { email, orderCode, identityId: id };
}
