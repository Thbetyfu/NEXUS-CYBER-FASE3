# 🏢 SKEMA BISNIS & ARSITEKTUR DEPLOYMENT: PEMERINTAH/PENDIDIKAN VS SWASTA
Panduan Penjualan, Lisensi, dan Penempatan Infrastruktur Nexus Cyber untuk Sektor Publik (GovEdu) dan Swasta

---

## 1. Perbandingan Strategis: Pemerintah/Pendidikan vs Swasta

Skema penawaran produk Nexus Cyber dibedakan secara tegas antara sektor **Pemerintah & Pendidikan (GovEdu)** dan **Swasta (Private Enterprise)** karena perbedaan regulasi, kedaulatan data, kepatuhan anggaran daerah, dan model penyerapan anggaran belanja masing-masing sektor.

| Aspek | Sektor Pemerintah & Pendidikan (B2G/B2E) | Sektor Swasta (B2B SaaS) |
| :--- | :--- | :--- |
| **Model Bisnis** | Lisensi Per-Core CPU Tahunan (ditagih tahunan penuh di muka, mengikuti siklus APBD/APBN/BOS). | Langganan Bulanan/Tahunan (*Software as a Service - SaaS*) via Midtrans. |
| **Pengadaan & Penjualan** | Melalui **e-Katalog LKPP** (Pengadaan Langsung < Rp200 juta) atau kontrak dinas volume. | *Self-service* mandiri, pembayaran instan QRIS/VA, auto-provisioning container dalam < 10 detik. |
| **Lokasi Deployment** | Pusat Data Nasional (PDN), *On-Premise Private Cloud*, atau server lokal sekolah (Air-Gapped). | Multi-tenant Docker cluster di VPS Mandiri (Biznet GIO / Hetzner). |
| **Cognitive Core (AI)** | **NEX-AI Lokal penuh** via Ollama (`nex-ai-protect` 3B Q4_K_M) dijalankan offline pada server lokal / GPU lokal. | **NEX-AI Lokal** via Ollama pada dedicated node untuk meminimalkan biaya running cost (API Cost = Rp0). |
| **Threat Intelligence** | Jaringan Nasional (Blacklist IP lokal BSSN & data insiden siber kolektif terenkripsi). | Redis Pub/Sub realtime blacklist sync antarsimpul gateway (Collective Network Moat). |
| **Kepatuhan Hukum** | PP No. 71/2019 (PSTE), UU PDP No. 27/2022, Audit Keuangan BPK. | UU PDP, POJK POJK No. 11/SEC/2022 (untuk FinTech). |

---

## 2. Skema Sektor Pemerintah & Pendidikan (B2G / B2E Model)

### 2.1 Model Lisensi & Penentuan Harga (Core-Based Annual Licensing)
Instansi pemerintah menggunakan mekanisme belanja modal (CAPEX) tahunan. Model berlangganan bulanan otomatis ditolak oleh birokrasi anggaran.
*   **Annual Core License**: Lisensi tahunan software yang dipasang di server milik instansi/sekolah, dikenakan per-vCPU Core.
*   **Paket Khusus GovEdu (Ditagih tahunan penuh di muka)**:
    *   *GovEdu Basic (SD/SMP/SMA Negeri)*: Rp19.000 / bulan (Ditagih **Rp228.000 / tahun**).
    *   *GovEdu Pro (Dinas Kab/Kota Kecil)*: Rp49.000 / bulan (Ditagih **Rp588.000 / tahun**).
    *   *GovEdu Institusi (PTN/Pemda)*: Rp149.000 / bulan (Ditagih **Rp1.788.000 / tahun**).
    *   *GovEdu Volume (Dinas Pendidikan)*: **Rp990.000 / bulan** (Ditagih **Rp11.880.000 / tahun** untuk melindungi hingga 50 domain sekolah secara terpusat).

### 2.2 Arsitektur Terisolasi Penuh (Air-Gapped & Offline Updates)
Instansi vital (seperti Pusat Data Nasional / PDN) memiliki jaringan terputus total dari internet luar demi keamanan:
*   **WAF Core**: Menggunakan modul **NEX-AI** lokal yang dieksekusi di server GPU lokal menggunakan Ollama.
*   **Offline Update Bundles**: Ruleset penyerangan baru, daftar blacklist IP siber, dan bobot model (*model weights*) baru NEX-AI dibundel dalam berkas terenkripsi `.bin` / tarball. Admin IT instansi mengunduh berkas ini secara bulanan dari portal Nexus Cyber lalu mengunggahnya secara manual ke dasbor lokal WAF.

---

## 3. Skema Sektor Swasta (B2B SaaS Model)

### 3.1 Model Bisnis (SaaS Multi-Tenant)
Perusahaan swasta menggunakan biaya operasional (OPEX) bulanan untuk memangkas pengeluaran modal di awal.
*   **Multi-Tenant Gateway**: WAF terdistribusi otonom. Klien mengarahkan rekaman DNS CNAME ke gerbang proxy Nexus Cyber di VPS Biznet GIO.
*   **Paket Berlangganan Swasta**:
    *   *Basic*: Rp49.000/bln (Batas 1 Domain, 100 GB visitor data transfer, Reflex AI).
    *   *Pro*: Rp149.000/bln (Batas 3 Domain, 500 GB data transfer, Reflex AI + PACS + MTD 60m).
    *   *Pro+*: Rp449.000/bln (Batas 10 Domain, 2 TB data transfer, Dual-Brain AI + PACS + MTD 10m + AVSE).
    *   *Ultrasafe*: Rp1.499.000/bln (Domain tak terbatas, 10 TB data transfer, Dedicated container, eBPF Kernel Drops, MTD 1m).

### 3.2 Penanganan Biaya Operasional (Zero API Cost)
*   **Inference Full Local**: Reflex Layer (`nex-ai-reflex`) dan Reasoning Layer (`nex-ai-protect`) berjalan lokal via Ollama di kluster/server kita. Seluruh inferensi berlangsung di infrastruktur sendiri tanpa vendor AI cloud, mempertahankan margin kotor hingga **63.1%** pada Lean Stage.
*   **Caching Redis**: Respon verifikasi lisensi dan request payload identik di-cache penuh untuk menghemat pemanggilan model AI.

---

## 4. Rekomendasi Peta Jalan Regulasi & Komersialisasi 10 Tahun

1.  **LKPP e-Katalog Onboarding (Tahun 1)**: Daftarkan paket GovEdu di e-Katalog LKPP pada kategori *Perangkat Lunak Keamanan Informasi* untuk memfasilitasi pengadaan langsung oleh Pemda & Dinas Pendidikan.
2.  **Sertifikasi Kepatuhan Negara (Tahun 3-5)**: Mengajukan evaluasi produk untuk mendapatkan sertifikasi internasional **Common Criteria EAL2+** serta **Sertifikat Keamanan Produk dari BSSN**.
3.  **Dampak Kedaulatan Siber**: Menjadikan Nexus Cyber sebagai WAF standar pertahanan siber dalam negeri untuk seluruh ekosistem PDN (Pusat Data Nasional), Bank Pembangunan Daerah (BPD), dan Universitas Negeri di Indonesia, menciptakan keunggulan kompetitif jangka panjang yang tidak bisa diintervensi oleh pemain asing seperti Cloudflare.
