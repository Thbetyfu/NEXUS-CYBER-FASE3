# 🏗️ NEXUS CYBER ARCHITECTURE

Pembaruan: 2026-08-16. Klaim AI/port mengikuti kode, bukan proposal lama.

## Port (lab & compose)

| Peran | Alamat | Publik ke hotspot? |
| --- | --- | --- |
| Situs lewat WAF | Caddy `:80` → gateway `:8080` | Ya (header `nosniff` / `SAMEORIGIN`; tanpa HSTS di HTTP) |
| Control plane SOC | `127.0.0.1:8081` | Tidak |
| Command Center | `127.0.0.1:3001` (compose) | Tidak |
| Honeypot | `:9090` | Ya (umpan) |
| SSH tarpit | `:2222` (root compose saja) | Opsional |
| NEX-RED bridge | `127.0.0.1:3004` | Tidak |
| Juice Shop (NEX-RED lab) | `127.0.0.1:3003` | Tidak |
| Postgres / Redis | `127.0.0.1:5432` / `6379` | Tidak |

## Tech stack (yang dipakai)

### Gateway (`nexus-core-gateway`)
- Go `net/http` + `httputil` (bukan keharusan Gin/Fiber).
- Reflex: regex di `internal/ai/reflex_filter.go`. Reasoning: opsional asinkron.
- Redis + PostgreSQL. Self-repair folder terpantau. GeoIP MMDB. Honeypot + SSH tarpit.
- eBPF: stub. PQC: modul, bukan E2E klien.
- Identitas HTTP: `pkg/utils` (`RequestHost`, `ClientIP`).

### NEX-RED
- Python 3.10+. AST + pattern + probe jinak. Bridge **3004**. Sandbox Docker opsional (`sandbox/`).

### Dashboard (`nexus-admin-dashboard`)
- Next.js App Router, Tailwind, Recharts, Xterm.js. Login operator ke control plane.

## Directory structure

```text
nexus-cyber/
├── .agents/                    # Aturan & agen (docs-sync, soc-control-plane, request-identity)
├── CHANGELOG.md
├── deploy-local/               # Lab 1 klik (tanpa SOC di LAN)
├── NEX-RED/                    # Validasi (bukan Shannon/Strix)
│   ├── nexred.py
│   ├── sandbox/                # Image worker non-root (opsional)
│   ├── lab/juice-shop/         # OWASP Juice Shop loopback :3003
│   ├── bridge/                 # REST, port 3004
│   └── tests/
├── nexus-core-gateway/
├── nexus-admin-dashboard/
├── playground/Portofolio-Thoriq/  # Origin lab (Gallery #gallery)
├── scripts/
└── docs/                       # Indeks: docs/README.md
```
