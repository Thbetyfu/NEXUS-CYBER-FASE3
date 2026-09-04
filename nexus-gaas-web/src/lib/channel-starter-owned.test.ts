import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MSG_SITES_STALE,
  MSG_SITES_VERCEL,
  ownedSitesHttpResult,
  ownedSitesOperatorDetail,
} from "./channel-starter-owned.ts";

test("daftar situs 503 jika wizard URL kosong (Vercel etalase)", () => {
  const listed = ownedSitesHttpResult({
    internalUrl: "",
    ownerId: "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa",
  });
  assert.equal(listed.status, 503);
  assert.equal(listed.error, MSG_SITES_VERCEL);
});

test("daftar situs 200 jika wizard POST /sites/owned sukses", () => {
  const listed = ownedSitesHttpResult({
    internalUrl: "http://127.0.0.1:3010",
    ownerId: "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa",
    upstreamStatus: 200,
  });
  assert.equal(listed.status, 200);
  assert.equal(listed.error, undefined);
});

test("daftar situs 503 jika wizard lama (404/405), bukan daftar kosong", () => {
  for (const upstreamStatus of [404, 405]) {
    const listed = ownedSitesHttpResult({
      internalUrl: "http://127.0.0.1:3010",
      ownerId: "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa",
      upstreamStatus,
    });
    assert.equal(listed.status, 503);
    assert.equal(listed.error, MSG_SITES_STALE);
    assert.match(ownedSitesOperatorDetail(upstreamStatus), /405|404/);
  }
});
