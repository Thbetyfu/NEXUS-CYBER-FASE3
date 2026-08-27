# Nexus Cyber — Roadmap Strategis

**Versi:** v4.1.0 / 2026-08-22  
**Strategi:** [docs/PRODUCT_MODEL.md](docs/PRODUCT_MODEL.md) — **Channel Starter** + **GaaS Edge Antibody Cowork**  
**Status:** Milestone lab 1–16 selesai; **Milestone 17 (GaaS)** aktif.

> Milestone 11–16 di bawah = **warisan teknis lab**. Klaim komersial multi-tenant legacy, eBPF XDP nyata, Shannon/Strix parity, dan BSSN feed penuh **bukan** kontrak produk hari ini — lihat [docs/CAPABILITIES.md](docs/CAPABILITIES.md).

---

## Milestone 17: Pivot GaaS — Edge Antibody Cowork (ACTIVE)

*Dari multi-tenant WAF legacy → jasa terkelola siklus ukur→kendalikan→uji.*

| Fase | Target | Status |
| --- | --- | --- |
| **17.0 Docs & model** | PRODUCT_MODEL, PRD v3, BRD, BUSINESS | **Selesai** 2026-08-22 |
| **17.1 Job Cowork** | Entitas Job + orkestrasi delta/probe | **Sudah ada** (NEX-RED file-backed) |
| **17.2 L0/L1 + artefak** | Gerbang persetujuan + export risiko | **Sudah ada** |
| **17.3 Loop GaaS** | Job berkala + retainership operasi | **Sudah ada** (interval scheduler) |
| **17.4 Memori imun** | Histori antibodi/miss per host | **Sudah ada** (PG + file) |

Deliverable bisnis: Channel Starter (funnel UMKM) → upsell Job/Loop GaaS.

---

## Milestone 18: Channel Starter (ACTIVE — lab v0.1)

*Form → template → deploy UMKM; rule-based, bukan LLM berat.*

| Fase | Target | Status |
| --- | --- | --- |
| **18.0 Strategi & docs** | PRODUCT_MODEL §0, CHANNEL_STARTER, DECISIONS_OPEN | **Selesai** 2026-08-22 |
| **18.1 Form + template** | 3 layout, generator | **Lab v0.1** — `channel-starter/` |
| **18.2 Deploy shared** | Subdomain multi-tenant | **Lab siap** — Caddy import + hosts; VPS/TLS produksi butuh DNS wildcard |
| **18.3 Upsell Cowork** | Satu host → gateway + Job | **Lab siap** — `upsell enable` + `channel-starter-upsell.env` |

Keputusan bisnis belum final: [docs/DECISIONS_OPEN.md](docs/DECISIONS_OPEN.md).

---

## Rekam jejak (lab — completed)

### M1–M10: Gateway, AI, MTD, dashboard, self-repair, honeypot, stress test ✅

Fondasi teknis: Go gateway, Command Center, NEX-RED bridge, lab portofolio.

### M11–M16: Warisan komersial / evaluasi (completed di repo, bukan jual GaaS v1)

- M11: Multi-tenant legacy / PACS / billing — **superseded** oleh pivot GaaS; provisioner **ditunda**
- M12: Ban grid — tepi + Redis; eBPF = **stub**
- M13: NEX-AI GGUF + GeoIP pager
- M14–M15: Compliance / war game — sebagian lab/UI
- M16: NEX-RED fusion — **bukan** Shannon; bridge **3004**

---

## Sprint aktif (GaaS)

### Sprint G-1: Job object & CLI ✅

- [x] Skema Job + status machine (`NEX-RED/jobs/`)  
- [x] `nexred job` / bridge `/api/v1/jobs`  
- [x] Test: tidak `CLOSED_OK` pada `replay_missed`  

### Sprint G-2: Artefak & operator UI ✅

- [x] Export Markdown/JSON  
- [x] Widget Job Cowork di Command Center  

### Sprint G-3: Loop & memori host ✅

- [x] Scheduler `interval_hours` + tick bridge  
- [x] `immune_memory` PG + file  

---

## Sprint lab (completed — Fase 2 testbed)

### Sprint 1–3: Portofolio, deploy, GeoIP CLI ✅

Seperti rencana asli: vault password, docker lab, Telegram/GeoIP pager (jujur: bukan GPS).

---

## Milestone 19: Nexus Channel Portal (ACTIVE — v0.1)

*Pintu jual B2C/B2B — reuse desain portal legacy, copy & backend baru.*

| Fase | Target | Status |
| --- | --- | --- |
| **19.0 Naming & docs** | `nexus-channel-portal/`, bersih legacy | **Selesai** 2026-08-22 |
| **19.1 Landing + animasi** | Hero, fitur, harga, FAQ | **Selesai** |
| **19.2 Form + WA** | `/order` + proxy ke channel-starter | **Selesai** |
| **19.3 Midtrans** | Billing otomatis | **Ditunda** |

Keputusan bisnis: [docs/DECISIONS_OPEN.md](docs/DECISIONS_OPEN.md) (Q2/Q4/Q7/Q8 disepakati).

---

## Milestone 20: Cowork B2B GTM (ACTIVE)

*Prioritas Q9: demo & kontrak Job/Loop untuk fintech, integrator, kanal digital.*

| Fase | Target | Status |
| --- | --- | --- |
| **20.0 Keputusan Q9** | Fokus B2B Cowork vs form→site | **Selesai** 2026-08-23 |
| **20.1 Portal `/cowork`** | Landing B2B + paket + WA | **Selesai** |
| **20.2 Playbook operator** | [COWORK_B2B.md](docs/COWORK_B2B.md) | **Selesai** |
| **20.2b Distribusi pilot** | PC 24/7 + tunnel · harga per segmen | **Selesai** — [DISTRIBUTION_PILOT.md](docs/DISTRIBUTION_PILOT.md) |
| **20.2c Portal multi-segmen** | Hub `/` + `/umkm` `/sekolah` `/startup` `/institusi` | **Selesai** |
| **20.2d B2G pitching** | [COWORK_B2G.md](docs/COWORK_B2G.md) + `/b2g` + unit ekonomi | **Selesai** 2026-08-23 |
| **20.3 Setup tunnel live** | cloudflared + hostname publik (tanpa expose SOC) | **Belum** |
| **20.4 Pilot B2B** | Satu Job + artefak diserahkan | **Belum** |
| **20.5 Proposal template** | MD kontrak ilustrasi | **Belum** |
| **20.6 B2G produksi** | Packaging lisensi Edge + pilot DC klien | **Belum** (hanya pitching) |

---

## Yang sengaja tidak di roadmap v1

- Channel Portal self-serve billing otomatis, F-10, CNAME massal, SIPLah/E-Katalog massal  
- eBPF XDP produksi, klaim SOC otonom 24/7  
- Pentest exploit Shannon parity  
- Pengadaan B2G formal selesai (HPS resmi, sertifikasi) — pitching package saja dulu  

Roadmap bisnis detail: [docs/BUSINESS_AND_DEPLOYMENT_SCHEMES.md](docs/BUSINESS_AND_DEPLOYMENT_SCHEMES.md).

---

*Roadmap v4 — pivot GaaS 2026-08-22; B2G pitching 2026-08-23.*
