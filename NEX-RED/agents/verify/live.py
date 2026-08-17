"""Turn HTTP evidence into live verdicts. WAF 403 is a blue-team win."""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import List, Optional, Tuple

from agents.planner.plan import LiveCheck
from agents.runtime.http import HttpEvidence, SafeHttpClient
from agents.verify.posture import looks_like_sensitive_record
from core.config import config
from core.types import DefenseDelta, Evidence, FindingSeverity, FindingSource, LiveVerdict, VulnerabilityFinding
from sandbox.policy import resolve_lab_origin

LAB_SESSION_PAIR_PATH = "/nexred/lab/session-pair"
LAB_ANTIBODY_SIGNAL_PATH = "/nexred/lab/antibody-signal"
LAB_VACCINE_PATH = "/nexred/lab/vaccine-probe"


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


def _app_held(ev: HttpEvidence) -> bool:
    return ev.status in {401, 403} or _nexus_block(ev)


def _origin_looks_open(ev: HttpEvidence) -> bool:
    if ev.error or ev.status is None:
        return False
    return ev.status < 400 and not _nexus_block(ev)


def classify_defense_delta(
    waf: HttpEvidence,
    origin: Optional[HttpEvidence] = None,
    replay: Optional[HttpEvidence] = None,
) -> Optional[DefenseDelta]:
    """Compare edge vs optional origin vs replay. Benign HTTP only."""
    waf_edge = _nexus_block(waf)
    if waf_edge and replay is not None:
        if _nexus_block(replay):
            return DefenseDelta.REPLAY_HELD
        return DefenseDelta.REPLAY_MISSED
    if waf_edge and origin is not None and _origin_looks_open(origin):
        return DefenseDelta.WAF_BLOCKED
    if waf_edge and origin is None:
        return DefenseDelta.WAF_BLOCKED
    if not _app_held(waf) and origin is not None and _origin_looks_open(origin):
        return DefenseDelta.ORIGIN_OPEN
    if _app_held(waf) and (origin is None or _app_held(origin) or origin.error):
        return DefenseDelta.BOTH_HELD
    return None


def antibody_loop_ok(findings: List[VulnerabilityFinding]) -> Optional[bool]:
    """True when the lab vaccine probe proved a stored antibody and replay still blocked."""
    if any(item.defense_delta == DefenseDelta.REPLAY_MISSED for item in findings):
        return False
    vaccine = [item for item in findings if item.param_or_source == "antibody_vaccine_probe"]
    if vaccine:
        if any(item.defense_delta == DefenseDelta.ANTIBODY_LEARNED for item in vaccine):
            return True
        if all(item.live_verdict == LiveVerdict.SAST_ONLY for item in vaccine):
            return None
        return False
    blocked = [item for item in findings if item.live_verdict == LiveVerdict.MITIGATED_BY_NEXUS]
    if not blocked:
        return None
    return all(item.defense_delta == DefenseDelta.REPLAY_HELD for item in blocked)


def _probe_origin(
    origin_base: Optional[str],
    method: str,
    path: str,
    json_body: Optional[dict],
    headers: Optional[dict] = None,
) -> Optional[HttpEvidence]:
    if not origin_base:
        return None
    return SafeHttpClient(origin_base).request(method, path, json_body=json_body, headers=headers)


