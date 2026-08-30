/** Label wasit Job Cowork — jujur, bukan "hijau palsu". */

import { gatewayURL } from "@/config";

export const WASIT_LABELS: Record<string, string> = {
  waf_blocked: "WAF blokir (tepi menahan)",
  origin_open: "Origin terbuka (tanpa WAF lolos)",
  both_held: "Keduanya menahan",
  replay_held: "Replay tetap 403",
  replay_missed: "Replay lolos — GAP (bukan CLOSED_OK)",
  antibody_learned: "Sinyal antibodi tercatat",
};

export type ArtifactFormat = "md" | "json";

const CLOSED_STATUSES = new Set(["CLOSED_OK", "CLOSED_GAP", "PARTIAL"]);

export function formatWasitDelta(key: string, count: number): string {
  return `${WASIT_LABELS[key] || key}: ${count}`;
}

export function errorMessage(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback;
}

export function statusTone(status: string): string {
  switch (status) {
    case "CLOSED_OK":
      return "text-emerald-300 border-emerald-500/40 bg-emerald-950/50";
    case "CLOSED_GAP":
    case "PARTIAL":
      return "text-amber-300 border-amber-500/40 bg-amber-950/50";
    case "PENDING_APPROVAL":
      return "text-sky-300 border-sky-500/40 bg-sky-950/50";
    case "OPEN":
    case "MEASURING":
    case "MEASURED":
    case "VERIFYING":
      return "text-slate-300 border-slate-500/40 bg-slate-950/50";
    default:
      return "text-gray-400 border-gray-600/40 bg-black/40";
  }
}

export function isClosedJobStatus(status: string): boolean {
  return CLOSED_STATUSES.has(status);
}

export function canExportArtifact(status: string): boolean {
  return isClosedJobStatus(status) || status === "PENDING_APPROVAL";
}

export async function approveCoworkJob(
  jobId: string,
  operator: string
): Promise<void> {
  const res = await fetch("/api/jobs", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ job_id: jobId, operator }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Approve gagal");
}

