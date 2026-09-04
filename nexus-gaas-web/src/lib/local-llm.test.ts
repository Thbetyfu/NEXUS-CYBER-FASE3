import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_LOCAL_LLM_MODEL,
  DEFAULT_LOCAL_LLM_URL,
  FILL_STARTER_KEEP_ALIVE,
  FILL_STARTER_NUM_CTX,
  FILL_STARTER_NUM_PREDICT,
  FILL_STARTER_STORY_MAX_CHARS,
  FILL_STARTER_TIMEOUT_MS,
  FILL_STARTER_TIMEOUT_RETRIES,
  healthFromTagsBody,
  isBlockedWriterModel,
  isLocalLlmLoopbackUrl,
  isOperatorLocalLlmRuntime,
  localLlmBaseUrl,
  localLlmGenerateUrl,
  localLlmTagsUrl,
  pingLocalLlm,
  resolveWriterModel,
} from "./local-llm.ts";
import { CATEGORY_COPY } from "./starter-generate-payload.ts";
import {
  MSG_FILL_DOWN,
  MSG_FILL_TIMEOUT,
  buildFillPrompt,
  buildOllamaFillBody,
  categoryPresetSlots,
  clipFillStory,
  fillStarterCopy,
  handleFillStarterHttp,
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
  assert.equal(isOperatorLocalLlmRuntime({}), true);
  assert.equal(isOperatorLocalLlmRuntime({ VERCEL: "1" }), false);
});

test("ping URL bukan loopback: 503 tanpa fetch :11434", async () => {
  let fetched = "";
  const { status, body } = await pingLocalLlm(
    { NEXUS_LOCAL_LLM_URL: "https://evil.example:11434" },
    async (url) => {
      fetched = String(url);
      return new Response("should not run", { status: 200 });
    },
  );
  assert.equal(fetched, "");
  assert.equal(status, 503);
  assert.equal(body.ok, false);
  assert.doesNotMatch(fetched, /11434/);
});

