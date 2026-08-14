"""
NEX-RED Core Orchestrator

Pipeline: recon → white-box analysis → optional LLM verification → black-box posture → report.
Does not invent attack counts. Metrics come from actual probes and analyzed files.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from agents.blackbox.dynamic_prober import DynamicBlackboxProber
from agents.exploit.poc_validator import PoCValidator
from agents.recon.surface_mapper import SurfaceMapper
from agents.reporting.report_generator import ReportGenerator
from agents.whitebox.code_analyzer import WhiteboxCodeAnalyzer
from agents.whitebox.llm_verifier import LlmVerifier
from core.types import ScanMode, ScanResult, ScanTarget
from scenarios.battle_scenarios import BattleScenarioRunner


class NexRedOrchestrator:
    def __init__(self, target: ScanTarget):
        self.target = target
        self.scan_id = f"NEXRED-{uuid.uuid4().hex[:8].upper()}"

    def execute(self) -> ScanResult:
        start_time = datetime.now(timezone.utc)
        findings = []
        total_probes = 0
        mitigated = 0
        files_analyzed = 0
        llm_used = False
        raw_logs = [f"[{start_time.isoformat()}] NEX-RED v4 starting scan {self.scan_id}"]

        mapper = None
        if self.target.mode in {ScanMode.BLACKBOX, ScanMode.HYBRID, ScanMode.SCENARIO} and self.target.target_url:
            raw_logs.append(f"Recon: mapping surface {self.target.target_url}")
            mapper = SurfaceMapper(self.target.target_url)
            recon_findings = mapper.map()
            total_probes += mapper.probes
            findings.extend(recon_findings)
            raw_logs.append(
                f"Recon complete: reachable={mapper.reachable} waf={mapper.waf_detected} "
                f"paths={len(mapper.discovered_paths)} findings={len(recon_findings)}"
            )

        if self.target.mode in {ScanMode.WHITEBOX, ScanMode.HYBRID} and self.target.repo_path:
            raw_logs.append(f"White-box: analyzing {self.target.repo_path}")
            analyzer = WhiteboxCodeAnalyzer(self.target.repo_path)
            wb_findings = analyzer.analyze()
            files_analyzed = analyzer.files_analyzed
            raw_logs.append(f"White-box candidates: {len(wb_findings)} from {files_analyzed} files")
            verifier = LlmVerifier()
            wb_findings = verifier.verify(wb_findings, enabled=self.target.enable_llm)
            llm_used = verifier.used
            findings.extend(wb_findings)
            raw_logs.append(f"After LLM verification: {len(wb_findings)} findings (llm_used={llm_used})")

        if self.target.mode in {ScanMode.BLACKBOX, ScanMode.HYBRID} and self.target.target_url:
            raw_logs.append(f"Black-box posture probe: {self.target.target_url}")
            paths = mapper.discovered_paths if mapper else ["/"]
            prober = DynamicBlackboxProber(self.target.target_url)
            bb_findings = prober.run_dynamic_suite(paths)
            total_probes += prober.total_probes
            mitigated += prober.mitigated_by_nexus
            findings.extend(bb_findings)
            raw_logs.append(
                f"Black-box probes={prober.total_probes} defensive_blocks={prober.mitigated_by_nexus}"
            )

        if self.target.mode == ScanMode.SCENARIO:
            posture = BattleScenarioRunner.inspect_posture(self.target.target_url)
            total_probes += int(posture.get("probes") or 0)
            if posture.get("waf_detected"):
                mitigated += 1
            raw_logs.append(f"Defense posture: {posture}")

        validated = PoCValidator.validate_and_deduplicate(findings)
        end_time = datetime.now(timezone.utc)
        result = ScanResult(
            scan_id=self.scan_id,
            target_url=self.target.target_url,
            mode=self.target.mode,
            start_time=start_time,
            end_time=end_time,
            total_attacks_attempted=total_probes,
            vulnerabilities_found=len(validated),
            vulnerabilities_mitigated_by_nexus=mitigated,
            findings=validated,
            raw_logs=raw_logs,
            status="COMPLETED",
            files_analyzed=files_analyzed,
            llm_used=llm_used,
        )
        report_path = ReportGenerator.save_report(result)
        raw_logs.append(f"Report saved to {report_path}")
        result.raw_logs = raw_logs
        return result
