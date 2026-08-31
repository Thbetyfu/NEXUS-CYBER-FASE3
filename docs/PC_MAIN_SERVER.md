# PC sebagai server utama (tanpa VPS, tanpa hotspot)

**Versi:** 0.1.0 / 2026-08-27  
**Status:** **Memungkinkan** — alur juri sudah ada; domain tetap + site UMKM publik massal masih tahap berikutnya.  
**Terkait:** [DISTRIBUTION_PILOT.md](./DISTRIBUTION_PILOT.md), [JURY_PUBLIC_ACCESS.md](./JURY_PUBLIC_ACCESS.md), [CHANNEL_STARTER.md](./CHANNEL_STARTER.md)

---

## 1. Jawaban singkat

| Pertanyaan | Jawaban |
| --- | --- |
| PC high-end 24/7 bisa jadi server Nexus? | **Ya** — keputusan distribusi pilot resmi |
| Perlu hotspot untuk juri? | **Tidak** — pakai **Cloudflare Tunnel** |
| Perlu VPS dulu? | **Tidak wajib** — VPS nanti jika SLA/volume menuntut |
| Juri bisa akses dari HP / internet mana pun? | **Ya** — lewat URL `https://….trycloudflare.com` |
| Portal jual + bikin site UMKM bisa hidup di PC yang sama? | **Ya (lab)** — portal + Channel Starter CLI; billing otomatis **belum** |
| GPU 3080 Ti wajib? | **Tidak**. Ollama + GGUF lokal **wajib** untuk `START` lab; GPU hanya mempercepat |

**Hotspot** hanya untuk latihan blue/red team di Wi‑Fi lokal (`deploy-local/blue-team/`). **Bukan** jalur utama distribusi atau juri.

**PC masih baru / belum install apa pun?** Ikuti **§2** dulu (unduh software + ENV), jalankan **`deploy-local/jury/PREP-PC-SERVER.bat`**, baru **`START-FOR-JURY.bat`**.

**Buat `.env` otomatis:** **`deploy-local/jury/SETUP-ENV-PC-SERVER.bat`** (password acak) · template manual: **`deploy-local/.env.pc-server.template`**

---

## 2. Persiapan PC baru — unduh & ENV (sebelum deploy pertama)

Urutan disarankan untuk PC Windows kosong. Jangan loncat ke `START-FOR-JURY` sebelum baris **Wajib** selesai — build/pull pertama butuh internet dan waktu (±15–45 menit tergantung koneksi).

### 2.1 Software yang harus diunduh & dipasang

| # | Software | Versi min. | Wajib untuk | Link unduh |
| --- | --- | --- | --- | --- |
| 1 | **Git for Windows** | terbaru | Clone repo + submodule portofolio | https://git-scm.com/download/win |
| 2 | **Docker Desktop** | terbaru (WSL2 backend) | Lab WAF, Caddy, Postgres, Redis | https://www.docker.com/products/docker-desktop/ |
| 3 | **Node.js** | **20 LTS+** | Channel Portal `:3003` | https://nodejs.org/ |
| 4 | **Python** | **3.10+** (centang *Add to PATH*) | Channel Starter CLI + NEX-RED opsional | https://www.python.org/downloads/ |
| 5 | **cloudflared** | terbaru | Tunnel juri (auto-install winget di skrip) | `winget install Cloudflare.cloudflared` |

| Software | Kapan perlu | Catatan |
| --- | --- | --- |
| **Ollama** | **Wajib untuk START lab** | Daftarkan `nex-ai-protect` + `nex-ai-reflex` dari `nex-ai-models\IMPORT-OLLAMA.bat` (salin GGUF; **bukan** Hub). GPU 3080 Ti membantu, tidak wajib |
| **Go 1.22+** | Tidak untuk mode jury | Hanya jika ubah kode gateway (`start-dev.bat`) |
| **Akun Cloudflare** | Nanti (URL tetap) | Quick tunnel **tidak** wajib akun; named tunnel + domain butuh login |

**Windows (sekali):**

1. Power plan → **Never sleep** / hibernate off  
2. Docker Desktop → Settings → **Start Docker Desktop when you log in**  
3. Double-click **`deploy-local/ALLOW-DEV-LAPTOP.bat`** → **Yes** di UAC (firewall port 80/8080)

### 2.2 Clone repository (termasuk portofolio)

