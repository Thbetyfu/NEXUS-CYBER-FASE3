"""Turn HTTP evidence into live verdicts. WAF 403 is a blue-team win."""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import List, Optional, Tuple

from agents.planner.plan import LiveCheck
from agents.runtime.http import HttpEvidence, SafeHttpClient
from agents.verify.posture import looks_like_sensitive_record
from core.config import config
from core.types import Evidence, FindingSeverity, FindingSource, LiveVerdict, VulnerabilityFinding

LAB_SESSION_PAIR_PATH = "/nexred/lab/session-pair"


@dataclass(frozen=True)
class _AccountPair:
    owner_token: str
    peer_token: str
    object_path: str


def _nexus_block(ev: HttpEvidence) -> bool:
    if ev.status == 403:
        return True
    return ev.nexus_header


def _parse_session_pair(body: str) -> Optional[_AccountPair]:
    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        return None
    if not isinstance(data, dict):
        return None
    owner = data.get("owner_token")
    peer = data.get("peer_token")
    path = data.get("object_path")
    if not isinstance(owner, str) or not isinstance(peer, str) or not isinstance(path, str):
        return None
    if not owner or not peer or not path.startswith("/"):
        return None
    return _AccountPair(owner_token=owner, peer_token=peer, object_path=path)


def _resolve_account_pair(client: SafeHttpClient) -> Optional[_AccountPair]:
    if config.idor_owner_token and config.idor_peer_token and config.idor_object_path.startswith("/"):
        return _AccountPair(config.idor_owner_token, config.idor_peer_token, config.idor_object_path)
    mint = client.request(
        "POST",
        LAB_SESSION_PAIR_PATH,
        json_body={"nexred_posture": "two-account"},
    )
    if mint.error == "host_not_allowed" or mint.status is None:
        return None
    if mint.status != 200:
        return None
    return _parse_session_pair(mint.body)


def _auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def execute_live_checks(target_url: str, checks: List[LiveCheck]) -> Tuple[List[VulnerabilityFinding], int, int]:
    client = SafeHttpClient(target_url)
    findings: List[VulnerabilityFinding] = []
    mitigated = 0
    ran = 0
    for check in checks:
        if check.check == "cross_account_object_read":
            extra, extra_ran, extra_mitigated = _execute_cross_account(client, check)
            findings.extend(extra)
            ran += extra_ran
            mitigated += extra_mitigated
            continue
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
        if check.check == "unauthenticated_object_read":
            if ev.status in {401, 403}:
                findings.append(_finding(check, ev, LiveVerdict.REJECTED, FindingSeverity.INFO, "Object read without a session was denied"))
            elif looks_like_sensitive_record(ev.status, ev.body):
                findings.append(_finding(check, ev, LiveVerdict.CONFIRMED, FindingSeverity.HIGH, "Object JSON with account fields was returned with no session"))
            else:
                findings.append(_finding(check, ev, LiveVerdict.SAST_ONLY, FindingSeverity.LOW, "Unauthenticated object GET recorded; no account fields in the body"))
            continue
        if check.check == "benign_json_no_500" and ev.status is not None and ev.status < 500:
            findings.append(_finding(check, ev, LiveVerdict.REJECTED, FindingSeverity.INFO, "Benign JSON did not crash the app"))
    return findings, ran, mitigated


def _execute_cross_account(
    client: SafeHttpClient, check: LiveCheck
) -> Tuple[List[VulnerabilityFinding], int, int]:
    """Owner vs peer GET of the same object. Tokens never appear in findings."""
    ran = 1
    pair = _resolve_account_pair(client)
    if pair is None:
        dummy = HttpEvidence("POST", LAB_SESSION_PAIR_PATH, 404, False, body="")
        return (
            [
                _finding(
                    check,
                    dummy,
                    LiveVerdict.SAST_ONLY,
                    FindingSeverity.INFO,
                    "Two-account lab pair not available (no session-pair JSON or env tokens)",
                )
            ],
            ran,
            0,
        )
    owner_ev = client.request("GET", pair.object_path, headers=_auth_header(pair.owner_token))
    ran += 1
    peer_ev = client.request("GET", pair.object_path, headers=_auth_header(pair.peer_token))
    ran += 1
    if owner_ev.error == "host_not_allowed" or peer_ev.error == "host_not_allowed":
        return [], ran, 0
    if peer_ev.status == 403 and _nexus_block(peer_ev) and (peer_ev.nexus_header or False):
        return (
            [
                _finding(
                    check,
                    peer_ev,
                    LiveVerdict.MITIGATED_BY_NEXUS,
                    FindingSeverity.INFO,
                    "Peer object read blocked at the edge",
                )
            ],
            ran,
            1,
        )
    if owner_ev.status != 200:
        return (
            [
                _finding(
                    check,
                    owner_ev,
                    LiveVerdict.SAST_ONLY,
                    FindingSeverity.INFO,
                    "Owner session could not read the lab object; two-account check skipped",
                )
            ],
            ran,
            0,
        )
    if peer_ev.status in {401, 403, 404}:
        return (
            [
                _finding(
                    check,
                    peer_ev,
                    LiveVerdict.REJECTED,
                    FindingSeverity.INFO,
                    "Peer session could not read the owner's object",
                )
            ],
            ran,
            0,
        )
    if peer_ev.status in {200, 201}:
        return (
            [
                _finding(
                    check,
                    peer_ev,
                    LiveVerdict.CONFIRMED,
                    FindingSeverity.HIGH,
                    "Peer session read the owner's object (broken access control)",
                )
            ],
            ran,
            0,
        )
    return (
        [
            _finding(
                check,
                peer_ev,
                LiveVerdict.SAST_ONLY,
                FindingSeverity.LOW,
                "Two-account object read recorded an inconclusive status",
            )
        ],
        ran,
        0,
    )


def _finding(check: LiveCheck, ev: HttpEvidence, verdict: LiveVerdict, severity: FindingSeverity, title: str) -> VulnerabilityFinding:
    status = ev.status if ev.status is not None else 0
    idor = check.check in {"cross_account_object_read", "unauthenticated_object_read"}
    return VulnerabilityFinding(
        id=f"NEXRED-LIVE-{check.hypothesis_id[:8]}-{ran_token(check)}",
        title=title,
        severity=severity,
        cwe_id="CWE-639" if idor else ("CWE-306" if check.check == "unauthenticated_mutating_route" else None),
        owasp_category="A01:2021-Broken Access Control" if idor else "A07:2021-Identification and Authentication Failures",
        target_endpoint=ev.url,
        param_or_source=check.check,
        proof_of_concept=f"{ev.method} {ev.url} → {ev.status or ev.error}",
        remediation=(
            "Authorize object reads by resource owner; a second session must not receive another user's record."
            if idor
            else "Keep mutating and operator APIs off the public WAF listener; require a session on the control plane."
        ),
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
