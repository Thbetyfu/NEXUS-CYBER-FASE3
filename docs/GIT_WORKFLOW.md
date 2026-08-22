# Nexus Cyber Git Workflow

**Pembaruan:** 2026-08-22  
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
