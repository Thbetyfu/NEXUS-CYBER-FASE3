# DOKUMEN KEBUTUHAN PRODUK (PRODUCT REQUIREMENT DOCUMENT - PRD)
## NEXUS CYBER - AUTONOMOUS TACTICAL DEFENSE GRID

**Status implementasi (selaras kode, 2026-08-20):** WAF `:8080` + SOC `:8081`, CSRF gateway ada, sesi pengunjung wajib pada mutasi/API asing di data plane (lab Gallery/vault dikecualikan), telemetri operator **tidak** di `:8080` (404), satu `PROTECTED_HOST` per instance (bukan CNAME SaaS massal), sesi operator cookie (bukan JWT enterprise), autoban vault 5× aktif, Gallery portofolio ada, pager Telegram lab jika `TELEGRAM_*` diisi (GeoIP jujur, bukan GPS), NEX-RED **defense delta** lab (bukan setara Shannon), eBPF stub, pembayaran webhook fail-closed **ditunda**, back-office super-admin pelanggan **belum** (lihat F-10). Visi SaaS/B2G di bawah tetap sebagai produk; jangan dibaca seolah sudah lengkap di repo.

---

## 1. METADATA & KONTEKS GLOBAL

- **Nama Proyek:** Nexus Cyber (Autonomous Tactical Defense Grid & SOC Command Center)
- **Versi PRD & Tanggal:** v2.1.0 / 2026-08-15
- **Target Tech Stack:**
  - **Frontend:** Next.js 14+ (App Router), Tailwind CSS, Zustand, Recharts (untuk dashboard admin) & React + Vite, Tailwind CSS, TypeScript (untuk target website portofolio).
  - **Backend / API:** Go (Golang) Standard Library (sebagai high-performance WAF API Gateway) & Node.js/Python (untuk backend tiruan/mock target).
  - **Database & ORM:** PostgreSQL dengan GORM & Redis untuk distributed caching/rate-limiting.
  - **Autentikasi:** `NEXUS_LICENSE_KEY` (lisensi), cookie `nexus_admin_token` / header `X-Nexus-Admin-Token` di control plane, challenge sesi situs. **Bukan** JWT RBAC enterprise.
- **Arsitektur & Standar Kode:** SOLID Principles, Clean Architecture, Go standard project layout, React component-driven development, type safety dengan TypeScript & Go type structures.
- **Peran AI (AI Persona Prompts):**
  > Bertindaklah sebagai Senior Full-Stack Developer, Software Architect, dan QA Engineer berpengalaman. Semua respons, struktur kode, skema database, dan pengujian yang Anda hasilkan nanti harus mematuhi batasan teknologi dan standar yang didefinisikan dalam dokumen ini tanpa pengecualian.

---

## 2. RINGKASAN PRODUK & TARGET PENGGUNA

### 2.1 Masalah & Solusi (Problem & Solution)
- **Problem Statement:** Mitigasi serangan siber (DDoS, SQL Injection, XSS, Defacement) di level gateway sering kali memakan resource CPU/RAM tinggi di layer aplikasi, lambat memproses ancaman secara kognitif, dan sulit memulihkan visual web secara mandiri tanpa downtime. Selain itu, belum ada sistem monetisasi sewa langganan (multi-tenant WAF) yang terintegrasi secara otomatis, serta belum adanya lingkungan pengujian ketahanan portofolio web yang terpadu.
- **Product Vision:** Membangun ekosistem pertahanan siber otonom (SOC) terintegrasi yang menggabungkan mitigasi super cepat (Reflex AI Layer) dengan analisis mendalam (Reasoning AI Layer), Moving Target Defense (MTD) untuk rotasi port acak, Honeypot tarpit, proteksi visual steganografi, dan paywall proteksi multi-tenant SaaS yang dikendalikan penuh dari panel web dashboard Command Center modern.

### 1.3 Target Pengguna & 3 Skema Deployment

