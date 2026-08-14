# 🗄️ Nexus Cyber Database Schema

Dokumen ini mendeskripsikan skema basis data relasional (PostgreSQL) yang digunakan oleh **Nexus Cyber Security System** untuk kebutuhan persistensi data jangka panjang, audit forensik, dan intelijen ancaman (*Threat Intelligence*). Skema ini dirancang agar mematuhi standar keamanan internasional ISO 27001.

---

## 🛡️ Kepatuhan Standar ISO 27001 (ISMS)

**ISO/IEC 27001** adalah standar internasional tingkat tertinggi untuk **Sistem Manajemen Keamanan Informasi (ISMS)**. Standar ini mewajibkan organisasi untuk memiliki kendali ketat terhadap data, jejak audit, dan pelaporan insiden.

Skema database Nexus Cyber dirancang **secara spesifik** untuk memenuhi klausul wajib dalam ISO 27001:
1. **Klausul A.12.4.1 (Event Logging)**: Mewajibkan sistem merekam kejadian keamanan secara rinci. Tabel `threat_logs` memastikan setiap upaya serangan (IP, Waktu, Payload) tercatat rapi sebagai alat bukti investigasi forensik.
2. **Klausul A.12.4.2 (Protection of Log Information)**: Log fasilitas harus dilindungi dari perusakan. Menyimpan log di dalam database terpisah (PostgreSQL) mencegah penyerang ("hacker") menghapus jejak mereka, yang sering terjadi jika log hanya disimpan di file teks lokal.
3. **Klausul A.12.4.3 (Administrator & Operator Logs)**: Mewajibkan adanya *audit trail* (jejak rekam) atas perubahan sistem. Tabel `mtd_audit_trail` membuktikan kepada auditor keamanan bahwa fitur otonom (pemutaran port MTD) aktif dan tercatat secara resmi.
### 1. `threat_logs` (Forensik Serangan)
Tabel utama untuk merekam seluruh anomali dan serangan yang ditangkap oleh Nexus Gateway.
*   **Tujuan**: Audit keamanan, analisis pola serangan historis, dan pelaporan (*Reporting*).

| Kolom | Tipe Data | Keterangan |
| :--- | :--- | :--- |
| `id` | `UUID` | Primary Key. |
| `created_at` | `TIMESTAMP` | Waktu pasti serangan terjadi. |
| `source_ip` | `VARCHAR(45)` | IP Address penyerang (Mendukung IPv4 & IPv6). |
| `endpoint` | `VARCHAR(255)` | URL/Endpoint target yang diserang. |
| `method` | `VARCHAR(10)` | HTTP Method (GET, POST, dll). |
| `status` | `VARCHAR(50)` | Status penanganan (BLOCKED, ALLOWED, HONEYPOT). |
| `threat_type` | `VARCHAR(100)` | Kategori serangan (SQL Injection, XSS, Brute Force). |
| `severity` | `INTEGER` | Tingkat bahaya (1 = Rendah, 5 = Kritis). |
| `payload_sample` | `TEXT` | Potongan data berbahaya yang dikirim penyerang. |
| `user_agent` | `TEXT` | Informasi browser/bot penyerang. |

---

### 2. `mtd_audit_trail` (Jejak MTD)
Tabel untuk mencatat aktivitas *Moving Target Defense* (MTD) seperti perputaran port (*Port Shuffling*).
*   **Tujuan**: Membuktikan kepada auditor ISO 27001 bahwa pertahanan dinamis selalu aktif.

| Kolom | Tipe Data | Keterangan |
| :--- | :--- | :--- |
| `id` | `UUID` | Primary Key. |
| `created_at` | `TIMESTAMP` | Waktu *shuffling* terjadi. |
| `old_port` | `INTEGER` | Port target sebelumnya. |
| `new_port` | `INTEGER` | Port target yang baru. |
| `trigger_reason` | `VARCHAR(100)`| Alasan pindah (Scheduled, Anomaly Detected, Manual).|
| `status` | `VARCHAR(50)` | Status eksekusi (SUCCESS, FAILED). |

---

### 3. `intel_blacklist` (Daftar Cekal Dinamis)
Tabel untuk menyimpan daftar IP yang telah diblokir secara permanen atau sementara. Gateway akan mengecek tabel (atau cache Redis dari tabel ini) sebelum memproses request.
*   **Tujuan**: Mitigasi proaktif terhadap ancaman yang sudah diketahui (Zero-Trust).

| Kolom | Tipe Data | Keterangan |
| :--- | :--- | :--- |
| `id` | `UUID` | Primary Key. |
| `ip_address` | `VARCHAR(45)` | IP Address yang diblokir. |
| `reason` | `VARCHAR(255)` | Alasan pemblokiran (misal: "Repeated SQLi attempts"). |
| `added_at` | `TIMESTAMP` | Waktu IP dimasukkan ke daftar hitam. |
| `expires_at` | `TIMESTAMP` | Waktu blokir dicabut (NULL = Blokir permanen). |
| `is_active` | `BOOLEAN` | Status aturan blokir (TRUE = Aktif). |

---

### 4. `ai_insights` (Laporan Intelijen AI)
Menyimpan hasil pemikiran dan rekomendasi dari **NEXUS-SOC-BRAIN** lokal terkait suatu serangan spesifik.
*   **Tujuan**: Menyimpan pengetahuan (*Knowledge*) AI agar admin bisa meninjau ulang keputusan AI di masa lalu.

