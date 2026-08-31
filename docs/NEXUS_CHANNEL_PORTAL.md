# Nexus Channel Portal

**Produksi (Vercel):** repo **nexus-gaas-web** — [NEXUS-CYBER-WEBISTE-GaaS](https://github.com/Thbetyfu/NEXUS-CYBER-WEBISTE-GaaS), folder `D:\nexus-gaas-web`. Deploy dari **root** repo itu. Owner (re)connect project Vercel di dashboard; agen tidak mengklik UI Vercel. **Jangan** Connect `warung-*` ke FASE3.

**Lab (masih di nexus-core):** `nexus-channel-portal/` · port **3003** — salinan sampai cutover. Generate tetap `CHANNEL_STARTER_URL=http://127.0.0.1:3010`. Tata letak: [REPO_LAYOUT.md](./REPO_LAYOUT.md).

**Peran:** Pintu jual **satu situs**, multi-segmen — UMKM · Sekolah · Startup · **Corporat** · **Pemerintah**

---

## Alur pengunjung

```text
/  (hub: pilih segmen — hero + alur + daftar peran)
 ├─ /umkm        → tanya punya website? → harga cabang belum/sudah
 ├─ /sekolah     → sama (copy sekolah)
 ├─ /startup     → sama (landing vs tepi/Job)
 ├─ /corporat    → tanya Hosted vs On-prem (besar) → harga cabang
 └─ /pemerintah  → on-prem Edge + Loop wajib (tanpa kuis; source tidak termasuk)
```

Alias redirect: `/institusi` → `/corporat` · `/b2g` → `/pemerintah` · `/cowork` → `/corporat`.

**Pagar 15rb/20rb** = **header tepi + hostname lab**, bukan WAF. **Pagar tipis 35rb/28rb** = Reflex judi/deface lewat WAF (`--tier tepi`), **satu** `PROTECTED_HOST` per lab, **bukan** Job, **bukan** pulih Vercel, **bukan** `*.vercel.app` langsung. Job/Loop = `/corporat` / `--tier cowork`.

| Status website | UMKM / Sekolah | Startup |
| --- | --- | --- |
| Belum | Rp 20rb Website Starter (header tepi) · Rp 35rb **Pagar tipis** (tepi shared, 1 host lab) | Rp 45rb landing+pagar (**header tepi**, bukan WAF) · Rp 75rb **Tepi Alur A** (Reflex, `--tier tepi`, 1 host lab, bukan Job, bukan alert Telegram pelanggan) · Job 200rb |
| Sudah | Rp 15rb pagar header · Rp 28rb **Pagar tipis** (tepi shared, 1 host lab) | Rp 75rb **Tepi Alur A** (1 host lab, mesin pagar tipis) · Job 200rb · Loop 300rb |

| Corporat deploy | Paket |
| --- | --- |
| Hosted | Job 200rb · Loop 300rb · Custom |
| On-prem (besar) | Edge 18jt/thn · Loop 3,5jt/bln · Custom (sama model Pemerintah) |

Form data site: `/order` (form lengkap: hero, layanan, angka, galeri URL, 4 palet Figma). Proxy generate membaca `Location` `/preview/{slug}` atau `/sites/{slug}`; preview HTML di wizard `:3010`. Generate men-deploy folder situs ke Vercel jika token/login di mesin wizard (bukan git monorepo). Slug hasil generate klien **tidak** ikut git; demo `sites/contoh-nexcent` ikut.  
Distribusi pilot: [DISTRIBUTION_PILOT.md](./DISTRIBUTION_PILOT.md).  
On-prem pitching: [COWORK_B2G.md](./COWORK_B2G.md). Unit ekonomi: [PRICING_UNIT_ECONOMICS.md](./PRICING_UNIT_ECONOMICS.md).

| Langkah | Komponen |
| --- | --- |
| Marketing per segmen | route di atas |
| Form onboarding website | `/order` + API channel-starter |
| Deploy tahap pilot | PC 24/7 + tunnel |
| Upsell Cowork Corporat | `/corporat` (hosted) atau `/startup` |
| Pitch on-prem Pemerintah / Corporat besar | `/pemerintah` atau `/corporat` → On-prem |

---

## Pembayaran

- **IDR (kontak):** WhatsApp `62895603358692` — *Saya mau beli Nexus Cyber!!* (**chat**, bukan payment gateway)
- **Kredit (kasir v0):** unit **Kredit** di `/order` — 1 Kr = Rp 1.000; Starter = **20 Kr**. Sesi **tamu** (cookie httpOnly `nexus_portal_sid`, UUID) atau **akun** (email + scrypt). Keran `POST /api/kredit/faucet` dan generate memakai **ledger identitas itu**, bukan satu wallet `lab` untuk semua browser. Generate menolak jika saldo di bawah 20 Kr (HTTP 402); gagal upstream → refund. Kode `ORDER-xxxx` di `/order` dan teks WA (cocokkan TF nanti). Halaman `/order` **tidak** memakai Framer Motion `opacity: 0`. Logo: `public/brand/nexus-kredit.svg`.
- **Akun v0:** `/masuk` `/daftar` / “Lanjut sebagai tamu”. Boleh telusur `/` `/umkm` tanpa login. Bukan SSO; tamu hilang jika cookie dihapus. Bukan login operator `:3001`. Daftar dari tamu memindahkan Kredit tamu ke akun.
- **Top-up IDR (disepakati, belum dikode):** **QRIS milik pemilik** dan/atau **VA bank milik pemilik** → bukti transfer → operator **approve** jika bukti aman → Kredit masuk. **Bukan** Midtrans, Stripe, atau PSP pihak ketiga.
- **Bukan:** beli Job Cowork 200 Kr dari portal. **Bukan** F-10 roster. **Bukan** Connect Git monorepo ke project warung. **Bukan** Loop/Job otomatis di Starter 20 Kr. **Bukan** debit 20 Kr untuk Pagar tipis.

---

## Warisan desain

UI Slate & Indigo (Notion-style) dari portal legacy — **semua copy & backend diganti** selaras [PRODUCT_MODEL.md](./PRODUCT_MODEL.md).

Portal legacy submodule **digantikan** modul **`nexus-channel-portal/`** (lab di FASE3). Situs jual publik = repo GaaS terpisah, bukan submodule.

---

*2026-09-01 — akun pelanggan v0 (tamu/daftar/masuk); Kredit per identitas*
