# Nexus Channel Portal

**Modul:** `nexus-channel-portal/` · port **3003**  
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

| Status website | UMKM / Sekolah | Startup |
| --- | --- | --- |
| Belum | Rp 20rb site+pagar · Rp 35rb GaaS entry | Rp 45rb landing+pagar · Rp 75rb +tepi · Job 200rb |
| Sudah | Rp 15rb pagar · Rp 28rb +status | Rp 75rb tepi · Job 200rb · Loop 300rb |

| Corporat deploy | Paket |
| --- | --- |
| Hosted | Job 200rb · Loop 300rb · Custom |
| On-prem (besar) | Edge 18jt/thn · Loop 3,5jt/bln · Custom (sama model Pemerintah) |

Form data site: `/order` (form lengkap: hero, layanan, angka, galeri URL, 4 palet Figma). Proxy generate membaca `Location` `/preview/{slug}` atau `/sites/{slug}`; preview HTML di wizard `:3010`. Slug hasil generate klien **tidak** ikut git; demo `sites/contoh-nexcent` ikut.  
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

- **v1:** WhatsApp `62895603358692` — *Saya mau beli Nexus Cyber!!*
- **Belum:** Midtrans webhook (ditunda)

---

## Warisan desain

UI Slate & Indigo (Notion-style) dari portal legacy — **semua copy & backend diganti** selaras [PRODUCT_MODEL.md](./PRODUCT_MODEL.md).

Portal legacy submodule **digantikan** modul monorepo **`nexus-channel-portal/`**.

---

*2026-08-22 — Milestone 19*
