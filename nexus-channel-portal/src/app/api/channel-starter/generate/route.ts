import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { InsufficientKreditError, KREDIT } from "@/lib/kredit";
import { debitStarter, refundStarter, slugFromGenerateLocation } from "@/lib/kredit-ledger";

const CHANNEL_STARTER =
  process.env.CHANNEL_STARTER_URL ?? process.env.NEXT_PUBLIC_CHANNEL_STARTER_URL ?? "http://127.0.0.1:3010";

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
  redirect?: string | null;
};

function chargedResponse(
  snapshot: { balance: number },
  orderId: string,
  extra: Partial<GenerateJson>,
  status = 200,
): NextResponse<GenerateJson> {
  return NextResponse.json(
    {
      ok: extra.ok ?? true,
      chargedKr: KREDIT.starterPriceKr,
      balance: snapshot.balance,
      orderId,
      ...extra,
    },
    { status },
  );
}

/** Debit 20 Kr dulu, baru proxy ke Channel Starter. Gagal generate → refund. */
export async function POST(request: NextRequest) {
  const body = await request.formData();
  const orderId = randomUUID();

  let snapshot: { balance: number };
  try {
    snapshot = await debitStarter(orderId);
  } catch (err) {
    if (err instanceof InsufficientKreditError) {
      return NextResponse.json(
        {
          ok: false,
          error: err.message,
          balance: err.balance,
          needed: err.needed,
          starterPriceKr: KREDIT.starterPriceKr,
        },
        { status: 402 },
      );
    }
    const message = err instanceof Error ? err.message : "debit failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }

  try {
    const upstream = await fetch(`${CHANNEL_STARTER}/generate`, {
      method: "POST",
      body,
      redirect: "manual",
    });

    if (upstream.status >= 300 && upstream.status < 400) {
      const location = upstream.headers.get("location");
      const slug = slugFromGenerateLocation(location);
      return chargedResponse(snapshot, orderId, {
        ok: true,
        slug,
        previewUrl: slug ? `${CHANNEL_STARTER}/preview/${slug}` : null,
        subdomain: slug ? `${slug}.${SUBDOMAIN_BASE}` : null,
        redirect: location,
      });
    }

    if (!upstream.ok) {
      const refunded = await refundStarter(orderId);
      const detail = await upstream.text();
      return chargedResponse(
        refunded,
        orderId,
        { ok: false, error: detail || upstream.statusText, chargedKr: 0 },
        upstream.status,
      );
    }

    return chargedResponse(snapshot, orderId, { ok: true });
  } catch (err) {
    const refunded = await refundStarter(orderId);
    const message = err instanceof Error ? err.message : "upstream unavailable";
    return chargedResponse(refunded, orderId, { ok: false, error: message, chargedKr: 0 }, 502);
  }
}
