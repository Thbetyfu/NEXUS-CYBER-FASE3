# Skema Bisnis & Deployment — Nexus Cyber GaaS

**Versi:** 2.0.0 / 2026-08-22  
**Model produk:** [PRODUCT_MODEL.md](./PRODUCT_MODEL.md)  
**Visi komersial GaaS** — bukan status multi-tenant CNAME legacy. Lab nyata: `nexus-core/deploy-local/` (satu stack, satu `PROTECTED_HOST`).

---

## 1. Perbandingan Skema Deployment GaaS

| Aspek | Job GaaS | Loop GaaS | On-prem instance |
| --- | --- | --- | --- |
| **Target** | Pilot / audit siklus | Kanal produksi berulang | Institusi kedaulatan data |
| **Deployment** | Instance sementara atau staging → produksi | Instance tetap di VPS/on-prem klien | Gateway di mesin klien |
| **Integrasi** | DNS/proxy ke gateway `:8080` | Sama + Job jadwal | Middleware di DC klien |
| **Yang dibayar** | Satu Job (ukur→kendalikan→uji) | Retainership + Job berkala | Lisensi + opsi Loop |
| **Deliverable** | Tabel delta, status antibodi, residual | + riwayat imun host (target) | + operasi lokal |
| **Operator** | Nexus (+ persetujuan klien L0/L1) | Nexus | CSIRT klien + Nexus opsional |

**Tidak ada** skema “UMKM CNAME Rp19.000” atau “GovEdu E-Katalog massal” di roadmap GaaS v1.

---

## 2. Job GaaS — Satu Siklus

### 2.1 Ruang lingkup

- Satu `PROTECTED_HOST` (kanal web/API)
- Pemeriksaan HTTP **jinak** (NEX-RED allow-list)
- Defense delta: WAF vs origin (origin direct hanya loopback/RFC1918/Docker)
- Virtual patch antibodi di tepi (L1 setelah persetujuan)
- Verifikasi: vaccine-probe + replay → `antibody_learned` atau `replay_missed`

### 2.2 Deliverable (target produk)

| Artefak | Isi |
| --- | --- |
| Tabel delta | Label per kelas: `origin_open`, `waf_blocked`, … |
| Status antibodi | `antibody_learned` / `replay_missed` |
| Residual | Eksplisit: celah origin, false positive, batas WAF |
| Log persetujuan | L0/L1, timestamp, pemilik risiko |

### 2.3 Kriteria selesai Job

- **CLOSED_OK:** verifikasi lulus atau semua temuan `both_held` tanpa gap
- **CLOSED_GAP:** residual tertulis (wajib jika `replay_missed`)
- **PARTIAL:** agen gagal sebagian — ditutup jujur

---

## 3. Loop GaaS — Retainership

### 3.1 Komponen

- **Alur A:** tepi always-on (Reflex, antibodi cache, pager Telegram opsional)
- **Alur B:** Job Cowork mingguan / per rilis fitur kanal
- **Alur C:** kumulatif artefak untuk laporan risiko berkala

### 3.2 Ritme operasi (contoh)

| Frekuensi | Aktivitas |
| --- | --- |
| Kontinu | Tepi + pager insiden |
| Mingguan | Job hygiene + delta |
| Per rilis | Job penuh setelah deploy kanal |
| Bulanan | Ringkasan artefak ke pemilik risiko |

---

## 4. On-prem Instance

- `nexus-core-gateway` di VM/server klien
- Control plane `:8081` + Command Center loopback/VPN
- Data sensitif tidak melalui proxy publik Nexus
- Job/Loop dioperasikan oleh CSIRT klien atau Nexus (kontrak terpisah)

---

## 5. Ilustrasi Pricing (bukan kontrak)

Hanya perencanaan internal — lihat [DECISIONS_OPEN.md](./DECISIONS_OPEN.md) untuk harga final.

### 5.1 GaaS (inti)

| Paket | Ilustrasi | Catatan |
| --- | --- | --- |
| Job GaaS (48–72 jam) | Tier proyek per host | Bayar per hasil Job |
| Loop GaaS (bulanan) | Tier retainership per host | Termasuk N Job/bulan |
| On-prem lisensi | Tier tahunan per instance | + opsi Loop |

### 5.2 Channel Starter (entry UMKM)

| Paket | Ilustrasi/bulan | Termasuk Job Cowork? |
| --- | --- | --- |
| Starter | Rp 0–29.000 | **Tidak** |
| Usaha | Rp 49.000–99.000 | Tidak |
| Tepi (+ Alur A) | Rp 149.000–299.000 | Tidak |
| Cowork upsell (pilot PC+tunnel) | Job Rp 200.000 · Loop Rp 300.000/bln | **Ya** |

Domain tahunan **terpisah**. Validasi pasar: UMKM **≤ ~Rp 20.000** untuk tier dasar — detail [CHANNEL_STARTER.md](./CHANNEL_STARTER.md).

**Bukan** rencana v1: satu paket Rp 19.000 all-in (site + Loop + operator).

---

## 6. Peta Jalan Komersialisasi GaaS

| Fase | Fokus | Bukan |
| --- | --- | --- |
| **1** | Job berbayar + demo before/after | Channel Portal legacy billing otomatis |
| **2** | Loop 2–5 host + retainership | F-10 back-office |
| **3** | Memori imun + ekspor artefak | Multi-tenant CNAME massal |
| **4** | **Channel Starter** — form + template UMKM | Loop di harga Rp 20rb |
| **5+** | Upsell Cowork dari base Starter | Klaim enterprise SLA |

---

## 7. Ketahanan Keuangan & Manajemen Risiko

Skema GaaS memetakan ke siklus risiko **kanal digital**:

| Siklus | Job / Loop |
| --- | --- |
| Identifikasi | Defense delta + hygiene |
| Pengendalian | Antibodi L1 di tepi |
| Pemantauan | Tepi + Job berulang + pager |
| Dokumentasi | Artefak Job (Alur C) |

Konteks POJK 30/2025 (risiko siber ITSK) dan ketahanan siber perbankan = **pembingkai**, bukan klaim sertifikasi.

---

## 8. Yang Ditunda (legacy + PSP pihak ketiga)

- PSP pihak ketiga (Midtrans, Stripe) dan webhook fail-closed — **jangan**; top-up = QRIS/VA milik pemilik + bukti + approve (**belum dikode**)
- F-10 super-admin roster pelanggan
- Provisioner kontainer per-tenant CNAME massal
- Connect Git monorepo ke project warung
- Loop / Job otomatis di Starter ~Rp 20rb

Lihat [CHANGELOG.md](../CHANGELOG.md) Unreleased.

---

*Skema GaaS v2 — 2026-08-22. Menggantikan skema B2G/B2B legacy subscription/UMKM sebelumnya.*
