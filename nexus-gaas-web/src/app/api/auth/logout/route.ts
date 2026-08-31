import { NextRequest, NextResponse } from "next/server";
import { clearSidCookie, logoutSession } from "@/lib/portal-identity";

export async function POST(request: NextRequest) {
  try {
    await logoutSession(request);
    const response = NextResponse.json({ ok: true, kind: null, orderCode: null, email: null });
    clearSidCookie(response);
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "logout failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
