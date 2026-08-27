# Unit Ekonomi — Harga Jual, COGS, Margin per Segmen

**Versi:** 0.1.0 / 2026-08-23  
**Status:** Dokumen hidup — asumsi **pilot PC operator + tunnel** (infra cash ≈ Rp 0); COGS = biaya kesempatan + listrik + waktu operator.  
**Terkait:** [DISTRIBUTION_PILOT.md](./DISTRIBUTION_PILOT.md), [COWORK_B2G.md](./COWORK_B2G.md), [COWORK_B2B.md](./COWORK_B2B.md), [DECISIONS_OPEN.md](./DECISIONS_OPEN.md).

Semua angka **IDR**. Margin kotor = (Jual − COGS) / Jual. Bukan laporan keuangan resmi — untuk investor & operator internal.

---

## 1. Asumsi COGS (wajib dibaca)

| Asumsi | Nilai | Catatan |
| --- | --- | --- |
| Infra VPS | **Rp 0** | Belum VPS; PC milik operator |
| Tunnel publik | **Rp 0**/bulan | Cloudflare Tunnel free tier (pilot) |
| Tarif operator blended | **Rp 100.000**/jam | Setup + support + Job; bukan gaji resmi |
| Listrik + depresiasi PC (share per klien rendah) | **Rp 2.000–8.000**/bulan | Volume UMKM kecil; B2G on-prem listrik di DC klien |
| Midtrans / billing otomatis | **Tidak** dihitung | Pembayaran v1 = WA manual |
| NEX-AI | Model milik pemilik | Tidak dihitung lisensi Ollama Hub |

**Rumus support:** `menit_support_bulan / 60 × Rp 100.000`.

Setup one-shot diamortisasi ke bulan (UMKM/sekolah: 12 bulan; Job one-shot: masuk COGS Job itu saja).

---

## 2. Ringkasan investor (satu tabel)

| Segmen · cabang · paket | Jual | Est. COGS | Laba kotor | Margin |
| --- | --- | --- | --- | --- |
| UMKM · belum · Website Aman | 20.000/bln | 8.500 | 11.500 | **58%** |
| UMKM · belum · GaaS entry | 35.000/bln | 18.500 | 16.500 | **47%** |
| UMKM · sudah · Pagar | 15.000/bln | 6.000 | 9.000 | **60%** |
| UMKM · sudah · Pagar+status | 28.000/bln | 14.500 | 13.500 | **48%** |
| Sekolah · belum · Website | 20.000/bln | 8.500 | 11.500 | **58%** |
| Sekolah · belum · GaaS entry | 35.000/bln | 18.500 | 16.500 | **47%** |
| Sekolah · sudah · Pagar | 15.000/bln | 6.000 | 9.000 | **60%** |
| Sekolah · sudah · Pagar+alert | 28.000/bln | 14.500 | 13.500 | **48%** |
| Startup · belum · Landing+pagar | 45.000/bln | 16.000 | 29.000 | **64%** |
| Startup · belum · Landing+Tepi | 75.000/bln | 28.000 | 47.000 | **63%** |
| Startup · belum · Job Wasit | 200.000 sekali | 75.000 | 125.000 | **63%** |
| Startup · sudah · Tepi | 75.000/bln | 22.000 | 53.000 | **71%** |
| Startup · sudah · Job Wasit | 200.000 sekali | 75.000 | 125.000 | **63%** |
| Startup · sudah · Loop | 300.000/bln | 95.000 | 205.000 | **68%** |
| Institusi · Job Cowork | 200.000 sekali | 75.000 | 125.000 | **63%** |
| Institusi · Loop GaaS | 300.000/bln | 95.000 | 205.000 | **68%** |
| Institusi · Custom | Quote | — | — | Custom |
| **B2G · Lisensi Edge On-Prem** | **18.000.000**/thn | 2.400.000 | 15.600.000 | **87%** |
| **B2G · Loop On-Prem (wajib)** | **3.500.000**/bln | 1.050.000 | 2.450.000 | **70%** |
| B2G · Custom multi-DC | Quote | — | — | Custom |

