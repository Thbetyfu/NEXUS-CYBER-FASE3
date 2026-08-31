"""Lab collector maps WAF telemetry to NEX-AI instruction rows."""

from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT / "scripts") not in sys.path:
    sys.path.insert(0, str(ROOT / "scripts"))

from collect_lab_dataset import collect, label_from_traffic, rows_from_log  # noqa: E402


class TestCollectLabDataset(unittest.TestCase):
    def test_allowed_is_benign(self):
        status, attack, score, _ = label_from_traffic("ALLOWED", "")
        self.assertEqual(status, "BENIGN")
        self.assertEqual(attack, "NONE")
        self.assertLess(score, 0.2)

    def test_blocked_sql_maps_malicious(self):
        status, attack, _, _ = label_from_traffic("BLOCKED", "SQL Injection pattern")
        self.assertEqual(status, "MALICIOUS")
        self.assertEqual(attack, "SQL_INJECTION")

    def test_log_jsonl_roundtrip(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "nexus_traffic.log"
            path.write_text(
                json.dumps(
                    {
                        "method": "GET",
                        "endpoint": "/",
                        "target_domain": "127.0.0.1",
                        "status": "ALLOWED",
                        "payload_sample": "",
                        "threat_detail": "",
                    }
                )
                + "\n",
                encoding="utf-8",
            )
            rows = rows_from_log(path)
            self.assertEqual(len(rows), 1)
            payload = json.loads(rows[0]["output"])
            self.assertEqual(payload["status"], "BENIGN")
            self.assertIn("GET /", rows[0]["input"])

    def test_collect_without_logs_still_has_benign(self):
        rows = collect([], eval_benign=True, seeds=True)
        self.assertGreaterEqual(len(rows), 5)
        statuses = {json.loads(item["output"])["status"] for item in rows}
        self.assertEqual(statuses, {"BENIGN"})


if __name__ == "__main__":
    unittest.main()
