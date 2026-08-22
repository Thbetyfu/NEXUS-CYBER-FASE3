"""Generate static sites from SiteForm — rule-based Jinja2, no LLM."""

from __future__ import annotations

import uuid
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

from channel_starter.config import SITES_DIR, SUBDOMAIN_BASE, TEMPLATES_DIR
from channel_starter.presets import apply_presets
from channel_starter.types import GaasUpsellStatus, PricingTier, SiteCategory, SiteForm, SiteManifest

_CATEGORY_LABELS = {
    SiteCategory.FNB: "Kuliner / F&B",
    SiteCategory.JASA: "Jasa",
    SiteCategory.PROFIL: "Profil UMKM",
}


def _tier_label(tier: PricingTier) -> str:
    return {
        PricingTier.STARTER: "Starter (~Rp 0–29rb)",
        PricingTier.USAHA: "Usaha (Rp 49–99rb)",
        PricingTier.TEPI: "Tepi + WAF",
        PricingTier.COWORK: "Cowork GaaS",
    }.get(tier, tier.value)


def _env() -> Environment:
    return Environment(
        loader=FileSystemLoader(str(TEMPLATES_DIR)),
        autoescape=select_autoescape(["html", "xml"]),
    )


def _render_context(form: SiteForm, manifest: SiteManifest | None = None) -> dict:
    gaas_active = manifest.gaas_active if manifest else False
    tier = manifest.tier if manifest else form.tier
    if gaas_active:
        upsell_note = (
            f"Perlindungan Nexus { _tier_label(manifest.gaas_tier or tier) } aktif "
            f"— wasit GaaS di {manifest.protected_host or manifest.subdomain}."
        )
    else:
        upsell_note = (
            "Keamanan wasit Nexus Cowork (Job/Loop GaaS) — paket terpisah, "
            "bukan termasuk Starter Rp ~20rb."
        )
    return {
        "business_name": form.business_name,
        "tagline": form.tagline,
        "description": form.description,
        "whatsapp": form.whatsapp,
        "address": form.address,
        "email": form.email,
        "primary_color": form.primary_color,
        "category_label": _CATEGORY_LABELS.get(form.category, form.category.value),
        "tier_label": _tier_label(tier),
        "upsell_note": upsell_note,
        "gaas_active": gaas_active,
        "show_upsell": not gaas_active and tier in {PricingTier.STARTER, PricingTier.USAHA},
        "protected_host": manifest.protected_host if manifest else "",
        "cowork_job_id": manifest.cowork_job_id if manifest else "",
    }


def _write_html(form: SiteForm, manifest: SiteManifest, *, sites_root: Path) -> Path:
    ctx = _render_context(form, manifest)
    template_path = f"{form.template_name()}/index.html"
    html = _env().get_template(template_path).render(**ctx)
    index_path = Path(manifest.index_path)
    index_path.write_text(html, encoding="utf-8")
    return index_path


def save_manifest(manifest: SiteManifest, *, sites_root: Path | str | None = None) -> Path:
    root = Path(sites_root) if sites_root else SITES_DIR
    manifest_path = root / manifest.slug / "manifest.json"
    manifest_path.write_text(manifest.model_dump_json(indent=2), encoding="utf-8")
    return manifest_path


def get_manifest(slug: str, *, sites_root: Path | str | None = None) -> SiteManifest | None:
    root = Path(sites_root) if sites_root else SITES_DIR
    manifest_path = root / slug / "manifest.json"
    if not manifest_path.is_file():
        return None
    return SiteManifest.model_validate_json(manifest_path.read_text(encoding="utf-8"))


def regenerate_site_html(manifest: SiteManifest, *, sites_root: Path | str | None = None) -> Path:
    root = Path(sites_root) if sites_root else SITES_DIR
    form = SiteForm(
        business_name=manifest.business_name,
        category=manifest.category,
        tagline=manifest.tagline,
        description=manifest.description,
        whatsapp=manifest.whatsapp if len(manifest.whatsapp or "") >= 8 else "6281234567890",
        address=manifest.address,
        email=manifest.email,
        primary_color=manifest.primary_color,
        tier=manifest.tier,
        slug=manifest.slug,
    )
    return _write_html(form, manifest, sites_root=root)


def generate_site(form: SiteForm, *, sites_root: Path | str | None = None) -> SiteManifest:
    root = Path(sites_root) if sites_root else SITES_DIR
    root.mkdir(parents=True, exist_ok=True)

    slug = form.resolved_slug()
    out_dir = root / slug
    out_dir.mkdir(parents=True, exist_ok=True)

    site_id = f"CS-{uuid.uuid4().hex[:8].upper()}"
    manifest = SiteManifest(
        site_id=site_id,
        slug=slug,
        business_name=form.business_name,
        category=form.category,
        tier=form.tier,
        subdomain=f"{slug}.{SUBDOMAIN_BASE}",
        output_dir=str(out_dir),
        index_path=str(out_dir / "index.html"),
        tagline=form.tagline,
        description=form.description,
        whatsapp=form.whatsapp,
        address=form.address,
        email=form.email,
        primary_color=form.primary_color,
    )
    _write_html(form, manifest, sites_root=root)
    save_manifest(manifest, sites_root=root)
    return manifest


def generate_from_dict(data: dict, *, sites_root: Path | str | None = None) -> SiteManifest:
    merged = apply_presets(dict(data))
    form = SiteForm.model_validate(merged)
    return generate_site(form, sites_root=sites_root)


def list_sites(sites_root: Path | str | None = None) -> list[SiteManifest]:
    root = Path(sites_root) if sites_root else SITES_DIR
    if not root.is_dir():
        return []
    items: list[SiteManifest] = []
    for path in sorted(root.iterdir()):
        if not path.is_dir() or path.name.startswith("_"):
            continue
        manifest_path = path / "manifest.json"
        if manifest_path.is_file():
            try:
                items.append(SiteManifest.model_validate_json(manifest_path.read_text(encoding="utf-8")))
            except Exception:
                continue
    return items
