import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import {
  channelStarterPublicRewrites,
  isCatchAllStarterRewrite,
} from "./starter-public-rewrites.ts";

const configPath = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "next.config.ts");

test("rewrite sources are GET preview/wizard only — not catch-all /starter/:path*", () => {
  const rules = channelStarterPublicRewrites("http://127.0.0.1:3010");
  const sources = rules.map((r) => r.source);
  assert.equal(sources.some(isCatchAllStarterRewrite), false);
  assert.equal(isCatchAllStarterRewrite("/starter/:path*"), true);
  assert.equal(isCatchAllStarterRewrite("/starter/preview/:path*"), false);
  assert.deepEqual(sources, ["/starter", "/starter/preview", "/starter/preview/:path*"]);
  assert.equal(
    sources.some((s) => s.includes("generate") || s.includes("publish") || s.includes("upsell") || s.includes("sites")),
    false,
  );
  assert.equal(rules[0].destination, "http://127.0.0.1:3010/");
  assert.equal(rules[2].destination, "http://127.0.0.1:3010/preview/:path*");
});

test("next.config.ts must not restore catch-all starter rewrite", () => {
  const cfg = readFileSync(configPath, "utf8");
  assert.equal(cfg.includes('source: "/starter/:path*"'), false);
  assert.equal(cfg.includes("channelStarterPublicRewrites"), true);
});
