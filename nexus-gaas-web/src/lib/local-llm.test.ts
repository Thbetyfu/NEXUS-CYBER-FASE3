import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_LOCAL_LLM_MODEL,
  DEFAULT_LOCAL_LLM_URL,
  healthFromTagsBody,
  isBlockedWriterModel,
  isLocalLlmLoopbackUrl,
  localLlmBaseUrl,
  localLlmGenerateUrl,
  localLlmTagsUrl,
  pingLocalLlm,
  resolveWriterModel,
} from "./local-llm.ts";
import { CATEGORY_COPY } from "./starter-generate-payload.ts";
import {
  categoryPresetSlots,
  fillStarterCopy,
  parseFillStarterInput,
  parseModelSlots,
  plainCopyText,
} from "./local-llm-fill.ts";

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

test("tags dan generate URL tidak memakai path klien", () => {
  assert.equal(localLlmTagsUrl("http://127.0.0.1:11434/"), "http://127.0.0.1:11434/api/tags");
  assert.equal(localLlmGenerateUrl("http://127.0.0.1:11434/"), "http://127.0.0.1:11434/api/generate");
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

test("model tulis default kecil; protect/reflex/70B tidak dipilih", () => {
  assert.equal(DEFAULT_LOCAL_LLM_MODEL, "gemma3:1b");
  assert.equal(isBlockedWriterModel("nex-ai-protect"), true);
  assert.equal(isBlockedWriterModel("nex-ai-protect:latest"), true);
  assert.equal(isBlockedWriterModel("nex-ai-reflex"), true);
  assert.equal(isBlockedWriterModel("llama3.1:70b"), true);
  assert.equal(isBlockedWriterModel("gemma3:1b"), false);
  assert.equal(resolveWriterModel({}), DEFAULT_LOCAL_LLM_MODEL);
  assert.equal(resolveWriterModel({ NEXUS_LOCAL_LLM_MODEL: "nex-ai-protect" }), DEFAULT_LOCAL_LLM_MODEL);
  assert.equal(resolveWriterModel({ NEXUS_LOCAL_LLM_MODEL: "nex-ai-reflex:latest" }), DEFAULT_LOCAL_LLM_MODEL);
  assert.equal(resolveWriterModel({ NEXUS_LOCAL_LLM_MODEL: "llama3.2:1b" }), "llama3.2:1b");
});

test("parse input butuh name+story; HTML di slot model dibuang", () => {
  assert.equal(parseFillStarterInput({ name: "Warung", story: "Nasi uduk." })?.name, "Warung");
  assert.equal(parseFillStarterInput({ name: "Warung" }), null);
  assert.equal(plainCopyText("<p>Halo</p>"), "Halo");
  const slots = parseModelSlots(
    '{"tagline":"<b>Rasa</b>","hero":"Hero","about_body":"Tentang","cta_label":"Chat","hours":"","description":"Desk"}',
  );
  assert.ok(slots);
  assert.equal(slots.tagline, "Rasa");
  assert.equal(slots.hours, "");
});

test("fill memakai mock Ollama; model body bukan protect/reflex", async () => {
  const input = {
    name: "Warung Bu Siti",
    category: "fnb",
    whatsapp: "081234",
    story: "Nasi uduk setiap pagi. Buka jam 06.00.",
  };
  let postedModel = "";
  const { status, body } = await fillStarterCopy(input, {}, async (url, init) => {
    assert.match(String(url), /127\.0\.0\.1:11434\/api\/generate/);
    const payload = JSON.parse(String(init?.body)) as { model: string; prompt: string };
    postedModel = payload.model;
    assert.equal(payload.model, DEFAULT_LOCAL_LLM_MODEL);
    assert.doesNotMatch(payload.model, /nex-ai-protect|nex-ai-reflex/i);
    assert.match(payload.prompt, /Nasi uduk/);
    return new Response(
      JSON.stringify({
        response: JSON.stringify({
          tagline: "Nasi uduk pagi",
          hero: "Nasi uduk setiap pagi",
          about_body: "Buka jam 06.00.",
          cta_label: "Pesan via WhatsApp",
          hours: "06.00",
          description: "Nasi uduk setiap pagi.",
        }),
      }),
      { status: 200 },
    );
  });
  assert.equal(status, 200);
  assert.equal(body.usedFallback, false);
  assert.equal(body.tagline, "Nasi uduk pagi");
  assert.equal(body.hours, "06.00");
  assert.equal(postedModel, "gemma3:1b");
});

test("timeout Ollama → usedFallback preset kategori", async () => {
  const input = { name: "Toko", category: "jasa", whatsapp: "08", story: "Servis AC rumah." };
  const timedOut = await fillStarterCopy(
    input,
    {},
    async (_url, init) => {
      await new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("aborted", "AbortError"));
        });
      });
      return new Response("late", { status: 200 });
    },
    15,
  );
  assert.equal(timedOut.body.usedFallback, true);
  assert.equal(timedOut.body.cta_label, CATEGORY_COPY.jasa.cta_label);
  assert.deepEqual(
    { ...timedOut.body, usedFallback: true },
    { ...categoryPresetSlots("jasa"), usedFallback: true },
  );

  const down = await fillStarterCopy(input, {}, async () => {
    throw new Error("ECONNREFUSED");
  });
  assert.equal(down.status, 200);
  assert.equal(down.body.usedFallback, true);
  assert.equal(down.body.tagline, CATEGORY_COPY.jasa.tagline);
});

test("URL bukan loopback fail-closed: tidak fetch, fallback preset", async () => {
  let fetched = false;
  const { status, body } = await fillStarterCopy(
    { name: "A", category: "profil", whatsapp: "08", story: "Usaha lokal." },
    { NEXUS_LOCAL_LLM_URL: "http://192.168.1.10:11434" },
    async () => {
      fetched = true;
      return new Response("should not run", { status: 200 });
    },
  );
  assert.equal(fetched, false);
  assert.equal(status, 503);
  assert.equal(body.usedFallback, true);
  assert.equal(body.description, CATEGORY_COPY.profil.description);
});

test("env protect tidak pernah dikirim ke Ollama", async () => {
  const { body } = await fillStarterCopy(
    { name: "A", category: "fnb", whatsapp: "", story: "Kopi tubruk." },
    { NEXUS_LOCAL_LLM_MODEL: "nex-ai-protect", NEXUS_LOCAL_LLM_URL: "http://127.0.0.1:11434" },
    async (_url, init) => {
      const payload = JSON.parse(String(init?.body)) as { model: string };
      assert.equal(payload.model, DEFAULT_LOCAL_LLM_MODEL);
      assert.notEqual(payload.model, "nex-ai-protect");
      return new Response(JSON.stringify({ response: "{}" }), { status: 200 });
    },
  );
  assert.equal(body.usedFallback, true);
});
