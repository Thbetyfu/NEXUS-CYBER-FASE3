# Changelog

Format mengikuti [Keep a Changelog](https://keepachangelog.com/). Tanggal memakai kalender lokal proyek (WIB).

Dokumen hidup (`README.md`, `docs/CAPABILITIES.md`, `docs/LIMITATIONS.md`, dan indeks di `docs/README.md`) wajib diubah dalam commit yang sama jika perilaku pengguna berubah.

## [Unreleased]

### Security
- Header peramban pada WAF publik (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, CSP longgar untuk PoW/inline). **HSTS hanya jika HTTPS**. Caddy lab **tidak** mengulang header yang sama (sumber: gateway).
- `.gitignore`: `*.gguf` (termasuk `nex-ai-models/`) agar bobot tidak ter-commit.

### Added
- NEX-RED: pemeriksaan hidup **dua akun** (peer tidak boleh baca objek owner). Butuh `POST /nexred/lab/session-pair` atau token env; tanpa itu hasilnya `sast_only`, bukan temuan palsu.
- NEX-RED: alur browser lab opsional (`NEX_RED_BROWSER=1` + Playwright) untuk unggah gambar sah dan 5 password vault salah. PoW hotspot dilewati jujur (`sast_only`).
- NEX-RED: lab **OWASP Juice Shop** di `127.0.0.1:3003` plus CLI `lab-juice` / `benchmark --live` untuk recall kelas AUTH/AUTHZ/INJ/XSS/SSRF (HTTP jinak; `equal_to_shannon_strix` tetap false).
- NEX-RED: Fase 5 multi-agen terbatas (`recon` / `access` / `injection-hygiene` / `reporter`) lewat bus in-process. Satu agen gagal → `PARTIAL`, agen lain tetap jalan. Report punya tabel Agents. Bukan swarm Shannon.
- NEX-RED: sandbox Docker opsional (uid **10001**, `cap_drop ALL`, tanpa Docker socket). Scan biasa tetap di laptop. Allow-list HTTP di Python, bukan iptables.
- NEX-RED: planner LLM JSON (langkah pemeriksaan allow-list, alias JWT/IDOR). Model mati → rencana deterministik. `--no-llm` mematikan ini. Bukan payload exploit.
- NEX-RED: `nexred.py llm-eval` **hanya** `nex-ai-protect`. Tidak ada fallback Qwen/Llama. Model milik pemilik, bukan Ollama Hub; jika absen → exit 3.
- NEX-AI: pengumpul dataset lab mencoba `docker cp` dari `nexus-local-gateway:/app/nexus_traffic.log` jika log tidak ada di host. Blue team: `deploy-local\blue-team\COLLECT-DATASET.bat`.

### Changed
- NEX-RED: pemeriksaan Juice Shop diperluas (GET objek/keranjang/kartu/whoami tanpa sesi; 401/403 tercatat sebagai `rejected`). Scan biasa: hipotesis CWE-639 juga GET objek tanpa `Authorization`. Tetap tanpa payload exploit.
- Gateway + NEX-RED: nama model asing di env (`qwen2.5`, `llama3`, dll.) dipetakan ke `nex-ai-protect` / `nex-ai-reflex`. Tidak ada substitusi model yang kebetulan ada di `ollama list`.
- NEX-AI: `nex-ai-protect` memakai `Modelfile.protect` (JSON NEX-RED, `num_predict` 1024, tanpa stop `}\n`). `nex-ai-reflex` tetap klasifikasi HTTP. Bobot GGUF masih sama. Benchmark HTTP default `nex-ai-reflex`. Parser NEX-RED merapikan nama field JSON yang berisi spasi.

### Fixed
- Gallery hotspot memakai same-origin `/api/photos` (bukan hostname Docker) dan parse daftar URL tamu; unggah lalu `fetchPhotos` menampilkan list. Store foto tetap di RAM gateway (hilang jika container di-restart).

### Docs
- README: clone `--recursive` dan setup awal (lab Docker vs `start-dev.bat`).
- Blue team / NEX-AI: pindah hard disk (`D:` vs `E:\NEXUS-CYBER-FASE3`); jika model lama di path lain, `ollama rm` lalu impor hanya dari `nex-ai-models/`.
- Blue team: langkah pull + rebuild di `deploy-local/blue-team/README.md`.
- Arsip sesi: `docs/reports/LAB_HOTSPOT_ACCEPTANCE_2026-08-15.md` (uji penerimaan lab, bukan pentest).
- Red team: handoff sesi 16 Agu 2026 di `deploy-local/red-team/SESI-2026-08-16.md`.

### Planned
- Fail-closed webhook pembayaran (secret wajib di env; tidak dikerjakan pada sprint ini atas permintaan pemilik).

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
