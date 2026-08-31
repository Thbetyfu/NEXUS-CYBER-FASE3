"""
NEX-RED Core Orchestrator

Pipeline: white-box hypotheses → named agents (recon, injection-hygiene, access,
reporter) on an in-process bus. One agent failure yields PARTIAL, not a crash.
Does not invent attack counts.
"""

from __future__ import annotations

from datetime import datetime, timezone
import uuid

from agents.crew import access, injection_hygiene, recon, reporter
from agents.runtime.bus import AgentOutcome, run_agent
from agents.reporting.report_generator import ReportGenerator
from agents.whitebox.code_analyzer import WhiteboxCodeAnalyzer
from agents.whitebox.llm_verifier import LlmVerifier
from core.types import AgentRunSummary, ScanMode, ScanResult, ScanTarget
from scenarios.battle_scenarios import BattleScenarioRunner


def _summary(outcome: AgentOutcome) -> AgentRunSummary:
    return AgentRunSummary(
        name=outcome.name,
        ok=outcome.ok,
        error=outcome.error,
        findings=len(outcome.findings),
        probes=outcome.probes,
    )


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
        live_checks_run = 0
        antibody_ok = None
        status = "COMPLETED"
        agent_runs: list[AgentRunSummary] = []
        paths = ["/"]
        raw_logs = [f"[{start_time.isoformat()}] NEX-RED v5 starting scan {self.scan_id}"]

        if self.target.mode in {ScanMode.WHITEBOX, ScanMode.HYBRID} and self.target.repo_path:
            raw_logs.append(f"White-box: analyzing {self.target.repo_path}")
            analyzer = WhiteboxCodeAnalyzer(self.target.repo_path)
            wb_findings = analyzer.analyze()
            files_analyzed = analyzer.files_analyzed
            raw_logs.append(f"White-box candidates: {len(wb_findings)} from {files_analyzed} files")
            verifier = LlmVerifier()
            wb_findings = verifier.verify(wb_findings, enabled=self.target.enable_llm)
            llm_used = verifier.used
            for item in wb_findings:
                item.agent = item.agent or "whitebox"
            findings.extend(wb_findings)
            raw_logs.append(f"After LLM verification: {len(wb_findings)} findings (llm_used={llm_used})")

        live_modes = {ScanMode.BLACKBOX, ScanMode.HYBRID, ScanMode.SCENARIO}
        if self.target.mode in live_modes and self.target.target_url:
            rec = run_agent("recon", lambda: recon(self.target.target_url, self.target.protected_host))
            agent_runs.append(_summary(rec))
            findings.extend(rec.findings)
            total_probes += rec.probes
            if rec.ok:
                paths = rec.extra.get("paths") or ["/"]
                raw_logs.append(
                    f"Agent recon: reachable={rec.extra.get('reachable')} waf={rec.extra.get('waf')} "
                    f"paths={len(paths)} findings={len(rec.findings)}"
                )
            else:
                status = "PARTIAL"
                raw_logs.append(f"Agent recon failed: {rec.error}")

        if self.target.mode in {ScanMode.BLACKBOX, ScanMode.HYBRID} and self.target.target_url:
            hyg = run_agent(
                "injection-hygiene",
                lambda: injection_hygiene(self.target.target_url, paths, self.target.protected_host),
            )
            agent_runs.append(_summary(hyg))
            findings.extend(hyg.findings)
            total_probes += hyg.probes
            mitigated += hyg.mitigated
            if hyg.ok:
                raw_logs.append(
                    f"Agent injection-hygiene: probes={hyg.probes} blocks={hyg.mitigated}"
                )
            else:
                status = "PARTIAL"
                raw_logs.append(f"Agent injection-hygiene failed: {hyg.error}")

            acc = run_agent(
                "access",
                lambda: access(
                    self.target.target_url,
                    findings,
                    paths,
                    self.scan_id,
                    enable_llm=self.target.enable_llm,
                    protected_host=self.target.protected_host,
                ),
            )
            agent_runs.append(_summary(acc))
            findings.extend(acc.findings)
            total_probes += acc.probes
            mitigated += acc.mitigated
            if acc.ok:
                live_checks_run = int(acc.extra.get("live_checks_run") or acc.probes)
                antibody_ok = acc.extra.get("antibody_loop_ok")
                raw_logs.append(
                    f"Agent access: live_checks={live_checks_run} findings={len(acc.findings)} "
                    f"llm_planner={bool(acc.extra.get('llm_planner'))} "
                    f"antibody_loop_ok={antibody_ok}"
                )
                if live_checks_run == 0:
                    status = "PARTIAL"
                    raw_logs.append("Live HTTP produced no executed checks; scan is PARTIAL")
            else:
                status = "PARTIAL"
                raw_logs.append(f"Agent access failed: {acc.error}")

        if self.target.mode == ScanMode.SCENARIO:
            posture = BattleScenarioRunner.inspect_posture(self.target.target_url)
            total_probes += int(posture.get("probes") or 0)
            if posture.get("waf_detected"):
                mitigated += 1
            raw_logs.append(f"Defense posture: {posture}")

        rep = run_agent("reporter", lambda: reporter(findings))
        agent_runs.append(_summary(rep))
        if rep.ok:
            validated = rep.findings
            raw_logs.append(f"Agent reporter: kept={len(validated)}")
        else:
            status = "PARTIAL"
            validated = findings
            raw_logs.append(f"Agent reporter failed: {rep.error}")

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
            status=status,
            files_analyzed=files_analyzed,
            llm_used=llm_used,
            live_checks_run=live_checks_run,
            antibody_loop_ok=antibody_ok,
            agent_runs=agent_runs,
        )
        report_path = ReportGenerator.save_report(result)
        raw_logs.append(f"Report saved to {report_path}")
        result.raw_logs = raw_logs
        return result
