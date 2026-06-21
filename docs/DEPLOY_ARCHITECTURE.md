# 🌐 Nexus Cyber Deployment Architecture

Dokumen ini menjelaskan rancangan arsitektur fisik, topologi jaringan, serta panduan deployment untuk sistem pertahanan siber aktif **Nexus Cyber Security System** di lingkungan produksi (*production*).

---

## 🗺️ Topologi Jaringan & Alur Lalu Lintas

Dalam lingkungan produksi, arsitektur sistem ini dibagi menjadi dua zona utama guna memenuhi standar kepatuhan keamanan informasi **ISO 27001**:
1. **Zone A: Data Plane (Jalur Lalu Lintas Publik)** – Jalur akses pengguna internet umum menuju aplikasi yang dilindungi.
2. **Zone B: Control Plane (Jalur Pengelolaan Keamanan)** – Jalur khusus yang sangat dibatasi bagi operator SOC dan layanan kecerdasan buatan (AI) internal.

### Diagram Alur Lalu Lintas (Traffic Flow)

```mermaid
graph TD
    subgraph Zona Internet Publik
        User[User Steril]
        Hacker[Hacker / Bot]
    end

    subgraph Edge Layer (Zone A - IP Publik)
        Gateway[Go Core Gateway: Port 80/443]
    end

    subgraph Private Subnet (Zone A - Steril)
        App[Website Asli / Backend: Port 3001]
        DB[(PostgreSQL & Redis)]
        eBPF[eBPF / XDP Kernel Map]
    end

    subgraph SOC Internal Network (Zone B - VPN/SSH Tunnel)
        Dashboard[Next.js Command Center: Port 3000]
        AI[AI Reasoning Layer: Ollama]
        Analyst[Security Analyst / Admin SOC]
    end

    %% Jalur Lalu Lintas Data Plane
    User -->|HTTP Requests| Gateway
    Hacker -->|Eksploitasi / Payload| Gateway
    
    %% Filter & Mitigasi Gateway
    Gateway -->|1. Validasi Hash & Blacklist| eBPF
    Gateway -->|2. Lewati jika Bersih| App
    Gateway -->|3. Alihkan jika Terdeteksi Serangan| Honeypot[Honeypot Sandbox: Port 9090]
    
    %% Jejak Forensik & Komunikasi Kontrol
    Gateway -->|Kirim Log Forensik| DB
    Dashboard -->|Ambil Data Metrik & Audit| DB
    Dashboard -->|Kirim Perintah Blokir Manual / Unban| Gateway
    AI -->|Kirim Analisis Niat Asinkron| Gateway
    Analyst -->|Akses Terenkripsi & Terbatas| Dashboard
```

---

## 🏢 Komponen & Penempatan Deployment

Setiap komponen dirancang agar terisolasi satu sama lain guna meminimalkan area serangan (*attack surface reduction*):

### 1. Edge Web Application Firewall (Go Gateway)
* **Tanggung Jawab**: Bertindak sebagai *Reverse Proxy* terdepan, menangani enkripsi TLS/SSL (HTTPS), mitigasi DDoS tingkat kernel, dan filtrasi regex Reflex Layer.
* **Lokasi Deployment**: Server VM khusus (seperti AWS EC2, GCP Compute Engine, atau server Bare-Metal lokal) yang diposisikan di zona DMZ (*Demilitarized Zone*) dengan alamat IP Publik langsung.
* **Persyaratan Port**:
  * `80/tcp` (HTTP) – Pengalihan otomatis ke HTTPS.
  * `443/tcp` (HTTPS) – Lalu lintas web terenkripsi publik.
  * `8080/tcp` – API Internal untuk Dasbor (diizinkan hanya untuk IP Dasbor SOC).

### 2. Website Aplikasi Asli (Protected Backend Web Application)
* **Tanggung Jawab**: Menyajikan konten visual, portal login, dan memproses data bisnis utama klien (misalnya Portal OJK Portal).
* **Lokasi Deployment**: Di dalam kontainer Docker internal atau VM sekunder di dalam subnet privat (*private subnet*).
* **Persyaratan Keamanan**: **Dilarang keras mengekspos port aplikasi ini ke internet publik**. Satu-satunya entitas yang boleh terhubung ke port aplikasi ini (misal port 3001) adalah VM tempat Go Gateway berjalan.

