"""
HTTP surface mapper.

Maps reachable paths, forms, and security headers on a live target.
This is reconnaissance / posture checking, not exploitation.
"""

from __future__ import annotations

import re
from typing import List, Set
from urllib.parse import urljoin, urlparse

import requests

from core.config import config
from core.types import Evidence, FindingSeverity, FindingSource, VulnerabilityFinding


_LINK_RE = re.compile(r"""(?:href|action|src)\s*=\s*["']([^"']+)["']""", re.IGNORECASE)
_SECURITY_HEADERS = (
    "content-security-policy",
    "strict-transport-security",
    "x-content-type-options",
    "x-frame-options",
)


class SurfaceMapper:
    def __init__(self, target_url: str, timeout: int = 10):
        self.target_url = target_url.rstrip("/")
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": config.user_agent})
        self.discovered_paths: List[str] = []
        self.waf_detected = False
        self.reachable = False
        self.last_status: int = 0
        self.probes = 0

    def map(self) -> List[VulnerabilityFinding]:
        findings: List[VulnerabilityFinding] = []
        try:
            resp = self.session.get(self.target_url, timeout=self.timeout, allow_redirects=True)
            self.probes += 1
            self.reachable = True
            self.last_status = resp.status_code
        except requests.RequestException:
            return findings

        headers = {k.lower(): v for k, v in resp.headers.items()}
        if "nexus" in headers.get("server", "").lower() or headers.get("x-nexus-shield"):
            self.waf_detected = True

        paths: Set[str] = {"/"}
        for match in _LINK_RE.findall(resp.text or ""):
            if match.startswith("#") or match.startswith("mailto:"):
                continue
            absolute = urljoin(self.target_url + "/", match)
            parsed = urlparse(absolute)
            if parsed.netloc and parsed.netloc != urlparse(self.target_url).netloc:
                continue
            if parsed.path:
                paths.add(parsed.path)
        self.discovered_paths = sorted(paths)[:80]

        missing = [name for name in _SECURITY_HEADERS if name not in headers]
        if missing:
            findings.append(
                VulnerabilityFinding(
                    id="NEXRED-HDR-001",
                    title="Missing browser security headers",
                    severity=FindingSeverity.LOW,
                    cwe_id="CWE-693",
                    owasp_category="A05:2021-Security Misconfiguration",
                    target_endpoint=self.target_url,
                    param_or_source=",".join(missing),
                    proof_of_concept=f"GET {self.target_url} returned {self.last_status}; missing headers: {', '.join(missing)}",
                    remediation="Set CSP, HSTS, X-Content-Type-Options, and X-Frame-Options on the edge proxy.",
                    source=FindingSource.RECON,
                    confidence=0.9,
                    evidence=[
                        Evidence(
                            kind="http_headers",
                            summary="Missing security headers on base URL",
                            http_status=self.last_status,
                            snippet=",".join(missing),
                        )
                    ],
                )
            )
        return findings
