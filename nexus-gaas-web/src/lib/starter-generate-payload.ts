/** Channel Starter generate fields — rule-based, no LLM. */

export const STARTER_CATEGORIES = ["fnb", "jasa", "profil"] as const;
export type StarterCategory = (typeof STARTER_CATEGORIES)[number];

export const DEFAULT_STARTER_THEME = "hijau";

export type CategoryCopy = {
  tagline: string;
  description: string;
  headline: string;
  headline_accent: string;
  about_title: string;
  about_body: string;
  extra_title: string;
  extra_body: string;
  hours: string;
  cta_label: string;
  quote: string;
  quote_name: string;
  quote_role: string;
  partners: string;
};

/** Mirror nexus-core/channel-starter/channel_starter/presets.py — empty story uses these. */
export const CATEGORY_COPY: Record<StarterCategory, CategoryCopy> = {
  fnb: {
    tagline: "Rasa lokal, pelayanan ramah — pesan hari ini via WhatsApp.",
    description:
      "Menu harian, camilan favorit, dan porsi keluarga. Pesan lewat WhatsApp untuk takeaway, delivery lokal, atau tanya stok hari ini.",
    headline: "Menu harian yang bikin",
    headline_accent: "langganan pulang",
    about_title: "Dapur rumahan, standar ramah tetangga",
    about_body:
      "Kami masak setiap hari dengan bahan segar. Tidak ada keranjang online yang ribet — cukup chat, konfirmasi menu, dan ambil atau antar sesuai janji.",
    extra_title: "Jam buka & cara pesan",
    extra_body:
      "Chat WhatsApp sebelum datang agar stok dipastikan. Bisa porsi harian, paket keluarga, atau pesanan acara kecil. Alamat dan jam operasional tercantum di footer.",
    hours: "Setiap hari 09.00–21.00 WIB",
    cta_label: "Pesan via WhatsApp",
    quote:
      "Langganan nasi uduk di sini karena rasanya konsisten dan chat-nya cepat. Cocok buat yang tidak mau ribet buka aplikasi ojek.",
    quote_name: "Pelanggan tetap",
    quote_role: "Langganan minggu ini",
    partners: "Pasar pagi, Petani lokal, Komunitas RT",
  },
  jasa: {
    tagline: "Solusi praktis, harga transparan, respon via WhatsApp.",
    description:
      "Layanan profesional untuk kebutuhan harian dan usaha kecil. Jadwal, ruang lingkup, dan harga dibicarakan dulu di chat — baru dikerjakan.",
    headline: "Layanan rapi yang",
    headline_accent: "bisa diandalkan",
    about_title: "Satu chat, ruang lingkup jelas",
    about_body:
      "Kami tidak menjanjikan keajaiban. Yang kami jaga: datang tepat waktu, kerja sesuai kesepakatan, dan konfirmasi jika ada biaya tambahan sebelum dikerjakan.",
    extra_title: "Area & jadwal",
    extra_body:
      "Wilayah layanan mengikuti alamat di footer. Slot hari ini atau minggu ini bisa ditanya langsung. Foto sebelum-sesudah bisa dilampirkan di galeri.",
    hours: "Senin–Sabtu 08.00–17.00 WIB",
    cta_label: "Konsultasi WhatsApp",
    quote:
      "Harganya tidak mengambang di tengah jalan. Setelah sepakat di chat, hasilnya sesuai yang dibicarakan.",
    quote_name: "Klien rumahan",
    quote_role: "Pesanan jasa",
    partners: "Toko bahan, Bengkel rekanan, Komunitas usaha",
  },
  profil: {
    tagline: "UMKM lokal — percaya, dekat, responsif.",
    description:
      "Profil usaha kami: produk dan layanan untuk tetangga dan pelanggan setia. Hubungi kami untuk katalog, jam buka, atau kerja sama kecil.",
    headline: "Usaha lokal yang",
    headline_accent: "siap dihubungi",
    about_title: "Cerita singkat di balik nama ini",
    about_body:
      "Kami membangun usaha pelan-pelan: produk yang kami pakai sendiri, layanan yang kami mau terima sebagai pelanggan, dan saluran chat yang benar-benar dibalas.",
    extra_title: "Cara berkenalan",
    extra_body:
      "Isi alamat, jam, dan galeri di form agar halaman ini jadi kartu nama yang lengkap. Tombol hijau mengarah langsung ke WhatsApp usaha Anda.",
    hours: "Senin–Jumat 09.00–17.00 WIB",
    cta_label: "Hubungi kami",
    quote: "Website-nya langsung ke chat. Tidak perlu isi form panjang hanya untuk tanya harga.",
    quote_name: "Pelanggan pertama",
    quote_role: "Tetangga & langganan",
    partners: "Komunitas UMKM, Pasar lokal, Rekan distribusi",
  },
};

