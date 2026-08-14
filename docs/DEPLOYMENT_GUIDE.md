# Panduan Deployment Nexus Cyber

Pembaruan 2026-08-15. Lab tercepat: [`deploy-local/README.md`](../deploy-local/README.md). **Jangan** tunnel-kan control plane (`:8081` / dasbor `:3001`) ke internet untuk demo hotspot.

Dokumen ini mencakup dua opsi:
1. **Opsi 1: PC Lokal (Local PC Deployment)** — Hemat biaya (Rp 0), cocok untuk demo, testing, dan riset dengan integrasi **Cloudflare Tunnel (Gratis)**.
2. **Opsi 2: Cloud VPS (Biznet Gio / Hetzner / DigitalOcean)** — Produksi 24/7, multi-tenant container provisioner terisolasi, dan proteksi DDoS tingkat data center.

---

## 💻 OPSI 1: Deploy di PC Lokal

### Keunggulan
- **Biaya**: **Rp 0 / Gratis** (Tidak perlu sewa server).
- **Performa**: Memanfaatkan CPU & RAM tinggi dari PC lokal.
- **AI Model**: Mendukung jalannya model AI lokal `nex-ai-protect` via Ollama.

### Mode 1-klik (disarankan untuk demo laptop)

Folder **`deploy-local/`** di root repo: double-click `START.bat` di Windows, atau `./start.sh` di Linux/macOS. Origin default adalah portofolio Vercel di belakang WAF. Lihat [`deploy-local/README.md`](../deploy-local/README.md).

### Mode A: Docker Compose root (stack lengkap termasuk dashboard)

Pastikan **Docker Desktop** sudah aktif, lalu:

#### Windows PowerShell:
```powershell
.\scripts\deploy\local\deploy-local-pc.ps1
```

#### Linux / WSL / macOS:
```bash
bash scripts/deploy/local/deploy-local-pc.sh
```

### Mode B: Binary Manual (Tanpa Docker)

Cocok jika Docker tidak tersedia. Hanya menjalankan Gateway binary:

#### Windows PowerShell:
```powershell
.\scripts\deploy\local\deploy-local-pc.ps1 -Binary
```

#### Linux / WSL / macOS:
```bash
bash scripts/deploy/local/deploy-local-pc.sh --binary
```

> **Catatan Mode B**: Postgres, Redis, dan Dashboard Next.js **tidak dijalankan** secara otomatis. Pastikan Anda menyiapkan dependensi tersebut secara manual atau via `docker compose up postgres redis -d`.

---

## ☁️ MODE C: Cloudflare Tunnel (PC Lokal → Internet Publik Gratis)

**Cara kerja:**
```
[Pengguna Internet]  ←→  [Cloudflare Edge Server]  ←→  [cloudflared daemon di PC]  ←→  [localhost:8080]
```
Cloudflare menyediakan IP publik dan HTTPS gratis. PC tidak perlu IP publik statis, tidak perlu konfigurasi router/NAT, dan tidak perlu membeli VPS.

### Prasyarat
1. Nexus Cyber sudah berjalan (Mode A atau Mode B di atas).
2. `cloudflared` CLI terinstall — skrip `nexus-tunnel` akan menginstall otomatis.

### Metode 1: Skrip Dedicated (Auto-install + Auto-verify)

#### Windows PowerShell:
```powershell
# Tunnel ke WAF Gateway (port 8080) — default
.\scripts\tunnel\nexus-tunnel.ps1

# Tunnel ke SOC Dashboard (port 3001)
.\scripts\tunnel\nexus-tunnel.ps1 -Dashboard

# Tunnel ke port custom
.\scripts\tunnel\nexus-tunnel.ps1 -Port 80
```

#### Linux / WSL / macOS:
```bash
# Tunnel ke WAF Gateway (port 8080) — default
bash scripts/tunnel/nexus-tunnel.sh

# Tunnel ke SOC Dashboard (port 3001)
bash scripts/tunnel/nexus-tunnel.sh --dashboard

# Tunnel ke port custom
bash scripts/tunnel/nexus-tunnel.sh --port 80
```

### Metode 2: Perintah Manual (Tanpa Skrip)
```bash
# Install cloudflared (Linux)
curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared && chmod +x /usr/local/bin/cloudflared

# Install cloudflared (Windows via winget)
winget install --id Cloudflare.cloudflared -e

# Jalankan tunnel
cloudflared tunnel --url http://localhost:8080
```

### Target Tunnel yang Tersedia

| Target | Port | Perintah Flag | Fungsi |
| :--- | :---: | :--- | :--- |
| **WAF Gateway (Default)** | `8080` | *(tanpa flag)* | Ekspos WAF/proxy utama ke publik |
| **SOC Dashboard** | `3001` | `--dashboard` / `-Dashboard` | **Tidak disarankan** — membuka control plane ke internet |
| **Caddy Edge (Full Stack)** | `80` | `--port 80` | Ekspos seluruh stack via Caddy router |

