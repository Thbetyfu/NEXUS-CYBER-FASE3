# Channel Starter — Website Template UMKM (Lapisan Entry)

**Versi:** 0.1.0 / 2026-08-22  
**Status:** **Lab v0.1** — generator form→template ada di `nexus-core/channel-starter/`; billing & deploy produksi **belum**.  
**Induk strategi:** [PRODUCT_MODEL.md](./PRODUCT_MODEL.md) § Lapisan produk.

---

## 1. Tujuan

Menyediakan **kanal web siap pakai** untuk UMKM dengan harga yang **validasi pasar toleransi ~Rp 20.000/bulan**, tanpa menjanjikan Job Cowork / wasit GaaS penuh di tier ini.

Channel Starter = **funnel acquisition** + integrator mandiri (tim Nexus juga boleh jadi agensi). Upsell ke **Edge Antibody Cowork** (Loop GaaS) untuk yang butuh bukti risiko.

---

## 2. Prinsip produk

| Prinsip | Implementasi target |
| --- | --- |
| **Bukan LLM berat** | Form wizard → merge ke template (rule-based); copy preset per kategori |
| **Template seragam** | 3–5 layout (toko, jasa, koperasi ringan, profil UMKM) |
| **End-to-end otomatis** | Deploy shared infra; minim sentuhan manusia per pelanggan |
| **Jujur harga** | Rp ~20rb = website Nexcent + domain lab + **header tepi** (bukan WAF Reflex / Job); wasit Job = paket terpisah |

---

## 3. Alur pelanggan (target)

```text
Form (nama, kategori, WA, alamat, jam, foto URL, 4 warna, layanan, angka, domain kustom opsional)
  → Generator (JSON → template Nexcent)
  → Deploy lab `{slug}.nexus-lab.test` + publish folder situs ke Vercel (jika token/login; **bukan** git monorepo)
  → Site live (HTTP lab / HTTPS jika domain publik di-CNAME operator)
  → [Opsional] upsell Pagar tipis `--tier tepi` (`gaas_active`, **tambah** ke host map; portfolio tetap) — **bukan** Starter 20rb, **bukan** Job
  → [Opsional] `--tier cowork` = Job jika bridge hidup
```

---

## 4. Paket ilustrasi (bukan kontrak — lihat [DECISIONS_OPEN.md](./DECISIONS_OPEN.md))

| Paket | Isi | Harga ilustrasi/bulan | Job Cowork |
| --- | --- | --- | --- |
| **Starter** | Subdomain lab `{slug}.nexus-lab.test`, template Nexcent, 4 palet, Caddy `file_server` **atau** folder Vercel + **header tepi saja** (nosniff, `X-Frame-Options DENY`, Referrer-Policy, CSP `script-src 'none'`). **Bukan** WAF Reflex, **bukan** Job, **bukan** restore template | **Rp 0–29.000** | Tidak |
| **Edge Shield** | Site (jika belum) + Caddy ke WAF + Reflex judi/deface. Host map lab (portfolio + slug). **Bukan** Job, **bukan** pulih Vercel, **bukan** `*.vercel.app` langsung, **bukan** auto dari generate 20 Kr | **Rp 35.000** belum / **Rp 28.000** sudah — `/umkm` `/sekolah` | Tidak |
| **Usaha** | Domain sendiri, halaman tambahan, SEO dasar | **Rp 49.000–99.000** | Tidak |
| **Tepi (GaaS)** | Sama mesin pagar tipis + Alur A (Reflex + ban tepi). Portal **Startup Rp 75.000** = kartu ini di lab 1 host (`--tier tepi`). **Bukan** Job, **bukan** alert Telegram ke pelanggan (pager ban = operator lab). Baris 149–299rb = ilustrasi lama, bukan kartu `/startup` | **Rp 75.000** portal `/startup` · ilustrasi lama **Rp 149.000–299.000** | Tidak |
| **Cowork (pilot)** | + Job/Loop + artefak risiko | **Rp 200.000** (Job) / **Rp 300.000**/bln (Loop) — jalur `/corporat` (alias `/institusi`, `/cowork`) | Ya |
| **UMKM bundel** | Website Starter 20rb = header tepi. **Edge Shield** = kartu 35rb (bukan debit 20 Kr) | **Rp 20.000**/bln; Edge Shield **Rp 35.000** | Tidak |

**Domain** (± Rp 150–200rb/tahun) — **disarankan terpisah** dari Starter Rp 20rb.

**Self-heal pin** tidak merestorasi origin Vercel. Jangan jual restore file sebagai isi pagar tipis.

---

## 5. Unit ekonomi (internal)

Agar Starter ~Rp 20rb **mungkin** (tipis):

- Hosting **multi-tenant** shared (satu VPS / edge banyak situs)
- **Tanpa** operator Job per pelanggan
- **Tanpa** domain included
- Support = FAQ + form; bukan chat unlimited
- Perubahan desain = edit form ulang, bukan custom design

**Tidak feasible:** Starter Rp 20rb **plus** Loop GaaS + operator + wasit NEX-RED.

---

## 6. Peran tim Nexus sebagai integrator

Tim Nexus **boleh** sekaligus:

1. **Vendor Channel Starter** (form + template + deploy)  
2. **Vendor GaaS** (Job/Loop di host yang sama)  
3. **Agensi/integrator** (build + maintenance kanal untuk klien keuangan / UMKM naik tier)

