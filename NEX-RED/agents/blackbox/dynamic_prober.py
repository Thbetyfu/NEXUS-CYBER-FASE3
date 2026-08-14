"""
NEX-RED black-box posture prober.

Checks reachability and whether the edge returns defensive responses on
application JSON posts. Does not send exploit payloads.
"""

from __future__ import annotations

from typing import Iterable, List
from urllib.parse import urljoin

import requests

from core.config import config
from core.types import Evidence, FindingSeverity, FindingSource, VulnerabilityFinding


class DynamicBlackboxProber:
    def __init__(self, target_url: str, timeout: int = 10):
        self.target_url = target_url.rstrip("/")
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": config.user_agent})
        self.findings: List[VulnerabilityFinding] = []
        self.total_probes: int = 0
        self.mitigated_by_nexus: int = 0

    def run_dynamic_suite(self, paths: Iterable[str] | None = None) -> List[VulnerabilityFinding]:
        self._probe_health()
        targets = list(paths) if paths else ["/"]
        extra = ["/api/vault/unlock", "/api/login"]
        merged = []
        seen = set()
        for path in list(targets) + extra:
            if path not in seen:
                seen.add(path)
                merged.append(path)
        self._probe_json_posts(merged[:12])
        return self.findings

    def _probe_health(self) -> None:
        self.total_probes += 1
        try:
            resp = self.session.get(self.target_url, timeout=self.timeout)
            if resp.status_code == 403 or resp.headers.get("X-Nexus-Shield"):
                self.mitigated_by_nexus += 1
        except requests.RequestException:
            return

    def _probe_json_posts(self, paths: List[str]) -> None:
        for path in paths:
            url = urljoin(self.target_url + "/", path.lstrip("/"))
            self.total_probes += 1
            try:
                resp = self.session.post(
                    url,
                    json={"nexred_posture": "benign-check"},
                    timeout=self.timeout,
                )
            except requests.RequestException:
                continue
            if resp.status_code == 403 or "blocked" in (resp.text or "").lower():
                self.mitigated_by_nexus += 1
            if resp.status_code >= 500:
                self.findings.append(
                    VulnerabilityFinding(
                        id=f"NEXRED-HTTP-{self.total_probes:03d}",
                        title="Application error on benign JSON POST",
                        severity=FindingSeverity.MEDIUM,
                        cwe_id="CWE-755",
                        owasp_category="A05:2021-Security Misconfiguration",
                        target_endpoint=url,
                        param_or_source="json",
                        proof_of_concept=f"POST {url} with benign JSON returned HTTP {resp.status_code}",
                        remediation="Handle unexpected JSON bodies without 500 responses. Avoid leaking stack traces.",
                        source=FindingSource.WAF_PROBE,
                        confidence=0.5,
                        evidence=[
                            Evidence(
                                kind="http_status",
                                summary="Benign POST returned a server error",
                                http_status=resp.status_code,
                                snippet=f"POST {url}",
                            )
                        ],
                    )
                )
