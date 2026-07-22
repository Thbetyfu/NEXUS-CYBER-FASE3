# 🛡️ Nexus-Cyber tahap 2

**Autonomous Tactical Defense Grid & Geospatial Threat Intelligence Command Center**

### 1. Pemuatan Modul Keamanan (Boot Sequence)
![System Boot Sequence](./docs/img/Opening-Nexus-Cyber.jpeg)

### 2. Panel Kendali Utama (SOC Command Center Dashboard)
![SOC Command Center Dashboard](./docs/img/Dashboard-Nexus-Cyber.jpeg)

### 3. Layar Pengunci Lisensi (Subscription Lockout Overlay)
![System License Lockout](./docs/img/System-Lock-Nexus-Cyber.jpeg)

Nexus Cyber adalah sistem pertahanan siber otonom (SOC) yang menggabungkan AI Lokal (**Nexus-Brain**) dengan teknologi **Moving Target Defense (MTD)** untuk melindungi infrastruktur kritis dari serangan modern.

---

## 🛠️ Fitur Utama (Features)

Nexus-Cyber tahap 2 dilengkapi dengan berbagai teknologi keamanan mutakhir yang terbagi dalam beberapa lapisan pertahanan:

### 1. Pertahanan AI Berbasis Dua Lapis (Dual-Brain AI Shield)

* **Reflex Layer**: Deteksi cepat menggunakan model Qwen3 32B via cloud API (Groq) dengan latensi ultra-rendah (<50ms) untuk pemblokiran serangan secara instan (SQL Injection, XSS, SSRF).
* **Reasoning Layer**: Analisis forensik mendalam untuk mengidentifikasi intensi penyerang secara asinkron menggunakan model Qwen3 235B-A22B via OpenRouter API.

### 2. Pertahanan Dinamis (Moving Target Defense - MTD)

* **Topology Port Shuffling**: Rotasi port komunikasi internal secara berkala berbasis CSPRNG untuk mengecoh pemetaan jaringan (*network scanning*) oleh peretas.
* **Emergency Manual Shuffle**: Fitur rotasi port instan secara manual dari terminal jika terdeteksi kondisi darurat.

### 3. Teknologi Deception & Stalling (Honeypot Sandbox)

* **Isolated Honeypot**: Server umpan terisolasi pada port `:9090` untuk menjebak pemindai otomatis hacker.
* **Tarpit Delay**: Menahan koneksi penyerang selama 8 detik secara sengaja untuk menguras *resource* penyerang, yang kemudian disiarkan langsung ke dasbor telemetri.
* **SSH Tarpit (Socket Starvation)**: TCP Listener di port `:22` (via Docker `:2222`) yang menangkap pemindai SSH otomatis dan membekukan koneksi peretas dengan sequence string acak setiap 10 detik secara tak terbatas.

### 4. Sanitasi Berkas Visual (AVSE - Anti-Vulnerability SQL/XSS Engine)

* **Magic Byte Verification**: Verifikasi signature biner asli untuk mencegah bypass ekstensi ganda (seperti berkas `shell.php.png`).
* **Visual Steganography Stripping**: Dekode dan re-encode biner piksel untuk melumpuhkan kode exploit yang sengaja disisipkan di ekor berkas gambar.
* **EXIF/GPS Purging**: Pembersihan otomatis seluruh metadata lokasi kamera demi privasi pengunggah berkas.

### 5. Proteksi Client-Side Anti-Inspect Hardening

* **Context Menu Blocking**: Mencegah klik kanan untuk membatalkan akses menu "Inspect Element".
* **Keyboard Shortcut Hooks**: Memblokir pintasan devtools (`F12`, `Ctrl+Shift+I/J/C`, `Ctrl+U`).
* **Debugger Infinite Loop Tarpit**: Membekukan peramban hacker menggunakan loop debugger terus-menerus jika dipaksa masuk dari menu browser.
* **Continuous Console Purging**: Pembersihan logs konsol per milidetik untuk mencegah pemetaan API.

### 6. Multi-Tenant SaaS Licensing & Lockout

* **Remote License Verification**: Validasi status lisensi client secara berkala menggunakan kunci `NEXUS_LICENSE_KEY`.
* **Global Lockout Overlay**: Layar pengunci gelap premium berukuran penuh yang tidak dapat dilewati secara DOM jika lisensi kedaluwarsa atau dicabut.

### 7. Terminal Komando Interaktif (SOC Command CLI)

* **Xterm.js Console Engine**: Menggunakan emulator terminal web standar industri yang mendukung input keyboard asli, Tab Autocomplete, riwayat perintah (Arrow Up/Down), dan rendering warna ANSI.
* **Command & AI Integration**: Mendukung eksekusi perintah administrator seperti: `/help`, `/status`, `/stats`, `/shuffle`, `/ban [IP]`, `/unban [IP]`, `/sub [domain]`, `/unsub [domain]`, `/honeystats`, `/patches`, dan `@nexus [query]` untuk konsultasi AI.

### 8. Database Forensik & Kepatuhan ISO 27001

* **Log Persistensi & Audit**: Penyimpanan log anomali dan jejak audit secara terstruktur dalam database **PostgreSQL** (`threat_logs`, `mtd_audit_trail`, `intel_blacklist`, `ai_insights`) serta **Redis** untuk *in-memory caching* dan *rate limiting*.
* **Local GeoIP City Lookup**: Resolusi offline koordinat geografis peretas secara lokal menggunakan basis data MaxMind City `.mmdb` dengan fallback dinamis ke API online `ip-api.com`.
* **AbuseIPDB Async Reporting**: Publikasi IP penyerang yang terblokir secara asinkron (goroutine) ke portal intelijen reputasi global AbuseIPDB.