```powershell
git clone --recursive https://github.com/Thbetyfu/NEXUS-CYBER-FASE3.git
cd NEXUS-CYBER-FASE3
```

Jika folder sudah ada tanpa submodule:

```powershell
git submodule update --init --recursive
```

Submodule **`playground/Portofolio-Thoriq`** wajib untuk mode offline (`START-OFFLINE` / jury).

### 2.3 Prefetch — unduh image & paket sebelum nyalakan lab

**Satu klik (disarankan):**

```text
deploy-local\jury\PREP-PC-SERVER.bat
```

Skrip ini: cek Git/Docker/Node/Python, buat `.env` dari contoh, `docker compose pull`, `npm install` portal, `pip install` channel-starter, cek/install cloudflared.

**Manual (jika prefer):**

```powershell
cd d:\NEXUS-CYBER-FASE3\deploy-local
copy .env.example .env
docker compose pull

cd ..\nexus-channel-portal
npm install

cd ..\channel-starter
python -m pip install -r requirements.txt

winget install --id Cloudflare.cloudflared -e
```

Build image gateway pertama kali terjadi saat **`START-FOR-JURY.bat`** (bukan hanya `pull`) — biarkan jendela terbuka sampai selesai.

### 2.4 File ENV — apa saja & di mana

| File | Dibuat oleh | Wajib edit? | Fungsi |
| --- | --- | --- | --- |
| **`deploy-local/.env`** | **`SETUP-ENV-PC-SERVER.bat`** atau `PREP-PC-SERVER.bat` | **Ya** (Telegram opsional) | Lab Docker: origin, WAF, DB, token SOC |
| **`deploy-local/.env.pc-server.template`** | Repo (contoh) | Salin manual jika perlu | Checklist + placeholder `[WAJIB]` |
| **`deploy-local/channel-starter-upsell.env`** | CLI `upsell enable` | Hanya jika upsell Cowork | Alih subdomain UMKM ke WAF |
| **`nexus-channel-portal/.env.local`** | Salin dari `.env.local.example` | Tidak untuk demo v1 | Override URL Channel Starter API |
| **`channel-starter/.env.example`** | Repo | Opsional | Subdomain base / port generate site |

**Jangan commit** file `.env` (sudah di `.gitignore`).

### 2.5 Variabel ENV — wajib vs opsional

#### A. `deploy-local/.env` — inti lab (copy dari `.env.example`)

| Variabel | Default lab | Wajib ubah? | Kapan ubah |
| --- | --- | --- | --- |
| `TARGET_BACKEND` | URL Vercel portofolio | Tidak jika pakai **OFFLINE** | Offline: origin dari container portofolio |
| `TARGET_BACKEND_HOST` | host Vercel | Sama | Selaraskan dengan `TARGET_BACKEND` |
| `PROTECTED_HOST` | `portfolio.nexus-lab.test` | Tidak untuk lab | Named tunnel nanti: hostname publik demo |
| `POSTGRES_PASSWORD` | `nexus_local_dev_only` | **Disarankan** sebelum 24/7 | Ganti string kuat |
| `NEXUS_SESSION_SECRET` | placeholder | **Disarankan** | Random panjang |
| `REWARD_PASSWORD` | `NexusAccessSecure2026!` | **Disarankan** | Password vault hadiah lab |
| `NEXUS_ADMIN_TOKEN` | placeholder | **Disarankan** | Login SOC lokal `:8081` |
| `NEXUS_LICENSE_KEY` | `nexus-cyber-dev` | Tidak untuk lab | Produksi lisensi nyata nanti |
| `NEXUS_LICENSE_DOMAIN` | `localhost` | Tidak untuk lab | Domain lisensi produksi |
| `NEX_RED_LIVE_TARGET` | `http://portfolio.nexus-lab.test` | Tidak | Harus lewat WAF, bukan Vercel langsung |
| `NEXUS_CONTROL_PLANE_URL` | `http://127.0.0.1:8081` | Jangan tunnel | SOC tetap localhost |
| `NEX_AI_ENDPOINT` | Ollama host | Opsional | Kosongkan perilaku = regex WAF saja |
| `NEX_AI_MODEL_REFLEX` / `NEX_AI_MODEL_REASONING` | nex-ai-* | Opsional | Setelah Ollama + model import |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | kosong | Opsional | Alert ke Telegram |
| `NEXUS_HOTSPOT_SSID` / `NEXUS_HOTSPOT_PASS` | lab default | Tidak untuk jury | Hanya mode hotspot blue-team |

