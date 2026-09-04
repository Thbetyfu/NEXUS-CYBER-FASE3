import assert from "node:assert/strict";
import { test } from "node:test";
import { PUBLISH_NO_TOKEN, summarizeVercelPublish } from "./starter-publish.ts";

test("sukses publish menampilkan URL Vercel, bukan sukses palsu", () => {
  const status = summarizeVercelPublish({
    ok: true,
    skipped: false,
    url: "https://kedai-siti.vercel.app",
    project: "kedai-siti",
  });
  assert.equal(status.publishOk, true);
  assert.equal(status.vercelUrl, "https://kedai-siti.vercel.app");
  assert.equal(status.publishError, null);
});

test("tanpa token dan tanpa login: pesan jujur vercel login atau VERCEL_TOKEN", () => {
  const status = summarizeVercelPublish({
    ok: false,
    skipped: true,
    reason: "no VERCEL_TOKEN / vercel login",
    user_message: PUBLISH_NO_TOKEN,
  });
  assert.equal(status.publishOk, false);
  assert.equal(status.publishSkipped, true);
  assert.equal(status.publishError, PUBLISH_NO_TOKEN);
});

test("payload kosong bukan sukses", () => {
  const status = summarizeVercelPublish(undefined);
  assert.equal(status.publishOk, false);
  assert.equal(status.publishError, PUBLISH_NO_TOKEN);
});
