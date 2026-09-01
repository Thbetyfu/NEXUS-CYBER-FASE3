import { NextRequest, NextResponse } from "next/server";
import { kreditClientView } from "@/lib/kredit-public";
import { lookupIdentity, readSidFromRequest } from "@/lib/portal-identity";

export async function GET(request: NextRequest) {
  try {
    const identity = await lookupIdentity(readSidFromRequest(request));
    if (!identity) {
      return NextResponse.json({ ok: false, error: "Sesi diperlukan" }, { status: 401 });
    }
    return NextResponse.json(await kreditClientView(identity));
  } catch (err) {
    const message = err instanceof Error ? err.message : "ledger unavailable";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
