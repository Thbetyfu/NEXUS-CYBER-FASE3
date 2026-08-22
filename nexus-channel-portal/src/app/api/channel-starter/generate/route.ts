import { NextRequest, NextResponse } from "next/server";

const CHANNEL_STARTER =
  process.env.CHANNEL_STARTER_URL ?? process.env.NEXT_PUBLIC_CHANNEL_STARTER_URL ?? "http://127.0.0.1:3010";

/** Proxy form ke channel-starter FastAPI (hindari CORS browser). */
export async function POST(request: NextRequest) {
  try {
    const body = await request.formData();
    const upstream = await fetch(`${CHANNEL_STARTER}/generate`, {
      method: "POST",
      body,
      redirect: "manual",
    });

    if (upstream.status >= 300 && upstream.status < 400) {
      const location = upstream.headers.get("location");
      return NextResponse.json({ ok: true, redirect: location });
    }

    if (!upstream.ok) {
      const detail = await upstream.text();
      return NextResponse.json({ ok: false, error: detail || upstream.statusText }, { status: upstream.status });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "upstream unavailable";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
