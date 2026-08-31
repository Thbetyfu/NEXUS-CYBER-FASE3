import { NextRequest, NextResponse } from "next/server";

const CHANNEL_STARTER =
  process.env.CHANNEL_STARTER_URL ?? process.env.NEXT_PUBLIC_CHANNEL_STARTER_URL ?? "http://127.0.0.1:3010";

const SUBDOMAIN_BASE = process.env.CHANNEL_STARTER_SUBDOMAIN_BASE?.trim() || "nexus-lab.test";

function slugFromLocation(location: string | null): string | null {
  if (!location) return null;
  const match = location.match(/\/(?:preview|sites)\/([^/?#]+)/);
  return match?.[1] ?? null;
}

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
      const slug = slugFromLocation(location);
      return NextResponse.json({
        ok: true,
        redirect: location,
        slug,
        previewUrl: slug ? `${CHANNEL_STARTER}/preview/${slug}` : null,
        subdomain: slug ? `${slug}.${SUBDOMAIN_BASE}` : null,
      });
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
