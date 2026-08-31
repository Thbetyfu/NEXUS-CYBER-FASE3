"""Unit tests for GaaS Job Cowork lifecycle."""

import os
import sys
import tempfile
import unittest
from unittest.mock import patch

package_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if package_root not in sys.path:
    sys.path.insert(0, package_root)

from core.types import (
    AutonomyLevel,
    CoworkJobStatus,
    DefenseDelta,
    FindingSeverity,
    ScanResult,
    ScanMode,
    VulnerabilityFinding,
)
from jobs.closure import resolve_closure, summarize_defense_deltas
from jobs.orchestrator import JobCoworkOrchestrator
from jobs.store import JobStore
from core.orchestrator import NexRedOrchestrator


def _finding(delta: DefenseDelta | None) -> VulnerabilityFinding:
    return VulnerabilityFinding(
        id="f1",
        title="test",
        severity=FindingSeverity.MEDIUM,
        target_endpoint="/",
        proof_of_concept="benign",
        remediation="fix",
        defense_delta=delta,
    )


class TestJobClosure(unittest.TestCase):
    def test_replay_missed_is_closed_gap(self):
        scan = ScanResult(
            scan_id="S1",
            target_url="http://127.0.0.1",
            mode=ScanMode.HYBRID,
            start_time=_finding(None).timestamp,
            end_time=_finding(None).timestamp,
            findings=[_finding(DefenseDelta.REPLAY_MISSED)],
            antibody_loop_ok=False,
        )
        status, residuals = resolve_closure(scan, autonomy_l1=True)
        self.assertEqual(status, CoworkJobStatus.CLOSED_GAP)
        self.assertIn("replay_missed", residuals)

    def test_antibody_learned_closed_ok(self):
        scan = ScanResult(
            scan_id="S2",
            target_url="http://127.0.0.1",
            mode=ScanMode.HYBRID,
            start_time=_finding(None).timestamp,
            end_time=_finding(None).timestamp,
            findings=[_finding(DefenseDelta.ANTIBODY_LEARNED)],
            antibody_loop_ok=True,
            live_checks_run=1,
        )
        status, residuals = resolve_closure(scan, autonomy_l1=True)
        self.assertEqual(status, CoworkJobStatus.CLOSED_OK)
        self.assertEqual(residuals, [])

    def test_origin_open_is_gap(self):
        scan = ScanResult(
            scan_id="S3",
            target_url="http://127.0.0.1",
            mode=ScanMode.HYBRID,
            start_time=_finding(None).timestamp,
            end_time=_finding(None).timestamp,
            findings=[_finding(DefenseDelta.ORIGIN_OPEN)],
            live_checks_run=1,
        )
        status, residuals = resolve_closure(scan, autonomy_l1=False)
        self.assertEqual(status, CoworkJobStatus.CLOSED_GAP)
        self.assertIn("origin_open", residuals)

    def test_summarize_defense_deltas(self):
        counts = summarize_defense_deltas(
            [_finding(DefenseDelta.WAF_BLOCKED), _finding(DefenseDelta.WAF_BLOCKED)]
        )
        self.assertEqual(counts["waf_blocked"], 2)


class TestJobOrchestrator(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.store = JobStore(root=self.tmp.name)
        self.engine = JobCoworkOrchestrator(self.store)

    def tearDown(self):
        self.tmp.cleanup()

    def test_create_and_approve_flow(self):
        job = self.engine.create_job(
            title="Lab job",
            target_url="http://127.0.0.1:8080",
            autonomy_level=AutonomyLevel.L0,
        )
        self.assertEqual(job.status, CoworkJobStatus.OPEN)

        fake_scan = ScanResult(
            scan_id="NEXRED-FAKE",
            target_url=job.target_url,
            mode=ScanMode.HYBRID,
            start_time=job.created_at,
            end_time=job.created_at,
            findings=[_finding(DefenseDelta.BOTH_HELD)],
            antibody_loop_ok=True,
            live_checks_run=2,
        )
        self.store.save_scan_result(job.job_id, fake_scan)
        job.status = CoworkJobStatus.PENDING_APPROVAL
        self.store.save_job(job)

        closed = self.engine.approve(job.job_id, operator="qa")
        self.assertIn(
            closed.status,
            {CoworkJobStatus.CLOSED_OK, CoworkJobStatus.CLOSED_GAP, CoworkJobStatus.PARTIAL},
        )
        self.assertTrue(closed.approvals)

    def test_measurement_passes_protected_host_to_scan(self):
        job = self.engine.create_job(
            title="Host bind",
            target_url="http://portfolio.nexus-lab.test",
            protected_host="portfolio.nexus-lab.test",
        )
        fake_scan = ScanResult(
            scan_id="NEXRED-BIND",
            target_url=job.target_url,
            mode=ScanMode.HYBRID,
            start_time=job.created_at,
            end_time=job.created_at,
            findings=[_finding(DefenseDelta.WAF_BLOCKED)],
            live_checks_run=1,
        )
        seen: dict = {}

        class Spy(NexRedOrchestrator):
            def __init__(self, target):
                seen["protected_host"] = target.protected_host
                seen["target_url"] = target.target_url
                super().__init__(target)

            def execute(self):
                return fake_scan

        with patch("jobs.orchestrator.NexRedOrchestrator", Spy):
            measured = self.engine.run_measurement(job.job_id, enable_llm=False)
        self.assertEqual(seen.get("protected_host"), "portfolio.nexus-lab.test")
        self.assertEqual(seen.get("target_url"), "http://portfolio.nexus-lab.test")
        self.assertEqual(measured.status, CoworkJobStatus.PENDING_APPROVAL)
        self.assertTrue(any("WAF bind" in step.message for step in measured.step_logs))


if __name__ == "__main__":
    unittest.main()
