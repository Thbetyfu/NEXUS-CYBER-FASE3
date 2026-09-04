# Folder `sites/` — hasil generate Channel Starter

Satu folder = **satu** situs UMKM (HTML statis). Bukan satu repo GitHub untuk semua warung.

| Yang terlihat | Arti |
| --- | --- |
| `contoh-nexcent/` | Demo **ikut git** (tidak di-publish Vercel) |
| `warung-bu-siti/`, `kedai-palet-biru/`, … | Hasil generate **lokal** (gitignore) |
| Project Vercel kosong + *No Production Deployment* | Dulu CLI `vercel` *link* tanpa `--prod`. Generate/`python cli.py publish` sekarang men-deploy Production per folder |

`python cli.py generate` men-deploy folder situs ke Vercel **jika** `VERCEL_TOKEN` ada di `channel-starter/.env` (gitignore; restart `serve`) **atau** `vercel login` di PC wizard. **Jangan** *Connect Git Repository* ke `NEXUS-CYBER-FASE3`; tiap warung = `python cli.py publish --slug`.

```powershell
python cli.py publish --slug warung-bu-siti
python cli.py publish --all
```

Preview lab: `python cli.py serve` → `/preview/{slug}`. Hosting Vercel ≠ wasit WAF.
