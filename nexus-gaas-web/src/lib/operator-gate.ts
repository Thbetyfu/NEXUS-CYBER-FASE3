import type { NextRequest } from "next/server";

/** Approve Kredit: loopback Host, or header matching NEXUS_OPERATOR_SECRET. Not the public Isi button. */
export function isOperatorRequest(request: NextRequest): boolean {
  const secret = process.env.NEXUS_OPERATOR_SECRET?.trim();
  const given = request.headers.get("x-nexus-operator-secret")?.trim();
  if (secret && given && given === secret) {
    return true;
  }
  return isLoopbackHost(request);
}

export function isLoopbackHost(request: NextRequest): boolean {
  return isLoopbackFromParts(request.headers.get("host") ?? "", request.headers.get("x-forwarded-for"));
}

export function isLoopbackFromParts(hostHeader: string, forwardedFor: string | null): boolean {
  const hostname = hostHeader.replace(/^\[/, "").replace(/\]:\d+$/, "").replace(/:\d+$/, "").toLowerCase();
  const loopbackHost = hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1";
  if (!loopbackHost) {
    return false;
  }
  const xff = forwardedFor?.split(",")[0]?.trim();
  if (!xff) {
    return true;
  }
  return xff === "127.0.0.1" || xff === "::1" || xff === ":ffff:127.0.0.1";
}
