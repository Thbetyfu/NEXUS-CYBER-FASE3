# Nexus Channel Portal

**Produksi (Vercel):** repo **nexus-gaas-web** — [NEXUS-CYBER-WEBISTE-GaaS](https://github.com/Thbetyfu/NEXUS-CYBER-WEBISTE-GaaS), folder kerja opsional `D:\nexus-gaas-web`. Deploy dari **root** repo itu. Alternatif (discouraged): Connect FASE3 dengan Vercel **Root Directory `nexus-gaas-web`**. Owner (re)connect di dashboard; agen tidak mengklik UI Vercel. **Jangan** Connect `warung-*` ke FASE3.

**Lab (in-repo):** `cd nexus-gaas-web && npm run dev` · port **3003**. Generate (Node di PC) memakai **`CHANNEL_STARTER_URL=http://127.0.0.1:3010`**. Link preview browser = **`GET /starter`** dan **`GET /starter/preview/{slug}`** (rewrite/Caddy ke wizard; **bukan** catch-all mutate) atau `CHANNEL_STARTER_PUBLIC_URL` (hanya server / `channel-starter-urls.ts`, bukan `portal-config` klien). Lab copy dan `D:\nexus-gaas-web` **boleh drift**. Tata letak: [REPO_LAYOUT.md](./REPO_LAYOUT.md).

**Peran:** Pintu jual **satu situs**, multi-segmen — UMKM · Sekolah · Startup · **Corporat** · **Pemerintah**

---

## Alur pengunjung

```text
GET /starter + GET /starter/preview/{slug}  (publik — tanpa cookie; rewrite GET-only ke wizard :3010)
/gate  (Login / Daftar / Tamu — skip jika cookie sesi ada; **wajib** untuk etalase)
 └─ /  (hub: pilih segmen)
     ├─ /umkm        → sudah/belum punya web? → kartu → /pesan/{sku}
     ├─ /sekolah     → sama
     ├─ /startup     → sama
     ├─ /corporat    → hosted = /pesan/{sku} · on-prem = WhatsApp
     └─ /pemerintah  → WhatsApp (on-prem)
```

Alias redirect: `/institusi` → `/corporat` · `/b2g` → `/pemerintah` · `/cowork` → `/corporat` · `/order` → `/pesan/umkm-starter`. Isi Kredit: `/kredit` (beli/isi ulang pending, navbar chip +).

**Header Shield 15rb/20rb** = **header tepi + hostname lab**, bukan WAF. **Edge Shield 35rb/28rb** (kartu portal; teknis `--tier tepi`) = Reflex judi/deface lewat WAF, **satu** `PROTECTED_HOST` per lab, **bukan** Job, **bukan** pulih Vercel, **bukan** `*.vercel.app` langsung. **Demo A (aktif):** host WAF = **`portfolio.nexus-lab.test`** (bukan setiap warung, bukan Starter 20 Kr). Job/Loop = `/corporat` / `--tier cowork`.

Preview HTML shareable untuk **setiap slug** (bukan hanya `bu-grace`): `GET /starter` dan `GET /starter/preview/{slug}` di `:3003` **tanpa** login. Caddy/Next **tidak** mem-proxy `POST /starter/generate`, `POST /publish`, `POST /upsell`, atau `GET /starter/sites` ke FastAPI. `/gate` tetap wajib untuk hub/segmen/`/pesan`/`/kredit`. `/operator` dan approve Kredit **bukan** publik. `/starter/generate` dan `/starter/upsell` **bukan** path publik.

Form Starter: `/pesan/umkm-starter` (wajib: nama, WA usaha, kategori; cerita opsional). Tombol **Lihat teks** → `POST /api/local-llm/fill-starter` (**sesi** `nexus_portal_sid`, tanpa debit) menampilkan tagline/hero/tentang + sumber jujur (template kategori vs model lokal). Tanpa cookie → 401 / gerbang `/gate` (sama kelas dengan generate). Baru **Bayar 20 Kredit & buat site**. Gagal/timeout fill = template tetap tampil. Alamat, palet, dll. di **Lengkapi nanti**. Alias `/order`. Proxy generate (`Accept: application/json` atau `?format=json`; 303 → `POST /publish/{slug}`) ke `CHANNEL_STARTER_URL` loopback; preview HTML `/starter/preview/{slug}`. Generate memanggil `deploy_manifest` → `publish_site` (sama `python cli.py publish --slug`). UI sukses menampilkan URL Vercel atau **`publish gagal: set token di mesin wizard`**. Retry: `POST /api/channel-starter/publish` `{ slug }` (sesi pelanggan, bukan publik). Token/`vercel login` **hanya di PC wizard**. **Jangan** Connect Git **NEXUS-CYBER-FASE3** ke project Vercel warung. `*.vercel.app` **bukan** WAF. Starter 20 Kr **bukan** Edge Shield; jangan upsell `--tier tepi` massal tiap slug. Slug hasil generate klien **tidak** ikut git; demo `sites/contoh-nexcent` ikut.

| Status website | UMKM / Sekolah | Startup |
| --- | --- | --- |
| Belum | Rp 20rb Website Starter UMKM (header tepi) · Rp 35rb **Edge Shield (shared lab host)** | Rp 45rb **Landing + Header Shield** · Rp 75rb **Landing + Edge Shield (Alur A)** · Job 200rb |
| Sudah | Rp 15rb **UMKM/School Header Shield** · Rp 28rb **Edge Shield (shared lab host)** | Rp 75rb **Startup Edge Shield** · Job 200rb · Loop 300rb |

| Corporat deploy | Paket |
| --- | --- |
| Hosted | Job 200rb · Loop 300rb · Custom |
| On-prem (besar) | Edge 18jt/thn · Loop 3,5jt/bln · Custom (sama model Pemerintah) |

Distribusi pilot: [DISTRIBUTION_PILOT.md](./DISTRIBUTION_PILOT.md).  
On-prem pitching: [COWORK_B2G.md](./COWORK_B2G.md). Unit ekonomi: [PRICING_UNIT_ECONOMICS.md](./PRICING_UNIT_ECONOMICS.md).

| Langkah | Komponen |
| --- | --- |
| Marketing per segmen | route di atas |
| Form onboarding website | `/pesan/umkm-starter` (alias `/order`) + API channel-starter |
| Deploy tahap pilot | PC 24/7 + tunnel |
| Upsell Cowork Corporat | `/corporat` (hosted) atau `/startup` |
| Pitch on-prem Pemerintah / Corporat besar | `/pemerintah` atau `/corporat` → On-prem |

---

## Pilot luar rumah (storefront HTTPS)

Bukan produksi GaaS, bukan 100 host WAF. PC 24/7 + Cloudflare Tunnel ke **Channel Portal saja**.

### Env (`nexus-gaas-web/.env.local`)

| Variabel | Lab satu PC | Pilot publik (HP) |
| --- | --- | --- |
| `CHANNEL_STARTER_URL` | `http://127.0.0.1:3010` | sama (Node di PC) |
| `CHANNEL_STARTER_PUBLIC_URL` | kosong → `/starter` atau `http://127.0.0.1:3010` | `/starter` (satu tunnel `:3003`) |
| `NEXUS_LEDGER_MODE` | `lab` | `live` |
| `NEXUS_LAB_FAUCET` | `1` jika uji keran | `0` |
| `NEXUS_PORTAL_PUBLIC_HOST` | — | hostname trycloudflare (opsional, Next `allowedDevOrigins`) |
| `NEXUS_DANA_NUMBER` | opsional; kosong = nomor WA publik `0895 6033 58692` | sama; label opsional `NEXUS_DANA_LABEL` |
| `NEXUS_LOCAL_LLM_URL` | `http://127.0.0.1:11434` | sama — **jangan** URL publik; Node fetch health + fill saja |
| `NEXUS_LOCAL_LLM_MODEL` | `gemma3:1b` | tag tulis kecil; **bukan** `nex-ai-protect` / `nex-ai-reflex` |

Portal di **Vercel** = **etalase copy**. Generate, fill LLM (`:11434`), dan `/operator` **tetap di PC 24/7**. Jangan `CHANNEL_STARTER_URL` ke laptop. Runtime Vercel tidak fetch Ollama (termasuk loopback). Hostname publik named butuh **zona Cloudflare milik pemilik** (belum ada) — jangan mengarang domain. Rewrite `/starter` ke loopback **tidak** jalan di Vercel.

### Start

1. `cd nexus-core/channel-starter` → `python cli.py serve` (`:3010`)
2. `cd nexus-gaas-web` → salin `.env.local.example` → `npm run dev` (`:3003`)
3. Tunnel storefront: `nexus-core\deploy-local\START-PORTAL-PILOT.bat` atau `nexus-tunnel.ps1 -Portal`
4. **Juri / WAF portofolio** (terpisah): `START.bat` + `nexus-tunnel.ps1` (default `:80`). Hostname Caddy `portal.nexus-lab.test` / `starter.nexus-lab.test` jika named tunnel ke Caddy.

### Uji HP (data seluler)

`/gate` → daftar → `/kredit` Isi (satu permintaan terbuka) → Nomor DANA (default WA publik, env mengalahkan) + unggah bukti + Kirim bukti → **Buka WhatsApp** (setelah submit) → di **PC** buka `http://127.0.0.1:3003/operator/topup` → `/pesan/umkm-starter` generate. Preview: `https://<tunnel>/starter/preview/{slug}`.

Operator `/operator/topup` **bukan** lewat Host publik (trycloudflare = 404 kosong). Approve hanya `http://127.0.0.1:3003/operator/topup` atau `http://localhost:3003/operator/topup` di PC (Next.js mengirim XFF IPv4-mapped loopback). Antrian: `.operator-topup-id` = **email** (label Email) atau nama+email jika `displayName`/`name` tersimpan; tamu = **Tamu · ORDER-xxxxxxxx**. UUID wallet hanya `title` / span redup, bukan baris utama. HTML SSR di loopback. Sleep Windows OFF. `cloudflared tunnel login` + named hostname = tugas pemilik (bukan agen).

### Runtime model tulis (langkah 4 — lihat teks dulu, bukan debit)

Ollama di PC operator, bind **`127.0.0.1:11434`**. Bukan pengganti NEX-AI WAF (`nex-ai-protect` / `nex-ai-reflex`). HP **tidak** menembak `:11434`.

| | |
| --- | --- |
| Start | `nexus-core\deploy-local\START-LOCAL-LLM.bat` (`OLLAMA_HOST=127.0.0.1:11434`, pull `gemma3:1b` jika belum) |
| URL | `NEXUS_LOCAL_LLM_URL=http://127.0.0.1:11434` di `nexus-gaas-web/.env.local` (gitignore) |
| Model | `NEXUS_LOCAL_LLM_MODEL=gemma3:1b` (default). **Dilarang** tag `nex-ai-protect` / `nex-ai-reflex` / 70B |
| Health | Server: `GET /api/local-llm/health` → fetch `GET {url}/api/tags` |
| Fill | Server: `POST /api/local-llm/fill-starter` `{ name, category, whatsapp, story }` → JSON slots (tagline, hero, about_body, cta_label, hours, description). **Sesi portal wajib** (cookie `nexus_portal_sid`; 401 `Sesi diperlukan` jika tidak). Rate limit. Bukan HTML. Timeout ~25s → `{ usedFallback: true, …preset kategori }`. URL bukan loopback → 503, tidak fetch. **Tidak** debit 20 Kr. Bukan NEX-AI WAF. |
| Klien | **Lihat teks** → portal `/api/local-llm/fill-starter` (bukan `:11434`). Tamu/akun setelah `/gate` sudah punya cookie. Tampilkan tagline/hero/tentang + `usedFallback`. **Bayar 20 Kredit & buat site** = generate+debit. Fill gagal tetap template. |
| Tunnel | **Jangan.** `START-PORTAL-PILOT.bat` tidak membuka `:11434`. `nexus-tunnel.ps1` menolak port itu. |

---


## Pembayaran

- **IDR (kontak on-prem):** WhatsApp `62895603358692` — *Saya mau beli Nexus Cyber!!* (**chat**, bukan payment gateway). **Hanya** Corporat **On-prem** + **Pemerintah**. Bukan DANA webhook.
- **Kredit (kasir v0, jalur beli utama):** UMKM / sekolah / startup dan Corporat **hosted** = **form paket** `/pesan/{sku}` — bukan dump `/order`, bukan “Pesan via WhatsApp” di kartu. Harga kartu = **Kr** (setara Rp, 1 Kr = Rp 1.000). Starter = **20 Kr** generate fail-closed. Sesi **tamu** (cookie httpOnly `nexus_portal_sid` setelah `/gate`) atau **akun**. **Isi** = `POST /api/kredit/topup` (satu pending/`proof_submitted` per identitas; **409** jika sudah ada). Kartu awam = Nomor DANA (default nomor WA publik) → bukti gambar/PDF → Kirim bukti → tombol **Buka WhatsApp** (pesan pendek, bukan URL wa.me); tanpa nama env ke pelanggan. Saldo **tidak** naik sampai `POST /api/kredit/topup/approve` atau UI `/operator/topup` (loopback). Keran `POST /api/kredit/faucet` hanya lab opt-in (`NEXUS_LEDGER_MODE=lab` + `NEXUS_LAB_FAUCET=1`). Navbar: segmen + **saldo Kredit** + plus → `/kredit`; tanpa Masuk/Daftar di nav; tanpa ORDER-id di nav.
- **Akun v0:** gerbang `/gate` (Login → `/masuk`, Daftar → `/daftar`, Tamu). Cookie sesi = lewati gerbang. Bukan SSO. Bukan operator `:3001`. Daftar dari tamu memindahkan Kredit + pending isi ulang.
- **Top-up IDR:** pending + Nomor DANA env + form bukti (`data/topup-proofs/`) + WhatsApp `62895603358692` **setelah** Kirim bukti + approve operator **sudah** di kode lab. Email bukti opsional (`nodemailer` di `package.json`, SMTP env). **QRIS/VA milik pemilik belum live**. **Bukan** billing produksi. **Bukan** Midtrans/Stripe. WhatsApp isi ulang **bukan** CTA beli paket UMKM. Operator localhost `/operator/topup` — bukan SOC `:3001`.
- **Bukan:** beli Job Cowork **200 Kr self-serve** dari kasir Starter. Job hosted = form `/pesan/corporat-job` + operator. **Bukan** F-10 roster. **Bukan** Loop/Job otomatis di Starter 20 Kr. **Bukan** debit 20 Kr untuk Edge Shield. **Jangan klaim 100 UMKM di belakang WAF.**

---

## Warisan desain

UI Slate & Indigo (Notion-style) dari portal legacy — **semua copy & backend diganti** selaras [PRODUCT_MODEL.md](./PRODUCT_MODEL.md).

Portal legacy submodule **digantikan** folder **`nexus-gaas-web/`** (lab di FASE3). Situs jual publik = repo GaaS terpisah, bukan submodule.

---

*2026-09-03 — funnel `/starter` + preview semua slug publik; Starter ≠ Edge Shield; jangan Connect FASE3 ke warung*
