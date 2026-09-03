/** Investor / portal copy: Starter, Edge Shield tepi, and Job/Loop are three SKUs. */

export const SKU_SEPARATION_LINE =
  "Starter ≠ Edge Shield (--tier tepi) ≠ Loop.";

export const NO_MASS_WAF_CLAIM = "Jangan klaim 100 UMKM di belakang WAF.";

export const HONEST_SKU_DISCLAIMER = `${SKU_SEPARATION_LINE} ${NO_MASS_WAF_CLAIM}`;

export const FAQ_NO_MASS_WAF = {
  q: "Apakah semua warung Channel Starter sudah di belakang WAF?",
  a: `${HONEST_SKU_DISCLAIMER} Satu PROTECTED_HOST per instance lab (default tanpa upsell: portfolio.nexus-lab.test). Bukan WAF otomatis setiap slug. Naked *.vercel.app bukan “Nexus protected”. Job/Loop tetap paket Cowork.`,
} as const;
