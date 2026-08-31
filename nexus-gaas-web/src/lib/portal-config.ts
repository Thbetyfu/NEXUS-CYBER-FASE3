/** Nexus Channel Portal — konfigurasi jual & onboarding */

export const BRAND = {
  name: "Nexus Cyber",
  tagline: "Channel Starter + Edge Antibody Cowork",
  subdomainBase: "nexus.id",
} as const;

/** Alias impor lama */
export const BRAND_LEGACY = BRAND;

export const SALES = {
  whatsapp: "62895603358692",
  waMessage: "Saya mau beli Nexus Cyber!!",
  starterPrice: 20_000,
  currency: "IDR",
} as const;

/** Kasir self-serve (Kredit). Bukan WhatsApp. */
export const PORTAL_ORDER = "/order";
export const PORTAL_DAFTAR = "/daftar";
export const PORTAL_MASUK = "/masuk";

export function isWhatsAppHref(href: string): boolean {
  return href.startsWith("https://wa.me/");
}

export function whatsappUrl(message?: string): string {
  const text = encodeURIComponent(message ?? SALES.waMessage);
  return `https://wa.me/${SALES.whatsapp}?text=${text}`;
}

export function whatsappPackageUrl(packageName: string): string {
  return whatsappUrl(`Saya mau beli Nexus Cyber — paket ${packageName}`);
}

/** CTA khusus Cowork B2B */
export function whatsappCoworkUrl(message?: string): string {
  const defaultMsg =
    "Saya tertarik Edge Antibody Cowork B2B — mau diskusi Job Cowork / Loop GaaS untuk kanal digital kami.";
  return whatsappUrl(message ?? defaultMsg);
}

/** CTA khusus Pemerintah on-prem */
export function whatsappPemerintahUrl(message?: string): string {
  const defaultMsg =
    "Saya tertarik paket Pemerintah on-prem Nexus Cyber — lisensi Edge + Loop wajib (bukan paket UMKM). Mau diskusi scope DC.";
  return whatsappUrl(message ?? defaultMsg);
}

/** Alias lama */
export function whatsappB2GUrl(message?: string): string {
  return whatsappPemerintahUrl(message);
}

export const CHANNEL_STARTER_API =
  process.env.NEXT_PUBLIC_CHANNEL_STARTER_URL ?? "http://127.0.0.1:3010";