1. **B2G Government & Public Schools (Self-Hosted On-Premise / PDN)**:
   - **Target**: Kementerian (Kemenkes), BUMN (KAI), **Dinas Pendidikan & UPTD Sekolah Negeri (SMAN 1 Samarinda)**, Perguruan Tinggi Negeri (Unmul/Telkom University).
   - **Deployment**: **100% Self-Hosted On-Premise / Local PDN di Server Fisik Sendiri**. Zero-Code Middleware Proxy di depan web server lokal instansi. Data sensitif (NIK, Dapodik, NIK Guru) tetap 100% lokal (*Data Sovereignty*). Lisensi Kontrak Tahunan via **SIPLah & E-Katalog LKPP**.
2. **B2B Enterprise Swasta (Self-Hosted On-Premise / Private Data Center)**:
   - **Target**: Bank Swasta Besar (BCA/Mandiri Swasta), Rumah Sakit Swasta Besar, Korporasi Swasta Gede yang **memiliki Data Center / Server Sendiri**.
   - **Deployment**: **100% Self-Hosted On-Premise di Private Server Swasta**. Enterprise Contract License Tahunan dengan integrasi SIEM & Slack/Telegram SOC.
3. **B2B Micro & SME / UMKM (Managed Cloud Proxy SaaS)**:
   - **Target**: UMKM Retail (**Toko WIN Electronic - Bapak Tjhin Fui Men**), Startup, Toko Swasta Kecil, & Web Hosting Swasta tanpa server sendiri.
   - **Deployment**: **Multi-Tenant Cloud SaaS Proxy (CNAME Routing)** dengan fitur push alert Telegram per-domain (**Paket Starter UMKM Rp19.000/bulan** ditagih tahunan Rp228.000/tahun).

### 2.2 Target Pengguna (User Personas)
1. **Role: SOC Administrator (Security Operator / CSIRT Dinas / SOC Swasta)**
   - Deskripsi: Mengawasi metrik lalu lintas real-time, meninjau log serangan AI, memicu rotasi port darurat (Emergency Shuffle), memblokir/membuka IP secara manual, serta menerima notifikasi insiden via Telegram Group CSIRT (B2G/Enterprise Self-Hosted) atau Multi-Tenant Alert (B2B Micro).
2. **Role: Tenant Swasta B2B Micro / UMKM (E-Commerce / Retail Owner)**
   - Deskripsi: Pemilik domain bisnis swasta yang menggunakan skema **Cloud SaaS Multi-Tenant Proxy**. Cukup mengarahkan DNS CNAME dan menerima notifikasi push Telegram otomatis per domain di HP tanpa perlu mengurus server.
3. **Role: Admin Instansi Pemerintah B2G / Enterprise (Pemda / Diskominfo / Sekolah / Bank Swasta)**
   - Deskripsi: Penanggung jawab IT sektor publik/enterprise yang menggunakan skema **Self-Hosted On-Premise** di server lokal instansi / Data Center swasta. Seluruh data & AI lokal berjalan di dalam jaringan instansi (Lokal Air-Gapped / Outbound Telegram Alert).
4. **Role: Attacker (Hacker / Bot Umpan)**
   - Deskripsi: Pihak asing yang memindai port atau mencoba melakukan eksploitasi, yang secara otomatis dialihkan ke Isolated Honeypot/Tarpit untuk diisolasi dan dianalisis intensinya.

---

## 3. ARSITEKTUR INFORMASI & STRUKTUR HALAMAN

Hierarki halaman (*Sitemap*) dan batasan akses sistem terbagi menjadi dua lingkungan utama:

### 3.1 Dasbor Admin Command Center (Next.js)
- `/` (Landing & Main Dashboard) → `[Akses: Terproteksi Admin]`
  - Menampilkan metrik serangan, status MTD, telemetri RAM/CPU, list domain SaaS, dan terminal CLI interaktif.
