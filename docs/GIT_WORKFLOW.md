# Nexus Cyber Git Workflow

**Pembaruan:** 2026-09-01  
**Model produk:** [PRODUCT_MODEL.md](./PRODUCT_MODEL.md) — GaaS + Channel Portal v0.1.

Tidak ada submodule di monorepo. Origin portofolio = repo terpisah + **Vercel di belakang WAF**. Folder `playground/` diarsip — [PLAYGROUND_ARCHIVE.md](./PLAYGROUND_ARCHIVE.md).

**Dua produk, dua repo** (bukan submodule): [REPO_LAYOUT.md](./REPO_LAYOUT.md).

- **nexus-core** = repo ini (`NEXUS-CYBER-FASE3`, folder `D:\NEXUS`).
- **nexus-gaas-web** = Channel Portal produksi → [NEXUS-CYBER-WEBISTE-GaaS](https://github.com/Thbetyfu/NEXUS-CYBER-WEBISTE-GaaS) → Vercel dari **root** repo itu (`D:\nexus-gaas-web`).
- Salinan lab `nexus-channel-portal/` **tetap di FASE3** sampai cutover. **Jangan** Connect Git FASE3 ke project `warung-*`. Owner harus (re)connect Vercel ke repo GaaS di dashboard — agen tidak mengklik UI Vercel.

Produk jual dokumentasi: Channel Starter + Job / Loop GaaS — lihat [BRD.md](./BRD.md). Jangan dokumentasikan F-10 atau PSP pihak ketiga (Midtrans/Stripe) sebagai prioritas v1. Top-up Kredit = QRIS/VA milik pemilik + bukti + approve — jangan klaim sudah ada jika belum dikode.

## Clone

```bash
git clone https://github.com/Thbetyfu/NEXUS-CYBER-FASE3.git
```

## Update

```bash
git pull origin main
```

Lab: setelah pull, `deploy-local\blue-team\STOP.bat` lalu `START.bat` (origin Vercel di belakang WAF). `START-OFFLINE.bat` ditolak.

Commit: conventional commits. Perubahan perilaku → `CHANGELOG.md` + dokumen hidup ([docs/README.md](./README.md)).

## Yang tidak di-commit (gitignore)

Source Control harus berisi **kode produk**, bukan sampah lab. Sudah di `.gitignore` (akar) + `NEX-RED/jobs/.gitignore` + `channel-starter/sites/.gitignore`:

| Jangan push | Kenapa |
| --- | --- |
| `NEX-RED/jobs/data/*.json`, `JOB-*.json`, `*_scan.json`, `schedules.json` | Hasil Job Cowork di mesin operator; backup lokal. `immune_memory.json` **tetap** di Git. |
| `channel-starter/sites/*` kecuali `contoh-nexcent/` + README | Hasil generate klien; publish ke Vercel per folder, bukan ke monorepo. |
| `/*.png`, `.playwright-mcp/` | Screenshot / log agen di akar repo, bukan aset produk. |
| `.vercel/`, `.env*` | Link CLI Vercel + rahasia. **Jangan** Connect Git monorepo Nexus ke project warung. |
| `/playground/`, `archives/*.zip` | Lab tree diarsip di luar Git. Jangan commit unzip. |
| `NEX-RED/reports/`, `NEX-RED/workspaces/` | Laporan scan + Chromium lab. |

File **sudah ter-track** (status `M`, misalnya `package.json`) tidak hilang hanya karena gitignore — buang perubahan lokal (`git restore`) jika tidak sengaja, atau commit jika memang perbaikan produk.

Setelah `git pull origin main`, file untracked yang masuk pola di atas hilang dari panel Changes.
