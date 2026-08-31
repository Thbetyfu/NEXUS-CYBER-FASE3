# Folder `sites/` — hasil generate Channel Starter

Satu folder = **satu** situs UMKM (HTML statis). Bukan satu repo GitHub untuk semua warung.

| Yang terlihat | Arti |
| --- | --- |
| `contoh-nexcent/` | Demo **ikut git** |
| `warung-bu-siti/`, `kedai-palet-biru/`, … | Hasil generate **lokal** (gitignore) |
| Project Vercel `warung-bu-siti` + *No Production Deployment* | CLI `vercel` pernah *link* **satu** folder; **bukan** deploy; **bukan** seluruh generator hilang |

`python cli.py generate` **tidak** membuat project Vercel dan **tidak** membuat repo Git.

**Jangan** *Connect Git Repository* project UMKM ke `NEXUS-CYBER-FASE3` (monorepo gateway/SOC).

Deploy satu folder (operator, akun Vercel): lihat `PUBLISH.txt` di dalam folder situs.

Preview lab: `python cli.py serve` → `/preview/{slug}`.
