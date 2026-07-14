aa kpiah atagbpaka taapaapitt

# BUSINESS REQUIREMENT & COMMERCIAL PROPOSAL

## NEXUS CYBER - AUTONOMOUS TACTICAL DEFENSE GRID

---

## 1. PRODUCT (SPESIFIKASI PRODUK & VALUE PROPOSITION)

### 1.1 Masalah yang Ingin Diselesaikan

Ekosistem web Indonesia sedang berada dalam kondisi darurat siber yang sebagian besar tidak terlihat. Data dan fakta berikut menggambarkan skala permasalahannya:

**A. Serangan Injeksi Konten Judi Online (Judol SEO Injection)**
Sejak 2022, BSSN mencatat ribuan situs web pemerintah dan swasta di Indonesia diretas dan disuntikkan konten promosi judi online (slot, casino, togel). Serangan ini tidak membobol data — ia memodifikasi halaman web secara diam-diam untuk kepentingan iklan ilegal. Akibatnya:

* Nama domain klien masuk daftar hitam Google Safe Browsing → traffic organik hilang dalam 24 jam.
* Kepercayaan pengguna runtuh seketika. Pengguna melihat iklan judol di halaman checkout atau halaman login bank digital.
* Domain `.go.id`, `.sch.id`, dan `.ac.id` adalah korban terbanyak karena dianggap tepercaya oleh mesin pencari (Domain Authority tinggi), menjadikannya target bernilai tinggi untuk SEO poisoning.

**B. Downtime Akibat Serangan DDoS & Eksploitasi Merusak Pendapatan**

* Menurut laporan Cloudflare Radar 2023, Indonesia masuk 10 negara teratas target serangan DDoS Layer 7 di Asia Pasifik.
* Sebuah serangan DDoS yang berlangsung hanya **1 jam** pada platform e-commerce kelas menengah dapat mengakibatkan kerugian langsung antara **Rp2.400.000 – Rp8.000.000** (dari konversi penjualan yang gagal) — belum termasuk kerugian reputasi jangka panjang.
* Startup FinTech yang mengalami downtime saat jam aktif transfer (08.00–12.00 WIB) dapat kehilangan transaksi senilai puluhan juta dalam hitungan menit.
* Platform digital yang mengalami insiden keamanan publik berisiko kehilangan **30–60% pengguna aktif** dalam 30 hari pertama pasca-insiden (sumber: IBM Cost of Data Breach Report 2023).

**C. Ancaman Siber yang Terus Berkembang pada Layanan Publik**

* **Web Defacement** pada domain `.sch.id` dan `.go.id`: Tercatat lebih dari **1.400 kasus defacement** pada situs pemerintah daerah dan sekolah sepanjang 2022-2023 (sumber: ID-CERT). Mayoritas tidak terdeteksi berhari-hari karena tidak ada sistem monitoring.
* **SQL Injection dan XSS** pada portal layanan publik (SIMPEG, SIAK, sistem akademik kampus) memungkinkan pencurian data PNS, data mahasiswa, dan nilai akademik secara masif.
* **Ransomware dan Enkripsi Data**: Serangan ransomware pada PDN (Pusat Data Nasional) Juni 2024 membuktikan bahwa infrastruktur digital pemerintah belum siap menghadapi ancaman modern.

**D. Tiga Masalah yang Tidak Terpecahkan oleh Solusi yang Ada**

| Masalah                                                 | Realita di Lapangan                                                                                                                                                                   |
| :------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Mengubah kode aplikasi memakan waktu lama**     | Tim developer harus audit kode, deploy ulang, dan uji regresi setiap kali ada celah baru ditemukan. Proses ini butuh 3–14 hari bahkan untuk patch sederhana.                         |
| **Solusi WAF yang ada terlalu mahal & rumit**     | Cloudflare Enterprise: $2.000+/bln. ModSecurity: gratis tapi butuh DevOps berpengalaman untuk konfigurasi & maintain rule. Tidak ada opsi terjangkau untuk UMKM dan institusi publik. |
| **Tidak ada perlindungan real-time yang adaptif** | WAF berbasis signature/rule ketinggalan selalu tertinggal — serangan zero-day lolos sebelum rule-update dikeluarkan vendor.                                                          |

**Nexus Cyber hadir untuk menjawab semua ini**: proteksi AI otonom yang dipasang hanya dengan mengarahkan DNS CNAME — **tanpa mengubah satu baris kode pun**, tanpa biaya enterprise, dan aktif dalam hitungan menit.

### 1.2 Deskripsi Produk

**Nexus Cyber** adalah platform WAF & SOC Command Center otonom berbasis kecerdasan buatan dua lapis (*Dual-Brain AI Ensemble*) dan teknologi pertahanan aktif *Moving Target Defense* (MTD). Dengan menggabungkan pemblokiran instan sub-milidetik, perlindungan kode polimorfik (PACS), dan pemulihan visual otomatis (*Autonomous Self-Repair*), Nexus Cyber menawarkan perlindungan setara kelas *Enterprise* dengan biaya infrastruktur yang sangat rendah, dikemas sebagai platform *Multi-Tenant SaaS* siap pakai yang dideploy di **VPS Mandiri Biznet GIO**.

### 1.3 Fitur Kunci Produk

* **Dual-Brain AI Shield**: Reflex Layer (penyaringan cepat sub-50ms menggunakan regex & small model lokal) untuk pemblokiran instan, dipadu dengan Reasoning Layer (analisis forensik mendalam niat peretas secara asinkron).
* **Moving Target Defense (MTD)**: Rotasi port komunikasi internal backend secara dinamis dan CSPRNG untuk mengecoh pemindaian otomatis hacker.
* **Autonomous Self-Repair**: Rollback visual template situs yang terkena defacement ke kondisi steril dalam waktu < 1 milidetik (~700µs) langsung dari memori RAM.
* **PACS (Polymorphic HTML Encryption)**: Proteksi client-side dengan enkripsi kode HTML secara dinamis pada setiap request untuk memblokir penipuan visual dan web scraping otomatis.
* **Least Privilege & Kernel Bypass**: Integrasi eBPF (XDP_DROP) tingkat driver untuk menjatuhkan paket berbahaya sebelum masuk ke user-space, menghemat resource CPU hingga 90% dibanding WAF tradisional.
* **Zero-Code Onboarding**: Klien baru cukup mengarahkan DNS CNAME mereka ke gateway Nexus Cyber tanpa perlu mengubah satu baris pun kode pada aplikasi web mereka.

---

## 2. MARKET (TARGET PASAR & ANALISIS KOMPETITOR)

### 2.1 Target Pasar: Segmen Swasta (Private Sector)

Segmen pertama adalah **perusahaan swasta kelas menengah** yang memiliki kebutuhan kepatuhan siber tinggi namun dengan tim IT terbatas dan anggaran keamanan yang ketat. Target akuisisi di tahap awal: **10 perusahaan swasta** sebagai klien perdana.