test("Vercel storefront: tidak fetch Ollama 11434 (health + fill)", async () => {
  let healthUrl = "";
  const health = await pingLocalLlm({ VERCEL: "1", NEXUS_LOCAL_LLM_URL: "http://127.0.0.1:11434" }, async (url) => {
    healthUrl = String(url);
    return new Response("should not run", { status: 200 });
  });
  assert.equal(healthUrl, "");
  assert.equal(health.status, 503);
  assert.match(health.body.message, /etalase|Vercel/i);

  let fillUrl = "";
  const fill = await fillStarterCopy(
    { name: "A", category: "fnb", whatsapp: "08", story: "Kopi tubruk setiap pagi." },
    { VERCEL: "1", NEXUS_LOCAL_LLM_URL: "http://127.0.0.1:11434" },
    async (url) => {
      fillUrl = String(url);
      return new Response("should not run", { status: 200 });
    },
  );
  assert.equal(fillUrl, "");
  assert.equal(fill.status, 503);
  assert.equal(fill.body.usedFallback, true);
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

test("parse input butuh name; cerita boleh kosong; HTML di slot model dibuang", () => {
  assert.equal(parseFillStarterInput({ name: "Warung", story: "Nasi uduk." })?.name, "Warung");
  assert.equal(parseFillStarterInput({ name: "Warung" })?.story, "");
  assert.equal(parseFillStarterInput({}), null);
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
    const payload = JSON.parse(String(init?.body)) as {
      model: string;
      prompt: string;
      keep_alive: string;
      format: string;
      options: { num_ctx: number; num_predict: number; temperature: number };
    };
    postedModel = payload.model;
    assert.equal(payload.model, DEFAULT_LOCAL_LLM_MODEL);
    assert.doesNotMatch(payload.model, /nex-ai-protect|nex-ai-reflex/i);
    assert.match(payload.prompt, /Nasi uduk/);
    assert.equal(payload.format, "json");
    assert.equal(payload.keep_alive, FILL_STARTER_KEEP_ALIVE);
    assert.equal(payload.options.num_ctx, FILL_STARTER_NUM_CTX);
    assert.equal(payload.options.num_predict, FILL_STARTER_NUM_PREDICT);
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

test("prompt pendek; cerita dipotong; body Ollama kecil-model", () => {
  assert.equal(FILL_STARTER_TIMEOUT_MS, 35_000);
  assert.equal(FILL_STARTER_TIMEOUT_RETRIES, 1);
  const long = "x".repeat(FILL_STARTER_STORY_MAX_CHARS + 80);
  assert.ok(clipFillStory(long).length <= FILL_STARTER_STORY_MAX_CHARS + 1);
  const prompt = buildFillPrompt(
    { name: "Warung", category: "fnb", whatsapp: "08", story: long },
    "fnb",
  );
  assert.ok(prompt.length < 1200);
  assert.match(prompt, /JSON saja/);
  const body = buildOllamaFillBody("gemma3:1b", prompt);
  assert.equal(body.keep_alive, "30m");
  assert.equal((body.options as { num_ctx: number }).num_ctx, 1024);
});

test("cerita kosong → preset tanpa fetch Ollama", async () => {
  let fetched = false;
  const { status, body } = await fillStarterCopy(
    { name: "Warung", category: "fnb", whatsapp: "08", story: "" },
    {},
    async () => {
      fetched = true;
      return new Response("should not run", { status: 200 });
    },
  );
  assert.equal(fetched, false);
  assert.equal(status, 200);
  assert.equal(body.usedFallback, true);
  assert.equal(body.tagline, CATEGORY_COPY.fnb.tagline);
});

test("timeout Ollama → retry sekali lalu usedFallback preset", async () => {
  const input = { name: "Toko", category: "jasa", whatsapp: "08", story: "Servis AC rumah." };
  let abortCalls = 0;
  const timedOut = await fillStarterCopy(
    input,
    {},
    async (_url, init) => {
      abortCalls += 1;
      await new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("aborted", "AbortError"));
        });
      });
      return new Response("late", { status: 200 });
    },
    15,
  );
  assert.equal(abortCalls, 1 + FILL_STARTER_TIMEOUT_RETRIES);
  assert.equal(timedOut.body.usedFallback, true);
  assert.equal(timedOut.body.error, MSG_FILL_TIMEOUT);
  assert.equal(timedOut.body.cta_label, CATEGORY_COPY.jasa.cta_label);
  const { error: _e, ...slots } = timedOut.body;
  assert.deepEqual(slots, { ...categoryPresetSlots("jasa"), usedFallback: true });

  let downCalls = 0;
  const down = await fillStarterCopy(input, {}, async () => {
    downCalls += 1;
    throw new Error("ECONNREFUSED");
  });
  assert.equal(downCalls, 1);
  assert.equal(down.status, 200);
  assert.equal(down.body.usedFallback, true);
  assert.equal(down.body.error, MSG_FILL_DOWN);
  assert.equal(down.body.tagline, CATEGORY_COPY.jasa.tagline);
});

test("parse gagal lalu retry sukses → usedFallback false", async () => {
  const input = { name: "Toko", category: "jasa", whatsapp: "08", story: "Servis AC rumah." };
  let calls = 0;
  const { status, body } = await fillStarterCopy(input, {}, async () => {
    calls += 1;
    if (calls === 1) {
      return new Response(JSON.stringify({ response: "model tidak merespons" }), { status: 200 });
    }
    return new Response(
      JSON.stringify({
        response: JSON.stringify({
          tagline: "Servis AC",
          hero: "Servis AC rumah",
          about_body: "Perbaikan AC rumah.",
          cta_label: "Chat WA",
          hours: "",
          description: "Servis AC rumah.",
        }),
      }),
      { status: 200 },
    );
  });
  assert.equal(calls, 2);
  assert.equal(status, 200);
  assert.equal(body.usedFallback, false);
  assert.equal(body.tagline, "Servis AC");
  assert.equal(body.error, undefined);
});

test("parse gagal dua kali → usedFallback preset", async () => {
  const input = { name: "Toko", category: "jasa", whatsapp: "08", story: "Servis AC rumah." };
  let calls = 0;
  const { status, body } = await fillStarterCopy(input, {}, async () => {
    calls += 1;
    return new Response(JSON.stringify({ response: "bukan JSON slot" }), { status: 200 });
  });
  assert.equal(calls, 1 + FILL_STARTER_TIMEOUT_RETRIES);
  assert.equal(status, 200);
  assert.equal(body.usedFallback, true);
  assert.equal(body.error, MSG_FILL_DOWN);
  assert.equal(body.tagline, CATEGORY_COPY.jasa.tagline);
});

