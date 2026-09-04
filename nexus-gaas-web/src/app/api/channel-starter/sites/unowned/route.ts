import { NextRequest, NextResponse } from "next/server";
import { wizardListUnowned } from "@/lib/channel-starter-owned";
import { isOperatorRequest } from "@/lib/operator-gate";

/** Operator loopback: list folders without portal_owner_*. Fail-closed off-lab. */
export async function GET(request: NextRequest) {
  if (!isOperatorRequest(request)) {
    return NextResponse.json(
      { ok: false, error: "Daftar slug tanpa pemilik hanya loopback atau header operator" },
      { status: 403 },
    );
  }
  const listed = await wizardListUnowned();
  if (listed.status !== 200) {
    return NextResponse.json({ ok: false, error: listed.error, sites: [] }, { status: listed.status });
  }
  return NextResponse.json({ ok: true, sites: listed.sites });
}
