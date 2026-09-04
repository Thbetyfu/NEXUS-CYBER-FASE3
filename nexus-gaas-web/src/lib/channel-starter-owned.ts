import { channelStarterInternalUrl } from "./channel-starter-urls.ts";
import {
  identityOwnerQuery,
  mapWizardOwnedRow,
  type OwnedSiteCard,
} from "./portal-site-owner.ts";
import type { PortalIdentity } from "./portal-identity.ts";

export async function wizardListOwned(identity: PortalIdentity): Promise<{
  sites: OwnedSiteCard[];
  error?: string;
  status: number;
}> {
  const base = channelStarterInternalUrl();
  if (!base) {
    return {
      sites: [],
      status: 503,
      error: "Daftar situs hanya di PC wizard. Portal Vercel adalah etalase.",
    };
  }
  const query = identityOwnerQuery(identity);
  if (!query.ownerId) {
    return { sites: [], status: 401, error: "Sesi diperlukan" };
  }
  try {
    const res = await fetch(`${base}/sites/owned`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        owner_id: query.ownerId,
        owner_kind: query.ownerKind,
        owner_email: query.ownerEmail,
        extra_owner_ids: query.extraOwnerIds,
      }),
    });
    if (!res.ok) {
      return { sites: [], status: 502, error: "Channel Starter :3010 menolak daftar situs" };
    }
    const payload = (await res.json()) as { sites?: Record<string, unknown>[] };
    const sites = (payload.sites || [])
      .map((row) => mapWizardOwnedRow(row))
      .filter((row): row is OwnedSiteCard => row != null);
    return { sites, status: 200 };
  } catch {
    return {
      sites: [],
      status: 502,
      error: "Channel Starter :3010 tidak hidup. Nyalakan python cli.py serve.",
    };
  }
}

export async function wizardReassignGuestSites(
  fromGuestId: string,
  toAccountId: string,
  toEmail: string,
): Promise<void> {
  const base = channelStarterInternalUrl();
  if (!base) {
    return;
  }
  try {
    await fetch(`${base}/sites/reassign`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        from_guest_id: fromGuestId,
        to_account_id: toAccountId,
        to_email: toEmail,
      }),
    });
  } catch {
    /* wizard down: formerGuestIds still match guest-owned manifests */
  }
}
