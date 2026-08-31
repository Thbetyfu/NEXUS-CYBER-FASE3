"""LLM JSON live-check proposer. Fail closed to an empty list — never exploit kits."""

from __future__ import annotations

from typing import Iterable, List, Optional

from agents.planner.plan import LiveCheck, _route_from_finding, live_check_from_json
from core.llm_client import LlmClient
from core.types import VulnerabilityFinding


def propose_llm_checks(
    findings: Iterable[VulnerabilityFinding],
    extra_paths: Iterable[str] | None = None,
    *,
    client: Optional[object] = None,
) -> List[LiveCheck]:
    llm = client or LlmClient()
    available = getattr(llm, "available", lambda: False)
    if callable(available) and not available():
        return []
    propose = getattr(llm, "propose_live_plan", None)
    if not callable(propose):
        return []
    hypotheses = []
    for finding in list(findings)[:20]:
        hypotheses.append(
            {
                "id": finding.id,
                "cwe": finding.cwe_id or "",
                "title": finding.title[:160],
                "path": _route_from_finding(finding) or "",
            }
        )
    payload = propose(hypotheses=hypotheses, paths=[p for p in (extra_paths or []) if str(p).startswith("/")][:15])
    if not isinstance(payload, dict):
        return []
    raw_steps = payload.get("steps")
    if not isinstance(raw_steps, list):
        return []
    out: List[LiveCheck] = []
    for item in raw_steps:
        if not isinstance(item, dict):
            continue
        check = live_check_from_json(item)
        if check:
            out.append(check)
    return out
