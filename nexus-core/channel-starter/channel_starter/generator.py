"""Generate static sites from SiteForm — rule-based Jinja2, no LLM."""

from __future__ import annotations

import json
import shutil
import sys
import uuid
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

from channel_starter.config import EXAMPLES_DIR, SITES_DIR, SUBDOMAIN_BASE, TEMPLATES_DIR
from channel_starter.form_fields import inflate_flat_fields
from channel_starter.presets import apply_presets
from channel_starter.themes import NEUTRAL, resolve_theme
from channel_starter.types import (
    GalleryItem,
    GaasUpsellStatus,
    Offering,
    PricingTier,
    SiteCategory,
    SiteForm,
    SiteManifest,
    StatItem,
)

_CATEGORY_LABELS = {
    SiteCategory.FNB: "Kuliner / F&B",
    SiteCategory.JASA: "Jasa",
    SiteCategory.PROFIL: "Profil UMKM",
}

DEMO_SLUG = "contoh-nexcent"
_DEMO_FILES = ("index.html", "manifest.json", "robots.txt", "vercel.json", "PUBLISH.txt")

_VERCEL_JSON = {
    "cleanUrls": True,
    "trailingSlash": False,
    "headers": [
        {
            "source": "/(.*)",
            "headers": [
                {"key": "X-Content-Type-Options", "value": "nosniff"},
                {"key": "X-Frame-Options", "value": "DENY"},
                {"key": "Referrer-Policy", "value": "strict-origin-when-cross-origin"},
                {"key": "X-Nexus-Channel-Starter", "value": "edge-headers"},
            ],
        }
    ],
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


def _as_models(form: SiteForm) -> tuple[list[Offering], list[StatItem], list[GalleryItem]]:
    return (list(form.offerings), list(form.stats), list(form.gallery))


def _render_context(form: SiteForm, manifest: SiteManifest | None = None) -> dict:
    gaas_active = manifest.gaas_active if manifest else False
    tier = manifest.tier if manifest else form.tier
    theme = resolve_theme(form.theme, form.primary_color)
    public_host = (manifest.custom_domain if manifest and manifest.custom_domain else "") or (
        form.custom_domain or (manifest.subdomain if manifest else f"{form.resolved_slug()}.{SUBDOMAIN_BASE}")
    )
    if gaas_active:
        upsell_note = (
            f"Perlindungan Nexus {_tier_label(manifest.gaas_tier or tier)} aktif "
            f"— wasit GaaS di {manifest.protected_host or manifest.subdomain}."
        )
    else:
        upsell_note = (
            "Keamanan wasit Nexus Cowork (Job/Loop GaaS) — paket terpisah, "
            "bukan termasuk Starter Rp ~20rb."
        )
    offerings, stats, gallery = _as_models(form)
    return {
        "business_name": form.business_name,
        "tagline": form.tagline,
        "description": form.description,
        "whatsapp": form.whatsapp,
        "address": form.address,
        "email": form.email,
        "hours": form.hours,
        "instagram": form.instagram,
        "headline": form.headline,
        "headline_accent": form.headline_accent,
        "about_title": form.about_title,
        "about_body": form.about_body,
        "extra_title": form.extra_title,
        "extra_body": form.extra_body,
        "quote": form.quote,
        "quote_name": form.quote_name,
        "quote_role": form.quote_role,
        "cta_label": form.cta_label or "Hubungi kami",
        "hero_image_url": form.hero_image_url,
        "logo_url": form.logo_url,
        "offerings": offerings,
        "stats": stats,
        "gallery": gallery,
        "partners": form.partner_list(),
        "theme": theme,
        "neutrals": NEUTRAL,
        "primary_color": theme.primary,
        "public_host": public_host,
        "category_label": _CATEGORY_LABELS.get(form.category, form.category.value),
        "tier_label": _tier_label(tier),
        "upsell_note": upsell_note,
        "gaas_active": gaas_active,
        "show_upsell": not gaas_active and tier in {PricingTier.STARTER, PricingTier.USAHA},
        "protected_host": manifest.protected_host if manifest else "",
        "cowork_job_id": manifest.cowork_job_id if manifest else "",
    }


def _publish_txt(manifest: SiteManifest) -> str:
    vercel_line = manifest.vercel_url or f"https://{manifest.slug}.vercel.app (setelah publish)"
    return (
        "Channel Starter — pack host (lab v0.1)\n"
        "\n"
        f"Situs: {manifest.business_name}\n"
        f"Folder: sites/{manifest.slug}/  (satu UMKM, HTML statis)\n"
        f"Vercel: {vercel_line}\n"
        "\n"
        "Generate men-deploy folder INI ke project Vercel bernama slug, jika "
        "VERCEL_TOKEN / `vercel login` ada. Bukan repo GitHub. Bukan monorepo Nexus.\n"
        "\n"
        "JANGAN Connect Git Repository ke github.com/Thbetyfu/NEXUS-CYBER-FASE3\n"
        "(atau monorepo Nexus lain). Itu gateway/SOC, bukan landing warung.\n"
        "\n"
        "Ulangi deploy:\n"
        f"  python cli.py publish --slug {manifest.slug}\n"
        "\n"
        f"Preview lab: python cli.py serve → http://127.0.0.1:3010/preview/{manifest.slug}\n"
        "Bukan Job Cowork. Bukan klaim *.vercel.app di belakang WAF.\n"
    )


def _write_publish_pack(out_dir: Path, manifest: SiteManifest) -> None:
    """Artefak host: Vercel headers + catatan. Deploy akun = vercel_publish, bukan git monorepo."""
    payload = dict(_VERCEL_JSON)
    payload["headers"][0]["headers"][-1] = {
        "key": "X-Nexus-Channel-Starter",
        "value": manifest.site_id,
    }
    (out_dir / "vercel.json").write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    (out_dir / "robots.txt").write_text(
        "User-agent: *\nAllow: /\n",
        encoding="utf-8",
    )
    (out_dir / "PUBLISH.txt").write_text(_publish_txt(manifest), encoding="utf-8")


def _write_html(form: SiteForm, manifest: SiteManifest, *, sites_root: Path) -> Path:
    ctx = _render_context(form, manifest)
    html = _env().get_template("_base.html").render(**ctx)
    index_path = Path(manifest.index_path)
    index_path.write_text(html, encoding="utf-8")
    _write_publish_pack(Path(manifest.output_dir), manifest)
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


def _form_from_manifest(manifest: SiteManifest) -> SiteForm:
    return SiteForm(
        business_name=manifest.business_name,
        category=manifest.category,
        tagline=manifest.tagline,
        description=manifest.description,
        whatsapp=manifest.whatsapp if len(manifest.whatsapp or "") >= 8 else "6281234567890",
        address=manifest.address,
        email=manifest.email,
        hours=manifest.hours,
        instagram=manifest.instagram,
        headline=manifest.headline,
        headline_accent=manifest.headline_accent,
        about_title=manifest.about_title,
        about_body=manifest.about_body,
        extra_title=manifest.extra_title,
        extra_body=manifest.extra_body,
        quote=manifest.quote,
        quote_name=manifest.quote_name,
        quote_role=manifest.quote_role,
        partners=manifest.partners,
        cta_label=manifest.cta_label,
        hero_image_url=manifest.hero_image_url,
        logo_url=manifest.logo_url,
        theme=manifest.theme,
        primary_color=manifest.primary_color,
        custom_domain=manifest.custom_domain,
        offerings=manifest.offerings,
        stats=manifest.stats,
        gallery=manifest.gallery,
        tier=manifest.tier,
        slug=manifest.slug,
        portal_owner_id=manifest.portal_owner_id,
        portal_owner_kind=manifest.portal_owner_kind,
        portal_owner_email=manifest.portal_owner_email,
    )


def regenerate_site_html(manifest: SiteManifest, *, sites_root: Path | str | None = None) -> Path:
    root = Path(sites_root) if sites_root else SITES_DIR
    return _write_html(_form_from_manifest(manifest), manifest, sites_root=root)


def _fill_form(form: SiteForm) -> SiteForm:
    merged = apply_presets(form.model_dump())
    return SiteForm.model_validate(merged)


def generate_site(form: SiteForm, *, sites_root: Path | str | None = None) -> SiteManifest:
    root = Path(sites_root) if sites_root else SITES_DIR
    root.mkdir(parents=True, exist_ok=True)
    form = _fill_form(form)

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
        hours=form.hours,
        instagram=form.instagram,
        headline=form.headline,
        headline_accent=form.headline_accent,
        about_title=form.about_title,
        about_body=form.about_body,
        extra_title=form.extra_title,
        extra_body=form.extra_body,
        quote=form.quote,
        quote_name=form.quote_name,
        quote_role=form.quote_role,
        partners=form.partners,
        cta_label=form.cta_label,
        hero_image_url=form.hero_image_url,
        logo_url=form.logo_url,
        theme=form.theme,
        primary_color=form.primary_color,
        custom_domain=form.custom_domain,
        offerings=form.offerings,
        stats=form.stats,
        gallery=form.gallery,
        portal_owner_id=(form.portal_owner_id or "").strip().lower(),
        portal_owner_kind=(form.portal_owner_kind or "").strip().lower(),
        portal_owner_email=(form.portal_owner_email or "").strip().lower(),
    )
    _write_html(form, manifest, sites_root=root)
    save_manifest(manifest, sites_root=root)
    return manifest