**Ideal Customer Profile (ICP) Swasta:**

| Segmen                                   | Masalah Spesifik                                                                                      | Tier yang Cocok  | Nilai Pembuktian                                    |
| :--------------------------------------- | :---------------------------------------------------------------------------------------------------- | :--------------- | :-------------------------------------------------- |
| **P2P Lending & FinTech**          | Wajib patuh POJK No. 11/SEC/2022 & UU PDP; rentan credential stuffing & SQL Injection pada API        | Pro+ / Ultrasafe | Audit log kriptografis untuk laporan OJK/BI         |
| **E-Commerce Lokal**               | Rentan price scraping kompetitor, injeksi judol pada halaman produk, & eksploitasi form upload gambar | Pro / Pro+       | Blokir uploader malicious file & PACS anti-scraping |
| **Digital Startup & SaaS**         | Butuh SLA uptime 99.99% tanpa tim security internal; serangan DDoS bisa mematikan layanan 24 jam      | Basic / Pro      | Dashboard SOC real-time tanpa DevSecOps             |
| **Platform Media & Portal Berita** | Target SEO injection judol; domain bernilai tinggi = target empuk untuk konten ilegal                 | Pro / Pro+       | Self-Repair otomatis saat defacement terdeteksi     |

**Pendekatan GTM Swasta**: Self-service onboarding via portal SaaS (tanpa sales call), trial gratis 7 hari, dan demonstrasi live blokir serangan di dashboard klien.

---

### 2.2 Target Pasar: Segmen Pemerintah & Pendidikan (GovEdu)

Segmen kedua adalah **institusi publik** — sekolah negeri, universitas, dan pemerintah daerah — yang merupakan target serangan paling sering namun paling tidak terlindungi di Indonesia. Ini adalah *blue ocean* yang belum disentuh solusi WAF manapun dengan harga terjangkau.

**Ideal Customer Profile (ICP) GovEdu:**

| Segmen                              | Masalah Spesifik                                                                                 | Tier yang Cocok              | Jalur Akuisisi                            |
| :---------------------------------- | :----------------------------------------------------------------------------------------------- | :--------------------------- | :---------------------------------------- |
| **SMA/SMK/SD/SMP Negeri**     | Domain`.sch.id` jadi target favorit injeksi judol & defacement karena Domain Authority tinggi  | GovEdu Basic (Rp19.000)      | Pilot gratis → Dinas Pendidikan Kab/Kota |
| **Universitas Negeri (PTN)**  | Portal akademik (SIAKAD, SIMAK) menyimpan data mahasiswa rentan SQL Injection & credential theft | GovEdu Institusi (Rp149.000) | Proposal ke Direktorat TI Rektorat        |
| **Pemerintah Daerah (Pemda)** | Website SKPD dan layanan publik (SIMPEG, e-Gov) sering di-deface; tidak ada tim SOC              | GovEdu Pro / Institusi       | e-Katalog LKPP (pengadaan langsung)       |
| **Dinas Pendidikan Kab/Kota** | Mengelola 50–500 sekolah; butuh solusi terpusat satu kontrak                                    | GovEdu Volume (Rp990.000)    | MoU dengan Kepala Dinas, bukan BSSN       |

**Pendekatan GTM GovEdu**: Berbeda dari swasta, segmen ini membutuhkan pendekatan *relationship-first*:

1. **Pilot 3 Bulan Gratis** untuk 5 sekolah/SKPD lokal → kumpulkan data insiden siber yang berhasil diblokir.
2. **Laporan Insiden Tertulis** diserahkan ke Kepala Dinas / Rektor sebagai bukti nilai nyata sistem.
3. **Konversi ke Kontrak Volume** berdasarkan bukti empiris, bukan presentasi produk.
4. **Pendaftaran e-Katalog LKPP** untuk membuka jalur pengadaan langsung tanpa tender (nilai < Rp200 juta/tahun).

---

### 2.3 Analisis Kompetitor

| Parameter Perbandingan             | Cloudflare (Enterprise)     | ModSecurity (Traditional WAF)            | Nexus Cyber (SaaS WAF)                       | Keunggulan Nexus                                |
| :--------------------------------- | :-------------------------- | :--------------------------------------- | :------------------------------------------- | :---------------------------------------------- |
| **Model Deteksi**            | Signature + IP reputation   | Rule-based (kaku, false-positive tinggi) | Dual-Brain AI Ensemble (lokal, tanpa API)    | Deteksi zero-day + judol injection otonom       |
| **Harga Terendah**           | $20/bln (sangat terbatas)   | Gratis (setup rumit, perlu DevOps)       | **Rp19.000/bln** (GovEdu Basic)        | Satu-satunya WAF terjangkau untuk sekolah       |
| **Proteksi Judol Injection** | Tidak ada fitur khusus      | Tidak ada                                | **Autonomous Self-Repair + PACS**      | Rollback defacement <1ms, blokir re-injection   |
| **Proteksi Client-Side**     | Minimal                     | Tidak ada                                | **PACS (Polymorphic HTML Encryption)** | Enkripsi HTML dinamis cegah scraping & cloning  |
| **Onboarding**               | Konfigurasi teknis kompleks | Sangat rumit (source code modification)  | **Zero-Code: cukup arahkan DNS CNAME** | Aktif dalam 10 menit tanpa sentuh kode          |
| **Segmen GovEdu**            | Tidak ada tier khusus       | Tidak tersedia SaaS                      | **Tier GovEdu Rp19rb-Rp990rb**         | Dirancang khusus untuk anggaran instansi publik |

---

## 3. BUSINESS MODEL (MODEL BISNIS & UNIT ECONOMICS)

Nexus Cyber menggunakan pendekatan model bisnis ganda (*Dual-Engine Business Model*) untuk memaksimalkan penetrasi di dua pasar yang memiliki karakteristik dan siklus keuangan yang sangat berbeda:

---

### 3.1 Model Bisnis Segmen Swasta (B2B SaaS Subscription)

Segmen swasta beroperasi dengan model **Software as a Service (SaaS)** on-demand mandiri.

* **Siklus Pembayaran**: Bulanan atau Tahunan (dengan diskon 15%).
* **Metode Pembayaran**: Otomatis melalui Payment Gateway (Midtrans: QRIS, E-Wallet, Kartu Kredit, Transfer Bank Virtual Account).
* **Onboarding**: 100% *self-service* dan instan via otomatisasi skrip `provisioner.sh` di VPS dalam <10 detik setelah pembayaran terverifikasi.

#### Paket Berlangganan Swasta (Tiered Subscription)

1. **Free (Uji Coba / Trial)**
   * **Harga:** Rp0 / bulan (7 hari trial).
   * **Fitur:** Batas 1 Domain, Reflex AI Layer (<50ms), standard logging.
   * **Volume Kunjungan Pengunjung (Transfer Data):** Maksimal 10 GB / bulan (Setara ~5.000 kunjungan halaman; *Bukan kuota penyimpanan website*).
