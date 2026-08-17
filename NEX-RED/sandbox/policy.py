"""Host allow-list for live HTTP. Blocks metadata and off-lab targets."""

from __future__ import annotations

import ipaddress
import os
from urllib.parse import urlparse

from core.config import config

_BLOCKED_HOSTS = {
    "169.254.169.254",
    "metadata.google.internal",
    "metadata.google.com",
}

_LAB_ORIGIN_NAMES = {
    "portfolio",
    "host.docker.internal",
    "nexus-local-portfolio",
    "gateway",
}


def hostname_of(url: str) -> str:
    return (urlparse(url).hostname or "").lower()


def is_lab_origin_url(url: str) -> bool:
    """Twin origin may only be loopback, RFC1918, or a lab Docker service name."""
    parsed = urlparse((url or "").strip())
    if parsed.scheme != "http" or not parsed.netloc:
        return False
    host = (parsed.hostname or "").lower()
    if not host or host in _BLOCKED_HOSTS:
        return False
    if host in {"127.0.0.1", "localhost", "::1"} | _LAB_ORIGIN_NAMES:
        return True
    try:
        ip = ipaddress.ip_address(host)
    except ValueError:
        return False
    return ip.is_loopback or ip.is_private


def resolve_lab_origin(explicit: str | None = None) -> str | None:
    raw = (explicit if explicit is not None else os.getenv("NEX_RED_ORIGIN_DIRECT", "")).strip()
    if not raw:
        return None
    return raw.rstrip("/") if is_lab_origin_url(raw) else None


def allowed_hosts_for(target_url: str) -> set[str]:
    hosts = {"127.0.0.1", "localhost", "::1"}
    origin = resolve_lab_origin()
    for candidate in (target_url, config.live_target, config.gateway_url, origin or ""):
        host = hostname_of(candidate)
        if host:
            hosts.add(host)
    return hosts


def is_url_allowed(url: str, target_url: str) -> bool:
    host = hostname_of(url)
    if not host or host in _BLOCKED_HOSTS:
        return False
    return host in allowed_hosts_for(target_url)
