import { NextRequest, NextResponse } from "next/server";
import { isOperatorRequest } from "@/lib/operator-gate";
import { listOperatorQueue } from "@/lib/kredit-topup";

export async function GET(request: NextRequest) {
  if (!isOperatorRequest(request)) {
    return NextResponse.json({ ok: false, error: "Hanya loopback atau header operator" }, { status: 403 });
  }
  const items = await listOperatorQueue();
  return NextResponse.json({ ok: true, items });
}