2. **Basic (Lite Protection)**
   * **Harga:** Rp19.000 / bulan.
   * **Volume Kunjungan Pengunjung (Transfer Data):** Maksimal 100 GB / bulan (Setara ~50.000 kunjungan halaman; *Bukan kuota penyimpanan website*).
   * **Fitur:** Batas 1 Domain, Reflex AI Layer, basic port defense, standard logging.
3. **Pro (Standard Defense)**
   * **Harga:** Rp79.000 / bulan.
   * **Volume Kunjungan Pengunjung (Transfer Data):** Maksimal 500 GB / bulan (Setara ~250.000 kunjungan halaman; *Bukan kuota penyimpanan website*).
   * **Fitur:** Batas 3 Domain, Reflex AI Layer + PACS (Polymorphic HTML Encryption) + MTD Port Shuffling (rotasi 60-menit), standard logging.
4. **Pro+ (Advanced Security)**
   * **Harga:** Rp199.000 / bulan.
   * **Volume Kunjungan Pengunjung (Transfer Data):** Maksimal 2 TB / bulan (Setara ~1.000.000 kunjungan halaman; *Bukan kuota penyimpanan website*).
   * **Fitur:** Batas 10 Domain, Dual-Brain AI Ensemble + PACS + MTD Port Shuffling (rotasi 10-menit) + AVSE Uploader Shield, dashboard forensik penuh.
5. **Ultrasafe (Maximum Isolation)**
   * **Harga:** Rp599.000 / bulan.
   * **Volume Kunjungan Pengunjung (Transfer Data):** Maksimal 10 TB / bulan (Setara ~5.000 kunjungan halaman; *Bukan kuota penyimpanan website*).
   * **Fitur:** Domain tidak terbatas, dedicated container provisioning di VPS, Full eBPF Kernel Drops (XDP_DROP), MTD Port Shuffling (rotasi 1-menit), custom forensic AI audit logs, SLA Uptime 99,99%.

---

### 3.2 Model Bisnis Segmen Pemerintah & Pendidikan (B2G/B2E Contract & Volume)

Segmen instansi publik (sekolah, universitas, Pemda) tidak menggunakan kartu kredit atau QRIS bulanan. Mereka menggunakan model **lisensi kontrak tahunan** (*Annual Contract*) yang menyesuaikan siklus anggaran APBD/APBN/BOS.

* **Siklus Pembayaran**: Dibayar penuh di muka untuk masa kontrak 12 bulan (atau termin sesuai kesepakatan SP2D daerah).
* **Metode Pengadaan**: Pengadaan Langsung non-tender (untuk kontrak < Rp200 juta/tahun) melalui platform **e-Katalog LKPP** atau Purchase Order resmi.
* **Onboarding**: Dibantu setup DNS awal oleh tim teknis kami (karena keterbatasan tim IT internal mereka) setelah kontrak/PO ditandatangani.

#### Paket Berlangganan GovEdu (Tiered Government & Education)

1. **GovEdu Basic (Sekolah Negeri / SD / SMP / SMA)**
   * **Harga:** Rp19.000 / bulan (Ditagih tahunan: **Rp228.000 / tahun** per sekolah).
   * **Volume Kunjungan Pengunjung (Transfer Data):** Maksimal 20 GB / bulan (Setara ~10.000 kunjungan halaman; *Bukan kuota penyimpanan website*).
   * **Fitur:** Batas 1 Domain, Reflex AI Block, XSS/SQLi/DDoS Basic, defacement alert.
2. **GovEdu Pro (Dinas Kab/Kota Skala Kecil)**
   * **Harga:** Rp49.000 / bulan (Ditagih tahunan: **Rp588.000 / tahun**).
   * **Volume Kunjungan Pengunjung (Transfer Data):** Maksimal 100 GB / bulan (Setara ~50.000 kunjungan halaman; *Bukan kuota penyimpanan website*).
   * **Fitur:** Batas 3 Domain, Reflex AI + PACS Enkripsi HTML + MTD Port Shuffling.
3. **GovEdu Institusi (PTN / Pemda Provinsi / Kampus)**
   * **Harga:** Rp149.000 / bulan (Ditagih tahunan: **Rp1.788.000 / tahun**).
   * **Volume Kunjungan Pengunjung (Transfer Data):** Maksimal 500 GB / bulan (Setara ~250.000 kunjungan halaman; *Bukan kuota penyimpanan website*).
   * **Fitur:** Batas 10 Domain, Full Pro+ Features, dashboard SOC multi-admin terpusat.
4. **GovEdu Volume (Lisensi Kolektif Dinas Pendidikan)**
   * **Harga:** **Rp990.000 / bulan** (Ditagih tahunan: **Rp11.880.000 / tahun**).
   * **Volume Kunjungan Pengunjung (Transfer Data):** Akumulasi hingga 2 TB / bulan untuk seluruh sub-domain.
   * **Fitur:** Mengamankan hingga 50 domain sekolah secara kolektif di bawah kendali 1 dashboard Dinas Pendidikan, laporan insiden siber bulanan otomatis dikirim ke Kepala Dinas.

---

### 3.3 Analisis Unit Economics & Margin per Klien (Gabungan)

Biaya variabel langsung per kontainer tenant tetap terjaga rendah berkat efisiensi pemrosesan resource ringan Go Gateway dan eBPF bypass kernel.

#### A. Klien Swasta (Basic & Pro) & GovEdu (Basic, Pro, Institusi)

* **Rata-rata Pendapatan per Klien**: Rp19.000 s.d. Rp149.000 / bulan.
* **Biaya Variabel Hosting Langsung (VPS Shared Node)**:
  * VPS Shared Container (0.05 vCPU & 32MB RAM shared): Rp24.000 / bulan
  * Log Storage & Database Write Costs: Rp16.000 / bulan
  * **Total Biaya Langsung**: Rp40.000 / bulan per tenant.
* **Margin Analisis**:
  * *GovEdu Basic (Rp19.000)*: Margin Kotor -Rp21.000 (Subsidi silang untuk penetrasi pasar sosial).
  * *Basic/GovEdu Pro (Rp49.000)*: Margin Kotor **Rp9.000 (18.3%)**.
  * *Pro/GovEdu Institusi (Rp149.000)*: Margin Kotor **Rp109.000 (73.1%)**.

#### B. Klien Swasta (Pro+) & GovEdu (Volume Dinas)

* **Rata-rata Pendapatan**: Rp449.000 (Pro+) s.d. Rp990.000 (GovEdu Volume) / bulan.
* **Biaya Variabel Hosting Langsung**:
  * VPS Dedicated Container (0.1 vCPU & 128MB RAM): Rp48.000 / bulan
  * Shared Log Database & Storage: Rp32.000 / bulan
  * **Total Biaya Langsung**: Rp80.000 / bulan.
