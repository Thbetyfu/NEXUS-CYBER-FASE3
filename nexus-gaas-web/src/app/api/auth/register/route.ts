import { NextRequest, NextResponse } from "next/server";
import { wizardReassignGuestSites } from "@/lib/channel-starter-owned";
import { migrateGuestLedgerUnlocked } from "@/lib/kredit-ledger";
import { applySidCookie, AuthError, publicIdentity, registerAccount } from "@/lib/portal-identity";
import { clientKey, rateLimitAllow } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  if (!rateLimitAllow(`register:${clientKey(request)}`, 8, 15 * 60 * 1000)) {
    return NextResponse.json({ ok: false, error: "Terlalu banyak percobaan. Tunggu sebentar." }, { status: 429 });
  }

  let email = "";
  let password = "";
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    email = typeof body.email === "string" ? body.email : "";
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ ok: false, error: "Body JSON wajib" }, { status: 400 });
  }

  try {
    const { identity, issuedSid, migratedGuestId } = await registerAccount(
      email,
      password,
      request,
      migrateGuestLedgerUnlocked,
    );
    if (migratedGuestId && identity.accountId) {
      await wizardReassignGuestSites(migratedGuestId, identity.accountId, identity.email || email);
    }
    const response = NextResponse.json({ ok: true, ...publicIdentity(identity) });
    applySidCookie(response, issuedSid);
    return response;
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "register failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
