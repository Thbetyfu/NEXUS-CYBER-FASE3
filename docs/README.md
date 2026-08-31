# Dokumentasi Nexus Cyber

Dokumen di folder ini **harus mengikuti kode**. Klaim yang tidak ada di repository dilarang.

**Pivot produk 2026-08-22:** **Channel Starter** (entry UMKM) + **GaaS Edge Antibody Cowork**. Sumber kebenaran: [PRODUCT_MODEL.md](./PRODUCT_MODEL.md). Keputusan terbuka: [DECISIONS_OPEN.md](./DECISIONS_OPEN.md).

## Hidup (wajib diselaraskan saat kode berubah)

| Berkas | Isi |
| --- | --- |
| [PRODUCT_MODEL.md](./PRODUCT_MODEL.md) | Lab target portofolio + dua lapisan Starter + GaaS Job/L0/L1 |
| [CHANNEL_STARTER.md](./CHANNEL_STARTER.md) | Entry UMKM form→template (**lab v0.1**) |
| [NEXUS_CHANNEL_PORTAL.md](./NEXUS_CHANNEL_PORTAL.md) | Pintu jual B2C/B2B — `nexus-channel-portal/` |
| [COWORK_B2B.md](./COWORK_B2B.md) | GTM & playbook Cowork B2B (prioritas Q9) |
| [COWORK_B2G.md](./COWORK_B2G.md) | Pitching on-prem B2G — lisensi Edge + Loop wajib |
| [PRICING_UNIT_ECONOMICS.md](./PRICING_UNIT_ECONOMICS.md) | Jual / COGS / margin per segmen (pilot) |
| [DISTRIBUTION_PILOT.md](./DISTRIBUTION_PILOT.md) | Distribusi awal: PC 24/7 + tunnel · harga pilot |
| [PRODUCT_LAUNCH_30_DAYS.md](./PRODUCT_LAUNCH_30_DAYS.md) | Checklist peluncuran produk tepat guna (30 hari) |
| [PC_MAIN_SERVER.md](./PC_MAIN_SERVER.md) | PC sebagai server utama — tanpa VPS/hotspot |
| [JURY_PUBLIC_ACCESS.md](./JURY_PUBLIC_ACCESS.md) | Akses juri: `START-FOR-JURY.bat` + cloudflared |
| [DECISIONS_OPEN.md](./DECISIONS_OPEN.md) | Keputusan bisnis — tanya pemilik |
| [CHANGELOG.md](../CHANGELOG.md) | Riwayat perilaku |
| [CAPABILITIES.md](./CAPABILITIES.md) / [LIMITATIONS.md](./LIMITATIONS.md) | Kontrak kejujuran |
| [ARCHITECTURE.md](./ARCHITECTURE.md) / [DEPLOY_ARCHITECTURE.md](./DEPLOY_ARCHITECTURE.md) | Stack & zona |
| [PRD.md](./PRD.md) / [SRS](./SOFTWARE_REQUIREMENTS_SPECIFICATION.md) / [SWD](./SOFTWARE_DESIGN_DOCUMENT.md) | Spesifikasi |
| [BRD.md](./BRD.md) / [BUSINESS_AND_DEPLOYMENT_SCHEMES.md](./BUSINESS_AND_DEPLOYMENT_SCHEMES.md) | Bisnis GaaS |
| [CLI_GUIDE.md](./CLI_GUIDE.md) / [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) | Operasi |
| [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) / [SELF_HEAL_GUIDE.md](./SELF_HEAL_GUIDE.md) | Skema & repair |
| [GIT_WORKFLOW.md](./GIT_WORKFLOW.md) / [REPO_LAYOUT.md](./REPO_LAYOUT.md) / [NEX_AI_RUNTIME.md](./NEX_AI_RUNTIME.md) | Dua repo (core vs GaaS web), clone tanpa submodule, AI |
| [PLAYGROUND_ARCHIVE.md](./PLAYGROUND_ARCHIVE.md) | Lab tree `playground/` diarsip — origin = Vercel + WAF |
| [../README.md](../README.md) / [../AGENTS.md](../AGENTS.md) / [../ROADMAP.md](../ROADMAP.md) / [../Task.MD](../Task.MD) / [../UNIT_TESTING.md](../UNIT_TESTING.md) | Root |
| [../nexus-core-gateway/README.md](../nexus-core-gateway/README.md) | Gateway |
| [../nexus-admin-dashboard/README.md](../nexus-admin-dashboard/README.md) | Operator kokpit |
| [../nexus-channel-portal/README.md](../nexus-channel-portal/README.md) | Channel Portal (jual) |
| [../NEX-RED/README.md](../NEX-RED/README.md) | Wasit GaaS |
| [../deploy-local/README.md](../deploy-local/README.md) | Lab 1 klik |
| [../scripts/README.md](../scripts/README.md) | Skrip |

## Beku (arsip — banner `Arsip historis` di header)

- `docs/reports/*` — QA pada tanggal di header
- `docs/VULNERABILITY_ASSESSMENT.md`, `INTELLIGENCE_GAP.md`, `ENTERPRISE_THREAT_INTEL_PLAN.md`, `NEX_AI_*`, `PERFORMANCE_ESTIMATION.md`, `PRD_Template_Siap_AI.md`
- `NEX-AI/*.md`, `nex-ai-models/README.md` — submodul latih/evaluasi
- `strix/`, `Soup/`, `shannon/` — pihak ketiga; **tidak** diselaraskan GaaS

## Aturan agen

Perubahan perilaku → `CHANGELOG.md` + dokumen hidup + selaraskan `PRODUCT_MODEL.md`. Jangan jual Loop di Rp 20rb / klaim top-up QRIS/VA selesai jika kode belum / Job selesai jika kode belum.