- `/api/telemetry` → `[Akses: API Internal]`
  - Mengembalikan statistik lalu lintas WAF secara real-time.
- `/api/ai-events` & `/api/ai/stream` → `[Akses: API Internal/SSE]`
  - Saluran data asinkron untuk update peristiwa serangan siber kognitif.
- `/api/routes` → `[Akses: API Internal]`
  - Endpoint dinamis untuk menambah/menghapus proxy routing domain client.
- `/api/blacklist` & `/api/blacklist/ban` / `/api/blacklist/unban` → `[Akses: API Internal]`
  - Antarmuka manajemen status pemblokiran IP.

### 3.2 Target Uji Ketahanan (Website Portfolio & Sandbox)
- `/` (Landing Page Portofolio) → `[Akses: Publik, Dilindungi PACS]`
  - Halaman portofolio utama milik Thoriq yang dilindungi oleh enkripsi payload HTML dinamis.
- `/api/upload` → `[Akses: Publik, Difilter oleh AVSE di WAF]`
  - Endpoint simulasi untuk mengunggah gambar dan mendemonstrasikan proteksi steganografi.
- `/api/unlock-reward` → `[Akses: Publik, Dilindungi Brute Force Guard di WAF]`
  - Endpoint validasi password untuk mendapatkan tautan hadiah/Shopee Kaget.

---

## 4. SPESIFIKASI FITUR DETAIL

### Fitur ID: F-01 - Dual-Brain AI Ensemble (Reflex & Reasoning)
- **Status:** **[Sudah ada]**
- **User Story:** Sebagai SOC Administrator, saya ingin sistem menganalisis setiap request mencurigakan menggunakan kecerdasan buatan dua lapis agar serangan terblokir di bawah 50ms dan dianalisis intensinya secara forensik secara asinkron.
- **Aturan Bisnis:**
  - Reflex Layer harus memproses metadata request (IP, method, pattern) secara sinkron dengan latensi `< 50ms`.
  - Reasoning Layer hanya dipanggil asinkron (goroutine) jika Reflex mendeteksi status `SUSPICIOUS`.
- **Kriteria Penerimaan (Acceptance Criteria):**
  - **Skenario 1: Deteksi Serangan Cepat (Reflex)**
    - **Given:** Request masuk ke gateway dengan payload `' OR '1'='1`.
    - **When:** Reflex Layer mengevaluasi metadata tersebut.
    - **Then:** Gateway mengklasifikasikan sebagai `MALICIOUS`, memblokir request, dan secara asinkron mengirim ke Reasoning Layer.
  - **Skenario 2: Analisis Forensik Asinkron (Reasoning)**
    - **Given:** Request dengan status `SUSPICIOUS` diterima oleh gateway.
    - **When:** Antrean goroutine asinkron memanggil model Reasoning Qwen3 235B.
    - **Then:** Hasil laporan forensik formal berupa berkas metadata disimpan ke database PostgreSQL (`threat_logs`).

### Fitur ID: F-02 - Moving Target Defense (MTD) - Topology Shuffler & Honeypot
- **Status:** **[Sudah ada]**
- **User Story:** Sebagai SOC Administrator, saya ingin port backend komunikasi internal dirotasi secara berkala menggunakan CSPRNG agar hacker tidak bisa memetakan arsitektur jaringan internal.
- **Aturan Bisnis:**
  - Rotasi port backend default diatur setiap 60 detik secara berkala.
  - Honeypot berjalan terpisah pada port `:9090` dan menahan koneksi selama 8 detik secara acak (Tarpit Delay).
- **Kriteria Penerimaan (Acceptance Criteria):**
  - **Skenario 1: Rotasi Port Otomatis & Graceful**
    - **Given:** Scheduler MTD mencapai batas waktu 60 detik.
    - **When:** Router memicu rotasi port backend secara dinamis.
    - **Then:** Port backend dirotasi secara *graceful* tanpa memutus request yang sedang berjalan (zero connection drop).
  - **Skenario 2: Attacker Terjebak Honeypot**
    - **Given:** Alamat IP mengakses port `:9090` secara langsung.
    - **When:** Socket dial diterima oleh Honeypot.
    - **Then:** Koneksi ditahan selama 8 detik menggunakan delay CSPRNG dan IP langsung didaftarkan ke Redis Blacklist.

