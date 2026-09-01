# Nexus Channel Portal

**Produksi (Vercel):** repo **nexus-gaas-web** — [NEXUS-CYBER-WEBISTE-GaaS](https://github.com/Thbetyfu/NEXUS-CYBER-WEBISTE-GaaS), folder kerja opsional `D:\nexus-gaas-web`. Deploy dari **root** repo itu. Alternatif (discouraged): Connect FASE3 dengan Vercel **Root Directory `nexus-gaas-web`**. Owner (re)connect di dashboard; agen tidak mengklik UI Vercel. **Jangan** Connect `warung-*` ke FASE3.

**Lab (in-repo):** `cd nexus-gaas-web && npm run dev` · port **3003**. Generate tetap butuh Channel Starter **`:3010`** (`CHANNEL_STARTER_URL=http://127.0.0.1:3010`). Lab copy dan `D:\nexus-gaas-web` **boleh drift**. Tata letak: [REPO_LAYOUT.md](./REPO_LAYOUT.md).

**Peran:** Pintu jual **satu situs**, multi-segmen — UMKM · Sekolah · Startup · **Corporat** · **Pemerintah**

---

## Alur pengunjung

```text
/gate  (Login / Daftar / Tamu — skip jika cookie sesi ada)
 └─ /  (hub: pilih segmen)
     ├─ /umkm        → sudah/belum punya web? → kartu → /pesan/{sku}
     ├─ /sekolah     → sama
     ├─ /startup     → sama
     ├─ /corporat    → hosted = /pesan/{sku} · on-prem = WhatsApp
     └─ /pemerintah  → WhatsApp (on-prem)
```

Alias redirect: `/institusi` → `/corporat` · `/b2g` → `/pemerintah` · `/cowork` → `/corporat` · `/order` → `/pesan/umkm-starter`. Isi Kredit: `/kredit` (beli/isi ulang pending, navbar chip +).

**Header Shield 15rb/20rb** = **header tepi + hostname lab**, bukan WAF. **Edge Shield 35rb/28rb** (kartu portal; teknis `--tier tepi`) = Reflex judi/deface lewat WAF, **satu** `PROTECTED_HOST` per lab, **bukan** Job, **bukan** pulih Vercel, **bukan** `*.vercel.app` langsung. Job/Loop = `/corporat` / `--tier cowork`.

| Status website | UMKM / Sekolah | Startup |
| --- | --- | --- |
| Belum | Rp 20rb Website Starter UMKM (header tepi) · Rp 35rb **Edge Shield (shared lab host)** | Rp 45rb **Landing + Header Shield** · Rp 75rb **Landing + Edge Shield (Alur A)** · Job 200rb |
| Sudah | Rp 15rb **UMKM/School Header Shield** · Rp 28rb **Edge Shield (shared lab host)** | Rp 75rb **Startup Edge Shield** · Job 200rb · Loop 300rb |

| Corporat deploy | Paket |
| --- | --- |
| Hosted | Job 200rb · Loop 300rb · Custom |
| On-prem (besar) | Edge 18jt/thn · Loop 3,5jt/bln · Custom (sama model Pemerintah) |

Form Starter: `/pesan/umkm-starter` (hero, layanan, angka, galeri URL, 4 palet Figma). Alias `/order`. Proxy generate membaca `Location` `/preview/{slug}` atau `/sites/{slug}`; preview HTML di wizard `:3010`. Generate men-deploy folder situs ke Vercel jika token/login di mesin wizard (bukan git monorepo). Slug hasil generate klien **tidak** ikut git; demo `sites/contoh-nexcent` ikut.  
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

## Pembayaran

- **IDR (kontak on-prem):** WhatsApp `62895603358692` — *Saya mau beli Nexus Cyber!!* (**chat**, bukan payment gateway). **Hanya** Corporat **On-prem** + **Pemerintah**. Bukan DANA webhook.
- **Kredit (kasir v0, jalur beli utama):** UMKM / sekolah / startup dan Corporat **hosted** = **form paket** `/pesan/{sku}` — bukan dump `/order`, bukan “Pesan via WhatsApp” di kartu. Harga kartu = **Kr** (setara Rp, 1 Kr = Rp 1.000). Starter = **20 Kr** generate fail-closed. Sesi **tamu** (cookie httpOnly `nexus_portal_sid` setelah `/gate`) atau **akun**. **Isi** = `POST /api/kredit/topup` (pending); nomor WA + `wa.me` + form bukti; saldo **tidak** naik sampai `POST /api/kredit/topup/approve` atau UI `/operator/topup` (loopback). Keran `POST /api/kredit/faucet` lab sekunder (`NEXUS_LAB_FAUCET`). Navbar: segmen + **saldo Kredit** + plus → `/kredit`; tanpa Masuk/Daftar di nav; tanpa ORDER-id di nav.
- **Akun v0:** gerbang `/gate` (Login → `/masuk`, Daftar → `/daftar`, Tamu). Cookie sesi = lewati gerbang. Bukan SSO. Bukan operator `:3001`. Daftar dari tamu memindahkan Kredit + pending isi ulang.
- **Top-up IDR:** pending + WhatsApp `62895603358692` + form bukti (`data/topup-proofs/`) + approve operator **sudah** di kode lab. **QRIS/VA milik pemilik belum live**. **Bukan** billing produksi. **Bukan** Midtrans/Stripe. WhatsApp isi ulang **bukan** CTA beli paket UMKM. Operator localhost `/operator/topup` — bukan SOC `:3001`.
- **Bukan:** beli Job Cowork **200 Kr self-serve** dari kasir Starter. Job hosted = form `/pesan/corporat-job` + operator. **Bukan** F-10 roster. **Bukan** Loop/Job otomatis di Starter 20 Kr. **Bukan** debit 20 Kr untuk Edge Shield.

---

## Warisan desain

UI Slate & Indigo (Notion-style) dari portal legacy — **semua copy & backend diganti** selaras [PRODUCT_MODEL.md](./PRODUCT_MODEL.md).

Portal legacy submodule **digantikan** folder **`nexus-gaas-web/`** (lab di FASE3). Situs jual publik = repo GaaS terpisah, bukan submodule.

---

*2026-09-01 — alur linear `/pesan/{sku}`; WhatsApp hanya on-prem; `/order` alias*