| Kolom | Tipe Data | Keterangan |
| :--- | :--- | :--- |
| `id` | `UUID` | Primary Key. |
| `threat_log_id`| `UUID` | Foreign Key ke `threat_logs`. |
| `created_at` | `TIMESTAMP` | Waktu analisis dilakukan. |
| `ai_model` | `VARCHAR(100)`| Model yang memproses (misal: qwen2.5-coder:7b). |
| `analysis_text`| `TEXT` | Kesimpulan deskriptif dari AI. |
| `recommended_action`| `VARCHAR(255)`| Saran tindakan (misal: "Isolate IP", "Ignore"). |

---

### 5. `antibody_audits` (Jejak Vaksinasi Self-Healing)
Tabel untuk mencatat setiap kali **NEX-AI Cognitive Core** (`nex-ai-protect`) mempelajari ancaman zero-day baru secara otonom dan mendaftarkannya sebagai antibodi (virtual patch) di Reflex Layer.
*   **Tujuan**: Visibilitas bagi operator SOC mengenai dinamika evolusi pertahanan imun, audit kepatuhan ISO 27001 (A.12.4.1), dan analisis forensik penyebaran zero-day.

| Kolom | Tipe Data | Keterangan |
| :--- | :--- | :--- |
| `id` | `UUID` | Primary Key. |
| `created_at` | `TIMESTAMP` | Stempel waktu pembuatan baris log. |
| `payload_signature`| `VARCHAR(500)`| Cuplikan/fingerprint payload serangan zero-day (maks 500 karakter). |
| `source_ip` | `VARCHAR(45)` | IP Address penyerang pertama yang meluncurkan serangan ini. |
| `threat_type` | `VARCHAR(100)`| Kategori ancaman kognitif (misal: ZERO_DAY_BYPASS). |
| `confidence_score`| `DECIMAL(4,3)`| Nilai tingkat keyakinan (confidence score) model AI (0.000 - 1.000). |
| `vaccinated_at` | `TIMESTAMP` | Waktu eksak antibodi diinjeksikan ke Reflex Layer. |
| `instance_id` | `VARCHAR(100)`| Identitas mesin/node gateway yang melakukan deteksi pertama. |
---

### 6. `domain_subscriptions` (Lisensi SaaS & Notifikasi Telegram Multi-Tenant)
Tabel untuk mengelola pendaftaran domain terproteksi, kunci lisensi SaaS, serta pemetaan Chat ID Telegram untuk notifikasi terisolasi per domain (Multi-Tenant).
*   **Tujuan**: Kontrol lisensi B2B/B2G dan routing pengiriman Notifikasi Push Telegram instan per-domain (Zero COGS).

| Kolom | Tipe Data | Keterangan |
| :--- | :--- | :--- |
| `id` | `UUID` | Primary Key. |
| `created_at` | `TIMESTAMP` | Waktu domain pertama kali didaftarkan. |
| `domain` | `VARCHAR(255)` | Alamat domain terdaftar (Unique Index, misal: `tokosaya.com`). |
| `origin_ip` | `VARCHAR(255)` | Alamat IP server asal (origin server) milik klien. |
| `is_active` | `BOOLEAN` | Status lisensi domain (TRUE = Terproteksi). |
| `plan_type` | `VARCHAR(50)` | Jenis paket langganan (Basic, Pro, Pro+, Ultrasafe). |
| `telegram_chat_id`| `VARCHAR(100)`| ID Telegram Chat / Channel penerima notifikasi khusus domain ini. |
| `telegram_enabled`| `BOOLEAN` | Switch pengaktifan notifikasi Telegram per domain (TRUE = Active). |
| `last_alert_sent_at`| `TIMESTAMP`| Timestamp tracking untuk filter cooldown debounce 15 menit. |

---

### 7. `pentest_findings` (Hasil Validasi Celah NEX-RED)
Tabel untuk menyimpan seluruh hasil pengujian dan temuan eksploitasi otonom dari **NEX-RED**.
*   **Tujuan**: Rekam jejak audit kerentanan, verifikasi Proof-of-Exploitation (PoC), dan integrasi perbaikan mandiri.

| Kolom | Tipe Data | Keterangan |
| :--- | :--- | :--- |
| `id` | `UUID` | Primary Key. |
| `scan_id` | `VARCHAR(64)` | ID Unik Pemindaian NEX-RED (Index). |
| `target_url` | `TEXT` | URL target pengujian. |
| `target_repo` | `TEXT` | Path repositori kode yang diaudit. |
| `vulnerability_title`| `VARCHAR(255)`| Judul kerentanan (misal: "SQL Injection"). |
| `severity` | `VARCHAR(32)` | Tingkat bahaya (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `INFO`). |
| `cwe_id` | `VARCHAR(32)` | Kode CWE standar (misal: `CWE-89`). |
| `owasp_category` | `VARCHAR(64)` | Kategori OWASP Top 10. |
| `proof_of_concept` | `TEXT` | Bukti langkah eksploitasi nyata (PoC reproducible). |
| `remediation_advice`| `TEXT` | Saran penambalan keamanan bagi developer. |
| `status` | `VARCHAR(32)` | Status (`VERIFIED_EXPLOITABLE`, `MITIGATED_BY_NEXUS`). |
| `created_at` | `TIMESTAMP` | Stempel waktu temuan tercatat. |



