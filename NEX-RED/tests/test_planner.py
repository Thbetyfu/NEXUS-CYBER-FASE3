"""LLM JSON planner: aliases, path sanitizer, fail-closed merge."""

import os
import sys
import unittest

package_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if package_root not in sys.path:
    sys.path.insert(0, package_root)

from agents.planner.plan import live_check_from_json, plan_live_checks, sanitize_path
from core.types import Evidence, FindingSeverity, FindingSource, VulnerabilityFinding


class _FakeLlm:
    def __init__(self, payload):
        self.payload = payload

    def available(self) -> bool:
        return True

    def propose_live_plan(self, *, hypotheses, paths):
        return self.payload


class TestPathSanitizer(unittest.TestCase):
    def test_rejects_sql_looking_paths(self):
        self.assertIsNone(sanitize_path("/search?q=' OR 1=1"))
        self.assertIsNone(sanitize_path("http://evil.example/"))
        self.assertEqual(sanitize_path("/api/login"), "/api/login")


class TestJsonPlan(unittest.TestCase):
    def test_jwt_alias_becomes_unauthenticated_get(self):
        check = live_check_from_json(
            {
                "hypothesis_id": "H-jwt",
                "check": "verify_jwt_rejects_unverified",
                "endpoint": "/api/login",
                "stop_condition": "must_fail_without_authorization",
            }
        )
        self.assertIsNotNone(check)
        self.assertEqual(check.check, "request_without_authorization")
        self.assertEqual(check.method, "GET")
        self.assertEqual(check.path, "/api/login")

    def test_mutating_alias_and_idor_corpus(self):
        mut = live_check_from_json(
            {
                "hypothesis_id": "H-auth",
                "check": "mutating_route_requires_auth",
                "endpoint": "/users/1",
            }
        )
        self.assertEqual(mut.check, "unauthenticated_mutating_route")
        self.assertEqual(mut.method, "POST")
        idor = live_check_from_json(
            {
                "hypothesis_id": "H-idor",
                "check": "unauthenticated_object_read",
                "endpoint": "/objects/1",
            }
        )
        self.assertEqual(idor.check, "unauthenticated_object_read")

    def test_unknown_check_is_dropped(self):
        self.assertIsNone(
            live_check_from_json({"check": "sql_union_select", "endpoint": "/search"})
        )

    def test_llm_merge_keeps_baseline_and_adds_alias(self):
        hypo = VulnerabilityFinding(
            id="H-jwt",
            title="JWT decode without verify",
            severity=FindingSeverity.HIGH,
            cwe_id="CWE-347",
            target_endpoint="tokens.py:L1",
            proof_of_concept="jwt.decode",
            remediation="verify",
            source=FindingSource.PYTHON_AST,
            evidence=[Evidence(kind="source_location", summary="x", snippet="jwt.decode(token, verify=False)")],
        )
        fake = _FakeLlm(
            {
                "steps": [
                    {
                        "hypothesis_id": "H-jwt",
                        "check": "verify_jwt_rejects_unverified",
                        "endpoint": "/api/login",
                        "stop_condition": "unauthenticated_request_recorded",
                    }
                ]
            }
        )
        checks = plan_live_checks([hypo], enable_llm=True, llm_client=fake)
        names = {(item.check, item.path) for item in checks}
        self.assertIn(("request_without_authorization", "/api/telemetry"), names)
        self.assertIn(("request_without_authorization", "/api/login"), names)

    def test_llm_down_falls_back_to_deterministic(self):
        class Down:
            def available(self) -> bool:
                return False

        hypo = VulnerabilityFinding(
            id="H1",
            title="route",
            severity=FindingSeverity.HIGH,
            cwe_id="CWE-306",
            target_endpoint="app.py:L1",
            proof_of_concept='@app.route("/open", methods=["POST"])',
            remediation="auth",
            source=FindingSource.PYTHON_AST,
            evidence=[Evidence(kind="source_location", summary="x", snippet='@app.route("/open", methods=["POST"])')],
        )
        with_llm = plan_live_checks([hypo], enable_llm=True, llm_client=Down())
        without = plan_live_checks([hypo], enable_llm=False)
        self.assertEqual([(c.check, c.path) for c in with_llm], [(c.check, c.path) for c in without])
        self.assertTrue(any(c.check == "unauthenticated_mutating_route" and c.path == "/open" for c in without))


if __name__ == "__main__":
    unittest.main()
