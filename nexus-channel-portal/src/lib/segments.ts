/** Segmen portal — satu website, banyak halaman (/umkm, /startup, …) */

import { whatsappPackageUrl, whatsappUrl } from "./portal-config";

export type SegmentId = "umkm" | "startup" | "sekolah" | "institusi" | "b2g";

/** Cabang harga: sudah punya website sendiri atau belum (bukan untuk institusi v1). */
export type WebsiteStatus = "belum" | "sudah";

export type SegmentPlan = {
  name: string;
  tag: string | null;
  forWho: string;
  price: string;
  sub: string;
  popular: boolean;
  features: string[];
  cta: string;
};

export type SegmentDef = {
  id: SegmentId;
  href: string;
  title: string;
  short: string;
  headline: string;
  subhead: string;
  badge: string;
  /** Untuk warna ikon di hub */
  accent: "blue" | "green" | "amber" | "slate" | "ink";
  /** true = tanya “sudah punya website?” sebelum harga (UMKM / sekolah / startup). */
  askWebsite: boolean;
  /** Dipakai jika askWebsite=false (institusi). */
  plans: SegmentPlan[];
  plansByWebsite?: Record<WebsiteStatus, SegmentPlan[]>;
  faqs: { q: string; a: string }[];
};

/**
 * Logika harga (pilot PC+tunnel, infra ≈ Rp 0):
 * - Belum punya site → margin di template + pagar; tetap ≤ toleransi UMKM (20–35rb).
 * - Sudah punya site → tanpa slot template; pagar 15rb / +status 28rb (masih murah, tetap profit volume).
 * - Startup tanpa site → landing 45rb / tepi 75rb (bukan warung 20rb, bukan Job B2B).
 * - Institusi → tanpa cabang website v1 (B2B hosted).
 * - B2G → on-prem Edge + Loop wajib; tanpa kuis website; source tidak termasuk.
 */
