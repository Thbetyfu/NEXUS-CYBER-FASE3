import { NextRequest, NextResponse } from "next/server";
import { applySidCookie, continueAsGuest, publicIdentity } from "@/lib/portal-identity";

export async function POST(request: NextRequest) {
  try {
    const { identity, issuedSid } = await continueAsGuest(request);
    const response = NextResponse.json({ ok: true, ...publicIdentity(identity) });
    if (issuedSid) {
      applySidCookie(response, issuedSid);
    }
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "guest session failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
