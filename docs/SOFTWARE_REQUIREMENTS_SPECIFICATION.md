# SOFTWARE REQUIREMENTS SPECIFICATION (SRS)
## Nexus Cyber — GaaS Edge Antibody Cowork

**Pembaruan:** 2026-08-22  
**Model produk:** [PRODUCT_MODEL.md](./PRODUCT_MODEL.md)  
**Status kode:** data plane `:8080`, control plane `:8081`, satu `PROTECTED_HOST` per instance, defense delta + antibody loop **sudah ada** di NEX-RED lab; entitas **Job Cowork sudah ada** (file-backed `NEX-RED/jobs/`).

---

## 1. Pendahuluan & Ruang Lingkup

SRS ini merinci persyaratan untuk **Nexus Cyber GaaS** — jasa terkelola berbasis agen (bounded agentic managed service) dengan siklus **ukur → kendalikan → uji** di kanal web/API.

**Bukan ruang lingkup v1:** Multi-tenant CNAME massal legacy, portal pelanggan self-serve otomatis, F-10 back-office, SOC otonom 24/7, pentest exploit.

### 1.1 Topologi deployment

| Mode | Deskripsi |
| --- | --- |
| **Instance kanal** | Satu gateway di depan satu `PROTECTED_HOST` (VPS atau on-prem) |
| **Job GaaS** | Siklus wasit + antibodi + verifikasi pada instance |
| **Loop GaaS** | Instance tetap + Job berkala |

Lab: `deploy-local/` — HTTP, satu hostname, bukan provisioner multi-tenant legacy.

### 1.2 Komponen

1. **Core Gateway (Go)** — data plane `:8080`: WAF Reflex, antibodi cache, MTD, honeypot, AVSE, rate limit
2. **Control plane** — `:8081`: telemetri, CLI, ban, lab antibody handlers
3. **Command Center (Next.js)** — operator internal `:3001`
4. **NEX-RED** — wasit defense delta, agen recon/access/hygiene/reporter, bridge `:3004`
5. **PostgreSQL / Redis** — log, blacklist, antibodi audit (Job entity **belum**)

```text
       Internet / lab hotspot
                 |
            Caddy :80/:443
                 |
          Gateway WAF :8080  ----> origin
                 |
          Honeypot :9090

       Operator (loopback):
          Next.js 127.0.0.1:3001  -->  Gateway SOC 127.0.0.1:8081
                 |
          NEX-RED bridge 127.0.0.1:3004
                 |
          PostgreSQL / Redis
```

---

## 2. Persyaratan Fungsional — GaaS

### RF-GaaS-01 — Job Cowork (orkestrasi)

- **Status:** **[Sudah ada]** — file-backed; migrasi PG belum
- **Deskripsi:** Sistem harus menyediakan entitas Job dengan status `OPEN` → `MEASURED` → `PENDING_APPROVAL` → `VERIFYING` → `CLOSED_OK` / `CLOSED_GAP` / `PARTIAL`.
- **Spesifikasi:**
  - Job memiliki tujuan, scope HTTP jinak, dan level otonomi L0/L1
  - Job **tidak** `CLOSED_OK` jika `replay_missed` tanpa residual di `CLOSED_GAP`
  - Orkestrasi memanggil NEX-RED agen + defense delta + (opsional) patcher + vaccine-probe

### RF-GaaS-02 — Wasit defense delta

- **Status:** **[Sudah ada]** (NEX-RED)
- **Deskripsi:** Request identik ke WAF dan origin lab; label `waf_blocked`, `origin_open`, `both_held`, `replay_held`, `replay_missed`.
- **Spesifikasi:** `NEX_RED_ORIGIN_DIRECT` hanya loopback/RFC1918/Docker; bukan HTTPS publik.

### RF-GaaS-03 — Antibody verify loop

- **Status:** **[Sudah ada]** (lab)
- **Deskripsi:** `GET /nexred/lab/antibody-signal`, `POST /nexred/lab/vaccine-probe`, replay harus 403 → `antibody_learned`.

### RF-GaaS-04 — Tepi always-on

- **Status:** **[Sudah ada]**
- **Deskripsi:** Reflex regex setelah `NormalizeForInspect`; antibodi cache; path SOC 404 di `:8080`.

### RF-GaaS-05 — Artefak risiko

- **Status:** **[Sudah ada]** — file-backed; migrasi PG belum
- **Deskripsi:** Export tabel delta, status antibodi, residual, log persetujuan L0/L1 untuk pemilik risiko kanal.

---

## 3. Persyaratan Fungsional — Infrastruktur (existing)

### RF-01 — Reverse Proxy & WAF (Reflex)

- **Deskripsi:** Gateway mengevaluasi request; Reflex = **regex** setelah normalisasi (bukan wajib LLM sinkron).
- **Spesifikasi:** Blok → 403 + `threat_logs`; reasoning `nex-ai-protect` **opsional asinkron**.

### RF-02 — MTD Port Shuffling

- Rotasi port backend HTTP; graceful handoff.

### RF-03 — GeoIP

- MMDB lokal; fallback ip-api; IP privat tidak dipetakan ke WAN laptop.

### RF-04 — AbuseIPDB (opsional)

- Jika `ABUSEIPDB_API_KEY` ada.

### RF-05 — SSH Tarpit

- Port `:2222` jika dipasang.

### RF-06 — Command Center CLI

- Xterm.js → `/api/cli/execute` di `:8081`.

### RF-07 — Telegram pager

- **Status:** Lab — env `TELEGRAM_*`; bukan multi-tenant produk jadi.
- Pesan setelah ban; bukan GPS.

---

## 4. Antarmuka API (ringkas)

Control plane `:8081` only untuk: `/api/cli/execute`, `/api/telemetry`, `/api/blacklist/*`, `/nexred/lab/antibody-signal`, `/nexred/lab/vaccine-probe`, login operator.

Data plane `:8080`: proxy + lab API; SOC paths → **404**.

Detail: [CLI_GUIDE.md](./CLI_GUIDE.md), [DEPLOY_ARCHITECTURE.md](./DEPLOY_ARCHITECTURE.md).

---

## 5. Persyaratan Non-Fungsional

1. **Keamanan:** CSRF pada mutasi; SOC tidak publik; CORS tidak wildcard di produksi.
2. **Kejujuran:** eBPF stub; PACS obfuskasi; NEX-RED bukan Shannon.
3. **Rate limit:** Token bucket per IP (`ClientIP`).
4. **Job API:** bridge `:3004` + widget operator; autentikasi operator penuh / audit PG **belum**.

---

## 6. Legacy / Ditunda

- RF multi-tenant legacy CNAME, `/api/domain/telegram/pair` massal, provisioner, F-10: **ditunda**
- PQC ke browser pengunjung: **bukan** E2E

Lihat [LIMITATIONS.md](./LIMITATIONS.md).

---

*SRS GaaS — 2026-08-22. PRD: [PRD.md](./PRD.md).*
