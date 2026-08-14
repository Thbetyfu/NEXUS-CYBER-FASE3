# 📄 SOFTWARE DESIGN DOCUMENT (SWD)
## Nexus Cyber - Autonomous Tactical Defense Grid & Command Center

Pembaruan 2026-08-15: Control plane SOC = listener terpisah `:8081` + cookie operator. Data plane = `:8080`. eBPF di dokumen desain lama = **target**, bukan driver aktif. Provisioner SaaS / Stripe = belum.

---

Sistem Nexus Cyber menggunakan pola desain **Microservices Loosely-Coupled** yang memisahkan antara lapisan *Data Plane* (WAF Gateway di Go) dengan *Control Plane* (SOC Dashboard di Next.js), serta mendukung 2 Topologi Deployment:
- **Mode B2B SaaS (Cloud Multi-Tenant)**: Gateway berjalan di Cloud Proxy Cluster kita. Klien swasta mengarahkan CNAME domain mereka ke proxy kita. Notifikasi Telegram di-route secara dinamis ke HP masing-masing pemilik domain per-tenant.
- **Mode B2G GovEdu (Self-Hosted On-Premise)**: Gateway dipasang 100% di server/Pusat Data (PDN) milik instansi pemerintah/sekolah itu sendiri. Seluruh data & AI lokal berjalan di dalam infrastruktur dinas tanpa keluar internet, notifikasi dikirim ke Telegram Group CSIRT Dinas.

Komponen utama:
1.  **Reverse Proxy & Router Layer**: Menerima request HTTP publik, memeriksa kecocokan domain client premium, memproses payload di WAF middleware, dan meneruskan request ke backend target.
2.  **MTD Port Shuffler**: Goroutine independen yang memantau waktu rotasi port target, menghitung port acak menggunakan CSPRNG, dan menginstruksikan router proxy untuk mengubah alamat target secara dinamis.
3.  **Active Deception Modules**:
    *   **HTTP Honeypot**: Server HTTP independen yang berjalan di port `:9090` untuk mendeteksi penyerang web scanning.
    *   **SSH Tarpit**: Listener TCP independen yang mendeteksi probe SSH di port `:2222`.
4.  **Local GeoIP Reader**: Pembaca database biner `.mmdb` MaxMind untuk pencarian negara secara offline dengan performa super cepat.
5.  **Threat Reporter & Telegram Dispatcher**: Goroutine asinkron untuk pengiriman alert instan ke Telegram (Multi-Tenant per-domain di B2B, Group CSIRT di B2G) serta AbuseIPDB/Syslog SIEM.
6.  **NEX-RED Offensive Validation Engine**: Sub-sistem Red Team otonom berbasis multi-agent (White-box AST flow & Black-box dynamic swarm) dengan REST daemon pada port `:3004`.

---

## 2. Diagram Hubungan Entitas Database (ERD)

Desain relasi database PostgreSQL dirancang secara terstruktur untuk memenuhi kepatuhan audit keamanan ISO 27001:

```mermaid
erDiagram
    THREAT_LOGS {
        uuid id PK
        timestamp created_at
        string source_ip
        string endpoint
        string method
        string status
        string threat_type
        int severity
        text payload_sample
        string user_agent
    }

    MTD_AUDIT_TRAIL {
        uuid id PK
        timestamp created_at
        int old_port
        int new_port
        string trigger_reason
        string status
    }

    INTEL_BLACKLIST {
        uuid id PK
        string ip_address
        string reason
        timestamp added_at
        timestamp expires_at
        boolean is_active
        string country
        string city
        string isp
        float latitude
        float longitude
    }

    AI_INSIGHTS {
        uuid id PK
        uuid threat_log_id FK
        timestamp created_at
        string ai_model
        text analysis_text
        string recommended_action
    }

    PENTEST_FINDINGS {
        uuid id PK
        string scan_id
        string target_url
        string vulnerability_title
        string severity
        string cwe_id
        text proof_of_concept
        string status
        timestamp created_at
    }

    THREAT_LOGS ||--o{ AI_INSIGHTS : "analyzed_by"
    INTEL_BLACKLIST }|--o| THREAT_LOGS : "triggered_by"
```

---

## 3. Desain Urutan Logika (Sequence Diagrams)

