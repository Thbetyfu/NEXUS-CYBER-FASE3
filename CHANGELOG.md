# Changelog

Format mengikuti [Keep a Changelog](https://keepachangelog.com/). Tanggal memakai kalender lokal proyek (WIB).

Dokumen hidup (`README.md`, `docs/CAPABILITIES.md`, `docs/LIMITATIONS.md`, dan indeks di `docs/README.md`) wajib diubah dalam commit yang sama jika perilaku pengguna berubah.

## [Unreleased]

### Added
- **Kredit lab (Channel Starter v0):** unit **Kredit** di portal `/order` — 1 Kr = Rp 1.000, Starter = 20 Kr. Keran lab; generate fail-closed (402 jika saldo kurang); gagal Channel Starter → refund. Form `/order` **tanpa** Framer Motion `opacity: 0` (SSR tampil, bukan halaman putih). Bukan Midtrans, bukan e-money, bukan beli Job 200 Kr dari portal. Uji `npm test` di `nexus-channel-portal`.
- **Gerbang NEX-AI fail-closed (lab PC):** `START.bat` / `START-OFFLINE.bat` / `START-FOR-JURY.bat` (via `START.ps1`) + `start.sh` menolak `docker compose up` jika `nex-ai-protect` **dan** `nex-ai-reflex` belum ada di Ollama lokal (`GET /api/tags`). Helper satu: `scripts/check_nex_ai.py` + `deploy-local/CHECK-NEX-AI.bat`. Pesan ID jujur: salin `nex_ai_q4_k_m.gguf` ke `nex-ai-models\` lalu `IMPORT-OLLAMA.bat` — **bukan** `ollama pull` Hub. Gateway: `NEX_AI_REQUIRED=1` di compose deploy-local; `go test` / `go run` tanpa env **tidak** memanggil Ollama. CI: `NEX_AI_REQUIRED=0` (eksplisit). Uji `scripts/tests/test_check_nex_ai.py` + `go test ./internal/ai/`.
- **Ban IP selamat restart:** `BanIP` menulis `intel_blacklist` + RAM; `InitPostgres` memanggil `HydrateActiveBlacklist`. RAM kosong setelah restart tetap diblokir via DB, lalu diisi ulang ke RAM. Uji `go test ./internal/database/` — `TestBanSurvivesRestartViaDBWhenRAMEmpty`, `TestBanSurvivesRestartViaHydrateRAM`, permanen / kedaluwarsa / unban. Tanpa Postgres, ban hanya RAM (hilang saat restart).
- **Golden GET cache (WAF):** snapshot RAM untuk GET/HEAD publik (HTML/CSS/JS/gambar/font) setelah lolos WAF. Default **nyala** jika origin `https` (Vercel); **mati** untuk origin HTTP docker/loopback (START-OFFLINE). Origin 5xx → sajikan `X-Nexus-Cache: STALE` sampai `NEXUS_GOLDEN_GET_STALE_SECONDS`. Cookie `nexus_csrf` tidak menghalangi store. Reverse-proxy **memaksa Host origin** (bukan `127.0.0.1`) agar Vercel tidak 308 ke vercel.com. Purge saat self-heal restore + `/api/system/reset`. Bukan CDN; bukan `/api` / cookie sesi / `Set-Cookie` non-csrf / `Cache-Control: private|no-store`.
- **Degradasi antibodi RAM (Redis mati):** Layer 1 virtual-patch match mengembalikan **403** JSON (`X-Nexus-Waf`, count) tanpa menembak origin dan tanpa honeypot `:9090`. `AddAntibody` tetap RAM-first; Redis nil / `Enabled=false` / client mati tidak menghapus kekebalan node. Uji `go test ./internal/proxy/` — `TestProxy_AntibodyHoldsWhenRedisDisabled` (+ Redis nil, client mati, POST body, kontrol tanpa antibodi). Blacklist IP + Reflex tetap honeypot.
- **Self-heal pin + fsnotify (Alur A):** integrity monitor memuat snapshot BLAKE3 (bukan re-hash disk rusak saat restart); restore/purge via fsnotify + poll 2s tanpa mematikan origin; pager Telegram pada pelanggaran; default folder lab `playground/Portofolio-Thoriq` (Docker: `/origin-lab` + volume `integrity_data`). `INTEGRITY_REPIN=1` hanya untuk pin baru dari pohon sehat.
- **Self-heal live origin (START-OFFLINE):** bind-mount `Portofolio-Thoriq/dist` ke container portfolio `/app/dist` (seed dari image jika kosong) + gateway `INTEGRITY_MONITORED_DIR=/origin-lab/dist` — deface `index.html` di disk yang sama terlihat di situs tanpa restart origin. Folder `uploads` tidak di-purge.
- **Job WAF Host-header bind:** agen HTTP NEX-RED menembak TCP `NEXUS_GATEWAY_URL` (atau `NEX_RED_LIVE_TARGET` jika sudah `127.0.0.1:port`) dengan header `Host: {protected_host}` — Job `http://portfolio.nexus-lab.test` tidak butuh file hosts. Twin `NEX_RED_ORIGIN_DIRECT` tidak di-rewrite.
- **Browser Job WAF bind:** `NEX_RED_BROWSER=1` + Playwright memakai `bind_waf_browser()` — Chromium `--host-resolver-rules=MAP {host} {WAF-IP}` + URL `http://{host}:{port}/` (bukan DNS named-host). Header `Host` extra ditolak Chromium (`ERR_INVALID_ARGUMENT`); MAP yang membawa Host. Chromium hilang → skip `sast_only` (bukan PARTIAL). Chromium + temp **selalu di drive NEX-RED** (`workspaces/.playwright-browsers` + `.tmp`), bukan `C:\Temp`. `INSTALL-PLAYWRIGHT.bat`. Uji `tests.test_browser`.
- **Lab session Playwright (operator/Job):** `POST /api/verify-session` menerima `lab_token` / `X-Nexus-Lab-Token` jika `NEXUS_LAB_SESSION_TOKEN` di gateway **sama** dengan `NEX_RED_LAB_SESSION_TOKEN` — menerbitkan cookie `nexus_session` (bukan bypass PoW pengunjung). Tanpa token: named-host tetap Matrix Verification, Job gallery/vault `sast_only`. Dengan sesi: unggah + 5 password vault lewat WAF; ban text = `mitigated_by_nexus`. Fail-closed jika env kosong. Bukan Shannon.
- **ThreatLog domain + digest insiden:** `threat_logs.target_domain` (host tanpa port); persist dari WAF + upload/vault + self-heal restore. `GET /api/incidents/digest` di control plane `:8081` (workspace wajib, bukan Global Overwatch; 1–168 jam; MD/JSON tanpa payload). IP/Ban per-workspace membaca DB. Tombol unduh di Konsol GaaS + jendela Artefak.
- **Panduan Penggunaan (SOC operator, ID):** jendela in-app `PanduanPenggunaan` — ikon desktop + taskbar + tombol di Konsol GaaS; isi Bahasa Indonesia (SOC vs pelanggan, onboard Origin+host, Context-Aware workspace, Job via WAF, approve L0/L1 + artefak, logs/metrics/ban, demo juri/tunnel, kejujuran CLOSED_GAP / Channel Starter terpisah) dengan diagram SVG. Polish label ID pada Konsol GaaS, Job Cowork, Domain Switcher, taskbar/jendela GaaS.
- **Context-Aware Workspace binding (SOC):** Active Workspace (`activeDomain`) is Single Source of Truth — switching Domain Switcher auto-binds Job Cowork, Forensic Logs, Metrics, IP/Ban, and Artefak/Compliance. Job target badge `Target: [host] (via WAF)`; no free-type raw URL. Global Overwatch (`all`) keeps combined monitoring; Start Job disabled until a workspace is selected. Onboard kanal still auto-selects the new domain (all windows re-bind). Job payload uses `http://{protected_host}`; agen bind TCP ke WAF + header Host; `origin_direct` twin unchanged for defense delta.
- **Operator Onboard kanal (pilot):** di Operator GaaS Console — form **Origin URL** + **protected host / custom domain** (opsional) → `POST /api/routes` + Domain Switcher; DNS/tunnel di luar SOC; tanpa Docker auto di UI. Bukan Midtrans / CNAME massal. Origin privat lab butuh `NEXUS_ALLOW_PRIVATE_ORIGINS=true`.

### Fixed
- **ROUTER-SYNC origin lab:** seed `domain_subscriptions` **upsert** `PROTECTED_HOST` + loopback ke `TARGET_BACKEND` compose (bukan insert-only). ROUTER-SYNC lalu `BindLabInstanceOrigin` agar Host `portfolio.nexus-lab.test` dan `127.0.0.1` (WAF :8080) menuju origin yang sama. Leftover `http://127.0.0.1:3001` di dalam container **bukan** SOC host dan tidak boleh menimpa Vercel pada START.bat. START-OFFLINE tetap `http://portfolio:3002`. Host onboard tambahan tidak diubah. Bukan provisioner multi-tenant. Uji `go test ./internal/proxy/` — `TestSeedUpsertsStaleLabOriginToVercel`, `TestNamedHostAndLoopbackAgreeAfterRouterSync_*`.
- Gateway Docker image: builder `golang:1.23-bookworm` (bukan `golang:1.22-alpine` yang di mesin ini `go` 0 byte); artefak `nexus-gateway`. `.dockerignore` tidak boleh men-match folder `cmd/gateway`.
- Gateway: origin reverse-proxy dinormalisasi ke URL absolut `http(s)://` (`NormalizeProxyOrigin`) di router + PACS auto-seed — hindari OriginIP bare `127.0.0.1` yang merusak `url.Parse` / tunnel pilot.
- Dashboard SOC: perbaikan transisi state pada `SocAuthGate.tsx` dengan AbortController + timeout 2 detik untuk mencegah UI stuck di layar "VERIFYING OPERATOR SESSION..." akibat race condition StrictMode pada Next.js Turbopack; penambahan `allowedDevOrigins` pada `next.config.ts`.

### Changed
- **Onboard kanal FE (operator):** form hanya **Origin URL** + **Protected host / custom domain** (opsional, default lab). Copy jujur: DNS/CNAME atau tunnel di luar SOC; pilot = PC+tunnel; bukan Midtrans / self-serve CNAME massal. **Dihapus** checkbox Auto-Provision Docker dari `AddRouteModal` (Domain Switcher) — API gateway `target_url: "auto"` tetap ada untuk lab, tidak diekspos di jalur operator Cowork. Channel Starter tetap pintu entry terpisah (bukan dihapus). Context-Aware Workspace / auto-select setelah onboard tetap.
- **SOC → Operator GaaS saja:** kokpit `:3001` fokus kanal, antrian L0/L1, Job Cowork, artefak MD/JSON. **Dihapus** dari UI/kode dashboard: War Room, Defense Matrix, MTD Audit, Licensing SaaS, AI Cortex/Nechat, NEX-AI monitor window (+ API `/api/wargame`, `/api/license`). Ban dialog tanpa klaim XDP. Next rewrite `/api` = `fallback` agar `/api/gaas`, `/api/jobs`… lokal tetap jalan.
- **UI & Taskbar Polish:** menghapus badge redundan `TEPI ENFORCED` pada Taskbar, menghilangkan artefak/garis scrollbar, menyelaraskan tata letak tombol aplikasi dengan active indicator `teal`, serta merapikan ukuran dan batas vertikal Desktop Icons agar tidak bertabrakan dengan Taskbar.


### Added
- **Cowork B2B GTM (Milestone 20):** keputusan Q9 (prioritas B2B Cowork), [`docs/COWORK_B2B.md`](docs/COWORK_B2B.md), halaman [`/cowork`](nexus-channel-portal/src/app/cowork/page.tsx) di Channel Portal.
- **B2G pitching (Milestone 20.2d):** [`docs/COWORK_B2G.md`](docs/COWORK_B2G.md), [`docs/PRICING_UNIT_ECONOMICS.md`](docs/PRICING_UNIT_ECONOMICS.md), halaman [`/b2g`](nexus-channel-portal/src/app/b2g/page.tsx) — on-prem Edge + Loop wajib; **bukan** produksi pengadaan selesai.
- **Channel Starter (Milestone 18 lab):** modul `channel-starter/` — form wizard, 3 template, CLI; **S-3 deploy lab** + **S-6 upsell Cowork**. **Belum:** billing otomatis, VPS wildcard/TLS produksi massal.
- **Nexus Channel Portal (Milestone 19):** modul `nexus-channel-portal/` — landing animasi, harga B2C/B2B/B2G, form `/order`, proxy ke channel-starter, pembayaran manual WA `62895603358692`. Submodule legacy digantikan modul monorepo.

### Docs
- **Peluncuran produk 30 hari:** checklist minggu 1–4 (publik tunnel → proposal → Job bayar → stabilisasi/VPS gate) — [`docs/PRODUCT_LAUNCH_30_DAYS.md`](docs/PRODUCT_LAUNCH_30_DAYS.md).
- **SOC lab cleanup:** seed workspace OJK/BI/Kemenkeu diganti `portfolio.nexus-lab.test`; ikon desktop + default window Job Cowork & Laporan Compliance.
- **B2G pitching package:** on-prem Edge lisensi + Loop wajib; source & control plane tidak diserahkan; keputusan di `DECISIONS_OPEN` (pitching ≠ produksi B2G).
- **Unit ekonomi:** jual / COGS / margin per segmen × cabang website (asumsi pilot PC+tunnel) — [`PRICING_UNIT_ECONOMICS.md`](docs/PRICING_UNIT_ECONOMICS.md).
- **Portal multi-segmen (satu situs):** hub `/` + `/umkm` · `/sekolah` · `/startup` · `/institusi` · `/b2g`; UMKM Rp 20rb termasuk pelindung; GaaS entry Rp 35rb; `/cowork` → `/institusi`.
- **Cabang “sudah punya website?”:** setelah pilih peran (UMKM/sekolah/startup) harga menyesuaikan — belum: site+pagar; sudah: pagar lebih murah (15/28rb). Institusi & B2G tanpa cabang website. Hub `/` didesain ulang (ink+teal, daftar peran, alur tidak rapat).
- **Distribusi pilot:** [`docs/DISTRIBUTION_PILOT.md`](docs/DISTRIBUTION_PILOT.md) — PC operator 24/7 + tunnel (tanpa VPS); SOC/DB tidak di-tunnel.
- **PC main server + juri:** template [`deploy-local/.env.pc-server.template`](deploy-local/.env.pc-server.template), [`SETUP-ENV-PC-SERVER.bat`](deploy-local/jury/SETUP-ENV-PC-SERVER.bat), [`docs/PC_MAIN_SERVER.md`](docs/PC_MAIN_SERVER.md) §2, [`PREP-PC-SERVER.bat`](deploy-local/jury/PREP-PC-SERVER.bat), [`START-FOR-JURY.bat`](deploy-local/jury/START-FOR-JURY.bat).
- **Harga Cowork tahap pilot:** Job **Rp 200.000** · Loop **Rp 300.000**/bulan — portal + `DECISIONS_OPEN` / `COWORK_B2B` / `CHANNEL_STARTER` / `PRODUCT_MODEL` / `BRD` diselaraskan.
- **Harga B2G ilustrasi:** Lisensi Edge **Rp 18jt**/tahun · Loop On-Prem **Rp 3,5jt**/bulan · Custom.
- **Strategi dua lapisan:** Channel Starter (entry UMKM ~Rp 20rb, **lab v0.1** di `channel-starter/`) + GaaS Edge Antibody Cowork (inti, **sudah** mesin Job/Loop).
- Dokumen baru [`docs/CHANNEL_STARTER.md`](docs/CHANNEL_STARTER.md), [`docs/DECISIONS_OPEN.md`](docs/DECISIONS_OPEN.md).
- Selaraskan [`docs/PRODUCT_MODEL.md`](docs/PRODUCT_MODEL.md) v1.1, [`docs/BRD.md`](docs/BRD.md) v2.1, [`BUSINESS_AND_DEPLOYMENT_SCHEMES.md`](docs/BUSINESS_AND_DEPLOYMENT_SCHEMES.md), [`LIMITATIONS.md`](docs/LIMITATIONS.md), [`CAPABILITIES.md`](docs/CAPABILITIES.md), [`ROADMAP.md`](ROADMAP.md) M18–M19, [`docs/NEXUS_CHANNEL_PORTAL.md`](docs/NEXUS_CHANNEL_PORTAL.md), [`Task.MD`](Task.MD), [`README.md`](README.md), [`AGENTS.md`](AGENTS.md). Penamaan **legacy subscription** menggantikan istilah lama di docs hidup.
- Pivot dokumentasi **model langganan lama → GaaS** (Edge Antibody Cowork): model bounded agentic managed service, bukan multi-tenant WAF legacy.
- Dokumen baru [`docs/PRODUCT_MODEL.md`](docs/PRODUCT_MODEL.md) sebagai sumber kebenaran produk.
- [`docs/PRD.md`](docs/PRD.md) v3.0, rewrite [`docs/BRD.md`](docs/BRD.md) dan [`docs/BUSINESS_AND_DEPLOYMENT_SCHEMES.md`](docs/BUSINESS_AND_DEPLOYMENT_SCHEMES.md).
- Selaraskan [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), [`docs/CAPABILITIES.md`](docs/CAPABILITIES.md), [`docs/LIMITATIONS.md`](docs/LIMITATIONS.md), [`docs/SOFTWARE_REQUIREMENTS_SPECIFICATION.md`](docs/SOFTWARE_REQUIREMENTS_SPECIFICATION.md), [`docs/SOFTWARE_DESIGN_DOCUMENT.md`](docs/SOFTWARE_DESIGN_DOCUMENT.md), [`docs/DEPLOYMENT_GUIDE.md`](docs/DEPLOYMENT_GUIDE.md), [`docs/GIT_WORKFLOW.md`](docs/GIT_WORKFLOW.md), [`docs/README.md`](docs/README.md), root [`README.md`](README.md), [`AGENTS.md`](AGENTS.md).
- Root: [`ROADMAP.md`](ROADMAP.md) v4 (Milestone 17 GaaS), [`Task.MD`](Task.MD) backlog GaaS, [`UNIT_TESTING.md`](UNIT_TESTING.md) selaras kejujuran kode.
- Selaraskan markdown repo: komponen README, `deploy-local/`, `scripts/`, `.agents/`, banner arsip `docs/reports/*` dan evaluasi lama.
- Portal legacy dan F-10 ditandai **ditunda** di docs hidup; pintu jual v1 = `nexus-channel-portal/`.

### Added
- **Job Cowork (GaaS Alur B):** entitas `CoworkJob` + status `OPEN` → `MEASURED` → `PENDING_APPROVAL` → `VERIFYING` → `CLOSED_OK` / `CLOSED_GAP` / `PARTIAL` di `NEX-RED/jobs/`.
- CLI `nexred.py job run|show|list|approve|export|schedule-*`; bridge `POST/GET /api/v1/jobs`, approve, artefak MD/JSON; gerbang L0/L1.
- Aturan penutupan: `replay_missed` → `CLOSED_GAP` (tidak hijau).
- Memori imun per host (file `jobs/immune_memory.json`); Loop GaaS scheduler (`interval_hours` + tick bridge).
- Command Center: widget **Job Cowork** + `GET/POST/PATCH /api/jobs` (operator, bukan Channel Portal pelanggan).

### Added
- **PostgreSQL Job Cowork:** tabel `cowork_jobs`, step logs, approvals, `host_immune_memories`, schedules — GORM AutoMigrate di gateway.
- Control plane `:8081`: `GET/POST /api/jobs`, `POST /api/jobs/{id}/approve`, `GET/POST /api/host-immune`.
- NEX-RED `jobs/sync.py` — sinkron Job ke PG via control plane (`NEXUS_CONTROL_PLANE_URL`); file JSON tetap backup.

### Security
- Data plane `:8080`: `GET /api/telemetry` (dan API SOC lain) **404**, bukan diproksi ke origin. POST/PUT/PATCH/DELETE tanpa cookie `nexus_session` **401**, kecuali lab Gallery/vault/PoW (`/api/upload`, `/api/unlock-reward`, `/api/verify-session`, foto tamu, CSRF, lisensi Caddy). `POST /nexred/lab/session-pair` **404** (lab portofolio tidak mencetak token dua akun).
- Header peramban pada WAF publik (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, CSP longgar untuk PoW/inline). **HSTS hanya jika HTTPS**. Caddy lab **tidak** mengulang header yang sama (sumber: gateway).
- `.gitignore`: `*.gguf` (termasuk `nex-ai-models/`) agar bobot tidak ter-commit.

### Added
- Satu hostname lab/VPS: env `PROTECTED_HOST` (default `portfolio.nexus-lab.test`) didaftarkan di router agar Caddy on-demand TLS **ask** hanya nama itu. Bukan multi-tenant provisioner, bukan jual domain. Lab tetap HTTP `:80` (IP hotspot + nama via `hosts`).
- NEX-RED: alur browser lab opsional (`NEX_RED_BROWSER=1` + Playwright) untuk unggah gambar sah dan 5 password vault salah. PoW hotspot dilewati jujur (`sast_only`).
- NEX-RED: lab **OWASP Juice Shop** di `127.0.0.1:3003` plus CLI `lab-juice` / `benchmark --live` untuk recall kelas AUTH/AUTHZ/INJ/XSS/SSRF (HTTP jinak; `equal_to_shannon_strix` tetap false).
- NEX-RED: Fase 5 multi-agen terbatas (`recon` / `access` / `injection-hygiene` / `reporter`) lewat bus in-process. Satu agen gagal → `PARTIAL`, agen lain tetap jalan. Report punya tabel Agents. Bukan swarm Shannon.
- NEX-RED: sandbox Docker opsional (uid **10001**, `cap_drop ALL`, tanpa Docker socket). Scan biasa tetap di laptop. Allow-list HTTP di Python, bukan iptables.
- NEX-RED: planner LLM JSON (langkah pemeriksaan allow-list, alias JWT/IDOR). Model mati → rencana deterministik. `--no-llm` mematikan ini. Bukan payload exploit.
- NEX-RED: `nexred.py llm-eval` **hanya** `nex-ai-protect`. Tidak ada fallback Qwen/Llama. Model milik pemilik, bukan Ollama Hub; jika absen → exit 3.
- NEX-AI: pengumpul dataset lab mencoba `docker cp` dari `nexus-local-gateway:/app/nexus_traffic.log` jika log tidak ada di host. Blue team: `deploy-local\blue-team\COLLECT-DATASET.bat`.
- NEX-RED: Sprint 1 **defense delta** — request jinak yang sama ke WAF vs origin lab (`NEX_RED_ORIGIN_DIRECT`, HTTP loopback/RFC1918/Docker saja) plus replay di tepi. Label `waf_blocked` / `origin_open` / `both_held` / `replay_held`. Bukan proof-by-exploitation; `equal_to_shannon_strix` tetap false.
- NEX-RED: Sprint 2 **antibody loop** — 403 di tepi diulang; `replay_missed` jika request kedua lolos. `antibody_loop_ok` di laporan.
- NEX-RED + gateway: sinyal lab **count-only** `GET /nexred/lab/antibody-signal` dan `POST /nexred/lab/vaccine-probe` (token konstan, bukan payload exploit). Pola virtual patch tidak dipublikasikan di WAF. `antibody_learned` jika jumlah ≥ 1 dan replay tetap 403.
- NEX-RED: Sprint 3 **hotspot harness** — dari IP privat (bukan loopback): `:8081`/`:3001`/Postgres/Redis harus tertutup; `:9090` tercatat sebagai tarpit. `NEX_RED_HOTSPOT_HARNESS=0` mematikan.
- Pager Telegram lab: jika `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` diisi di `deploy-local/.env`, gateway mengirim pesan ke HP **setelah** WAF sudah mem-ban IP. Teks jujur (bukan GPS, bukan tembus VPN). IP privat/lab tidak dipetakan ke GeoIP WAN laptop blue team. Cooldown 15 menit per IP. Butuh internet keluar ke `api.telegram.org`.
- Portal legacy submodule digantikan **`nexus-channel-portal/`** di monorepo (2026-08-22).

### Changed
- NEX-RED: pemeriksaan Juice Shop diperluas (GET objek/keranjang/kartu/whoami tanpa sesi; 401/403 tercatat sebagai `rejected`). Scan biasa: hipotesis CWE-639 juga GET objek tanpa `Authorization`. Tetap tanpa payload exploit.
- Gateway + NEX-RED: nama model asing di env (`qwen2.5`, `llama3`, dll.) dipetakan ke `nex-ai-protect` / `nex-ai-reflex`. Tidak ada substitusi model yang kebetulan ada di `ollama list`.
- NEX-AI: `nex-ai-protect` memakai `Modelfile.protect` (JSON NEX-RED, `num_predict` 1024, tanpa stop `}\n`). `nex-ai-reflex` tetap klasifikasi HTTP. Bobot GGUF masih sama. Benchmark HTTP default `nex-ai-reflex`. Parser NEX-RED merapikan nama field JSON yang berisi spasi.

### Fixed
- Gallery hotspot memakai same-origin `/api/photos` (bukan hostname Docker) dan parse daftar URL tamu; unggah lalu `fetchPhotos` menampilkan list. Store foto tetap di RAM gateway (hilang jika container di-restart).
- GeoIP untuk IP privat/lab tidak lagi mengambil lokasi WAN laptop (ip-api) seolah-olah itu lokasi penyerang.

### Docs
- README: clone `--recursive` dan setup awal (lab Docker vs `start-dev.bat`).
- Blue team / NEX-AI: pindah hard disk (`D:` vs `E:\NEXUS-CYBER-FASE3`); jika model lama di path lain, `ollama rm` lalu impor hanya dari `nex-ai-models/`.
- Blue team: langkah pull + rebuild di `deploy-local/blue-team/README.md`.
- Arsip sesi: `docs/reports/LAB_HOTSPOT_ACCEPTANCE_2026-08-15.md` (uji penerimaan lab, bukan pentest).
- Red team: handoff sesi 16 Agu 2026 di `deploy-local/red-team/SESI-2026-08-16.md`.
- Pager Telegram: cara BotFather + chat ID di `deploy-local/blue-team/README.md` (token tidak di-commit).
- Backlog jual **F-10**: back-office super-admin di portal legacy (bukan NEX-ADMIN) — `docs/PRD.md`, `LIMITATIONS.md`, `CAPABILITIES.md`.
- Portal legacy: `docs/GIT_WORKFLOW.md`, `README.md`, `docs/ARCHITECTURE.md`.
- PRD v2.2: tiga kursi (SOC ≠ UMKM ≠ F-10); sitemap Channel Portal; F-06 lockout bukan Command Center toko; F-01 tanpa Qwen 235B.

### Planned
- Fail-closed webhook pembayaran (secret wajib di env; tidak dikerjakan pada sprint ini atas permintaan pemilik).
- Back-office super-admin **saat produk dijual**: jumlah user, daftar situs per pelanggan, sisa masa aktif. Hidup di **`nexus-channel-portal/`** (F-10 ditunda), bukan tab di `nexus-admin-dashboard` (SOC). Loopback/VPN; token terpisah dari `NEXUS_ADMIN_TOKEN`. Tidak dikerjakan sampai ada tenant bayar / pemilik minta.

## [2026-08-15]

### Added
- Skrip sekali pakai `deploy-local/ALLOW-DEV-LAPTOP.bat`: firewall lab + pengecualian Defender folder repo (UAC hotspot tetap muncul sekali per START).

### Docs
- Indeks hidup vs beku (`docs/README.md`), `CHANGELOG.md`, agen `docs-sync`, `AGENTS.md`.
- PRD/SRS/CLI/deploy/arsitektur diselaraskan ke port 8080/8081, CSRF, autoban Gallery, NEX-RED `:3004`.

### Added
- Skrip sekali pakai `deploy-local/ALLOW-DEV-LAPTOP.bat`: firewall lab + pengecualian Defender folder repo (UAC hotspot tetap muncul sekali per START).
- Pemisahan **data plane** (`PORT` / `:8080`) dan **control plane** (`ADMIN_LISTEN` default `127.0.0.1:8081`).
- Sesi operator: `POST /api/admin/login` (cookie HttpOnly). Command Center di compose diikat `127.0.0.1:3001`.
- Allowlist origin rute dinamis (`ValidateProxyOrigin`); TLS Caddy `ask` memakai `HasExplicitRoute` (bukan wildcard `*`).
- Penyimpanan foto tamu di gateway (`/api/photos`, `/api/guest-photos/`) setelah AVSE, agar lab tetap menampilkan unggahan jika origin Vercel tidak punya API unggah.
- Item navigasi **Gallery** di portofolio (`playground/Portofolio-Thoriq`).
- Helper identitas HTTP `pkg/utils` (`RequestHost`, `ClientIP`) dan agen `.agents/agents/soc-control-plane.md`, `request-identity.md`.

### Changed
- CSRF, CLI, reset, panic, `test/run`, ban/unban hanya di mux admin; RPC merusak menolak GET.
- Rate limit tidak percaya `X-Forwarded-For` dari klien langsung; hanya hop di `NEXUS_TRUSTED_PROXIES` (default loopback + `172.16.0.0/12`), entri paling kanan.
- Host HTTP IPv6 tidak dipotong di `:` pertama.
- Autoban vault 5 percobaan salah tetap aktif; `getCleanIP` memakai `SplitHostPort`.
- Compose root tidak lagi me-mount `/var/run/docker.sock` pada gateway.

### Security
- Caddy tidak menempelkan `NEXUS_ADMIN_TOKEN` ke setiap `/api`.
- Token admin tidak boleh ada di `NEXT_PUBLIC_*` atau query string.
- NEX-RED v5: live HTTP checks + job async (`GET /api/v1/scan/{id}`). War Game dasbor tidak lagi mengarang angka 64.000.

## [2026-08-14]

### Added
- Lab `deploy-local/` (Caddy :80, WAF, Postgres, Redis; hotspot blue/red team).
- NEX-RED v4: AST Python, pattern konservatif, laporan ber-evidence (bukan swarm pentest).
- CI GitHub Actions / GitLab dan hook pre-push.

### Changed
- Origin HTTPS (contoh Vercel) tidak di-rewrite ke `http://host:port` oleh MTD shuffle.
