import { NextResponse } from "next/server";
import { fillStarterCopy, parseFillStarterInput } from "@/lib/local-llm-fill";
import { clientKey, rateLimitAllow } from "@/lib/rate-limit";

export async function POST(request: Request) {
  if (!rateLimitAllow(`local-llm-fill:${clientKey(request)}`, 12, 60_000)) {
    return NextResponse.json(
      { ok: false, usedFallback: true, error: "Terlalu banyak permintaan. Coba lagi nanti." },
      { status: 429 },
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, usedFallback: true, error: "Body JSON tidak valid." },
      { status: 400 },
    );
  }

  const input = parseFillStarterInput(raw);
  if (!input) {
    return NextResponse.json(
      { ok: false, usedFallback: true, error: "Butuh name (teks, bukan HTML)." },
      { status: 400 },
    );
  }

  const { status, body } = await fillStarterCopy(input);
  return NextResponse.json(
    {
      ok: status < 400,
      usedFallback: body.usedFallback,
      tagline: body.tagline,
      hero: body.hero,
      about_body: body.about_body,
      cta_label: body.cta_label,
      hours: body.hours,
      description: body.description,
    },
    { status },
  );
}
