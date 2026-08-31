"""CLOSED_OK / CLOSED_GAP rules for GaaS Job Cowork."""

from __future__ import annotations

from typing import List, Tuple

from core.types import CoworkJobStatus, DefenseDelta, ScanResult, VulnerabilityFinding


def summarize_defense_deltas(findings: List[VulnerabilityFinding]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for item in findings:
        if item.defense_delta is None:
            continue
        key = item.defense_delta.value
        counts[key] = counts.get(key, 0) + 1
    return counts


def resolve_closure(
    scan: ScanResult,
    *,
    autonomy_l1: bool,
) -> Tuple[CoworkJobStatus, List[str]]:
    """
    Product rule: Job must not be CLOSED_OK when replay_missed exists without CLOSED_GAP.
    """
    findings = scan.findings
    residuals: List[str] = []

    if scan.status == "PARTIAL" and scan.live_checks_run == 0 and not findings:
        return CoworkJobStatus.PARTIAL, ["agent_or_live_failure"]

    has_replay_missed = any(item.defense_delta == DefenseDelta.REPLAY_MISSED for item in findings)
    has_origin_open = any(item.defense_delta == DefenseDelta.ORIGIN_OPEN for item in findings)
    has_antibody_learned = any(item.defense_delta == DefenseDelta.ANTIBODY_LEARNED for item in findings)

    if has_replay_missed:
        residuals.append("replay_missed")
        return CoworkJobStatus.CLOSED_GAP, residuals

    if scan.antibody_loop_ok is False:
        residuals.append("antibody_loop_failed")
        return CoworkJobStatus.CLOSED_GAP, residuals

    if has_origin_open:
        residuals.append("origin_open")

    if has_antibody_learned and not has_origin_open:
        return CoworkJobStatus.CLOSED_OK, residuals

    ok_deltas = {
        DefenseDelta.WAF_BLOCKED,
        DefenseDelta.BOTH_HELD,
        DefenseDelta.REPLAY_HELD,
        DefenseDelta.ANTIBODY_LEARNED,
    }
    measured = [item for item in findings if item.defense_delta is not None]
    if measured and all(item.defense_delta in ok_deltas for item in measured):
        if residuals:
            return CoworkJobStatus.CLOSED_GAP, residuals
        return CoworkJobStatus.CLOSED_OK, residuals

    if autonomy_l1 and scan.antibody_loop_ok is True and not residuals:
        return CoworkJobStatus.CLOSED_OK, residuals

    if residuals:
        return CoworkJobStatus.CLOSED_GAP, residuals

    if scan.status == "PARTIAL":
        return CoworkJobStatus.PARTIAL, ["partial_scan"]

    return CoworkJobStatus.CLOSED_OK, residuals
