"""Lab host map: portfolio + N tepi slugs on one gateway. Not mass CNAME."""

from __future__ import annotations

import json
from pathlib import Path

from channel_starter import config as cfg

DEFAULT_PORTFOLIO_HOST = "portfolio.nexus-lab.test"
DEFAULT_PORTFOLIO_ORIGIN = "https://portfolio-website-three-ruddy-65.vercel.app"
HOST_MAP_NAME = "nexus-host-map.json"


def origin_backend(slug: str) -> str:
    return f"{cfg.CHANNEL_ORIGIN_BASE.rstrip('/')}/{slug}/"


def host_map_path() -> Path:
    return cfg.DEPLOY_LOCAL_DIR / HOST_MAP_NAME


def _env_value(path: Path, key: str) -> str:
    if not path.is_file():
        return ""
    prefix = f"{key}="
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if line.startswith(prefix):
            return line[len(prefix) :].strip().strip("'").strip('"')
    return ""


def portfolio_host() -> str:
    env_path = cfg.DEPLOY_LOCAL_DIR / ".env"
    host = _env_value(env_path, "PROTECTED_HOST") or DEFAULT_PORTFOLIO_HOST
    return host.split("/")[0].split(":")[0].lower()


def portfolio_origin() -> str:
    env_path = cfg.DEPLOY_LOCAL_DIR / ".env"
    return _env_value(env_path, "TARGET_BACKEND") or DEFAULT_PORTFOLIO_ORIGIN


def write_host_map(
    entries: list[dict],
    *,
    path: Path | None = None,
) -> Path:
    """Write host map. Always keep portfolio as first entry."""
    dest = path or host_map_path()
    dest.parent.mkdir(parents=True, exist_ok=True)
    by_host: dict[str, dict] = {}
    by_host[portfolio_host()] = {
        "host": portfolio_host(),
        "origin": portfolio_origin(),
        "kind": "portfolio",
    }
    for item in entries:
        host = str(item.get("host") or "").strip().lower()
        origin = str(item.get("origin") or "").strip()
        if not host or not origin:
            continue
        if host == portfolio_host():
            continue
        by_host[host] = {
            "host": host,
            "origin": origin,
            "kind": str(item.get("kind") or "tepi"),
            "slug": str(item.get("slug") or ""),
        }
    payload = {
        "note": "Lab multi-host tepi on one gateway. Not mass CNAME. Not *.vercel.app naked.",
        "hosts": list(by_host.values()),
    }
    dest.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return dest


def write_host_map_from_sites(*, sites_root: Path | str | None = None) -> Path:
    from channel_starter.generator import list_sites

    extra: list[dict] = []
    for manifest in list_sites(sites_root or cfg.SITES_DIR):
        if not manifest.gaas_active:
            continue
        extra.append(
            {
                "host": manifest.protected_host or manifest.subdomain,
                "origin": origin_backend(manifest.slug),
                "kind": (manifest.gaas_tier.value if manifest.gaas_tier else "tepi"),
                "slug": manifest.slug,
            }
        )
    return write_host_map(extra)


def reset_host_map_portfolio_only() -> Path:
    return write_host_map([])
