"""Host allow-list for live HTTP. Blocks metadata and off-lab targets."""

from __future__ import annotations

from urllib.parse import urlparse

from core.config import config

_BLOCKED_HOSTS = {
    "169.254.169.254",
    "metadata.google.internal",
    "metadata.google.com",
}


def hostname_of(url: str) -> str:
    return (urlparse(url).hostname or "").lower()


def allowed_hosts_for(target_url: str) -> set[str]:
    hosts = {"127.0.0.1", "localhost", "::1"}
    for candidate in (target_url, config.live_target, config.gateway_url):
        host = hostname_of(candidate)
        if host:
            hosts.add(host)
    return hosts


def is_url_allowed(url: str, target_url: str) -> bool:
    host = hostname_of(url)
    if not host or host in _BLOCKED_HOSTS:
        return False
    return host in allowed_hosts_for(target_url)