Contoh minimal yang **harus** Anda ganti sebelum PC 24/7 + tunnel — atau jalankan **`SETUP-ENV-PC-SERVER.bat`** (otomatis):

```env
POSTGRES_PASSWORD=ganti-dengan-string-kuat-min-16
NEXUS_SESSION_SECRET=ganti-random-panjang
REWARD_PASSWORD=ganti-password-vault
NEXUS_ADMIN_TOKEN=ganti-token-operator-kuat
```

#### B. Channel Starter — env proses (atau default)

| Variabel | Default | Ubah kapan |
| --- | --- | --- |
| `CHANNEL_STARTER_SITES_DIR` | `./sites` | Jarang |
| `CHANNEL_STARTER_SUBDOMAIN_BASE` | `nexus-lab.test` | Named tunnel: `sites.nexus.id` |
| `CHANNEL_STARTER_HTTP_ONLY` | `true` (lab) | Produksi TLS: `false` |
| `CHANNEL_STARTER_PORT` | `3010` | Jika bentrok port |

Set di PowerShell sesi atau **System Environment** sebelum `generate`:

```powershell
$env:CHANNEL_STARTER_SUBDOMAIN_BASE = "sites.nexus.id"
$env:CHANNEL_STARTER_HTTP_ONLY = "false"
```

(DNS wildcard + named tunnel harus sudah siap — lihat §5.)

#### C. Channel Portal — `.env.local` (opsional)

Buat `nexus-channel-portal/.env.local` hanya jika Channel Starter API tidak di default:

```env
NEXT_PUBLIC_CHANNEL_STARTER_URL=http://127.0.0.1:3010
CHANNEL_STARTER_URL=http://127.0.0.1:3010
```

Pembayaran v1 **tidak** butuh ENV — manual WhatsApp `62895603358692` (hardcoded di UI).

#### D. NEX-AI lokal (wajib untuk START / START-FOR-JURY)

1. Install **Ollama** → https://ollama.com/download  
2. Salin `nex_ai_q4_k_m.gguf` ke `nex-ai-models\` lalu `IMPORT-OLLAMA.bat` (lihat `docs/NEX_AI_RUNTIME.md`). **Jangan** `ollama pull qwen` / `llama` / `gpt`.  
3. Pastikan di `deploy-local/.env`:

```env
NEX_AI_REQUIRED=1
NEX_AI_ENDPOINT=http://host.docker.internal:11434/api/chat
NEX_AI_MODEL_REFLEX=nex-ai-reflex
NEX_AI_MODEL_REASONING=nex-ai-protect
```

Tanpa kedua nama di `ollama list`, `START.bat` / `START-FOR-JURY.bat` **berhenti sebelum** compose. CI: `NEX_AI_REQUIRED=0`. Request path tetap Reflex regex.

### 2.6 Checklist “PC siap jadi server”

- [ ] Git, Docker Desktop, Node 20+, Python 3.10+ terpasang  
- [ ] Ollama + `nex-ai-protect` / `nex-ai-reflex` (GGUF + `IMPORT-OLLAMA.bat`, bukan Hub)  
- [ ] `git submodule update --init --recursive` sukses  
- [ ] `PREP-PC-SERVER.bat` selesai tanpa error kritis  
- [ ] `deploy-local/.env` ada; password/token **sudah diganti**  
- [ ] `ALLOW-DEV-LAPTOP.bat` sudah dijalankan (UAC)  
- [ ] Sleep/hibernate Windows OFF  
- [ ] `http://127.0.0.1` menampilkan portofolio lewat WAF (uji lokal dulu)  
- [ ] Baru then: `START-FOR-JURY.bat` + bagikan URL tunnel  

---

## 3. Arsitektur (PC Anda = host)