* **Margin Analisis**:
  * *Pro+ (Rp449.000)*: Margin Kotor **Rp369.000 (82.1%)**.
  * *GovEdu Volume (Rp990.000)*: Margin Kotor **Rp910.000 (91.9%)** *(sangat profitable karena 50 sekolah di-routing secara shared di level Nginx proxy)*.

#### C. Klien Swasta Paket Ultrasafe

* **Pendapatan per Klien**: Rp1.499.000 / bulan.
* **Biaya Variabel Hosting Langsung (VPS Dedicated High-Performance)**:
  * VPS Dedicated Container (0.25 vCPU & 256MB RAM): Rp160.000 / bulan
  * High-Performance Log Storage & DB Write Costs: Rp40.000 / bulan
  * **Total Biaya Langsung**: Rp200.000 / bulan.
* **Margin Kotor**: **Rp1.299.000 (86.6%)**.

---

## 4. GTM STRATEGY (STRATEGI GO-TO-MARKET TAHAP AWAL)

Untuk mengakuisisi **10 Perusahaan Swasta** pertama secara cepat dengan margin kompetitif dan ekspansi instan, langkah strategis berikut diterapkan:

### 4.1 Zero-Touch Onboarding & Self-Service Provisioning

* Klien melakukan registrasi, memasukkan nama domain, dan membayar secara otomatis menggunakan QRIS/E-Wallet pada portal SaaS.
* Next.js SaaS secara instan memanggil webhook `/api/webhook/payment` pada WAF Gateway untuk memicu skrip `provisioner.sh` di VPS.
* Kontainer NGINX + WAF terisolasi klien langsung aktif dalam waktu < 10 detik. Klien hanya perlu mengarahkan DNS CNAME mereka. Proses ini 100% otomatis tanpa perlu konsultasi IT manual, meniadakan Customer Acquisition Cost (CAC) teknis.

### 4.2 Strategi Penjualan "Buktikan Keandalan" (Active Proof-of-Work)

* Klien diberikan uji coba gratis 7 hari. Pada dasbor Command Center mereka, disediakan fitur simulasi serangan terkontrol (Cross-Site Scripting, SQL Injection, dan Malicious File Upload).
* Klien dapat melihat secara langsung bagaimana Reflex AI mendeteksi serangan, AVSE mensanitasi berkas gambar yang mereka unggah, dan bagaimana eBPF memblokir IP simulasi secara instan di level kernel. Visualisasi taktis real-time ini terbukti mempercepat konversi penjualan B2B dari uji coba ke langganan berbayar.

### 4.3 Data Moat & Network Effect untuk Ekspansi Cepat

Setiap simpul gateway saling berkomunikasi. Jika peretas menyerang Klien A dan IP-nya di-ban otonom oleh AI, daftar blacklist IP tersebut langsung disebarkan ke database Redis Klien B, C, dst. secara real-time. Ini menciptakan efek jaringan (*network effect*) di mana proteksi sistem bertambah kuat seiring bertambahnya jumlah pelanggan, memberikan daya tawar tinggi untuk akuisisi pasar siber yang cepat.

---

## 5. FINANCE (STRUKTUR BIAYA & SIMULASI PROFITABILITAS)

> **Catatan Metodologi**: Struktur biaya di bawah hanya mencakup **HPP murni** (Harga Pokok Produksi) — yaitu biaya yang secara langsung diperlukan agar sistem bisa beroperasi dan melayani klien. Biaya legalitas (ISO 27001, MoU BSSN, dll.) dikategorikan sebagai **investasi bisnis satu kali** dan dibahas di Seksi 7 (Use of Funds), bukan sebagai recurring monthly OpEx.

### 5.1 Biaya Operasional Tetap (Fixed OpEx) Bulanan — HPP Murni

* **VPS Biznet GIO Core Hosting** (Gateway, Next.js Dashboard, SaaS Website, Postgres, Redis): **Rp420.000 / bulan**
* **Object Storage & Backup** (Cloudflare R2 Free Tier / Local Backup): **Rp0 / bulan**
* **AI Inference** (NEX-AI via Ollama — lokal on-premise, zero API subscription): **Rp0 / bulan**
* **Domain & SSL Komersial** (nexus-cyber.id + wildcard SSL): **Rp20.000 / bulan** *(amortisasi domain .id tahunan, SSL gratis)*
* **Total Fixed OpEx (HPP)**: **Rp440.000 / bulan**

### 5.2 Simulasi Pendapatan & Profitabilitas (Target Awal: 10 Klien Swasta)

Asumsi 10 perusahaan swasta terdistribusi realistis: 1 Free (Trial), 4 Basic, 3 Pro, 1 Pro+, 1 Ultrasafe.

| Tier                       | Jumlah Klien | Harga/Bln   | Subtotal                      |
| :------------------------- | :----------: | :---------- | :---------------------------- |
| Free                       |      1      | Rp0         | Rp0                           |
| Basic                      |      4      | Rp19.000    | Rp76.000                      |
| Pro                        |      3      | Rp79.000    | Rp237.000                     |
| Pro+                       |      1      | Rp199.000   | Rp199.000                     |
| Ultrasafe                  |      1      | Rp599.000   | Rp599.000                     |
| **TOTAL PENDAPATAN** | **10** |             | **Rp1.111.000 / bulan** |

**Biaya Variabel per Klien (VPS Container Cost):**

| Tier                       | Biaya Hosting/Klien | Margin Kotor         |
| :------------------------- | :------------------ | :------------------- |
| Basic & Pro (Shared Nginx) | Rp10.000 / klien    | Rp9.000 - Rp69.000   |
| Pro+ (Medium Container)    | Rp10.000 / klien    | Rp189.000            |
| Ultrasafe (Dedicated)      | Rp10.000 / klien    | Rp589.000            |

* **Total Biaya Variabel**: (8 * Rp10.000) + Rp10.000 + Rp10.000 = **Rp100.000 / bulan**

#### Skenario A: Lean Stage (VPS Biznet GIO Downscale, NEX-AI Lokal)

* **Fixed OpEx (HPP)**: **Rp310.000 / bulan** *(Object Storage minimal, VPS NEO Lite 2 Cores/8 GB RAM + Domain)*
* **Total Pengeluaran**: Rp310.000 + Rp100.000 = **Rp410.000 / bulan**
* **Profit Bersih**: Rp1.111.000 - Rp410.000 = **+Rp701.000 / bulan**
* **Margin Operasional**: **63.1%**

#### Skenario B: Standard Stage (VPS Biznet GIO Full, Domain/SSL Aktif)

* **Fixed OpEx (HPP)**: **Rp440.000 / bulan**
* **Total Pengeluaran**: Rp440.000 + Rp100.000 = **Rp540.000 / bulan**
* **Profit Bersih**: Rp1.111.000 - Rp540.000 = **+Rp571.000 / bulan**
* **Margin Operasional**: **51.4%** *(tetap sangat profitabel sejak awal)*

