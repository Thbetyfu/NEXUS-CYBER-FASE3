"""In-process agent bus. One failure becomes PARTIAL; it must not crash the scan."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional

from core.types import VulnerabilityFinding


@dataclass
class AgentOutcome:
    name: str
    ok: bool
    error: Optional[str] = None
    findings: List[VulnerabilityFinding] = field(default_factory=list)
    probes: int = 0
    mitigated: int = 0
    extra: Dict[str, Any] = field(default_factory=dict)


def run_agent(name: str, fn: Callable[[], AgentOutcome]) -> AgentOutcome:
    try:
        outcome = fn()
        outcome.name = name
        for item in outcome.findings:
            if not item.agent:
                item.agent = name
        return outcome
    except Exception as exc:
        return AgentOutcome(name=name, ok=False, error=f"{type(exc).__name__}: {exc}")
