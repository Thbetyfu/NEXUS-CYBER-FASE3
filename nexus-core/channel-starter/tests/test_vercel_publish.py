"""Vercel publish is per-site folder, never the Nexus monorepo."""

from __future__ import annotations

import os
import sys
import unittest
from unittest.mock import patch

package_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if package_root not in sys.path:
    sys.path.insert(0, package_root)

from channel_starter.config import load_wizard_env
from channel_starter.types import SiteCategory, SiteManifest, PricingTier
from channel_starter.vercel_publish import _is_safe_site_dir, _parse_production_url, publish_site, vercel_token


class TestVercelPublish(unittest.TestCase):
    def test_parse_prefers_slug_production_url(self):
        text = (
            "Inspect: https://warung-bu-siti-abc123.vercel.app\n"
            "Production: https://warung-bu-siti.vercel.app\n"
        )
        self.assertEqual(_parse_production_url(text, "warung-bu-siti"), "https://warung-bu-siti.vercel.app")

    def test_refuses_monorepo_root(self):
        self.assertFalse(_is_safe_site_dir(__import__("pathlib").Path(package_root).parent))

    def test_disabled_flag_skips(self):
        manifest = SiteManifest(
            site_id="CS-TEST",
            slug="kedai-palet-biru",
            business_name="Kedai",
            category=SiteCategory.FNB,
            tier=PricingTier.STARTER,
            subdomain="kedai-palet-biru.nexus-lab.test",
            output_dir="/tmp/no-such-site",
            index_path="/tmp/no-such-site/index.html",
        )
        with patch.dict(os.environ, {"CHANNEL_STARTER_VERCEL_PUBLISH": "0"}, clear=False):
            result = publish_site(manifest)
        self.assertTrue(result.get("skipped"))
        self.assertFalse(result.get("ok"))
        self.assertEqual(
            result.get("user_message"),
            "publish gagal: CHANNEL_STARTER_VERCEL_PUBLISH dimatikan di mesin wizard",
        )

    def test_no_token_honest_skip(self):
        manifest = SiteManifest(
            site_id="CS-TEST",
            slug="kedai-palet-biru",
            business_name="Kedai",
            category=SiteCategory.FNB,
            tier=PricingTier.STARTER,
            subdomain="kedai-palet-biru.nexus-lab.test",
            output_dir="/tmp/no-such-site",
            index_path="/tmp/no-such-site/index.html",
        )
        with patch.dict(os.environ, {"CHANNEL_STARTER_VERCEL_PUBLISH": "auto"}, clear=False), patch(
            "channel_starter.vercel_publish.vercel_token",
            return_value="",
        ):
            result = publish_site(manifest)
        self.assertFalse(result.get("ok"))
        self.assertTrue(result.get("skipped"))
        self.assertEqual(result.get("user_message"), "publish gagal: set token di mesin wizard")

    def test_demo_slug_not_published(self):
        manifest = SiteManifest(
            site_id="CS-DEMO0001",
            slug="contoh-nexcent",
            business_name="Contoh Nexcent",
            category=SiteCategory.FNB,
            tier=PricingTier.STARTER,
            subdomain="contoh-nexcent.nexus-lab.test",
            output_dir="/tmp/contoh-nexcent",
            index_path="/tmp/contoh-nexcent/index.html",
        )
        with patch.dict(os.environ, {"CHANNEL_STARTER_VERCEL_PUBLISH": "1", "VERCEL_TOKEN": "fake"}, clear=False):
            result = publish_site(manifest)
        self.assertTrue(result.get("skipped"))

    def test_load_wizard_env_does_not_override(self):
        import tempfile
        from pathlib import Path

        with tempfile.TemporaryDirectory() as tmp:
            env_file = Path(tmp) / ".env"
            env_file.write_text("VERCEL_TOKEN=from-file\n", encoding="utf-8")
            with patch.dict(os.environ, {"VERCEL_TOKEN": "from-process"}, clear=False):
                load_wizard_env(path=env_file)
                self.assertEqual(os.environ["VERCEL_TOKEN"], "from-process")

    def test_vercel_token_reads_windows_auth_json(self):
        import json
        import tempfile
        from pathlib import Path

        with tempfile.TemporaryDirectory() as tmp:
            auth = Path(tmp) / "xdg.data" / "com.vercel.cli" / "auth.json"
            auth.parent.mkdir(parents=True)
            auth.write_text(json.dumps({"token": "win-cli-token"}), encoding="utf-8")
            with patch.dict(
                os.environ,
                {"LOCALAPPDATA": tmp, "APPDATA": tmp, "VERCEL_TOKEN": ""},
                clear=False,
            ):
                self.assertEqual(vercel_token(), "win-cli-token")


if __name__ == "__main__":
    unittest.main()
