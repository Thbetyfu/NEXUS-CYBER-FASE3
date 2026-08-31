# Nexus Cyber Git Workflow

**Pembaruan:** 2026-08-31  
**Model produk:** [PRODUCT_MODEL.md](./PRODUCT_MODEL.md) — GaaS + Channel Portal v0.1.

## Submodule

| Folder | Remote | Peran |
| --- | --- | --- |
| `playground/Portofolio-Thoriq` | `https://github.com/Thbetyfu/Portofolio-Thoriq.git` | Origin lab (Gallery) di `START-OFFLINE` |

**Channel Portal** (`nexus-channel-portal/`, port `:3003`) ada di **monorepo** — bukan submodule. Portal legacy submodule **dihapus** (2026-08-22).

Produk jual dokumentasi: Channel Starter + Job / Loop GaaS — lihat [BRD.md](./BRD.md). Jangan dokumentasikan F-10 atau billing otomatis massal sebagai prioritas v1.

## Clone

```bash
git clone --recursive https://github.com/Thbetyfu/NEXUS-CYBER-FASE3.git
git submodule update --init --recursive
```

## Update

```bash
git pull origin main --recurse-submodules
```

Lab hotspot: setelah pull, `deploy-local\blue-team\STOP.bat` lalu `START-OFFLINE.bat`.

Ubah submodule: commit + push di dalam submodule, lalu `git add playground/<nama>` di repo utama.

Jangan hapus `.git` di dalam submodule.

Commit: conventional commits. Perubahan perilaku → `CHANGELOG.md` + dokumen hidup ([docs/README.md](./README.md)).

## Yang tidak di-commit (gitignore)

Source Control harus berisi **kode produk**, bukan sampah lab. Sudah di `.gitignore` (akar) + `NEX-RED/jobs/.gitignore` + `channel-starter/sites/.gitignore`:

| Jangan push | Kenapa |
| --- | --- |
| `NEX-RED/jobs/data/*.json`, `JOB-*.json`, `*_scan.json`, `schedules.json` | Hasil Job Cowork di mesin operator; backup lokal. `immune_memory.json` **tetap** di Git. |
| `channel-starter/sites/*` kecuali `contoh-nexcent/` + README | Hasil generate klien; publish ke Vercel per folder, bukan ke monorepo. |
| `/*.png`, `.playwright-mcp/` | Screenshot / log agen di akar repo, bukan aset produk. |
| `.vercel/`, `.env*` | Link CLI Vercel + rahasia. **Jangan** Connect Git monorepo Nexus ke project warung. |
| `NEX-RED/reports/`, `NEX-RED/workspaces/` | Laporan scan + Chromium lab. |

File **sudah ter-track** (status `M`, misalnya `package.json`) tidak hilang hanya karena gitignore — buang perubahan lokal (`git restore`) jika tidak sengaja, atau commit jika memang perbaikan produk.

Setelah `git pull origin main`, file untracked yang masuk pola di atas hilang dari panel Changes.
