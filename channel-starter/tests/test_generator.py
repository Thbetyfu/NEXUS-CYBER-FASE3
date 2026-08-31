"""Tests for Channel Starter deploy routing (S-3)."""

import json
import os
import sys
import tempfile
import unittest
from pathlib import Path

package_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if package_root not in sys.path:
    sys.path.insert(0, package_root)

from channel_starter.deploy import (
    apply_routing,
    deploy_manifest,
    render_site_caddy_block,
    site_address,
    write_aggregate_caddy,
)
from channel_starter.generator import generate_from_dict, generate_site, list_sites
from channel_starter.types import SiteCategory, SiteForm, PricingTier


class TestChannelStarterDeploy(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.sites_root = os.path.join(self.tmp.name, "sites")

    def tearDown(self):
        self.tmp.cleanup()

    def test_generate_all_three_templates(self):
        for category in SiteCategory:
            form = SiteForm(
                business_name=f"Test {category.value}",
                category=category,
                whatsapp="081234567890",
            )
            manifest = generate_site(form, sites_root=self.sites_root)
            with open(manifest.index_path, encoding="utf-8") as handle:
                html = handle.read()
            self.assertIn("Test", html)
            self.assertIn("WhatsApp", html)
            self.assertIn("Channel Starter", html)

    def test_presets_applied_when_empty(self):
        manifest = generate_from_dict(
            {"business_name": "Warung", "category": "fnb", "whatsapp": "628111222333"},
            sites_root=self.sites_root,
        )
        with open(manifest.index_path, encoding="utf-8") as handle:
            html = handle.read()
        self.assertIn("Rasa lokal", html)

    def test_whatsapp_normalized(self):
        form = SiteForm(business_name="Jasa", category=SiteCategory.JASA, whatsapp="081234567890")
        self.assertTrue(form.whatsapp.startswith("62"))

    def test_aggregate_caddy_uses_container_paths(self):
        manifest = generate_from_dict(
            {"business_name": "Kedai Kopi", "category": "profil", "whatsapp": "628999888777"},
            sites_root=self.sites_root,
        )
        block = render_site_caddy_block(manifest)
        self.assertIn("/srv/channel-starter/kedai-kopi", block)
        self.assertIn("http://kedai-kopi.nexus-lab.test", block)

        routing = apply_routing(sites_root=self.sites_root)
        aggregate = routing["aggregate_caddy"]
        self.assertTrue(os.path.isfile(aggregate))
        content = open(aggregate, encoding="utf-8").read()
        self.assertIn("kedai-kopi.nexus-lab.test", content)

        registry_path = routing["hosts_registry"]
        registry = json.loads(open(registry_path, encoding="utf-8").read())
        self.assertEqual(len(registry["entries"]), 1)
        self.assertEqual(registry["entries"][0]["subdomain"], "kedai-kopi.nexus-lab.test")

    def test_deploy_manifest_refreshes_routing(self):
        manifest = generate_from_dict(
            {"business_name": "Toko", "category": "jasa", "whatsapp": "6281234567890"},
            sites_root=self.sites_root,
        )
        deploy = deploy_manifest(manifest, sites_root=self.sites_root)
        self.assertEqual(deploy["routing"]["site_count"], 1)
        self.assertIn("aggregate_caddy", deploy["routing"])
        self.assertEqual(len(list_sites(self.sites_root)), 1)

    def test_nexcent_theme_and_publish_pack(self):
        manifest = generate_from_dict(
            {
                "business_name": "Warung Palet",
                "category": "fnb",
                "whatsapp": "628111222333",
                "theme": "hutan",
                "custom_domain": "warungpalet.com",
                "offering_1_title": "Nasi uduk",
                "offering_1_body": "Porsi pagi.",
                "hero_image_url": "javascript:alert(1)",
            },
            sites_root=self.sites_root,
        )
        html = open(manifest.index_path, encoding="utf-8").read()
        self.assertIn("#1B5E1F", html)
        self.assertIn("Nasi uduk", html)
        self.assertIn("warungpalet.com", html)
        self.assertIn("Tepi header Nexus", html)
        self.assertNotIn("javascript:", html)
        vercel_path = Path(manifest.output_dir) / "vercel.json"
        self.assertTrue(vercel_path.is_file())
        vercel = json.loads(vercel_path.read_text(encoding="utf-8"))
        self.assertEqual(vercel["headers"][0]["headers"][-1]["value"], manifest.site_id)

    def test_caddy_starter_sends_security_headers(self):
        manifest = generate_from_dict(
            {"business_name": "Toko Header", "category": "jasa", "whatsapp": "6281234567890"},
            sites_root=self.sites_root,
        )
        block = render_site_caddy_block(manifest)
        self.assertIn("X-Content-Type-Options nosniff", block)
        self.assertIn("Content-Security-Policy", block)
        self.assertIn("file_server", block)

    def test_starter_tier_copy_honest(self):
        form = SiteForm(
            business_name="UMKM",
            whatsapp="6281234567890",
            tier=PricingTier.STARTER,
        )
        manifest = generate_site(form, sites_root=self.sites_root)
        with open(manifest.index_path, encoding="utf-8") as handle:
            html = handle.read()
        self.assertIn("bukan termasuk Starter", html)

    def test_site_address_http_for_lab(self):
        self.assertTrue(site_address("foo.nexus-lab.test").startswith("http://"))

    def test_upsell_changes_caddy_and_env(self):
        import channel_starter.config as cfg
        import channel_starter.upsell as upsell_mod

        deploy_dir = os.path.join(self.tmp.name, "deploy-local")
        os.makedirs(deploy_dir, exist_ok=True)
        cfg.DEPLOY_LOCAL_DIR = Path(deploy_dir)
        cfg.UPSELL_ENV_FILE = Path(deploy_dir) / "channel-starter-upsell.env"
        upsell_mod.DEPLOY_LOCAL_DIR = cfg.DEPLOY_LOCAL_DIR
        upsell_mod.UPSELL_ENV_FILE = cfg.UPSELL_ENV_FILE

        manifest = generate_from_dict(
            {"business_name": "Toko Upsell", "category": "jasa", "whatsapp": "6281234567890"},
            sites_root=self.sites_root,
        )
        from channel_starter.generator import get_manifest
        from channel_starter.upsell import disable_upsell, enable_upsell, upsell_status

        static_block = render_site_caddy_block(manifest)
        self.assertIn("file_server", static_block)

        result = enable_upsell(
            manifest.slug,
            tier=PricingTier.COWORK,
            sites_root=self.sites_root,
            create_job=False,
        )
        self.assertEqual(result["protected_host"], manifest.subdomain)
        self.assertTrue(cfg.UPSELL_ENV_FILE.is_file())
        gaas_block = render_site_caddy_block(get_manifest(manifest.slug, sites_root=self.sites_root))
        self.assertIn("reverse_proxy gateway:8080", gaas_block)

        status = upsell_status(sites_root=self.sites_root)
        self.assertIsNotNone(status["active"])

        disable_upsell(manifest.slug, sites_root=self.sites_root)
        self.assertIsNone(upsell_status(sites_root=self.sites_root)["active"])


if __name__ == "__main__":
    unittest.main()
