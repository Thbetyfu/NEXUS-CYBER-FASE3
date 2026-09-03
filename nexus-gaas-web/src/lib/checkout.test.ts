import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { isWhatsAppHref } from "./portal-config.ts";
import { CHECKOUT_PACKAGES, checkoutHref, getCheckout } from "./checkout.ts";
import {
  FAQ_NO_MASS_WAF,
  HONEST_SKU_DISCLAIMER,
  NO_MASS_WAF_CLAIM,
  SKU_SEPARATION_LINE,
} from "./honest-copy.ts";
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

test("Starter bukan klaim WAF; tepi SKU terpisah; Job/Loop bukan debit 20 Kr", () => {
  const kinds = new Set(Object.values(CHECKOUT_PACKAGES).map((p) => p.kind));
  assert.ok(kinds.has("starter"));
  assert.ok(kinds.has("tepi"));
  assert.ok(kinds.has("request"));

  for (const pkg of Object.values(CHECKOUT_PACKAGES)) {
    if (pkg.kind === "starter") {
      assert.equal(pkg.debitStarter, true);
      assert.doesNotMatch(pkg.summary, /WAF Reflex|di belakang WAF|PROTECTED_HOST/i);
      assert.doesNotMatch(pkg.title, /Edge Shield/i);
    } else {
      assert.equal(pkg.debitStarter, false);
    }
    if (pkg.kind === "tepi") {
      assert.notEqual(pkg.priceKr, 20);
      assert.match(pkg.summary, /bukan debit/i);
      assert.match(pkg.title, /Edge Shield/i);
    }
  }

  const tepiSkus = Object.values(CHECKOUT_PACKAGES).filter((p) => p.kind === "tepi");
  assert.ok(tepiSkus.length >= 4);
  assert.ok(getCheckout("umkm-tepi-belum"));
  assert.ok(getCheckout("umkm-tepi-sudah"));
});

test("FAQ segmen: Starter ≠ tepi ≠ Loop; jangan klaim 100 UMKM di WAF", () => {
  assert.match(HONEST_SKU_DISCLAIMER, /Starter/);
  assert.match(SKU_SEPARATION_LINE, /tepi/);
  assert.match(NO_MASS_WAF_CLAIM, /100 UMKM/);
  for (const id of ["umkm", "sekolah", "startup"] as const) {
    const segment = SEGMENTS.find((s) => s.id === id);
    assert.ok(segment);
    const answers = segment.faqs.map((f) => `${f.q} ${f.a}`).join("\n");
    assert.match(answers, /100 UMKM/);
    assert.match(answers, /Starter/);
    assert.match(answers, /Loop/);
  }
  assert.equal(FAQ_NO_MASS_WAF.q.includes("WAF"), true);
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
