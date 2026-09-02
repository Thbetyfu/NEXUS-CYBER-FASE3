import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_LOCAL_LLM_URL,
  healthFromTagsBody,
  isLocalLlmLoopbackUrl,
  localLlmBaseUrl,
  localLlmTagsUrl,
  pingLocalLlm,
} from "./local-llm.ts";

test("default dan env loopback diterima; 0.0.0.0 dan publik ditolak", () => {
  assert.equal(isLocalLlmLoopbackUrl(DEFAULT_LOCAL_LLM_URL), true);
  assert.equal(isLocalLlmLoopbackUrl("http://localhost:11434"), true);
  assert.equal(isLocalLlmLoopbackUrl("http://0.0.0.0:11434"), false);
  assert.equal(isLocalLlmLoopbackUrl("https://evil.trycloudflare.com"), false);
  assert.equal(isLocalLlmLoopbackUrl("http://192.168.1.10:11434"), false);

  const ok = localLlmBaseUrl({});
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.equal(ok.url, DEFAULT_LOCAL_LLM_URL);
  }

  const bad = localLlmBaseUrl({ NEXUS_LOCAL_LLM_URL: "http://0.0.0.0:11434" });
  assert.equal(bad.ok, false);
});

test("tags URL tidak memakai path klien", () => {
  assert.equal(localLlmTagsUrl("http://127.0.0.1:11434/"), "http://127.0.0.1:11434/api/tags");
});

test("body tags Ollama dihitung tanpa mengekspos nama model", () => {
  const health = healthFromTagsBody(JSON.stringify({ models: [{ name: "nex-ai-protect" }] }));
  assert.equal(health.ok, true);
  assert.equal(health.modelCount, 1);
  assert.equal("url" in health, false);
});

test("ping fail-closed jika fetch gagal", async () => {
  const { status, body } = await pingLocalLlm({}, async () => {
    throw new Error("ECONNREFUSED");
  });
  assert.equal(status, 503);
  assert.equal(body.ok, false);
  assert.equal(body.ready, false);
  assert.match(body.message, /Ollama|START-LOCAL-LLM/i);
});
