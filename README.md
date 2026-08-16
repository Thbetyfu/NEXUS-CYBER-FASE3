# 🛡️ Nexus Cyber Fase 3

**WAF Go + Command Center SOC + mesin validasi NEX-RED**, untuk melindungi situs (lab: portofolio) di belakang reverse proxy.

Klaim di README ini mengikuti **kode di repository**. Daftar kemampuan vs batasan: [`docs/CAPABILITIES.md`](./docs/CAPABILITIES.md) dan [`docs/LIMITATIONS.md`](./docs/LIMITATIONS.md). Riwayat: [`CHANGELOG.md`](./CHANGELOG.md).

## Clone

Ada **submodule** portofolio di `playground/Portofolio-Thoriq`. Clone harus rekursif:

```bash
git clone --recursive https://github.com/Thbetyfu/NEXUS-CYBER-FASE3.git
cd NEXUS-CYBER-FASE3
```

Jika folder sudah di-clone tanpa submodule:

```bash
git submodule update --init --recursive
```

Update nanti:

```bash
git pull origin main --recurse-submodules
```

Laptop blue team (lab Docker): setelah pull, `deploy-local\blue-team\STOP.bat` lalu `START-OFFLINE.bat` agar container portofolio memuat JS Gallery terbaru.

Jangan menghapus folder `.git` di dalam submodule. Alur git: [`docs/GIT_WORKFLOW.md`](./docs/GIT_WORKFLOW.md).

## Setup awal

Pilih **satu** cara. Jangan jalankan `deploy-local/START.bat` bersamaan dengan `start-dev.bat` (port 80/8080 bentrok).

### Cara A — lab Docker (disarankan, tanpa Go/Node)

1. Pasang [Docker Desktop](https://www.docker.com/products/docker-desktop/) dan tunggu status **Ready**.
2. (Windows, sekali) double-click `deploy-local\ALLOW-DEV-LAPTOP.bat` lalu **Yes** di UAC — firewall lab + pengecualian Defender.
3. Double-click `deploy-local\START.bat` (atau `START-OFFLINE.bat` agar origin = folder portofolio, bukan Vercel).
4. Buka **http://127.0.0.1** (Caddy → WAF). Bukti Nexus hanya lewat IP/laptop ini, **bukan** URL Vercel langsung.
5. File `deploy-local/.env` dibuat otomatis dari `.env.example` pada start pertama. Ubah `REWARD_PASSWORD` / origin di situ jika perlu.

Hotspot blue/red team, Gallery, dan checklist uji: [`deploy-local/README.md`](./deploy-local/README.md). Matikan: `deploy-local\STOP.bat`.

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

Ollama / `nex-ai-protect` **opsional**. Tanpa model, WAF tetap Reflex regex.

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
| **WAF publik** | Caddy `:80`/`:443` → gateway **`:8080`**: reverse proxy, Reflex regex **setelah normalisasi**, rate limit per IP, CSRF, unggah AVSE, vault password + autoban 5x |
| **Control plane** | Gateway **`:8081`** (default `127.0.0.1`): telemetri, CLI, ban, reset, rute. Login operator (cookie). Bukan JWT penuh |
| **Command Center** | Next.js; di compose diikat **`127.0.0.1:3001`**. Bukan pintu hotspot red team |
| **Deception** | Honeypot HTTP `:9090`; SSH tarpit `:2222` (map Docker `22` di compose root, **tidak** di `deploy-local`) |
| **MTD** | Shuffle port backend untuk origin **HTTP**; origin **HTTPS** (Vercel) **dipin** agar TLS tidak pecah |
| **eBPF / XDP** | **Stub** — tidak membuang paket di kernel |
| **PQC** | Modul/header inisialisasi; **bukan** enkripsi ujung-ke-ujung pengunjung |
| **NEX-RED** | SAST Python AST + probe JSON jinak + **live HTTP tanpa sesi** + lab Juice Shop kelas (loopback `:3003`); **bukan** proof-by-exploitation |
| **SaaS provisioner / Stripe** | **Belum** (lihat `Task.MD` task 6–7) |

Reflex sinkron di request path. Reasoning (`nex-ai-protect` / API) **opsional dan asinkron** jika dikonfigurasi — bukan Qwen 235B wajib di setiap request.

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

- [Architecture](./docs/ARCHITECTURE.md)
- [Capabilities](./docs/CAPABILITIES.md)
- [Limitations](./docs/LIMITATIONS.md)
- [PRD](./docs/PRD.md)
- [SRS](./docs/SOFTWARE_REQUIREMENTS_SPECIFICATION.md)
- [CLI Guide](./docs/CLI_GUIDE.md)
- [Deployment](./docs/DEPLOYMENT_GUIDE.md)

NEX-RED: [`NEX-RED/README.md`](./NEX-RED/README.md).
