import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { InsufficientKreditError, KREDIT } from "@/lib/kredit";
import { debitStarter, refundStarter, slugFromGenerateLocation } from "@/lib/kredit-ledger";
import {
  ledgerFileFor,
  lookupIdentity,
  publicIdentity,
  readSidFromRequest,
  type PortalIdentity,
} from "@/lib/portal-identity";

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
  orderCode?: string | null;
  kind?: string | null;
  redirect?: string | null;
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

  try {
    const upstream = await fetch(`${CHANNEL_STARTER}/generate`, {
      method: "POST",
      body,
      redirect: "manual",
    });

    if (upstream.status >= 300 && upstream.status < 400) {
      const location = upstream.headers.get("location");
      const slug = slugFromGenerateLocation(location);
      return chargedResponse(
        snapshot,
        orderId,
        identity,
        {
          ok: true,
          slug,
          previewUrl: slug ? `${CHANNEL_STARTER}/preview/${slug}` : null,
          subdomain: slug ? `${slug}.${SUBDOMAIN_BASE}` : null,
          redirect: location,
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
