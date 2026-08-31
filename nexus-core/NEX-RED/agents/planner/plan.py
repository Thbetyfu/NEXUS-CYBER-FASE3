"""Live-check plans from SAST hypotheses. Optional LLM JSON; no exploit payloads."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Iterable, List, Optional

from core.config import config
from core.types import VulnerabilityFinding

_ROUTE_RE = re.compile(r"""['"](/[^'"]*)['"]""")
_UNSAFE_PATH = re.compile(
    r"""(?:union\s+select|'|--|<|>|https?:|\\|\s)""",
    re.IGNORECASE,
)

ALLOWED_CHECKS = {
    "public_get": ("GET", "record_status"),
    "benign_json_no_500": ("POST", "no_unhandled_500"),
    "request_without_authorization": ("GET", "unauthenticated_request_recorded"),
    "unauthenticated_mutating_route": ("POST", "expect_401_403_or_nexus_block"),
    "unauthenticated_object_read": ("GET", "must_not_read_object_without_session"),
    "cross_account_object_read": ("GET", "peer_must_not_read_owner_object"),
    "antibody_signal": ("GET", "count_only_lab_signal"),
    "antibody_vaccine_probe": ("POST", "lab_vaccine_then_replay"),
}

CHECK_ALIASES = {
    "verify_jwt_rejects_unverified": "request_without_authorization",
    "mutating_route_requires_auth": "unauthenticated_mutating_route",
    "idor_object_without_session": "unauthenticated_object_read",
}


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


def sanitize_path(path: str) -> str | None:
    if not path or not path.startswith("/") or len(path) > 128:
        return None
    if _UNSAFE_PATH.search(path):
        return None
    return path


def normalize_check_name(name: str) -> str | None:
    key = (name or "").strip()
    key = CHECK_ALIASES.get(key, key)
    if key not in ALLOWED_CHECKS:
        return None
    return key


def live_check_from_json(item: dict) -> LiveCheck | None:
    check = normalize_check_name(str(item.get("check") or ""))
    path = sanitize_path(str(item.get("endpoint") or item.get("path") or ""))
    if not check or not path:
        return None
    method, default_stop = ALLOWED_CHECKS[check]
    hypo = str(item.get("hypothesis_id") or "llm")[:64]
    stop = str(item.get("stop_condition") or default_stop)[:120]
    return LiveCheck(hypo, check, method, path, stop)


def _deterministic_live_checks(
    findings: Iterable[VulnerabilityFinding], extra_paths: Iterable[str] | None = None
) -> List[LiveCheck]:
    steps: List[LiveCheck] = [
        LiveCheck("baseline", "public_get", "GET", "/", "record_status"),
        LiveCheck("baseline", "benign_json_no_500", "POST", "/api/unlock-reward", "no_unhandled_500"),
        LiveCheck("soc-split", "request_without_authorization", "GET", "/api/telemetry", "must_not_be_operator_api"),
        LiveCheck(
            "idor-two-accounts",
            "cross_account_object_read",
            "GET",
            "/nexred/lab/session-pair",
            "peer_must_not_read_owner_object",
        ),
        LiveCheck("antibody-signal", "antibody_signal", "GET", "/nexred/lab/antibody-signal", "count_only_lab_signal"),
        LiveCheck(
            "antibody-loop",
            "antibody_vaccine_probe",
            "POST",
            "/nexred/lab/vaccine-probe",
            "lab_vaccine_then_replay",
        ),
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
        if finding.cwe_id == "CWE-639" and route and route != "/nexred/lab/session-pair":
            key = ("GET", route)
            if key not in seen:
                seen.add(key)
                steps.append(
                    LiveCheck(
                        finding.id,
                        "unauthenticated_object_read",
                        "GET",
                        route,
                        "must_not_read_object_without_session",
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


def merge_live_checks(base: List[LiveCheck], extra: Iterable[LiveCheck]) -> List[LiveCheck]:
    seen = {(item.method, item.path, item.check) for item in base}
    out = list(base)
    for item in extra:
        key = (item.method, item.path, item.check)
        if key in seen:
            continue
        seen.add(key)
        out.append(item)
        if len(out) >= config.max_live_steps:
            break
    return out[: config.max_live_steps]


def plan_live_checks(
    findings: Iterable[VulnerabilityFinding],
    extra_paths: Iterable[str] | None = None,
    *,
    enable_llm: bool = False,
    llm_client: Optional[object] = None,
) -> List[LiveCheck]:
    steps = _deterministic_live_checks(findings, extra_paths)
    if not enable_llm:
        return steps
    from agents.planner.llm_plan import propose_llm_checks

    extra = propose_llm_checks(findings, extra_paths, client=llm_client)
    if not extra:
        return steps
    return merge_live_checks(steps, extra)
