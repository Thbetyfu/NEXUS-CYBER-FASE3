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
from channel_starter.vercel_publish import (
    MSG_NO_TOKEN,
    MSG_SCOPE,
    _is_safe_site_dir,
    _parse_production_url,
    _vercel_subprocess_env,
    build_deploy_cmd,
    cli_auth_token,
    env_vercel_token,
    publish_site,
    vercel_scope,
    vercel_token,
)


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
        self.assertEqual(result.get("user_message"), MSG_NO_TOKEN)
        self.assertIn("vercel login", MSG_NO_TOKEN)
        self.assertIn("VERCEL_TOKEN", MSG_NO_TOKEN)

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

    def test_env_token_wins_over_cli_auth_json(self):
        import json
        import tempfile
        from pathlib import Path

        with tempfile.TemporaryDirectory() as tmp:
            auth = Path(tmp) / "com.vercel.cli" / "auth.json"
            auth.parent.mkdir(parents=True)
            auth.write_text(json.dumps({"token": "win-cli-token"}), encoding="utf-8")
            with patch.dict(
                os.environ,
                {"LOCALAPPDATA": tmp, "APPDATA": tmp, "VERCEL_TOKEN": "from-env"},
                clear=False,
            ):
                self.assertEqual(env_vercel_token(), "from-env")
                self.assertEqual(cli_auth_token(), "win-cli-token")
                self.assertEqual(vercel_token(), "from-env")

    def test_cli_auth_json_used_when_env_empty(self):
        import json
        import tempfile
        from pathlib import Path

        with tempfile.TemporaryDirectory() as tmp:
            auth = Path(tmp) / "com.vercel.cli" / "auth.json"
            auth.parent.mkdir(parents=True)
            auth.write_text(json.dumps({"token": "win-cli-token"}), encoding="utf-8")
            with patch.dict(
                os.environ,
                {"LOCALAPPDATA": tmp, "APPDATA": tmp, "VERCEL_TOKEN": ""},
                clear=False,
            ):
                self.assertEqual(env_vercel_token(), "")
                self.assertEqual(cli_auth_token(), "win-cli-token")
                self.assertEqual(vercel_token(), "win-cli-token")

    def test_scope_only_from_channel_starter_env(self):
        with patch.dict(
            os.environ,
            {
                "VERCEL_ORG_ID": "team_should_not_become_scope",
                "CHANNEL_STARTER_VERCEL_SCOPE": "",
            },
            clear=False,
        ):
            self.assertEqual(vercel_scope(), "")
        with patch.dict(
            os.environ,
            {"CHANNEL_STARTER_VERCEL_SCOPE": "warung-team"},
            clear=False,
        ):
            self.assertEqual(vercel_scope(), "warung-team")

    def test_deploy_cmd_omits_scope_unless_env_set(self):
        from pathlib import Path

        site = Path("/tmp/kedai")
        with patch.dict(os.environ, {"CHANNEL_STARTER_VERCEL_SCOPE": ""}, clear=False):
            cmd = build_deploy_cmd(["vercel"], site, "kedai-palet-biru", "tok")
        self.assertNotIn("--scope", cmd)
        self.assertIn("--token", cmd)
        with patch.dict(os.environ, {"CHANNEL_STARTER_VERCEL_SCOPE": "warung-team"}, clear=False):
            cmd = build_deploy_cmd(["vercel"], site, "kedai-palet-biru", "tok")
        self.assertIn("--scope", cmd)
        self.assertIn("warung-team", cmd)

    def test_subprocess_env_drops_org_and_project_ids(self):
        with patch.dict(
            os.environ,
            {"VERCEL_ORG_ID": "team_from_link", "VERCEL_PROJECT_ID": "prj_from_link"},
            clear=False,
        ):
            env = _vercel_subprocess_env("from-env")
        self.assertEqual(env["VERCEL_TOKEN"], "from-env")
        self.assertNotIn("VERCEL_ORG_ID", env)
        self.assertNotIn("VERCEL_PROJECT_ID", env)

    def _site_manifest(self, tmp: str, slug: str = "kedai-palet-biru"):
        from pathlib import Path

        site = Path(tmp) / slug
        site.mkdir()
        (site / "index.html").write_text("<html></html>", encoding="utf-8")
        return SiteManifest(
            site_id="CS-TEST",
            slug=slug,
            business_name="Kedai",
            category=SiteCategory.FNB,
            tier=PricingTier.STARTER,
            subdomain=f"{slug}.nexus-lab.test",
            output_dir=str(site),
            index_path=str(site / "index.html"),
        )

    def test_publish_env_token_path_omits_stale_scope(self):
        import tempfile
        from unittest.mock import MagicMock

        with tempfile.TemporaryDirectory() as tmp:
            manifest = self._site_manifest(tmp)
            proc = MagicMock()
            proc.returncode = 0
            proc.stdout = "https://kedai-palet-biru.vercel.app\n"
            proc.stderr = ""
            captured: dict = {}

            def fake_run(cmd, **kwargs):
                captured["cmd"] = cmd
                captured["env"] = kwargs.get("env") or {}
                return proc

            with patch.dict(
                os.environ,
                {
                    "CHANNEL_STARTER_VERCEL_PUBLISH": "1",
                    "VERCEL_TOKEN": "env-token",
                    "CHANNEL_STARTER_VERCEL_SCOPE": "",
                    "VERCEL_ORG_ID": "team_stale",
                },
                clear=False,
            ), patch("channel_starter.vercel_publish._find_vercel_bin", return_value=["vercel"]), patch(
                "channel_starter.vercel_publish.subprocess.run",
                side_effect=fake_run,
            ), patch("channel_starter.vercel_publish.save_manifest"):
                result = publish_site(manifest)
        self.assertTrue(result.get("ok"))
        self.assertEqual(result.get("url"), "https://kedai-palet-biru.vercel.app")
        self.assertIn("--token", captured["cmd"])
        self.assertIn("env-token", captured["cmd"])
        self.assertNotIn("--scope", captured["cmd"])
        self.assertNotIn("VERCEL_ORG_ID", captured["env"])

    def test_publish_cli_login_path_omits_stale_scope(self):
        import json
        import tempfile
        from pathlib import Path
        from unittest.mock import MagicMock

        with tempfile.TemporaryDirectory() as tmp:
            auth = Path(tmp) / "com.vercel.cli" / "auth.json"
            auth.parent.mkdir(parents=True)
            auth.write_text(json.dumps({"token": "cli-login-token"}), encoding="utf-8")
            config = Path(tmp) / "com.vercel.cli" / "config.json"
            config.write_text(json.dumps({"currentTeam": "team_stale_from_cli"}), encoding="utf-8")
            manifest = self._site_manifest(tmp)
            proc = MagicMock()
            proc.returncode = 0
            proc.stdout = "https://kedai-palet-biru.vercel.app\n"
            proc.stderr = ""
            captured: dict = {}

            def fake_run(cmd, **kwargs):
                captured["cmd"] = cmd
                captured["env"] = kwargs.get("env") or {}
                return proc

            with patch.dict(
                os.environ,
                {
                    "CHANNEL_STARTER_VERCEL_PUBLISH": "1",
                    "VERCEL_TOKEN": "",
                    "CHANNEL_STARTER_VERCEL_SCOPE": "",
                    "VERCEL_ORG_ID": "team_from_link",
                    "LOCALAPPDATA": tmp,
                    "APPDATA": tmp,
                },
                clear=False,
            ), patch("channel_starter.vercel_publish._find_vercel_bin", return_value=["vercel"]), patch(
                "channel_starter.vercel_publish.subprocess.run",
                side_effect=fake_run,
            ), patch("channel_starter.vercel_publish.save_manifest"):
                result = publish_site(manifest)
        self.assertTrue(result.get("ok"))
        self.assertEqual(result.get("url"), "https://kedai-palet-biru.vercel.app")
        self.assertIn("cli-login-token", captured["cmd"])
        self.assertNotIn("--scope", captured["cmd"])
        self.assertNotIn("team_stale_from_cli", captured["cmd"])
        self.assertNotIn("VERCEL_ORG_ID", captured["env"])

    def test_scope_not_accessible_honest_message(self):
        import tempfile
        from pathlib import Path
        from unittest.mock import MagicMock

        with tempfile.TemporaryDirectory() as tmp:
            site = Path(tmp) / "kedai-palet-biru"
            site.mkdir()
            (site / "index.html").write_text("<html></html>", encoding="utf-8")
            manifest = SiteManifest(
                site_id="CS-TEST",
                slug="kedai-palet-biru",
                business_name="Kedai",
                category=SiteCategory.FNB,
                tier=PricingTier.STARTER,
                subdomain="kedai-palet-biru.nexus-lab.test",
                output_dir=str(site),
                index_path=str(site / "index.html"),
            )
            proc = MagicMock()
            proc.returncode = 1
            proc.stdout = ""
            proc.stderr = "Error: You do not have access to the specified account (scope-not-accessible)"
            with patch.dict(
                os.environ,
                {"CHANNEL_STARTER_VERCEL_PUBLISH": "1", "VERCEL_TOKEN": "fake"},
                clear=False,
            ), patch("channel_starter.vercel_publish._find_vercel_bin", return_value=["vercel"]), patch(
                "channel_starter.vercel_publish.subprocess.run",
                return_value=proc,
            ):
                result = publish_site(manifest)
        self.assertFalse(result.get("ok"))
        self.assertEqual(result.get("user_message"), MSG_SCOPE)


if __name__ == "__main__":
    unittest.main()
