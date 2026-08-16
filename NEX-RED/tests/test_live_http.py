"""Live HTTP checks: allow-list, WAF 403, unauthenticated mutating route."""

from __future__ import annotations

import os
import sys
import threading
import unittest
from http.server import BaseHTTPRequestHandler, HTTPServer

package_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if package_root not in sys.path:
    sys.path.insert(0, package_root)

from agents.planner.plan import plan_live_checks
from agents.verify.live import execute_live_checks
from core.types import Evidence, FindingSeverity, FindingSource, LiveVerdict, VulnerabilityFinding
from sandbox.policy import is_url_allowed


class _Handler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        return

    def do_GET(self):
        if self.path.startswith("/api/telemetry"):
            self.send_response(404)
            self.end_headers()
            return
        self.send_response(200)
        self.end_headers()
        if self.path.startswith("/objects/pii"):
            self.wfile.write(b'{"id":1,"email":"owner@example.invalid"}')
            return
        self.wfile.write(b"ok")

    def do_POST(self):
        if self.path.startswith("/open"):
            self.send_response(200)
            self.end_headers()
            return
        if self.path.startswith("/shield"):
            self.send_response(403)
            self.send_header("X-Nexus-Shield", "1")
            self.end_headers()
            return
        self.send_response(200)
        self.end_headers()


class TestLiveHttpFloor2(unittest.TestCase):
    def setUp(self):
        self.server = HTTPServer(("127.0.0.1", 0), _Handler)
        self.port = self.server.server_address[1]
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.base = f"http://127.0.0.1:{self.port}"

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()

    def test_metadata_host_blocked(self):
        self.assertFalse(is_url_allowed("http://169.254.169.254/latest", self.base))

    def test_mutating_route_without_session_is_confirmed(self):
        hypo = VulnerabilityFinding(
            id="H1",
            title="Mutating HTTP route without an authentication decorator",
            severity=FindingSeverity.HIGH,
            cwe_id="CWE-306",
            target_endpoint="app.py:L1",
            proof_of_concept='@app.route("/open", methods=["POST"])',
            remediation="auth",
            source=FindingSource.PYTHON_AST,
            evidence=[Evidence(kind="source_location", summary="x", snippet='@app.route("/open", methods=["POST"])')],
        )
        checks = plan_live_checks([hypo])
        findings, ran, _ = execute_live_checks(self.base, checks)
        self.assertGreaterEqual(ran, 3)
        confirmed = [item for item in findings if item.live_verdict == LiveVerdict.CONFIRMED]
        self.assertTrue(any("session" in item.title.lower() or "accepted" in item.title.lower() for item in confirmed), findings)

    def test_waf_block_is_mitigated(self):
        hypo = VulnerabilityFinding(
            id="H2",
            title="route",
            severity=FindingSeverity.HIGH,
            cwe_id="CWE-306",
            target_endpoint="app.py:L1",
            proof_of_concept='route("/shield")',
            remediation="auth",
            source=FindingSource.PYTHON_AST,
            evidence=[Evidence(kind="source_location", summary="x", snippet='@app.route("/shield", methods=["POST"])')],
        )
        findings, _, mitigated = execute_live_checks(self.base, plan_live_checks([hypo]))
        self.assertGreaterEqual(mitigated, 1)
        self.assertTrue(any(item.live_verdict == LiveVerdict.MITIGATED_BY_NEXUS for item in findings), findings)

    def test_public_telemetry_not_exposed(self):
        findings, ran, _ = execute_live_checks(self.base, plan_live_checks([]))
        self.assertGreaterEqual(ran, 3)
        tel = [item for item in findings if item.param_or_source == "request_without_authorization"]
        self.assertTrue(tel)
        self.assertEqual(tel[0].live_verdict, LiveVerdict.REJECTED)

    def test_unauthenticated_object_read_with_email_is_confirmed(self):
        hypo = VulnerabilityFinding(
            id="H3",
            title="IDOR lookup",
            severity=FindingSeverity.HIGH,
            cwe_id="CWE-639",
            target_endpoint="app.py:L1",
            proof_of_concept='route("/objects/pii")',
            remediation="authz",
            source=FindingSource.PYTHON_AST,
            evidence=[Evidence(kind="source_location", summary="x", snippet='@app.route("/objects/pii")')],
        )
        findings, _, _ = execute_live_checks(self.base, plan_live_checks([hypo]))
        obj = [item for item in findings if item.param_or_source == "unauthenticated_object_read"]
        self.assertTrue(obj, findings)
        self.assertEqual(obj[0].live_verdict, LiveVerdict.CONFIRMED)
        self.assertEqual(obj[0].cwe_id, "CWE-639")


