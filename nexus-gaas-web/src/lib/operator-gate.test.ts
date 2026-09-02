import assert from "node:assert/strict";
import { test } from "node:test";
import { isLoopbackFromParts } from "./operator-gate.ts";

test("Host loopback tanpa XFF = operator lokal", () => {
  assert.equal(isLoopbackFromParts("127.0.0.1:3003", null), true);
  assert.equal(isLoopbackFromParts("localhost:3003", null), true);
});

test("Host publik bukan operator", () => {
  assert.equal(isLoopbackFromParts("abc.trycloudflare.com", null), false);
  assert.equal(isLoopbackFromParts("portal.nexus-lab.test", "1.2.3.4"), false);
});

test("Host loopback palsu + XFF klien ditolak", () => {
  assert.equal(isLoopbackFromParts("127.0.0.1:3003", "203.0.113.9"), false);
});

test("Cloudflare Connecting-IP menolak UI operator", () => {
  assert.equal(
    isLoopbackFromParts("127.0.0.1:3003", null, { cfConnectingIp: "203.0.113.9" }),
    false,
  );
});

test("X-Forwarded-Host publik menolak meskipun Host loopback", () => {
  assert.equal(
    isLoopbackFromParts("127.0.0.1:3003", null, { forwardedHost: "abc.trycloudflare.com" }),
    false,
  );
});
