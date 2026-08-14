"""Benchmark scorer tests."""

import os
import sys
import unittest

package_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if package_root not in sys.path:
    sys.path.insert(0, package_root)

from benchmarks.catalog import SHANNON_CORE_CLASSES, parse_shannon_sample_reports
from benchmarks.runner import _verdict
from benchmarks.sast_eval import SastMetrics, evaluate_sast
from benchmarks.corpus import cases


class TestSastCorpus(unittest.TestCase):
    def test_labeled_corpus_runs(self):
        import tempfile
        import shutil
        from pathlib import Path

        tmp = Path(tempfile.mkdtemp(prefix="nexred-sast-"))
        try:
            metrics = evaluate_sast(tmp)
        finally:
            shutil.rmtree(tmp, ignore_errors=True)

        self.assertGreater(metrics.true_positive, 0)
        self.assertIn("sql_injection", metrics.proven_classes)
        self.assertIn("broken_auth_authz", metrics.proven_classes)
        self.assertIn("idor", metrics.proven_classes)
        self.assertIn("authentication_jwt", metrics.proven_classes)
        vuln_count = sum(1 for case in cases() if case.expected_cwe)
        self.assertGreaterEqual(metrics.true_positive + metrics.false_negative, vuln_count)


class TestParityVerdict(unittest.TestCase):
    def test_current_engine_is_not_equal(self):
        metrics = SastMetrics(true_positive=10, true_negative=6, false_positive=0, false_negative=0)
        metrics.proven_classes = {"sql_injection", "xss"}
        verdict = _verdict(metrics, metrics.proven_classes)
        self.assertFalse(verdict.equal_to_shannon_strix)
        self.assertFalse(verdict.live_pentest_comparable)
        self.assertFalse(verdict.shannon_core_proven)

    def test_even_perfect_sast_without_live_pentest_is_not_equal(self):
        metrics = SastMetrics(true_positive=10, true_negative=6)
        proven = set(SHANNON_CORE_CLASSES)
        verdict = _verdict(metrics, proven)
        self.assertTrue(verdict.sast_meets_bar)
        self.assertTrue(verdict.shannon_core_proven)
        self.assertFalse(verdict.equal_to_shannon_strix)


class TestShannonReportParser(unittest.TestCase):
    def test_parses_sample_reports_if_present(self):
        reports = parse_shannon_sample_reports()
        if not reports:
            self.skipTest("shannon/sample-reports not in checkout")
        self.assertGreater(sum(len(item.finding_ids) for item in reports), 10)


if __name__ == "__main__":
    unittest.main()