def execute_live_checks(
    target_url: str,
    checks: List[LiveCheck],
    origin_url: Optional[str] = None,
) -> Tuple[List[VulnerabilityFinding], int, int]:
    client = SafeHttpClient(target_url)
    origin_base = resolve_lab_origin(origin_url)
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
        if check.check == "antibody_signal":
            extra, extra_ran, extra_mitigated = _execute_antibody_signal(client, check)
            findings.extend(extra)
            ran += extra_ran
            mitigated += extra_mitigated
            continue
        if check.check == "antibody_vaccine_probe":
            extra, extra_ran, extra_mitigated = _execute_antibody_vaccine(client, check)
            findings.extend(extra)
            ran += extra_ran
            mitigated += extra_mitigated
            continue
        body = {"nexred_posture": "benign-check"} if check.method != "GET" else None
        ev = client.request(check.method, check.path, json_body=body)
        ran += 1
        if ev.error == "host_not_allowed":
            continue
        origin_ev = _probe_origin(origin_base, check.method, check.path, body)
        if origin_ev is not None:
            ran += 1
        replay_ev = None
        if _nexus_block(ev):
            replay_ev = client.request(check.method, check.path, json_body=body)
            ran += 1
        delta = classify_defense_delta(ev, origin_ev, replay_ev)
        if _nexus_block(ev):
            mitigated += 1
            title = "Edge returned a defensive block"
            if delta == DefenseDelta.REPLAY_MISSED:
                title = "Edge blocked once, then allowed the same benign request (antibody loop missed)"
            findings.append(
                _finding(
                    check,
                    ev,
                    LiveVerdict.MITIGATED_BY_NEXUS,
                    FindingSeverity.INFO if delta != DefenseDelta.REPLAY_MISSED else FindingSeverity.MEDIUM,
                    title,
                    origin_ev=origin_ev,
                    replay_ev=replay_ev,
                    delta=delta,
                )
            )
            continue
        if check.check == "benign_json_no_500" and ev.status is not None and ev.status >= 500:
            findings.append(
                _finding(
                    check,
                    ev,
                    LiveVerdict.CONFIRMED,
                    FindingSeverity.MEDIUM,
                    "Benign JSON produced a server error",
                    origin_ev=origin_ev,
                    replay_ev=replay_ev,
                    delta=delta,
                )
            )
            continue
        if check.check == "unauthenticated_mutating_route":
            if ev.status in {401, 403}:
                findings.append(
                    _finding(
                        check,
                        ev,
                        LiveVerdict.REJECTED,
                        FindingSeverity.INFO,
                        "Mutating route rejected unauthenticated request",
                        origin_ev=origin_ev,
                        replay_ev=replay_ev,
                        delta=delta,
                    )
                )
            elif ev.status in {200, 201, 204}:
                findings.append(
                    _finding(
                        check,
                        ev,
                        LiveVerdict.CONFIRMED,
                        FindingSeverity.HIGH,
                        "Mutating route accepted a request with no session",
                        origin_ev=origin_ev,
                        replay_ev=replay_ev,
                        delta=delta,
                    )
                )
            else:
                findings.append(
                    _finding(
                        check,
                        ev,
                        LiveVerdict.SAST_ONLY,
                        FindingSeverity.LOW,
                        "Live status recorded; not a session-or-block outcome",
                        origin_ev=origin_ev,
                        replay_ev=replay_ev,
                        delta=delta,
                    )
                )
            continue
        if check.check == "request_without_authorization" and check.path.startswith("/api/telemetry"):
            if ev.status in {200, 201} and ev.status is not None:
                findings.append(
                    _finding(
                        check,
                        ev,
                        LiveVerdict.CONFIRMED,
                        FindingSeverity.HIGH,
                        "Operator telemetry reachable without a control-plane session",
                        origin_ev=origin_ev,
                        replay_ev=replay_ev,
                        delta=delta,
                    )
                )
            else:
                findings.append(
                    _finding(
                        check,
                        ev,
                        LiveVerdict.REJECTED,
                        FindingSeverity.INFO,
                        "Public path did not expose operator telemetry",
                        origin_ev=origin_ev,
                        replay_ev=replay_ev,
                        delta=delta,
                    )
                )
            continue
        if check.check == "unauthenticated_object_read":
            if ev.status in {401, 403}:
                findings.append(
                    _finding(
                        check,
                        ev,
                        LiveVerdict.REJECTED,
                        FindingSeverity.INFO,
                        "Object read without a session was denied",
                        origin_ev=origin_ev,
                        replay_ev=replay_ev,
                        delta=delta,
                    )
                )
            elif looks_like_sensitive_record(ev.status, ev.body):
                findings.append(
                    _finding(
                        check,
                        ev,
                        LiveVerdict.CONFIRMED,
                        FindingSeverity.HIGH,
                        "Object JSON with account fields was returned with no session",
                        origin_ev=origin_ev,
                        replay_ev=replay_ev,
                        delta=delta,
                    )
                )
            else:
                findings.append(
                    _finding(
                        check,
                        ev,
                        LiveVerdict.SAST_ONLY,
                        FindingSeverity.LOW,
                        "Unauthenticated object GET recorded; no account fields in the body",
                        origin_ev=origin_ev,
                        replay_ev=replay_ev,
                        delta=delta,
                    )
                )
            continue
        if check.check == "benign_json_no_500" and ev.status is not None and ev.status < 500:
            findings.append(
                _finding(
                    check,
                    ev,
                    LiveVerdict.REJECTED,
                    FindingSeverity.INFO,
                    "Benign JSON did not crash the app",
                    origin_ev=origin_ev,
                    replay_ev=replay_ev,
                    delta=delta,
                )
            )
    return findings, ran, mitigated


def _parse_antibody_count(ev: HttpEvidence) -> Optional[int]:
    if ev.antibody_count is not None:
        return ev.antibody_count
    try:
        data = json.loads(ev.body or "")
    except json.JSONDecodeError:
        return None
    if not isinstance(data, dict):
        return None
    raw = data.get("antibody_count")
    if isinstance(raw, bool):
        return None
    if isinstance(raw, int) and raw >= 0:
        return raw
    if isinstance(raw, float) and raw >= 0 and raw == int(raw):
        return int(raw)
    return None


def _execute_antibody_signal(client: SafeHttpClient, check: LiveCheck) -> Tuple[List[VulnerabilityFinding], int, int]:
    ev = client.request("GET", LAB_ANTIBODY_SIGNAL_PATH)
    ran = 1
    if ev.error == "host_not_allowed":
        return [], ran, 0
    if ev.status == 404 or ev.status is None:
        return (
            [
                _finding(
                    check,
                    ev,
                    LiveVerdict.SAST_ONLY,
                    FindingSeverity.INFO,
                    "Lab antibody signal not available on this gateway",
                )
            ],
            ran,
            0,
        )
    body = (ev.body or "").lower()
    if "or 1=1" in body or "union select" in body:
        return (
            [
                _finding(
                    check,
                    ev,
                    LiveVerdict.CONFIRMED,
                    FindingSeverity.HIGH,
                    "Antibody signal body looked like a pattern dump",
                )
            ],
            ran,
            0,
        )
    count = _parse_antibody_count(ev)
    title = "Lab antibody signal returned a count only"
    if count is None:
        title = "Lab antibody signal responded without a parseable count"
    return (
        [
            _finding(
                check,
                ev,
                LiveVerdict.REJECTED,
                FindingSeverity.INFO,
                title,
            )
        ],
        ran,
        0,
    )


