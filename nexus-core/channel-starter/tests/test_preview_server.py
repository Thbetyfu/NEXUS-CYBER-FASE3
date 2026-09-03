"""Wizard preview: HTML 404, generate → /preview, committed example."""

from __future__ import annotations

import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

package_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if package_root not in sys.path:
    sys.path.insert(0, package_root)

from channel_starter.config import EXAMPLES_DIR
from channel_starter.server import app, preview_missing_html


class TestPreviewServer(unittest.TestCase):
    def test_committed_example_exists(self):
        from channel_starter.config import SITES_DIR

        index = SITES_DIR / "contoh-nexcent" / "index.html"
        self.assertTrue(
            index.is_file(),
            "sites/contoh-nexcent must be committed so old wizard /preview works after pull",
        )
        html = index.read_text(encoding="utf-8")
        self.assertIn("Contoh Nexcent", html)
        self.assertIn("#4CAF4F", html)
        example = EXAMPLES_DIR / "contoh-nexcent" / "index.html"
        self.assertTrue(example.is_file())

    def test_missing_preview_is_html_not_json(self):
        html = preview_missing_html("warung-uji-figma")
        self.assertIn("Site tidak ada di komputer ini", html)
        self.assertIn("warung-uji-figma", html)
        self.assertIn("/preview/contoh-nexcent", html)
        self.assertNotIn('"detail": "Site not found"', html)

    def test_http_preview_404_and_generate_redirect(self):
        try:
            from fastapi.testclient import TestClient
        except (ImportError, RuntimeError):
            self.skipTest("fastapi TestClient unavailable")

        client = TestClient(app)
        missing = client.get("/preview/warung-uji-figma-tidak-ada")
        self.assertEqual(missing.status_code, 404)
        self.assertIn("text/html", missing.headers.get("content-type", ""))
        self.assertIn("Site tidak ada di komputer ini", missing.text)
        self.assertNotIn('"detail": "Site not found"', missing.text)

        example = client.get("/preview/contoh-nexcent")
        self.assertEqual(example.status_code, 200)
        self.assertIn("Contoh Nexcent", example.text)

        listing = client.get("/preview")
        self.assertEqual(listing.status_code, 200)
        self.assertIn("contoh-nexcent", listing.text)

        tmp = tempfile.TemporaryDirectory()
        sites = Path(tmp.name) / "sites"
        try:
            with (
                patch("channel_starter.server.generate_from_dict") as gen,
                patch("channel_starter.server.deploy_manifest", return_value={"vercel": {}}),
            ):
                from channel_starter.types import SiteCategory, SiteManifest, PricingTier

                gen.return_value = SiteManifest(
                    site_id="CS-TEST",
                    slug="uji-redirect",
                    business_name="Uji",
                    category=SiteCategory.PROFIL,
                    tier=PricingTier.STARTER,
                    subdomain="uji-redirect.nexus-lab.test",
                    output_dir=str(sites / "uji-redirect"),
                    index_path=str(sites / "uji-redirect" / "index.html"),
                )
                res = client.post(
                    "/generate",
                    data={"business_name": "Uji Redirect", "whatsapp": "081234567890"},
                    follow_redirects=False,
                )
                self.assertEqual(res.status_code, 303)
                self.assertEqual(res.headers.get("location"), "/preview/uji-redirect")

                json_res = client.post(
                    "/generate",
                    data={"business_name": "Uji Redirect", "whatsapp": "081234567890"},
                    headers={"Accept": "application/json"},
                    follow_redirects=False,
                )
                self.assertEqual(json_res.status_code, 200)
                body = json_res.json()
                self.assertEqual(body["slug"], "uji-redirect")
                self.assertIn("vercel", body)

                fmt = client.post(
                    "/generate?format=json",
                    data={"business_name": "Uji Redirect", "whatsapp": "081234567890"},
                    follow_redirects=False,
                )
                self.assertEqual(fmt.status_code, 200)
                self.assertEqual(fmt.json()["slug"], "uji-redirect")

            with patch(
                "channel_starter.server.publish_slug",
                return_value={
                    "ok": False,
                    "skipped": True,
                    "user_message": "publish gagal: set token di mesin wizard",
                },
            ):
                pub = client.post("/publish/uji-redirect", headers={"Accept": "application/json"})
            self.assertEqual(pub.status_code, 200)
            self.assertEqual(pub.json()["user_message"], "publish gagal: set token di mesin wizard")
        finally:
            tmp.cleanup()

    def test_browser_never_gets_json_site_not_found(self):
        try:
            from fastapi.testclient import TestClient
        except (ImportError, RuntimeError):
            self.skipTest("fastapi TestClient unavailable")

        client = TestClient(app)
        html_headers = {"Accept": "text/html"}
        bounced = client.get(
            "/sites/slug-yang-tidak-ada",
            headers=html_headers,
            follow_redirects=False,
        )
        self.assertEqual(bounced.status_code, 303)
        self.assertEqual(bounced.headers.get("location"), "/preview/slug-yang-tidak-ada")

        followed = client.get("/sites/slug-yang-tidak-ada", headers=html_headers)
        self.assertEqual(followed.status_code, 404)
        self.assertIn("text/html", followed.headers.get("content-type", ""))
        self.assertNotIn('"detail": "Site not found"', followed.text)
        self.assertIn("Site tidak ada di komputer ini", followed.text)

        api = client.get("/sites/slug-yang-tidak-ada", headers={"Accept": "application/json"})
        self.assertEqual(api.status_code, 404)
        self.assertEqual(api.json()["detail"], "Site not found")

        bad = client.post("/generate", data={}, headers=html_headers)
        self.assertEqual(bad.status_code, 400)
        self.assertIn("text/html", bad.headers.get("content-type", ""))
        self.assertIn("Kembali ke form", bad.text)


if __name__ == "__main__":
    unittest.main()