```text
Internet (juri / pelanggan)
        │
        ▼
Cloudflare Tunnel (cloudflared di Windows)
        │
        ├── trycloudflare #1 → localhost:80  (Caddy → WAF → portofolio lab)
        ├── trycloudflare #2 → localhost:3003 (Channel Portal — opsional, jendela terpisah)
        └── (nanti) named tunnel + domain → portal + *.sites.nexus.id
        │
        ▼
PC Windows 24/7 (Docker Desktop)
        ├── Caddy :80
        ├── WAF gateway :8080
        ├── Channel Starter sites (subdomain lokal / wildcard nanti)
        ├── Postgres, Redis (localhost only)
        └── SOC :3001 / :8081 → TIDAK di-tunnel
```

---

## 4. Langkah operasional

### A. Demo juri — portofolio di belakang WAF (siap hari ini)

1. Docker Desktop **Running**
2. Double-click **`deploy-local/jury/START-FOR-JURY.bat`**
3. Salin URL `https://….trycloudflare.com` dari jendela tunnel
4. Uji dari HP (**data seleler**, bukan Wi‑Fi rumah)
5. Kirim URL ke juri

Detail: [JURY_PUBLIC_ACCESS.md](./JURY_PUBLIC_ACCESS.md)

### B. Portal jual (pintu beli / order)

Terminal 1 — portal:

```powershell
cd d:\NEXUS-CYBER-FASE3\nexus-channel-portal
npm install
npm run dev
```

Terminal 2 — tunnel portal (jendela terpisah):

```powershell
cd d:\NEXUS-CYBER-FASE3
.\scripts\tunnel\nexus-tunnel.ps1 -Port 3003
```

Kirim **URL tunnel kedua** ke juri untuk halaman `/`, `/umkm`, `/order`, dll.

**Catatan:** Quick tunnel = **satu URL per port**. Demo juri biasanya butuh **dua URL** (lab WAF + portal) sampai named tunnel + domain siap.

### C. Bikin website UMKM di PC yang sama

Setelah lab Docker jalan (`START-OFFLINE.bat` atau lewat jury):

```powershell
cd d:\NEXUS-CYBER-FASE3\channel-starter
python cli.py generate --name "Warung Bu Siti" --category fnb --whatsapp 081234567890
python cli.py deploy apply
python cli.py deploy reload
```

- **Lokal (Anda):** `http://warung-bu-siti.nexus-lab.test` (butuh entry `hosts` — `START.bat` menulis otomatis jika Admin)
- **Publik eksternal:** subdomain `.nexus-lab.test` **tidak** resolve di HP juri → butuh **named tunnel + domain nyata** (mis. `*.sites.nexus.id`) — backlog B2B-3d

Alur **beli**: pelanggan isi form portal → WA manual (`62895603358692`) → operator generate di PC → deploy. Midtrans otomatis **ditunda**.

---

## 5. Checklist PC 24/7

- [ ] Windows: sleep/hibernate **OFF**
- [ ] UPS disarankan (listrik putus = semua down)
- [ ] Docker Desktop: start otomatis (Settings → General)
- [ ] `deploy-local/jury/START-FOR-JURY.bat` atau Task Scheduler untuk stack lab
- [ ] cloudflared: install via winget; nanti jadikan **Windows Service** untuk restart otomatis
- [ ] Backup mingguan: `.env`, `channel-starter/sites`, artefak Job
- [ ] Copy jujur ke juri/klien: *pilot di infrastruktur operator — bukan SLA data center*

---

## 6. Tahap berikutnya (URL permanen, satu domain)

Quick `trycloudflare.com` **berubah** setiap restart tunnel. Untuk hostname tetap (`portal.nexus.id`, `demo.nexus.id`):

1. Akun Cloudflare + domain
2. **Named tunnel** di Zero Trust
3. Route: `portal.` → `:3003`, `demo.` / catch-all → `:80`
4. Wildcard DNS untuk site Starter: `*.sites.nexus.id`

Checklist: [DISTRIBUTION_PILOT.md](./DISTRIBUTION_PILOT.md) §3.

---

## 7. Batasan jujur

| Sudah bisa (PC + tunnel) | Belum / ditunda |
| --- | --- |
| Juri akses portofolio lewat WAF | URL trycloudflare permanen |
| Portal jual (tunnel terpisah) | Midtrans / provisioner otomatis |
| Generate + deploy site di PC | Site UMKM subdomain publik massal tanpa domain |
| Job Cowork + artefak demo | F-10 back-office |
| Operator SOC lokal `:3001` | SOC publik (sengaja dilarang) |

---

*PC main server 2026-08-27 — selaras DISTRIBUTION_PILOT.*
