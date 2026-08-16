"""
Named Jalan B agents. Same HTTP/SAST tools as before — not Shannon/Strix clones.
"""

from __future__ import annotations

from pathlib import Path
from typing import Iterable, List, Optional

from agents.blackbox.dynamic_prober import DynamicBlackboxProber
from agents.exploit.poc_validator import PoCValidator
from agents.planner.plan import plan_live_checks
from agents.recon.surface_mapper import SurfaceMapper
from agents.runtime.bus import AgentOutcome
from agents.verify.browser_flows import execute_browser_checks
from agents.verify.live import execute_live_checks
from core.config import config
from core.types import VulnerabilityFinding


def _tag(findings: List[VulnerabilityFinding], name: str) -> List[VulnerabilityFinding]:
    for item in findings:
        item.agent = name
    return findings


def recon(target_url: str) -> AgentOutcome:
    mapper = SurfaceMapper(target_url)
    findings = _tag(mapper.map(), "recon")
    return AgentOutcome(
        name="recon",
        ok=True,
        findings=findings,
        probes=mapper.probes,
        extra={
            "paths": mapper.discovered_paths or ["/"],
            "reachable": mapper.reachable,
            "waf": mapper.waf_detected,
        },
    )


def injection_hygiene(target_url: str, paths: Iterable[str]) -> AgentOutcome:
    prober = DynamicBlackboxProber(target_url)
    findings = _tag(prober.run_dynamic_suite(paths), "injection-hygiene")
    return AgentOutcome(
        name="injection-hygiene",
        ok=True,
        findings=findings,
        probes=prober.total_probes,
        mitigated=prober.mitigated_by_nexus,
    )


def access(
    target_url: str,
    hypotheses: Iterable[VulnerabilityFinding],
    paths: Iterable[str],
    scan_id: str,
    *,
    enable_llm: bool = False,
) -> AgentOutcome:
    checks = plan_live_checks(list(hypotheses), list(paths), enable_llm=enable_llm)
    findings, ran, mitigated = execute_live_checks(target_url, checks)
    _tag(findings, "access")
    extra = {"live_checks_run": ran, "llm_planner": bool(enable_llm)}
    if config.enable_browser:
        workspace = Path(config.workspaces_dir) / scan_id
        browser_findings, browser_ran = execute_browser_checks(target_url, workspace)
        _tag(browser_findings, "access")
        findings.extend(browser_findings)
        ran += browser_ran
        mitigated += sum(1 for item in browser_findings if item.mitigated_by_nexus)
        extra["live_checks_run"] = ran
        extra["browser_ran"] = browser_ran
    return AgentOutcome(
        name="access",
        ok=True,
        findings=findings,
        probes=ran,
        mitigated=mitigated,
        extra=extra,
    )


def reporter(findings: Optional[List[VulnerabilityFinding]] = None) -> AgentOutcome:
    validated = PoCValidator.validate_and_deduplicate(list(findings or []))
    return AgentOutcome(
        name="reporter",
        ok=True,
        findings=validated,
        extra={"kept": len(validated)},
    )
