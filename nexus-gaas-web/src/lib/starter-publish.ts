/** Map Channel Starter `publish_site` JSON to portal UI. Never fake a Vercel success. */

export const PUBLISH_NO_TOKEN = "publish gagal: set token di mesin wizard";

export type StarterPublishStatus = {
  publishOk: boolean;
  publishSkipped: boolean;
  vercelUrl: string | null;
  publishError: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function vercelUrl(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const url = value.trim();
  if (!/^https:\/\/[a-z0-9.-]+\.vercel\.app\/?$/i.test(url)) {
    return null;
  }
  return url.replace(/\/+$/, "");
}

export function summarizeVercelPublish(vercel: unknown): StarterPublishStatus {
  const row = asRecord(vercel);
  if (!row) {
    return {
      publishOk: false,
      publishSkipped: true,
      vercelUrl: null,
      publishError: PUBLISH_NO_TOKEN,
    };
  }
  const url = vercelUrl(row.url);
  if (row.ok === true) {
    return { publishOk: true, publishSkipped: false, vercelUrl: url, publishError: null };
  }
  const raw = [row.user_message, row.error, row.reason]
    .filter((part) => typeof part === "string" && part.trim())
    .map((part) => String(part).trim());
  const joined = raw[0] || "";
  const noToken = /VERCEL_TOKEN|vercel login|set token di mesin wizard/i.test(joined);
  return {
    publishOk: false,
    publishSkipped: row.skipped === true,
    vercelUrl: url,
    publishError: noToken || !joined ? PUBLISH_NO_TOKEN : joined.slice(0, 400),
  };
}