class _SecureTwoAccountHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        return

    def do_POST(self):
        length = int(self.headers.get("Content-Length") or "0")
        if length:
            self.rfile.read(length)
        if self.path.startswith("/nexred/lab/session-pair"):
            body = b'{"owner_token":"owner-lab","peer_token":"peer-lab","object_path":"/objects/1"}'
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        self.send_response(404)
        self.end_headers()

    def do_GET(self):
        auth = self.headers.get("Authorization", "")
        if self.path.startswith("/objects/1"):
            if auth == "Bearer owner-lab":
                self.send_response(200)
                self.end_headers()
                self.wfile.write(b'{"id":1,"owner":"A"}')
                return
            self.send_response(403)
            self.end_headers()
            return
        self.send_response(404)
        self.end_headers()


class _LeakyTwoAccountHandler(_SecureTwoAccountHandler):
    def do_GET(self):
        auth = self.headers.get("Authorization", "")
        if self.path.startswith("/objects/1") and auth in {"Bearer owner-lab", "Bearer peer-lab"}:
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b'{"id":1,"owner":"A"}')
            return
        self.send_response(404)
        self.end_headers()


class TestTwoAccountIdor(unittest.TestCase):
    def _serve(self, handler):
        server = HTTPServer(("127.0.0.1", 0), handler)
        port = server.server_address[1]
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        return server, f"http://127.0.0.1:{port}"

    def test_peer_denied_is_rejected(self):
        server, base = self._serve(_SecureTwoAccountHandler)
        try:
            findings, ran, _ = execute_live_checks(base, plan_live_checks([]))
        finally:
            server.shutdown()
            server.server_close()
        idor = [item for item in findings if item.param_or_source == "cross_account_object_read"]
        self.assertTrue(idor, findings)
        self.assertEqual(idor[0].live_verdict, LiveVerdict.REJECTED)
        self.assertEqual(idor[0].cwe_id, "CWE-639")
        self.assertGreaterEqual(ran, 3)
        self.assertNotIn("owner-lab", idor[0].proof_of_concept)
        self.assertNotIn("peer-lab", idor[0].proof_of_concept)

    def test_peer_can_read_owner_object_is_confirmed(self):
        server, base = self._serve(_LeakyTwoAccountHandler)
        try:
            findings, _, _ = execute_live_checks(base, plan_live_checks([]))
        finally:
            server.shutdown()
            server.server_close()
        idor = [item for item in findings if item.param_or_source == "cross_account_object_read"]
        self.assertTrue(idor, findings)
        self.assertEqual(idor[0].live_verdict, LiveVerdict.CONFIRMED)

    def test_missing_lab_pair_is_sast_only(self):
        server, base = self._serve(_Handler)
        try:
            findings, _, _ = execute_live_checks(base, plan_live_checks([]))
        finally:
            server.shutdown()
            server.server_close()
        idor = [item for item in findings if item.param_or_source == "cross_account_object_read"]
        self.assertTrue(idor, findings)
        self.assertEqual(idor[0].live_verdict, LiveVerdict.SAST_ONLY)


if __name__ == "__main__":
    unittest.main()
