"""Browser lab flows: skip without Playwright; optional Chromium against a local form page."""

from __future__ import annotations

import os
import sys
import tempfile
import threading
import unittest
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from unittest.mock import patch

package_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if package_root not in sys.path:
    sys.path.insert(0, package_root)

from agents.runtime.browser import playwright_importable
from agents.runtime.lab_session import configured_lab_session_token, obtain_lab_nexus_session
from agents.verify.browser_flows import execute_browser_checks
from core.config import config
from core.types import LiveVerdict

_POW_HTML = b"""<!doctype html>
<html><head><title>Nexus Cyber | Matrix Verification</title></head>
<body><h1>VERIFYING TERMINAL INTEGRITY...</h1></body></html>
"""


class _PowPage(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        return

    def do_GET(self):
        self.send_response(403)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(_POW_HTML)))
        self.end_headers()
        self.wfile.write(_POW_HTML)


class _VerifySessionMint(BaseHTTPRequestHandler):
    last_token = ""
    last_host = ""

    def log_message(self, format, *args):
        return

    def do_POST(self):
        length = int(self.headers.get("Content-Length") or "0")
        body = self.rfile.read(length).decode("utf-8", errors="replace") if length else ""
        type(self).last_host = self.headers.get("Host", "")
        type(self).last_token = self.headers.get("X-Nexus-Lab-Token", "")
        if "lab_token=lab-ok" in body or type(self).last_token == "lab-ok":
            self.send_response(302)
            self.send_header("Set-Cookie", "nexus_session=minted-lab-cookie; Path=/; HttpOnly")
            self.send_header("Location", "/")
            self.end_headers()
            return
        self.send_response(403)
        self.end_headers()
        self.wfile.write(b"Matrix Verification Failed. Bot Detected.")


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
    last_host = ""

    def log_message(self, format, *args):
        return

    def do_GET(self):
        type(self).last_host = self.headers.get("Host", "")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(_LAB_HTML)))
        self.end_headers()
        self.wfile.write(_LAB_HTML)


