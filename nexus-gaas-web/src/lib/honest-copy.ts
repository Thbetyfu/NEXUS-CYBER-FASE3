/** Investor / portal copy: Starter, Edge Shield tepi, and Job/Loop are three SKUs. */

export const SKU_SEPARATION_LINE =
  "Starter ≠ Edge Shield (--tier tepi) ≠ Loop.";

export const NO_MASS_WAF_CLAIM = "Jangan klaim 100 UMKM di belakang WAF.";

export const HONEST_SKU_DISCLAIMER = `${SKU_SEPARATION_LINE} ${NO_MASS_WAF_CLAIM}`;

export const PORTFOLIO_HOST_STAYS =
  "Default PROTECTED_HOST = portfolio.nexus-lab.test tetap. Upsell --tier tepi menambah slug ke nexus-host-map.json, bukan overlay PROTECTED_HOST.";

export const OPERATOR_TEPI_PATH = "/operator/tepi";

const SLUG_SAFE = /^[a-z0-9-]{1,48}$/;

export function sanitizeLabSlug(raw: string): string {
  return raw.trim().toLowerCase();
}

export function tepiEnableCli(slug: string): string {
  const safe = sanitizeLabSlug(slug);
  const token = SLUG_SAFE.test(safe) ? safe : "SLUG";
  return `python cli.py upsell enable --slug ${token} --tier tepi`;
}

export const FAQ_NO_MASS_WAF = {
  q: "Apakah semua warung Channel Starter sudah di belakang WAF?",
  a: `${HONEST_SKU_DISCLAIMER} ${PORTFOLIO_HOST_STAYS} Generate Starter 20 Kr tidak auto-join WAF. Naked *.vercel.app bukan “Nexus protected”. Job/Loop = Cowork (bukan 20 Kr, bukan tepi-only).`,
} as const;
