# 🛡️ Nexus Cyber Fase 3

**WAF Go + Command Center SOC + mesin validasi NEX-RED**, untuk melindungi situs (lab: portofolio) di belakang reverse proxy.

Klaim di README ini mengikuti **kode di repository**. Daftar kemampuan vs batasan: [`docs/CAPABILITIES.md`](./docs/CAPABILITIES.md) dan [`docs/LIMITATIONS.md`](./docs/LIMITATIONS.md). Riwayat: [`CHANGELOG.md`](./CHANGELOG.md).

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
| **NEX-RED** | SAST Python AST + probe JSON jinak + **live HTTP tanpa sesi**; **bukan** proof-by-exploitation |
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
