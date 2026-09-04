import assert from "node:assert/strict";
import { test } from "node:test";
import { isPortalPublicPath } from "./portal-public-paths.ts";

test("gerbang auth publik tanpa cookie", () => {
  assert.equal(isPortalPublicPath("/gate"), true);
  assert.equal(isPortalPublicPath("/masuk"), true);
  assert.equal(isPortalPublicPath("/daftar"), true);
});

test("/starter dan preview slug mana pun publik (funnel semua UMKM)", () => {
  assert.equal(isPortalPublicPath("/starter"), true);
  assert.equal(isPortalPublicPath("/starter/"), true);
  assert.equal(isPortalPublicPath("/starter/preview"), true);
  assert.equal(isPortalPublicPath("/starter/preview/bu-grace"), true);
  assert.equal(isPortalPublicPath("/starter/preview/kedai-siti"), true);
  assert.equal(isPortalPublicPath("/starter/preview/warung-bu-siti/"), true);
});

test("generate/upsell wizard dan etalase tetap gerbang; operator/approve bukan publik", () => {
  assert.equal(isPortalPublicPath("/starter/generate"), false);
  assert.equal(isPortalPublicPath("/starter/publish/kedai-siti"), false);
  assert.equal(isPortalPublicPath("/starter/upsell/kedai-siti/enable"), false);
  assert.equal(isPortalPublicPath("/starter/upsell/status"), false);
  assert.equal(isPortalPublicPath("/starter/sites"), false);
  assert.equal(isPortalPublicPath("/"), false);
  assert.equal(isPortalPublicPath("/umkm"), false);
  assert.equal(isPortalPublicPath("/kredit"), false);
  assert.equal(isPortalPublicPath("/pesan/umkm-starter"), false);
  assert.equal(isPortalPublicPath("/situs"), false);
  assert.equal(isPortalPublicPath("/hub"), false);
  assert.equal(isPortalPublicPath("/operator"), false);
  assert.equal(isPortalPublicPath("/operator/topup"), false);
  assert.equal(isPortalPublicPath("/operator/tepi"), false);
  assert.equal(isPortalPublicPath("/api/kredit/topup/approve"), false);
});