def generate_from_dict(data: dict, *, sites_root: Path | str | None = None) -> SiteManifest:
    form = SiteForm.model_validate(inflate_flat_fields(dict(data)))
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


def is_safe_slug(slug: str) -> bool:
    """Reject path traversal; preview URLs must be a single directory name."""
    if not slug or len(slug) > 64:
        return False
    if slug.startswith(".") or "/" in slug or "\\" in slug or ".." in slug:
        return False
    return Path(slug).name == slug


def resolve_preview_index(
    slug: str,
    *,
    sites_root: Path | str | None = None,
    examples_root: Path | str | None = None,
) -> Path | None:
    """index.html for a slug: generated sites first, then committed examples."""
    if not is_safe_slug(slug):
        return None
    roots = (
        Path(sites_root) if sites_root else SITES_DIR,
        Path(examples_root) if examples_root else EXAMPLES_DIR,
    )
    for root in roots:
        index = root / slug / "index.html"
        if index.is_file():
            return index
    return None


def preview_catalog(
    *,
    sites_root: Path | str | None = None,
    examples_root: Path | str | None = None,
) -> dict[str, list[SiteManifest]]:
    return {
        "generated": list_sites(sites_root),
        "examples": list_sites(examples_root if examples_root is not None else EXAMPLES_DIR),
    }