### Fitur ID: F-03 - eBPF Kernel-Level Network Monitoring
- **Status:** **[Stub - belum terhubung ke driver eBPF real Linux]**
- **User Story:** Sebagai SOC Administrator, saya ingin IP penyerang diblokir di tingkat driver jaringan (XDP_DROP) agar CPU server tidak terbebani oleh paket DDoS.
- **Aturan Bisnis:**
  - *[Belum ada]* Integrasi driver real kernel Linux menggunakan pustaka `cilium/ebpf`.
  - Sistem saat ini masih menggunakan `ebpf_stub.go` yang mensimulasikan output log tanpa menjatuhkan paket di level kernel.
- **Kriteria Penerimaan (Acceptance Criteria):**
  - **Skenario 1: Pemanggilan API Pemblokiran Kernel (Simulasi)**
    - **Given:** IP terdeteksi melakukan serangan brute force.
    - **When:** Gateway memanggil fungsi `BlockIP()` di modul eBPF.
    - **Then:** Sistem menuliskan log `[eBPF-KERNEL] (STUB) IP ... injected into eBPF map` tetapi tidak ada pembuangan paket sesungguhnya pada kernel OS.

### Fitur ID: F-04 - AVSE (Anti-Visual Steganography Engine)
- **Status:** **[Sudah ada]**
- **User Story:** Sebagai Pengguna Situs, saya ingin gambar yang saya unggah dibersihkan dari metadata lokasi (EXIF) dan kode eksploitasi visual agar privasi saya terjaga dan server aman dari malware steganografi.
- **Aturan Bisnis:**
  - Verifikasi signature byte biner (Magic Bytes) untuk meloloskan tipe file gambar sah (JPEG/PNG/GIF/WebP).
  - Melakukan destructive re-encoding: dekode piksel gambar mentah ke RAM, lalu tulis ulang dari nol (EXIF & metadata otomatis hilang).
- **Kriteria Penerimaan (Acceptance Criteria):**
  - **Skenario 1: Pembersihan Gambar dari Payload Steganografi**
    - **Given:** Hacker mengunggah berkas `exploit.php.png` yang disisipi PHP web shell di metadata EXIF.
    - **When:** Berkas melewati handler `uploadShieldHandler`.
    - **Then:** Sistem mendeteksi signature gambar asli, melakukan re-encoding visual, menghapus payload steganografi, dan meneruskan berkas gambar steril ke backend.

### Fitur ID: F-05 - Polymorphic Alien-Code Shield (PACS)
- **Status:** **[Sudah ada]**
- **User Story:** Sebagai Pemilik Website Premium, saya ingin konten HTML respons situs saya diacak menjadi payload Base64 agar tidak mudah dipindai oleh bot otomatis.
- **Aturan Bisnis:**
  - Mengobfuskasi HTML keluaran dari backend menjadi format terenkripsi Base64 yang didekode secara transparan di sisi client dalam waktu `< 15ms`.
- **Kriteria Penerimaan (Acceptance Criteria):**
  - **Skenario 1: Obfuskasi Source Code HTML**
    - **Given:** Pengunjung melihat source code halaman portofolio.
    - **When:** Gateway mengembalikan response HTML terenkripsi.
    - **Then:** Halaman hanya menampilkan payload base64 string terenkripsi dan script engine decrypter client-side.

### Fitur ID: F-06 - Multi-Tenant SaaS Licensing & Lockout
- **Status:** **[Sebagian ada, infrastruktur provisoner belum ada]**
  - Remote License Validation & Lockout Overlay: **[Sudah ada]**
  - Dynamic Provisioner Script (`scripts/provisioner.sh`): **[Belum ada]**
  - Integrasi Stripe/Midtrans Webhook: **[Belum ada]**
