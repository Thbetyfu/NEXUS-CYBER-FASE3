import { NextRequest, NextResponse } from "next/server";
import { approveTopupRequest } from "@/lib/kredit-ledger";
import { isOperatorRequest } from "@/lib/operator-gate";

export async function POST(request: NextRequest) {
  if (!isOperatorRequest(request)) {
    return NextResponse.json(
      { ok: false, error: "Approve hanya loopback atau header operator" },
      { status: 403 },
    );
  }

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
    const result = await approveTopupRequest(id);
    return NextResponse.json({
      ok: true,
      credited: true,
      id: result.id,
      amountKr: result.amountKr,
      status: result.status,
      balance: result.balance,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "approve failed";
    const status = message.includes("tidak ditemukan") ? 404 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