class TestBrowserFlows(unittest.TestCase):
    def _skip_unless_chromium(self) -> None:
        if not playwright_importable():
            self.skipTest("Playwright not installed")
        from agents.runtime.browser import chromium_present, pin_playwright_runtime_dirs

        pinned = Path(pin_playwright_runtime_dirs())
        if not chromium_present(pinned):
            self.skipTest(f"Chromium not installed at {pinned}")

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
        self._skip_unless_chromium()
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

    def test_playwright_named_host_without_dns(self):
        self._skip_unless_chromium()
        _LabPage.last_host = ""
        server = HTTPServer(("127.0.0.1", 0), _LabPage)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        port = server.server_address[1]
        previous = config.enable_browser
        config.enable_browser = True
        workspace = Path(tempfile.mkdtemp(prefix="nexred-browser-host-"))
        try:
            with patch.object(config, "gateway_url", f"http://127.0.0.1:{port}"):
                with patch.object(config, "live_target", "http://portfolio.nexus-lab.test"):
                    findings, ran = execute_browser_checks(
                        "http://portfolio.nexus-lab.test/",
                        workspace,
                        protected_host="portfolio.nexus-lab.test",
                    )
        finally:
            config.enable_browser = previous
            server.shutdown()
            server.server_close()
        self.assertGreaterEqual(ran, 2, findings)
        self.assertIn("portfolio.nexus-lab.test", _LabPage.last_host.lower())
        titles = " ".join(item.title.lower() for item in findings)
        self.assertNotIn("raised an error", titles, findings)
        self.assertTrue("gallery" in titles or "upload" in titles or "vault" in titles, findings)

    def test_launch_failure_is_skip_not_raise(self):
        previous = config.enable_browser
        config.enable_browser = True
        try:
            with patch(
                "agents.verify.browser_flows.open_bound_page",
                side_effect=RuntimeError("Executable doesn't exist at C:\\missing\\chrome.exe"),
            ):
                if not playwright_importable():
                    self.skipTest("Playwright not installed")
                findings, ran = execute_browser_checks("http://127.0.0.1/")
        finally:
            config.enable_browser = previous
        self.assertEqual(ran, 0)
        self.assertEqual(findings[0].live_verdict, LiveVerdict.SAST_ONLY)
        blob = findings[0].title + findings[0].proof_of_concept
        self.assertTrue(
            "unavailable" in blob.lower() or "executable" in blob.lower() or "error" in blob.lower(),
            findings,
        )

    def test_pin_reuses_existing_chromium_dir(self):
        from agents.runtime.browser import chromium_present, pin_playwright_runtime_dirs

        previous = os.environ.get("PLAYWRIGHT_BROWSERS_PATH")
        prev_temp = os.environ.get("TEMP")
        prev_tmp = os.environ.get("TMP")
        root = Path(tempfile.mkdtemp(prefix="nexred-pw-"))
        (root / "chromium-1234").mkdir()
        self.assertTrue(chromium_present(root))
        os.environ["PLAYWRIGHT_BROWSERS_PATH"] = str(root)
        try:
            pinned = pin_playwright_runtime_dirs()
        finally:
            if previous is None:
                os.environ.pop("PLAYWRIGHT_BROWSERS_PATH", None)
            else:
                os.environ["PLAYWRIGHT_BROWSERS_PATH"] = previous
            if prev_temp is None:
                os.environ.pop("TEMP", None)
            else:
                os.environ["TEMP"] = prev_temp
            if prev_tmp is None:
                os.environ.pop("TMP", None)
            else:
                os.environ["TMP"] = prev_tmp
        self.assertEqual(Path(pinned), root)

    def test_pin_defaults_to_nexred_drive_not_windows_temp(self):
        from agents.runtime import browser as browser_runtime

        previous = os.environ.pop("PLAYWRIGHT_BROWSERS_PATH", None)
        prev_temp = os.environ.get("TEMP")
        prev_tmp = os.environ.get("TMP")
        try:
            pinned = Path(browser_runtime.pin_playwright_runtime_dirs())
            self.assertEqual(pinned.resolve(), browser_runtime._REPO_BROWSERS.resolve())
            self.assertEqual(Path(os.environ["TEMP"]).resolve(), browser_runtime._REPO_TMP.resolve())
            self.assertEqual(Path(os.environ["TMP"]).resolve(), browser_runtime._REPO_TMP.resolve())
        finally:
            if previous is None:
                os.environ.pop("PLAYWRIGHT_BROWSERS_PATH", None)
            else:
                os.environ["PLAYWRIGHT_BROWSERS_PATH"] = previous
            if prev_temp is None:
                os.environ.pop("TEMP", None)
            else:
                os.environ["TEMP"] = prev_temp
            if prev_tmp is None:
                os.environ.pop("TMP", None)
            else:
                os.environ["TMP"] = prev_tmp

    def test_pow_without_lab_session_is_sast_only(self):
        self._skip_unless_chromium()
        server = HTTPServer(("127.0.0.1", 0), _PowPage)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        base = f"http://127.0.0.1:{server.server_address[1]}/"
        previous = config.enable_browser
        config.enable_browser = True
        prev_token = os.environ.pop("NEX_RED_LAB_SESSION_TOKEN", None)
        prev_gw = os.environ.pop("NEXUS_LAB_SESSION_TOKEN", None)
        workspace = Path(tempfile.mkdtemp(prefix="nexred-pow-"))
        try:
            findings, ran = execute_browser_checks(base, workspace)
        finally:
            config.enable_browser = previous
            server.shutdown()
            server.server_close()
            if prev_token is None:
                os.environ.pop("NEX_RED_LAB_SESSION_TOKEN", None)
            else:
                os.environ["NEX_RED_LAB_SESSION_TOKEN"] = prev_token
            if prev_gw is None:
                os.environ.pop("NEXUS_LAB_SESSION_TOKEN", None)
            else:
                os.environ["NEXUS_LAB_SESSION_TOKEN"] = prev_gw
        self.assertEqual(ran, 1, findings)
        self.assertEqual(findings[0].live_verdict, LiveVerdict.SAST_ONLY)
        self.assertIn("session challenge", findings[0].title.lower())
        self.assertIn("no lab session", findings[0].proof_of_concept.lower())

    def test_lab_session_token_unset_does_not_mint(self):
        prev_a = os.environ.pop("NEX_RED_LAB_SESSION_TOKEN", None)
        prev_b = os.environ.pop("NEXUS_LAB_SESSION_TOKEN", None)
        try:
            self.assertEqual(configured_lab_session_token(), "")
            self.assertEqual(obtain_lab_nexus_session("http://127.0.0.1:9/"), "")
        finally:
            if prev_a is not None:
                os.environ["NEX_RED_LAB_SESSION_TOKEN"] = prev_a
            if prev_b is not None:
                os.environ["NEXUS_LAB_SESSION_TOKEN"] = prev_b

    def test_lab_session_posts_to_verify_session(self):
        _VerifySessionMint.last_token = ""
        _VerifySessionMint.last_host = ""
        server = HTTPServer(("127.0.0.1", 0), _VerifySessionMint)
        port = server.server_address[1]
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        prev = os.environ.get("NEX_RED_LAB_SESSION_TOKEN")
        os.environ["NEX_RED_LAB_SESSION_TOKEN"] = "lab-ok"
        try:
            with patch.object(config, "gateway_url", f"http://127.0.0.1:{port}"):
                cookie = obtain_lab_nexus_session(
                    "http://portfolio.nexus-lab.test/",
                    "portfolio.nexus-lab.test",
                )
        finally:
            server.shutdown()
            server.server_close()
            if prev is None:
                os.environ.pop("NEX_RED_LAB_SESSION_TOKEN", None)
            else:
                os.environ["NEX_RED_LAB_SESSION_TOKEN"] = prev
        self.assertEqual(cookie, "minted-lab-cookie")
        self.assertIn("portfolio.nexus-lab.test", _VerifySessionMint.last_host.lower())
        self.assertEqual(_VerifySessionMint.last_token, "lab-ok")


if __name__ == "__main__":
    unittest.main()
