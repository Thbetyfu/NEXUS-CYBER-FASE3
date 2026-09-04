"""Lab host map: portfolio + N tepi slugs on one gateway. Not mass CNAME."""

from __future__ import annotations

import json
from pathlib import Path
from urllib.parse import urlparse

from channel_starter import config as cfg

DEFAULT_PORTFOLIO_HOST = "portfolio.nexus-lab.test"
DEFAULT_PORTFOLIO_ORIGIN = "https://portfolio-website-three-ruddy-65.vercel.app"
HOST_MAP_NAME = "nexus-host-map.json"
_LAB_HOST_EXACT = "nexus-lab.test"
_LAB_HOST_SUFFIX = ".nexus-lab.test"


def origin_backend(slug: str) -> str:
    return f"{cfg.CHANNEL_ORIGIN_BASE.rstrip('/')}/{slug}/"


def host_map_path() -> Path:
    return cfg.DEPLOY_LOCAL_DIR / HOST_MAP_NAME


def _has_control_chars(value: str) -> bool:
    return any(ch in value for ch in ("\r", "\n", "\x00"))


def is_lab_map_host(host: str) -> bool:
    """Public Host header in the lab map: a single nexus-lab.test name, no wildcards."""
    original = host or ""
    if _has_control_chars(original):
        return False
    raw = original.strip().lower()
    if not raw or "*" in raw or "/" in raw or " " in raw or "@" in raw:
        return False
    if "://" in raw:
        parsed = urlparse(raw)
        raw = (parsed.hostname or "").lower()
    if ":" in raw:
        raw = raw.split(":", 1)[0]
    if raw == _LAB_HOST_EXACT or raw.endswith(_LAB_HOST_SUFFIX):
        return True
    return False


def is_lab_map_origin(origin: str) -> bool:
    """Fail-closed origin: http(s) to channel-origin:8099 or *.vercel.app. Not ftp/javascript/CRLF."""
    original = origin or ""
    if _has_control_chars(original):
        return False
    raw = original.strip()
    if not raw or "*" in raw or "@" in raw:
        return False
    if "://" not in raw:
        raw = "http://" + raw
    parsed = urlparse(raw)
    if parsed.scheme not in ("http", "https"):
        return False
    if parsed.username or parsed.password:
        return False
    host = (parsed.hostname or "").lower()
    if host == "channel-origin" or host.endswith(".vercel.app"):
        return True
    return False


def accept_host_map_entry(host: str, origin: str) -> tuple[str, str] | None:
    if not is_lab_map_host(host) or not is_lab_map_origin(origin):
        return None
    name = (host or "").strip().lower()
    if "://" in name:
        parsed = urlparse(name)
        name = (parsed.hostname or "").lower()
    if ":" in name:
        name = name.split(":", 1)[0]
    origin_raw = origin.strip()
    if "://" not in origin_raw:
        origin_raw = "http://" + origin_raw
    return name, origin_raw


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
    host = host.split("/")[0].split(":")[0].lower()
    if not is_lab_map_host(host):
        return DEFAULT_PORTFOLIO_HOST
    return host


def portfolio_origin() -> str:
    env_path = cfg.DEPLOY_LOCAL_DIR / ".env"
    origin = _env_value(env_path, "TARGET_BACKEND") or DEFAULT_PORTFOLIO_ORIGIN
    if not is_lab_map_origin(origin):
        return DEFAULT_PORTFOLIO_ORIGIN
    return origin


def write_host_map(
    entries: list[dict],
    *,
    path: Path | None = None,
) -> Path:
    """Write host map. Always keep portfolio as first entry. Skip junk Host/origin."""
    dest = path or host_map_path()
    dest.parent.mkdir(parents=True, exist_ok=True)
    by_host: dict[str, dict] = {}
    p_host = portfolio_host()
    p_origin = portfolio_origin()
    by_host[p_host] = {
        "host": p_host,
        "origin": p_origin,
        "kind": "portfolio",
    }
    for item in entries:
        accepted = accept_host_map_entry(
            str(item.get("host") or ""),
            str(item.get("origin") or ""),
        )
        if accepted is None:
            continue
        host, origin = accepted
        if host == p_host:
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
