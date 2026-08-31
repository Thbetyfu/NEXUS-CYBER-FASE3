"""Connect Job/live HTTP to the WAF listener; send Host of the protected kanal.

Named hosts such as portfolio.nexus-lab.test often do not resolve on Windows lab PCs.
TCP goes to NEXUS_GATEWAY_URL (or NEX_RED_LIVE_TARGET when that URL is already loopback:port).
The origin twin (NEX_RED_ORIGIN_DIRECT) must not call this with edge=True.

Chromium cannot set Host the way requests does (forbidden header → net::ERR_INVALID_ARGUMENT).
bind_waf_browser() MAP-s the kanal name to the WAF IP so Playwright does not need a hosts file.
"""

from __future__ import annotations

import ipaddress
import re
from dataclasses import dataclass
from urllib.parse import urlparse, urlunparse

from core.config import config
from sandbox.policy import is_docker_origin_hostname

# Chromium --host-resolver-rules MAP token; reject anything that could split the arg.
_CHROMIUM_MAP_HOST = re.compile(r"^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$")


def normalize_protected_host(raw: str | None) -> str:
    s = (raw or "").strip().lower()
    if not s or s == "all":
        return ""
    if "://" in s:
        parsed = urlparse(s)
        s = (parsed.hostname or "").lower()
    elif "/" in s:
        s = s.split("/", 1)[0]
    if s.startswith("[") and "]" in s:
        s = s[1 : s.index("]")]
    if ":" in s and not s.count(":") > 1:
        host, _, port = s.rpartition(":")
        if port.isdigit():
            s = host
    return s.strip(".")


def is_loopback_or_ip(host: str) -> bool:
    h = (host or "").lower().strip("[]")
    if not h:
        return False
    if h in {"localhost", "127.0.0.1", "::1"}:
        return True
    try:
        ipaddress.ip_address(h)
        return True
    except ValueError:
        return False


def tcp_edge_base() -> str:
    """WAF listener. Named NEX_RED_LIVE_TARGET is not a TCP address — use gateway_url."""
    live = (config.live_target or "").strip()
    parsed = urlparse(live)
    host = (parsed.hostname or "").lower()
    if host and is_loopback_or_ip(host) and parsed.port:
        return live.rstrip("/")
    return (config.gateway_url or "http://127.0.0.1:8080").rstrip("/")


def bind_waf_edge(
    target_url: str,
    protected_host: str | None = None,
    *,
    edge: bool = True,
) -> tuple[str, dict[str, str]]:
    """Return (connect_url, extra_headers). Origin probes must pass edge=False."""
    raw = (target_url or "").strip()
    if not raw:
        return "", {}
    if not edge:
        return raw.rstrip("/"), {}
    parsed = urlparse(raw)
    if parsed.scheme not in {"http", "https"}:
        return raw.rstrip("/"), {}
    tcp_host = (parsed.hostname or "").lower()
    if is_docker_origin_hostname(tcp_host):
        return raw.rstrip("/"), {}

    virtual = normalize_protected_host(protected_host)
    if not virtual and tcp_host and not is_loopback_or_ip(tcp_host):
        virtual = tcp_host
    if not virtual or is_loopback_or_ip(virtual):
        return raw.rstrip("/"), {}

    headers = {"Host": virtual}
    if tcp_host and is_loopback_or_ip(tcp_host):
        return raw.rstrip("/"), headers

    edge_p = urlparse(tcp_edge_base())
    path = parsed.path or "/"
    bound = urlunparse(
        (edge_p.scheme or "http", edge_p.netloc, path, "", parsed.query, "")
    )
    if path == "/" and not parsed.query:
        bound = bound.rstrip("/")
    return bound, headers


@dataclass(frozen=True)
class BrowserWafBind:
    """How Chromium opens the WAF without DNS for the protected hostname."""

    navigate_url: str
    chromium_args: tuple[str, ...]
    extra_headers: dict[str, str]
    logical_host: str


def _slash_like_target(target_url: str, url: str) -> str:
    raw = (target_url or "").strip()
    if not raw.endswith("/") or urlparse(url).query:
        return url
    if url.endswith("/"):
        return url
    return url + "/"


def _map_ip(host: str) -> str | None:
    h = (host or "").strip("[]")
    if h in {"localhost"}:
        return "127.0.0.1"
    try:
        ip = ipaddress.ip_address(h)
    except ValueError:
        return None
    return str(ip)


def bind_waf_browser(
    target_url: str,
    protected_host: str | None = None,
) -> BrowserWafBind:
    """Navigate URL + Chromium MAP args. Same TCP as bind_waf_edge; named host stays in the URL."""
    connect, headers = bind_waf_edge(target_url, protected_host, edge=True)
    virtual = (headers.get("Host") or "").lower()
    extra = dict(headers)
    if not connect:
        return BrowserWafBind("", (), extra, virtual)

    if not virtual or not _CHROMIUM_MAP_HOST.fullmatch(virtual):
        return BrowserWafBind(_slash_like_target(target_url, connect), (), extra, virtual)

    edge = urlparse(tcp_edge_base())
    ip = _map_ip(edge.hostname or "")
    if not ip:
        return BrowserWafBind(_slash_like_target(target_url, connect), (), extra, virtual)

    scheme = edge.scheme or "http"
    port = edge.port
    if port is None:
        port = 443 if scheme == "https" else 80
    parsed = urlparse(connect)
    path = parsed.path or "/"
    default_port = 443 if scheme == "https" else 80
    netloc = virtual if port == default_port else f"{virtual}:{port}"
    nav = urlunparse((scheme, netloc, path, "", parsed.query, ""))
    args = (f"--host-resolver-rules=MAP {virtual} {ip}",)
    return BrowserWafBind(_slash_like_target(target_url, nav), args, extra, virtual)