export type StarterGenerateExtras = {
  address: string;
  email: string;
  hours: string;
  instagram: string;
  theme: string;
  headline: string;
  headline_accent: string;
  tagline: string;
  description: string;
  about_title: string;
  about_body: string;
  extra_title: string;
  extra_body: string;
  cta_label: string;
  offering_1_title: string;
  offering_1_body: string;
  offering_2_title: string;
  offering_2_body: string;
  offering_3_title: string;
  offering_3_body: string;
  stat_1_number: string;
  stat_1_label: string;
  stat_2_number: string;
  stat_2_label: string;
  stat_3_number: string;
  stat_3_label: string;
  stat_4_number: string;
  stat_4_label: string;
  logo_url: string;
  hero_image_url: string;
  gallery_1_url: string;
  gallery_1_title: string;
  gallery_1_caption: string;
  gallery_2_url: string;
  gallery_2_title: string;
  gallery_2_caption: string;
  gallery_3_url: string;
  gallery_3_title: string;
  gallery_3_caption: string;
  quote: string;
  quote_name: string;
  quote_role: string;
  partners: string;
  custom_domain: string;
};

export const EMPTY_STARTER_EXTRAS: StarterGenerateExtras = {
  address: "",
  email: "",
  hours: "",
  instagram: "",
  theme: DEFAULT_STARTER_THEME,
  headline: "",
  headline_accent: "",
  tagline: "",
  description: "",
  about_title: "",
  about_body: "",
  extra_title: "",
  extra_body: "",
  cta_label: "",
  offering_1_title: "",
  offering_1_body: "",
  offering_2_title: "",
  offering_2_body: "",
  offering_3_title: "",
  offering_3_body: "",
  stat_1_number: "",
  stat_1_label: "",
  stat_2_number: "",
  stat_2_label: "",
  stat_3_number: "",
  stat_3_label: "",
  stat_4_number: "",
  stat_4_label: "",
  logo_url: "",
  hero_image_url: "",
  gallery_1_url: "",
  gallery_1_title: "",
  gallery_1_caption: "",
  gallery_2_url: "",
  gallery_2_title: "",
  gallery_2_caption: "",
  gallery_3_url: "",
  gallery_3_title: "",
  gallery_3_caption: "",
  quote: "",
  quote_name: "",
  quote_role: "",
  partners: "",
  custom_domain: "",
};

export function normalizeStarterCategory(value: string): StarterCategory {
  return STARTER_CATEGORIES.includes(value as StarterCategory) ? (value as StarterCategory) : "profil";
}

export function splitStorySentences(story: string): string[] {
  const text = story.trim().replace(/\s+/g, " ");
  if (!text) return [];
  const parts = text.match(/[^.!?…]+[.!?…]*/g);
  if (!parts) return [text];
  return parts.map((part) => part.trim()).filter(Boolean);
}

function heroFromFirstSentence(first: string, fallback: CategoryCopy): Pick<CategoryCopy, "headline" | "headline_accent"> {
  const words = first.replace(/[.!?…]+$/g, "").split(/\s+/).filter(Boolean);
  if (words.length < 4) {
    return { headline: words.join(" ") || fallback.headline, headline_accent: fallback.headline_accent };
  }
  const at = Math.ceil(words.length / 2);
  return { headline: words.slice(0, at).join(" "), headline_accent: words.slice(at).join(" ") };
}

/** Story → hero / about / tagline. Empty story → category defaults. No LLM. */
export function fillStarterCopy(category: StarterCategory, story: string): CategoryCopy {
  const base = CATEGORY_COPY[normalizeStarterCategory(category)];
  const sentences = splitStorySentences(story);
  if (sentences.length === 0) {
    return { ...base };
  }
  const first = sentences[0];
  const rest = sentences.slice(1).join(" ");
  const hero = heroFromFirstSentence(first, base);
  return {
    ...base,
    tagline: first.slice(0, 160),
    description: story.trim(),
    headline: hero.headline,
    headline_accent: hero.headline_accent,
    about_body: rest || story.trim(),
  };
}

