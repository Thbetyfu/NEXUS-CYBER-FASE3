import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { InsufficientKreditError, KREDIT } from "@/lib/kredit";
import { debitStarter, refundStarter, slugFromGenerateLocation } from "@/lib/kredit-ledger";
import { channelStarterInternalUrl, channelStarterPreviewUrl } from "@/lib/channel-starter-urls";
import { summarizeVercelPublish, type StarterPublishStatus } from "@/lib/starter-publish";
import {
  ledgerFileFor,
  lookupIdentity,
  publicIdentity,
  readSidFromRequest,
  type PortalIdentity,
} from "@/lib/portal-identity";

const SUBDOMAIN_BASE = process.env.CHANNEL_STARTER_SUBDOMAIN_BASE?.trim() || KREDIT.labSubdomainBase;

type GenerateJson = {
  ok: boolean;
  error?: string;
  slug?: string | null;
  previewUrl?: string | null;
  subdomain?: string | null;
  chargedKr?: number;
  balance?: number;
  orderId?: string;
  orderCode?: string | null;
  kind?: string | null;
  redirect?: string | null;
  publishOk?: boolean;
  publishSkipped?: boolean;
  vercelUrl?: string | null;
  publishError?: string | null;
};

function chargedResponse(
  snapshot: { balance: number },
  orderId: string,
  identity: PortalIdentity,
  extra: Partial<GenerateJson>,
  status = 200,
): NextResponse<GenerateJson> {
  return NextResponse.json(
    {
      ok: extra.ok ?? true,
      chargedKr: KREDIT.starterPriceKr,
      balance: snapshot.balance,
      orderId,
      ...publicIdentity(identity),
      ...extra,
    },
    { status },
  );
}

async function wizardPublishStatus(base: string, slug: string): Promise<StarterPublishStatus> {
  try {
    const res = await fetch(`${base}/publish/${encodeURIComponent(slug)}`, {
      method: "POST",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      return summarizeVercelPublish(undefined);
    }
    return summarizeVercelPublish(await res.json());
  } catch {
    return summarizeVercelPublish(undefined);
  }
}

/** Debit 20 Kr dulu, baru proxy ke Channel Starter. Gagal generate → refund. */
export async function POST(request: NextRequest) {
  const body = await request.formData();
  const orderId = randomUUID();
  const identity = await lookupIdentity(readSidFromRequest(request));
  if (!identity) {
    return NextResponse.json({ ok: false, error: "Sesi diperlukan" }, { status: 401 });
  }
  const ledgerPath = ledgerFileFor(identity);

  let snapshot: { balance: number };
  try {
    snapshot = await debitStarter(orderId, ledgerPath);
  } catch (err) {
    if (err instanceof InsufficientKreditError) {
      const response = NextResponse.json(
        {
          ok: false,
          error: err.message,
          balance: err.balance,
          needed: err.needed,
          starterPriceKr: KREDIT.starterPriceKr,
          ...publicIdentity(identity),
        },
        { status: 402 },
      );
      return response;
    }
    const message = err instanceof Error ? err.message : "debit failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }

  const CHANNEL_STARTER = channelStarterInternalUrl();
  if (!CHANNEL_STARTER) {
    const refunded = await refundStarter(orderId, ledgerPath);
    return chargedResponse(
      refunded,
      orderId,
      identity,
      {
        ok: false,
        error:
          "Generate Channel Starter hanya di PC operator. Portal Vercel adalah etalase — jangan CHANNEL_STARTER_URL loopback.",
        chargedKr: 0,
      },
      503,
    );
  }

  try {
    const upstream = await fetch(`${CHANNEL_STARTER}/generate?format=json`, {
      method: "POST",
      body,
      redirect: "manual",
      headers: { Accept: "application/json" },
    });

    const contentType = upstream.headers.get("content-type") || "";
    if (upstream.ok && contentType.includes("application/json")) {
      const payload = (await upstream.json()) as {
        slug?: string;
        vercel?: unknown;
        deploy?: { vercel?: unknown };
      };
      const slug = payload.slug || null;
      const publish = summarizeVercelPublish(payload.vercel ?? payload.deploy?.vercel);
      return chargedResponse(
        snapshot,
        orderId,
        identity,
        {
          ok: true,
          slug,
          previewUrl: slug ? channelStarterPreviewUrl(slug) : null,
          subdomain: slug ? `${slug}.${SUBDOMAIN_BASE}` : null,
          ...publish,
        },
        200,
      );
    }

    if (upstream.status >= 300 && upstream.status < 400) {
      const location = upstream.headers.get("location");
      const slug = slugFromGenerateLocation(location);
      const publish = slug
        ? await wizardPublishStatus(CHANNEL_STARTER, slug)
        : summarizeVercelPublish(undefined);
      return chargedResponse(
        snapshot,
        orderId,
        identity,
        {
          ok: true,
          slug,
          previewUrl: slug ? channelStarterPreviewUrl(slug) : null,
          subdomain: slug ? `${slug}.${SUBDOMAIN_BASE}` : null,
          redirect: location,
          ...publish,
        },
        200,
      );
    }

    if (!upstream.ok) {
      const refunded = await refundStarter(orderId, ledgerPath);
      const detail = await upstream.text();
      return chargedResponse(
        refunded,
        orderId,
        identity,
        { ok: false, error: detail || upstream.statusText, chargedKr: 0 },
        upstream.status,
      );
    }

    return chargedResponse(snapshot, orderId, identity, { ok: true }, 200);
  } catch (err) {
    const refunded = await refundStarter(orderId, ledgerPath);
    const message = err instanceof Error ? err.message : "upstream unavailable";
    return chargedResponse(refunded, orderId, identity, { ok: false, error: message, chargedKr: 0 }, 502);
  }
}
