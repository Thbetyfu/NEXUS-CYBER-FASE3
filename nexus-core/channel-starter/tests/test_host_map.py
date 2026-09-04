"""Host map write path: two tepi keep portfolio; junk Host/origin never written."""

from __future__ import annotations

import json
import os
import sys
import tempfile
import unittest
from pathlib import Path

package_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if package_root not in sys.path:
    sys.path.insert(0, package_root)

from channel_starter.generator import generate_from_dict
from channel_starter.host_map import (
    host_map_path,
    is_lab_map_host,
    is_lab_map_origin,
    write_host_map,
    write_host_map_from_sites,
)
from channel_starter.types import PricingTier


class TestHostMapValidation(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.sites_root = os.path.join(self.tmp.name, "sites")
        self.deploy_dir = Path(self.tmp.name) / "deploy-local"
        self.deploy_dir.mkdir(parents=True, exist_ok=True)
        (self.deploy_dir / ".env").write_text(
            "PROTECTED_HOST=portfolio.nexus-lab.test\n"
            "TARGET_BACKEND=https://portfolio-website-three-ruddy-65.vercel.app\n",
            encoding="utf-8",
        )
        import channel_starter.config as cfg
        import channel_starter.host_map as host_map_mod

        self._cfg = cfg
        self._prev_deploy = cfg.DEPLOY_LOCAL_DIR
        cfg.DEPLOY_LOCAL_DIR = self.deploy_dir
        host_map_mod.cfg = cfg

    def tearDown(self):
        self._cfg.DEPLOY_LOCAL_DIR = self._prev_deploy
        self.tmp.cleanup()

    def test_lab_host_and_origin_predicates(self):
        self.assertTrue(is_lab_map_host("bu-grace.nexus-lab.test"))
        self.assertTrue(is_lab_map_host("portfolio.nexus-lab.test"))
        self.assertFalse(is_lab_map_host("evil.com"))
        self.assertFalse(is_lab_map_host("*.nexus-lab.test"))
        self.assertFalse(is_lab_map_host("portfolio.nexus-lab.test\r\nX: 1"))
        self.assertTrue(is_lab_map_origin("http://channel-origin:8099/warung/"))
        self.assertTrue(is_lab_map_origin("https://x.vercel.app"))
        self.assertFalse(is_lab_map_origin("ftp://channel-origin:8099/x/"))
        self.assertFalse(is_lab_map_origin("javascript:alert(1)"))
        self.assertFalse(is_lab_map_origin("http://attacker.example/"))
        self.assertFalse(is_lab_map_origin("http://169.254.169.254/"))

    def test_write_host_map_rejects_junk_keeps_portfolio(self):
        write_host_map(
            [
                {
                    "host": "toko.nexus-lab.test",
                    "origin": "http://channel-origin:8099/toko/",
                    "kind": "tepi",
                    "slug": "toko",
                },
                {"host": "evil.com", "origin": "http://channel-origin:8099/x/", "kind": "tepi"},
                {"host": "*.nexus-lab.test", "origin": "http://channel-origin:8099/x/"},
                {
                    "host": "crlf.nexus-lab.test\r\nHost: evil.com",
                    "origin": "http://channel-origin:8099/x/",
                },
                {"host": "ftp.nexus-lab.test", "origin": "ftp://channel-origin:8099/x/"},
            ]
        )
        payload = json.loads(host_map_path().read_text(encoding="utf-8"))
        hosts = {row["host"]: row["origin"] for row in payload["hosts"]}
        self.assertEqual(
            hosts["portfolio.nexus-lab.test"],
            "https://portfolio-website-three-ruddy-65.vercel.app",
        )
        self.assertEqual(hosts["toko.nexus-lab.test"], "http://channel-origin:8099/toko/")
        self.assertNotIn("evil.com", hosts)
        self.assertNotIn("*.nexus-lab.test", hosts)
        self.assertNotIn("ftp.nexus-lab.test", hosts)
        self.assertEqual(len(hosts), 2)

    def test_two_tepi_keep_portfolio(self):
        write_host_map(
            [
                {
                    "host": "satu.nexus-lab.test",
                    "origin": "http://channel-origin:8099/satu/",
                    "slug": "satu",
                },
                {
                    "host": "dua.nexus-lab.test",
                    "origin": "http://channel-origin:8099/dua/",
                    "slug": "dua",
                },
            ]
        )
        hosts = {
            row["host"]: row["origin"]
            for row in json.loads(host_map_path().read_text(encoding="utf-8"))["hosts"]
        }
        self.assertIn("portfolio.nexus-lab.test", hosts)
        self.assertIn("satu.nexus-lab.test", hosts)
        self.assertIn("dua.nexus-lab.test", hosts)
        self.assertNotEqual(hosts["satu.nexus-lab.test"], hosts["portfolio.nexus-lab.test"])

    def test_generate_does_not_join_host_map(self):
        manifest = generate_from_dict(
            {"business_name": "Tanpa WAF Map", "category": "profil", "whatsapp": "6283333333333"},
            sites_root=self.sites_root,
        )
        self.assertEqual(manifest.tier, PricingTier.STARTER)
        self.assertFalse(manifest.gaas_active)
        write_host_map_from_sites(sites_root=self.sites_root)
        payload = json.loads(host_map_path().read_text(encoding="utf-8"))
        hosts = [row["host"] for row in payload["hosts"]]
        self.assertEqual(hosts, ["portfolio.nexus-lab.test"])
        self.assertNotIn(manifest.subdomain, hosts)


if __name__ == "__main__":
    unittest.main()
