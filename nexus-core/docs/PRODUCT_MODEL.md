# Model Produk Nexus Cyber — GaaS + Channel Starter

**Versi:** 1.1.14 / 2026-09-03  
**Status:** Dokumen hidup — sumber kebenaran model produk. Kontrak teknis: [`CAPABILITIES.md`](./CAPABILITIES.md), [`LIMITATIONS.md`](./LIMITATIONS.md). Keputusan belum final: [`DECISIONS_OPEN.md`](./DECISIONS_OPEN.md). Ringkas agen: [`../../AGENTS.md`](../../AGENTS.md) (git root). Folder **`.agents/`** gitignore — tidak di remote.

---

## 0. Lab target — apa yang dilindungi & kenapa

Sebelum mengklaim demo atau mengubah WAF/Job, agen dan operator wajib paham **origin lab default**:

| | |
| --- | --- |
| **Apa (default, tanpa upsell env)** | Website **portofolio** pemilik di **Vercel** (repo terpisah [Portofolio-Thoriq](https://github.com/Thbetyfu/Portofolio-Thoriq)) di belakang WAF. Folder lab `playground/` **diarsip** — [PLAYGROUND_ARCHIVE.md](./PLAYGROUND_ARCHIVE.md) |
| **Apa (instance lab ini, pemilik 2026-09-03 pilihan B)** | **Satu gateway**, **lebih dari satu hostname**: portofolio Vercel **tetap** di peta, plus slug Channel Starter yang di-upsell `--tier tepi`. Bukan 1000 CNAME. Bukan setiap generate Starter 20 Kr |
| **Di mana di stack** | Origin di belakang gateway; site UMKM **bukan** produk Job/Loop |
| **Hostname** | Default `PROTECTED_HOST` = **`portfolio.nexus-lab.test`**. Extra tepi = `deploy-local/nexus-host-map.json` (Host → origin). Upsell **menambah** host, **bukan** menimpa portfolio |
| **Alur** | Pengunjung → Caddy `http://{host}.nexus-lab.test` → **WAF `:8080`** → origin per Host (Vercel portfolio **atau** `channel-origin:8099/{slug}/`) |
| **Kenapa** | Bukti **Alur A** (Reflex) pada **beberapa** kanal HTTP lab di **satu** instance. Job Cowork **bukan** SKU Starter 20 Kr dan **bukan** setiap warung otomatis |
| **Inti jual / moat teknis** | Siklus wasit Job: defense delta → antibodi → vaccine-probe/replay → tutup jujur (`replay_missed` → `CLOSED_GAP`, bukan `CLOSED_OK`) — paket **Cowork**, bukan Edge Shield tepi |
| **Bukan** | Starter 20 Kr = WAF; SOC publik; Loop penuh di harga Rp 20rb; CNAME massal; klaim 100 UMKM / `*.vercel.app` naked di belakang WAF |

Operasi lab: **`nexus-core/deploy-local/START.bat`** — [`../deploy-local/README.md`](../deploy-local/README.md). Portal lab: `cd nexus-gaas-web && npm run dev` (`:3003`; generate server-side ke `CHANNEL_STARTER_URL=http://127.0.0.1:3010`; browser publik hanya **`GET /starter`** dan **`GET /starter/preview/{slug}`** tanpa cookie — Caddy/Next **bukan** catch-all `/starter/*` ke FastAPI; mutate = `POST /api/channel-starter/*` (**sesi + debit 20 Kr**); **Lihat teks** = `POST /api/local-llm/fill-starter` (**sesi tamu/akun, tanpa debit**, loopback `gemma3:1b`, timeout ~35s + satu retry; fallback template jujur); etalase `/` `/umkm` tetap `/gate`). Pilot luar rumah: tunnel **hanya** Channel Portal (`START-PORTAL-PILOT.bat` / `nexus-tunnel.ps1 -Portal`) — **bukan** SOC `:3001`/`:8081`, **bukan** Ollama `:11434`. Keran lab **opt-in** (`NEXUS_LAB_FAUCET=1` + mode lab). Distribusi: [`DISTRIBUTION_PILOT.md`](./DISTRIBUTION_PILOT.md).

```text
  Pengunjung → Caddy http://portfolio.nexus-lab.test → Gateway :8080 → origin Vercel
  Pengunjung → Caddy http://{slug}.nexus-lab.test    → Gateway :8080 → channel-origin /{slug}/
                                      ↑
                         host map (portfolio + tepi); PROTECTED_HOST default = portfolio
  (jangan demo naked *.vercel.app; jangan tunnel SOC :3001/:8081)
```

---

## 1. Dua lapisan produk (strategi 2026-08-22)

Nexus Cyber **bukan** satu harga untuk semua segmen. **Tiga SKU:** Channel Starter (20 Kr, header tepi) ≠ Edge Shield (`--tier tepi`, host map di **satu** lab gateway) ≠ Job/Loop Cowork. Default: `PROTECTED_HOST` = `portfolio.nexus-lab.test` **tetap** di peta. Upsell tepi **menambah** `{slug}.nexus-lab.test`. Bukan WAF otomatis setiap generate. Naked `*.vercel.app` bukan “Nexus protected”.

| Lapisan | Nama | Target | Harga ilustrasi | Status kode |
| --- | --- | --- | --- | --- |
| **Entry** | **Channel Starter** | UMKM — website dari form + template | **~Rp 0–29rb/bulan** (validasi ≤20rb) | **Lab v0.1** — [`nexus-core/channel-starter/`](../channel-starter/) |
| **Tepi** | **Edge Shield** (`--tier tepi`) | Host map lab: portfolio + N slug (bukan mass CNAME) | ~Rp 35rb / 28rb (bukan 20 Kr) | **Lab MVP** — Caddy → WAF per Host; bukan setiap generate Starter |
| **Inti** | **Edge Antibody Cowork** (GaaS) | Kanal keuangan, fintech, integrator; upsell UMKM naik tier | Job **Rp 200rb** · Loop **Rp 300rb**/bulan (pilot PC+tunnel) | **Sudah ada** (lab + Job Cowork) |

```text
  UMKM (form → template → site)          Institusi / upsell
           │                                      │
           └────────── Channel Starter ──────────┘
                              │
                    [opsional] Edge Shield (`--tier tepi`, host map)
                              │
                    [opsional] Job Cowork
                              │
                    Edge Antibody Cowork (GaaS)
```

**Tim Nexus** boleh sekaligus **vendor GaaS**, **vendor Channel Starter**, dan **agensi/integrator** (build + deploy + Loop) — kontrak pisah: *site* vs *keamanan wasit*.

**Jangan** jual Loop GaaS penuh di harga Rp 20rb/bulan — unit ekonomi tidak balance (lihat [CHANNEL_STARTER.md](./CHANNEL_STARTER.md) §5).

---

## 2. Apa yang kami jual (bukan model langganan lama)

**Nexus Cyber** bukan lagi **multi-tenant WAF legacy** (self-serve, CNAME massal, portal pelanggan, langganan per kursi).

Model resmi: **GaaS (Generative Agent-as-a-Service)** — didefinisikan sebagai **bounded agentic managed service**: agen + mesin mengerjakan siklus **ukur → kendalikan → uji** di kanal web/API, dengan **otonomi terbatas** (L0/L1) dan **manusia pemilik risiko** yang mengesahkan aksi yang bisa merusak bisnis.

Nama produk: **Edge Antibody Cowork**.

| Bukan | Melainkan |
| --- | --- |
| Sewa software / kursi login | Hasil **Job** + loop berkala + jejak risiko |
| SOC otonom 24/7 | Tepi always-on + Job Cowork + operator internal |
| Pentest exploit | Wasit HTTP jinak + virtual patch di tepi |
| Klaim “anti zero-day” | Residual eksplisit + `replay_missed` = belum selesai |

Modul **`nexus-gaas-web/`** adalah pintu jual v1. Alur: **gerbang** (`/gate`: Login / Daftar / Tamu) → **pilih segmen** → form paket `/pesan/{sku}` → Kredit (isi ulang **satu pending** per identitas + debit Starter **20 Kr**, fail-closed). Nama SKU kartu pelanggan berbahasa Inggris (**Edge Shield**, **Header Shield**); isi jujur tetap header-only vs Reflex 1 host. Alias `/order` mengarah ke Starter UMKM. Tombol Isi = `POST /api/kredit/topup` (pending; **409** jika masih ada permintaan terbuka). Setelah Isi: Nomor DANA (default WA `62895603358692` / tampilan `0895 6033 58692`, `NEXUS_DANA_NUMBER` mengalahkan) + form bukti (`POST /api/kredit/topup/proof` → `proof_submitted`, berkas `data/topup-proofs/`); **Buka WhatsApp** setelah Kirim bukti. Kartu pelanggan tanpa nama env. Kredit masuk hanya setelah `POST /api/kredit/topup/approve` (loopback, `NEXUS_OPERATOR_SECRET`, atau UI `/operator/topup` **localhost** — identitas kartu = email/`Tamu · ORDER-`, bukan UUID). QRIS/VA milik pemilik **belum live**. Keran lab `POST /api/kredit/faucet` **hanya** jika `NEXUS_LEDGER_MODE=lab` **dan** `NEXUS_LAB_FAUCET=1` (bukan CTA beli; default mati). **Bukan** Midtrans/Stripe. F-10 roster penuh dan CNAME massal **legacy** tetap **ditunda**.

---

## 3. Masalah yang diselesaikan

Institusi keuangan dan kanal digital (ITSK, fintech, agensi web) mempercepat **inovasi layanan** (portal, API, onboarding). Setiap rilis menambah **risiko operasional dan siber** di permukaan HTTP.

Alat yang ada memecah siklus manajemen risiko:

| Alat | Berhenti di |
| --- | --- |
| Scanner / audit | PDF temuan — tidak membuktikan tepi menahan |
| WAF / Cloudflare | Blok — tidak membuktikan origin masih lemah |
| Copilot / chat AI | Saran — tidak ada verifikasi `replay_missed` |

**Celah:** tidak ada **loop tertutup** yang membuktikan: celah teridentifikasi → pengendalian terpasang → tembakan ulang masih ditahan → jejak untuk pemilik risiko.

Nexus GaaS mengisi irisan **identifikasi – pengendalian – pemantauan** untuk **kanal web/API** (bukan risiko kredit, pasar, likuiditas, atau GRC bank penuh).

---

## 4. Solusi: tiga alur

```text
  Alur A (terus-menerus)     Alur B (Job Cowork)           Alur C (artefak)
  ---------------------     -------------------           ----------------
  Trafik → WAF :8080          Tujuan + scope → wasit        Job selesai →
  Reflex + antibodi cache     → draft antibodi              tabel delta,
  → origin / 403              → gerbang L0/L1               status antibodi,
  Ban → Telegram              → vaccine + replay            residual,
                                                              persetujuan
```

### Alur A — Tepi always-on

Request masuk Host di peta (`PROTECTED_HOST` + `NEXUS_HOST_MAP`) → Reflex (regex) + antibodi cache → origin per Host atau 403. Insiden → pager Telegram (jika env diisi). **Sudah ada** di kode.

### Alur B — Job Cowork

Satu pekerjaan dengan tujuan, scope, dan status. Orkestrasi: recon → hygiene/access → defense delta → (opsional) pasang antibodi → vaccine-probe + replay → reporter.

**Sudah ada** orkestrasi di `NEX-RED/jobs/` + bridge `:3004` + sync PostgreSQL via control plane `:8081`. Agen HTTP bind ke listener WAF + `Host: {protected_host}` (tanpa file hosts); twin origin tetap `NEX_RED_ORIGIN_DIRECT`.

### Alur C — Artefak risiko

Output ke pemilik risiko kanal: apa yang terukur, apa yang dikendalikan, apa yang masih terbuka, siapa yang setuju. **Sudah ada** ekspor MD/JSON per Job (PG `cowork_jobs` + artefak kolom) dan digest insiden operator dari `threat_logs` per protected host (`GET /api/incidents/digest`). Bukan dashboard pelanggan.

---

## 5. Job Cowork — siklus hidup

| Status | Arti |
| --- | --- |
| `OPEN` | Job dibuka; scope dan izin HTTP jinak disetujui |
| `MEASURED` | Defense delta selesai; label wasit tercatat |
| `PENDING_APPROVAL` | Draft antibodi menunggu L0 (hanya artefak) atau L1 (pasang) |
| `VERIFYING` | vaccine-probe + replay berjalan |
| `CLOSED_OK` | `antibody_learned` atau semua temuan sudah `both_held` / `waf_blocked` dengan residual nol |
| `CLOSED_GAP` | Residual eksplisit (mis. `origin_open` yang sengaja dibiarkan, atau `replay_missed`) |
| `PARTIAL` | Satu agen gagal; Job ditutup jujur |

**Aturan produk:** Job **tidak** boleh `CLOSED_OK` jika ada `replay_missed` tanpa residual tertulis di `CLOSED_GAP`.

---

## 6. Otonomi terbatas (L0 / L1)

| Level | Mesin | Manusia |
| --- | --- | --- |
| **L0** | Ukur + lapor + draft antibodi | Setujui sebelum apa pun disentuh di produksi |
| **L1** | Pasang deny/antibodi di tepi + uji replay | Setujui kelas aksi; unban / DNS / disk tidak otonom |

Tidak ada L2 “tanpa manusia” untuk aksi irreversibel (DNS produksi, hapus data, expose SOC ke internet).

---

## 7. Label wasit (defense delta)

| Label | Arti untuk risiko |
| --- | --- |
| `origin_open` | Origin masih menerima; tepi belum menutup — risiko terbuka |
| `waf_blocked` | Tepi menahan; origin mungkin masih lemah |
| `both_held` | Keduanya menahan |
| `replay_held` | Setelah 403, tembakan ulang tetap ditahan |
| `replay_missed` | Pengendalian gagal uji — Job belum selesai |
| `antibody_learned` | Antibodi tersimpan dan replay tetap 403 |

Implementasi lab: NEX-RED + `GET /nexred/lab/antibody-signal`, `POST /nexred/lab/vaccine-probe` (control plane). Bukan proof-by-exploitation.

---

## 8. Cara jual

### 7.1 GaaS (inti)

| Paket | Isi | Bentuk |
| --- | --- | --- |
| **Job GaaS** | Satu siklus ukur→kendalikan→uji pada satu host | Proyek berbatas (48–72 jam) |
| **Loop GaaS** | Instance tetap + Job berkala (mingguan / per rilis) | Retainership |
| **On-prem instance** | Gateway di mesin klien + operasi Job | Lisensi + **Loop wajib** (B2G) — lihat [COWORK_B2G.md](./COWORK_B2G.md) |

### 7.2 Channel Starter (entry — lab v0.1)

| Paket | Isi | Ilustrasi |
| --- | --- | --- |
| **Starter** | Form lengkap → template Nexcent (4 palet) → subdomain lab `{slug}.nexus-lab.test` + publish Vercel per folder (jika token/login; bukan git Nexus) + **header tepi** (bukan WAF Reflex, bukan Job). Preview lab: `/preview/{slug}`; contoh git `sites/contoh-nexcent`. Lab kasir: **20 Kredit** | ~Rp 0–29rb/bulan · **lab:** 20 Kredit |
| **Edge Shield** (kartu portal; teknis `--tier tepi`) | Upsell `--tier tepi`: Caddy ke WAF + Reflex. **Menambah** host ke peta lab (portfolio tetap). Bukan setiap generate 20 Kr; bukan Job; bukan pulih Vercel; bukan `*.vercel.app` langsung. Portal: 35rb / 28rb. **Bukan** debit 20 Kr | ~Rp 35.000 / 28.000 · **bukan** Loop |
| **Usaha / Tepi / Cowork** | Upsell domain, tepi, Job | lihat [CHANNEL_STARTER.md](./CHANNEL_STARTER.md) |

**Kredit (lab sekarang):** unit kasir Channel Starter di `/pesan/{sku}` (Starter = `/pesan/umkm-starter`; `/order` redirect). **1 Kredit = Rp 1.000**. Starter = **20 Kredit**. Keran lab; generate fail-closed jika saldo kurang; gagal generate → refund. **Bukan** e-money, **bukan** jual Job 200 Kredit otomatis dari portal. CLI `channel-starter` tetap tanpa debit.

**Top-up IDR (lab, dikode):** Isi → pending → **nomor WhatsApp pemilik** + form bukti → operator **Konfirmasi isi** → Kredit masuk. QRIS/VA **belum live** di repo. **Bukan** PSP (Midtrans/Stripe). WhatsApp **bukan** auto-kredit dan **bukan** CTA kartu UMKM. Operator: `http://127.0.0.1:3003/operator/topup` (loopback PC, bukan URL tunnel; bukan SOC publik). UMKM–startup + Corporat hosted = form `/pesan/{sku}`.

Detail komersial: [`BRD.md`](./BRD.md), [`BUSINESS_AND_DEPLOYMENT_SCHEMES.md`](./BUSINESS_AND_DEPLOYMENT_SCHEMES.md).

---

## 9. Moat (mengapa bukan “saya buat sendiri di Cursor”)

| Moat | Penjelasan |
| --- | --- |
| **Jalur** | Instance sudah di depan origin; cabut = risiko kanal |
| **Wasit jujur** | `replay_missed` adalah status produk, bukan bug |
| **Memori imun host** | Riwayat antibodi/miss per hostname (PG + file) |
| **Jejak risiko** | Artefak siklus identifikasi–pengendalian–uji untuk pemilik risiko |

**Bukan moat:** model GGUF, PACS, MTD, UI SOC, nama “dual-brain”.

---

## 10. Ketahanan & inovasi keuangan (problem statement)

Dropdown kompetisi: **Penguatan Ketahanan dan Inovasi Keuangan → Manajemen Risiko**.

Kontribusi Nexus = irisan **risiko siber/operasional kanal digital**:

| Siklus manajemen risiko | Nexus GaaS |
| --- | --- |
| Identifikasi | Defense delta + pemeriksaan hygiene |
| Pengukuran | Label wasit (bukan VaR) |
| Pengendalian | Virtual patch antibodi di tepi (L1) |
| Pemantauan | Tepi always-on + Job berulang + pager |

Konteks regulasi (POJK 30/2025 risiko siber ITSK, ketahanan siber perbankan) = **pembingkai**, bukan klaim sertifikasi atau GRC lengkap.

---

## 11. Matriks implementasi (kode vs dokumen)

| Komponen | Status | Lokasi |
| --- | --- | --- |
| Gateway instance (`PROTECTED_HOST`) | Sudah ada | `nexus-core-gateway` |
| Reflex + antibodi cache | Sudah ada | `internal/ai/reflex_filter.go` |
| Defense delta | Sudah ada | NEX-RED `agents/verify/live.py` |
| Antibody loop (vaccine + replay) | Sudah ada | gateway lab handlers + NEX-RED |
| Agen recon / access / hygiene / reporter | Sudah ada | NEX-RED `agents/crew.py` |
| Telegram pager | Sudah ada (env) | gateway |
| Command Center / Operator GaaS Console | Sudah ada (GaaS-only; **Onboard** = origin + protected host; DNS/tunnel di luar SOC; tanpa Docker auto di UI operator; lab War Room/MTD/license dihapus) | `:8081` / `:3001` |
| Entitas Job + orkestrasi | **Sudah ada** | `NEX-RED/jobs/` + bridge `:3004` |
| Gerbang L0/L1 produk | **Sudah ada** | `PENDING_APPROVAL` + approve API/CLI |
| Ekspor artefak risiko | **Sudah ada** | `jobs/data/artifacts/*.md|json` + digest ThreatLog operator |
| Memori imun host persisten | **Sudah ada** | PG + file; `antibody_audits.job_id` opsional |
| Channel Starter (form→template) | **Lab v0.1** | `nexus-core/channel-starter/` (Milestone 18) |
| Edge Shield (`--tier tepi`) | **Lab MVP** | Caddy → `:8080` + Reflex judi/deface; 1 host; tanpa Job |
| Channel Portal legacy / F-10 | **Ditunda** | F-10 back-office |
| eBPF XDP nyata | **Stub** | `ebpf_stub.go` |

---

## 12. Dokumen terkait

| Dokumen | Peran |
| --- | --- |
| [`PRD.md`](./PRD.md) | Kebutuhan fitur GaaS + status |
| [`BRD.md`](./BRD.md) | Proposisi bisnis |
| [`BUSINESS_AND_DEPLOYMENT_SCHEMES.md`](./BUSINESS_AND_DEPLOYMENT_SCHEMES.md) | Skema Job / Loop / on-prem |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Stack + alur teknis |
| [`CAPABILITIES.md`](./CAPABILITIES.md) | Apa yang benar-benar jalan |
| [`CHANNEL_STARTER.md`](./CHANNEL_STARTER.md) | Lapisan entry UMKM (rencana) |
| [`DECISIONS_OPEN.md`](./DECISIONS_OPEN.md) | Keputusan bisnis — tanya pemilik |
| [`COWORK_B2B.md`](./COWORK_B2B.md) | GTM Job/Loop B2B (hosted) |
| [`COWORK_B2G.md`](./COWORK_B2G.md) | Pitching on-prem B2G — lisensi + Loop wajib; source tidak diserahkan |
| [`PRICING_UNIT_ECONOMICS.md`](./PRICING_UNIT_ECONOMICS.md) | Jual / COGS / margin per segmen (pilot) |
| [`DISTRIBUTION_PILOT.md`](./DISTRIBUTION_PILOT.md) | PC+tunnel tahap awal |
| [`NEXUS_CHANNEL_PORTAL.md`](./NEXUS_CHANNEL_PORTAL.md) | Pintu jual multi-segmen |
| [`LIMITATIONS.md`](./LIMITATIONS.md) | Apa yang tidak dijamin |

---

*Pivot GaaS 2026-08-22; strategi dua lapisan + Channel Starter 2026-08-22; B2G pitching 2026-08-23; lab target portofolio untuk agen 2026-08-23.*
