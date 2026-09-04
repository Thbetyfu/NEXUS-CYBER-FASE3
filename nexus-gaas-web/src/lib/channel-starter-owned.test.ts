import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MSG_CLAIM_STALE,
  MSG_CLAIM_TAKEN,
  MSG_CLAIM_UNKNOWN,
  MSG_SITES_STALE,
  MSG_SITES_VERCEL,
  claimSitesHttpResult,
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

test("klaim slug 200 sekali; slug orang lain 409; wizard lama 503", () => {
  const base = {
    internalUrl: "http://127.0.0.1:3010",
    ownerId: "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa",
    slug: "bu-grace",
  };
  const claimed = claimSitesHttpResult({ ...base, upstreamStatus: 200, outcome: "claimed" });
  assert.equal(claimed.status, 200);
  assert.equal(claimed.outcome, "claimed");

  const mine = claimSitesHttpResult({ ...base, upstreamStatus: 200, outcome: "already_yours" });
  assert.equal(mine.status, 200);
  assert.equal(mine.outcome, "already_yours");

  const taken = claimSitesHttpResult({
    ...base,
    upstreamStatus: 409,
    outcome: "owned_by_other",
  });
  assert.equal(taken.status, 409);
  assert.equal(taken.error, MSG_CLAIM_TAKEN);

  const forbidden = claimSitesHttpResult({
    ...base,
    upstreamStatus: 403,
    outcome: "owned_by_other",
  });
  assert.equal(forbidden.status, 409);
  assert.equal(forbidden.error, MSG_CLAIM_TAKEN);

  const unknown = claimSitesHttpResult({ ...base, upstreamStatus: 404, outcome: "not_found" });
  assert.equal(unknown.status, 404);
  assert.equal(unknown.error, MSG_CLAIM_UNKNOWN);

  const stale = claimSitesHttpResult({ ...base, upstreamStatus: 404 });
  assert.equal(stale.status, 503);
  assert.equal(stale.error, MSG_CLAIM_STALE);
});
