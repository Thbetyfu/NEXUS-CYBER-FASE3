import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { isWhatsAppHref } from "./portal-config.ts";
import { CHECKOUT_PACKAGES, checkoutHref, getCheckout } from "./checkout.ts";
import { safeInternalNext } from "./gate-next.ts";
import { plansForSegment, SEGMENTS } from "./segments.ts";

test("SKU checkout ada dan href /pesan/{sku}", () => {
  for (const sku of Object.keys(CHECKOUT_PACKAGES)) {
    const pkg = getCheckout(sku);
    assert.ok(pkg);
    assert.equal(checkoutHref(sku), `/pesan/${sku}`);
    assert.equal(pkg.debitStarter, pkg.kind === "starter");
  }
});

test("self-serve kartu bukan WhatsApp; WA hanya on-prem", () => {
  for (const segment of SEGMENTS) {
    const branches =
      segment.askWebsite
        ? (["belum", "sudah"] as const).flatMap((w) => plansForSegment(segment, w, null))
        : segment.askDeployMode
          ? (["hosted", "onprem"] as const).flatMap((d) => plansForSegment(segment, null, d))
          : plansForSegment(segment, null, null);

    for (const plan of branches) {
      const wa = isWhatsAppHref(plan.cta);
      if (segment.id === "pemerintah") {
        assert.equal(wa, true, plan.name);
        assert.match(plan.ctaLabel, /WhatsApp/);
        continue;
      }
      if (segment.askDeployMode) {
        const onprem = segment.plansByDeploy?.onprem.some((p) => p.name === plan.name);
        if (onprem) {
          assert.equal(wa, true, plan.name);
          continue;
        }
      }
      assert.equal(wa, false, `${segment.id} ${plan.name}`);
      assert.match(plan.cta, /^\/pesan\//);
      assert.doesNotMatch(plan.ctaLabel, /WhatsApp/i);
    }
  }
});

test("nama paket kartu & judul kasir berbahasa Inggris, tanpa Pagar", () => {
  for (const pkg of Object.values(CHECKOUT_PACKAGES)) {
    assert.doesNotMatch(pkg.title, /Pagar/i);
  }
  for (const segment of SEGMENTS) {
    const branches =
      segment.askWebsite
        ? (["belum", "sudah"] as const).flatMap((w) => plansForSegment(segment, w, null))
        : segment.askDeployMode
          ? (["hosted", "onprem"] as const).flatMap((d) => plansForSegment(segment, null, d))
          : plansForSegment(segment, null, null);
    for (const plan of branches) {
      assert.doesNotMatch(plan.name, /Pagar/i);
      assert.doesNotMatch(plan.ctaLabel, /Pagar/i);
    }
  }
  assert.equal(getCheckout("umkm-tepi-belum")?.title, "UMKM Edge Shield (new site)");
  assert.equal(getCheckout("umkm-pagar")?.title, "UMKM Header Shield");
});

test("gerbang next hanya path internal", () => {
  assert.equal(safeInternalNext("/umkm?situs=belum"), "/umkm?situs=belum");
  assert.equal(safeInternalNext("https://evil.example/"), "/");
  assert.equal(safeInternalNext("/gate"), "/");
});

test("portal-config klien tanpa process.env (hindari overlay Next pada Navbar/Kredit)", () => {
  const src = readFileSync(new URL("./portal-config.ts", import.meta.url), "utf8");
  assert.doesNotMatch(src, /process\.env/);
  assert.doesNotMatch(src, /CHANNEL_STARTER_PUBLIC_URL/);
});