### 3.1 Alur Penyaringan WAF (Reflex & Reasoning Layer)
Diagram ini menjelaskan bagaimana request HTTP disaring di gateway secara sinkron di Reflex AI, lalu dianalisis secara asinkron di Reasoning AI:

```mermaid
sequenceDiagram
    autonumber
    actor Attacker as Penyerang (IP Publik)
    participant Gateway as Go WAF Gateway
    participant Redis as Redis Blacklist Cache
    participant Reflex as Reflex AI Filter (Local NEX-AI)
    participant Target as Target Web (Portfolio)
    participant Postgres as PostgreSQL (Threat Logs)
    participant Reasoning as Reasoning AI (Local NEX-AI)

    Attacker->>Gateway: Kirim request (payload SQL Injection)
    Gateway->>Redis: Cek apakah IP di-blacklist?
    alt IP sudah di-blacklist
        Redis-->>Gateway: IP terdaftar di blacklist cache
        Gateway-->>Attacker: Respon HTTP 403 Forbidden (Instant Drop)
    else IP aman di cache
        Redis-->>Gateway: IP tidak terdaftar
        Gateway->>Reflex: Kirim metadata & payload untuk scan
        Reflex-->>Gateway: Hasil klasifikasi: MALICIOUS (Anomali > 85%)
        Gateway->>Redis: Tulis IP ke blacklist cache (24h)
        Gateway->>Postgres: Simpan log ancaman baru (tabel threat_logs)
        Gateway-->>Attacker: Respon HTTP 403 Forbidden (Blocked)
        
        Note over Gateway, Reasoning: Proses Forensik Berjalan Asinkron
        loop Goroutine Asinkron
            Gateway->>Reasoning: Kirim payload serangan untuk analisa intensi
            Reasoning-->>Gateway: Laporan forensik & rekomendasi tindakan
            Gateway->>Postgres: Simpan laporan ke tabel ai_insights
        end
    end
```

### 3.2 Alur Jebakan SSH Tarpit & Auto-Banning
Diagram ini mendeskripsikan bagaimana koneksi port scanning SSH dijebak dan dibekukan secara tiada akhir:

```mermaid
sequenceDiagram
    autonumber
    actor Bot as Bot Peretas (TCP Port 22)
    participant Tarpit as SSHTarpitServer (:2222)
    participant Redis as Redis Blacklist Cache
    participant DB as Postgres (Blacklist DB)
    participant Telemetry as Redis Pub/Sub (AI Stream)
    participant Admin as Admin Dashboard Terminal

    Bot->>Tarpit: Hubungkan TCP Socket (Port 22/2222)
    Tarpit->>Redis: Rekam IP ke blacklist cache (24h)
    Tarpit->>Tarpit: Set write deadline (Delay Interval + 5s)
    Tarpit->>Bot: Kirim fake OpenSSH version banner
    Tarpit->>Telemetry: Publish AIEventLog (Layer: SSH-Tarpit)
    Telemetry->>Admin: Stream live log "[TRAPPED] Attacker caught in SSH Tarpit" via SSE
    Tarpit->>DB: Daftarkan IP ke tabel intel_blacklists (BanIP 24h)
    
    loop Tarpit Connection Starvation (Endless Loop)
        Tarpit->>Tarpit: Tunggu selama 10 detik (Delay Interval)
        Tarpit->>Bot: Kirim string acak hex ("%x-%d\r\n")
        alt Bot putuskan koneksi atau timeout
            Bot--xTarpit: Socket tertutup
            Note over Tarpit: Bersihkan goroutine handleConnection
        end
    end
```

### 3.3 Alur Pemulihan Mandiri Otonom (Self-Repair)
Diagram ini menjelaskan siklus periodik monitor integritas visual web yang memulihkan defacement:

```mermaid
sequenceDiagram
    autonumber
    actor Attacker as Peretas
    participant Disk as Web Server Disk (templates/)
    participant Monitor as IntegrityMonitor (Go goroutine)
    participant RAM as Baseline RAM Cache (Steril SHA-256)
    participant Log as Telemetry Log

    Attacker->>Disk: Unggah webshell / modifikasi index.html (Defacement)
    
    loop Siklus Monitor Integritas (Setiap 2 Detik)
        Monitor->>Disk: Pindai direktori terpantau & hitung hash BLAKE3
        Monitor->>RAM: Bandingkan hash dengan RAM baseline steril
        alt Terdeteksi ketidakcocokan hash (Modifikasi/Deface)
            Monitor->>RAM: Salin ulang file visual steril asli dari RAM
            Monitor->>Disk: Tulis ulang file steril asli ke disk (Instant Rollback ~600µs)
            Monitor->>Log: Catat kejadian REPAIR_MODULE ke logs
        else Terdeteksi file tidak dikenal (Anti-Webshell)
            Monitor->>Disk: Hapus file ilegal (Webshell) dari disk
            Monitor->>Log: Catat penghapusan file ilegal
        end
    end
```