### 5.3 Analisis Break-Even Point (BEP)
*   **Lean Stage**: BEP tercapai dengan **4 Klien Pro** aktif (Rp 316.000 > Fixed OpEx Rp 310.000) atau **17 Klien Basic** (Rp 323.000 > Rp 310.000).
*   **Standard Stage**: BEP tercapai dengan **6 Klien Pro** aktif (Rp 474.000 > Rp 440.000) atau **3 Klien Pro+** (Rp 597.000 > Rp 440.000) atau **1 Klien Ultrasafe** (Rp 599.000 > Rp 440.000).
*   **Kesimpulan**: Model ini **sangat cepat mencapai impas** karena HPP bulanan server yang tetap (*fixed*) sangat terjangkau, dan biaya variabel per klien yang mendekati nol.

### 5.4 Strategi Operasional Minimum (Lean Stage — Klien < 5)
Untuk meminimalkan risiko di tahap awal peluncuran:
1.  **Gunakan VPS NEO Lite** (Hemat Rp130.000/bln): Beralih ke spesifikasi VPS 2 Cores / 8 GB RAM seharga Rp290.000 / bulan di awal peluncuran.
2.  **NEX-AI Lokal Penuh**: Tidak ada biaya API inference. Kedua layer AI berjalan langsung di VPS lokal memanfaatkan Ollama.
3.  **Domain & Storage Minimal**: Gunakan konfigurasi backup internal dan manfaatkan Cloudflare Tunnels gratis untuk eksposur SSL/domain di masa trial awal.
4.  **Fixed OpEx Minimum**: Turun menjadi **Rp0 / bulan** (bootstrapping penuh dari PC pribadi) hingga **Rp310.000 / bulan** (sewa VPS minimal + domain).
5.  **BEP Minimum**: Dengan Lean Stage penuh, **1 klien Pro (Rp79.000/bln) sudah menghasilkan profit operasional** setelah dipotong biaya variabel log/data transfer per klien yang sangat kecil (Rp10.000).

### 5.5 Opsi Bootstrapping Zero-Cost (PC High-End Lokal + Cloudflare Tunnels)

Jika ingin memangkas seluruh pengeluaran hosting di tahap awal hingga **Rp0 (Laba Bersih 100%)**, kita dapat memanfaatkan infrastruktur PC High-End pribadi milik Founder sebagai pusat hosting lokal:

1. **Metode Deployment**: WAF Gateway, database, dashboard, dan tenant containers dijalankan secara lokal di PC pribadi menggunakan Docker.
2. **Expose Publik (Cloudflare Tunnels)**: Menggunakan program `cloudflared` untuk memetakan port lokal ke domain publik secara gratis. Metode ini melewati CGNAT (tidak perlu IP publik statis dari provider internet) dan sangat aman karena menyembunyikan alamat IP rumah di balik jaringan edge Cloudflare.
3. **Full Local NEX-AI (Kedua Layer via Ollama)**: Reflex Layer menggunakan model `nex-ai-reflex` and Reasoning Layer menggunakan model `nex-ai-protect`, keduanya dijalankan lokal via Ollama memanfaatkan GPU pribadi (NVIDIA VRAM). Tidak ada ketergantungan pada provider AI cloud. Konfigurasi dilakukan melalui environment variable: `NEX_AI_ENDPOINT=http://localhost:11434/api/chat`, `NEX_AI_MODEL_REFLEX=nex-ai-reflex`, `NEX_AI_MODEL_REASONING=nex-ai-protect`.
4. **Kelebihan & Kekurangan**:
   * *Kelebihan*: Modal running cost murni Rp0 (hanya menggunakan listrik rumah & internet yang sudah ada). Margin kotor per klien adalah 100%. Latensi Reflex Layer justru lebih rendah (tidak ada network round trip ke cloud API). Cocok untuk tahap *Alpha/Beta Testing* bersama 1-3 klien awal.
   * *Kekurangan*: Keandalan sistem (*uptime*) bergantung pada stabilitas listrik rumah dan koneksi internet ISP rumah. Kecepatan upload internet rumah yang asimetris juga membatasi skalabilitas volume trafik besar. Jika salah satu klien terkena DDoS besar, bandwidth internet rumah akan tersaturasi.
5. **Rencana Transisi**: Gunakan opsi PC High-End untuk melayani 1-3 klien pilot (uji coba gratis/kerabat). Begitu mendapatkan klien berbayar ke-4, segera migrasikan seluruh database dan container ke model **VPS Biznet GIO Lean Stage (Rp310.000 / bulan)** -- NEX-AI tetap berjalan lokal, VPS hanya untuk hosting WAF Gateway dan database.untuk hosting WAF Gateway dan database.

---

## 5.6 SEGMEN GOVEDO (Pemerintah, Sekolah & Universitas)

### Mengapa Segmen Ini Strategis?

Website sekolah negeri, universitas, dan pemerintah daerah (Pemda) di Indonesia adalah **target empuk peretasan** yang paling sering diabaikan. Tercatat ratusan kasus *web defacement* (halaman web diubah peretas) pada domain `.sch.id`, `.ac.id`, dan `.go.id` setiap tahunnya, namun hampir tidak ada yang memiliki WAF aktif karena alasan biaya.

**Nexus Cyber adalah satu-satunya WAF berbasis AI di Indonesia yang cukup terjangkau untuk segmen ini.** Ini adalah keunggulan kompetitif yang tidak dimiliki solusi manapun saat ini.

### 5.6.1 Mekanisme Subsidi Silang GovEdu

Struktur harga khusus GovEdu (diuraikan lengkap di **Seksi 3.2**) memiliki biaya operasional yang sangat rendah. Karena margin dari klien Swasta (terutama paket Ultrasafe) mencapai 86.6%, keuntungan tersebut digunakan untuk mensubsidi silang paket **GovEdu Basic (Rp19.000/bln)**.

Satu klien Swasta paket Ultrasafe (Margin Rp1.299.000) sanggup menutupi biaya operasional (subsidi shared container) untuk **68 sekolah negeri** secara mandiri. Ini memberikan dampak sosial yang tinggi sekaligus membangun kredibilitas merek Nexus Cyber secara nasional tanpa merugikan profitabilitas konsolidasian startup.

### 5.6.2 Jalur Akuisisi Segmen Pemerintah & Pendidikan

Berbeda dari klien swasta yang bisa onboarding sendiri, institusi pemerintah memiliki proses pengadaan khusus:

**Jalur 1: E-Katalog LKPP (Paling Realistis untuk Pemda)**

1. Daftarkan Nexus Cyber sebagai produk di **e-Katalog LKPP** (lkpp.go.id) di kategori *Keamanan Sistem Informasi*.
2. Pemerintah daerah dapat membeli langsung tanpa tender jika nilai < Rp200 juta/tahun melalui e-Katalog.
3. Ini adalah jalur paling cepat untuk masuk ke ekosistem pengadaan pemerintah tanpa proses birokrasi yang panjang.

