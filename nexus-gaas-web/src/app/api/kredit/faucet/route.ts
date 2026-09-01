import { NextRequest, NextResponse } from "next/server";
import { FaucetDisabledError } from "@/lib/kredit";
import { creditFaucet } from "@/lib/kredit-ledger";
import { kreditClientView } from "@/lib/kredit-public";
import { ledgerFileFor, lookupIdentity, readSidFromRequest } from "@/lib/portal-identity";

export async function POST(request: NextRequest) {
  let amount: number | undefined;
  try {
    const body = (await request.json()) as { amount?: number };
    if (typeof body.amount === "number") {
      amount = body.amount;
    }
  } catch {
    /* empty body = default keran */
  }

  try {
    const identity = await lookupIdentity(readSidFromRequest(request));
    if (!identity) {
      return NextResponse.json({ ok: false, error: "Sesi diperlukan" }, { status: 401 });
    }
    await creditFaucet(amount, ledgerFileFor(identity), identity.walletId);
    return NextResponse.json(await kreditClientView(identity));
  } catch (err) {
    if (err instanceof FaucetDisabledError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 403 });
    }
    if (err instanceof RangeError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "faucet failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
