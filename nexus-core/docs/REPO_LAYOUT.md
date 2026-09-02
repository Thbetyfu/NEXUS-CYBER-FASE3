# Tata letak in-repo (git root `D:\NEXUS`)

**Pembaruan:** 2026-09-01  
Dua produk di **satu git** (`NEXUS-CYBER-FASE3`), **bukan** submodule, **bukan** nested `.git`. Workspace Cursor tetap **`D:\NEXUS`** (jangan rename folder git).

```
D:\NEXUS/                 # git root
  README.md               # payung dua produk
  AGENTS.md               # menunjuk .agents/ lokal
  .agents/                # gitignore — tidak di-push
  nexus-gaas-web/         # Channel Portal (dulu nexus-channel-portal)
  nexus-core/             # WAF, NEX-RED, channel-starter, deploy-local, docs, …
```

| Nama | Folder | GitHub / deploy |
| --- | --- | --- |
| **nexus-gaas-web** (lab in-repo) | `D:\NEXUS\nexus-gaas-web` | Jika Connect Git FASE3 ke Vercel: **Root Directory `nexus-gaas-web`** — **discouraged**. Jangan Connect `warung-*`. |
| **nexus-gaas-web** (produksi kanonik) | `D:\nexus-gaas-web` (saudara, **opsional**, di luar git ini) | [NEXUS-CYBER-WEBISTE-GaaS](https://github.com/Thbetyfu/NEXUS-CYBER-WEBISTE-GaaS) → Vercel dari **root** repo itu |
| **nexus-core** | `D:\NEXUS\nexus-core` | Lab WAF / NEX-RED / operator — **bukan** situs jual Vercel |

Salinan lab (`D:\NEXUS\nexus-gaas-web`) dan folder saudara `D:\nexus-gaas-web` **boleh drift** sampai owner pilih satu kanonik. Agen tidak mengklik UI Vercel.

## nexus-gaas-web (in-repo)

Channel Portal (Next.js `:3003`). Generate Node ke Channel Starter **`:3010`** (`CHANNEL_STARTER_URL=http://127.0.0.1:3010`); preview browser `/starter`. Pohon SaaS lama (Prisma/Midtrans) di cabang `archive/legacy-saas` pada repo GaaS.

## nexus-core

Mesin (bukan situs jual). Path 1 klik dari git root: **`nexus-core\deploy-local\START.bat`** (bukan `D:\NEXUS\deploy-local\` lama). Nama folder di disk — jangan `git mv`:

| Folder | Peran | Legend opsional |
| --- | --- | --- |
| `nexus-core-gateway/` | tepi WAF `:8080` | edge |
| `nexus-admin-dashboard/` | kokpit `:3001` | operator |
| `NEX-RED/` | wasit Job | cowork |
| `channel-starter/` | cetak site `:3010` | starter |
| `deploy-local/` | nyalakan mesin | runtime |
| `docs/` `scripts/` `postgres-init/` | kontrak, otomasi, SQL init | — |
| `NEX-AI/` | AI milik pemilik | ai |

Jangan nested `.git`. Jangan tunnel-kan SOC. Jangan Connect project `warung-*` ke FASE3. Detail: [`../README.md`](../README.md).

## Bukan

- Submodule, `git submodule add`
- Pindah `.git` FASE3 ke folder lain
- Force-push
- Satu project Vercel untuk warung + GaaS website + core