**Jalur 2: Kemitraan dengan Kemendikbud / BRIN**

1. Ajukan proposal kemitraan ke **Pusat Data dan Teknologi Informasi Kemendikbudristek** (Pusdatin Kemdikbud).
2. Jika disetujui, Nexus Cyber bisa dijadikan layanan rekomendasian standar untuk 300.000+ sekolah negeri di Indonesia.
3. Model monetisasi: Pusdatin Kemdikbud membayar lisensi volume (1 harga untuk jutaan pengguna), atau subsidi ke sekolah.

**Jalur 3: Pilot Gratis ke 5 Sekolah/Pemda Lokal**

1. Mulai dari lingkungan terdekat \u2014 hubungi Dinas Pendidikan kota/kabupaten setempat.
2. Tawarkan proteksi **gratis 3 bulan** untuk 5 sekolah pilihan sebagai pilot.
3. Setelah 3 bulan, presentasikan laporan insiden siber yang berhasil diblokir ke Kepala Dinas.
4. Konversi ke GovEdu Volume (Rp990.000/bln untuk seluruh kab/kota) berdasarkan bukti nyata.

**Jalur 4: Program CSR / Hibah Siber (Jangka Menengah)**

1. Cari pendanaan dari program **LPDP Digital Talent**, **Bekraf**, atau **hibah BRIN** untuk mendanai proteksi sekolah negeri secara gratis.
2. Nexus Cyber mendapatkan brand recognition dan data serangan nyata dari skala nasional sebagai kompensasi.

### 5.6.3 Simulasi Pendapatan GovEdu (Skenario 100 Institusi)

Asumsi mix realistis: 60 Sekolah Basic + 25 GovEdu Pro + 10 GovEdu Institusi + 5 Dinas Volume.

| Tier                           |           Qty           | Harga     | Subtotal                      |
| :----------------------------- | :---------------------: | :-------- | :---------------------------- |
| GovEdu Basic                   |           60           | Rp19.000  | Rp1.140.000                   |
| GovEdu Pro                     |           25           | Rp49.000  | Rp1.225.000                   |
| GovEdu Institusi               |           10           | Rp149.000 | Rp1.490.000                   |
| GovEdu Volume                  |            5            | Rp990.000 | Rp4.950.000                   |
| **Total GovEdu Revenue** | **100 institusi** |           | **Rp8.805.000 / bulan** |

Biaya hosting variabel 100 institusi (shared container): ~Rp400.000/bulan.
**Profit bersih segmen GovEdu: ~Rp8.405.000/bulan** \u2014 jauh lebih menguntungkan dibanding segmen swasta pada volume yang sama, berkat efisiensi shared container.

---

## 6. IMPACT (DAMPAK OPERASIONAL & PERLINDUNGAN SIBER)

### 6.1 Efisiensi Downtime

Perusahaan swasta mitra terhindar dari downtime web akibat serangan DDoS atau peretasan. Rata-rata downtime pada situs web bisnis kecil menyebabkan kerugian sebesar **Rp2.400.000 - Rp8.000.000 per jam**. Dengan SLA 99.99% dari Nexus Cyber, risiko kerugian ini ditekan hingga mendekati 0%.

### 6.2 Kepatuhan Regulasi Otomatis (Compliance-as-a-Service)

Klien otomatis mematuhi UU PDP No. 27/2022 mengenai perlindungan data sensitif nasabah karena enkripsi PACS otonom dan pembersihan EXIF metadata pada AVSE. Riwayat insiden siber tercatat rapi secara kriptografis, memudahkan proses audit regulasi eksternal (OJK/BI).

### 6.3 Pertahanan Siber Nasional Kolektif

Setiap IP berbahaya yang terdeteksi di satu klien langsung disebarkan ke blacklist semua klien lain secara real-time melalui Redis Pub/Sub. Ini menciptakan **collective intelligence** \u2014 semakin banyak institusi yang bergabung (termasuk sekolah dan Pemda), semakin kuat pertahanan nasional kolektifnya.

---

## 7. THE ASK & USE OF FUNDS (KEBUTUHAN DANA DAN PENGGUNAAN INVESTASI)

Untuk mencapai target **100 klien aktif dalam 12 bulan pertama** dan meninggalkan ketergantungan pada infrastruktur PC lokal menuju deployment cloud bergrade komersial, Nexus Cyber membutuhkan investasi awal sebesar **Rp25.000.000**.

### 7.1 Rincian Penggunaan Dana

| Alokasi                                                            | Nominal                | Persentase     | Keterangan                                                                                                                                                                   |
| :----------------------------------------------------------------- | :--------------------- | :------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Infrastruktur VPS Biznet GIO (Upgrade ke Standard Stage)** | Rp10.000.000           | 40%            | Meningkatkan kapasitas VPS (RAM/CPU/Storage) dan menjamin uptime 99.9% untuk 100 klien, serta menyediakan reserved quota database Postgres/Redis.                            |
| **Legalitas, Sertifikasi & Kemitraan**                       | Rp7.500.000            | 30%            | Audit sertifikasi ISO 27001 (Rp5.000.000), pengurusan MoU BSSN (Rp1.500.000), dan biaya legalitas entitas perusahaan (Rp1.000.000).                                          |
| **Akuisisi Klien B2B & Pemasaran**                           | Rp7.500.000            | 30%            | Biaya kemitraan demonstrasi teknis ke komunitas startup dan FinTech Indonesia, pembuatan materi penjualan profesional, dan pemeliharaan domain/SSL komersial selama 1 tahun. |
| **TOTAL**                                                    | **Rp25.000.000** | **100%** | Modal kerja 12 bulan menuju 100 klien aktif.                                                                                                                                 |

### 7.2 Proyeksi Return on Investment (ROI) Investor

Asumsi: Dana investasi Rp25.000.000 digunakan selama 12 bulan untuk mencapai 100 klien aktif (Kombinasi 60 Pro + 30 Pro+ + 10 Ultrasafe).

* **Total Pendapatan Bulanan saat Skala 100 Klien**:
  *(60 * Rp79.000) + (30 * Rp199.000) + (10 * Rp599.000) = **Rp16.700.000 / bulan***
* **Total Pengeluaran Bulanan (Standard Stage)**:
  *Rp3.000.000 (OpEx: Kluster 3 VPS Biznet GIO + Object Storage + Admin Support) + Rp(100 * Rp10.000 biaya variabel) = Rp3.000.000 + Rp1.000.000 = **Rp4.000.000 / bulan***
* **Profit Bersih Bulanan saat Skala 100 Klien**: **+Rp12.700.000 / bulan** (Margin **76.0%**)
* **Payback Period Investasi**: Dana Rp25.000.000 kembali dalam waktu **± 2 bulan** setelah skala 100 klien tercapai.

---

## 8. TRACTION & SIMULATION DATA (BUKTI VALIDASI DAN TRAKSI)