test("timeout lalu retry sukses → usedFallback false", async () => {
  const input = { name: "Toko", category: "jasa", whatsapp: "08", story: "Servis AC rumah." };
  let calls = 0;
  const { status, body } = await fillStarterCopy(
    input,
    {},
    async (_url, init) => {
      calls += 1;
      if (calls === 1) {
        await new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("aborted", "AbortError"));
          });
        });
      }
      return new Response(
        JSON.stringify({
          response: JSON.stringify({
            tagline: "Servis AC",
            hero: "Servis AC rumah",
            about_body: "Perbaikan AC rumah.",
            cta_label: "Chat WA",
            hours: "",
            description: "Servis AC rumah.",
          }),
        }),
        { status: 200 },
      );
    },
    20,
  );
  assert.equal(calls, 2);
  assert.equal(status, 200);
  assert.equal(body.usedFallback, false);
  assert.equal(body.tagline, "Servis AC");
  assert.equal(body.error, undefined);
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

test("fill URL publik :11434: 503, tidak fetch host itu", async () => {
  let fetched = "";
  const { status, body } = await fillStarterCopy(
    { name: "A", category: "profil", whatsapp: "08", story: "Usaha lokal." },
    { NEXUS_LOCAL_LLM_URL: "https://ollama.trycloudflare.com:11434" },
    async (url) => {
      fetched = String(url);
      return new Response("should not run", { status: 200 });
    },
  );
  assert.equal(fetched, "");
  assert.equal(status, 503);
  assert.equal(body.usedFallback, true);
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

test("fill-starter tanpa sesi: 401, tidak ke runtime LLM", async () => {
  let fillCalled = false;
  const result = await handleFillStarterHttp({
    identity: null,
    rateLimited: false,
    raw: { name: "Warung", category: "fnb", whatsapp: "08", story: "Kopi tubruk setiap pagi." },
    fill: async () => {
      fillCalled = true;
      return {
        status: 200,
        body: {
          tagline: "x",
          hero: "x",
          about_body: "x",
          cta_label: "x",
          hours: "",
          description: "x",
          usedFallback: false,
        },
      };
    },
  });
  assert.equal(fillCalled, false);
  assert.equal(result.status, 401);
  assert.equal(result.body.ok, false);
  assert.equal(result.body.usedFallback, true);
  assert.match(result.body.error ?? "", /Sesi diperlukan/);
});

test("fill-starter dengan sesi: lanjut cek runtime (Vercel fail-closed, tanpa debit)", async () => {
  let fetched = "";
  const result = await handleFillStarterHttp({
    identity: { sid: "11111111-1111-4111-8111-111111111111" },
    rateLimited: false,
    raw: { name: "Warung", category: "fnb", whatsapp: "08", story: "Kopi tubruk setiap pagi." },
    fill: (input) =>
      fillStarterCopy(input, { VERCEL: "1", NEXUS_LOCAL_LLM_URL: "http://127.0.0.1:11434" }, async (url) => {
        fetched = String(url);
        return new Response("should not run", { status: 200 });
      }),
  });
  assert.equal(fetched, "");
  assert.equal(result.status, 503);
  assert.equal(result.body.ok, false);
  assert.equal(result.body.usedFallback, true);
});

test("fill-starter sesi + rate limit: 429 tanpa LLM", async () => {
  let fillCalled = false;
  const result = await handleFillStarterHttp({
    identity: { sid: "11111111-1111-4111-8111-111111111111" },
    rateLimited: true,
    raw: { name: "Warung", category: "fnb", story: "Kopi." },
    fill: async () => {
      fillCalled = true;
      return {
        status: 200,
        body: {
          tagline: "",
          hero: "",
          about_body: "",
          cta_label: "",
          hours: "",
          description: "",
          usedFallback: true,
        },
      };
    },
  });
  assert.equal(fillCalled, false);
  assert.equal(result.status, 429);
  assert.equal(result.body.ok, false);
});