### Output yang Diharapkan
Setelah tunnel aktif, terminal akan menampilkan:
```
2024-xx-xx INF +----------------------------+
2024-xx-xx INF |  Your quick Tunnel has been created! Visit it at  |
2024-xx-xx INF |  https://random-name-xyz.trycloudflare.com         |
2024-xx-xx INF +----------------------------+
```
URL HTTPS publik tersebut dapat langsung dibagikan ke klien/penguji.

### Batasan Cloudflare Tunnel Gratis
- URL berubah setiap kali tunnel di-restart (tidak permanen).
- Untuk URL permanen, daftarkan domain sendiri di [Cloudflare Zero Trust](https://one.dash.cloudflare.com) (tetap gratis untuk 50 user pertama).

---

## ☁️ OPSI 2: Deploy di Cloud VPS (Biznet Gio / Hetzner / DigitalOcean)

### Keunggulan
- **Aksesibilitas**: Menyala otomatis 24 jam nonstop.
- **Otomatisasi SaaS**: Mendukung fitur `provisioner.sh` untuk memutar kontainer Docker tenant secara dinamis di jaringan terisolasi `nexus-tenant-net`.
- **IP Publik Statis**: Memudahkan konfigurasi DNS domain resmi.

### Spesifikasi VPS Minimum yang Direkomendasikan

| Komponen | Minimum | Direkomendasikan |
| :--- | :--- | :--- |
| **OS** | Ubuntu 22.04 LTS (64-bit) | Ubuntu 24.04 LTS (64-bit) |
| **CPU** | 2 vCPU | 4 vCPU |
| **RAM** | 2 GB (+ 2 GB SWAP otomatis) | 4 GB – 8 GB |
| **Disk** | 20 GB SSD | 40 GB NVMe SSD |

> **Catatan Penting**: Untuk RAM 2 GB, skrip deployment akan otomatis membuat **SWAP File 2 GB** untuk mencegah *Out-of-Memory (OOM)* saat build Next.js.

### Langkah Quick Start di VPS (One-Click Automated Deployment):

1. SSH ke VPS Ubuntu Anda:
   ```bash
   ssh root@<IP_SERVER_ANDA>
   ```

2. Clone repositori dan jalankan skrip otomatisasi terpadu:
   ```bash
   git clone <URL_REPOSITORI_ANDA> Nexus-Cyber-Fase2
   cd Nexus-Cyber-Fase2
   sudo bash scripts/deploy/vps/deploy-biznet-gio.sh
   ```

3. Skrip akan secara otomatis:
   * Meng-install Docker & Docker Compose Engine.
   * Menyiapkan **2 GB SWAP memory** untuk mencegah *OOM*.
   * Mengamankan Firewall UFW: publik 80/443 (dan 8080 hanya jika perlu). SOC **jangan** dibuka 3001/8081 ke `0.0.0.0`.
   * Menyalakan seluruh sistem pertahanan (Go Gateway + Next.js Dashboard + Postgres + Redis + Caddy).

---

## 🌐 Peta Port & Layanan

| Layanan | Port Publik | Port Internal | Fungsi Utama |
| :--- | :---: | :---: | :--- |
| **Caddy Edge Router (HTTP)** | `80` | — | Redirect ke HTTPS / Reverse proxy publik |
| **Caddy Edge Router (HTTPS)** | `443` | — | Auto-TLS on-demand per domain tenant |
| **SOC Command Center** | `127.0.0.1:3001` | `3000` | UI Next.js; **bukan** pintu hotspot |
| **Gateway SOC** | `127.0.0.1:8081` | `8081` | Telemetri, CLI, ban, reset |
| **Nexus Core Gateway (WAF)** | `8080` | `8080` | Reverse proxy + Reflex regex (PQC bukan E2E klien) |
| **Digital Hallucination Honeypot** | `9090` | `9090` | Server perangkap jebakan bot peretas |
| **SSH Tarpit Sandbox** | `2222` | — | TCP Listener penahan bot pemindai SSH |
| **PostgreSQL** | `127.0.0.1:5432` | `5432` | Database forensik (loopback only, tidak publik) |
| **Redis** | `127.0.0.1:6379` | `6379` | Token bucket & rate-limit store (loopback only) |

> Port PostgreSQL dan Redis **hanya terikat ke `127.0.0.1`** dan tidak diekspos ke internet publik (ISO 27001 compliance).

---

## 🔧 Pemeliharaan & Troubleshooting

### Memeriksa Status Kontainer:
```bash
docker compose ps
```

### Melihat Log Real-time Gateway:
```bash
docker compose logs -f gateway
```

### Restart Layanan Tertentu:
```bash
docker compose restart gateway
docker compose restart dashboard
```

### Menutup Semua Layanan:
```bash
bash scripts/ops/nexus-kill.sh
# atau:
docker compose down
```

### Membaca Log Audit Keamanan:
```bash
python scripts/tests/test_mtd_shuffle.py
python scripts/tests/test_self_repair.py
```