- **User Story:** Sebagai Penyedia SaaS, saya ingin pelanggan baru dapat mendaftar, membayar via payment gateway, dan kontainer gateway terisolasi langsung dibuat secara otomatis untuk mereka.
- **Aturan Bisnis:**
  - Validasi lisensi domain client dilakukan ke server lisensi pusat (`https://license.nexus-cyber.com/verify`) secara berkala.
  - Layar penuh (Lockout Overlay) menutup akses visual dashboard jika lisensi hangus.
  - *[Belum ada]* Skrip asinkron provisioning (`scripts/provisioner.sh`) untuk meluncurkan kontainer Docker-compose tenant baru.
  - *[Belum ada]* Webhook pemrosesan pembayaran otomatis (Midtrans/Stripe).
- **Kriteria Penerimaan (Acceptance Criteria):**
  - **Skenario 1: Lockout Dasbor Klien**
    - **Given:** Status lisensi domain klien bernilai `EXPIRED` atau `REVOKED`.
    - **When:** Pengguna membuka dasbor Command Center.
    - **Then:** Layar penuh berubah gelap dengan visual lockout premium bertuliskan `"SISTEM DITANGGUHKAN: Masa sewa langganan Nexus Cyber Anda telah berakhir."` dan tidak dapat di-bypass via manipulasi DOM.

### Fitur ID: F-10 - Back-office super-admin (saat dijual)
- **Status:** **[Belum — backlog komersial]**
- **Kapan:** Dikerjakan ketika ada pelanggan bayar atau kontrak (bukan prioritas lab hotspot).
- **User Story:** Sebagai owner/developer Nexus, saya ingin melihat jumlah user, situs yang dilindungi, dan sisa masa aktif, tanpa memberi akses itu ke operator SOC atau ke pelanggan lain.
- **Aturan Bisnis:**
  - Sumber data: Postgres portal SaaS (`User`, `Subscription.domain`, `status`, `endDate`) di submodule `playground/NEXUS-CYBER-WEBISTE-SAAS` (bukan `nexus-admin-dashboard`).
  - `nexus-admin-dashboard` **tetap** Command Center WAF/SOC instance ini. Jangan campur roster PII pelanggan ke `:8081` / `:3001`.
  - Akses: peran internal saja, loopback atau VPN; kredensial **bukan** `NEXUS_ADMIN_TOKEN` (token itu untuk operasi WAF).
  - Pelanggan hanya melihat domain miliknya (sudah ada di dashboard SaaS). Super-admin melihat **semua** tenant.
- **Kriteria Penerimaan (Acceptance Criteria):**
  - **Skenario 1: Ringkasan tenant**
    - **Given:** Owner login ke back-office SaaS (bukan SOC).
    - **When:** Membuka halaman internal tenant.
    - **Then:** Terlihat jumlah user, daftar domain per user, paket, status, sisa hari sampai `endDate` (tanpa wajib menampilkan license key penuh).

### Fitur ID: F-07 - SOC Command Terminal CLI
- **Status:** **[Sudah ada - penambahan fitur CLI kaya interaktif belum ada]**
- **User Story:** Sebagai Operator SOC, saya ingin menggunakan terminal komando berbasis text untuk mengendalikan gateway dan menanyakan anomali keamanan langsung ke AI.
- **Aturan Bisnis:**
  - CLI mendukung perintah `/help`, `/status`, `/stats`, `/shuffle`, `/ban`, `/unban`, `/sub`, `/unsub`, `/honeystats`, `/patches`, `/simulate-attack`, dan `@nexus [query]`.
  - *[Belum ada]* Fitur interaktif kaya (seperti auto-complete tab, history command canggih).
