# 📄 SOFTWARE REQUIREMENTS SPECIFICATION (SRS)
## Nexus Cyber - Autonomous Tactical Defense Grid & Command Center

---

## 1. Pendahuluan & Ruang Lingkup Sistem

Dokumen Spesifikasi Kebutuhan Perangkat Lunak (SRS) ini merinci seluruh persyaratan teknis, antarmuka, dan arsitektur untuk sistem **Nexus Cyber v13.2 (Fase 2)**.

Sistem terdiri dari empat komponen utama yang saling berinteraksi:
1.  **Core Gateway (Go)**: Reverse proxy berkinerja tinggi yang menangani penyaringan WAF (Reflex AI), rotasi port MTD, pencarian GeoIP lokal, modul SSH Tarpit, pelaporan AbuseIPDB, dan pemblokiran IP di tingkat aplikasi & eBPF stub.
2.  **Next.js Dashboard**: Dasbor kendali SOC berbasis web yang menerima visualisasi telemetri real-time via Server-Sent Events (SSE) dan mengirimkan perintah CLI ke gateway via API terenkripsi.
3.  **Protected Target (Portfolio-website)**: Situs web yang dilindungi (portofolio) yang berada di balik rute proxy gateway.
4.  **Database & Cache (PostgreSQL/Redis)**: Menyimpan status audit pertahanan, daftar blacklist IP, log anomali, serta state MTD shuffler.

```text
       +-------------------------------------------------+
       |              Internet / Attacker                |
       +--------------------+----------------------------+
                            |
           Port 80/443 (HTTP) | Port 22 (SSH Probe)
                            v
       +--------------------+----------------------------+
       |                  Caddy Edge                     |
       +--------------------+----------------------------+
                            |
           Redirect Port 8080| Port 2222
                            v
       +--------------------+----------------------------+
       |             Go Core Gateway (WAF)               |
       |  - Reflex Filter       - SSH Tarpit (:2222)     |
       |  - GeoIP Local/Online  - Redis Blacklist Cache  |
       +-------+--------------------+--------------------+
               |                    |
       Reads logs & blacklist     Proxies allowed traffic
               v                    v
       +-------+-------+    +-------+-------+
       |  PostgreSQL   |    | Target Web    |
       |  & Redis      |    | (Portfolio)   |
       +-------+-------+    +---------------+
               ^
       Pulls telemetry & controls gateway
               |
       +-------+-------+
       |   Next.js     |
       |   Dashboard   |
       +---------------+
```

---

## 2. Persyaratan Fungsional (Functional Requirements)

### RF-01: Reverse Proxy & WAF Filtering (Dual-Brain Shield)
*   **Deskripsi**: Gateway harus bertindak sebagai reverse proxy yang mengevaluasi setiap request HTTP masuk.
*   **Spesifikasi**:
    *   Mengekstrak payload request (headers, query params, request body).
    *   Mengirimkan ringkasan payload ke Reflex AI filter (Groq Qwen 32B) secara sinkron.
    *   Jika dinilai aman, request diteruskan ke situs portofolio.
    *   Jika dinilai berbahaya, kembalikan HTTP 403 Forbidden secara instan, catat log ancaman ke database PostgreSQL (`threat_logs`), dan jalankan Reasoning AI (OpenRouter Qwen 235B) secara asinkron untuk menulis laporan forensik.

### RF-02: Moving Target Defense (MTD) - Port Shuffling
*   **Deskripsi**: Router gateway harus merotasi port backend target secara berkala untuk mengecoh pemetaan jaringan.
*   **Spesifikasi**:
    *   Merotasi port internal secara acak menggunakan CSPRNG berdasarkan interval waktu (default 60s).
    *   Menyediakan fungsi *graceful handoff* agar request yang sedang berjalan tidak terputus saat rotasi berlangsung.
    *   Mencatat riwayat rotasi ke tabel `mtd_audit_trail` (memenuhi audit ISO 27001).

### RF-03: Pencarian Geografis (GeoIP) Lokal & Fallback
*   **Deskripsi**: Gateway wajib menentukan informasi negara, kota, ISP, dan koordinat dari IP penyerang saat memproses log atau pemblokiran IP.
*   **Spesifikasi**:
    *   Membaca database biner `/app/geoip/GeoLite2-City.mmdb` secara lokal untuk performa sub-milidetik.
    *   Jika file `.mmdb` tidak ditemukan atau gagal dibaca, sistem harus melakukan **Graceful Degradation** dengan melakukan query HTTP ke API online `http://ip-api.com/json/{ip}` secara otomatis.
    *   Menyimpan data koordinat geografis tersebut ke tabel `intel_blacklists`.