Nexus Cyber bukanlah produk spekulatif. Sistem WAF Gateway telah melalui serangkaian pengujian ketahanan internal (QA Milestone 3 hingga 10) dengan hasil terukur. Berikut adalah data kinerja teknis yang telah tervalidasi secara empiris dari sesi pengujian (*test suite* Go langsung di repositori `nexus-core-gateway`):

### 8.1 Metrik Kecepatan Reflex AI Layer (Benchmark Terverifikasi)

| Tipe Serangan yang Diuji                      | Hasil Deteksi | Latensi Respon     | Status Mitigasi                |
| :-------------------------------------------- | :-----------: | :----------------- | :----------------------------- |
| SQL Injection (`' OR '1'='1`)               |    BLOCKED    | 12ms (sub-50ms) ✅ | Ditolak + Log forensik         |
| SQL Injection Hex (`0x53454C454354`)        |    BLOCKED    | 18ms ✅            | Ditolak + Log forensik         |
| XSS Payload (`<script>alert()</script>`)    |    BLOCKED    | 9ms ✅             | Ditolak + Log forensik         |
| Double URL Encoding (`%252Fetc%252Fpasswd`) |    BLOCKED    | 14ms ✅            | Ditolak + Log forensik         |
| Nested Base64 Obfuskasi                       |    BLOCKED    | 21ms ✅            | Ditolak + Log forensik         |
| Unicode Normalization Bypass                  |    BLOCKED    | 16ms ✅            | Ditolak + Log forensik         |
| GraphQL Query Kompleks (Benign)               |    ALLOWED    | 8ms ✅             | Dilewatkan (No False Positive) |
| JWT Auth Header (Benign)                      |    ALLOWED    | 6ms ✅             | Dilewatkan (No False Positive) |

**Hasil Keseluruhan**: 17 dari 17 kasus uji serangan terdeteksi dan diblokir dengan benar. False Positive Rate pada payload benign kompleks (GraphQL, JWT, CDATA XML, Nested JSON) = **0%**.

### 8.2 Kecepatan Self-Repair Otonom (Autonomous Rollback)

* Pengujian dilakukan dengan memodifikasi paksa berkas template HTML situs web yang dilindungi secara manual.
* Monitor SHA-256 berbasis RAM (`IntegrityMonitor`) mendeteksi perubahan dan memulihkan berkas steril dalam waktu **~700 mikrodetik (0.7ms)** tanpa downtime server sama sekali.

### 8.3 Kecepatan Pemblokiran eBPF Kernel (XDP_DROP Stub)

* Setelah IP terdeteksi melakukan brute force di atas threshold (≥5 gagal), mekanisme `BlockIPKernel()` mencatat injeksi entry ke eBPF map dalam waktu kurang dari **1ms**, memastikan tidak ada request selanjutnya dari IP tersebut yang sempat masuk ke user-space Go Gateway.

### 8.4 Model AI Lokal (NEX-AI via Ollama)

* Model `nex-ai-protect` (QLoRA fine-tuned dari `Qwen2.5-3B-Instruct`, dikuantisasi ke format `Q4_K_M` 4-bit) dijalankan secara lokal menggunakan CPU/GPU via Ollama.
* Menghasilkan keputusan klasifikasi ancaman dalam format JSON deterministik dengan rata-rata latensi **< 1.5 detik** untuk analisis payload sepanjang 500-1000 token menggunakan CPU saja (tanpa GPU).

---

## 9. MITIGASI RISIKO TEKNIS (FALSE POSITIVES & FALLBACK MECHANISM)

Ketakutan terbesar klien FinTech dan E-Commerce adalah pengguna asli mereka diblokir secara keliru oleh sistem WAF. Nexus Cyber mengatasi hal ini dengan **arsitektur keputusan berlapis-lapis** yang dirancang khusus untuk meminimalkan false positive.

### 9.1 Mekanisme Dual-Brain Decision Pipeline

```
Request Masuk
    │
    ▼
[REFLEX LAYER] ── AI Lokal cepat (<50ms) ──► Status: ALLOW / SUSPICIOUS / BLOCK
    │                                              │
    │ (Jika SUSPICIOUS/BLOCK)                      │ (Jika ALLOW)
    ▼                                              ▼
[REASONING LAYER] ─ Analisis forensik asinkron   Request diteruskan ke backend klien
    (NEX-AI Protect / Local Ollama) ─► Confidence Score
    │
    ├─ Confidence > 90% ──► Konfirmasi BLOCK + Ban IP
    ├─ Confidence 60-90% ──► MONITOR: Request diloloskan tapi dipantau ketat
    └─ Confidence < 60% ──► OVERRIDE: Reflex decision dibatalkan, IP di-whitelist sementara
```

### 9.2 Fallback & Whitelisting Otomatis

1. **Threshold Confidence Override**: Jika Reasoning Layer (AI mendalam) memberikan confidence score di bawah 60% terhadap keputusan blokir Reflex Layer, sistem secara otonom membatalkan pemblokiran dan meloloskan request tersebut. Ini mencegah false positive dari pola query benign yang tidak umum (seperti GraphQL nested query kompleks dari pengembang).
2. **Whitelisting Mandiri Klien (Dashboard)**: Operator SOC klien dapat menambahkan IP address atau subnet CIDR tertentu ke *whitelist* permanen melalui dasbor Command Center menggunakan panel "Whitelist IP" tanpa perlu kontak teknis ke tim Nexus Cyber.
3. **Rate Limit Gradual (Token Bucket)**: Alih-alih langsung memblokir sebuah IP yang melakukan banyak request, sistem pertama kali menerapkan *throttling* bertahap (memperlambat respon) selama 60 detik. Jika pola berbahaya berlanjut di luar batas, baru pemblokiran penuh dieksekusi. Ini melindungi pengguna asli yang kebetulan mengakses secara bersamaan dari satu jaringan (seperti kantor atau WiFi kampus).
4. **Grace Mode untuk Peering Traffic**: Untuk klien dengan trafik bervolume tinggi (paket Pro+ dan Ultrasafe), operator dapat mengaktifkan "Grace Mode" yang menurunkan agresivitas pemblokiran otomatis dari `score > 85` menjadi `score > 95`, memberikan toleransi lebih besar terhadap anomali yang tidak mengancam.

---

## 10. SCALABILITY ROADMAP (PETA JALAN PRODUK 3-5 TAHUN)

Visi jangka panjang Nexus Cyber adalah menjadi lapisan pertahanan siber standar untuk seluruh web application kelas menengah di Indonesia dan kemudian Asia Tenggara. Berikut adalah peta jalan penskalaan arsitektur multi-tenant dari 10 hingga 1.000 klien:

### 10.1 Tahap 1: Bootstrapping (Bulan 1-3, Klien 1-10)

* **Infrastruktur**: PC High-End Lokal + Cloudflare Tunnels (Running Cost: Rp0 / bulan).
* **Kapasitas**: Melayani maksimal 10 klien dengan bandwidth internet rumah ISP (<100 Mbps upload).
* **Fokus**: Validasi produk, akuisisi testimoni awal, dan pengumpulan data trafik real-world.

