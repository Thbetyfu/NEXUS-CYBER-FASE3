/** Cerita → JSON copy slots. Server-side Ollama loopback only. Not NEX-AI WAF. */

import {
  FILL_STARTER_KEEP_ALIVE,
  FILL_STARTER_NUM_CTX,
  FILL_STARTER_NUM_PREDICT,
  FILL_STARTER_STORY_MAX_CHARS,
  FILL_STARTER_TEMPERATURE,
  FILL_STARTER_TIMEOUT_MS,
  FILL_STARTER_TIMEOUT_RETRIES,
  isOperatorLocalLlmRuntime,
  localLlmBaseUrl,
  localLlmGenerateUrl,
  resolveWriterModel,
} from "./local-llm.ts";
import {
  categoryPresetSlots,
  normalizeStarterCategory,
  type StarterCategory,
} from "./starter-generate-payload.ts";

export { categoryPresetSlots };

export type FillStarterInput = {
  name: string;
  category: string;
  whatsapp: string;
  story: string;
};

export type FillStarterSlots = {
  tagline: string;
  hero: string;
  about_body: string;
  cta_label: string;
  hours: string;
  description: string;
};

export type FillStarterResult = FillStarterSlots & {
  usedFallback: boolean;
  model?: string;
  error?: string;
};

export const MSG_FILL_TIMEOUT =
  "Model tulis lokal timeout. Teks dari template kategori (bukan model lokal, bukan NEX-AI WAF).";
export const MSG_FILL_DOWN =
  "Model tulis lokal tidak merespons. Teks dari template kategori (bukan model lokal, bukan NEX-AI WAF).";

export function clipFillStory(story: string): string {
  const trimmed = story.trim();
  if (trimmed.length <= FILL_STARTER_STORY_MAX_CHARS) return trimmed;
  return `${trimmed.slice(0, FILL_STARTER_STORY_MAX_CHARS).trim()}…`;
}

export function isAbortError(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const name = "name" in err ? String((err as { name: unknown }).name) : "";
  return name === "AbortError" || name === "TimeoutError";
}

export function buildOllamaFillBody(model: string, prompt: string): Record<string, unknown> {
  return {
    model,
    prompt,
    stream: false,
    format: "json",
    keep_alive: FILL_STARTER_KEEP_ALIVE,
    options: {
      temperature: FILL_STARTER_TEMPERATURE,
      num_ctx: FILL_STARTER_NUM_CTX,
      num_predict: FILL_STARTER_NUM_PREDICT,
    },
  };
}

export function parseFillStarterInput(raw: unknown): FillStarterInput | null {
  if (!raw || typeof raw !== "object") return null;
  const body = raw as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const whatsapp = typeof body.whatsapp === "string" ? body.whatsapp.trim() : "";
  const story = typeof body.story === "string" ? body.story.trim() : "";
  const category = typeof body.category === "string" ? body.category.trim() : "profil";
  if (!name) return null;
  return { name, category, whatsapp, story };
}