function filled(value: string | undefined, fallback: string): string {
  const text = (value ?? "").trim();
  return text || fallback;
}

export type StarterGenerateInput = {
  businessName: string;
  category: string;
  whatsapp: string;
  story?: string;
  extras?: Partial<StarterGenerateExtras>;
};

/** Flat form keys accepted by Channel Starter POST /generate. */
export function buildStarterGeneratePairs(input: StarterGenerateInput): [string, string][] {
  const category = normalizeStarterCategory(input.category);
  const copy = fillStarterCopy(category, input.story ?? "");
  const extras = input.extras ?? {};
  const theme = filled(extras.theme, DEFAULT_STARTER_THEME);

  return [
    ["business_name", input.businessName.trim()],
    ["category", category],
    ["whatsapp", input.whatsapp.trim()],
    ["address", (extras.address ?? "").trim()],
    ["email", (extras.email ?? "").trim()],
    ["hours", filled(extras.hours, copy.hours)],
    ["instagram", (extras.instagram ?? "").trim()],
    ["theme", theme],
    ["headline", filled(extras.headline, copy.headline)],
    ["headline_accent", filled(extras.headline_accent, copy.headline_accent)],
    ["tagline", filled(extras.tagline, copy.tagline)],
    ["description", filled(extras.description, copy.description)],
    ["about_title", filled(extras.about_title, copy.about_title)],
    ["about_body", filled(extras.about_body, copy.about_body)],
    ["extra_title", filled(extras.extra_title, copy.extra_title)],
    ["extra_body", filled(extras.extra_body, copy.extra_body)],
    ["cta_label", filled(extras.cta_label, copy.cta_label)],
    ["offering_1_title", (extras.offering_1_title ?? "").trim()],
    ["offering_1_body", (extras.offering_1_body ?? "").trim()],
    ["offering_2_title", (extras.offering_2_title ?? "").trim()],
    ["offering_2_body", (extras.offering_2_body ?? "").trim()],
    ["offering_3_title", (extras.offering_3_title ?? "").trim()],
    ["offering_3_body", (extras.offering_3_body ?? "").trim()],
    ["stat_1_number", (extras.stat_1_number ?? "").trim()],
    ["stat_1_label", (extras.stat_1_label ?? "").trim()],
    ["stat_2_number", (extras.stat_2_number ?? "").trim()],
    ["stat_2_label", (extras.stat_2_label ?? "").trim()],
    ["stat_3_number", (extras.stat_3_number ?? "").trim()],
    ["stat_3_label", (extras.stat_3_label ?? "").trim()],
    ["stat_4_number", (extras.stat_4_number ?? "").trim()],
    ["stat_4_label", (extras.stat_4_label ?? "").trim()],
    ["logo_url", (extras.logo_url ?? "").trim()],
    ["hero_image_url", (extras.hero_image_url ?? "").trim()],
    ["gallery_1_url", (extras.gallery_1_url ?? "").trim()],
    ["gallery_1_title", (extras.gallery_1_title ?? "").trim()],
    ["gallery_1_caption", (extras.gallery_1_caption ?? "").trim()],
    ["gallery_2_url", (extras.gallery_2_url ?? "").trim()],
    ["gallery_2_title", (extras.gallery_2_title ?? "").trim()],
    ["gallery_2_caption", (extras.gallery_2_caption ?? "").trim()],
    ["gallery_3_url", (extras.gallery_3_url ?? "").trim()],
    ["gallery_3_title", (extras.gallery_3_title ?? "").trim()],
    ["gallery_3_caption", (extras.gallery_3_caption ?? "").trim()],
    ["quote", filled(extras.quote, copy.quote)],
    ["quote_name", filled(extras.quote_name, copy.quote_name)],
    ["quote_role", filled(extras.quote_role, copy.quote_role)],
    ["partners", filled(extras.partners, copy.partners)],
    ["custom_domain", (extras.custom_domain ?? "").trim()],
    ["tier", "starter"],
  ];
}
