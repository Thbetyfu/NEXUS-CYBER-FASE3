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

export type LoopbackHints = {
  forwardedHost?: string | null;
  cfConnectingIp?: string | null;
};

function hostnameFromHostHeader(hostHeader: string): string {
  return hostHeader.replace(/^\[/, "").replace(/\]:\d+$/, "").replace(/:\d+$/, "").toLowerCase();
}

function hostnameIsLoopback(hostname: string): boolean {
  return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1";
}

/** Next.js 16 proxy sets X-Forwarded-For to IPv4-mapped loopback (`::ffff:127.0.0.1`). */
function ipIsLoopback(ip: string): boolean {
  const v = ip.trim().toLowerCase();
  return (
    v === "127.0.0.1" ||
    v === "::1" ||
    v === "0:0:0:0:0:0:0:1" ||
    v === "::ffff:127.0.0.1" ||
    v === ":ffff:127.0.0.1"
  );
}

export function isLoopbackHost(request: NextRequest): boolean {
  return isLoopbackFromParts(request.headers.get("host") ?? "", request.headers.get("x-forwarded-for"), {
    forwardedHost: request.headers.get("x-forwarded-host"),
    cfConnectingIp: request.headers.get("cf-connecting-ip"),
  });
}

/** Same check for Server Components (`headers()`). */
export function isLoopbackFromHeaders(h: { get(name: string): string | null }): boolean {
  return isLoopbackFromParts(h.get("host") ?? "", h.get("x-forwarded-for"), {
    forwardedHost: h.get("x-forwarded-host"),
    cfConnectingIp: h.get("cf-connecting-ip"),
  });
}

export function isLoopbackFromParts(
  hostHeader: string,
  forwardedFor: string | null,
  hints?: LoopbackHints,
): boolean {
  const cfIp = hints?.cfConnectingIp?.trim();
  if (cfIp && !ipIsLoopback(cfIp)) {
    return false;
  }
  const forwardedHost = hints?.forwardedHost?.trim();
  if (forwardedHost && !hostnameIsLoopback(hostnameFromHostHeader(forwardedHost))) {
    return false;
  }
  const hostname = hostnameFromHostHeader(hostHeader);
  if (!hostnameIsLoopback(hostname)) {
    return false;
  }
  const xff = forwardedFor?.split(",")[0]?.trim();
  if (!xff) {
    return true;
  }
  return ipIsLoopback(xff);
}
