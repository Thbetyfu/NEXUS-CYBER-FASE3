import { NextResponse } from 'next/server';

const BRIDGE = process.env.NEX_RED_BRIDGE_URL || 'http://127.0.0.1:3004';
const LIVE_TARGET = process.env.NEX_RED_LIVE_TARGET || 'http://127.0.0.1:8080';

function normalizeHost(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed || trimmed === 'all') return '';
  try {
    const withScheme = trimmed.includes('://') ? trimmed : `http://${trimmed}`;
    return new URL(withScheme).host.toLowerCase();
  } catch {
    return trimmed.replace(/^https?:\/\//i, '').split('/')[0].toLowerCase();
  }
}

/**
 * Resolve Job target: WAF-bound protected host URL when workspace is set.
 * NEX-RED connects to the gateway IP and sends Host: {protected_host} (no hosts file).
 * Does not aim at raw customer origin — NEX-RED still uses NEX_RED_ORIGIN_DIRECT for delta.
 */
function resolveJobTarget(body: {
  target_url?: string;
  protected_host?: string;
}): { target_url: string; protected_host: string } | { error: string } {
  const host = normalizeHost(body.protected_host);
  if (host) {
    return {
      protected_host: host,
      target_url: `http://${host}`,
    };
  }
  // Legacy/CLI: allow explicit target_url only if it looks like WAF (not a free-form origin paste from UI)
  const fallback = (body.target_url || LIVE_TARGET).trim();
  if (!fallback) {
    return { error: 'protected_host or target_url required' };
  }
  try {
    const u = new URL(fallback);
    const ph = u.host.toLowerCase();
    return { target_url: fallback, protected_host: ph };
  } catch {
    return { error: 'Invalid target_url' };
  }
}

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
    const resolved = resolveJobTarget(body);
    if ('error' in resolved) {
      return NextResponse.json({ error: resolved.error }, { status: 400 });
    }
    const res = await fetch(`${BRIDGE}/api/v1/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: body.title || 'Command Center Job',
        target_url: resolved.target_url,
        protected_host: resolved.protected_host,
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
