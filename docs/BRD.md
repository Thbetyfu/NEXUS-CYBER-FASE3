# BUSINESS REQUIREMENT — NEXUS CYBER

## Dua lapisan: Channel Starter + Edge Antibody Cowork

**Versi:** 2.1.0 / 2026-08-22  
**Model produk:** [PRODUCT_MODEL.md](./PRODUCT_MODEL.md)  
**Channel entry:** [CHANNEL_STARTER.md](./CHANNEL_STARTER.md)  
**Keputusan terbuka:** [DECISIONS_OPEN.md](./DECISIONS_OPEN.md)  
**Kontrak teknis:** [CAPABILITIES.md](./CAPABILITIES.md), [LIMITATIONS.md](./LIMITATIONS.md)

---

## 1. PRODUK & VALUE PROPOSITION

### 1.1 Masalah

Institusi keuangan dan penyelenggara kanal digital mempercepat **inovasi layanan** — setiap rilis menambah risiko di permukaan HTTP. UMKM butuh **website murah** tanpa tim IT, tetapi **validasi pasar** menunjukkan toleransi bayar **~Rp 20.000/bulan** untuk produk dasar — **bukan** untuk SOC/wasit penuh.

Alat tradisional memecah siklus manajemen risiko (scanner, WAF, copilot) — lihat [PRODUCT_MODEL.md](./PRODUCT_MODEL.md).

### 1.2 Solusi — dua lapisan

| Lapisan | Produk | Value |
| --- | --- | --- |
| **Entry** | **Channel Starter** | Form → template → site otomatis (rule-based, bukan LLM berat) |
| **Inti** | **Edge Antibody Cowork (GaaS)** | Job/Loop: ukur → kendalikan di tepi → uji replay → artefak risiko |

Tim Nexus **boleh** menjadi **agensi/integrator** sekaligus: build kanal + deploy + (opsional) operasi Loop GaaS.

### 1.3 Problem statement kompetisi

**Penguatan Ketahanan dan Inovasi Keuangan → Manajemen Risiko** — kontribusi Nexus pada irisan **risiko siber kanal digital** (bukan GRC bank penuh). Channel Starter = **inovasi layanan UMKM**; GaaS Cowork = **pengendalian & pemantauan** yang terukur.

---

## 2. TARGET PASAR

| Segment | Produk | Catatan |
| --- | --- | --- |
| **UMKM** (website murah) | Channel Starter | Validasi ≤ Rp 20rb/bulan; **bukan** Loop GaaS di harga ini |
| **Kanal ITSK / fintech** | Job / Loop GaaS | Pemilik risiko + integrator |
| **Agensi / integrator web keuangan** | Loop multi-host | Satu hubungan, banyak situs |
| **Tim Nexus sebagai integrator** | Starter + Cowork bundle | Kontrak pisah site vs keamanan |
| **On-prem institusi** | Instance + Loop | Kedaulatan data |

| Bukan prioritas v1 | Alasan |
| --- | --- |
| Bank tier-1 SLA 24/7 | Di luar kapasitas operator |
| Enterprise tanpa pilot | Butuh jejak Job + residual |
| Klaim sertifikasi OJK/BSSN | Hanya pembingkai, bukan approve regulator |

**ICP GaaS:** pemilik risiko kanal + tim IT terbatas; butuh **bukti** pengendalian, bukan dashboard SOC semata.

---

## 3. VALUE PROPOSITION vs DIY

| DIY | Nexus |
| --- | --- |
| Website + WAF terpisah | Channel Starter + upsell Cowork satu vendor |
| Laporan hijau default | `replay_missed` = belum selesai |
| Tidak ada jejak L0/L1 | Artefak Job untuk pemilik risiko |

Moat GaaS: **jalur + wasit jujur + memori imun host** — bukan model GGUF atau template semata.

---

## 4. MODEL PENJUALAN (ilustrasi — bukan kontrak)

### 4.1 Channel Starter

| Paket | Harga ilustrasi/bulan | Job Cowork |
| --- | --- | --- |
| Starter (subdomain, template) | Rp 0–29.000 | Tidak |
| Usaha (domain, halaman+) | Rp 49.000–99.000 | Tidak |
| Tepi (+ Alur A gateway) | Rp 149.000–299.000 | Tidak |
| Cowork upsell | Rp 500.000–2.000.000+ | Ya |

Domain ± Rp 150–200rb/tahun — **disarankan terpisah** dari Starter Rp 20rb.

### 4.2 GaaS

| Paket | Bentuk |
| --- | --- |
| Job GaaS | Proyek 48–72 jam per host |
| Loop GaaS | Retainership + Job berkala |
| On-prem | Lisensi instance + opsi Loop |

Harga exact & nama paket Starter: lihat [DECISIONS_OPEN.md](./DECISIONS_OPEN.md).

---

## 5. LANDSCAPE KOMPETITIF

| Pesaing | Nexus |
| --- | --- |
| Website builder murah (Wix, dll.) | Template + **opsional** tepi Nexus |
| Cloudflare / WAF | Wasit origin vs tepi + residual |
| Scanner / pentest | Closed-loop Job Cowork |
| “Buat sendiri dengan AI” | Operasi + verifikasi + jejak |

---

## 6. BATASAN JUAL (WAJIB DIUNGKAP)

- Bukan SOC 24/7, bukan DDoS volumetric kernel (eBPF stub)
- Bukan pentest exploit / Shannon
- Residual wajib jujur
- **Channel Starter lab v0.1** — generator ada di `channel-starter/`; jangan jual massal sebelum billing + deploy produksi
- **Loop GaaS tidak muat** di Rp 20rb/bulan
- Bukan klaim approve regulator

Lihat [LIMITATIONS.md](./LIMITATIONS.md).

---

## 7. ROADMAP BISNIS

| Fase | Fokus |
| --- | --- |
| **17** | GaaS Job/Loop + PG (**mesin sudah ada**) |
| **18** | Channel Starter — form, template, deploy (**lab v0.1**) |
| **19+** | Upsell Cowork dari base UMKM; partner agensi eksternal |

Channel Portal legacy, F-10, webhook massal: **ditunda** kecuali pemilik putuskan (Q8 disepakati → `nexus-channel-portal/`).

---

*BRD v2.1 — strategi dua lapisan 2026-08-22.*
