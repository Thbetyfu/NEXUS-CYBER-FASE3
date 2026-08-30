"""Generic HTTP client. Allow-listed hosts only. Redacts secrets in evidence."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping, Optional
from urllib.parse import urljoin, urlparse

import requests

from agents.runtime.waf_bind import bind_waf_edge
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
    body: str = ""
    antibody_count: Optional[int] = None


def _join(base: str, path: str) -> str:
    return urljoin(base.rstrip("/") + "/", path.lstrip("/"))


class SafeHttpClient:
    def __init__(
        self,
        target_url: str,
        timeout: int = 10,
        *,
        protected_host: str | None = None,
        bind_edge: bool = True,
    ):
        bound, extra = bind_waf_edge(target_url, protected_host, edge=bind_edge)
        self.logical_url = target_url.rstrip("/")
        self.target_url = bound
        self.timeout = timeout
        self._bind_edge = bind_edge
        self._protected_host = protected_host
        self._host_headers = extra
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": config.user_agent})
        if extra:
            self.session.headers.update(extra)

    def request(
        self,
        method: str,
        path: str,
        json_body: Optional[Mapping[str, Any]] = None,
        headers: Optional[Mapping[str, str]] = None,
    ) -> HttpEvidence:
        if path.startswith("http"):
            url, extra = bind_waf_edge(path, self._protected_host, edge=self._bind_edge)
        else:
            url = _join(self.target_url, path)
            extra = self._host_headers
        merged = {**extra, **(dict(headers) if headers else {})}
        if not is_url_allowed(url, self.target_url):
            return HttpEvidence(method=method.upper(), url=url, status=None, nexus_header=False, error="host_not_allowed")
        try:
            resp = self.session.request(
                method.upper(),
                url,
                json=dict(json_body) if json_body else None,
                headers=merged or None,
                timeout=self.timeout,
                allow_redirects=False,
            )
            nexus = bool(resp.headers.get("X-Nexus-Shield") or resp.headers.get("X-Nexus-Waf"))
            text = resp.text[:2048] if resp.text else ""
            count = None
            raw_count = resp.headers.get("X-Nexus-Antibody-Count")
            if raw_count and raw_count.isdigit():
                count = int(raw_count)
            return HttpEvidence(
                method=method.upper(),
                url=url,
                status=resp.status_code,
                nexus_header=nexus,
                body=text,
                antibody_count=count,
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
