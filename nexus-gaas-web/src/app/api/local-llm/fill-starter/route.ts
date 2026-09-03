import { NextRequest, NextResponse } from "next/server";
import { handleFillStarterHttp } from "@/lib/local-llm-fill";
import { lookupIdentity, readSidFromRequest } from "@/lib/portal-identity";
import { clientKey, rateLimitAllow } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const identity = await lookupIdentity(readSidFromRequest(request));
  if (!identity) {
    const { status, body } = await handleFillStarterHttp({
      identity: null,
      rateLimited: false,
      raw: null,
    });
    return NextResponse.json(body, { status });
  }

  if (!rateLimitAllow(`local-llm-fill:${clientKey(request)}`, 12, 60_000)) {
    const { status, body } = await handleFillStarterHttp({
      identity,
      rateLimited: true,
      raw: null,
    });
    return NextResponse.json(body, { status });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    raw = null;
  }

  const { status, body } = await handleFillStarterHttp({
    identity,
    rateLimited: false,
    raw,
  });
  return NextResponse.json(body, { status });
}
