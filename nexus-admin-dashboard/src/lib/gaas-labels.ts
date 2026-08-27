/** Label wasit Job Cowork — jujur, bukan "hijau palsu". */

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

export const DEFAULT_PROTECTED_HOST =
  process.env.NEXT_PUBLIC_PROTECTED_HOST || "portfolio.nexus-lab.test";
