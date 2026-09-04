"""Publish one Channel Starter folder to Vercel.

Each UMKM site is its own Vercel project (HTML statis). Never deploy the Nexus
monorepo. Hosting on *.vercel.app is not WAF / Job Cowork.

Auth: VERCEL_TOKEN in gitignored channel-starter/.env first; else token from
`vercel login` (CLI auth.json). Do not inject --scope from currentTeam or
VERCEL_ORG_ID unless CHANNEL_STARTER_VERCEL_SCOPE is set.
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
_SKIP_SLUGS = {DEMO_SLUG, "cek-redirect"}
_OFF = {"0", "false", "no", "off"}
_LINK_ENV = ("VERCEL_ORG_ID", "VERCEL_PROJECT_ID")
MSG_NO_TOKEN = (
    "publish gagal: vercel login di PC wizard, atau set VERCEL_TOKEN di channel-starter/.env"
)
MSG_DISABLED = "publish gagal: CHANNEL_STARTER_VERCEL_PUBLISH dimatikan di mesin wizard"
MSG_NO_CLI = "publish gagal: vercel CLI tidak ada di mesin wizard"
MSG_SCOPE = (
    "publish gagal: token tidak bisa akses akun/team (--scope). "
    "Kosongkan CHANNEL_STARTER_VERCEL_SCOPE atau buat token Dashboard "
    "dengan akses ke team yang punya project warung"
)


def _publish_flag() -> str:
    return (os.getenv("CHANNEL_STARTER_VERCEL_PUBLISH") or "auto").strip().lower()


def vercel_publish_enabled() -> bool:
    """False only when explicitly off. Auto still attempts; missing auth is an honest skip."""
    return _publish_flag() not in _OFF


def _cli_data_dirs() -> list[Path]:
    home = Path.home()
    dirs = [
        home / ".local/share/com.vercel.cli",
        home / "Library/Application Support/com.vercel.cli",
    ]
    local = (os.getenv("LOCALAPPDATA") or "").strip()
    appdata = (os.getenv("APPDATA") or "").strip()
    xdg = (os.getenv("XDG_DATA_HOME") or "").strip()
    if xdg:
        dirs.append(Path(xdg) / "com.vercel.cli")
    if local:
        dirs.append(Path(local) / "com.vercel.cli")
        dirs.append(Path(local) / "xdg.data" / "com.vercel.cli")
    if appdata:
        dirs.append(Path(appdata) / "com.vercel.cli")
        dirs.append(Path(appdata) / "xdg.data" / "com.vercel.cli")
    return dirs


def _first_json_file(name: str) -> Path | None:
    for folder in _cli_data_dirs():
        path = folder / name
        if path.is_file():
            return path
    return None


def env_vercel_token() -> str:
    """Gitignored .env / process env only — not CLI auth.json."""
    return (os.getenv("VERCEL_TOKEN") or "").strip()


def cli_auth_token() -> str:
    """Token stored by `vercel login` (auth.json). Never print this."""
    auth = _first_json_file("auth.json")
    if auth is None:
        return ""
    try:
        payload = json.loads(auth.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError, TypeError):
        return ""
    if not isinstance(payload, dict):
        return ""
    return str(payload.get("token") or "").strip()


def vercel_token() -> str:
    """Env token wins; else CLI login token. Empty = neither path."""
    return env_vercel_token() or cli_auth_token()


def vercel_scope() -> str:
    """Optional team slug. Empty = no --scope (do not use currentTeam / VERCEL_ORG_ID)."""
    return (os.getenv("CHANNEL_STARTER_VERCEL_SCOPE") or "").strip()


def _vercel_subprocess_env(token: str) -> dict[str, str]:
    """Pass token; drop linked-project org/project so leftover IDs cannot pin --scope."""
    env = {k: v for k, v in os.environ.items() if k not in _LINK_ENV}
    env["VERCEL_TOKEN"] = token
    return env


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


def build_deploy_cmd(binary: list[str], site_dir: Path, slug: str, token: str) -> list[str]:
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
    return cmd


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


def _scope_error(text: str) -> bool:
    lowered = (text or "").lower()
    return "scope-not-accessible" in lowered or "do not have access to the specified account" in lowered


def publish_site(manifest: SiteManifest, *, timeout: int = 180) -> dict:
    """Deploy sites/{slug} as its own Vercel project. Skip honestly without env token or CLI login."""
    slug = manifest.slug
    if not vercel_publish_enabled():
        return {
            "ok": False,
            "skipped": True,
            "reason": "CHANNEL_STARTER_VERCEL_PUBLISH disabled",
            "user_message": MSG_DISABLED,
        }
    if slug in _SKIP_SLUGS:
        return {"ok": False, "skipped": True, "reason": f"slug {slug} is demo/lab, not a client publish"}
    token = vercel_token()
    if not token:
        return {
            "ok": False,
            "skipped": True,
            "reason": "no VERCEL_TOKEN / vercel login",
            "user_message": MSG_NO_TOKEN,
        }
    site_dir = Path(manifest.output_dir)
    if not _is_safe_site_dir(site_dir):
        return {"ok": False, "skipped": False, "error": f"unsafe or missing site dir: {site_dir}"}

    binary = _find_vercel_bin()
    if not binary:
        return {
            "ok": False,
            "skipped": True,
            "reason": "vercel CLI / npx not found",
            "user_message": MSG_NO_CLI,
        }

    cmd = build_deploy_cmd(binary, site_dir, slug, token)

    try:
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=False,
            timeout=timeout,
            cwd=str(site_dir),
            env=_vercel_subprocess_env(token),
        )
    except FileNotFoundError:
        return {
            "ok": False,
            "skipped": True,
            "reason": "vercel CLI not found",
            "user_message": MSG_NO_CLI,
        }
    except subprocess.TimeoutExpired:
        return {"ok": False, "skipped": False, "error": "vercel deploy timed out"}

    output = f"{proc.stdout or ''}\n{proc.stderr or ''}"
    url = _parse_production_url(output, slug)
    if proc.returncode != 0:
        err = (proc.stderr or proc.stdout or "vercel deploy failed").strip()[-800:]
        if _scope_error(output):
            return {
                "ok": False,
                "skipped": False,
                "error": err,
                "returncode": proc.returncode,
                "url": url,
                "user_message": MSG_SCOPE,
            }
        return {
            "ok": False,
            "skipped": False,
            "error": err,
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
