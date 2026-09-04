import { channelStarterInternalUrl } from "./channel-starter-urls.ts";
import {
  identityOwnerQuery,
  mapWizardOwnedRow,
  type OwnedSiteCard,
} from "./portal-site-owner.ts";
import type { PortalIdentity } from "./portal-identity.ts";

export const MSG_SITES_VERCEL =
  "Daftar situs hanya di PC wizard. Portal Vercel adalah etalase.";
export const MSG_SITES_DOWN =
  "Channel Starter :3010 tidak hidup. Nyalakan python cli.py serve.";
export const MSG_SITES_STALE =
  "Wizard :3010 terlalu lama (POST /sites/owned tidak ada). Restart python cli.py serve setelah pull.";
export const MSG_SITES_REJECT = "Channel Starter :3010 menolak daftar situs";

/** Map wizard URL / upstream HTTP to portal list status. 503 = cannot list (not empty). */
export function ownedSitesHttpResult(opts: {
  internalUrl: string;
  ownerId: string;
  upstreamStatus?: number;
  networkError?: boolean;
}): { status: number; error?: string } {
  if (!opts.internalUrl) {
    return { status: 503, error: MSG_SITES_VERCEL };
  }
  if (!opts.ownerId) {
    return { status: 401, error: "Sesi diperlukan" };
  }
  if (opts.networkError) {
    return { status: 502, error: MSG_SITES_DOWN };
  }
  if (opts.upstreamStatus == null) {
    return { status: 200 };
  }
  const code = opts.upstreamStatus;
  if (code === 200) {
    return { status: 200 };
  }
  if (code === 404 || code === 405) {
    return { status: 503, error: MSG_SITES_STALE };
  }
  return { status: 502, error: MSG_SITES_REJECT };
}

export function ownedSitesOperatorDetail(upstreamStatus: number): string {
  return `upstream POST /sites/owned → ${upstreamStatus}`;
}

export async function wizardListOwned(identity: PortalIdentity): Promise<{
  sites: OwnedSiteCard[];
  error?: string;
  status: number;
  operatorDetail?: string;
}> {
  const base = channelStarterInternalUrl();
  const query = identityOwnerQuery(identity);
  const gated = ownedSitesHttpResult({ internalUrl: base, ownerId: query.ownerId });
  if (gated.status !== 200 || !base) {
    return { sites: [], ...gated };
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
    const mapped = ownedSitesHttpResult({
      internalUrl: base,
      ownerId: query.ownerId,
      upstreamStatus: res.status,
    });
    if (mapped.status !== 200) {
      return {
        sites: [],
        ...mapped,
        operatorDetail: ownedSitesOperatorDetail(res.status),
      };
    }
    const payload = (await res.json()) as { sites?: Record<string, unknown>[] };
    const sites = (payload.sites || [])
      .map((row) => mapWizardOwnedRow(row))
      .filter((row): row is OwnedSiteCard => row != null);
    return { sites, status: 200 };
  } catch {
    return {
      sites: [],
      ...ownedSitesHttpResult({
        internalUrl: base,
        ownerId: query.ownerId,
        networkError: true,
      }),
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
