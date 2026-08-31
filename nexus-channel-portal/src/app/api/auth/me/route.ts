import { NextRequest, NextResponse } from "next/server";
import { applySidCookie, lookupIdentity, publicIdentity, readSidFromRequest } from "@/lib/portal-identity";

export async function GET(request: NextRequest) {
  try {
    const identity = await lookupIdentity(readSidFromRequest(request));
    return NextResponse.json({ ok: true, ...publicIdentity(identity) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "session unavailable";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