- **Kriteria Penerimaan (Acceptance Criteria):**
  - **Skenario 1: Eksekusi Perintah /status**
    - **Given:** Operator berada di konsol Command Center dashboard.
    - **When:** Operator mengetik `/status` dan menekan Enter.
    - **Then:** Sistem mengembalikan visual info port MTD aktif dan status kesehatan backend.

### Fitur ID: F-08 - Autonomous Self-Repair & Rollback
- **Status:** **[Sudah ada]**
- **User Story:** Sebagai Pemilik Website, saya ingin visual situs saya dipulihkan secara instan apabila dirusak (defacement) oleh peretas tanpa perlu downtime server.
- **Aturan Bisnis:**
  - Monitor membandingkan hash file SHA-256 baseline steril yang disimpan di memori RAM setiap 2 detik.
  - Memulihkan file visual dalam waktu sub-milidetik (~600µs) dan menghapus berkas tidak dikenal (anti-webshell).
- **Kriteria Penerimaan (Acceptance Criteria):**
  - **Skenario 1: Rollback Defacement Otomatis**
    - **Given:** Hacker memodifikasi file template visual situs.
    - **When:** `IntegrityMonitor` mendeteksi ketidakcocokan hash BLAKE3.
    - **Then:** Sistem secara otomatis melakukan rollback visual dari RAM steril ke disk, memulihkan visual situs ke kondisi normal seketika (~600µs).

### Fitur ID: F-09 - Fitur Uji Ketahanan Web Portfolio (Uploader & Password Reward)
- **Status:**
  - Gallery `#gallery` (unggah + vault password): **[Sudah ada]** di `playground/Portofolio-Thoriq`. Sidik jari klien tidak melempar di HTTP lab.
  - AVSE unggah + penyimpanan foto tamu di gateway (`/api/photos`): **[Sudah ada]**.
  - Autoban IP setelah ≥5 password salah: **[Sudah ada]** (`getCleanIP` + `SplitHostPort`).
- **User Story:** Sebagai Tester, saya ingin form unggah dan password hadiah di Gallery, serta WAF memblokir IP setelah brute force.
- **Aturan Bisnis:**
  - Navigasi portofolio punya item Gallery. Password dari `REWARD_PASSWORD`.
  - Password benar → tautan hadiah. Salah → counter per IP. Lima kali → blacklist.
- **Kriteria Penerimaan:**
  - **Skenario 1:** Password salah → pesan percobaan. Setelah 5 gagal, request berikutnya dari IP itu ditolak WAF.

---

## 5. SKEMA DATA & ENTITAS DATABASE (DATA MODEL)

### Entitas 1: `threat_logs` (PostgreSQL)

| Field Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | Primary Key, Unique | ID unik entitas log ancaman |
| `source_ip` | String | Required | Alamat IP asal request |
| `endpoint` | String | Required | Endpoint URL yang diakses |
| `method` | String | Required | HTTP Method (GET, POST, dll.) |
| `status` | String | Required | Status mitigasi (BLOCKED, ALLOWED, dll.) |
| `threat_type` | String | Nullable | Klasifikasi tipe ancaman dari Reflex AI |
| `severity` | Integer | Default: 1 | Tingkat keparahan ancaman (1-5) |
| `payload_sample`| Text | Nullable | Potongan muatan payload berbahaya |
| `user_agent` | String | Nullable | User agent browser penyerang |
| `created_at` | DateTime | Default: now() | Waktu pencatatan log |

### Entitas 2: `domain_subscriptions` (PostgreSQL)

| Field Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | Primary Key, Unique | ID unik langganan domain |
| `domain` | String | Unique, Required | Nama domain client yang dilindungi |
| `origin_ip` | String | Required | IP server backend client asli |
| `is_active` | Boolean | Default: true | Status keaktifan perlindungan (Paywall) |
| `plan_type` | String | Default: 'premium' | Tipe paket langganan (premium/enterprise)|
| `telegram_chat_id`| String | Nullable | ID Telegram Chat/Channel milik pemilik domain (Multi-tenant) |
| `telegram_enabled`| Boolean | Default: true | Switch aktifasi notifikasi Telegram per domain |
| `last_alert_sent_at`| DateTime | Nullable | Timestamp cooldown filter 15 menit per domain |
| `created_at` | DateTime | Default: now() | Tanggal pendaftaran |

