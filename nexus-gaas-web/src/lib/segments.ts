/** Segmen portal — satu website, banyak halaman (/umkm, /startup, …) */

import {
  checkoutCtaLabel,
  checkoutHref,
  priceIdrSub,
  priceKrLabel,
} from "./checkout.ts";
import { whatsappPackageUrl, whatsappUrl } from "./portal-config.ts";

export type SegmentId = "umkm" | "startup" | "sekolah" | "corporat" | "pemerintah";

/** Cabang harga: sudah punya website sendiri atau belum (UMKM / sekolah / startup). */
export type WebsiteStatus = "belum" | "sudah";

/** Cabang Corporat: hosted (seperti Job/Loop biasa) vs on-prem (server milik klien). */
export type DeployMode = "hosted" | "onprem";

export type SegmentPlan = {
  name: string;
  tag: string | null;
  forWho: string;
  price: string;
  sub: string;
  popular: boolean;
  features: string[];
  cta: string;
  /** Tombol kartu. Internal = Kredit/portal; WA hanya on-prem. */
  ctaLabel: string;
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
  /** true = tanya hosted vs on-prem (Corporat). */
  askDeployMode: boolean;
  /** Dipakai jika askWebsite=false dan askDeployMode=false (Pemerintah). */
  plans: SegmentPlan[];
  plansByWebsite?: Record<WebsiteStatus, SegmentPlan[]>;
  plansByDeploy?: Record<DeployMode, SegmentPlan[]>;
  faqs: { q: string; a: string }[];
};

/**
 * Logika harga (pilot PC+tunnel, infra ≈ Rp 0):
 * - Belum punya site → margin di template + pagar; tetap ≤ toleransi UMKM (20–35rb).
 * - Sudah punya site → tanpa slot template; 15rb Header Shield / 28rb Edge Shield (lab 1 host).
 * - 35rb / 28rb = Edge Shield lewat WAF Reflex (bukan Job, bukan pulih Vercel). 20rb tetap header-only.
 * - Startup tanpa site → landing 45rb (header tepi) / tepi 75rb Alur A Reflex (1 host lab, --tier tepi; bukan Job, bukan alert Telegram pelanggan).
 * - Corporat → cabang: hosted (Job/Loop) ATAU on-prem (besar / kritis seperti Pemerintah).
 * - Pemerintah → on-prem Edge + Loop wajib; tanpa kuis website; source tidak termasuk.
 */
