# Channel Starter — Website Template UMKM (Lapisan Entry)

**Versi:** 0.1.0 / 2026-08-22  
**Status:** **Lab v0.1** — generator form→template ada di `channel-starter/`; billing & deploy produksi **belum**.  
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
| **Jujur harga** | Rp ~20rb = website Nexcent + domain lab + header tepi; wasit Job = paket terpisah |

---

## 3. Alur pelanggan (target)

```text
Form (nama, kategori, WA, alamat, jam, foto URL, 4 warna, layanan, angka, domain kustom opsional)
  → Generator (JSON → template Nexcent)
  → Deploy (subdomain lab `{slug}.nexus-lab.test` + `vercel.json`)
  → Site live (HTTP lab / HTTPS jika domain publik di-CNAME operator)
  → [Opsional] upsell Loop GaaS / tepi WAF gateway (satu PROTECTED_HOST per lab)
```

---

## 4. Paket ilustrasi (bukan kontrak — lihat [DECISIONS_OPEN.md](./DECISIONS_OPEN.md))

| Paket | Isi | Harga ilustrasi/bulan | Job Cowork |
| --- | --- | --- | --- |
| **Starter** | Subdomain lab `nama.nexus-lab.test`, template Nexcent, 4 palet, `vercel.json`, header tepi Caddy | **Rp 0–29.000** | Tidak |
| **Usaha** | Domain sendiri, halaman tambahan, SEO dasar | **Rp 49.000–99.000** | Tidak |
| **Tepi** | + gateway Alur A (Reflex, autoban) | **Rp 149.000–299.000** | Tidak |
| **Cowork (pilot)** | + Job/Loop + artefak risiko | **Rp 200.000** (Job) / **Rp 300.000**/bln (Loop) — jalur `/institusi` | Ya |
| **UMKM bundel** | Site + pelindung UMKM | **Rp 20.000**/bln; GaaS entry **Rp 35.000** — `/umkm` | Tepi dasar saja |

**Domain** (± Rp 150–200rb/tahun) — **disarankan terpisah** dari Starter Rp 20rb.

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
| Form wizard pelanggan | **Lab v0.1** — `channel-starter/channel_starter/server.py` + `cli.py serve` |
| Template engine (layout Nexcent) | **Lab v0.1** — satu layout Figma (`templates/_base.html`) + preset `fnb` / `jasa` / `profil`; 4 palet `hijau` `biru` `navy` `hutan` |
| Deploy otomatis multi-tenant | **Lab siap** — Caddy import + `hosts-registry.json` + `deploy-local` mount; VPS wildcard **belum** |
| Portal self-serve billing Rp 20rb | **Portal v0.1 manual WA** — Midtrans **ditunda** |
| Lab portofolio (`playground/Portofolio-Thoriq`) | Referensi UX unggah/vault — **bukan** produk Channel Starter |

Mesin GaaS (gateway, NEX-RED, Job Cowork) **sudah ada** — dipakai di paket **Cowork/Tepi**, bukan Starter.

### Quick start (lab)

```powershell
cd channel-starter
pip install -r requirements.txt
python cli.py generate --name "Warung Bu Siti" --category fnb --whatsapp 081234567890 --theme hijau
python cli.py serve
```

Form: http://127.0.0.1:3010/ · Preview: `/preview/{slug}`

### Deploy subdomain (lab)

```powershell
python cli.py deploy apply
cd ..\deploy-local
.\START.bat    # Administrator — tulis hosts + mount Caddy
```

Buka: `http://{slug}.nexus-lab.test` (contoh `http://warung-bu-siti.nexus-lab.test`)

### Upsell Cowork (S-6)

```powershell
python cli.py upsell enable --slug warung-bu-siti --tier cowork
cd ..\deploy-local
docker compose up -d gateway channel-origin
python ..\channel-starter\cli.py deploy apply --reload
```

Satu `PROTECTED_HOST` aktif per lab — site upsell lewat WAF gateway; origin statis di `channel-origin:8099`. Job Cowork otomatis jika NEX-RED bridge `:3004` hidup.

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

*Channel Starter — lab v0.1 2026-08-22. Jangan klaim billing/produksi massal sebelum deploy & pembayaran siap.*
