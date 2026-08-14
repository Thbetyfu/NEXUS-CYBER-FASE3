"""Deterministic live-check plans from SAST hypotheses. No exploit payloads."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Iterable, List

from core.config import config
from core.types import VulnerabilityFinding

_ROUTE_RE = re.compile(r"""['"](/[^'"]*)['"]""")


@dataclass(frozen=True)
class LiveCheck:
    hypothesis_id: str
    check: str
    method: str
    path: str
    stop_condition: str


def _route_from_finding(finding: VulnerabilityFinding) -> str | None:
    blob = " ".join(
        part
        for part in (
            finding.param_or_source,
            finding.proof_of_concept,
            *(item.snippet or "" for item in finding.evidence),
        )
        if part
    )
    match = _ROUTE_RE.search(blob)
    if not match:
        return None
    path = match.group(1)
    if "<" in path:
        path = re.sub(r"<[^>]+>", "1", path)
    return path


def plan_live_checks(findings: Iterable[VulnerabilityFinding], extra_paths: Iterable[str] | None = None) -> List[LiveCheck]:
    steps: List[LiveCheck] = [
        LiveCheck("baseline", "public_get", "GET", "/", "record_status"),
        LiveCheck("baseline", "benign_json_no_500", "POST", "/api/unlock-reward", "no_unhandled_500"),
        LiveCheck("soc-split", "request_without_authorization", "GET", "/api/telemetry", "must_not_be_operator_api"),
    ]
    seen = {(item.method, item.path) for item in steps}
    for finding in findings:
        route = _route_from_finding(finding)
        if finding.cwe_id == "CWE-306" and route:
            key = ("POST", route)
            if key not in seen:
                seen.add(key)
                steps.append(
                    LiveCheck(
                        finding.id,
                        "unauthenticated_mutating_route",
                        "POST",
                        route,
                        "expect_401_403_or_nexus_block",
                    )
                )
        if finding.cwe_id == "CWE-347" and ("GET", "/api/login") not in seen:
            seen.add(("GET", "/api/login"))
            steps.append(
                LiveCheck(
                    finding.id,
                    "request_without_authorization",
                    "GET",
                    "/api/login",
                    "unauthenticated_request_recorded",
                )
            )
    for path in extra_paths or []:
        if not path.startswith("/"):
            continue
        key = ("GET", path)
        if key in seen:
            continue
        seen.add(key)
        steps.append(LiveCheck("recon", "public_get", "GET", path, "record_status"))
        if len(steps) >= config.max_live_steps:
            break
    return steps[: config.max_live_steps]
