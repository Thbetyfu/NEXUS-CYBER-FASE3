import { NextRequest, NextResponse } from "next/server";
import { isOperatorRequest } from "@/lib/operator-gate";
import { readTopupProofFile } from "@/lib/kredit-topup";

export async function GET(request: NextRequest) {
  if (!isOperatorRequest(request)) {
    return NextResponse.json({ ok: false, error: "Hanya loopback atau header operator" }, { status: 403 });
  }
  const id = request.nextUrl.searchParams.get("id") ?? "";
  try {
    const file = await readTopupProofFile(id);
    if (!file) {
      return NextResponse.json({ ok: false, error: "Berkas bukti tidak ada" }, { status: 404 });
    }
    return new NextResponse(new Uint8Array(file.bytes), {
      headers: {
        "Content-Type": file.mime,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "proof file failed";
    const status = message.includes("tidak valid") ? 400 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
