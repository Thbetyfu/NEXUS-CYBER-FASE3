import { NextRequest, NextResponse } from "next/server";
import { FaucetDisabledError, KREDIT } from "@/lib/kredit";
import { creditFaucet } from "@/lib/kredit-ledger";

export async function POST(request: NextRequest) {
  let amount: number = KREDIT.faucetAmountKr;
  try {
    const body = (await request.json()) as { amount?: number };
    if (typeof body.amount === "number") {
      amount = body.amount;
    }
  } catch {
    /* empty body = default keran */
  }

  try {
    const snapshot = await creditFaucet(amount);
    return NextResponse.json({ ok: true, ...snapshot });
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
