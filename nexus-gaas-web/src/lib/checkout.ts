/** Kasir per paket — bukan dump /order, bukan WhatsApp (kecuali on-prem). */

export type CheckoutKind = "starter" | "tepi" | "request";

export type CheckoutPackage = {
  sku: string;
  kind: CheckoutKind;
  title: string;
  segmentHref: string;
  /** Setara IDR (1 Kr = Rp 1000). Null = custom. */
  priceKr: number | null;
  /** Hanya Starter website: debit ledger + generate. */
  debitStarter: boolean;
  summary: string;
};

export const DEFAULT_STARTER_SKU = "umkm-starter";

export const CHECKOUT_PACKAGES: Record<string, CheckoutPackage> = {
  "umkm-starter": {
    sku: "umkm-starter",
    kind: "starter",
    title: "Website Starter UMKM",
    segmentHref: "/umkm",
    priceKr: 20,
    debitStarter: true,
    summary:
      "Isi data usaha → keran Kredit lab jika saldo kurang → debit 20 Kr → generate site. Bukan WhatsApp. Bukan Job Cowork.",
  },
  "umkm-tepi-belum": {
    sku: "umkm-tepi-belum",
    kind: "tepi",
    title: "UMKM Edge Shield (new site)",
    segmentHref: "/umkm",
    priceKr: 35,
    debitStarter: false,
    summary:
      "Form 1 host lab. Bukan debit Starter 20 Kr, bukan generate otomatis, bukan Job/Loop. Operator pasang --tier tepi.",
  },
  "umkm-pagar": {
    sku: "umkm-pagar",
    kind: "request",
    title: "UMKM Header Shield",
    segmentHref: "/umkm",
    priceKr: 15,
    debitStarter: false,
    summary: "Host sudah ada — header tepi saja. Bukan Reflex, bukan generate site baru, bukan Job.",
  },
  "umkm-tepi-sudah": {
    sku: "umkm-tepi-sudah",
    kind: "tepi",
    title: "UMKM Edge Shield (existing host)",
    segmentHref: "/umkm",
    priceKr: 28,
    debitStarter: false,
    summary: "Reflex 1 host lab pada site yang sudah jalan. Bukan debit 20 Kr, bukan Job.",
  },
  "sekolah-starter": {
    sku: "sekolah-starter",
    kind: "starter",
    title: "Website Sekolah",
    segmentHref: "/sekolah",
    priceKr: 20,
    debitStarter: true,
    summary: "Sama mesin Starter: form → 20 Kr → generate. Bukan WhatsApp. Bukan Job.",
  },
  "sekolah-tepi-belum": {
    sku: "sekolah-tepi-belum",
    kind: "tepi",
    title: "School Edge Shield (new profile)",
    segmentHref: "/sekolah",
    priceKr: 35,
    debitStarter: false,
    summary: "1 host lab, bukan debit Starter, bukan Job.",
  },
  "sekolah-pagar": {
    sku: "sekolah-pagar",
    kind: "request",
    title: "School Header Shield",
    segmentHref: "/sekolah",
    priceKr: 15,
    debitStarter: false,
    summary: "Header tepi pada host sekolah yang sudah ada.",
  },
  "sekolah-tepi-sudah": {
    sku: "sekolah-tepi-sudah",
    kind: "tepi",
    title: "School Edge Shield (existing host)",
    segmentHref: "/sekolah",
    priceKr: 28,
    debitStarter: false,
    summary: "Reflex 1 host lab. Bukan Job.",
  },
  "startup-landing": {
    sku: "startup-landing",
    kind: "starter",
    title: "Landing + Header Shield",
    segmentHref: "/startup",
    priceKr: 45,
    debitStarter: true,
    summary:
      "Lab memakai mesin generate Starter (debit 20 Kr fail-closed). Harga daftar 45 Kr setara Rp 45.000 — top-up IDR belum. Bukan Job.",
  },
  "startup-tepi-belum": {
    sku: "startup-tepi-belum",
    kind: "tepi",
    title: "Landing + Edge Shield (Alur A)",
    segmentHref: "/startup",
    priceKr: 75,
    debitStarter: false,
    summary: "1 host lab Reflex. Bukan Job, bukan alert Telegram pelanggan, bukan debit 20 Kr sebagai Loop.",
  },
  "startup-job": {
    sku: "startup-job",
    kind: "request",
    title: "Job Wasit (on-demand)",
    segmentHref: "/startup",
    priceKr: 200,
    debitStarter: false,
    summary: "Operator menjalankan Job. Bukan 200 Kr self-serve di kasir Starter. Bukan WhatsApp. Bukan Midtrans.",
  },
  "startup-tepi-sudah": {
    sku: "startup-tepi-sudah",
    kind: "tepi",
    title: "Startup Edge Shield",
    segmentHref: "/startup",
    priceKr: 75,
    debitStarter: false,
    summary: "Alur A Reflex, 1 host lab. Bukan Job.",
  },
  "startup-loop": {
    sku: "startup-loop",
    kind: "request",
    title: "Loop Startup",
    segmentHref: "/startup",
    priceKr: 300,
    debitStarter: false,
    summary: "Retainership operator, bukan Loop otomatis di 20 Kr.",
  },
  "corporat-job": {
    sku: "corporat-job",
    kind: "request",
    title: "Job Cowork (hosted)",
    segmentHref: "/corporat",
    priceKr: 200,
    debitStarter: false,
    summary: "Ajukan ke operator. Bukan WhatsApp. Bukan debit 200 Kr otomatis dari kasir Starter.",
  },
  "corporat-loop": {
    sku: "corporat-loop",
    kind: "request",
    title: "Loop GaaS (hosted)",
    segmentHref: "/corporat",
    priceKr: 300,
    debitStarter: false,
    summary: "Retainership 1 host — operator, bukan self-serve Starter.",
  },
  "corporat-custom": {
    sku: "corporat-custom",
    kind: "request",
    title: "Custom / multi-host (hosted)",
    segmentHref: "/corporat",
    priceKr: null,
    debitStarter: false,
    summary: "Scope kontrak. Bukan WhatsApp (hosted). On-prem = pintu WhatsApp terpisah.",
  },
};

export function getCheckout(sku: string): CheckoutPackage | null {
  return CHECKOUT_PACKAGES[sku] ?? null;
}

export function checkoutHref(sku: string): string {
  return `/pesan/${sku}`;
}

export function checkoutCtaLabel(kind: CheckoutKind, debitStarter: boolean): string {
  if (kind === "starter" || debitStarter) return "Isi form & bayar Kredit";
  if (kind === "tepi") return "Isi form Edge Shield";
  return "Ajukan ke operator";
}

export function priceKrLabel(priceKr: number | null): string {
  if (priceKr == null) return "Custom";
  return `${priceKr} Kr`;
}

export function priceIdrSub(priceKr: number | null, extra = ""): string {
  if (priceKr == null) return extra || "diskusi portal";
  const idr = (priceKr * 1000).toLocaleString("id-ID");
  return extra ? `setara Rp ${idr}${extra}` : `setara Rp ${idr}`;
}