export const SEGMENTS: SegmentDef[] = [
  {
    id: "umkm",
    href: "/umkm",
    title: "UMKM",
    short: "Warung, jasa, profil usaha — Starter 20rb = header tepi; 35rb = Edge Shield (1 host lab).",
    headline: "UMKM website + Header Shield",
    subhead:
      "Starter 20rb = site + header tepi saja. Edge Shield 35rb/28rb = Reflex judi/deface lewat WAF shared (lab 1 host). Bukan Job, bukan pulih Vercel.",
    badge: "Paling cocok mulai",
    accent: "blue",
    askWebsite: true,
    askDeployMode: false,
    plans: [],
    plansByWebsite: {
      belum: [
        {
          name: "Website Starter UMKM",
          tag: "PALING LAKU",
          forWho: "Belum punya website — butuh tampil online + header tepi dasar.",
          price: priceKrLabel(20),
          sub: priceIdrSub(20, " / bulan"),
          popular: true,
          features: [
            "Site template di nama.nexus.id",
            "Form isi data — tanpa coding",
            "Basic headers: edge nosniff / frame / CSP + hostname lab",
            "Bukan WAF Reflex, bukan pulih template / filter judi",
            "Bukan Job Cowork / laporan institusi",
          ],
          cta: checkoutHref("umkm-starter"),
          ctaLabel: checkoutCtaLabel("starter", true),
        },
        {
          name: "Edge Shield (shared lab host)",
          tag: "LAB 1 HOST",
          forWho: "Site Starter + Reflex tipis di tepi Nexus — satu PROTECTED_HOST per lab, bukan setiap warung otomatis.",
          price: priceKrLabel(35),
          sub: priceIdrSub(35, " / bulan · 1 host lab"),
          popular: false,
          features: [
            "Semua isi Starter 20rb + Caddy ke WAF :8080 (upsell --tier tepi)",
            "Reflex tipis: injeksi judi/slot/deface di path/query/body lewat tepi",
            "Bukan Job Cowork / Loop; bukan debit Starter 20 Kr",
            "Bukan pulih Vercel; *.vercel.app langsung TIDAK dilindungi",
            "Satu slug aktif per instance lab — bukan CNAME massal",
          ],
          cta: checkoutHref("umkm-tepi-belum"),
          ctaLabel: checkoutCtaLabel("tepi", false),
        },
      ],
      sudah: [
        {
          name: "UMKM Header Shield",
          tag: "SUDAH PUNYA WEB",
          forWho: "Website sudah jalan — butuh header tepi (nosniff/CSP), tanpa bikin site baru.",
          price: priceKrLabel(15),
          sub: priceIdrSub(15, " / bulan · 1 host"),
          popular: true,
          features: [
            "1 host: header tepi (nosniff / frame / CSP), bukan WAF Reflex",
            "Hostname lab jika di-deploy Caddy / folder Vercel",
            "Tanpa template Channel Starter (site Anda tetap)",
            "Anti-deface/judi butuh Edge Shield 28rb (tepi WAF, 1 host lab)",
            "Bukan Job Cowork / laporan formal",
          ],
          cta: checkoutHref("umkm-pagar"),
          ctaLabel: checkoutCtaLabel("request", false),
        },
        {
          name: "Edge Shield (shared lab host)",
          tag: "LAB 1 HOST",
          forWho: "Host yang sudah ada — Reflex judi/deface di tepi Nexus, satu host per lab.",
          price: priceKrLabel(28),
          sub: priceIdrSub(28, " / bulan · 1 host lab"),
          popular: false,
          features: [
            "Header tepi + reverse_proxy WAF :8080 (upsell --tier tepi, tanpa Job)",
            "Reflex tipis injeksi judi/slot/deface — bukan anti zero-day",
            "Bukan pulih Vercel / restore file origin remote",
            "*.vercel.app langsung TIDAK dilindungi; trafik harus ke PROTECTED_HOST",
          ],
          cta: checkoutHref("umkm-tepi-sudah"),
          ctaLabel: checkoutCtaLabel("tepi", false),
        },
      ],
    },
    faqs: [
      {
        q: "Kenapa sudah punya website lebih murah?",
        a: "Karena tidak ada slot template & isi konten dari kami. 15rb = Header Shield (header tepi). 28rb = Edge Shield (WAF Reflex 1 host lab). Tetap bukan wasit Job B2B.",
      },
      {
        q: "Rp 20rb sudah termasuk keamanan?",
        a: "Header Shield saja: header tepi + hostname lab. Bukan WAF Reflex, bukan pulih template, bukan filter judi. Edge Shield = kartu 35rb (shared lab host). Bukan Job.",
      },
    ],
  },
  {
    id: "sekolah",
    href: "/sekolah",
    title: "Sekolah",
    short: "Profil sekolah, PPDB, berita — 20rb header tepi; 35rb Edge Shield (1 host lab).",
    headline: "School website + Header Shield",
    subhead:
      "Paket 20rb = template + header tepi. Edge Shield 35rb/28rb = Reflex judi/deface lewat WAF (lab 1 host). Bukan Job, bukan pulih Vercel.",
    badge: "Institusi pendidikan",
    accent: "amber",
    askWebsite: true,
    askDeployMode: false,
    plans: [],
    plansByWebsite: {
      belum: [
        {
          name: "Website Sekolah",
          tag: "DASAR",
          forWho: "Belum punya profil online — butuh template + header tepi.",
          price: priceKrLabel(20),
          sub: priceIdrSub(20, " / bulan"),
          popular: true,
          features: [
            "Template profil sekolah / PPDB ringan",
            "Subdomain sekolah.nexus.id",
            "Basic headers: edge nosniff / frame / CSP + hostname lab",
            "Bukan WAF Reflex / pulih template / filter judi",
            "Bukan klaim compliance data siswa penuh",
          ],
          cta: checkoutHref("sekolah-starter"),
          ctaLabel: checkoutCtaLabel("starter", true),
        },
        {
          name: "Edge Shield (shared lab host)",
          tag: "LAB 1 HOST",
          forWho: "Profil sekolah + Reflex tipis di tepi Nexus — satu host per lab, bukan Job institusi.",
          price: priceKrLabel(35),
          sub: priceIdrSub(35, " / bulan · 1 host lab"),
          popular: false,
          features: [
            "Semua isi paket 20rb + Caddy ke WAF :8080 (upsell --tier tepi)",
            "Reflex tipis injeksi judi/slot/deface lewat tepi",
            "Bukan Job Cowork / Loop; bukan debit Starter 20 Kr",
            "Bukan pulih Vercel; *.vercel.app langsung TIDAK dilindungi",
          ],
          cta: checkoutHref("sekolah-tepi-belum"),
          ctaLabel: checkoutCtaLabel("tepi", false),
        },
      ],
      sudah: [
        {
          name: "School Header Shield",
          tag: "SITE SUDAH ADA",
          forWho: "Domain/sekolah sudah online — pasang header tepi saja.",
          price: priceKrLabel(15),
          sub: priceIdrSub(15, " / bulan · 1 host"),
          popular: true,
          features: [
            "Header tepi pada host sekolah (bukan WAF Reflex)",
            "Hostname lab jika di-deploy Caddy / folder Vercel",
            "HTTPS/tunnel sesuai setup pilot",
            "Tanpa rebuild konten dari Nexus",
            "Anti-deface/judi butuh Edge Shield 28rb (tepi WAF, 1 host lab)",
          ],
          cta: checkoutHref("sekolah-pagar"),
          ctaLabel: checkoutCtaLabel("request", false),
        },
        {
          name: "Edge Shield (shared lab host)",
          tag: "LAB 1 HOST",
          forWho: "Host sekolah sudah online — Reflex judi/deface di tepi, satu host per lab.",
          price: priceKrLabel(28),
          sub: priceIdrSub(28, " / bulan · 1 host lab"),
          popular: false,
          features: [
            "Header tepi + reverse_proxy WAF :8080 (upsell --tier tepi, tanpa Job)",
            "Reflex tipis injeksi judi/slot/deface — bukan anti zero-day",
            "Bukan pulih Vercel / restore origin remote",
            "*.vercel.app langsung TIDAK dilindungi",
          ],
          cta: checkoutHref("sekolah-tepi-sudah"),
          ctaLabel: checkoutCtaLabel("tepi", false),
        },
      ],
    },
    faqs: [
      {
        q: "Apakah data siswa dijamin aman regulasi?",
        a: "Tidak diklaim sertifikasi. 20rb/15rb = header tepi. Edge Shield 35/28rb = Reflex di WAF 1 host lab, bukan restore file, bukan Job.",
      },
      {
        q: "Rp 20rb sudah termasuk WAF atau anti-deface?",
        a: "Tidak. Header Shield = header tepi + hostname lab. Edge Shield (kartu 35rb) = Reflex judi/deface lewat tepi, 1 host lab, bukan Job, bukan pulih Vercel.",
      },
    ],
  },
  {
    id: "startup",
    href: "/startup",
    title: "Startup",
    short: "45rb = landing + header tepi; 75rb = tepi Alur A Reflex (1 host lab). Bukan Job, bukan alert Telegram.",
    headline: "Lindungi kanal sebelum scale",
    subhead:
      "Belum punya web? 45rb = landing + header tepi (bukan WAF). 75rb = tepi Alur A Reflex, satu host lab (--tier tepi). Sudah punya kanal? Tepi 75rb atau Job terpisah. Bukan alert operator ke pelanggan.",
    badge: "Digital / early",
    accent: "green",
    askWebsite: true,
    askDeployMode: false,
    plans: [],
    plansByWebsite: {
      belum: [
        {
          name: "Landing + Header Shield",
          tag: "MULAI",
          forWho: "Belum punya site — butuh 1 landing + header tepi dasar sebelum scale.",
          price: priceKrLabel(45),
          sub: priceIdrSub(45, " / bulan"),
          popular: true,
          features: [
            "1 landing template (bukan custom app)",
            "Subdomain atau host sederhana",
            "Basic headers: edge nosniff / frame / CSP + hostname lab",
            "Bukan WAF Reflex, bukan filter judi / pulih Vercel",
            "Bukan Loop / Job wasit formal",
          ],
          cta: checkoutHref("startup-landing"),
          ctaLabel: checkoutCtaLabel("starter", true),
        },
        {
          name: "Landing + Edge Shield (Alur A)",
          tag: "LAB 1 HOST",
          forWho: "Landing + tepi WAF Reflex (Alur A) — satu PROTECTED_HOST per lab, bukan Job.",
          price: priceKrLabel(75),
          sub: priceIdrSub(75, " / bulan · 1 host lab"),
          popular: false,
          features: [
            "Semua Landing + Header Shield (header tepi) + Caddy ke WAF :8080 (--tier tepi)",
            "Alur A: Reflex judi/slot/deface + ban tepi — 1 host lab",
            "Bukan Job Cowork / Loop; bukan debit Starter 20 Kr",
            "Bukan pulih Vercel; *.vercel.app langsung TIDAK dilindungi",
            "Bukan alert Telegram ke pelanggan (pager ban = operator lab)",
          ],
          cta: checkoutHref("startup-tepi-belum"),
          ctaLabel: checkoutCtaLabel("tepi", false),
        },
        {
          name: "Job Wasit (on-demand)",
          tag: null,
          forWho: "Saat rilis penting — bukti sekali jalan (bisa setelah site live).",
          price: priceKrLabel(200),
          sub: priceIdrSub(200, " sekali / pilot"),
          popular: false,
          features: [
            "1 Job Cowork + artefak MD/JSON",
            "Defense delta + antibody loop",
            "Gerbang L0/L1",
            "Job = operator (bukan 200 Kr self-serve di kasir Starter). Form portal — bukan WhatsApp.",
          ],
          cta: checkoutHref("startup-job"),
          ctaLabel: checkoutCtaLabel("request", false),
        },
      ],
      sudah: [
        {
          name: "Startup Edge Shield",
          tag: "REKOMENDASI",
          forWho: "Web/app sudah jalan — tepi Alur A Reflex, satu host lab, tanpa wasit Job.",
          price: priceKrLabel(75),
          sub: priceIdrSub(75, " / bulan · 1 host lab"),
          popular: true,
          features: [
            "1 PROTECTED_HOST di belakang WAF (upsell --tier tepi)",
            "Alur A: Reflex judi/deface + ban tepi — Edge Shield, 1 host lab",
            "Bukan Job Cowork / Loop; tanpa artefak wasit formal",
            "Bukan pulih Vercel; *.vercel.app langsung TIDAK dilindungi",
            "Bukan alert Telegram ke pelanggan (pager ban = operator lab)",
          ],
          cta: checkoutHref("startup-tepi-sudah"),
          ctaLabel: checkoutCtaLabel("tepi", false),
        },
        {
          name: "Job Wasit (on-demand)",
          tag: null,
          forWho: "Saat rilis penting — butuh delta + laporan sekali jalan.",
          price: priceKrLabel(200),
          sub: priceIdrSub(200, " sekali / pilot"),
          popular: false,
          features: [
            "1 Job Cowork + artefak MD/JSON",
            "Defense delta + antibody loop",
            "Gerbang L0/L1",
            "Bisa ditambah di atas Tepi",
            "Job = operator (bukan 200 Kr self-serve). Form portal — bukan WhatsApp.",
          ],
          cta: checkoutHref("startup-job"),
          ctaLabel: checkoutCtaLabel("request", false),
        },
        {
          name: "Loop Startup",
          tag: null,
          forWho: "Retainership 1 host — 1 siklus Job / bulan.",
          price: priceKrLabel(300),
          sub: priceIdrSub(300, " / bulan"),
          popular: false,
          features: ["Semua Job Wasit", "Jadwal bulanan", "Memori imun per host", "Loop hosted = operator, bukan WhatsApp."],
          cta: checkoutHref("startup-loop"),
          ctaLabel: checkoutCtaLabel("request", false),
        },
      ],
    },
    faqs: [
      {
        q: "Bedanya dengan UMKM Rp 20rb?",
        a: "45rb = landing + header tepi (bukan WAF). 75rb = Edge Shield Alur A Reflex, 1 host lab (--tier tepi) — lebih dari header saja, bukan Job, bukan alert Telegram pelanggan. Job 200rb terpisah.",
      },
    ],
  },
  {
    id: "corporat",
    href: "/corporat",
    title: "Corporat",
    short:
      "Perusahaan / fintech / BUMN — pilih hosted (Job/Loop) atau on-prem jika sudah besar & kritis.",
    headline: "Keamanan kanal untuk Corporat",
    subhead:
      "Ukuran kecil–menengah: beli Job/Loop hosted di portal (Kredit) — bukan WhatsApp. Sudah besar / multi-DC / data sensitif: on-prem di server Anda — model sama dengan Pemerintah (WA).",
    badge: "B2B / perusahaan",
    accent: "slate",
    askWebsite: false,
    askDeployMode: true,
    plans: [],
    plansByDeploy: {
      hosted: [
        {
          name: "Job Cowork",
          tag: "HOSTED",
          forWho: "Audit / bukti sekali jalan untuk 1 host — di infrastruktur Nexus.",
          price: priceKrLabel(200),
          sub: priceIdrSub(200, " sekali"),
          popular: true,
          features: [
            "Defense delta + antibody loop",
            "Artefak MD/JSON",
            "L0/L1 & residual jujur",
            "Hosting pilot di PC/server operator + tunnel",
            "Job hosted = operator (bukan 200 Kr self-serve Starter). Form portal — bukan WhatsApp.",
          ],
          cta: checkoutHref("corporat-job"),
          ctaLabel: checkoutCtaLabel("request", false),
        },
        {
          name: "Loop GaaS",
          tag: null,
          forWho: "Retainership 1 host — pemeriksaan berkala (hosted).",
          price: priceKrLabel(300),
          sub: priceIdrSub(300, " / bulan"),
          popular: false,
          features: ["1 Job / bulan", "Memori imun", "Operator + artefak"],
          cta: checkoutHref("corporat-loop"),
          ctaLabel: checkoutCtaLabel("request", false),
        },
        {
          name: "Custom / multi-host",
          tag: null,
          forWho: "Multi-kanal hosted atau kebutuhan kontrak khusus.",
          price: "Custom",
          sub: "diskusi portal",
          popular: false,
          features: ["Scope per host", "Kontrak terpisah", "Bukan self-serve Rp 35rb", "Bukan WhatsApp — hosted = form portal."],
          cta: checkoutHref("corporat-custom"),
          ctaLabel: checkoutCtaLabel("request", false),
        },
      ],
      onprem: [
        {
          name: "Lisensi Edge On-Prem",
          tag: "BESAR / KRITIS",
          forWho: "Perusahaan besar — Edge di server/DC milik Anda.",
          price: "Rp 18.000.000",
          sub: "/ tahun",
          popular: false,
          features: [
            "Image/binary Edge di server corporat",
            "WAF + Reflex + antibodi cache (NEX-AI only)",
            "Source code & SOC control plane TIDAK termasuk",
            "Model sama Pemerintah — untuk skala besar",
            "Pitching/arsitektur — packaging produksi belum selesai",
          ],
          cta: whatsappPackageUrl("Corporat — On-Prem Edge Rp 18jt/tahun"),
          ctaLabel: "Pesan via WhatsApp",
        },
        {
          name: "Loop On-Prem (wajib)",
          tag: "RETAINER",
          forWho: "Tanpa Loop, lisensi & update antibodi tidak hidup penuh.",
          price: "Rp 3.500.000",
          sub: "/ bulan",
          popular: true,
          features: [
            "Job terjadwal + artefak risiko",
            "Update antibodi / memori imun",
            "Dukungan operator L0/L1",
            "Bukan SOC otonom 24/7",
          ],
          cta: whatsappPackageUrl("Corporat — On-Prem Loop Rp 3,5jt/bulan"),
          ctaLabel: "Pesan via WhatsApp",
        },
        {
          name: "Custom / multi-DC",
          tag: null,
          forWho: "Multi-zona, air-gap terbatas, SIEM, pelatihan pemilik risiko.",
          price: "Custom",
          sub: "diskusi WA",
          popular: false,
          features: ["Scope per DC / host", "Integrasi log klien (terbatas)", "Bukan klaim sertifikasi"],
          cta: whatsappUrl(
            "Saya dari corporat besar — mau diskusi on-prem Edge + Loop (bukan hosted).",
          ),
          ctaLabel: "Pesan via WhatsApp",
        },
      ],
    },
    faqs: [
      {
        q: "Kapan pilih Hosted vs On-Prem?",
        a: "Hosted: cukup 1–beberapa host, bukti Job/Loop, anggaran ratusan ribu — mesin di Nexus; beli di portal (Kredit), bukan WhatsApp. On-Prem: data sensitif, kebijakan “harus di server kami”, multi-DC, atau skala besar — lisensi Edge + Loop wajib (harga jutaan); kontak WhatsApp.",
      },
      {
        q: "Bedanya Corporat On-Prem dengan Pemerintah?",
        a: "Teknis sama (Edge di DC klien + Loop). Pemerintah = pintu pengadaan/instansi. Corporat = perusahaan swasta/BUMN yang sudah besar. Source tetap tidak diserahkan.",
      },
    ],
  },
  {
    id: "pemerintah",
    href: "/pemerintah",
    title: "Pemerintah",
    short: "Instansi & DC on-prem — lisensi Edge + Loop wajib; source tidak diserahkan.",
    headline: "Edge on-prem untuk kanal instansi",
    subhead:
      "Binary/image di DC pemerintah Anda. Control plane & source tetap di Nexus. Loop wajib agar lisensi dan update hidup — bukan paket Rp 20rb.",
    badge: "Instansi / on-prem",
    accent: "ink",
    askWebsite: false,
    askDeployMode: false,
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
        cta: whatsappPackageUrl("Pemerintah — Lisensi Edge On-Prem Rp 18jt/tahun"),
        ctaLabel: "Pesan via WhatsApp",
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
        cta: whatsappPackageUrl("Pemerintah — Loop On-Prem Rp 3,5jt/bulan"),
        ctaLabel: "Pesan via WhatsApp",
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
          "Saya dari instansi/pemerintah — mau diskusi paket on-prem Edge + Loop (bukan UMKM).",
        ),
        ctaLabel: "Pesan via WhatsApp",
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
      {
        q: "Saya perusahaan swasta besar, bukan instansi?",
        a: "Pilih pintu Corporat → cabang On-Prem. Teknis sama; pintu Pemerintah khusus narasi instansi/pengadaan.",
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
  deploy: DeployMode | null = null,
): SegmentPlan[] {
  if (segment.askDeployMode) {
    if (!deploy || !segment.plansByDeploy) return [];
    return segment.plansByDeploy[deploy];
  }
  if (!segment.askWebsite) return segment.plans;
  if (!website || !segment.plansByWebsite) return [];
  return segment.plansByWebsite[website];
}
