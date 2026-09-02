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
export const PORTAL_ORDER = "/pesan/umkm-starter";
export const PORTAL_DAFTAR = "/daftar";
export const PORTAL_MASUK = "/masuk";

/** Digits for wa.me; local 08… and +62 display. Override via env is handled server-side. */
export function formatWhatsAppNumber(raw: string = SALES.whatsapp): {
  digits: string;
  local: string;
  intl: string;
} {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0")) {
    digits = `62${digits.slice(1)}`;
  }
  if (!digits.startsWith("62")) {
    digits = `62${digits}`;
  }
  const rest = digits.slice(2);
  const grouped =
    rest.length > 7 ? `${rest.slice(0, 3)} ${rest.slice(3, 7)} ${rest.slice(7)}` : rest;
  return {
    digits,
    local: `0${grouped}`,
    intl: `+62 ${grouped}`,
  };
}

export function topupWhatsAppMessage(opts: {
  id: string;
  amountKr: number;
  orderCode?: string | null;
}): string {
  return `${opts.id} ${opts.amountKr} Kr`;
}

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
