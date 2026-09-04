import { NextRequest, NextResponse } from "next/server";
import { wizardListOwned } from "@/lib/channel-starter-owned";
import { isOperatorRequest } from "@/lib/operator-gate";
import { lookupIdentity, publicIdentity, readSidFromRequest } from "@/lib/portal-identity";

/** Session-scoped list. No Kredit debit. Not GET FastAPI /sites. */
export async function GET(request: NextRequest) {
  const identity = await lookupIdentity(readSidFromRequest(request));
  if (!identity) {
    return NextResponse.json({ ok: false, error: "Sesi diperlukan" }, { status: 401 });
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
