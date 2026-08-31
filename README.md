# Nexus Cyber Fase 3

**Dua lapisan produk:** **Channel Starter** (website UMKM dari form + template, ~Rp 20rb — **lab v0.1** di [`channel-starter/`](./channel-starter/)) + **Edge Antibody Cowork** (Job/Loop GaaS — **mesin sudah ada**).

Model & arah: [`docs/PRODUCT_MODEL.md`](./docs/PRODUCT_MODEL.md). Keputusan terbuka: [`docs/DECISIONS_OPEN.md`](./docs/DECISIONS_OPEN.md). Klaim teknis: [`docs/CAPABILITIES.md`](./docs/CAPABILITIES.md), [`docs/LIMITATIONS.md`](./docs/LIMITATIONS.md).

Mesin: WAF Go (`:8080`) + wasit NEX-RED (defense delta + antibody loop + **Job Cowork**) + Command Center operator (`:8081`) + **Channel Portal** (`nexus-channel-portal/` `:3003`).

## Clone

Tidak ada submodule. Origin portofolio = **Vercel di belakang WAF**. Folder `playground/` diarsip ([`docs/PLAYGROUND_ARCHIVE.md`](./docs/PLAYGROUND_ARCHIVE.md)).

| Nama | Folder | GitHub | Peran |
| --- | --- | --- | --- |
| **nexus-core** | `D:\NEXUS` (workspace ini) | [NEXUS-CYBER-FASE3](https://github.com/Thbetyfu/NEXUS-CYBER-FASE3) | WAF, NEX-RED, dasbor operator, `channel-starter/`, lab |
| **nexus-gaas-web** | `D:\nexus-gaas-web` (di luar repo ini) | [NEXUS-CYBER-WEBISTE-GaaS](https://github.com/Thbetyfu/NEXUS-CYBER-WEBISTE-GaaS) | Channel Portal → **Vercel** (bukan FASE3) |

Salinan lab portal masih di [`nexus-channel-portal/`](./nexus-channel-portal/). Tata letak: [`docs/REPO_LAYOUT.md`](./docs/REPO_LAYOUT.md).

```bash
git clone https://github.com/Thbetyfu/NEXUS-CYBER-FASE3.git
cd NEXUS-CYBER-FASE3
```

Update:

```bash
git pull origin main
```

Laptop blue team: setelah pull, `deploy-local\blue-team\STOP.bat` lalu `START.bat`. `START-OFFLINE.bat` ditolak. Alur git: [`docs/GIT_WORKFLOW.md`](./docs/GIT_WORKFLOW.md).

## Setup awal

Pilih **satu** cara. Jangan jalankan `deploy-local/START.bat` bersamaan dengan `start-dev.bat` (port 80/8080 bentrok).

### Cara A — lab Docker (disarankan, tanpa Go/Node)

1. Pasang [Docker Desktop](https://www.docker.com/products/docker-desktop/) dan tunggu status **Ready**.
2. (Windows, sekali) double-click `deploy-local\ALLOW-DEV-LAPTOP.bat` lalu **Yes** di UAC — firewall lab + pengecualian Defender.
3. Double-click `deploy-local\START.bat` (origin = Vercel di belakang WAF). `START-OFFLINE.bat` ditolak — playground diarsip.
4. Buka **http://127.0.0.1** (Caddy → WAF). Bukti Nexus hanya lewat IP/laptop ini, **bukan** URL Vercel langsung.
5. File `deploy-local/.env` dibuat otomatis dari `.env.example` pada start pertama. Ubah `REWARD_PASSWORD` / origin di situ jika perlu. Pager Telegram opsional: isi `TELEGRAM_BOT_TOKEN` dan `TELEGRAM_CHAT_ID` (lihat `deploy-local/blue-team/README.md`); jangan commit token.

### Akses juri / publik — PC sebagai server (tanpa hotspot, tanpa VPS)

PC high-end 24/7 **bisa** jadi host utama sementara. Juri akses lewat **Cloudflare Tunnel**, bukan join Wi‑Fi Anda:

1. Docker Desktop **Running**
2. Double-click **`deploy-local\jury\START-FOR-JURY.bat`**
3. Salin URL `https://….trycloudflare.com` → kirim ke juri (uji dari HP data seluler)

Portal jual (opsional, tunnel terpisah port 3003): [`docs/JURY_PUBLIC_ACCESS.md`](./docs/JURY_PUBLIC_ACCESS.md). Panduan lengkap PC server + persiapan ENV: [`docs/PC_MAIN_SERVER.md`](./docs/PC_MAIN_SERVER.md). Kebijakan: [`docs/DISTRIBUTION_PILOT.md`](./docs/DISTRIBUTION_PILOT.md).

**PC baru:** jalankan sekali `deploy-local\jury\PREP-PC-SERVER.bat` sebelum `START-FOR-JURY.bat`.

Hotspot hanya untuk latihan blue/red team lokal — **bukan** jalur juri. Matikan lab: `deploy-local\STOP.bat` atau `deploy-local\jury\STOP-FOR-JURY.bat`.

### Cara B — development (ubah kode gateway / dasbor)

Prasyarat: Docker (Postgres + Redis), [Go 1.22+](https://go.dev/dl/), Node.js 20+ (untuk Next.js 16), Python 3.10+.

```bash
copy .env.example .env
copy nexus-core-gateway\.env.example nexus-core-gateway\.env
```

Di `nexus-core-gateway\.env` isi `NEXUS_ADMIN_TOKEN` (untuk login SOC selain loopback) dan pastikan `ADMIN_LISTEN=127.0.0.1:8081`. Token **jangan** ditaruh di `NEXT_PUBLIC_*`.

Windows:

```bat
start-dev.bat
```

Itu menyalakan Postgres/Redis, gateway `:8080` + SOC `:8081`, dasbor Next di `:3001`, dan bridge NEX-RED `:3004`. Dasbor: `http://127.0.0.1:3001` dengan API `http://127.0.0.1:8081`.

Manual (setara):

```bash
docker compose up -d postgres redis
cd nexus-core-gateway && go run ./cmd/gateway
cd nexus-admin-dashboard && npm install && npm run dev -- -p 3001
python NEX-RED/nexred.py bridge -p 3004
```

NEX-RED scan (setelah WAF hidup, lewat Caddy jika lab Docker):

```bash
python NEX-RED/nexred.py scan -u http://127.0.0.1 -r . -m hybrid --no-llm
```

Lab `deploy-local/START.bat` **wajib** `nex-ai-protect` + `nex-ai-reflex` di Ollama lokal (salin GGUF + `IMPORT-OLLAMA.bat`, bukan Hub). Tanpa itu stack tidak start. Setelah hidup, WAF request path tetap Reflex regex; reasoning tetap asinkron. CI: `NEX_AI_REQUIRED=0`.

### 1. Pemuatan Modul Keamanan (Boot Sequence)
![System Boot Sequence](./docs/img/Opening-Nexus-Cyber.jpeg)

### 2. Panel Kendali Utama (SOC Command Center Dashboard)
![SOC Command Center Dashboard](./docs/img/Dashboard-Nexus-Cyber.jpeg)

### 3. Layar Pengunci Lisensi (Subscription Lockout Overlay)
![System License Lockout](./docs/img/System-Lock-Nexus-Cyber.jpeg)

---

## Yang ada di kode hari ini

| Lapisan | Perilaku nyata |
| --- | --- |
| **WAF publik** | Caddy `:80`/`:443` → gateway **`:8080`**: reverse proxy, Reflex regex **setelah normalisasi**, rate limit per IP, CSRF, sesi pada mutasi/API asing, unggah AVSE, vault password + autoban 5x. Telemetri SOC **bukan** di port ini (404). Satu `PROTECTED_HOST` (lab HTTP / VPS TLS ask) |
| **Control plane** | Gateway **`:8081`** (default `127.0.0.1`): telemetri, CLI, ban, reset, rute. Login operator (cookie). Bukan JWT penuh |
| **Command Center** | Next.js; di compose diikat **`127.0.0.1:3001`**. Bukan pintu hotspot red team |
| **Deception** | Honeypot HTTP `:9090`; SSH tarpit `:2222` (map Docker `22` di compose root, **tidak** di `deploy-local`) |
| **MTD** | Shuffle port backend untuk origin **HTTP**; origin **HTTPS** (Vercel) **dipin** agar TLS tidak pecah |
| **eBPF / XDP** | **Stub** — tidak membuang paket di kernel |
| **PQC** | Modul/header inisialisasi; **bukan** enkripsi ujung-ke-ujung pengunjung |
| **NEX-RED** | SAST + HTTP jinak + Juice Shop kelas + **defense delta** lab (WAF vs origin); **bukan** proof-by-exploitation |
| **Channel Portal / kasir** | **Portal v1** — login/daftar/tamu; Kredit per identitas (Starter 20 Kr, keran lab). Top-up: QRIS/VA milik pemilik + bukti + approve (**belum dikode**). Bukan Midtrans/Stripe |

Reflex sinkron di request path. Reasoning (`nex-ai-protect`) **asinkron** — bukan Qwen 235B wajib di setiap request. Start lab tetap fail-closed tanpa kedua nama NEX-AI lokal.

---

## Lab 1 klik

`deploy-local/START.bat` (Docker Desktop running). Pengunjung: **http://127.0.0.1** atau IP Wi-Fi laptop. **Jangan** buka URL Vercel jika ingin membuktikan WAF. Panduan: [`deploy-local/README.md`](./deploy-local/README.md).

Gallery portofolio (unggah foto + password hadiah) ada di `#gallery`. Password: `REWARD_PASSWORD` di env lab.

Red team lab: [`deploy-local/red-team/CHECKLIST.md`](./deploy-local/red-team/CHECKLIST.md) lalu `CHECK.bat`.

SOC (opsional): `http://127.0.0.1:3001` atau dasbor `npm` ke `http://127.0.0.1:8081` + login `NEXUS_ADMIN_TOKEN`.

---

## CI

- GitHub Actions: `.github/workflows/nexus-ci.yml`
- GitLab CI: `.gitlab-ci.yml`
- Hook laptop: `.\scripts\ci\install-hooks.ps1`

## Dokumentasi

Indeks hidup vs arsip: [`docs/README.md`](./docs/README.md).

- [Product Model (GaaS)](./docs/PRODUCT_MODEL.md)
- [Roadmap](./ROADMAP.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Capabilities](./docs/CAPABILITIES.md)
- [Limitations](./docs/LIMITATIONS.md)
- [PRD](./docs/PRD.md)
- [SRS](./docs/SOFTWARE_REQUIREMENTS_SPECIFICATION.md)
- [CLI Guide](./docs/CLI_GUIDE.md)
- [Deployment](./docs/DEPLOYMENT_GUIDE.md)

NEX-RED: [`NEX-RED/README.md`](./NEX-RED/README.md).
