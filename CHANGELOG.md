# Changelog

Format mengikuti [Keep a Changelog](https://keepachangelog.com/). Tanggal memakai kalender lokal proyek (WIB).

Dokumen hidup (`README.md`, `docs/CAPABILITIES.md`, `docs/LIMITATIONS.md`, dan indeks di `docs/README.md`) wajib diubah dalam commit yang sama jika perilaku pengguna berubah.

## [Unreleased]

### Fixed
- Sidik jari Gallery/vault di portofolio tidak lagi melempar di **HTTP hotspot** (`crypto.subtle` tidak ada). Unggah dan 5× password salah bisa mencapai gateway setelah blue team `git pull --recurse-submodules` lalu `START-OFFLINE.bat` (rebuild image `portfolio`).

### Docs
- README: clone `--recursive` dan setup awal (lab Docker vs `start-dev.bat`).
- Blue team: langkah pull + rebuild di `deploy-local/blue-team/README.md`.
- Arsip sesi: `docs/reports/LAB_HOTSPOT_ACCEPTANCE_2026-08-15.md` (uji penerimaan lab, bukan pentest).

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
