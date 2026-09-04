import { NextRequest, NextResponse } from "next/server";
import { wizardAutoClaimPaidSlugs, wizardListOwned } from "@/lib/channel-starter-owned";
import { getKreditSnapshot, slugsPaidOnLedger } from "@/lib/kredit-ledger";
import { isOperatorRequest } from "@/lib/operator-gate";
import { ledgerFileFor, lookupIdentity, publicIdentity, readSidFromRequest } from "@/lib/portal-identity";

/** Session-scoped list. No Kredit debit. Not GET FastAPI /sites. */
export async function GET(request: NextRequest) {
  const identity = await lookupIdentity(readSidFromRequest(request));
  if (!identity) {
    return NextResponse.json({ ok: false, error: "Sesi diperlukan" }, { status: 401 });
  }
  try {
    const snap = await getKreditSnapshot(ledgerFileFor(identity));
    await wizardAutoClaimPaidSlugs(identity, slugsPaidOnLedger(snap.entries));
  } catch {
    /* ledger missing slug notes: caller still lists owned only */
  }
  const listed = await wizardListOwned(identity);
  if (listed.status !== 200) {
    return NextResponse.json(
      {
        ok: false,
        error: listed.error,
        sites: [],
        ...(isOperatorRequest(request) && listed.operatorDetail
          ? { operatorDetail: listed.operatorDetail }
          : {}),
        ...publicIdentity(identity),
      },
      { status: listed.status },
    );
  }
  return NextResponse.json({
    ok: true,
    sites: listed.sites,
    ...publicIdentity(identity),
  });
}