export const SEGMENTS: SegmentDef[] = [
  {
    id: "umkm",
    href: "/umkm",
    title: "UMKM",
    short: "Warung, jasa, profil usaha — website + pagar anti-deface murah.",
    headline: "Website + pelindung UMKM",
    subhead:
      "Harga menyesuaikan: buat situs baru, atau hanya pasang pagar di website yang sudah ada.",
    badge: "Paling cocok mulai",
    accent: "blue",
    askWebsite: true,
    plans: [],
    plansByWebsite: {
      belum: [
        {
          name: "Website Aman UMKM",
          tag: "PALING LAKU",
          forWho: "Belum punya website — butuh tampil online + pagar dasar.",
          price: "Rp 20.000",
          sub: "/ bulan",
          popular: true,
          features: [
            "Site template di nama.nexus.id",
            "Form isi data — tanpa coding",
            "Keamanan UMKM: WAF tepi shared",
            "Anti-deface dasar (pantau & pulihkan template)",
            "Bukan Job Cowork / laporan institusi",
          ],
          cta: whatsappPackageUrl("UMKM — Belum punya web · Website Aman Rp 20rb"),
        },
        {
          name: "GaaS UMKM (entry)",
          tag: null,
          forWho: "Mau prioritas restore + status ringkas tiap bulan.",
          price: "Rp 35.000",
          sub: "/ bulan",
          popular: false,
          features: [
            "Semua isi Rp 20rb",
            "Prioritas antrean restore",
            "Alert WA saat ada blok/deface attempt",
            "Ringkasan status bulanan (bukan laporan pentest)",
            "Entry GaaS UMKM — bukan Loop institusi",
          ],
          cta: whatsappPackageUrl("UMKM — Belum punya web · GaaS entry Rp 35rb"),
        },
      ],
      sudah: [
        {
          name: "Pagar UMKM",
          tag: "SUDAH PUNYA WEB",
          forWho: "Website sudah jalan — butuh WAF tepi + anti-deface, tanpa bikin site baru.",
          price: "Rp 15.000",
          sub: "/ bulan · 1 host",
          popular: true,
          features: [
            "1 host di belakang WAF tepi shared",
            "Anti-deface dasar / pantau perubahan kasar",
            "Tanpa template Channel Starter (site Anda tetap)",
            "Bukan Job Cowork / laporan formal",
          ],
          cta: whatsappPackageUrl("UMKM — Sudah punya web · Pagar Rp 15rb"),
        },
        {
          name: "Pagar + status",
          tag: null,
          forWho: "Butuh alert WA + ringkasan bulanan tanpa ganti website.",
          price: "Rp 28.000",
          sub: "/ bulan · 1 host",
          popular: false,
          features: [
            "Semua isi Pagar UMKM",
            "Alert WA saat blok / deface attempt",
            "Ringkasan status bulanan",
            "Prioritas restore konfigurasi tepi",
          ],
          cta: whatsappPackageUrl("UMKM — Sudah punya web · Pagar+status Rp 28rb"),
        },
      ],
    },
    faqs: [
      {
        q: "Kenapa sudah punya website lebih murah?",
        a: "Karena tidak ada slot template & isi konten dari kami — yang dibayar adalah pagar tepi + pantau. Tetap bukan wasit Job B2B.",
      },
      {
        q: "Rp 20rb sudah termasuk keamanan?",
        a: "Ya — tingkat UMKM: pagar tepi + anti-deface dasar. Bukan wasit Job dengan laporan formal.",
      },
    ],
  },
  {
    id: "sekolah",
    href: "/sekolah",
    title: "Sekolah",
    short: "Profil sekolah, PPDB, berita — anti-deface agar tidak malu publik.",
    headline: "Website sekolah yang tidak mudah diganti isinya",
    subhead:
      "Pilih dulu: sekolah belum punya site, atau site sudah online dan hanya butuh pagar anti-deface.",
    badge: "Institusi pendidikan",
    accent: "amber",
    askWebsite: true,
    plans: [],
    plansByWebsite: {
      belum: [
        {
          name: "Website Sekolah",
          tag: "DASAR",
          forWho: "Belum punya profil online — butuh template + anti-deface.",
          price: "Rp 20.000",
          sub: "/ bulan",
          popular: true,
          features: [
            "Template profil sekolah / PPDB ringan",
            "Subdomain sekolah.nexus.id",
            "WAF tepi + anti-deface dasar",
            "HTTPS shared",
            "Bukan klaim compliance data siswa penuh",
          ],
          cta: whatsappPackageUrl("Sekolah — Belum punya web · Website Rp 20rb"),
        },
        {
          name: "Sekolah + GaaS entry",
          tag: null,
          forWho: "Butuh alert & ringkasan status jika site diganggu.",
          price: "Rp 35.000",
          sub: "/ bulan",
          popular: false,
          features: [
            "Semua isi paket dasar",
            "Alert WA ke admin sekolah",
            "Ringkasan status bulanan",
            "Prioritas restore template",
          ],
          cta: whatsappPackageUrl("Sekolah — Belum punya web · GaaS entry Rp 35rb"),
        },
      ],
      sudah: [
        {
          name: "Pagar Sekolah",
          tag: "SITE SUDAH ADA",
          forWho: "Domain/sekolah sudah online — pasang pagar anti-deface saja.",
          price: "Rp 15.000",
          sub: "/ bulan · 1 host",
          popular: true,
          features: [
            "WAF tepi pada host sekolah Anda",
            "Anti-deface dasar",
            "HTTPS/tunnel sesuai setup pilot",
            "Tanpa rebuild konten dari Nexus",
          ],
          cta: whatsappPackageUrl("Sekolah — Sudah punya web · Pagar Rp 15rb"),
        },
        {
          name: "Pagar + alert sekolah",
          tag: null,
          forWho: "Admin butuh WA jika ada percobaan deface/blok.",
          price: "Rp 28.000",
          sub: "/ bulan · 1 host",
          popular: false,
          features: [
            "Semua isi Pagar Sekolah",
            "Alert WA admin",
            "Ringkasan status bulanan",
            "Prioritas restore konfigurasi",
          ],
          cta: whatsappPackageUrl("Sekolah — Sudah punya web · Pagar+alert Rp 28rb"),
        },
      ],
    },
    faqs: [
      {
        q: "Apakah data siswa dijamin aman regulasi?",
        a: "Tidak diklaim sertifikasi. Paket ini melindungi site dari deface & serangan kasar; data sensitif tetap tanggung jawab sekolah.",
      },
    ],
  },
  {
    id: "startup",
    href: "/startup",
    title: "Startup",
    short: "Kanal produk sudah jalan — atau landing dulu + tepi sebelum scale.",
    headline: "Lindungi kanal sebelum scale",
    subhead:
      "Belum punya web? Mulai dari landing + pagar. Sudah punya produk online? Langsung tepi / Job.",
    badge: "Digital / early",
    accent: "green",
    askWebsite: true,
    plans: [],
    plansByWebsite: {
      belum: [
        {
          name: "Landing + pagar",
          tag: "MULAI",
          forWho: "Belum punya site — butuh 1 landing + pagar dasar sebelum scale.",
          price: "Rp 45.000",
          sub: "/ bulan",
          popular: true,
          features: [
            "1 landing template (bukan custom app)",
            "Subdomain atau host sederhana",
            "WAF tepi dasar",
            "Bukan Loop / Job wasit formal",
          ],
          cta: whatsappPackageUrl("Startup — Belum punya web · Landing+pagar Rp 45rb"),
        },
        {
          name: "Landing + Tepi ketat",
          tag: null,
          forWho: "Landing + Reflex tepi lebih ketat (siap naik ke host sendiri).",
          price: "Rp 75.000",
          sub: "/ bulan · 1 host",
          popular: false,
          features: [
            "Semua Landing + pagar",
            "Konfigurasi tepi lebih ketat",
            "Alert operator",
            "Jalur naik ke Job Wasit saat rilis",
          ],
          cta: whatsappPackageUrl("Startup — Belum punya web · Landing+Tepi Rp 75rb"),
        },
        {
          name: "Job Wasit (on-demand)",
          tag: null,
          forWho: "Saat rilis penting — bukti sekali jalan (bisa setelah site live).",
          price: "Rp 200.000",
          sub: "sekali / pilot",
          popular: false,
          features: [
            "1 Job Cowork + artefak MD/JSON",
            "Defense delta + antibody loop",
            "Gerbang L0/L1",
          ],
          cta: whatsappPackageUrl("Startup — Belum punya web · Job Wasit Rp 200rb"),
        },
      ],
      sudah: [
        {
          name: "Tepi Startup",
          tag: "REKOMENDASI",
          forWho: "Web/app sudah jalan — butuh pagar always-on tanpa laporan berat.",
          price: "Rp 75.000",
          sub: "/ bulan · 1 host",
          popular: true,
          features: [
            "1 PROTECTED_HOST di belakang WAF",
            "Reflex tepi + ban dasar",
            "Alert operator",
            "Tanpa artefak Job formal",
          ],
          cta: whatsappPackageUrl("Startup — Sudah punya web · Tepi Rp 75rb"),
        },
        {
          name: "Job Wasit (on-demand)",
          tag: null,
          forWho: "Saat rilis penting — butuh delta + laporan sekali jalan.",
          price: "Rp 200.000",
          sub: "sekali / pilot",
          popular: false,
          features: [
            "1 Job Cowork + artefak MD/JSON",
            "Defense delta + antibody loop",
            "Gerbang L0/L1",
            "Bisa ditambah di atas Tepi",
          ],
          cta: whatsappPackageUrl("Startup — Sudah punya web · Job Wasit Rp 200rb"),
        },
        {
          name: "Loop Startup",
          tag: null,
          forWho: "Retainership 1 host — 1 siklus Job / bulan.",
          price: "Rp 300.000",
          sub: "/ bulan",
          popular: false,
          features: ["Semua Job Wasit", "Jadwal bulanan", "Memori imun per host"],
          cta: whatsappPackageUrl("Startup — Sudah punya web · Loop Rp 300rb"),
        },
      ],
    },
    faqs: [
      {
        q: "Bedanya dengan UMKM Rp 20rb?",
        a: "Startup tanpa web mulai dari Rp 45rb (landing + pagar), bukan paket warung. Yang sudah punya kanal fokus tepi/wasit di host Anda.",
      },
    ],
  },
  {
    id: "institusi",
    href: "/institusi",
    title: "Institusi",
    short: "Fintech, integrator, kanal kritis — Job/Loop hosted (B2B). On-prem pemerintah → pintu B2G.",
    headline: "Edge Antibody Cowork untuk kanal kritis",
    subhead:
      "Bukan paket Rp 20rb. Job/Loop dengan artefak jujur. Cabang “punya website?” belum dipakai di sini — scope kontrak beda.",
    badge: "B2B / kritis",
    accent: "slate",
    askWebsite: false,
    plans: [
      {
        name: "Job Cowork",
        tag: "PILOT",
        forWho: "Audit / bukti sekali jalan untuk 1 host.",
        price: "Rp 200.000",
        sub: "sekali",
        popular: true,
        features: [
          "Defense delta + antibody loop",
          "Artefak MD/JSON",
          "L0/L1 & residual jujur",
          "Hosting pilot di infrastruktur operator",
        ],
        cta: whatsappPackageUrl("Institusi — Job Cowork Rp 200rb"),
      },
      {
        name: "Loop GaaS",
        tag: null,
        forWho: "Retainership 1 host — pemeriksaan berkala.",
        price: "Rp 300.000",
        sub: "/ bulan",
        popular: false,
        features: ["1 Job / bulan", "Memori imun", "Operator + artefak"],
        cta: whatsappPackageUrl("Institusi — Loop Rp 300rb"),
      },
      {
        name: "Custom / multi-host",
        tag: null,
        forWho: "BUMN, multi-kanal, atau kebutuhan kontrak khusus.",
        price: "Custom",
        sub: "diskusi WA",
        popular: false,
        features: ["Scope per host", "Kontrak terpisah", "Bukan self-serve Rp 35rb"],
        cta: whatsappUrl(
          "Saya dari institusi/BUMN — mau diskusi Edge Antibody Cowork (bukan paket UMKM).",
        ),
      },
    ],
    faqs: [
      {
        q: "Apakah ini SLA pemerintah / sertifikasi?",
        a: "Tidak. Pilot jujur di infrastruktur operator + tunnel. Untuk pengadaan formal / on-prem DC, lihat pintu B2G — masih tahap pitching, bukan produksi pengadaan selesai.",
      },
    ],
  },
  {
    id: "b2g",
    href: "/b2g",
    title: "B2G",
    short: "Instansi & DC on-prem — lisensi Edge + Loop wajib; source tidak diserahkan.",
    headline: "Edge on-prem untuk kanal instansi",
    subhead:
      "Binary/image di DC Anda. Control plane & source tetap di Nexus. Loop wajib agar lisensi dan update hidup — bukan paket Rp 20rb.",
    badge: "On-prem / pitching",
    accent: "ink",
    askWebsite: false,
    plans: [
      {
        name: "Lisensi Edge On-Prem",
        tag: "TAHUNAN",
        forWho: "1 zona/DC · host terbatas kontrak · runtime berlisensi.",
        price: "Rp 18.000.000",
        sub: "/ tahun",
        popular: false,
        features: [
          "Image/binary Edge di server milik instansi",
          "WAF + Reflex + antibodi cache (NEX-AI only)",
          "Source code & SOC control plane TIDAK termasuk",
          "Masa berlaku lisensi terikat kontrak",
          "Pitching/arsitektur — packaging produksi belum selesai",
        ],
        cta: whatsappPackageUrl("B2G — Lisensi Edge On-Prem Rp 18jt/tahun"),
      },
      {
        name: "Loop On-Prem (wajib)",
        tag: "RETAINER",
        forWho: "Tanpa Loop, lisensi tidak diperpanjang / update berhenti.",
        price: "Rp 3.500.000",
        sub: "/ bulan",
        popular: true,
        features: [
          "Job terjadwal + artefak risiko",
          "Update antibodi / memori imun (jalur terbatas)",
          "Dukungan operator L0/L1",
          "Bukan SOC otonom 24/7",
          "Margin retainer — bukan harga UMKM",
        ],
        cta: whatsappPackageUrl("B2G — Loop On-Prem Rp 3,5jt/bulan"),
      },
      {
        name: "Custom / multi-DC",
        tag: null,
        forWho: "Multi-zona, air-gap terbatas, SIEM, pelatihan pemilik risiko.",
        price: "Custom",
        sub: "diskusi WA",
        popular: false,
        features: [
          "Scope per DC / host",
          "Integrasi log klien (terbatas)",
          "Bukan SIPLah/E-Katalog otomatis",
          "Bukan klaim sertifikasi regulator",
        ],
        cta: whatsappUrl(
          "Saya dari instansi/B2G — mau diskusi paket on-prem Edge + Loop (bukan UMKM).",
        ),
      },
    ],
    faqs: [
      {
        q: "Apakah source code diserahkan?",
        a: "Tidak. Yang di DC klien adalah runtime berlisensi. Source monorepo dan control plane SOC tetap milik Nexus.",
      },
      {
        q: "Setelah 1 tahun, bisa jalan sendiri tanpa Nexus?",
        a: "Desain produk: Loop wajib + update + runtime terikat lisensi. Cabut retainer = tidak ada jalur update/wasit berkala — bukan “fork gratis selamanya”.",
      },
      {
        q: "Apakah ini sudah siap pengadaan pemerintah?",
        a: "Belum. Status = pitching & arsitektur. Packaging binary produksi, HPS formal, dan pilot DC instansi masih backlog.",
      },
    ],
  },
];

export function getSegment(id: SegmentId): SegmentDef {
  const found = SEGMENTS.find((s) => s.id === id);
  if (!found) throw new Error(`Unknown segment: ${id}`);
  return found;
}

export function plansForSegment(
  segment: SegmentDef,
  website: WebsiteStatus | null,
): SegmentPlan[] {
  if (!segment.askWebsite) return segment.plans;
  if (!website || !segment.plansByWebsite) return [];
  return segment.plansByWebsite[website];
}
