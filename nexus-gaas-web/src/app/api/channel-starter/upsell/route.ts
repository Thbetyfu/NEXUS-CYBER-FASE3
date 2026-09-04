import { NextRequest, NextResponse } from "next/server";
import { channelStarterInternalUrl, channelStarterUpsellEnableUrl } from "@/lib/channel-starter-urls";
import { sanitizeLabSlug } from "@/lib/honest-copy";
import { isOperatorRequest } from "@/lib/operator-gate";

const SLUG = /^[a-z0-9-]{1,48}$/;

/** Operator-only: enable --tier tepi. Fail-closed off-lab. Never debit 20 Kr. Never create_loop. */
export async function POST(request: NextRequest) {
  if (!isOperatorRequest(request)) {
    return NextResponse.json(
      { ok: false, error: "Upsell tepi hanya loopback atau header operator" },
      { status: 403 },
    );
  }

  let slug = "";
  let tier = "";
  try {
    const body = (await request.json()) as { slug?: string; tier?: string };
    slug = sanitizeLabSlug(typeof body.slug === "string" ? body.slug : "");
    slug = slug.replace(/\.nexus-lab\.test$/i, "");
    tier = typeof body.tier === "string" ? body.tier.trim().toLowerCase() : "tepi";
  } catch {
    slug = "";
  }

  if (tier && tier !== "tepi") {
    return NextResponse.json(
      {
        ok: false,
        error: "Portal operator hanya --tier tepi. Job/Loop Cowork = CLI --tier cowork, bukan kasir Starter.",
      },
      { status: 400 },
    );
  }
  if (!SLUG.test(slug)) {
    return NextResponse.json({ ok: false, error: "slug tidak valid" }, { status: 400 });
  }

  const CHANNEL_STARTER = channelStarterInternalUrl();
  if (!CHANNEL_STARTER) {
    return NextResponse.json(
      {
        ok: false,
        error: "Wizard Channel Starter tidak tersedia di etalase ini. Pasang tepi di PC lab (fail-closed).",
      },
      { status: 503 },
    );
  }

  const url = channelStarterUpsellEnableUrl(CHANNEL_STARTER, slug);
  try {
    const upstream = await fetch(url, {
      method: "POST",
      headers: { Accept: "application/json" },
    });
    const payload = (await upstream.json()) as Record<string, unknown>;
    if (!upstream.ok) {
      const detail = typeof payload.detail === "string" ? payload.detail : "upsell gagal";
      return NextResponse.json({ ok: false, error: detail, slug }, { status: upstream.status === 400 ? 400 : 502 });
    }
    return NextResponse.json({
      ok: true,
      slug,
      tier: "tepi",
      create_loop: false,
      debitStarter: false,
      portfolioHost: "portfolio.nexus-lab.test",
      ...payload,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "upstream unavailable";
    return NextResponse.json(
      {
        ok: false,
        error: /fetch failed|ECONNREFUSED/i.test(message)
          ? "Channel Starter :3010 tidak hidup — nyalakan python cli.py serve"
          : "upsell tepi gagal",
      },
      { status: 502 },
    );
  }
}
