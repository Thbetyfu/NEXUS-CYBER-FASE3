import { NextRequest, NextResponse } from "next/server";
import { safeInternalNext } from "@/lib/gate-next";
import { isLoopbackHost } from "@/lib/operator-gate";

const COOKIE_SID = "nexus_portal_sid";

const PUBLIC_PATHS = new Set(["/gate", "/masuk", "/daftar"]);

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname);
}

function hasSessionCookie(request: NextRequest): boolean {
  const raw = request.cookies.get(COOKIE_SID)?.value?.trim() ?? "";
  return raw.length > 0;
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const nextTarget = `${pathname}${search}`;
  const session = hasSessionCookie(request);

  if (pathname.startsWith("/operator")) {
    if (!isLoopbackHost(request)) {
      return new NextResponse(null, { status: 404 });
    }
    return NextResponse.next();
  }

  if (pathname === "/gate" && session) {
    const dest = safeInternalNext(request.nextUrl.searchParams.get("next"));
    return NextResponse.redirect(new URL(dest, request.url));
  }

  if (isPublicPath(pathname) || session) {
    return NextResponse.next();
  }

  const gate = new URL("/gate", request.url);
  gate.searchParams.set("next", nextTarget === "/gate" ? "/" : nextTarget);
  return NextResponse.redirect(gate);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|brand/).*)"],
};
