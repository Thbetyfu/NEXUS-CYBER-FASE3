"""Generic HTTP client. Allow-listed hosts only. Redacts secrets in evidence."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping, Optional
from urllib.parse import urljoin, urlparse

import requests

from core.config import config
from sandbox.policy import is_url_allowed


_REDACT = {"authorization", "cookie", "set-cookie", "x-nexus-admin-token", "x-csrf-token"}


@dataclass
class HttpEvidence:
    method: str
    url: str
    status: Optional[int]
    nexus_header: bool
    error: Optional[str] = None


def _join(base: str, path: str) -> str:
    return urljoin(base.rstrip("/") + "/", path.lstrip("/"))


class SafeHttpClient:
    def __init__(self, target_url: str, timeout: int = 10):
        self.target_url = target_url.rstrip("/")
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": config.user_agent})

    def request(self, method: str, path: str, json_body: Optional[Mapping[str, Any]] = None) -> HttpEvidence:
        url = path if path.startswith("http") else _join(self.target_url, path)
        if not is_url_allowed(url, self.target_url):
            return HttpEvidence(method=method.upper(), url=url, status=None, nexus_header=False, error="host_not_allowed")
        try:
            resp = self.session.request(
                method.upper(),
                url,
                json=dict(json_body) if json_body else None,
                timeout=self.timeout,
                allow_redirects=False,
            )
            nexus = bool(resp.headers.get("X-Nexus-Shield") or resp.headers.get("X-Nexus-Waf"))
            return HttpEvidence(
                method=method.upper(),
                url=url,
                status=resp.status_code,
                nexus_header=nexus,
            )
        except requests.RequestException as exc:
            return HttpEvidence(method=method.upper(), url=url, status=None, nexus_header=False, error=type(exc).__name__)


def redact_headers(headers: Mapping[str, str]) -> dict[str, str]:
    out = {}
    for key, value in headers.items():
        if key.lower() in _REDACT:
            out[key] = "[redacted]"
        else:
            out[key] = value
    return out


def same_origin(url: str, target: str) -> bool:
    a, b = urlparse(url), urlparse(target)
    return (a.hostname or "").lower() == (b.hostname or "").lower()