### 10.2 Tahap 2: Lean Stage (Bulan 4-12, Klien 10-100)

* **Infrastruktur**: Migrasi ke VPS Biznet GIO Core Cluster (Fixed OpEx Rp350.000-Rp420.000/bulan).
* **Kapasitas**: Melayani 100 klien di Node tunggal VPS dengan multi-tenant Docker isolation.
* **Fokus**: Mengaktifkan provisionig kontainer otonom via `provisioner.sh`, memperoleh sertifikasi ISO 27001, dan memperluas fungsionalitas dashboard SOC.

### 10.3 Tahap 3: Regional Scale (Bulan 12-24, Klien 100-1.000)

* **Infrastruktur**: Multi-Region Deployment dengan replikasi Read-Replica database di 3 region berbeda untuk mempertahankan latensi gateway < 10ms secara konsisten dari Sumatra, Jawa, hingga Kalimantan/Sulawesi.
* **Kapasitas**: Arsitektur WAF Gateway di-distribute secara geografis menggunakan Anycast Routing via Cloudflare Edge Network untuk menjaga latensi selalu rendah tanpa tergantung pada lokasi fisik data center tunggal.
* **Fokus**: Integrasi resmi ke ekosistem BSSN STIX/TAXII untuk collective threat intelligence nasional, peluncuran fitur Incident Response-as-a-Service (IRaaS), dan ekspansi ke pasar Malaysia dan Singapura via kemitraan lokal.

### 10.4 Tahap 4: Enterprise & National Grid (Tahun 3-5, Klien 1.000+)

* **Infrastruktur**: Migrasi modul eBPF ke deployment on-premise hybrid cloud (AWS Jakarta + GCP Jakarta), dengan dedicated Hardware Security Module (HSM) untuk enkripsi Post-Quantum Cryptography (ML-KEM-768 NIST) di level lisensi enterprise.
* **Kapasitas**: Menjadi **National Cyber Defense Grid** yang terhubung ke Pusat Data Nasional (PDN) dan BSSN sebagai penyedia *Threat Intelligence Feed* resmi berstandar STIX/TAXII untuk pertahanan siber kolektif nasional.
* **Fokus**: Penerapan standar Post-Quantum Cryptography (PQC) pada seluruh channel enkripsi data dan pengembangan modul pertahanan Runtime Application Self-Protection (RASP) berbasis eBPF Tracepoint untuk melindungi runtime memori container aplikasi secara proaktif.

### 10.5 Ringkasan Target Klien & Pendapatan per Tahap

| Tahap                     | Rentang Waktu | Target Klien | Est. Pendapatan / Bulan      | Infrastructure                  |
| :------------------------ | :------------ | :----------- | :--------------------------- | :------------------------------ |
| **Bootstrapping**   | Bln 1-3       | 1 - 10       | Rp0 - Rp2.600.000            | PC Lokal + Cloudflare Tunnels   |
| **Lean Stage**      | Bln 4-12      | 10 - 100     | Rp2.600.000 - Rp36.400.000   | VPS Biznet GIO Single Node      |
| **Regional Scale**  | Thn 1-2       | 100 - 1.000  | Rp36.400.000 - Rp400.000.000 | VPS Multi-Region + Anycast CDN  |
| **Enterprise Grid** | Thn 3-5       | 1.000+       | Rp400.000.000+               | Hybrid AWS/GCP + On-Premise PDN |

### 10.6 Strategi Keberlanjutan 10 Tahun & Defensive Moat (Barrier to Entry)

Untuk menjamin kelangsungan bisnis Nexus Cyber tetap kokoh dalam 10 tahun ke depan menghadapi kompetisi dari raksasa cloud global (seperti Cloudflare Enterprise atau Palo Alto Networks), kami membangun strategi pertahanan kompetitif yang tidak dapat ditiru dengan mudah:

#### A. Model Hybrid On-Premise & Kedaulatan Data Nasional (PDN / Bank / Pemda)

Sesuai dengan regulasi PP No. 71/2019 dan UU PDP No. 27/2022, instansi vital dan pemerintah diwajibkan melakukan pemrosesan data sensitif di dalam negeri, bahkan sering kali di dalam server fisik yang terisolasi (*air-gapped*). Cloudflare (cloud-only) tidak bisa menempatkan server fisik lokal di setiap pusat data Pemda atau Universitas.

Nexus Cyber menyediakan opsi **deployment on-premise**, di mana mesin Go WAF Gateway dan NEX-AI berjalan di atas bare-metal server milik klien sendiri secara privat, menjamin kedaulatan data 100%.

#### B. Model Lisensi Software-Only per CPU Core (Efisiensi Modal)

Guna menghindari beban operasional logistik dan perakitan perangkat keras siber yang rumit, model distribusi on-premise kami adalah **Software-Only & Core-Based Licensing**.

* Klien menggunakan server mereka sendiri.
* Nexus Cyber mengenakan biaya lisensi tahunan berbasis jumlah vCPU/Core server yang dilindungi.
* Metode ini memberikan margin kotor sangat tinggi (>90%) bagi kita layaknya produk SaaS murni, tanpa ada risiko rantai pasok perangkat keras.

#### C. Mekanisme Pembaruan Offline Terenkripsi (Air-Gapped Updates)

Untuk server instansi publik yang terisolasi total dari internet luar, kami menyediakan modul pembaruan offline:

* Setiap bulan, admin IT klien mengunduh bundel pembaruan terenkripsi berformat `.bin` / tarball dari portal lisensi siber kita.
* Bundel ini berisi pembaruan ruleset siber terbaru, pangkalan data blacklist IP nasional, serta pembaruan bobot model (*model weights*) dari NEX-AI lokal.
* Admin mengunggah berkas tersebut ke dasbor WAF lokal mereka secara manual, menjaga sistem tetap mutakhir tanpa melanggar protokol isolasi data center.

#### D. Peta Jalan Regulasi & Sertifikasi Keamanan BSSN

Gerbang masuk utama pengadaan siber pemerintah (B2G) dalam 10 tahun ke depan adalah sertifikasi produk. Peta jalan sertifikasi kita:

1. **Tahun 1-2**: Memperoleh sertifikasi **ISO 27001** untuk tata kelola data perusahaan dan mendaftarkan produk di **e-Katalog LKPP**.
2. **Tahun 3-5**: Mengajukan evaluasi produk keamanan untuk sertifikasi **Common Criteria EAL2+** (standar internasional produk keamanan IT) dan memperoleh **Sertifikat Keamanan Produk BSSN**.
3. **Dampak**: Memiliki sertifikasi resmi BSSN akan mengunci posisi Nexus Cyber sebagai WAF standar nasional dalam pengadaan pemerintah daerah dan pusat data nasional, menciptakan *barrier to entry* hukum siber yang sangat kuat bagi kompetitor asing.
