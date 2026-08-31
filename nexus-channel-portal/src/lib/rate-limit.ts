type Bucket = { at: number[] };

const windows = new Map<string, Bucket>();

/** In-memory lab limiter. Not shared across Node processes. */
export function rateLimitAllow(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = windows.get(key) ?? { at: [] };
  bucket.at = bucket.at.filter((t) => now - t < windowMs);
  if (bucket.at.length >= max) {
    windows.set(key, bucket);
    return false;
  }
  bucket.at.push(now);
  windows.set(key, bucket);
  return true;
}

export function clientKey(request: { headers: Headers }): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip")?.trim() || "local";
}
