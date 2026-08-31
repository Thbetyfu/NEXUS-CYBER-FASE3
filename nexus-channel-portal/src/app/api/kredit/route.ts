import { NextResponse } from "next/server";
import { getKreditSnapshot } from "@/lib/kredit-ledger";

export async function GET() {
  try {
    const snapshot = await getKreditSnapshot();
    return NextResponse.json({ ok: true, ...snapshot });
  } catch (err) {
    const message = err instanceof Error ? err.message : "ledger unavailable";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
