import type { IdentityKind, PortalIdentity } from "./portal-identity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type PortalOwnerQuery = {
  ownerId: string;
  ownerKind: IdentityKind;
  ownerEmail: string;
  extraOwnerIds: string[];
};

export type OwnedSiteCard = {
  slug: string;
  businessName: string;
  vercelUrl: string;
  published: boolean;
  createdAt: string;
};

export type ManifestOwnerFields = {
  portal_owner_id?: string;
  portal_owner_kind?: string;
  portal_owner_email?: string;
  email?: string;
  whatsapp?: string;
};

export function normalizeOwnerId(value: string | undefined | null): string {
  const text = (value || "").trim().toLowerCase();
  return UUID_RE.test(text) ? text : "";
}

export function identityOwnerQuery(identity: PortalIdentity): PortalOwnerQuery {
  const ownerId =
    identity.kind === "account" ? identity.accountId || "" : identity.guestId || identity.sid;
  return {
    ownerId: normalizeOwnerId(ownerId),
    ownerKind: identity.kind,
    ownerEmail: (identity.email || "").trim().toLowerCase(),
    extraOwnerIds: (identity.formerGuestIds || []).map(normalizeOwnerId).filter(Boolean),
  };
}

/** Portal owner fields only — never SiteManifest.email / WhatsApp. Unowned = false. */
export function siteOwnedBy(manifest: ManifestOwnerFields, query: PortalOwnerQuery): boolean {
  const storedId = normalizeOwnerId(manifest.portal_owner_id);
  const storedEmail = (manifest.portal_owner_email || "").trim().toLowerCase();
  if (!storedId && !storedEmail) {
    return false;
  }
  if (storedId && query.ownerId && storedId === query.ownerId) {
    return true;
  }
  if (storedId && query.extraOwnerIds.includes(storedId)) {
    return true;
  }
  if (query.ownerKind === "account" && storedEmail && query.ownerEmail && storedEmail === query.ownerEmail) {
    return true;
  }
  return false;
}

export function filterOwnedCards(
  rows: Array<OwnedSiteCard & ManifestOwnerFields>,
  query: PortalOwnerQuery,
): OwnedSiteCard[] {
  return rows.filter((row) => siteOwnedBy(row, query)).map((row) => ({
    slug: row.slug,
    businessName: row.businessName,
    vercelUrl: row.vercelUrl,
    published: row.published,
    createdAt: row.createdAt,
  }));
}

export function stampGenerateOwner(form: FormData, query: PortalOwnerQuery): void {
  form.delete("portal_owner_id");
  form.delete("portal_owner_kind");
  form.delete("portal_owner_email");
  form.set("portal_owner_id", query.ownerId);
  form.set("portal_owner_kind", query.ownerKind);
  if (query.ownerEmail) {
    form.set("portal_owner_email", query.ownerEmail);
  }
}

export function mapWizardOwnedRow(raw: Record<string, unknown>): OwnedSiteCard | null {
  const slug = typeof raw.slug === "string" ? raw.slug.trim().toLowerCase() : "";
  if (!/^[a-z0-9-]{1,48}$/.test(slug)) {
    return null;
  }
  const vercelUrl = typeof raw.vercel_url === "string" ? raw.vercel_url.trim() : "";
  const businessName = typeof raw.business_name === "string" ? raw.business_name.trim() : slug;
  const createdAt = typeof raw.created_at === "string" ? raw.created_at : "";
  return {
    slug,
    businessName,
    vercelUrl,
    published: Boolean(raw.published) || Boolean(vercelUrl),
    createdAt,
  };
}
