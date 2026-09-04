"""Session-scoped site ownership — not a public catalog, not WhatsApp of others."""

from __future__ import annotations

import re
from typing import Any

from channel_starter.generator import get_manifest, list_sites, save_manifest
from channel_starter.types import SiteManifest

_UUID = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
    re.IGNORECASE,
)


def normalize_owner_id(value: str) -> str:
    text = (value or "").strip().lower()
    return text if _UUID.match(text) else ""


def site_owned_by(
    manifest: SiteManifest,
    *,
    owner_id: str,
    owner_kind: str = "",
    owner_email: str = "",
    extra_owner_ids: list[str] | None = None,
) -> bool:
    """Match portal_owner_* only. Never business email/WhatsApp. Never unowned disk sites."""
    stored_id = normalize_owner_id(manifest.portal_owner_id)
    stored_email = (manifest.portal_owner_email or "").strip().lower()
    if not stored_id and not stored_email:
        return False

    query_id = normalize_owner_id(owner_id)
    extras = {normalize_owner_id(item) for item in (extra_owner_ids or []) if item}
    extras.discard("")
    if stored_id and query_id and stored_id == query_id:
        return True
    if stored_id and stored_id in extras:
        return True

    kind = (owner_kind or "").strip().lower()
    query_email = (owner_email or "").strip().lower()
    if kind == "account" and stored_email and query_email and stored_email == query_email:
        return True
    return False


def public_site_row(manifest: SiteManifest) -> dict[str, Any]:
    vercel = (manifest.vercel_url or "").strip()
    created = manifest.created_at.isoformat() if manifest.created_at else ""
    return {
        "slug": manifest.slug,
        "business_name": manifest.business_name,
        "vercel_url": vercel,
        "published": bool(vercel),
        "created_at": created,
    }


def list_owned_sites(
    *,
    owner_id: str,
    owner_kind: str = "",
    owner_email: str = "",
    extra_owner_ids: list[str] | None = None,
    sites_root: str | None = None,
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for manifest in list_sites(sites_root):
        if site_owned_by(
            manifest,
            owner_id=owner_id,
            owner_kind=owner_kind,
            owner_email=owner_email,
            extra_owner_ids=extra_owner_ids,
        ):
            rows.append(public_site_row(manifest))
    return rows


def reassign_guest_sites(
    *,
    from_guest_id: str,
    to_account_id: str,
    to_email: str = "",
    sites_root: str | None = None,
) -> list[str]:
    """Move guest-owned manifests to an account. Does not claim unowned folders."""
    guest = normalize_owner_id(from_guest_id)
    account = normalize_owner_id(to_account_id)
    if not guest or not account:
        return []
    moved: list[str] = []
    for manifest in list_sites(sites_root):
        stored = normalize_owner_id(manifest.portal_owner_id)
        kind = (manifest.portal_owner_kind or "").strip().lower()
        if stored != guest:
            continue
        if kind and kind != "guest":
            continue
        fresh = get_manifest(manifest.slug, sites_root=sites_root)
        if fresh is None:
            continue
        fresh.portal_owner_id = account
        fresh.portal_owner_kind = "account"
        fresh.portal_owner_email = (to_email or "").strip().lower()
        save_manifest(fresh, sites_root=sites_root)
        moved.append(fresh.slug)
    return moved