### Entitas 3: `intel_blacklists` (PostgreSQL)

| Field Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | Primary Key, Unique | ID unik status blacklist |
| `ip_address` | String | Unique, Required | IP address yang diblokir |
| `reason` | String | Required | Alasan pemblokiran IP |
| `is_active` | Boolean | Default: true | Status keaktifan pemblokiran |
| `expires_at` | DateTime | Nullable | Tanggal kedaluwarsa blokir (null = selamanya) |
| `created_at` | DateTime | Default: now() | Waktu pemblokiran |

---

## 6. BATASAN NON-FUNGSIONAL, KEAMANAN, & VALIDASI

- **Keamanan (Security):**
  - **[Belum ada]** Validasi input terpusat menggunakan library parser formal seperti `Zod` (di dashboard/portfolio) atau `Joi`.
  - CSRF di gateway (`CsrfShield`) pada metode berubah: **[Sudah ada]**. Validasi Zod terpusat di seluruh dasbor: **[Sebagian / belum merata]**.
  - Rate Limiting Token Bucket menggunakan Redis distributed lock: **[Sudah ada]**.
- **Performa (Performance):**
  - **[Belum ada]** Penghitungan formal kebutuhan CPU & RAM minimum sistem untuk melayani beban traffic tinggi di produksi (baru estimasi).
  - Latensi Reflex AI lokal di bawah 1500ms pada runtime Ollama internal: **[Sudah ada]**.
- **Aksesibilitas (Accessibility):**
  - **[Belum ada]** Struktur HTML semantik yang mematuhi standar WCAG 2.1 AA di dasbor admin maupun halaman portfolio (belum ada pengujian accessibility screen reader).

---

## 7. ⚠️ CELAH KRITIS & REALITAS YANG HARUS DIWASPADAI
Sebagai rekan diskusi, berikut adalah poin-poin yang perlu diperbaiki atau diselesaikan agar klaim "anti Zero-Day" tersebut valid secara teknis:

### 7.1 Ilusi Keamanan pada PACS (Polymorphic Alien-Code Shield)
Di dokumen tertulis bahwa PACS mengacak HTML menjadi format Base64.
* **Realitanya:** Base64 bukanlah enkripsi, melainkan sekadar encoding (obfuskasi). Penyerang tingkat lanjut (atau bot tingkat lanjut) dapat mem-bypass ini dengan mudah karena decrypter script di sisi klien bersifat publik. Jika browser klien bisa membacanya secara transparan dalam waktu `< 15ms`, maka skrip otomatis milik penyerang pun bisa melakukan hal yang sama. Jangan terlalu bergantung pada PACS untuk menyembunyikan logika aplikasi dari hacker manusia.

### 7.2 Ketergantungan pada eBPF Stub adalah Titik Lemah DDoS
Saat ini fitur eBPF masih berstatus Stub (simulasi).
* **Realitanya:** Jika terjadi serangan DDoS bervolume tinggi yang memanfaatkan Zero-Day di level jaringan, Reflex AI Layer Anda (meskipun latensinya di bawah 50ms) akan mengalami resource exhaustion. Tanpa pembuangan paket langsung di level kernel (`XDP_DROP` real), tumpukan goroutine pada Go gateway akan kewalahan menangani antrean soket TCP yang masuk. Fitur F-03 ini harus dinaikkan statusnya dari stub menjadi prioritas utama.

