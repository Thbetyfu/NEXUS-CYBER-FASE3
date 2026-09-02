import { NextRequest, NextResponse } from "next/server";
import { cancelTopupRequest } from "@/lib/kredit-topup";
import { kreditClientView } from "@/lib/kredit-public";
import { lookupIdentity, readSidFromRequest } from "@/lib/portal-identity";

export async function POST(request: NextRequest) {
  let id = "";
  try {
    const body = (await request.json()) as { id?: string };
    id = typeof body.id === "string" ? body.id : "";
  } catch {
    id = "";
  }
  if (!id.trim()) {
    return NextResponse.json({ ok: false, error: "id permintaan wajib" }, { status: 400 });
  }

  try {
    const identity = await lookupIdentity(readSidFromRequest(request));
    if (!identity) {
      return NextResponse.json({ ok: false, error: "Sesi diperlukan" }, { status: 401 });
    }
    await cancelTopupRequest(id, identity.walletId);
    return NextResponse.json(await kreditClientView(identity));
  } catch (err) {
    if (err instanceof RangeError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "batal gagal";
    const status = message.includes("tidak ditemukan") ? 404 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
