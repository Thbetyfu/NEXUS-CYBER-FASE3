import { NextRequest, NextResponse } from "next/server";
import { getKreditSnapshot } from "@/lib/kredit-ledger";
import {
  applySidCookie,
  ensureGuestIdentity,
  ledgerFileFor,
  publicIdentity,
} from "@/lib/portal-identity";

export async function GET(request: NextRequest) {
  try {
    const { identity, issuedSid } = await ensureGuestIdentity(request);
    const snapshot = await getKreditSnapshot(ledgerFileFor(identity));
    const response = NextResponse.json({
      ok: true,
      ...snapshot,
      walletId: identity.walletId,
      ...publicIdentity(identity),
    });
    if (issuedSid) {
      applySidCookie(response, issuedSid);
    }
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "ledger unavailable";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