### 9. Fitur Pengujian Simulasi & Ketahanan Riil (Testing & Simulation Mode)

* **Autoban IP & Persistent Blacklist**: Mekanisme pemblokiran IP penyerang secara otomatis setelah 5 kali gagal menebak password vault hadiah. Fitur ini dapat diaktifkan kembali secara fungsional dalam kode untuk menguji skenario pemblokiran riil.
* **Geospatial Tracking & GeoIP Integration**: Melacak asal negara penyerang, nama ISP, koordinat geografis, serta sidik jari perangkat penyerang (*device fingerprinting*) untuk dipetakan secara real-time pada Defense Matrix Dashboard.

### 10. Autonomous Self-Repair & Rollback (Fase 8)

* **System Integrity Monitor**: Pemindaian file sistem berkala (`repair.IntegrityMonitor`) menggunakan hash SHA-256 baseline steril yang disimpan aman di memori RAM.
* **Instant Rollback**: Secara otomatis memulihkan visual situs yang terkena serangan defacement (pengubahan berkas visual/templates) kembali ke kondisi steril dalam waktu sub-milidetik (~600µs) tanpa *downtime*.
* **Anti-Webshell Protection**: Melacak dan menghapus instan berkas tidak dikenal (*webshell* / berkas ilegal) yang sengaja ditambahkan ke dalam direktori templat visual yang dilindungi.

### 11. IP Monitoring & Blacklist Control API

* **IP Activity Monitoring**: API `/api/ip-monitoring` untuk agregasi data lalu lintas per IP (jumlah request, aktivitas URL/endpoint, status ban, dan user agent).
* **Blacklist Control**: API `/api/blacklist/ban` dan `/api/blacklist/unban` untuk kontrol pemblokiran IP otonom maupun manual oleh admin.

---

## 📂 Dokumentasi Proyek

Silakan baca dokumen di bawah ini untuk memahami sistem secara mendalam:

### 📖 Panduan Teknis & Operasional
* [🏗️ **Architecture & Flow**](./docs/ARCHITECTURE.md) - Detail teknis MTD, AI Layers, & Self-Repair.
* [🛡️ **Capabilities**](./docs/CAPABILITIES.md) - Daftar serangan yang bisa pencegah.
* [⚠️ **Limitations**](./docs/LIMITATIONS.md) - Batasan perlindungan sistem.
* [🕹️ **CLI Guide**](./docs/CLI_GUIDE.md) - Panduan perintah Command Center.
* [🛠️ **Git Workflow**](./docs/GIT_WORKFLOW.md) - Panduan Push & Pull (Submodule).

### 🛠️ Rekayasa Perangkat Lunak (SDLC Documents)
* [📄 **Product Requirements Document (PRD)**](./docs/PRODUCT_REQUIREMENTS_DOCUMENT.md) - Visi produk, profil pengguna, dan kriteria keberhasilan.
* [📄 **Software Requirements Specification (SRS)**](./docs/SOFTWARE_REQUIREMENTS_SPECIFICATION.md) - Kebutuhan fungsional, non-fungsional, dan skema endpoints API.
* [📄 **Software Design Document (SWD)**](./docs/SOFTWARE_DESIGN_DOCUMENT.md) - ERD basis data relasional, deskripsi modul kode, dan diagram urutan siber aktif-pasif.

---

## 🚀 Cara Menjalankan (Quick Start & Deployment)

Detail lengkap panduan penyebaran sistem dapat dibaca pada [📖 Deployment Guide](./docs/DEPLOYMENT_GUIDE.md).

### 💻 Opsi 1: Menyalakan di PC Lokal (Gratis / Demo)

* **Windows PowerShell**:
  ```powershell
  .\scripts\deploy\local\deploy-local-pc.ps1
  ```
* **Linux / WSL / macOS**:
  ```bash
  bash scripts/deploy/local/deploy-local-pc.sh
  ```
* **Publikasi ke Internet Gratis (Cloudflare Tunnel)** — di terminal terpisah:
  ```powershell
  # Windows
  .\scripts\tunnel\nexus-tunnel.ps1
  # Linux / WSL
  bash scripts/tunnel/nexus-tunnel.sh
  ```

---

### ☁️ Opsi 2: Menyalakan di Cloud VPS (Biznet Gio / Hetzner / DigitalOcean)

Jalankan perintah 1-klik di VPS Ubuntu 22.04 LTS Anda:

```bash
sudo bash scripts/deploy/vps/deploy-biznet-gio.sh
```

---

### 🛑 Mematikan Sistem

```bash
bash scripts/ops/nexus-kill.sh
```

---

### 🧪 Melakukan Audit Keamanan & Pemulihan Mandiri

Jalankan alat uji terpadu untuk memverifikasi komponen MTD:
```bash
python scripts/tests/test_mtd_shuffle.py
```

Uji fitur pemulihan mandiri otonom (Self-Repair):
```bash
python scripts/tests/test_self_repair.py
```

---
*Nexus-Cyber tahap 2: Menjaga Kedaulatan Digital Indonesia dengan Imunitas Otonom & Intelijen Taktis.*
