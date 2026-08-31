"""WAF Host-header bind: named protected host → TCP gateway, origin twin unchanged."""

from __future__ import annotations

import os
import sys
import threading
import unittest
from http.server import BaseHTTPRequestHandler, HTTPServer
from unittest.mock import patch

package_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if package_root not in sys.path:
    sys.path.insert(0, package_root)

from agents.planner.plan import plan_live_checks
from agents.runtime.http import SafeHttpClient
from agents.runtime.waf_bind import bind_waf_browser, bind_waf_edge, normalize_protected_host, tcp_edge_base
from agents.verify.live import execute_live_checks
from core.config import config
from core.types import (
    DefenseDelta,
    Evidence,
    FindingSeverity,
    FindingSource,
    VulnerabilityFinding,
)


class TestBindWafEdgePure(unittest.TestCase):
    def test_normalize_strips_scheme_and_port(self):
        self.assertEqual(
            normalize_protected_host("http://Portfolio.Nexus-Lab.Test:8080/x"),
            "portfolio.nexus-lab.test",
        )
        self.assertEqual(normalize_protected_host("all"), "")

    def test_named_host_rewrites_to_gateway(self):
        with patch.object(config, "gateway_url", "http://127.0.0.1:8080"):
            with patch.object(config, "live_target", "http://portfolio.nexus-lab.test"):
                url, headers = bind_waf_edge("http://portfolio.nexus-lab.test/app")
        self.assertEqual(url, "http://127.0.0.1:8080/app")
        self.assertEqual(headers.get("Host"), "portfolio.nexus-lab.test")

    def test_loopback_plus_protected_host_keeps_tcp(self):
        url, headers = bind_waf_edge(
            "http://127.0.0.1:8080/x",
            protected_host="portfolio.nexus-lab.test",
        )
        self.assertEqual(url, "http://127.0.0.1:8080/x")
        self.assertEqual(headers.get("Host"), "portfolio.nexus-lab.test")

    def test_plain_loopback_has_no_host_override(self):
        url, headers = bind_waf_edge("http://127.0.0.1:9")
        self.assertEqual(url, "http://127.0.0.1:9")
        self.assertEqual(headers, {})

    def test_lab_origin_is_not_rewritten(self):
        url, headers = bind_waf_edge("http://127.0.0.1:3002")
        self.assertEqual(url, "http://127.0.0.1:3002")
        self.assertEqual(headers, {})
        url, headers = bind_waf_edge("http://portfolio:3002")
        self.assertEqual(url, "http://portfolio:3002")
        self.assertEqual(headers, {})

    def test_origin_flag_skips_bind(self):
        url, headers = bind_waf_edge(
            "http://portfolio.nexus-lab.test",
            protected_host="portfolio.nexus-lab.test",
            edge=False,
        )
        self.assertEqual(url, "http://portfolio.nexus-lab.test")
        self.assertEqual(headers, {})

    def test_tcp_edge_prefers_live_target_with_port(self):
        with patch.object(config, "live_target", "http://127.0.0.1:8080"):
            with patch.object(config, "gateway_url", "http://127.0.0.1:9"):
                self.assertEqual(tcp_edge_base(), "http://127.0.0.1:8080")

    def test_tcp_edge_named_live_target_uses_gateway(self):
        with patch.object(config, "live_target", "http://portfolio.nexus-lab.test"):
            with patch.object(config, "gateway_url", "http://127.0.0.1:8080"):
                self.assertEqual(tcp_edge_base(), "http://127.0.0.1:8080")

    def test_browser_bind_maps_named_host_to_gateway_ip(self):
        with patch.object(config, "gateway_url", "http://127.0.0.1:8080"):
            with patch.object(config, "live_target", "http://portfolio.nexus-lab.test"):
                bound = bind_waf_browser("http://portfolio.nexus-lab.test/")
        self.assertEqual(bound.navigate_url, "http://portfolio.nexus-lab.test:8080/")
        self.assertEqual(bound.extra_headers.get("Host"), "portfolio.nexus-lab.test")
        self.assertEqual(bound.logical_host, "portfolio.nexus-lab.test")
        self.assertTrue(bound.chromium_args)
        self.assertIn("MAP portfolio.nexus-lab.test 127.0.0.1", bound.chromium_args[0])

    def test_browser_bind_loopback_has_no_map(self):
        bound = bind_waf_browser("http://127.0.0.1:9/")
        self.assertEqual(bound.navigate_url, "http://127.0.0.1:9/")
        self.assertEqual(bound.chromium_args, ())
        self.assertEqual(bound.extra_headers, {})