Kontrak pisah: **dev/site** vs **Loop keamanan** — deliverable Job tetap wajib di paket Cowork.

---

## 7. Status kode

| Komponen | Status |
| --- | --- |
| Form wizard pelanggan | **Lab v0.1** — `nexus-core/channel-starter/channel_starter/server.py` + `cli.py serve` |
| Template engine (layout Nexcent) | **Lab v0.1** — satu layout Figma (`templates/_base.html`) + preset `fnb` / `jasa` / `profil`; 4 palet `hijau` `biru` `navy` `hutan` |
| Deploy otomatis multi-tenant | **Lab siap** — Caddy import + `hosts-registry.json` + `deploy-local` mount; VPS wildcard **belum** |
| Portal kasir Starter | **Portal v0.1** — gerbang `/gate`; form pendek `/pesan/umkm-starter` (**Lihat teks** tanpa debit → **Bayar 20 Kr** fail-closed; fill `gemma3:1b` loopback, fallback preset). `/order` redirect. `/kredit` = pending + WA + form bukti. Approve `/operator/topup` (localhost). QRIS/VA **belum live**. Keran lab opt-in. Bukan PSP. Bukan CTA WA di kartu paket |
| Lab portofolio (Vercel di belakang WAF) | Referensi UX unggah/vault — **bukan** produk Channel Starter. Folder `playground/` diarsip |

Mesin GaaS (gateway, NEX-RED, Job Cowork) **sudah ada** — dipakai di paket **Cowork**. **Edge Shield** memakai Reflex WAF yang sama, **tanpa** menjalankan Job.

### Quick start (lab)

```powershell
cd nexus-core\channel-starter
pip install -r requirements.txt
python cli.py generate --name "Warung Bu Siti" --category fnb --whatsapp 081234567890 --theme hijau
python cli.py serve
```

Form: http://127.0.0.1:3010/ · Preview: `/preview/{slug}` (HTML). Browser form POST = 303 ke preview. Portal (`Accept: application/json` atau `?format=json`) = JSON + hasil `publish_site`. Kalau wizard masih 303, portal `POST /publish/{slug}` supaya pesan token jujur. `POST /publish/{slug}` = `python cli.py publish --slug`. Restart `START-PREVIEW.bat` jika `/publish/{slug}` 404.

**Vercel:** generate men-deploy **folder situs** (`sites/{slug}`) ke project Vercel bernama slug jika `vercel login` / `VERCEL_TOKEN` ada di **mesin wizard** (`channel-starter/.env`, gitignore — restart `python cli.py serve` setelah isi token). Tanpa token: skip jujur (`publish gagal: set token di mesin wizard`). Cangkang lama `warung-bu-siti` *No Production Deployment* = *link* tanpa `--prod`. `python cli.py publish --slug …` / `--all`. **Jangan** Connect Git **NEXUS-CYBER-FASE3** (atau monorepo Nexus) ke project warung. Hosting `*.vercel.app` **bukan** WAF / Edge Shield. Preview lab: portal `GET /starter/preview/{slug}` (publik, setiap slug). Mutate wizard (`POST /generate`, publish, upsell, `GET /sites`) **bukan** lewat Caddy/Next publik — hanya loopback `:3010` atau portal `POST /api/channel-starter/*`.

### Deploy subdomain (lab)

```powershell
python cli.py deploy apply
cd D:\NEXUS\nexus-core\deploy-local
.\START.bat    # Administrator — tulis hosts + mount Caddy
```

Buka: `http://{slug}.nexus-lab.test` (contoh `http://warung-bu-siti.nexus-lab.test`)

### Edge Shield — Tepi tanpa Job

```powershell
python cli.py upsell enable --slug warung-bu-siti --tier tepi
cd D:\NEXUS\nexus-core\deploy-local
docker compose up -d gateway channel-origin
python ..\channel-starter\cli.py deploy apply --reload
```

Satu `PROTECTED_HOST` aktif per lab. Site upsell lewat WAF gateway; origin statis di `channel-origin:8099`. **Tidak** membuat Job NEX-RED. Scan/demo lewat Host lab, bukan `*.vercel.app`.

### Upsell Cowork (S-6, Job)

```powershell
python cli.py upsell enable --slug warung-bu-siti --tier cowork
cd D:\NEXUS\nexus-core\deploy-local
docker compose up -d gateway channel-origin
python ..\channel-starter\cli.py deploy apply --reload
```

Job Cowork otomatis jika NEX-RED bridge `:3004` hidup (`--tier cowork`). `--no-job` menonaktifkan; `--job` memaksa Job pada `tepi`.

---

## 8. Dokumen terkait

| Dokumen | Peran |
| --- | --- |
| [PRODUCT_MODEL.md](./PRODUCT_MODEL.md) | Dua lapisan produk |
| [BRD.md](./BRD.md) | Segment & positioning |
| [BUSINESS_AND_DEPLOYMENT_SCHEMES.md](./BUSINESS_AND_DEPLOYMENT_SCHEMES.md) | Skema deploy |
| [DECISIONS_OPEN.md](./DECISIONS_OPEN.md) | Keputusan belum final — **tanya pemilik** |
| [LIMITATIONS.md](./LIMITATIONS.md) | Apa yang tidak dijanjikan di Rp 20rb |

---

*Channel Starter — lab v0.1. Jangan klaim billing produksi selesai: QRIS/VA milik pemilik belum live; Isi = pending, bukan settlement IDR; keran lab ≠ tombol beli.*
