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
        self._prev_vercel = os.environ.get("CHANNEL_STARTER_VERCEL_PUBLISH")
        os.environ["CHANNEL_STARTER_VERCEL_PUBLISH"] = "0"

    def tearDown(self):
        if self._prev_vercel is None:
            os.environ.pop("CHANNEL_STARTER_VERCEL_PUBLISH", None)
        else:
            os.environ["CHANNEL_STARTER_VERCEL_PUBLISH"] = self._prev_vercel
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
        publish = (Path(manifest.output_dir) / "PUBLISH.txt").read_text(encoding="utf-8")
        self.assertIn("NEXUS-CYBER-FASE3", publish)
        self.assertIn("men-deploy folder", publish)
        self.assertIn("JANGAN Connect Git", publish)
        self.assertIn("warung-palet", publish)

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

    def test_preview_falls_back_to_examples(self):
        from channel_starter.generator import is_safe_slug, resolve_preview_index

        examples = os.path.join(self.tmp.name, "examples")
        generate_from_dict(
            {
                "business_name": "Contoh Nexcent",
                "category": "fnb",
                "whatsapp": "6281234567890",
                "slug": "contoh-nexcent",
            },
            sites_root=examples,
        )
        found = resolve_preview_index(
            "contoh-nexcent",
            sites_root=self.sites_root,
            examples_root=examples,
        )
        self.assertIsNotNone(found)
        self.assertIn("Contoh Nexcent", Path(found).read_text(encoding="utf-8"))
        empty = resolve_preview_index(
            "warung-uji-figma",
            sites_root=self.sites_root,
            examples_root=examples,
        )
        self.assertIsNone(empty)
        self.assertFalse(is_safe_slug("../etc"))
        self.assertFalse(is_safe_slug("a/b"))
        self.assertTrue(is_safe_slug("contoh-nexcent"))

    def test_ensure_demo_site_copies_from_examples(self):
        from channel_starter.generator import DEMO_SLUG, ensure_demo_site

        examples = os.path.join(self.tmp.name, "examples")
        generate_from_dict(
            {
                "business_name": "Contoh Nexcent",
                "whatsapp": "6281234567890",
                "slug": DEMO_SLUG,
            },
            sites_root=examples,
        )
        empty_sites = os.path.join(self.tmp.name, "empty-sites")
        found = ensure_demo_site(sites_root=empty_sites, examples_root=examples)
        self.assertIsNotNone(found)
        self.assertTrue(Path(found).is_file())
        self.assertIn("Contoh Nexcent", Path(found).read_text(encoding="utf-8"))

    def test_preview_prefers_generated_sites(self):
        from channel_starter.generator import resolve_preview_index

        examples = os.path.join(self.tmp.name, "examples")
        generate_from_dict(
            {"business_name": "Dari Contoh", "whatsapp": "6281234567890", "slug": "sama"},
            sites_root=examples,
        )
        generate_from_dict(
            {"business_name": "Dari Sites", "whatsapp": "6281234567890", "slug": "sama"},
            sites_root=self.sites_root,
        )
        found = resolve_preview_index(
            "sama",
            sites_root=self.sites_root,
            examples_root=examples,
        )
        self.assertIn("Dari Sites", Path(found).read_text(encoding="utf-8"))

    def test_second_generate_same_name_gets_unique_slug(self):
        first = generate_from_dict(
            {
                "business_name": "Bu Grace",
                "category": "jasa",
                "whatsapp": "6281111111111",
                "tagline": "jahit",
                "portal_owner_id": "alice",
            },
            sites_root=self.sites_root,
        )
        self.assertEqual(first.slug, "bu-grace")
        first_html = Path(first.index_path).read_text(encoding="utf-8")
        self.assertIn("jahit", first_html)

        second = generate_from_dict(
            {
                "business_name": "Bu Grace",
                "category": "fnb",
                "whatsapp": "6282222222222",
                "tagline": "tahu",
                "portal_owner_id": "alice",
            },
            sites_root=self.sites_root,
        )
        self.assertEqual(second.slug, "bu-grace-2")
        self.assertTrue((Path(self.sites_root) / "bu-grace" / "index.html").is_file())
        self.assertIn("jahit", Path(first.index_path).read_text(encoding="utf-8"))
        self.assertIn("tahu", Path(second.index_path).read_text(encoding="utf-8"))
        slugs = {m.slug for m in list_sites(self.sites_root)}
        self.assertEqual(slugs, {"bu-grace", "bu-grace-2"})

        third = generate_from_dict(
            {
                "business_name": "Bu Grace",
                "whatsapp": "6283333333333",
                "tagline": "tahu",
                "slug": "bu-grace",
                "replaceExisting": "true",
                "portal_owner_id": "alice",
            },
            sites_root=self.sites_root,
        )
        self.assertEqual(third.slug, "bu-grace")
        self.assertIn("tahu", Path(first.index_path).read_text(encoding="utf-8"))
        self.assertIn("tahu", Path(second.index_path).read_text(encoding="utf-8"))

    def test_replace_existing_other_owner_does_not_clobber(self):
        generate_from_dict(
            {
                "business_name": "Bu Grace",
                "whatsapp": "6281111111111",
                "tagline": "milik-alice",
                "portal_owner_id": "alice",
            },
            sites_root=self.sites_root,
        )
        other = generate_from_dict(
            {
                "business_name": "Bu Grace",
                "whatsapp": "6282222222222",
                "tagline": "milik-bob",
                "slug": "bu-grace",
                "replaceExisting": True,
                "portal_owner_id": "bob",
            },
            sites_root=self.sites_root,
        )
        self.assertEqual(other.slug, "bu-grace-2")
        self.assertIn(
            "milik-alice",
            (Path(self.sites_root) / "bu-grace" / "index.html").read_text(encoding="utf-8"),
        )

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
        env_text = cfg.UPSELL_ENV_FILE.read_text(encoding="utf-8")
        self.assertNotIn("PROTECTED_HOST=", env_text)
        self.assertNotIn("TARGET_BACKEND=", env_text)

        status = upsell_status(sites_root=self.sites_root)
        self.assertIsNotNone(status["active"])

        disable_upsell(manifest.slug, sites_root=self.sites_root)
        self.assertIsNone(upsell_status(sites_root=self.sites_root)["active"])

    def test_upsell_tepi_pagar_tipis_skips_job(self):
        import channel_starter.config as cfg
        import channel_starter.upsell as upsell_mod

        deploy_dir = os.path.join(self.tmp.name, "deploy-local")
        os.makedirs(deploy_dir, exist_ok=True)
        cfg.DEPLOY_LOCAL_DIR = Path(deploy_dir)
        cfg.UPSELL_ENV_FILE = Path(deploy_dir) / "channel-starter-upsell.env"
        upsell_mod.DEPLOY_LOCAL_DIR = cfg.DEPLOY_LOCAL_DIR
        upsell_mod.UPSELL_ENV_FILE = cfg.UPSELL_ENV_FILE

        manifest = generate_from_dict(
            {"business_name": "Warung Pagar", "category": "fnb", "whatsapp": "6281234567890"},
            sites_root=self.sites_root,
        )
        from channel_starter.generator import get_manifest
        from channel_starter.upsell import enable_upsell

        result = enable_upsell(
            manifest.slug,
            tier=PricingTier.TEPI,
            sites_root=self.sites_root,
        )
        self.assertEqual(result["gaas_tier"], "tepi")
        self.assertEqual(result["cowork_job_id"], "")
        self.assertTrue(result["pagar_tipis"])
        self.assertIsNone(result["job_error"])
        self.assertNotEqual(PricingTier.TEPI, PricingTier.STARTER)
        self.assertNotEqual(PricingTier.TEPI, PricingTier.COWORK)
        gaas_block = render_site_caddy_block(get_manifest(manifest.slug, sites_root=self.sites_root))
        self.assertIn("reverse_proxy gateway:8080", gaas_block)

    def test_starter_generate_is_not_tepi_waf(self):
        manifest = generate_from_dict(
            {"business_name": "Warung Starter", "category": "fnb", "whatsapp": "6281234567890"},
            sites_root=self.sites_root,
        )
        self.assertEqual(manifest.tier, PricingTier.STARTER)
        self.assertFalse(manifest.gaas_active)
        self.assertIsNone(manifest.gaas_tier)
        self.assertNotEqual(manifest.tier, PricingTier.TEPI)
        block = render_site_caddy_block(manifest)
        self.assertIn("file_server", block)
        self.assertNotIn("reverse_proxy gateway:8080", block)

    def test_upsell_second_tepi_keeps_portfolio_and_first_slug(self):
        import channel_starter.config as cfg
        import channel_starter.upsell as upsell_mod

        deploy_dir = os.path.join(self.tmp.name, "deploy-local")
        os.makedirs(deploy_dir, exist_ok=True)
        (Path(deploy_dir) / ".env").write_text(
            "PROTECTED_HOST=portfolio.nexus-lab.test\n"
            "TARGET_BACKEND=https://portfolio-website-three-ruddy-65.vercel.app\n",
            encoding="utf-8",
        )
        cfg.DEPLOY_LOCAL_DIR = Path(deploy_dir)
        cfg.UPSELL_ENV_FILE = Path(deploy_dir) / "channel-starter-upsell.env"
        upsell_mod.DEPLOY_LOCAL_DIR = cfg.DEPLOY_LOCAL_DIR
        upsell_mod.UPSELL_ENV_FILE = cfg.UPSELL_ENV_FILE

        first = generate_from_dict(
            {"business_name": "Warung Satu", "category": "fnb", "whatsapp": "6281111111111"},
            sites_root=self.sites_root,
        )
        second = generate_from_dict(
            {"business_name": "Warung Dua", "category": "jasa", "whatsapp": "6282222222222"},
            sites_root=self.sites_root,
        )
        from channel_starter.generator import get_manifest
        from channel_starter.host_map import host_map_path
        from channel_starter.upsell import enable_upsell

        enable_upsell(first.slug, tier=PricingTier.TEPI, sites_root=self.sites_root)
        result = enable_upsell(second.slug, tier=PricingTier.TEPI, sites_root=self.sites_root)
        self.assertEqual(result["cleared_slugs"], [])
        self.assertTrue(get_manifest(first.slug, sites_root=self.sites_root).gaas_active)
        self.assertTrue(get_manifest(second.slug, sites_root=self.sites_root).gaas_active)

        payload = json.loads(host_map_path().read_text(encoding="utf-8"))
        hosts = {row["host"]: row["origin"] for row in payload["hosts"]}
        self.assertIn("portfolio.nexus-lab.test", hosts)
        self.assertEqual(
            hosts["portfolio.nexus-lab.test"],
            "https://portfolio-website-three-ruddy-65.vercel.app",
        )
        self.assertIn(first.subdomain, hosts)
        self.assertIn(second.subdomain, hosts)
        self.assertNotEqual(hosts[first.subdomain], hosts["portfolio.nexus-lab.test"])
        self.assertIn("channel-origin:8099", hosts[second.subdomain])

    def test_starter_generate_does_not_join_host_map(self):
        import channel_starter.config as cfg

        deploy_dir = os.path.join(self.tmp.name, "deploy-local-gen")
        os.makedirs(deploy_dir, exist_ok=True)
        cfg.DEPLOY_LOCAL_DIR = Path(deploy_dir)
        from channel_starter.host_map import host_map_path

        manifest = generate_from_dict(
            {"business_name": "Tanpa WAF", "category": "profil", "whatsapp": "6283333333333"},
            sites_root=self.sites_root,
        )
        self.assertFalse(manifest.gaas_active)
        self.assertFalse(host_map_path().is_file())
        block = render_site_caddy_block(manifest)
        self.assertIn("file_server", block)
        self.assertNotIn("reverse_proxy gateway:8080", block)


if __name__ == "__main__":
    unittest.main()