### 3. Database Persistent & Real-Time Cache (PostgreSQL & Redis)
* **Tanggung Jawab**: 
  * **Redis**: Menyimpan state MTD, *distributed token bucket rate limiter*, serta sinkronisasi daftar IP Blacklist berkecepatan tinggi.
  * **PostgreSQL**: Menyimpan log audit ISO 27001 permanen, riwayat perputaran port MTD (*audit trail*), serta insight analitis AI.
* **Lokasi Deployment**: Server database terkelola (Managed Database Service) atau VM database terdedikasi di dalam *private subnet*.

---

## 🔒 Panduan Akses Dashboard SOC Command Center

Dasbor Administrasi (**Next.js Dashboard**) tidak boleh dipublikasikan secara bebas di internet. Jika dasbor ini bocor ke publik, peretas dapat mencoba mematikan proteksi siber secara paksa. 

Berikut adalah 3 metode standar industri untuk mengakses dasbor secara aman:

### Metode A: Akses Melalui Virtual Private Network (VPN) - Rekomendasi Utama
1. Dideploy secara lokal pada server internal di dalam VPC.
2. Analis SOC wajib mengaktifkan koneksi VPN kantor (seperti **WireGuard**, **OpenVPN**, atau **Tailscale**).
3. Setelah terowongan enkripsi VPN aktif, analis mengakses dasbor melalui IP privat atau nama domain lokal:
   ```
   http://10.100.20.10:3000 atau http://soc.nexus-cyber.internal
   ```

### Metode B: Secure Shell (SSH) Port Forwarding
1. Dasbor Next.js dikonfigurasi untuk hanya menerima koneksi dari mesin lokal server itu sendiri (`localhost` / `127.0.0.1`).
2. Analis SOC melakukan port-forwarding aman dari laptop mereka melalui SSH:
   ```bash
   ssh -L 3000:localhost:3000 user@ip-server-soc.company.com -N
   ```
3. Analis membuka peramban web di laptop pribadi mereka dengan mengetikkan alamat `http://localhost:3000`. Lalu lintas akan disalurkan secara aman melewati saluran SSH terenkripsi.

### Metode C: Strict Firewall IP Whitelisting
1. Jika dasbor terpaksa dibuka dengan domain publik (misalnya `https://soc.company.com` untuk akses jarak jauh), pasang web server proxy (seperti Nginx) di depannya.
2. Konfigurasikan file konfigurasi Nginx untuk menolak seluruh IP kecuali IP publik kantor pusat atau IP statis analis SOC:
   ```nginx
   # Hanya izinkan akses dari blok IP Kantor SOC
   allow 198.51.100.50;
   allow 203.0.113.0/24;
   # Tolak semua IP lainnya
   deny all;
   ```

---

## ⚙️ Skema Skalabilitas & Fault Tolerance (Klausul ISO 25010)

Untuk menjamin ketersediaan tinggi (*High Availability*), infrastruktur dianjurkan untuk mengikuti arsitektur berikut:

1. **Load Balancer Layer**: Gunakan Load Balancer eksternal (seperti AWS ALB atau Cloudflare) di depan beberapa replika instance Go Gateway.
2. **Degraded Mode Protection**: Jika basis data PostgreSQL utama mengalami kegagalan, Go Gateway akan otomatis bertransisi secara mulus (*graceful degradation*) ke mode memori lokal (`sync.Map` RAM caching) sehingga filtrasi WAF tetap berjalan normal tanpa memicu kegagalan sistem (*no single point of failure*).
3. **eBPF Zero CPU Protection**: Ketika intensitas serangan DDoS sangat tinggi, eBPF map (`XDP_DROP`) memastikan beban CPU Gateway tetap di angka minimal karena pembuangan paket terjadi di level kernel driver jaringan, menjaga performa VM aplikasi asli tetap stabil.
