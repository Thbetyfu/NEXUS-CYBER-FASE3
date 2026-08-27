import { NextResponse } from "next/server";

const BRIDGE = process.env.NEX_RED_BRIDGE_URL || "http://127.0.0.1:3004";
const PROTECTED_HOST =
  process.env.PROTECTED_HOST ||
  process.env.NEXT_PUBLIC_PROTECTED_HOST ||
  "portfolio.nexus-lab.test";
const LIVE_TARGET = process.env.NEX_RED_LIVE_TARGET || "http://127.0.0.1:8080";

export async function GET() {
  let bridge: "online" | "offline" = "offline";
  let pendingApproval = 0;
  let jobCount = 0;

  try {
    const res = await fetch(`${BRIDGE}/api/v1/jobs?limit=50`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) throw new Error("bridge non-ok");
    bridge = "online";
    const data = await res.json();
    const jobs = Array.isArray(data.jobs) ? data.jobs : [];
    jobCount = jobs.length;
    pendingApproval = jobs.filter(
      (j: { status?: string }) => j.status === "PENDING_APPROVAL"
    ).length;
  } catch {
    /* bridge offline — keep defaults */
  }

  return NextResponse.json({
    protected_host: PROTECTED_HOST,
    live_target: LIVE_TARGET,
    bridge,
    job_count: jobCount,
    pending_approval: pendingApproval,
    note: "Operator Nexus only — bukan dashboard pelanggan / Channel Portal",
  });
}
