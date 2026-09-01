import { NextRequest, NextResponse } from "next/server";
import { getKreditSnapshot } from "@/lib/kredit-ledger";
import { ledgerFileFor, lookupIdentity, publicIdentity, readSidFromRequest } from "@/lib/portal-identity";

export async function GET(request: NextRequest) {
  try {
    const identity = await lookupIdentity(readSidFromRequest(request));
    if (!identity) {
      return NextResponse.json({ ok: false, error: "Sesi diperlukan" }, { status: 401 });
    }
    const snapshot = await getKreditSnapshot(ledgerFileFor(identity));
    return NextResponse.json({
      ok: true,
      ...snapshot,
      walletId: identity.walletId,
      ...publicIdentity(identity),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "ledger unavailable";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