def _execute_antibody_vaccine(client: SafeHttpClient, check: LiveCheck) -> Tuple[List[VulnerabilityFinding], int, int]:
    before_ev = client.request("GET", LAB_ANTIBODY_SIGNAL_PATH)
    ran = 1
    before = _parse_antibody_count(before_ev)
    first = client.request("POST", LAB_VACCINE_PATH, json_body={"nexred_posture": "vaccine-probe"})
    ran += 1
    after_ev = client.request("GET", LAB_ANTIBODY_SIGNAL_PATH)
    ran += 1
    after = _parse_antibody_count(after_ev)
    replay = None
    if _nexus_block(first):
        replay = client.request("POST", LAB_VACCINE_PATH, json_body={"nexred_posture": "vaccine-probe"})
        ran += 1
    delta = classify_defense_delta(first, None, replay)
    learned = (
        _nexus_block(first)
        and replay is not None
        and _nexus_block(replay)
        and after is not None
        and after >= 1
        and (before is None or after >= before)
    )
    if learned:
        delta = DefenseDelta.ANTIBODY_LEARNED
    if first.error == "host_not_allowed":
        return [], ran, 0
    if not _nexus_block(first):
        return (
            [
                _finding(
                    check,
                    first,
                    LiveVerdict.SAST_ONLY,
                    FindingSeverity.INFO,
                    "Lab vaccine probe did not reach a WAF block (gateway may be older than this NEX-RED)",
                    replay_ev=replay,
                    delta=delta,
                )
            ],
            ran,
            0,
        )
    if delta == DefenseDelta.REPLAY_MISSED:
        return (
            [
                _finding(
                    check,
                    first,
                    LiveVerdict.MITIGATED_BY_NEXUS,
                    FindingSeverity.MEDIUM,
                    "Lab vaccine blocked once, then the same probe was allowed (antibody loop missed)",
                    replay_ev=replay,
                    delta=delta,
                )
            ],
            ran,
            1,
        )
    title = "Lab vaccine stored an antibody count and replay stayed blocked"
    if not learned:
        title = "Lab vaccine blocked on replay without a rising antibody count"
    return (
        [
            _finding(
                check,
                first,
                LiveVerdict.MITIGATED_BY_NEXUS,
                FindingSeverity.INFO,
                title,
                replay_ev=replay,
                delta=delta,
            )
        ],
        ran,
        1,
    )


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


def _finding(
    check: LiveCheck,
    ev: HttpEvidence,
    verdict: LiveVerdict,
    severity: FindingSeverity,
    title: str,
    origin_ev: Optional[HttpEvidence] = None,
    replay_ev: Optional[HttpEvidence] = None,
    delta: Optional[DefenseDelta] = None,
) -> VulnerabilityFinding:
    status = ev.status if ev.status is not None else 0
    idor = check.check in {"cross_account_object_read", "unauthenticated_object_read"}
    evidence = [
        Evidence(
            kind="http_status",
            summary=title,
            http_status=status or None,
            snippet=f"{ev.method} {check.path}",
        )
    ]
    if origin_ev is not None:
        evidence.append(
            Evidence(
                kind="origin_status",
                summary="Same path against lab origin (not a public bypass)",
                http_status=origin_ev.status,
                snippet=origin_ev.error or f"{origin_ev.method} origin → {origin_ev.status}",
            )
        )
    if replay_ev is not None:
        evidence.append(
            Evidence(
                kind="replay_status",
                summary="Repeat of the same benign request at the edge",
                http_status=replay_ev.status,
                snippet=replay_ev.error or f"{replay_ev.method} replay → {replay_ev.status}",
            )
        )
    poc = f"{ev.method} {ev.url} → {ev.status or ev.error}"
    if delta is not None:
        poc = f"{poc} | defense_delta={delta.value}"
    return VulnerabilityFinding(
        id=f"NEXRED-LIVE-{check.hypothesis_id[:8]}-{ran_token(check)}",
        title=title,
        severity=severity,
        cwe_id="CWE-639" if idor else ("CWE-306" if check.check == "unauthenticated_mutating_route" else None),
        owasp_category="A01:2021-Broken Access Control" if idor else "A07:2021-Identification and Authentication Failures",
        target_endpoint=ev.url,
        param_or_source=check.check,
        proof_of_concept=poc,
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
        defense_delta=delta,
        evidence=evidence,
    )


def ran_token(check: LiveCheck) -> str:
    return f"{check.method}-{check.path}".replace("/", "_")[:24]
