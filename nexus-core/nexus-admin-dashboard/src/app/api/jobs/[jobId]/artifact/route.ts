import { NextResponse } from "next/server";

const BRIDGE = process.env.NEX_RED_BRIDGE_URL || "http://127.0.0.1:3004";

export async function GET(
  request: Request,
  context: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await context.params;
  if (!jobId) {
    return NextResponse.json({ error: "job_id required" }, { status: 400 });
  }
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") === "md" ? "md" : "json";

  try {
    const res = await fetch(
      `${BRIDGE}/api/v1/jobs/${encodeURIComponent(jobId)}/artifact?format=${format}`,
      { signal: AbortSignal.timeout(8000) }
    );
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: data.detail || "Artifact unavailable" },
        { status: 502 }
      );
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "NEX-RED bridge unreachable on :3004" },
      { status: 503 }
    );
  }
}
