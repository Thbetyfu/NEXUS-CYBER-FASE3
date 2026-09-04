import assert from "node:assert/strict";
import { test } from "node:test";
import {
  filterOwnedCards,
  identityOwnerQuery,
  siteOwnedBy,
  stampGenerateOwner,
  type ManifestOwnerFields,
} from "./portal-site-owner.ts";
import type { PortalIdentity } from "./portal-identity.ts";

const aliceGuest: PortalIdentity = {
  sid: "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa",
  kind: "guest",
  guestId: "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa",
  walletId: "guest:aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa",
  orderCode: "ORDER-AAAAAAAA",
};

const bobGuest: PortalIdentity = {
  sid: "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb",
  kind: "guest",
  guestId: "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb",
  walletId: "guest:bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb",
  orderCode: "ORDER-BBBBBBBB",
};

const aliceAccount: PortalIdentity = {
  sid: "dddddddd-4444-4444-8444-dddddddddddd",
  kind: "account",
  accountId: "cccccccc-3333-4333-8333-cccccccccccc",
  email: "alice@example.com",
  walletId: "account:cccccccc-3333-4333-8333-cccccccccccc",
  orderCode: "ORDER-CCCCCCCC",
  formerGuestIds: ["aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa"],
};

test("user A tidak melihat situs user B atau folder tanpa owner", () => {
  const rows = [
    {
      slug: "kedai-alice",
      businessName: "Kedai Alice",
      vercelUrl: "https://kedai-alice.vercel.app",
      published: true,
      createdAt: "2026-09-04T00:00:00Z",
      portal_owner_id: aliceGuest.guestId,
      portal_owner_kind: "guest",
    },
    {
      slug: "kedai-bob",
      businessName: "Kedai Bob",
      vercelUrl: "",
      published: false,
      createdAt: "2026-09-04T00:00:00Z",
      portal_owner_id: bobGuest.guestId,
      portal_owner_kind: "guest",
      email: "alice@example.com",
      whatsapp: "6281111111111",
    },
    {
      slug: "legacy",
      businessName: "Tanpa owner",
      vercelUrl: "",
      published: false,
      createdAt: "2026-09-04T00:00:00Z",
      email: "alice@example.com",
    },
  ];
  const alice = filterOwnedCards(rows, identityOwnerQuery(aliceGuest));
  const bob = filterOwnedCards(rows, identityOwnerQuery(bobGuest));
  assert.deepEqual(
    alice.map((r) => r.slug),
    ["kedai-alice"],
  );
  assert.deepEqual(
    bob.map((r) => r.slug),
    ["kedai-bob"],
  );
  assert.equal(alice[0].published, true);
  assert.equal(bob[0].published, false);
});

test("email usaha di manifest lama bukan klaim kepemilikan", () => {
  const legacy: ManifestOwnerFields = { email: "alice@example.com", whatsapp: "6281" };
  assert.equal(siteOwnedBy(legacy, identityOwnerQuery(aliceAccount)), false);
});

test("akun melihat situs tamu lewat formerGuestIds tanpa menelan situs B", () => {
  const guestSite: ManifestOwnerFields = {
    portal_owner_id: aliceGuest.guestId,
    portal_owner_kind: "guest",
  };
  const bobSite: ManifestOwnerFields = {
    portal_owner_id: bobGuest.guestId,
    portal_owner_kind: "guest",
  };
  assert.equal(siteOwnedBy(guestSite, identityOwnerQuery(aliceAccount)), true);
  assert.equal(siteOwnedBy(bobSite, identityOwnerQuery(aliceAccount)), false);
});

test("stamp generate menimpa owner dari klien", () => {
  const form = new FormData();
  form.set("portal_owner_id", bobGuest.guestId || "");
  form.set("business_name", "X");
  stampGenerateOwner(form, identityOwnerQuery(aliceGuest));
  assert.equal(form.get("portal_owner_id"), aliceGuest.guestId);
  assert.equal(form.get("portal_owner_kind"), "guest");
});