**Takeaway:** volume UMKM = margin % sehat tapi **laba absolut kecil**; B2G = margin tinggi **dan** laba absolut besar (on-prem + retainer). Jangan campur Loop institusi/B2G ke harga warung Rp 20rb.

---

## 3. Detail COGS per paket

### 3.1 UMKM & Sekolah (struktur sama)

| Paket | Setup amortisasi | Support/bln | Listrik share | COGS |
| --- | --- | --- | --- | --- |
| Website 20rb (belum) | 30 mnt / 12 bln ≈ 4.200 | 5 mnt ≈ 8.300 → **dipotong** ke 2.500* | 2.000 | **≈ 8.500** |
| GaaS entry 35rb | 4.200 | 12 mnt ≈ 20.000 → **12.300*** | 2.000 | **≈ 18.500** |
| Pagar 15rb (sudah) | 15 mnt / 12 ≈ 2.100 | 3 mnt ≈ 2.000* | 1.900 | **≈ 6.000** |
| Pagar+status 28rb | 2.100 | 10 mnt ≈ 10.400* | 2.000 | **≈ 14.500** |

\*Support UMKM harus **batch/otomatis ringan** (alert template, bukan hand-hold per tiket). Jika support nyata >15 mnt/klien/bulan, naikkan harga atau tolak volume.

### 3.2 Startup

| Paket | Driver COGS | Est. COGS |
| --- | --- | --- |
| Landing+pagar 45rb | Setup landing 45 mnt amort + 8 mnt support + listrik | **16.000** |
| Landing+Tepi 75rb | Setup tepi ketat + 15 mnt support | **28.000** |
| Tepi 75rb (sudah) | Tanpa landing; 12 mnt support + listrik | **22.000** |
| Job 200rb | ~45 mnt operator Job + export artefak | **75.000** |
| Loop 300rb | 1 Job/bln (~45 mnt) + 15 mnt retainer + listrik | **95.000** |

### 3.3 Institusi B2B (hosted pilot)

Sama angka Job/Loop startup “sudah” — host di infrastruktur operator (PC+tunnel). Custom = quote (multi-host, travel, SLA tertulis).

### 3.4 B2G on-prem

| Paket | Driver COGS | Est. COGS |
| --- | --- | --- |
| Lisensi Edge 18jt/thn | Packaging image, install remote 12–16 jam, docs, license key ops (tahun 1) | **≈ 2.400.000**/thn |
| Loop On-Prem 3,5jt/bln | 6–8 jam ops/bulan (Job, update, artefak, sync terbatas) + buffer | **≈ 1.050.000**/bln |
| Custom | Travel DC, air-gap, SIEM, pelatihan | Quote |

Listrik DC = **beban klien**. Source **tidak** dijual → COGS tidak termasuk “nilai IP penuh”, hanya delivery & retainer.

**Tahun 1 gabungan tipikal (1 DC):** jual 18jt + 3,5jt×12 = **60jt**; COGS ≈ 2,4jt + 1,05jt×12 ≈ **15jt**; laba ≈ **45jt**; margin gabungan ≈ **75%**.

---

## 4. Cabang “punya website?” — dampak ekonomi

| Cabang | Efek pada COGS | Efek pada jual |
| --- | --- | --- |
| **Belum** | Ada slot template / landing | Lebih tinggi (site+pagar) |
| **Sudah** | Tanpa template; hanya tepi | Lebih rendah absolut, margin % tetap sehat |
| **Institusi / B2G** | Tanpa cabang website v1 | Scope kontrak wasit / on-prem |

---

## 5. Yang tidak masuk model ini

- Pajak, PPN, biaya legal pengadaan  
- CADangan downtime PC (risiko reputasi, bukan COGS kas)  
- Biaya Midtrans (ditunda)  
- VPS masa depan — jika pindah VPS, tambahkan COGS infra ke semua tier hosted  

---

*Unit ekonomi pilot 2026-08-23 — selaras harga portal & DECISIONS_OPEN.*