### 7.3 Batasan Self-Repair Berbasis Hash Berkas
Memantau hash **BLAKE3** pada baseline RAM menjaga integritas berkas di folder yang dikonfigurasi.
* **Realitanya:** Kebanyakan serangan Zero-Day modern (seperti Remote Code Execution / RCE) mengeksploitasi runtime memory atau memicu reverse shell langsung dari proses memori aplikasi, tanpa memodifikasi berkas visual atau berkas di disk sama sekali. Jadi, visual situs Anda akan terlihat 100% aman dan lolos verifikasi SHA-256, padahal di latar belakang server Anda sudah dikendalikan oleh penyerang.

### 7.4 Validasi input dasbor vs CSRF gateway
CSRF token di WAF **sudah ada**. Validasi skema Zod di setiap form dasbor **belum merata**. Celah logika (tipe aneh, prototype pollution di JS origin) tetap di luar jangkauan regex Reflex.

---

## 8. 🚀 REKOMENDASI LANGKAH SELANJUTNYA
Untuk membuat PRD ini menjadi senjata yang siap tempur di dunia nyata, pertimbangkan langkah-langkah berikut:

1. **F-09 autoban:** sudah aktif di kode (2026-08). Webhook pembayaran fail-closed **ditunda** pemilik. **F-10** back-office super-admin: kerjakan saat produk dijual (portal SaaS, bukan NEX-ADMIN).
2. **Tingkatkan PACS:** Ubah dari sekadar Base64 menjadi enkripsi dinamis berbasis token waktu pendek yang dikombinasikan dengan teknik runtime JavaScript-obfuscation yang berubah di setiap request.
3. **Tambahkan Runtime Application Self-Protection (RASP):** Selain memantau berkas statis (F-08), tambahkan pemicu untuk memantau aktivitas mencurigakan pada proses sistem operasi (misalnya, jika proses aplikasi web tiba-tiba menjalankan perintah `bin/sh`).

---

## 9. 🧠 ARSITEKTUR TINGKAT LANJUT PENGUAT INTEGRITAS MEMORI
Berikut adalah arsitektur tingkat lanjut yang bisa diterapkan untuk menggantikan atau memperkuat fungsi SHA-256 tersebut:

### 9.1 Amunisi Baru: BLAKE3 (Bukan Cuma Kuat, Tapi Super Cepat)
Jika tetap ingin memperbarui fungsi hashing untuk integritas file di RAM, jangan gunakan SHA-512 karena cenderung lebih berat dan memperlambat latensi sub-milidetik.
* **Solusi:** Gunakan **BLAKE3**. Algoritmanya jauh lebih cepat daripada SHA-256, berbasis Tree Structure, dan memiliki tingkat keamanan yang sangat tinggi. Ini cocok untuk mempertahankan standar performa tinggi pada Go gateway.

### 9.2 Pindah ke Runtime Memory Monitoring (Memantau "Sihir" di RAM)
Daripada hanya mengecek apakah file `index.html` atau template visual berubah, sistem pertahanan otonom harus memantau integritas proses yang sedang berjalan.
* **Solusi:** Setiap kali ada request masuk, sistem harus memastikan tidak ada child process baru yang lahir secara ilegal (misalnya tiba-tiba aplikasi Go menjalankan command `/bin/sh`).

### 9.3 Aktifkan eBPF Real Driver (F-03) sebagai Pengganti Fungsi Hash
Ini adalah jawaban mutlak untuk melompati batasan SHA-256. Dengan menaikkan status eBPF dari Stub menjadi Real Driver, sistem dapat memantau System Calls (Syscalls) di level kernel Linux.
* **Cara Kerja:** Begitu penyerang mengeksploitasi celah Zero-Day di memori aplikasi untuk membuka reverse shell, eBPF akan mendeteksi syscall berbahaya tersebut dan langsung membunuh (kill) prosesnya di level kernel sebelum sempat merusak visual atau mencuri data.

---

*Status fitur diselaraskan dengan kode 15 Agustus 2026. Visi produk (SaaS CNAME, eBPF real, Qwen 235B) yang belum ada di repo tetap ditandai stub/belum.*

---
