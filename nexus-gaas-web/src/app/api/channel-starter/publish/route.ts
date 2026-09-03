import { NextRequest, NextResponse } from "next/server";
import { channelStarterInternalUrl } from "@/lib/channel-starter-urls";
import { lookupIdentity, publicIdentity, readSidFromRequest } from "@/lib/portal-identity";
import { summarizeVercelPublish } from "@/lib/starter-publish";

const CHANNEL_STARTER = channelStarterInternalUrl();
const SLUG = /^[a-z0-9-]{1,48}$/;

/** Invoke `POST /publish/{slug}` on the wizard PC (same as `python cli.py publish --slug`). Session required. */
export async function POST(request: NextRequest) {
  const identity = await lookupIdentity(readSidFromRequest(request));
  if (!identity) {
    return NextResponse.json({ ok: false, error: "Sesi diperlukan" }, { status: 401 });
  }

  let slug = "";
  try {
    const body = (await request.json()) as { slug?: string };
    slug = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";
  } catch {
    slug = "";
  }
  if (!SLUG.test(slug)) {
    return NextResponse.json({ ok: false, error: "slug tidak valid" }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${CHANNEL_STARTER}/publish/${encodeURIComponent(slug)}`, {
      method: "POST",
      headers: { Accept: "application/json" },
    });
    const vercel = (await upstream.json()) as unknown;
    const publish = summarizeVercelPublish(vercel);
    return NextResponse.json({
      ok: publish.publishOk,
      ...publish,
      ...publicIdentity(identity),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "upstream unavailable";
    return NextResponse.json(
      {
        ok: false,
        publishOk: false,
        publishSkipped: true,
        vercelUrl: null,
        publishError: /fetch failed|ECONNREFUSED/i.test(message)
          ? "publish gagal: Channel Starter :3010 tidak hidup"
          : "publish gagal: set token di mesin wizard",
      },
      { status: 502 },
    );
  }
}
