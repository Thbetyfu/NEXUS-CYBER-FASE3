import { NextRequest, NextResponse } from "next/server";
import { wizardClaimSite } from "@/lib/channel-starter-owned";
import { lookupIdentity, publicIdentity, readSidFromRequest } from "@/lib/portal-identity";

/** Session claim of one unowned slug. No Kredit debit. Not GET /sites. */
export async function POST(request: NextRequest) {
  const identity = await lookupIdentity(readSidFromRequest(request));
  if (!identity) {
    return NextResponse.json({ ok: false, error: "Sesi diperlukan" }, { status: 401 });
  }

  let slug = "";
  try {
    const body = (await request.json()) as { slug?: string };
    slug = typeof body.slug === "string" ? body.slug : "";
  } catch {
    slug = "";
  }

  const claimed = await wizardClaimSite(identity, slug);
  if (claimed.status !== 200) {
    return NextResponse.json(
      {
        ok: false,
        error: claimed.error,
        outcome: claimed.outcome,
        ...publicIdentity(identity),
      },
      { status: claimed.status },
    );
  }
  return NextResponse.json({
    ok: true,
    outcome: claimed.outcome,
    site: claimed.site,
    ...publicIdentity(identity),
  });
}
