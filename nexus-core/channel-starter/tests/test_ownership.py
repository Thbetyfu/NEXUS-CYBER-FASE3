"""Ownership isolation for Channel Starter manifests."""

from __future__ import annotations

import os
import sys
import tempfile
import unittest

package_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if package_root not in sys.path:
    sys.path.insert(0, package_root)

from channel_starter.generator import generate_from_dict
from channel_starter.ownership import (
    claim_unowned_site,
    list_owned_sites,
    list_unowned_sites,
    reassign_guest_sites,
    site_owned_by,
)
from channel_starter.types import SiteManifest, SiteCategory, PricingTier


def _base(**kwargs):
    payload = {
        "business_name": kwargs.pop("business_name", "Toko A"),
        "whatsapp": "081234567890",
        "category": "profil",
    }
    payload.update(kwargs)
    return payload


class TestSiteOwnership(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.sites_root = os.path.join(self.tmp.name, "sites")
        self._prev = os.environ.get("CHANNEL_STARTER_VERCEL_PUBLISH")
        os.environ["CHANNEL_STARTER_VERCEL_PUBLISH"] = "0"
        self.owner_a = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa"
        self.owner_b = "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb"

    def tearDown(self):
        if self._prev is None:
            os.environ.pop("CHANNEL_STARTER_VERCEL_PUBLISH", None)
        else:
            os.environ["CHANNEL_STARTER_VERCEL_PUBLISH"] = self._prev
        self.tmp.cleanup()

    def test_user_a_does_not_see_user_b(self):
        generate_from_dict(
            _base(
                business_name="Kedai Alice",
                slug="kedai-alice",
                portal_owner_id=self.owner_a,
                portal_owner_kind="guest",
            ),
            sites_root=self.sites_root,
        )
        generate_from_dict(
            _base(
                business_name="Kedai Bob",
                slug="kedai-bob",
                portal_owner_id=self.owner_b,
                portal_owner_kind="guest",
                email="bob-usaha@example.com",
                whatsapp="081299999999",
            ),
            sites_root=self.sites_root,
        )
        generate_from_dict(
            _base(business_name="Tanpa Owner", slug="tanpa-owner"),
            sites_root=self.sites_root,
        )

        alice = list_owned_sites(owner_id=self.owner_a, owner_kind="guest", sites_root=self.sites_root)
        bob = list_owned_sites(owner_id=self.owner_b, owner_kind="guest", sites_root=self.sites_root)

        self.assertEqual([row["slug"] for row in alice], ["kedai-alice"])
        self.assertEqual([row["slug"] for row in bob], ["kedai-bob"])
        self.assertNotIn("kedai-bob", [row["slug"] for row in alice])
        self.assertNotIn("tanpa-owner", [row["slug"] for row in alice])
        self.assertNotIn("whatsapp", alice[0])
        self.assertFalse(alice[0]["published"])
        self.assertEqual(alice[0]["vercel_url"], "")

        stranger = "eeeeeeee-5555-4555-8555-eeeeeeeeeeee"
        owned_by_email = list_owned_sites(
            owner_id=stranger,
            owner_kind="account",
            owner_email="bob-usaha@example.com",
            sites_root=self.sites_root,
        )
        self.assertEqual(owned_by_email, [], "business email must not grant ownership")

    def test_unowned_manifest_never_matches(self):
        empty = SiteManifest(
            site_id="CS-X",
            slug="legacy",
            business_name="Lama",
            category=SiteCategory.PROFIL,
            tier=PricingTier.STARTER,
            subdomain="legacy.nexus-lab.test",
            output_dir="x",
            index_path="x/index.html",
            email="owner@example.com",
            whatsapp="6281111111111",
        )
        self.assertFalse(
            site_owned_by(
                empty,
                owner_id=self.owner_a,
                owner_kind="account",
                owner_email="owner@example.com",
            )
        )

    def test_reassign_guest_to_account_keeps_isolation(self):
        generate_from_dict(
            _base(
                business_name="Tamu A",
                slug="tamu-a",
                portal_owner_id=self.owner_a,
                portal_owner_kind="guest",
            ),
            sites_root=self.sites_root,
        )
        generate_from_dict(
            _base(
                business_name="Tamu B",
                slug="tamu-b",
                portal_owner_id=self.owner_b,
                portal_owner_kind="guest",
            ),
            sites_root=self.sites_root,
        )
        account = "cccccccc-3333-4333-8333-cccccccccccc"
        moved = reassign_guest_sites(
            from_guest_id=self.owner_a,
            to_account_id=account,
            to_email="alice@example.com",
            sites_root=self.sites_root,
        )
        self.assertEqual(moved, ["tamu-a"])
        as_account = list_owned_sites(
            owner_id=account,
            owner_kind="account",
            owner_email="alice@example.com",
            sites_root=self.sites_root,
        )
        still_guest = list_owned_sites(owner_id=self.owner_a, owner_kind="guest", sites_root=self.sites_root)
        bob = list_owned_sites(owner_id=self.owner_b, owner_kind="guest", sites_root=self.sites_root)
        self.assertEqual([row["slug"] for row in as_account], ["tamu-a"])
        self.assertEqual(still_guest, [])
        self.assertEqual([row["slug"] for row in bob], ["tamu-b"])

    def test_unowned_claim_succeeds_once_then_rejects_other(self):
        generate_from_dict(_base(business_name="Bu Grace", slug="bu-grace"), sites_root=self.sites_root)
        generate_from_dict(
            _base(
                business_name="Milik B",
                slug="milik-b",
                portal_owner_id=self.owner_b,
                portal_owner_kind="guest",
            ),
            sites_root=self.sites_root,
        )

        first, row = claim_unowned_site(
            slug="bu-grace",
            owner_id=self.owner_a,
            owner_kind="guest",
            sites_root=self.sites_root,
        )
        self.assertEqual(first, "claimed")
        self.assertEqual(row["slug"], "bu-grace")
        alice = list_owned_sites(owner_id=self.owner_a, owner_kind="guest", sites_root=self.sites_root)
        self.assertEqual([item["slug"] for item in alice], ["bu-grace"])

        second, _ = claim_unowned_site(
            slug="bu-grace",
            owner_id=self.owner_b,
            owner_kind="guest",
            sites_root=self.sites_root,
        )
        self.assertEqual(second, "owned_by_other")
        bob = list_owned_sites(owner_id=self.owner_b, owner_kind="guest", sites_root=self.sites_root)
        self.assertEqual([item["slug"] for item in bob], ["milik-b"])

    def test_already_owned_by_other_rejected_self_idempotent(self):
        generate_from_dict(
            _base(
                business_name="Milik A",
                slug="milik-a",
                portal_owner_id=self.owner_a,
                portal_owner_kind="guest",
            ),
            sites_root=self.sites_root,
        )
        stolen, _ = claim_unowned_site(
            slug="milik-a",
            owner_id=self.owner_b,
            owner_kind="guest",
            sites_root=self.sites_root,
        )
        self.assertEqual(stolen, "owned_by_other")

        again, row = claim_unowned_site(
            slug="milik-a",
            owner_id=self.owner_a,
            owner_kind="guest",
            sites_root=self.sites_root,
        )
        self.assertEqual(again, "already_yours")
        self.assertEqual(row["slug"], "milik-a")

        missing, _ = claim_unowned_site(
            slug="tidak-ada",
            owner_id=self.owner_a,
            owner_kind="guest",
            sites_root=self.sites_root,
        )
        self.assertEqual(missing, "not_found")
        self.assertEqual(list_unowned_sites(sites_root=self.sites_root), [])

    def test_claim_one_slug_leaves_other_unowned(self):
        generate_from_dict(_base(business_name="Satu", slug="satu"), sites_root=self.sites_root)
        generate_from_dict(_base(business_name="Dua", slug="dua"), sites_root=self.sites_root)
        first, _ = claim_unowned_site(
            slug="satu",
            owner_id=self.owner_a,
            owner_kind="guest",
            sites_root=self.sites_root,
        )
        self.assertEqual(first, "claimed")
        leftover = [row["slug"] for row in list_unowned_sites(sites_root=self.sites_root)]
        self.assertEqual(leftover, ["dua"])
        alice = list_owned_sites(owner_id=self.owner_a, owner_kind="guest", sites_root=self.sites_root)
        self.assertEqual([row["slug"] for row in alice], ["satu"])


if __name__ == "__main__":
    unittest.main()