class _HostAwareWaf(BaseHTTPRequestHandler):
    last_host = ""

    def log_message(self, format, *args):
        return

    def do_GET(self):
        type(self).last_host = self.headers.get("Host", "")
        self._reply()

    def do_POST(self):
        length = int(self.headers.get("Content-Length") or "0")
        if length:
            self.rfile.read(length)
        type(self).last_host = self.headers.get("Host", "")
        self._reply()

    def _reply(self):
        host = (self.headers.get("Host") or "").split(":")[0].lower()
        if host == "portfolio.nexus-lab.test":
            self.send_response(403)
            self.send_header("X-Nexus-Shield", "1")
            self.end_headers()
            self.wfile.write(b"blocked")
            return
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"ok")


class _OriginHostSpy(BaseHTTPRequestHandler):
    last_host = ""

    def log_message(self, format, *args):
        return

    def do_POST(self):
        length = int(self.headers.get("Content-Length") or "0")
        if length:
            self.rfile.read(length)
        type(self).last_host = self.headers.get("Host", "")
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"origin-ok")

    def do_GET(self):
        type(self).last_host = self.headers.get("Host", "")
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"origin-ok")


class TestWafBindLive(unittest.TestCase):
    def test_named_job_url_hits_waf_with_host_header(self):
        _HostAwareWaf.last_host = ""
        server = HTTPServer(("127.0.0.1", 0), _HostAwareWaf)
        port = server.server_address[1]
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            with patch.object(config, "gateway_url", f"http://127.0.0.1:{port}"):
                with patch.object(config, "live_target", "http://portfolio.nexus-lab.test"):
                    ev = SafeHttpClient(
                        "http://portfolio.nexus-lab.test",
                        protected_host="portfolio.nexus-lab.test",
                    ).request("POST", "/shield", json_body={"nexred_posture": "benign-check"})
        finally:
            server.shutdown()
            server.server_close()
        self.assertEqual(ev.status, 403)
        self.assertTrue(ev.nexus_header)
        self.assertIn("portfolio.nexus-lab.test", _HostAwareWaf.last_host.lower())

    def test_origin_twin_does_not_send_protected_host(self):
        _HostAwareWaf.last_host = ""
        _OriginHostSpy.last_host = ""
        waf = HTTPServer(("127.0.0.1", 0), _HostAwareWaf)
        origin = HTTPServer(("127.0.0.1", 0), _OriginHostSpy)
        threading.Thread(target=waf.serve_forever, daemon=True).start()
        threading.Thread(target=origin.serve_forever, daemon=True).start()
        hypo = VulnerabilityFinding(
            id="H-BIND",
            title="route",
            severity=FindingSeverity.HIGH,
            cwe_id="CWE-306",
            target_endpoint="app.py:L1",
            proof_of_concept='route("/shield")',
            remediation="auth",
            source=FindingSource.PYTHON_AST,
            evidence=[
                Evidence(
                    kind="source_location",
                    summary="x",
                    snippet='@app.route("/shield", methods=["POST"])',
                )
            ],
        )
        try:
            with patch.object(config, "gateway_url", f"http://127.0.0.1:{waf.server_address[1]}"):
                findings, ran, mitigated = execute_live_checks(
                    "http://portfolio.nexus-lab.test",
                    plan_live_checks([hypo]),
                    origin_url=f"http://127.0.0.1:{origin.server_address[1]}",
                    protected_host="portfolio.nexus-lab.test",
                )
        finally:
            waf.shutdown()
            origin.shutdown()
            waf.server_close()
            origin.server_close()
        blocked = [item for item in findings if item.defense_delta == DefenseDelta.REPLAY_HELD]
        self.assertTrue(blocked, findings)
        self.assertGreaterEqual(mitigated, 1)
        self.assertGreaterEqual(ran, 3)
        self.assertIn("portfolio.nexus-lab.test", _HostAwareWaf.last_host.lower())
        origin_host = _OriginHostSpy.last_host.split(":")[0].lower()
        self.assertNotEqual(origin_host, "portfolio.nexus-lab.test")


if __name__ == "__main__":
    unittest.main()
