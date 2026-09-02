import { NextResponse } from "next/server";
import { pingLocalLlm } from "@/lib/local-llm";
import { clientKey, rateLimitAllow } from "@/lib/rate-limit";

export async function GET(request: Request) {
  if (!rateLimitAllow(`local-llm-health:${clientKey(request)}`, 30, 60_000)) {
    return NextResponse.json(
      { ok: false, ready: false, message: "Terlalu banyak permintaan. Coba lagi nanti." },
      { status: 429 },
    );
  }

  const { status, body } = await pingLocalLlm();
  return NextResponse.json(body, { status });
}
