# Arsip playground (bukan kode produk)

**Status:** Arsip historis — 2026-08-31. Folder `playground/` **tidak** ada di monorepo lagi.

Pemilik meminta cabut lab tree dari kode karena tahap **deploy**. Cadangan zip (Portofolio-Thoriq + mock OJK) dibuat di luar Git.

| | |
| --- | --- |
| **Origin yang dilindungi** | Portofolio **Vercel** di belakang WAF (`TARGET_BACKEND` + `PROTECTED_HOST`) |
| **Start** | `nexus-core/deploy-local/START.bat` — **bukan** `START-OFFLINE.bat` |
| **Repo origin** | [Thbetyfu/Portofolio-Thoriq](https://github.com/Thbetyfu/Portofolio-Thoriq) (terpisah; jangan Connect Git monorepo Nexus ke project warung) |
| **Self-heal file** | Hanya jika `INTEGRITY_MONITORED_DIR` diisi folder lokal. File di Vercel **tidak** di-restore |

Jangan unzip arsip ke dalam clone produk kecuali untuk rujukan pribadi. Klaim “Nexus melindungi” tetap lewat `PROTECTED_HOST` / Caddy → WAF `:8080`, bukan URL `*.vercel.app` langsung.
