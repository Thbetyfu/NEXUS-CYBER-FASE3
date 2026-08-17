"""Sprint 3: control plane / datastore / honeypot posture. Not pentest."""

from __future__ import annotations

import os
import sys
import threading
import unittest
from http.server import BaseHTTPRequestHandler, HTTPServer

package_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if package_root not in sys.path:
    sys.path.insert(0, package_root)

from agents.verify.hotspot_harness import execute_hotspot_harness, should_run_hotspot_harness
from core.types import LiveVerdict


class _OpenSocHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        return

    def do_GET(self):
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"soc")


class TestHotspotHarness(unittest.TestCase):
    def test_auto_skips_loopback(self):
        self.assertFalse(should_run_hotspot_harness("http://127.0.0.1:80"))
        self.assertTrue(should_run_hotspot_harness("http://192.168.137.1"))
        self.assertTrue(should_run_hotspot_harness("http://127.0.0.1:80", force=True))

    def test_open_control_plane_is_confirmed(self):
        server = HTTPServer(("127.0.0.1", 0), _OpenSocHandler)
        port = server.server_address[1]
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            findings, ran = execute_hotspot_harness(
                "http://127.0.0.1:9",
                force=True,
                control_ports=(port,),
                data_ports=(59991,),
                honeypot_port=59992,
            )
        finally:
            server.shutdown()
            server.server_close()
        leaks = [item for item in findings if item.param_or_source == "control_plane_exposed"]
        self.assertTrue(leaks, findings)
        self.assertEqual(leaks[0].live_verdict, LiveVerdict.CONFIRMED)
        closed_data = [item for item in findings if item.param_or_source == "datastore_closed"]
        self.assertTrue(closed_data, findings)
        self.assertGreaterEqual(ran, 3)

    def test_closed_control_plane_is_rejected(self):
        findings, _ = execute_hotspot_harness(
            "http://127.0.0.1:9",
            force=True,
            control_ports=(59993,),
            data_ports=(59994,),
            honeypot_port=59995,
        )
        closed = [item for item in findings if item.param_or_source == "control_plane_closed"]
        self.assertTrue(closed, findings)
        self.assertEqual(closed[0].live_verdict, LiveVerdict.REJECTED)


if __name__ == "__main__":
    unittest.main()
