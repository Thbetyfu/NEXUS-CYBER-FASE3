/** Cerita → JSON copy slots. Server-side Ollama loopback only. Not NEX-AI WAF. */

import {
  CATEGORY_COPY,
  normalizeStarterCategory,
  type StarterCategory,
} from "./starter-generate-payload.ts";
import {
  FILL_STARTER_TIMEOUT_MS,
  localLlmBaseUrl,
  localLlmGenerateUrl,
  resolveWriterModel,
} from "./local-llm.ts";

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
};

export function categoryPresetSlots(category: string): FillStarterSlots {
  const copy = CATEGORY_COPY[normalizeStarterCategory(category)];
  return {
    tagline: copy.tagline,
    hero: `${copy.headline} ${copy.headline_accent}`.trim(),
    about_body: copy.about_body,
    cta_label: copy.cta_label,
    hours: copy.hours,
    description: copy.description,
  };
}

export function parseFillStarterInput(raw: unknown): FillStarterInput | null {
  if (!raw || typeof raw !== "object") return null;
  const body = raw as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const whatsapp = typeof body.whatsapp === "string" ? body.whatsapp.trim() : "";
  const story = typeof body.story === "string" ? body.story.trim() : "";
  const category = typeof body.category === "string" ? body.category.trim() : "profil";
  if (!name || !story) return null;
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
    "Tulis teks situs UMKM bahasa Indonesia. Keluaran HANYA JSON, tanpa HTML, tanpa markdown.",
    'Kunci: {"tagline","hero","about_body","cta_label","hours","description"}',
    "Pakai HANYA fakta di cerita. Jangan mengarang alamat, harga, atau klaim yang tidak tertulis.",
    "Jika jam operasional tidak disebut di cerita, hours harus string kosong.",
    "cta_label singkat (tombol WhatsApp). hero = judul hero satu kalimat. description 1–2 kalimat.",
    `Nama usaha: ${input.name}`,
    `Kategori: ${category}`,
    `WhatsApp: ${input.whatsapp || "(tidak diisi)"}`,
    `Cerita: ${input.story}`,
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
  const fallback = (status: number): { status: number; body: FillStarterResult } => ({
    status,
    body: { ...presets, usedFallback: true },
  });

  const base = localLlmBaseUrl(env);
  if (!base.ok) {
    return fallback(503);
  }

  const model = resolveWriterModel(env);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetcher(localLlmGenerateUrl(base.url), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: ctrl.signal,
      cache: "no-store",
      body: JSON.stringify({
        model,
        prompt: buildFillPrompt(input, category),
        stream: false,
        format: "json",
      }),
    });
    if (!res.ok) {
      return fallback(200);
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
      return fallback(200);
    }
    return {
      status: 200,
      body: { ...slots, usedFallback: false, model },
    };
  } catch {
    return fallback(200);
  } finally {
    clearTimeout(timer);
  }
}
