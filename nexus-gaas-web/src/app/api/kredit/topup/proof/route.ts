import { NextRequest, NextResponse } from "next/server";
import { kreditClientView } from "@/lib/kredit-public";
import { submitTopupProof } from "@/lib/kredit-topup";
import { lookupIdentity, readSidFromRequest } from "@/lib/portal-identity";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(request: NextRequest) {
  try {
    const identity = await lookupIdentity(readSidFromRequest(request));
    if (!identity) {
      return NextResponse.json({ ok: false, error: "Sesi diperlukan" }, { status: 401 });
    }
    const form = await request.formData();
    const id = String(form.get("id") ?? form.get("topupId") ?? "");
    const notes = String(form.get("notes") ?? form.get("note") ?? "");
    const blob = form.get("file");
    let file: { buffer: Buffer; mime: string } | null = null;
    if (blob && typeof blob !== "string" && blob.size > 0) {
      const mime = blob.type || "";
      if (!ALLOWED.has(mime)) {
        return NextResponse.json({ ok: false, error: "Unggah JPG, PNG, WebP, atau GIF" }, { status: 400 });
      }
      file = { buffer: Buffer.from(await blob.arrayBuffer()), mime };
    }
    await submitTopupProof(id, identity.walletId, notes, file);
    const view = await kreditClientView(identity);
    return NextResponse.json({ ...view, credited: false });
  } catch (err) {
    if (err instanceof RangeError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "proof failed";
    const status = message.includes("tidak ditemukan") || message.includes("tidak valid") ? 404 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