export function plainCopyText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function parseModelSlots(text: string): FillStarterSlots | null {
  const stripped = text.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(stripped.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
  const tagline = plainCopyText(parsed.tagline);
  const hero = plainCopyText(parsed.hero);
  const about_body = plainCopyText(parsed.about_body);
  const cta_label = plainCopyText(parsed.cta_label);
  const description = plainCopyText(parsed.description);
  const hours = plainCopyText(parsed.hours);
  if (!tagline && !hero && !about_body && !description) return null;
  return { tagline, hero, about_body, cta_label, hours, description };
}

export function buildFillPrompt(input: FillStarterInput, category: StarterCategory): string {
  return [
    "JSON saja (tanpa markdown). Kunci: tagline,hero,about_body,cta_label,hours,description. Tutup JSON lengkap.",
    "Bahasa Indonesia, nada warung. Hanya fakta cerita. Jangan mengarang alamat, harga, atau klaim.",
    "Kunci pendek. hours kosong jika jam tidak disebut (bukan nomor WA). cta_label tombol WA singkat. hero 1 kalimat. description 1 kalimat.",
    `Nama:${input.name}`,
    `Kategori:${category}`,
    `WA:${input.whatsapp || "-"}`,
    `Cerita:${clipFillStory(input.story)}`,
  ].join("\n");
}

type GenerateJson = { response?: unknown };

export async function fillStarterCopy(
  input: FillStarterInput,
  env: NodeJS.Dict<string | undefined> = process.env,
  fetcher: typeof fetch = fetch,
  timeoutMs: number = FILL_STARTER_TIMEOUT_MS,
): Promise<{ status: number; body: FillStarterResult }> {
  const category = normalizeStarterCategory(input.category);
  const presets = categoryPresetSlots(category);
  const fallback = (
    status: number,
    error?: string,
  ): { status: number; body: FillStarterResult } => ({
    status,
    body: { ...presets, usedFallback: true, ...(error ? { error } : {}) },
  });

  if (!input.story.trim()) {
    return fallback(200);
  }

  if (!isOperatorLocalLlmRuntime(env)) {
    return fallback(503);
  }

  const base = localLlmBaseUrl(env);
  if (!base.ok) {
    return fallback(503);
  }

  const model = resolveWriterModel(env);
  const prompt = buildFillPrompt(input, category);
  const url = localLlmGenerateUrl(base.url);
  const attempts = 1 + FILL_STARTER_TIMEOUT_RETRIES;
  let lastAbort = false;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetcher(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ctrl.signal,
        cache: "no-store",
        body: JSON.stringify(buildOllamaFillBody(model, prompt)),
      });
      if (!res.ok) {
        return fallback(200, MSG_FILL_DOWN);
      }
      const text = await res.text();
      let responseText = text;
      try {
        const json = JSON.parse(text) as GenerateJson;
        if (typeof json.response === "string") {
          responseText = json.response;
        }
      } catch {
        /* raw body may already be slots JSON */
      }
      const slots = parseModelSlots(responseText);
      if (!slots) {
        lastAbort = false;
        continue;
      }
      return {
        status: 200,
        body: { ...slots, usedFallback: false, model },
      };
    } catch (err) {
      lastAbort = isAbortError(err);
      if (!lastAbort) {
        return fallback(200, MSG_FILL_DOWN);
      }
    } finally {
      clearTimeout(timer);
    }
  }

  return fallback(200, lastAbort ? MSG_FILL_TIMEOUT : MSG_FILL_DOWN);
}

export type FillStarterJsonBody = FillStarterSlots & {
  ok: boolean;
  usedFallback: boolean;
  error?: string;
};

/** Session gate (same class as generate) then rate limit then Ollama fill. No Kredit debit. */
export async function handleFillStarterHttp(opts: {
  identity: { sid: string } | null;
  rateLimited: boolean;
  raw: unknown;
  fill?: typeof fillStarterCopy;
}): Promise<{ status: number; body: FillStarterJsonBody }> {
  if (!opts.identity) {
    return {
      status: 401,
      body: {
        ok: false,
        usedFallback: true,
        error: "Sesi diperlukan",
        tagline: "",
        hero: "",
        about_body: "",
        cta_label: "",
        hours: "",
        description: "",
      },
    };
  }

  if (opts.rateLimited) {
    return {
      status: 429,
      body: {
        ok: false,
        usedFallback: true,
        error: "Terlalu banyak permintaan. Coba lagi nanti.",
        tagline: "",
        hero: "",
        about_body: "",
        cta_label: "",
        hours: "",
        description: "",
      },
    };
  }

  const input = parseFillStarterInput(opts.raw);
  if (!input) {
    return {
      status: 400,
      body: {
        ok: false,
        usedFallback: true,
        error: "Butuh name (teks, bukan HTML).",
        tagline: "",
        hero: "",
        about_body: "",
        cta_label: "",
        hours: "",
        description: "",
      },
    };
  }

  const fill = opts.fill ?? fillStarterCopy;
  const { status, body } = await fill(input);
  return {
    status,
    body: {
      ok: status < 400,
      usedFallback: body.usedFallback,
      tagline: body.tagline,
      hero: body.hero,
      about_body: body.about_body,
      cta_label: body.cta_label,
      hours: body.hours,
      description: body.description,
      ...(body.error ? { error: body.error } : {}),
    },
  };
}
