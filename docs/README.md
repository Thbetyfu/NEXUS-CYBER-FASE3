# Dokumentasi Nexus Cyber

Dokumen di folder ini **harus mengikuti kode**. Klaim yang tidak ada di repository dilarang.

## Hidup (wajib diselaraskan saat kode berubah)

| Berkas | Isi |
| --- | --- |
| [CHANGELOG.md](../CHANGELOG.md) | Riwayat perubahan perilaku |
| [CAPABILITIES.md](./CAPABILITIES.md) | Apa yang sistem **benar-benar** lakukan |
| [LIMITATIONS.md](./LIMITATIONS.md) | Apa yang **tidak** dijamin |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Stack, port, struktur folder |
| [DEPLOY_ARCHITECTURE.md](./DEPLOY_ARCHITECTURE.md) | Data plane vs control plane |
| [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) | Cara menjalankan |
| [PRD.md](./PRD.md) | Kebutuhan produk + status implementasi |
| [SOFTWARE_REQUIREMENTS_SPECIFICATION.md](./SOFTWARE_REQUIREMENTS_SPECIFICATION.md) | SRS |
| [CLI_GUIDE.md](./CLI_GUIDE.md) | Perintah SOC / NEX-RED |
| [../README.md](../README.md) | Ringkasan repo |
| [../deploy-local/README.md](../deploy-local/README.md) | Lab 1 klik |
| [../deploy-local/red-team/CHECKLIST.md](../deploy-local/red-team/CHECKLIST.md) | Apa yang diuji red team di hotspot |
| [SOFTWARE_DESIGN_DOCUMENT.md](./SOFTWARE_DESIGN_DOCUMENT.md) | Desain; banner 8081/eBPF stub |
| [NEXUS_CORE_DIRECTIVES.md](./NEXUS_CORE_DIRECTIVES.md) | Aturan arsitektur |
| [../AGENTS.md](../AGENTS.md) | Instruksi agen berikutnya |
| [NEX_AI_RUNTIME.md](./NEX_AI_RUNTIME.md) | Runtime hanya `nex-ai-protect` / `nex-ai-reflex` |
| [GIT_WORKFLOW.md](./GIT_WORKFLOW.md) | Submodule portofolio + `playground/NEXUS-CYBER-WEBISTE-SAAS` |
| [SELF_HEAL_GUIDE.md](./SELF_HEAL_GUIDE.md) | Integrity monitor BLAKE3 |

## Beku (arsip historis — jangan ditulis ulang seolah kondisi hari ini)

- `docs/reports/*` — laporan QA pada tanggal di header
- `docs/VULNERABILITY_ASSESSMENT.md`, `docs/INTELLIGENCE_GAP.md`, `docs/NEX_AI_*`, `docs/BRD.md`, `docs/ENTERPRISE_THREAT_INTEL_PLAN.md` — snapshot bisnis/evaluasi lama (klaim eBPF/JWT di sana **bukan** kontrak kode)
- `docs/PERFORMANCE_ESTIMATION.md`, `docs/DATABASE_SCHEMA.md`, `docs/BUSINESS_AND_DEPLOYMENT_SCHEMES.md` — estimasi / visi; bukan bukti XDP atau SaaS CNAME
- `shannon/docs/*`, `strix/docs/*` — dokumentasi pihak ketiga, bukan kontrak Nexus

## Aturan agen

Jika Anda mengubah perilaku gateway, dasbor, NEX-RED, Caddy, atau compose: perbarui baris terkait di tabel **Hidup**, tambah entri `CHANGELOG.md`, dan jangan mengarang fitur di CAPABILITIES.