export async function downloadJobArtifact(
  jobId: string,
  format: ArtifactFormat
): Promise<void> {
  const res = await fetch(
    `/api/jobs/${encodeURIComponent(jobId)}/artifact?format=${format}`
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Artefak tidak tersedia");

  const body =
    format === "md"
      ? String(data.markdown || "")
      : JSON.stringify(data.artifact ?? data, null, 2);
  const blob = new Blob([body], {
    type: format === "md" ? "text/markdown" : "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `nexus-job-${jobId}.${format}`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadIncidentDigest(
  domain: string,
  hours: number,
  format: ArtifactFormat
): Promise<void> {
  const host = normalizeProtectedHost(domain);
  if (!host || isGlobalWorkspace(host)) {
    throw new Error("Pilih workspace — Global Overwatch tidak mengunduh digest");
  }
  const windowHours = Number.isFinite(hours) && hours > 0 ? Math.min(Math.floor(hours), 168) : 24;
  const res = await fetch(
    `/api/incidents/digest?domain=${encodeURIComponent(host)}&hours=${windowHours}&format=${format}`
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (data as { error?: string }).error || `Digest gagal (HTTP ${res.status})`
    );
  }

  const body =
    format === "md"
      ? String((data as { markdown?: string }).markdown || "")
      : JSON.stringify(data, null, 2);
  const blob = new Blob([body], {
    type: format === "md" ? "text/markdown" : "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safe = host.replace(/[^a-zA-Z0-9.-]+/g, "_");
  a.download = `nexus-incidents-${safe}-${windowHours}h.${format}`;
  a.click();
  URL.revokeObjectURL(url);
}

export const DEFAULT_PROTECTED_HOST =
  process.env.NEXT_PUBLIC_PROTECTED_HOST || "portfolio.nexus-lab.test";

/** Live WAF base from env (display / fallback only — Job binds to workspace host). */
export const DEFAULT_LIVE_TARGET =
  process.env.NEXT_PUBLIC_NEX_RED_LIVE_TARGET || "http://127.0.0.1:8080";

const HOST_RE =
  /^[a-zA-Z0-9][-a-zA-Z0-9]{0,62}(\.[a-zA-Z0-9][-a-zA-Z0-9]{0,62})*(:\d+)?$/;

/** Global Overwatch — combined monitoring; Job Cowork must pick a workspace. */
export function isGlobalWorkspace(domain: string): boolean {
  return !domain || domain === "all";
}

/**
 * Workspace-bound Job target via WAF. NEX-RED binds TCP to the gateway and sends Host.
 * Never returns raw customer origin — defense delta still uses NEX_RED_ORIGIN_DIRECT internally.
 */
export function wafTargetForWorkspace(activeDomain: string): string | null {
  if (isGlobalWorkspace(activeDomain)) return null;
  const host = normalizeProtectedHost(activeDomain);
  if (!host) return null;
  return `http://${host}`;
}

/** UI badge: Target: host (via WAF) */
export function workspaceTargetLabel(activeDomain: string): string {
  if (isGlobalWorkspace(activeDomain)) {
    return "Target: (pilih workspace) — Global Overwatch";
  }
  return `Target: ${normalizeProtectedHost(activeDomain) || activeDomain} (via WAF)`;
}

/** Strip scheme/path from operator paste → hostname for protected kanal. */
export function normalizeProtectedHost(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  try {
    const withScheme = trimmed.includes("://") ? trimmed : `http://${trimmed}`;
    const u = new URL(withScheme);
    return u.host.toLowerCase();
  } catch {
    return trimmed.replace(/^https?:\/\//i, "").split("/")[0].toLowerCase();
  }
}

/** Lab/pilot default: keep DEFAULT_PROTECTED_HOST, or suggest origin hostname. */
export function deriveProtectedHost(originUrl: string): string {
  try {
    const host = new URL(originUrl).hostname.toLowerCase();
    if (
      host &&
      host !== "localhost" &&
      !/^\d{1,3}(\.\d{1,3}){3}$/.test(host) &&
      host.includes(".")
    ) {
      return host;
    }
  } catch {
    /* fall through */
  }
  return DEFAULT_PROTECTED_HOST;
}

export function validateOriginUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return "Origin URL wajib diisi.";
  let u: URL;
  try {
    u = new URL(trimmed);
  } catch {
    return "Origin URL tidak valid. Contoh: https://site-lama.example.com";
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    return "Origin harus http:// atau https://";
  }
  if (!u.hostname) return "Origin harus punya hostname.";
  return null;
}

export function validateProtectedHost(raw: string): string | null {
  const host = normalizeProtectedHost(raw);
  if (!host) return "Protected host wajib (atau biarkan default lab).";
  if (!HOST_RE.test(host)) {
    return "Format host tidak valid (contoh: portfolio.nexus-lab.test).";
  }
  return null;
}

export type OnboardKanalResult = {
  domain: string;
  target_url: string;
  protected_host: string;
  protected_url: string;
};

/** Register protected host → origin via control-plane POST /api/routes. */
export async function onboardKanal(params: {
  originUrl: string;
  protectedHost: string;
}): Promise<OnboardKanalResult> {
  const originErr = validateOriginUrl(params.originUrl);
  if (originErr) throw new Error(originErr);
  const host = normalizeProtectedHost(params.protectedHost) || DEFAULT_PROTECTED_HOST;
  const hostErr = validateProtectedHost(host);
  if (hostErr) throw new Error(hostErr);

  const tokenRes = await fetch(gatewayURL("/api/csrf-token"), {
    credentials: "include",
  });
  const { csrf_token } = tokenRes.ok
    ? await tokenRes.json()
    : { csrf_token: "" };

  const res = await fetch(gatewayURL("/api/routes"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(csrf_token ? { "X-CSRF-Token": csrf_token } : {}),
    },
    credentials: "include",
    body: JSON.stringify({
      domain: host,
      target_url: params.originUrl.trim(),
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (data as { message?: string }).message ||
        `Onboard gagal (HTTP ${res.status})`
    );
  }
  const domain =
    (data as { domain?: string; protected_host?: string }).protected_host ||
    (data as { domain?: string }).domain ||
    host;
  const target =
    (data as { target_url?: string }).target_url || params.originUrl.trim();
  return {
    domain,
    target_url: target,
    protected_host: domain,
    protected_url: `http://${domain}`,
  };
}
