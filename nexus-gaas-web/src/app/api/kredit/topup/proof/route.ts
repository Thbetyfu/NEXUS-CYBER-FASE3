import { NextRequest, NextResponse } from "next/server";
import { ProofValidationError, submitTopupProofMail } from "@/lib/kredit-topup";
import { kreditClientView } from "@/lib/kredit-public";
import { lookupIdentity, readSidFromRequest } from "@/lib/portal-identity";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const identity = await lookupIdentity(readSidFromRequest(request));
    if (!identity) {
      return NextResponse.json({ ok: false, error: "Sesi diperlukan" }, { status: 401 });
    }
    const form = await request.formData();
    const topupId = String(form.get("topupId") ?? form.get("id") ?? "");
    const note = String(form.get("note") ?? form.get("notes") ?? "");
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ ok: false, error: "Unggah berkas bukti" }, { status: 400 });
    }
    const result = await submitTopupProofMail({
      topupId,
      walletId: identity.walletId,
      identity: { kind: identity.kind, orderCode: identity.orderCode, email: identity.email ?? null },
      note,
      originalName: file.name,
      bytes: new Uint8Array(await file.arrayBuffer()),
    });
    const view = await kreditClientView(identity);
    return NextResponse.json({
      ...view,
      stored: true,
      emailed: result.emailed,
      credited: false,
      proofMessage: result.emailed
        ? "Bukti terkirim ke email operator. Kredit belum masuk sampai approve."
        : result.emailError,
    });
  } catch (err) {
    if (err instanceof ProofValidationError || err instanceof RangeError) {
      return NextResponse.json({ ok: false, error: err.message, credited: false }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "bukti gagal";
    const status = message.includes("tidak ditemukan") ? 404 : 500;
    return NextResponse.json({ ok: false, error: message, credited: false }, { status });
  }
}
