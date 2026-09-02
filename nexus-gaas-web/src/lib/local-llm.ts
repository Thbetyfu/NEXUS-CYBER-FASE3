/** Local writing-model runtime on the operator PC. Server-side only. Not NEX-AI WAF. */

export const DEFAULT_LOCAL_LLM_URL = "http://127.0.0.1:11434";
/** Small instruct model for Channel Starter copy. Never WAF protect/reflex. Never 70B. */
export const DEFAULT_LOCAL_LLM_MODEL = "gemma3:1b";
export const FILL_STARTER_TIMEOUT_MS = 25_000;

const WAF_WRITER_BASES = new Set(["nex-ai-protect", "nex-ai-reflex"]);

const MSG_NOT_LOOPBACK =
  "NEXUS_LOCAL_LLM_URL harus 127.0.0.1 (loopback). Jangan alamat LAN, 0.0.0.0, atau URL publik.";
const MSG_DOWN =
  "Runtime model tulis tidak merespons di PC ini. Jalankan nexus-core\\deploy-local\\START-LOCAL-LLM.bat. Jangan tunnel port model.";
const MSG_INSTALL =
  "Ollama belum terpasang atau belum nyala. Pasang dari https://ollama.com/download lalu START-LOCAL-LLM.bat. Bind hanya 127.0.0.1.";

export type LocalLlmBase =
  | { ok: true; url: string }
  | { ok: false; error: string };

export function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

export function isLocalLlmLoopbackUrl(raw: string): boolean {
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }
    const host = parsed.hostname.toLowerCase();
    if (host === "0.0.0.0" || host === "::" || host === "[::]") {
      return false;
    }
    return host === "127.0.0.1" || host === "localhost" || host === "::1";
  } catch {
    return false;
  }
}

export function localLlmBaseUrl(
  env: NodeJS.Dict<string | undefined> = process.env,
): LocalLlmBase {
  const raw = env.NEXUS_LOCAL_LLM_URL?.trim() || DEFAULT_LOCAL_LLM_URL;
  if (!isLocalLlmLoopbackUrl(raw)) {
    return { ok: false, error: MSG_NOT_LOOPBACK };
  }
  return { ok: true, url: stripTrailingSlash(raw) };
}

export function localLlmTagsUrl(base: string): string {
  return `${stripTrailingSlash(base)}/api/tags`;
}

export function localLlmGenerateUrl(base: string): string {
  return `${stripTrailingSlash(base)}/api/generate`;
}

export function writerModelBaseName(tag: string): string {
  return tag.trim().toLowerCase().split(":")[0] ?? "";
}

export function isBlockedWriterModel(tag: string): boolean {
  const trimmed = tag.trim();
  if (!trimmed) return true;
  if (WAF_WRITER_BASES.has(writerModelBaseName(trimmed))) return true;
  return /70b/i.test(trimmed);
}

/** Env tag, or default. WAF protect/reflex and 70B are never selected. */
export function resolveWriterModel(env: NodeJS.Dict<string | undefined> = process.env): string {
  const raw = env.NEXUS_LOCAL_LLM_MODEL?.trim() || DEFAULT_LOCAL_LLM_MODEL;
  if (isBlockedWriterModel(raw)) {
    return DEFAULT_LOCAL_LLM_MODEL;
  }
  return raw;
}

export type LocalLlmHealth = {
  ok: boolean;
  ready: boolean;
  message: string;
  modelCount?: number;
};

type TagsJson = { models?: unknown };

export function healthFromTagsBody(body: string): LocalLlmHealth {
  let parsed: TagsJson;
  try {
    parsed = JSON.parse(body) as TagsJson;
  } catch {
    return { ok: false, ready: false, message: MSG_DOWN };
  }
  const models = Array.isArray(parsed.models) ? parsed.models : [];
  return {
    ok: true,
    ready: true,
    message:
      "Runtime model tulis di PC siap (loopback). Bukan NEX-AI WAF. Fill cerita: POST /api/local-llm/fill-starter.",
    modelCount: models.length,
  };
}

export async function pingLocalLlm(
  env: NodeJS.Dict<string | undefined> = process.env,
  fetcher: typeof fetch = fetch,
): Promise<{ status: number; body: LocalLlmHealth }> {
  const base = localLlmBaseUrl(env);
  if (!base.ok) {
    return { status: 503, body: { ok: false, ready: false, message: base.error } };
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const res = await fetcher(localLlmTagsUrl(base.url), {
      method: "GET",
      signal: ctrl.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      return { status: 503, body: { ok: false, ready: false, message: MSG_DOWN } };
    }
    const text = await res.text();
    return { status: 200, body: healthFromTagsBody(text) };
  } catch {
    return { status: 503, body: { ok: false, ready: false, message: MSG_INSTALL } };
  } finally {
    clearTimeout(timer);
  }
}
