/** Hosted storefront vs operator PC. Vercel is copy-only. */

export function isVercelRuntime(env: NodeJS.Dict<string | undefined> = process.env): boolean {
  const vercel = env.VERCEL?.trim().toLowerCase();
  return vercel === "1" || vercel === "true";
}
