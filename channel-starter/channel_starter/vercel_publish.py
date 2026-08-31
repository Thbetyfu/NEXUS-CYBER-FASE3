"""Publish one Channel Starter folder to Vercel.

Each UMKM site is its own Vercel project (HTML statis). Never deploy the Nexus
monorepo. Hosting on *.vercel.app is not WAF / Job Cowork.
"""

from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
from pathlib import Path

from channel_starter.generator import DEMO_SLUG, get_manifest, list_sites, save_manifest
from channel_starter.types import SiteManifest

_URL_RE = re.compile(r"https://[a-z0-9.-]+\.vercel\.app/?", re.I)
_AUTH_JSON = Path.home() / ".local/share/com.vercel.cli/auth.json"
_CONFIG_JSON = Path.home() / ".local/share/com.vercel.cli/config.json"
_SKIP_SLUGS = {DEMO_SLUG, "cek-redirect"}


def vercel_publish_enabled() -> bool:
    flag = (os.getenv("CHANNEL_STARTER_VERCEL_PUBLISH") or "auto").strip().lower()
    if flag in {"0", "false", "no", "off"}:
        return False
    if flag in {"1", "true", "yes", "on"}:
        return True
    return bool(vercel_token())


def vercel_token() -> str:
    env = (os.getenv("VERCEL_TOKEN") or "").strip()
    if env:
        return env
    if not _AUTH_JSON.is_file():
        return ""
    try:
        payload = json.loads(_AUTH_JSON.read_text(encoding="utf-8"))
    except Exception:
        return ""
    return str(payload.get("token") or "").strip()


def vercel_scope() -> str:
    env = (os.getenv("VERCEL_ORG_ID") or os.getenv("CHANNEL_STARTER_VERCEL_SCOPE") or "").strip()
    if env:
        return env
    if not _CONFIG_JSON.is_file():
        return ""
    try:
        payload = json.loads(_CONFIG_JSON.read_text(encoding="utf-8"))
    except Exception:
        return ""
    return str(payload.get("currentTeam") or "").strip()


def _is_safe_site_dir(path: Path) -> bool:
    if not path.is_dir() or not (path / "index.html").is_file():
        return False
    # Refuse monorepo / control-plane roots.
    markers = ("AGENTS.md", "nexus-core-gateway", "channel_starter", "NEX-RED")
    return not any((path / name).exists() for name in markers)


def _find_vercel_bin() -> list[str]:
    vercel = shutil.which("vercel")
    if vercel:
        return [vercel]
    npx = shutil.which("npx")
    if npx:
        return [npx, "--yes", "vercel@latest"]
    return []


def _parse_production_url(text: str, slug: str) -> str:
    urls = _URL_RE.findall(text or "")
    if not urls:
        return ""
    cleaned = [u.rstrip("/") for u in urls]
    preferred = f"https://{slug}.vercel.app"
    for url in cleaned:
        if url.lower() == preferred:
            return url
    production = [u for u in cleaned if re.fullmatch(rf"https://{re.escape(slug)}-[a-z0-9-]+\.vercel\.app", u, re.I)]
    if production:
        return production[-1]
    return cleaned[-1]


def publish_site(manifest: SiteManifest, *, timeout: int = 180) -> dict:
    """Deploy sites/{slug} as its own Vercel project. Fail-soft without token/CLI."""
    slug = manifest.slug
    if not vercel_publish_enabled():
        return {"ok": False, "skipped": True, "reason": "CHANNEL_STARTER_VERCEL_PUBLISH disabled"}
    if slug in _SKIP_SLUGS:
        return {"ok": False, "skipped": True, "reason": f"slug {slug} is demo/lab, not a client publish"}
    token = vercel_token()
    if not token:
        return {
            "ok": False,
            "skipped": True,
            "reason": "no VERCEL_TOKEN / vercel login",
        }
    site_dir = Path(manifest.output_dir)
    if not _is_safe_site_dir(site_dir):
        return {"ok": False, "skipped": False, "error": f"unsafe or missing site dir: {site_dir}"}

    binary = _find_vercel_bin()
    if not binary:
        return {"ok": False, "skipped": True, "reason": "vercel CLI / npx not found"}

    cmd = [
        *binary,
        "deploy",
        str(site_dir),
        "--prod",
        "--yes",
        "--name",
        slug,
        "--archive=tgz",
        "--token",
        token,
    ]
    scope = vercel_scope()
    if scope:
        cmd.extend(["--scope", scope])

    try:
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=False,
            timeout=timeout,
            cwd=str(site_dir),
        )
    except FileNotFoundError:
        return {"ok": False, "skipped": True, "reason": "vercel CLI not found"}
    except subprocess.TimeoutExpired:
        return {"ok": False, "skipped": False, "error": "vercel deploy timed out"}

    output = f"{proc.stdout or ''}\n{proc.stderr or ''}"
    url = _parse_production_url(output, slug)
    if proc.returncode != 0:
        return {
            "ok": False,
            "skipped": False,
            "error": (proc.stderr or proc.stdout or "vercel deploy failed").strip()[-800:],
            "returncode": proc.returncode,
            "url": url,
        }

    if url:
        manifest.vercel_url = url
        save_manifest(manifest, sites_root=site_dir.parent)

    return {
        "ok": True,
        "skipped": False,
        "url": url,
        "project": slug,
        "note": "Vercel hosting only — not Nexus WAF / Job Cowork",
    }


def publish_slug(slug: str, *, sites_root: Path | str | None = None) -> dict:
    manifest = get_manifest(slug, sites_root=sites_root)
    if manifest is None:
        return {"ok": False, "error": f"unknown slug {slug}"}
    return publish_site(manifest)


def publish_all(*, sites_root: Path | str | None = None) -> dict:
    results = []
    for manifest in list_sites(sites_root):
        results.append({"slug": manifest.slug, **publish_site(manifest)})
    attempted = [row for row in results if not row.get("skipped")]
    failed = [row for row in attempted if not row.get("ok")]
    return {
        "ok": not failed,
        "published": sum(1 for row in attempted if row.get("ok")),
        "skipped": sum(1 for row in results if row.get("skipped")),
        "results": results,
    }
