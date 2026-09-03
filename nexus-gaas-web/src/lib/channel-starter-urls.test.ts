import assert from "node:assert/strict";
import { test } from "node:test";
import {
  channelStarterInternalUrl,
  channelStarterPreviewUrl,
  channelStarterPublicBase,
  isLoopbackHttpOrigin,
} from "./channel-starter-urls.ts";

test("generate memakai CHANNEL_STARTER_URL, bukan NEXT_PUBLIC", () => {
  const env = {
    CHANNEL_STARTER_URL: "http://127.0.0.1:3010",
    NEXT_PUBLIC_CHANNEL_STARTER_URL: "https://evil.example/starter",
  };
  assert.equal(channelStarterInternalUrl(env), "http://127.0.0.1:3010");
  assert.equal(channelStarterPublicBase(env), "https://evil.example/starter");
});

test("tanpa env: internal loopback, publik path /starter", () => {
  assert.equal(channelStarterInternalUrl({}), "http://127.0.0.1:3010");
  assert.equal(channelStarterPublicBase({}), "/starter");
  assert.equal(channelStarterPreviewUrl("kedai"), "/starter/preview/kedai");
  assert.equal(isLoopbackHttpOrigin("http://127.0.0.1:3010"), true);
  assert.equal(isLoopbackHttpOrigin("https://abc.trycloudflare.com"), false);
});

test("Vercel storefront: jangan CHANNEL_STARTER ke laptop / loopback", () => {
  assert.equal(channelStarterInternalUrl({ VERCEL: "1" }), "");
  assert.equal(channelStarterInternalUrl({ VERCEL: "1", CHANNEL_STARTER_URL: "http://127.0.0.1:3010" }), "");
  assert.equal(
    channelStarterInternalUrl({ VERCEL: "true", CHANNEL_STARTER_URL: "https://wizard.example" }),
    "https://wizard.example",
  );
});

test("CHANNEL_STARTER_PUBLIC_URL mengalahkan NEXT_PUBLIC", () => {
  const env = {
    CHANNEL_STARTER_PUBLIC_URL: "https://portal.example/starter",
    NEXT_PUBLIC_CHANNEL_STARTER_URL: "http://127.0.0.1:3010",
  };
  assert.equal(channelStarterPublicBase(env), "https://portal.example/starter");
});
