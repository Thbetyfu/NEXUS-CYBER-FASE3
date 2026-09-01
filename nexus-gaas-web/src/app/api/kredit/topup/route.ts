import { NextRequest, NextResponse } from "next/server";
import { createTopupRequest } from "@/lib/kredit-topup";
import { kreditClientView } from "@/lib/kredit-public";
import { lookupIdentity, readSidFromRequest } from "@/lib/portal-identity";

export async function POST(request: NextRequest) {
  let amount = 0;
  try {
    const body = (await request.json()) as { amount?: number };
    if (typeof body.amount === "number") {
      amount = body.amount;
    }
  } catch {
    amount = 0;
  }

  try {
    const identity = await lookupIdentity(readSidFromRequest(request));
    if (!identity) {
      return NextResponse.json({ ok: false, error: "Sesi diperlukan" }, { status: 401 });
    }
    const identityId = identity.kind === "account" ? identity.accountId : identity.guestId;
    if (!identityId) {
      return NextResponse.json({ ok: false, error: "Identitas tidak lengkap" }, { status: 400 });
    }
    const created = await createTopupRequest(amount, {
      kind: identity.kind,
      identityId,
      walletId: identity.walletId,
    });
    const view = await kreditClientView(identity);
    return NextResponse.json({
      ...view,
      requested: created.pending,
      credited: false,
    });
  } catch (err) {
    if (err instanceof RangeError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "topup failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