### RF-04: Pelaporan Otomatis AbuseIPDB
*   **Deskripsi**: IP penyerang yang diblokir oleh gateway wajib dilaporkan ke portal repositori global AbuseIPDB secara otomatis.
*   **Spesifikasi**:
    *   Memeriksa ketersediaan variabel lingkungan `ABUSEIPDB_API_KEY`.
    *   Jika aktif, panggil API POST `https://api.abuseipdb.com/api/v2/report` secara asinkron (menggunakan goroutine agar tidak memblokir thread WAF).
    *   Mengirimkan parameter: `ip`, `categories` (misal `18` untuk brute force, `15` untuk hacking), dan `comment` (detail alasan log).

### RF-05: SSH Tarpit Starvation
*   **Deskripsi**: Gateway harus membuka port TCP `:2222` (untuk dipetakan ke port `:22` publik) untuk menangkap pemindaian bot peretas SSH.
*   **Spesifikasi**:
    *   Saat koneksi terjalin, kirimkan banner palsu `SSH-2.0-OpenSSH_8.2p1 Ubuntu-4ubuntu0.5`.
    *   Setelah banner terkirim, kirimkan deretan baris teks acak (16 bytes hex + ID angka acak) setiap 10 detik.
    *   Batasi penulisan dengan write deadline agar koneksi mati tidak memakan resource RAM.
    *   Memicu callback `BanIP` pada IP tersebut selama 24 jam dan memicu event log telemetry dengan Layer `SSH-Tarpit` ke Redis Pub/Sub.

### RF-06: Antarmuka Terminal Web Interaktif (Xterm.js)
*   **Deskripsi**: Dasbor admin harus menyajikan konsol terminal interaktif sejati menggunakan Xterm.js.
*   **Spesifikasi**:
    *   Menerima ketukan tombol admin, memproses input buffer lokal, dan mengirimkannya ke API `/api/cli/execute` saat tombol Enter ditekan.
    *   Menangani tombol Backspace (`\u007F`), tombol Tab untuk autocompletion daftar perintah, dan tombol Arrow Up/Down untuk riwayat perintah.
    *   Mendengarkan event stream SSE `/api/ai/stream` dan mencetaknya langsung ke terminal dengan format warna ANSI escape.

---

## 3. Spesifikasi Antarmuka API Gateway

### 3.1 Eksekusi Perintah CLI (`/api/cli/execute`)
*   **Metode**: `POST`
*   **Autentikasi**: Memerlukan validasi cookie sesi dan CSRF token (`X-CSRF-Token` header).
*   **Request Payload**:
    ```json
    {
      "command": "/status"
    }
    ```
*   **Response Payload (200 OK)**:
    ```json
    {
      "output": "[STATUS] Gateway: ACTIVE | Active Port: 3001 | MTD: Shuffling every 60s"
    }
    ```

### 3.2 Aliran Telemetri Log AI (`/api/ai/stream`)
*   **Metode**: `GET`
*   **Tipe Konten**: `text/event-stream` (Server-Sent Events)
*   **Format Pesan**:
    ```text
    data: {"timestamp":"2026-07-07T20:17:22Z","layer":"Reflex","status":"BLOCKED","detail_action":"> [REFLEX_CORE] Blocked attack from 165.21.83.88 on /api/unlock-reward"}
    ```

### 3.3 Pemblokiran Manual IP (`/api/blacklist/ban`)
*   **Metode**: `POST`
*   **Request Payload**:
    ```json
    {
      "ip_address": "8.8.8.8",
      "reason": "Repeated brute force password vault",
      "duration_hours": 24
    }
    ```
*   **Response Payload (200 OK)**:
    ```json
    {
      "status": "success",
      "message": "IP 8.8.8.8 banned for 24h"
    }
    ```

---

## 4. Persyaratan Non-Fungsional (Non-Functional Requirements)

1.  **Keamanan (Security)**:
    *   **CORS Hardening**: Dilarang menggunakan header `Access-Control-Allow-Origin: "*"`. Akses asal hanya diperbolehkan dari domain dashboard tepercaya.
    *   **PQC Wrapper**: Enkripsi pasca-quantum NIST ML-KEM-768 harus diaktifkan pada enkripsi database dan kunci lisensi.
2.  **Keandalan (Reliability)**:
    *   **Graceful Degradation**: Kegagalan database GeoIP lokal mmdb tidak boleh menghentikan proses WAF/routing gateway.
3.  **Skalabilitas & Batasan Kinerja**:
    *   **Token Bucket Limit**: Membatasi request WAF maksimal 100 request burst dan 50 request per detik berkelanjutan per IP untuk mencegah kehabisan sumber daya server.