def ensure_demo_site(
    *,
    sites_root: Path | str | None = None,
    examples_root: Path | str | None = None,
) -> Path | None:
    """Make sure sites/contoh-nexcent exists so /preview never looks like a fatal JSON crash.

    Copies the committed example; if that is missing too, generates a seed site.
    Fail-soft: wizard still starts if copy/generate fails.
    """
    sites = Path(sites_root) if sites_root else SITES_DIR
    examples = Path(examples_root) if examples_root else EXAMPLES_DIR
    dest = sites / DEMO_SLUG
    dest_index = dest / "index.html"
    if dest_index.is_file():
        return dest_index
    try:
        sites.mkdir(parents=True, exist_ok=True)
        src = examples / DEMO_SLUG
        if (src / "index.html").is_file():
            dest.mkdir(parents=True, exist_ok=True)
            for name in _DEMO_FILES:
                item = src / name
                if item.is_file():
                    shutil.copy2(item, dest / name)
            return dest_index if dest_index.is_file() else None
        generate_from_dict(
            {
                "business_name": "Contoh Nexcent",
                "category": "fnb",
                "whatsapp": "6281234567890",
                "theme": "hijau",
                "slug": DEMO_SLUG,
                "address": "Lab Channel Starter — bukan klien nyata",
            },
            sites_root=sites,
        )
        return dest_index if dest_index.is_file() else None
    except Exception as exc:
        print(f"ensure_demo_site skipped: {exc}", file=sys.stderr)
        return None
