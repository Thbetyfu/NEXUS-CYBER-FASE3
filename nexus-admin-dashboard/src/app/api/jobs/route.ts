import { NextResponse } from 'next/server';

const BRIDGE = process.env.NEX_RED_BRIDGE_URL || 'http://127.0.0.1:3004';

export async function GET() {
  try {
    const res = await fetch(`${BRIDGE}/api/v1/jobs`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) {
      return NextResponse.json({ jobs: [], bridge: 'offline' });
    }
    const data = await res.json();
    return NextResponse.json({ jobs: data.jobs || [], bridge: 'online' });
  } catch {
    return NextResponse.json({ jobs: [], bridge: 'offline' });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const res = await fetch(`${BRIDGE}/api/v1/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: body.title || 'Command Center Job',
        target_url: body.target_url || process.env.NEX_RED_LIVE_TARGET || 'http://127.0.0.1:8080',
        autonomy_level: body.autonomy_level || 'L0',
        enable_llm: false,
        auto_approve: false,
        operator: 'command-center',
      }),
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data.detail || 'Bridge error' }, { status: 502 });
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'NEX-RED bridge unreachable on :3004' }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const jobId = body.job_id;
    if (!jobId) {
      return NextResponse.json({ error: 'job_id required' }, { status: 400 });
    }
    const res = await fetch(`${BRIDGE}/api/v1/jobs/${jobId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operator: body.operator || 'command-center',
        note: body.note || 'approved via Command Center',
        approved: true,
      }),
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data.detail || 'Approve failed' }, { status: 502 });
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'NEX-RED bridge unreachable' }, { status: 503 });
  }
}
