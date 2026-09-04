import { channelStarterInternalUrl } from "./channel-starter-urls.ts";
import {
  identityOwnerQuery,
  mapWizardOwnedRow,
  type OwnedSiteCard,
  type PortalOwnerQuery,
} from "./portal-site-owner.ts";
import type { PortalIdentity } from "./portal-identity.ts";

export const MSG_SITES_VERCEL =
  "Daftar situs hanya di PC wizard. Portal Vercel adalah etalase.";
export const MSG_SITES_DOWN =
  "Channel Starter :3010 tidak hidup. Nyalakan python cli.py serve.";
export const MSG_SITES_STALE =
  "Wizard :3010 terlalu lama (POST /sites/owned tidak ada). Restart python cli.py serve setelah pull.";
export const MSG_SITES_REJECT = "Channel Starter :3010 menolak daftar situs";
export const MSG_CLAIM_STALE =
  "Wizard :3010 terlalu lama (POST /sites/claim tidak ada). Restart python cli.py serve setelah pull.";
export const MSG_CLAIM_UNKNOWN = "Slug tidak ada di wizard ini.";
export const MSG_CLAIM_TAKEN = "Slug sudah dimiliki orang lain.";
export const MSG_CLAIM_INVALID = "Slug atau sesi tidak valid.";
export const MSG_CLAIM_RESERVED = "Slug demo tidak diklaim.";
export const MSG_CLAIM_DOWN = "Channel Starter :3010 tidak hidup. Nyalakan python cli.py serve.";

const SLUG = /^[a-z0-9-]{1,48}$/;

export type ClaimOutcome =
  | "claimed"
  | "already_yours"
  | "owned_by_other"
  | "not_found"
  | "invalid"
  | "reserved";

export function normalizeClaimSlug(raw: string): string {
  const slug = raw.trim().toLowerCase();
  return SLUG.test(slug) ? slug : "";
}

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

/** Map wizard claim HTTP. 404 without outcome = stale endpoint, not unknown slug. */
export function claimSitesHttpResult(opts: {
  internalUrl: string;
  ownerId: string;
  slug: string;
  upstreamStatus?: number;
  outcome?: string;
  networkError?: boolean;
}): { status: number; error?: string; outcome?: ClaimOutcome } {
  if (!opts.internalUrl) {
    return { status: 503, error: MSG_SITES_VERCEL };
  }
  if (!opts.ownerId) {
    return { status: 401, error: "Sesi diperlukan" };
  }
  if (!normalizeClaimSlug(opts.slug)) {
    return { status: 400, error: MSG_CLAIM_INVALID, outcome: "invalid" };
  }
  if (opts.networkError) {
    return { status: 502, error: MSG_CLAIM_DOWN };
  }
  if (opts.upstreamStatus == null) {
    return { status: 200 };
  }
  const code = opts.upstreamStatus;
  const outcome = opts.outcome as ClaimOutcome | undefined;
  if (code === 200 && (outcome === "claimed" || outcome === "already_yours" || outcome == null)) {
    return { status: 200, outcome: outcome === "already_yours" ? "already_yours" : "claimed" };
  }
  if (code === 404 && outcome === "not_found") {
    return { status: 404, error: MSG_CLAIM_UNKNOWN, outcome: "not_found" };
  }
  if (code === 409 && outcome === "owned_by_other") {
    return { status: 409, error: MSG_CLAIM_TAKEN, outcome: "owned_by_other" };
  }
  if (code === 403 && (outcome === "owned_by_other" || outcome == null)) {
    return { status: 409, error: MSG_CLAIM_TAKEN, outcome: "owned_by_other" };
  }
  if (code === 409 && outcome === "reserved") {
    return { status: 409, error: MSG_CLAIM_RESERVED, outcome: "reserved" };
  }
  if (code === 400) {
    return { status: 400, error: MSG_CLAIM_INVALID, outcome: "invalid" };
  }
  if (code === 404 || code === 405) {
    return { status: 503, error: MSG_CLAIM_STALE };
  }
  return { status: 502, error: MSG_SITES_REJECT };
}

async function postWizardClaim(
  slug: string,
  query: PortalOwnerQuery,
): Promise<{
  site: OwnedSiteCard | null;
  error?: string;
  status: number;
  outcome?: ClaimOutcome;
}> {
  const base = channelStarterInternalUrl();
  const gated = claimSitesHttpResult({
    internalUrl: base,
    ownerId: query.ownerId,
    slug,
  });
  if (gated.status !== 200 || !base) {
    return { site: null, ...gated };
  }
  try {
    const res = await fetch(`${base}/sites/claim`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        slug,
        owner_id: query.ownerId,
        owner_kind: query.ownerKind,
        owner_email: query.ownerEmail,
        extra_owner_ids: query.extraOwnerIds,
      }),
    });
    const payload = (await res.json().catch(() => ({}))) as {
      outcome?: string;
      error?: string;
      site?: Record<string, unknown>;
    };
    const mapped = claimSitesHttpResult({
      internalUrl: base,
      ownerId: query.ownerId,
      slug,
      upstreamStatus: res.status,
      outcome: payload.outcome,
    });
    if (mapped.status !== 200) {
      return { site: null, ...mapped };
    }
    return {
      site: payload.site ? mapWizardOwnedRow(payload.site) : null,
      status: 200,
      outcome: mapped.outcome,
    };
  } catch {
    return {
      site: null,
      ...claimSitesHttpResult({
        internalUrl: base,
        ownerId: query.ownerId,
        slug,
        networkError: true,
      }),
    };
  }
}

export async function wizardClaimSite(
  identity: PortalIdentity,
  slugRaw: string,
): Promise<{
  site: OwnedSiteCard | null;
  error?: string;
  status: number;
  outcome?: ClaimOutcome;
}> {
  return postWizardClaim(normalizeClaimSlug(slugRaw), identityOwnerQuery(identity));
}

export async function wizardListUnowned(): Promise<{
  sites: OwnedSiteCard[];
  error?: string;
  status: number;
}> {
  const base = channelStarterInternalUrl();
  if (!base) {
    return { sites: [], status: 503, error: MSG_SITES_VERCEL };
  }
  try {
    const res = await fetch(`${base}/sites/unowned`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (res.status === 404 || res.status === 405) {
      return { sites: [], status: 503, error: MSG_CLAIM_STALE };
    }
    if (!res.ok) {
      return { sites: [], status: 502, error: MSG_SITES_REJECT };
    }
    const payload = (await res.json()) as { sites?: Record<string, unknown>[] };
    const sites = (payload.sites || [])
      .map((row) => mapWizardOwnedRow(row))
      .filter((row): row is OwnedSiteCard => row != null);
    return { sites, status: 200 };
  } catch {
    return { sites: [], status: 502, error: MSG_SITES_DOWN };
  }
}

export async function wizardAttachUnowned(
  slugRaw: string,
  query: PortalOwnerQuery,
): Promise<{
  site: OwnedSiteCard | null;
  error?: string;
  status: number;
  outcome?: ClaimOutcome;
}> {
  return postWizardClaim(normalizeClaimSlug(slugRaw), query);
}

/** Only slugs already noted on this identity's Starter debit. Never the whole disk. */
export async function wizardAutoClaimPaidSlugs(
  identity: PortalIdentity,
  paidSlugs: string[],
): Promise<void> {
  for (const slug of paidSlugs) {
    const token = normalizeClaimSlug(slug);
    if (!token) {
      continue;
    }
    const result = await wizardClaimSite(identity, token);
    if (result.status === 503 || result.status === 502) {
      return;
    }
  }
}
