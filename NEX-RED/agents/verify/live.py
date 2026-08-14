"""Turn HTTP evidence into live verdicts. WAF 403 is a blue-team win."""

from __future__ import annotations

from typing import List, Tuple

from agents.planner.plan import LiveCheck
from agents.runtime.http import HttpEvidence, SafeHttpClient
from core.types import Evidence, FindingSeverity, FindingSource, LiveVerdict, VulnerabilityFinding


def _nexus_block(ev: HttpEvidence) -> bool:
    if ev.status == 403:
        return True
    return ev.nexus_header


def execute_live_checks(target_url: str, checks: List[LiveCheck]) -> Tuple[List[VulnerabilityFinding], int, int]:
    client = SafeHttpClient(target_url)
    findings: List[VulnerabilityFinding] = []
    mitigated = 0
    ran = 0
    for check in checks:
        body = {"nexred_posture": "benign-check"} if check.method != "GET" else None
        ev = client.request(check.method, check.path, json_body=body)
        ran += 1
        if ev.error == "host_not_allowed":
            continue
        if _nexus_block(ev):
            mitigated += 1
            findings.append(_finding(check, ev, LiveVerdict.MITIGATED_BY_NEXUS, FindingSeverity.INFO, "Edge returned a defensive block"))
            continue
        if check.check == "benign_json_no_500" and ev.status is not None and ev.status >= 500:
            findings.append(_finding(check, ev, LiveVerdict.CONFIRMED, FindingSeverity.MEDIUM, "Benign JSON produced a server error"))
            continue
        if check.check == "unauthenticated_mutating_route":
            if ev.status in {401, 403}:
                findings.append(_finding(check, ev, LiveVerdict.REJECTED, FindingSeverity.INFO, "Mutating route rejected unauthenticated request"))
            elif ev.status in {200, 201, 204}:
                findings.append(_finding(check, ev, LiveVerdict.CONFIRMED, FindingSeverity.HIGH, "Mutating route accepted a request with no session"))
            else:
                findings.append(_finding(check, ev, LiveVerdict.SAST_ONLY, FindingSeverity.LOW, "Live status recorded; not a session-or-block outcome"))
            continue
        if check.check == "request_without_authorization" and check.path.startswith("/api/telemetry"):
            if ev.status in {200, 201} and ev.status is not None:
                findings.append(_finding(check, ev, LiveVerdict.CONFIRMED, FindingSeverity.HIGH, "Operator telemetry reachable without a control-plane session"))
            else:
                findings.append(_finding(check, ev, LiveVerdict.REJECTED, FindingSeverity.INFO, "Public path did not expose operator telemetry"))
            continue
        if check.check == "benign_json_no_500" and ev.status is not None and ev.status < 500:
            findings.append(_finding(check, ev, LiveVerdict.REJECTED, FindingSeverity.INFO, "Benign JSON did not crash the app"))
    return findings, ran, mitigated


def _finding(check: LiveCheck, ev: HttpEvidence, verdict: LiveVerdict, severity: FindingSeverity, title: str) -> VulnerabilityFinding:
    status = ev.status if ev.status is not None else 0
    return VulnerabilityFinding(
        id=f"NEXRED-LIVE-{check.hypothesis_id[:8]}-{ran_token(check)}",
        title=title,
        severity=severity,
        cwe_id="CWE-306" if check.check == "unauthenticated_mutating_route" else None,
        owasp_category="A07:2021-Identification and Authentication Failures",
        target_endpoint=ev.url,
        param_or_source=check.check,
        proof_of_concept=f"{ev.method} {ev.url} → {ev.status or ev.error}",
        remediation="Keep mutating and operator APIs off the public WAF listener; require a session on the control plane.",
        mitigated_by_nexus=verdict == LiveVerdict.MITIGATED_BY_NEXUS,
        defense_layer="WAF" if verdict == LiveVerdict.MITIGATED_BY_NEXUS else None,
        source=FindingSource.LIVE_HTTP,
        confidence=0.7 if verdict == LiveVerdict.CONFIRMED else 0.55,
        live_verdict=verdict,
        evidence=[
            Evidence(
                kind="http_status",
                summary=title,
                http_status=status or None,
                snippet=f"{ev.method} {check.path}",
            )
        ],
    )


def ran_token(check: LiveCheck) -> str:
    return f"{check.method}-{check.path}".replace("/", "_")[:24]
