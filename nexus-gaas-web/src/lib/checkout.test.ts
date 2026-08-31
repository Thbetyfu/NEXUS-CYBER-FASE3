import assert from "node:assert/strict";
import { test } from "node:test";
import { isWhatsAppHref } from "./portal-config.ts";
import { CHECKOUT_PACKAGES, checkoutHref, getCheckout } from "./checkout.ts";
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
