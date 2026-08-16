"""Named agents: in-process bus, PARTIAL on failure, report sections."""

import os
import sys
import unittest
from unittest.mock import patch

package_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if package_root not in sys.path:
    sys.path.insert(0, package_root)

from agents.reporting.report_generator import ReportGenerator
from agents.runtime.bus import AgentOutcome, run_agent
from core.orchestrator import NexRedOrchestrator
from core.types import ScanMode, ScanTarget


class TestAgentBus(unittest.TestCase):
    def test_failure_returns_outcome_not_raise(self):
        def boom() -> AgentOutcome:
            raise RuntimeError("mapper down")

        outcome = run_agent("recon", boom)
        self.assertFalse(outcome.ok)
        self.assertIn("mapper down", outcome.error or "")
        self.assertEqual(outcome.name, "recon")


class TestOrchestratorAgents(unittest.TestCase):
    def test_recon_failure_is_partial_and_other_agents_run(self):
        with patch("agents.crew.SurfaceMapper.map", side_effect=RuntimeError("mapper down")):
            result = NexRedOrchestrator(
                ScanTarget(
                    target_url="http://127.0.0.1:9",
                    mode=ScanMode.BLACKBOX,
                    enable_llm=False,
                )
            ).execute()
        names = [item.name for item in result.agent_runs]
        self.assertEqual(result.status, "PARTIAL")
        self.assertIn("recon", names)
        self.assertIn("injection-hygiene", names)
        self.assertIn("access", names)
        self.assertIn("reporter", names)
        recon = next(item for item in result.agent_runs if item.name == "recon")
        self.assertFalse(recon.ok)
        markdown = ReportGenerator.generate_markdown_report(result)
        self.assertIn("## Agents", markdown)
        self.assertIn("`recon`", markdown)
        self.assertNotIn("64000", markdown)
