/** Public Channel Starter proxy: GET wizard UI + GET preview only.

Next.js rewrites apply to every HTTP method. A catch-all `/starter/:path*`
would forward POST /starter/generate, POST publish/upsell, and GET /sites
to FastAPI :3010 without Kredit debit. Mutations stay on portal APIs.
*/

export type StarterPublicRewrite = {
  source: string;
  destination: string;
};

export function isCatchAllStarterRewrite(source: string): boolean {
  return source === "/starter/:path*" || source === "/starter/:path+";
}

export function channelStarterPublicRewrites(internalOrigin: string): StarterPublicRewrite[] {
  const dest = internalOrigin.replace(/\/+$/, "");
  return [
    { source: "/starter", destination: `${dest}/` },
    { source: "/starter/preview", destination: `${dest}/preview` },
    { source: "/starter/preview/:path*", destination: `${dest}/preview/:path*` },
  ];
}
