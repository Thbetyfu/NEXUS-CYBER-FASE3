"""Public Caddy must not reverse-proxy wizard mutate/list APIs to :3010."""

from __future__ import annotations

import unittest
from pathlib import Path

CADDYFILE = Path(__file__).resolve().parents[2] / "deploy-local" / "Caddyfile"


class TestCaddyStarterPublicProxy(unittest.TestCase):
    def test_portal_and_starter_hosts_are_get_preview_only(self) -> None:
        raw = CADDYFILE.read_text(encoding="utf-8")
        self.assertTrue(CADDYFILE.is_file(), CADDYFILE)
        # Ignore comments that mention the forbidden catch-all as a warning.
        code_lines = [
            ln for ln in raw.splitlines() if ln.strip() and not ln.lstrip().startswith("#")
        ]
        text = "\n".join(code_lines)
        self.assertNotIn("handle_path /starter/*", text)
        self.assertNotIn("path /starter/*", text)
        self.assertIn("@starterPublicGet", text)
        self.assertIn("method GET HEAD", text)
        self.assertIn("/starter/preview", text)
        self.assertIn("uri strip_prefix /starter", text)
        portal_idx = raw.index("http://portal.nexus-lab.test")
        starter_idx = raw.index("http://starter.nexus-lab.test")
        portal_block = raw[portal_idx:starter_idx]
        self.assertIn("reverse_proxy host.docker.internal:3010", portal_block)
        self.assertIn("reverse_proxy host.docker.internal:3003", portal_block)
        leftover = raw[starter_idx:]
        named_end = leftover.find("\n:80 {")
        starter_block = leftover if named_end < 0 else leftover[:named_end]
        self.assertIn("path / /preview /preview/ /preview/*", starter_block)
        self.assertNotIn("handle_path", starter_block)
        starter_code = [
            ln.strip()
            for ln in starter_block.splitlines()
            if ln.strip() and not ln.strip().startswith("#")
        ]
        self.assertFalse(
            any(ln == "reverse_proxy host.docker.internal:3010" for ln in starter_code[:4]),
            "starter.nexus-lab.test must not reverse_proxy all methods",
        )
