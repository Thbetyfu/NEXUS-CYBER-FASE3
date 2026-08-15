"""Browser lab flows: skip without Playwright; optional Chromium against a local form page."""

from __future__ import annotations

import os
import sys
import tempfile
import threading
import unittest
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

package_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if package_root not in sys.path:
    sys.path.insert(0, package_root)

from agents.runtime.browser import playwright_importable
from agents.verify.browser_flows import execute_browser_checks
from core.config import config
from core.types import LiveVerdict

_LAB_HTML = b"""<!doctype html>
<html><head><title>Lab Forms</title></head>
<body>
<input type="file" />
<input placeholder="ENTER SECURE ACCESS CODE" />
<button>Decrypt and unlock reward vault button</button>
<p id="out"></p>
<script>
let fails = 0;
document.querySelector("input[type=file]").addEventListener("change", () => {
  document.getElementById("out").textContent = "Photo successfully uploaded and sanitized by AVSE!";
});
document.querySelector("button").addEventListener("click", () => {
  fails += 1;
  if (fails >= 5) {
    document.getElementById("out").textContent = "ACCESS DENIED: Your IP has been permanently blacklisted by Nexus Intel-Shield.";
  } else {
    document.getElementById("out").textContent = "Incorrect Password. Attempt " + fails + " of 5";
  }
});
</script>
</body></html>
"""


class _LabPage(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        return

    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(_LAB_HTML)))
        self.end_headers()
        self.wfile.write(_LAB_HTML)


class TestBrowserFlows(unittest.TestCase):
    def test_disabled_is_sast_only_and_runs_zero(self):
        previous = config.enable_browser
        config.enable_browser = False
        try:
            findings, ran = execute_browser_checks("http://127.0.0.1/")
        finally:
            config.enable_browser = previous
        self.assertEqual(ran, 0)
        self.assertEqual(findings[0].live_verdict, LiveVerdict.SAST_ONLY)
        self.assertIn("NEX_RED_BROWSER=0", findings[0].proof_of_concept)

    def test_enabled_without_playwright_skips(self):
        if playwright_importable():
            self.skipTest("Playwright is installed; skip the missing-runtime path")
        previous = config.enable_browser
        config.enable_browser = True
        try:
            findings, ran = execute_browser_checks("http://127.0.0.1/")
        finally:
            config.enable_browser = previous
        self.assertEqual(ran, 0)
        self.assertIn("Playwright not installed", findings[0].title)

    def test_playwright_gallery_and_vault_ban(self):
        if not playwright_importable():
            self.skipTest("Playwright not installed")
        server = HTTPServer(("127.0.0.1", 0), _LabPage)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        base = f"http://127.0.0.1:{server.server_address[1]}/"
        previous = config.enable_browser
        config.enable_browser = True
        workspace = Path(tempfile.mkdtemp(prefix="nexred-browser-"))
        try:
            findings, ran = execute_browser_checks(base, workspace)
        finally:
            config.enable_browser = previous
            server.shutdown()
            server.server_close()
        self.assertGreaterEqual(ran, 2)
        titles = " ".join(item.title.lower() for item in findings)
        self.assertTrue("gallery" in titles or "upload" in titles or "vault" in titles, findings)
        self.assertTrue(
            any(item.live_verdict == LiveVerdict.MITIGATED_BY_NEXUS for item in findings)
            or any("ban" in item.title.lower() or "locked" in item.title.lower() for item in findings),
            findings,
        )


if __name__ == "__main__":
    unittest.main()
