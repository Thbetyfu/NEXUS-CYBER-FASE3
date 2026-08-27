# Nexus Channel Portal

**Modul:** `nexus-channel-portal/` · port **3003**  
**Peran:** Pintu jual **satu situs**, multi-segmen — UMKM · Sekolah · Startup · Institusi · **B2G**

---

## Alur pengunjung

```text
/  (hub: pilih segmen — hero + alur + daftar peran)
 ├─ /umkm      → tanya punya website? → harga cabang belum/sudah
 ├─ /sekolah   → sama (copy sekolah)
 ├─ /startup   → sama (landing vs tepi/Job)
 ├─ /institusi → Cowork B2B langsung (tanpa cabang website v1)
 └─ /b2g       → on-prem Edge + Loop wajib (tanpa kuis website; source tidak termasuk)
```

| Status website | UMKM / Sekolah | Startup |
| --- | --- | --- |
| Belum | Rp 20rb site+pagar · Rp 35rb GaaS entry | Rp 45rb landing+pagar · Rp 75rb +tepi · Job 200rb |
| Sudah | Rp 15rb pagar · Rp 28rb +status | Rp 75rb tepi · Job 200rb · Loop 300rb |

`/cowork` → redirect ke `/institusi`.  
Form data site: `/order`.  
Distribusi pilot: [DISTRIBUTION_PILOT.md](./DISTRIBUTION_PILOT.md).  
B2G pitching: [COWORK_B2G.md](./COWORK_B2G.md). Unit ekonomi: [PRICING_UNIT_ECONOMICS.md](./PRICING_UNIT_ECONOMICS.md).

| Langkah | Komponen |
| --- | --- |
| Marketing per segmen | route di atas |
| Form onboarding website | `/order` + API channel-starter |
| Deploy tahap pilot | PC 24/7 + tunnel |
| Upsell Cowork B2B | `/institusi` atau `/startup` |
| Pitch on-prem B2G | `/b2g` (produksi DC klien belum selesai) |

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
