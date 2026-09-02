import { isLabFaucetEnabled, getKreditSnapshot } from "./kredit-ledger.ts";
import { danaPayInfo, listPendingTopups, proofWaNumber } from "./kredit-topup.ts";
import { ledgerFileFor, publicIdentity, type PortalIdentity } from "./portal-identity.ts";

export async function kreditClientView(identity: PortalIdentity) {
  const snapshot = await getKreditSnapshot(ledgerFileFor(identity));
  const pendingTopups = await listPendingTopups(identity.walletId);
  const dana = danaPayInfo();
  return {
    ok: true as const,
    ...snapshot,
    walletId: identity.walletId,
    ...publicIdentity(identity),
    pendingTopups,
    faucetEnabled: isLabFaucetEnabled(),
    proofWa: proofWaNumber(),
    danaNumber: dana.number,
    danaLabel: dana.label,
  };
}
