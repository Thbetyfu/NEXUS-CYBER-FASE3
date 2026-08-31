"""Deploy helpers — multi-tenant Caddy routing + lab hosts registry."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

from channel_starter.config import (
    CADDY_AGGREGATE_NAME,
    CADDY_BUNDLE_DIR,
    CADDY_CONTAINER,
    CADDY_CONTAINER_ROOT,
    CADDY_SNIPPETS_DIR,
    HTTP_ONLY,
    SITES_DIR,
    SUBDOMAIN_BASE,
)
from channel_starter.generator import list_sites, save_manifest
from channel_starter.types import SiteManifest

_GENERATED_HEADER = "# Channel Starter — auto-generated. Do not edit by hand.\n"


def site_address(subdomain: str) -> str:
    if HTTP_ONLY:
        return f"http://{subdomain}"
    return subdomain


def container_site_root(slug: str) -> str:
    return f"{CADDY_CONTAINER_ROOT}/{slug}"


def render_site_caddy_block(manifest: SiteManifest) -> str:
    addr = site_address(manifest.subdomain)
    if manifest.gaas_active:
        return (
            f"{addr} {{\n"
            f"    reverse_proxy gateway:8080\n"
            f"    header X-Nexus-Channel-Starter-GaaS \"{manifest.site_id}\"\n"
            f"}}\n"
        )
    root = container_site_root(manifest.slug)
    return (
        f"{addr} {{\n"
        f"    root * {root}\n"
        f"    file_server\n"
        f"    encode gzip\n"
        f"    header X-Nexus-Channel-Starter \"{manifest.site_id}\"\n"
        f"    header X-Content-Type-Options nosniff\n"
        f"    header X-Frame-Options DENY\n"
        f"    header Referrer-Policy strict-origin-when-cross-origin\n"
        f"    header Content-Security-Policy \"default-src 'self'; img-src 'self' https: data:; "
        f"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        f"font-src https://fonts.gstatic.com data:; script-src 'none'\"\n"
        f"}}\n"
    )


def write_caddy_snippet(manifest: SiteManifest, *, sites_root: Path | str | None = None) -> Path:
    """Write per-site snippet (debug / manual import)."""
    root = Path(sites_root) if sites_root else SITES_DIR
    snippets_dir = root / CADDY_SNIPPETS_DIR
    snippets_dir.mkdir(parents=True, exist_ok=True)
    snippet_path = snippets_dir / f"{manifest.slug}.caddy"
    snippet_path.write_text(_GENERATED_HEADER + render_site_caddy_block(manifest), encoding="utf-8")
    return snippet_path


def write_aggregate_caddy(*, sites_root: Path | str | None = None) -> Path:
    """Regenerate aggregate Caddy import for all manifests."""
    root = Path(sites_root) if sites_root else SITES_DIR
    bundle_dir = root / CADDY_BUNDLE_DIR
    bundle_dir.mkdir(parents=True, exist_ok=True)
    aggregate_path = bundle_dir / CADDY_AGGREGATE_NAME

    manifests = list_sites(root)
    blocks = [render_site_caddy_block(m) for m in manifests]
    body = _GENERATED_HEADER
    if blocks:
        body += "\n".join(blocks)
    else:
        body += "# No Channel Starter sites yet. Run: python cli.py generate ...\n"
    aggregate_path.write_text(body, encoding="utf-8")
    return aggregate_path


def write_hosts_registry(*, sites_root: Path | str | None = None) -> Path:
    """JSON registry consumed by deploy-local Hosts helper."""
    root = Path(sites_root) if sites_root else SITES_DIR
    bundle_dir = root / CADDY_BUNDLE_DIR
    bundle_dir.mkdir(parents=True, exist_ok=True)
    registry_path = bundle_dir / "hosts-registry.json"

    entries = [
        {
            "slug": m.slug,
            "subdomain": m.subdomain,
            "site_id": m.site_id,
            "business_name": m.business_name,
            "gaas_active": m.gaas_active,
            "protected_host": m.protected_host or (m.subdomain if m.gaas_active else ""),
        }
        for m in list_sites(root)
    ]
    payload = {
        "subdomain_base": SUBDOMAIN_BASE,
        "http_only": HTTP_ONLY,
        "entries": entries,
    }
    registry_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return registry_path


def apply_routing(*, sites_root: Path | str | None = None) -> dict:
    """Regenerate Caddy aggregate + hosts registry after generate/list changes."""
    aggregate = write_aggregate_caddy(sites_root=sites_root)
    registry = write_hosts_registry(sites_root=sites_root)
    root = Path(sites_root) if sites_root else SITES_DIR
    snippets: list[str] = []
    for manifest in list_sites(root):
        snippets.append(str(write_caddy_snippet(manifest, sites_root=root)))
    return {
        "aggregate_caddy": str(aggregate),
        "hosts_registry": str(registry),
        "snippet_count": len(snippets),
        "site_count": len(list_sites(root)),
        "subdomain_base": SUBDOMAIN_BASE,
        "caddy_container_root": CADDY_CONTAINER_ROOT,
        "http_only": HTTP_ONLY,
    }


def reload_caddy(*, container: str | None = None) -> dict:
    """Ask running deploy-local Caddy to reload config."""
    name = container or CADDY_CONTAINER
    try:
        proc = subprocess.run(
            ["docker", "exec", name, "caddy", "reload", "--config", "/etc/caddy/Caddyfile"],
            capture_output=True,
            text=True,
            check=False,
            timeout=30,
        )
    except FileNotFoundError:
        return {"ok": False, "error": "docker not found", "container": name}
    except subprocess.TimeoutExpired:
        return {"ok": False, "error": "docker exec timed out", "container": name}

    return {
        "ok": proc.returncode == 0,
        "container": name,
        "stdout": (proc.stdout or "").strip(),
        "stderr": (proc.stderr or "").strip(),
        "returncode": proc.returncode,
    }


def deploy_manifest(manifest: SiteManifest, *, sites_root: Path | str | None = None) -> dict:
    """Finalize Caddy routing after generate_site; optionally publish the site folder to Vercel."""
    from channel_starter.vercel_publish import publish_site

    snippet = write_caddy_snippet(manifest, sites_root=sites_root)
    routing = apply_routing(sites_root=sites_root)
    vercel = publish_site(manifest)
    if vercel.get("url"):
        manifest.vercel_url = vercel["url"]
        manifest.vercel_project = str(vercel.get("project") or manifest.slug)
        save_manifest(manifest, sites_root=sites_root)
    return {
        "site_id": manifest.site_id,
        "slug": manifest.slug,
        "subdomain": manifest.subdomain,
        "url": f"http://{manifest.subdomain}" if HTTP_ONLY else f"https://{manifest.subdomain}",
        "index_path": manifest.index_path,
        "caddy_snippet": str(snippet),
        "subdomain_base": SUBDOMAIN_BASE,
        "routing": routing,
        "vercel": vercel,
        "upsell": {
            "note": manifest.upsell_note,
            "gaas_active": manifest.gaas_active,
            "protected_host": manifest.protected_host,
            "cowork_job_id": manifest.cowork_job_id,
            "enable_cmd": f"python cli.py upsell enable --slug {manifest.slug} --tier tepi",
        },
    }