### 3.4 Alur Router Notifikasi Telegram Multi-Tenant per Domain (Zero COGS)
Diagram ini menjelaskan alur dispatching pesan ancaman secara dinamis ke akun Telegram masing-masing pemilik domain dengan fitur *debounce cooldown filter*:

```mermaid
sequenceDiagram
    autonumber
    actor Attacker as Penyerang (IP Publik)
    participant Gateway as Go WAF Gateway
    participant Reporter as TelegramBotReporter (Go Goroutine)
    participant DB as PostgreSQL (domain_subscriptions)
    participant Telegram as Official Telegram Bot API (@NexusCyberAlertBot)
    actor Client as HP Klien B2B (Pemilik Domain)

    Attacker->>Gateway: Kirim payload serangan ke domain target (misal: tokosaya.com)
    Gateway->>Gateway: Deteksi ancaman & Ban IP penyerang
    Gateway->>Reporter: Panggil ReportThreatForDomain("tokosaya.com", IP, categories, comment)
    
    go Goroutine Asinkron (Zero Latency Overhead)
        Reporter->>DB: Query GetDomainTelegramConfig("tokosaya.com")
        DB-->>Reporter: Return ChatID ("98765432"), Enabled (True), LastAlertSentAt
        
        alt TelegramEnabled == False
            Note over Reporter: Discard notification (Owner disabled alerts)
        else Debounce Filter Active (< 15 Min)
            Note over Reporter: Discard notification (Prevent DDoS spamming HP)
        else Debounce Filter Passed (> 15 Min)
            Reporter->>DB: Update last_alert_sent_at timestamp
            Reporter->>Reporter: Format Markdown Alert + GeoIP Google Maps Link
            Reporter->>Telegram: HTTP POST /botToken/sendMessage (chat_id="98765432")
            Telegram-->>Client: Push Notification langsung di HP Klien!
        end
    end
```

---

## 4. Desain Struktur Modul Kode (Component Design)

### 4.1 Modul `internal/database`
*   **postgres.go**:
    *   `InitPostgres()`: Menginisialisasi GORM dan menjalankan auto-migrasi skema.
    *   `BanIP(ip, reason, duration)`: Menulis status blacklist ke database, menulis ke local memory map, mendaftarkan ke driver eBPF stub, melakukan pencarian GeoIP, dan memicu `ReportAbuseIP()`.
    *   `getIPGeoInfo(ip)`: Mengecek ketersediaan `GeoLite2-City.mmdb` lokal menggunakan pembaca `geoip2`. Jika sukses, kembalikan data negara & kota secara lokal. Jika gagal, jalankan query HTTP fallback ke `ip-api.com`.
*   **abuseipdb.go**:
    *   `ReportAbuseIP(ip, categories, comment)`: Mengirim request HTTP POST urlencoded ke API AbuseIPDB v2 di dalam goroutine terpisah.

### 4.2 Modul `internal/mtd`
*   **ssh_tarpit.go**:
    *   `NewSSHTarpit(addr, delay)`: Mengembalikan instansi server tarpit SSH.
    *   `Start()`: Meluncurkan TCP listener asinkron.
    *   `handleConnection(conn)`: Menangani socket client, menulis IP ke Redis cache honeypot, memicu callback telemetry & `BanIP()`, dan mengirim data acak periodik.

### 4.3 Modul `nexus-admin-dashboard`
*   **AiTerminalWidget.tsx**:
    *   Instansiasi Xterm.js secara dinamis via dynamic import.
    *   Melacak input buffer (`cmdBuffer`) dan command history (`commandHistory`).
    *   Mendengarkan stream EventSource SSE dari `/api/ai/stream`, mengonversi log ke format kode warna ANSI escape via `formatLogToAnsi()`, membersihkan baris input pengetikan aktif sementara, menulis log baru, dan menggambar ulang baris input prompt.
