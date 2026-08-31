# Nexus Cyber Limitations

Kontrak kejujuran produk GaaS. **Model:** [PRODUCT_MODEL.md](./PRODUCT_MODEL.md). Pembaruan: 2026-09-01.

---

## Batasan model GaaS

1. **Dua lapisan produk** — Channel Starter (murah, **lab v0.1** `channel-starter/`) ≠ Loop GaaS (mahal, **sudah** mesin lab). Jangan gabung klaim.
2. **Bukan self-serve legacy** — F-10 **ditunda**; Starter v1 = **`nexus-gaas-web/`** + form + template.
3. **Bukan SOC otonom 24/7** — Job Cowork + operator; manusia pemilik risiko L0/L1.
4. **Rp ~20rb/bulan** — website template Nexcent (4 palet) + domain lab `{slug}.nexus-lab.test` + **header tepi** (Caddy `file_server` atau `vercel.json`: nosniff / frame DENY / Referrer-Policy / CSP) + publish Vercel **per folder** jika `VERCEL_TOKEN`/`vercel login` (bukan Connect Git monorepo Nexus); **tanpa** WAF Reflex, **tanpa** Job Cowork / Loop, **tanpa** CNAME publik otomatis, **tanpa** klaim `*.vercel.app` sudah di belakang WAF gateway. Support unlimited tidak termasuk. Preview wizard `:3010` hanya di mesin yang `python cli.py serve`. Folder `sites/` gitignore kecuali demo `contoh-nexcent`. JSON JobStore (`NEX-RED/jobs/data/`, `JOB-*.json`) dan screenshot akar repo juga gitignore — bukan sumber kebenaran Git. JSON FastAPI `Site not found` hanya jika proses wizard **lama** masih hidup di port 3010 (kode baru: HTML).
4aa. **Pagar tipis (35rb/28rb, `--tier tepi`)** — Reflex judi/deface di tepi **hanya** jika trafik masuk WAF `:8080` / Host `PROTECTED_HOST`. Satu slug aktif per instance lab (bukan setiap warung otomatis). **Bukan** Job, **bukan** Loop di 20rb, **bukan** debit Starter 20 Kr, **bukan** pulih file Vercel, **bukan** anti zero-day. Self-heal `INTEGRITY_MONITORED_DIR` tidak merestorasi origin Vercel.
4b. **Hosting tahap pilot** — PC operator 24/7 + tunnel; **bukan** SLA data center. Control plane SOC **tidak** dipublikasikan lewat tunnel. Lihat [DISTRIBUTION_PILOT.md](./DISTRIBUTION_PILOT.md).
4c. **B2G on-prem** — pitching/arsitektur + pintu `/pemerintah` **ada** (alias `/b2g` tetap redirect); packaging binary berlisensi produksi, pengadaan formal, dan pilot DC instansi **belum**. Source & control plane **tidak** diserahkan. Lihat [COWORK_B2G.md](./COWORK_B2G.md).
5. **Bukan pentest exploit** — NEX-RED = wasit purple-team jinak.
6. **Residual wajib jujur** — `origin_open` / `replay_missed` tidak disembunyikan.
7. **Bukan GRC bank penuh** — irisan kanal digital saja.
8. **Bukan approve regulator** — POJK/BSSN = pembingkai kompetisi, bukan sertifikasi.
9. **DIY bisa meniru komponen** — moat = operasi + loop + jejak, bukan “tidak bisa ditiru”.

---

## Di luar cakupan (umum)

1. Rekayasa sosial, akses fisik, insider shell, celah firmware
2. Email / SMTP malware
3. Pemulihan database — self-repair hanya file di `INTEGRITY_MONITORED_DIR` (pin + fsnotify); origin Vercel remote tidak di-restore.
4. DDoS volumetric — eBPF **stub**, tidak `XDP_DROP`
5. RCE memori tanpa ubah file — self-repair tidak mendeteksi

---

## Batasan kode (demo & produksi)

6. **Reflex = regex** — bukan AI pada setiap request; reasoning `nex-ai-protect` tetap asinkron setelah lab hidup. **Start lab `deploy-local` fail-closed:** tanpa `nex-ai-protect` **dan** `nex-ai-reflex` di Ollama lokal, `START.bat` tidak menyalakan stack. `START-OFFLINE.bat` **ditolak** (playground diarsip). Bukan unduhan Ollama Hub. CI: `NEX_AI_REQUIRED=0`. Gateway `go test` tidak memanggil Ollama kecuali env itu `1`.
7. **Command Center / Operator GaaS bukan publik** — `:8081` / `:3001` loopback; SOC API 404 di `:8080`. Bukan dashboard pelanggan; UI lab (War Room/MTD/license) **dihapus** — fokus Job Cowork. **Panduan Penggunaan** in-app (ID) menjelaskan alur pilot; bukan mengganti `PRODUCT_MODEL` / `LIMITATIONS`. **Onboard kanal** = Origin URL + protected host saja; DNS/CNAME/tunnel di luar SOC; **tanpa** Docker auto-provision di jalur operator Cowork. Bukan self-serve multi-tenant / PSP pihak ketiga. **Workspace binding:** Job menembak protected host via WAF (`http://{host}`); Global Overwatch tidak menjalankan Job tanpa pilih workspace. Ban IP tetap global di gateway.
8. **Satu `PROTECTED_HOST` fokus per instance (pilot)** — onboard UI boleh daftar host tambahan di router, tetapi model jual tetap satu kanal fokus; bukan CNAME massal otomatis / provisioner massal. Job host-key mengikuti Active Workspace. Agen HTTP **dan** Playwright bind ke IP WAF + nama kanal (header `Host` / Chromium MAP) tanpa file hosts. PoW hotspot di named-host tanpa sesi tetap `sast_only` di alur browser. Publik tetap butuh DNS/tunnel agar *pengunjung* sampai ke WAF. **Origin lab:** `TARGET_BACKEND` menimpa OriginIP leftover pada host instance saat boot (`START.bat` = Vercel). Onboard host *tambahan* persist; onboard ulang origin pada `PROTECTED_HOST` instance sendiri **tertulis ulang** ke compose `TARGET_BACKEND` saat gateway restart. Di dalam container, `127.0.0.1:3001` bukan SOC host. Folder `playground/` tidak ada di repo — [PLAYGROUND_ARCHIVE.md](./PLAYGROUND_ARCHIVE.md).
9. **PACS/Base64** — obfuskasi, bukan enkripsi.
10. **NEX-RED origin direct** — hanya HTTP privat; publik/HTTPS ditolak untuk delta. Operator UI **tidak** menarget origin sebagai Job primary target.
11. **Telegram** — pager setelah ban **dan** setelah self-heal restore/purge (jika env diisi); bukan GPS; bukan deteksi mandiri di luar WAF/folder pin.
12. **F-10 back-office** — ditunda; login pelanggan v0 di portal **bukan** roster F-10; roster **bukan** di SOC `:8081`.
13. **IP/Ban per-workspace** — filter dari `threat_logs.target_domain` (DB) dengan fallback RAM; blacklist ban tetap gateway-global. Baris ThreatLog lama tanpa domain tidak muncul di digest/IP workspace.
14. **Digest insiden** — operator-only (`:8081`); bukan portal pelanggan; bukan sertifikasi BSSN/ISO; Global Overwatch tidak mengunduh.
15. **Antibodi vs Redis** — kekebalan Layer 1 di **RAM node ini**. Redis mati: patch yang sudah di RAM tetap 403; patch baru tetap tercatat di RAM tetapi **tidak** disebar ke node lain sampai Redis hidup. Restart gateway tanpa Redis = RAM kosong (bukan persistensi PG). IP blacklist + Reflex masih diarahkan ke honeypot, bukan 403.
16. **Ban IP vs restart** — baris aktif di `intel_blacklist` di-hydrate ke RAM saat `InitPostgres`. Tanpa Postgres (degraded), ban hanya `LocalBlacklist` dan **hilang** saat proses gateway restart. Ban kedaluwarsa / `is_active=false` tidak kembali. Bukan XDP kernel.
17. **Golden GET cache** — bukan CDN penuh; TTL default 60s; stale 1 jam hanya jika origin **5xx**/gagal. Tidak menyimpan `/api`, `/nexred`, JSON, cookie sesi, `Set-Cookie` selain `nexus_csrf`, atau `private`/`no-store`. Origin `max-age=0`/`no-cache` **boleh** di-snapshot. Tanpa cookie `nexus_session`, Host `PROTECTED_HOST` kena **PoW 403** dulu (bukan cache). Restart gateway mengosongkan cache. Bukan pengganti origin Vercel untuk self-heal file.
18. **Browser Job Chromium** — opsional. Default **drive folder NEX-RED** (`workspaces/.playwright-browsers` + `.tmp`), bukan Temp Windows di C:. Binary hilang → skip `sast_only`; Job HTTP tetap. Install: `NEX-RED/INSTALL-PLAYWRIGHT.bat`. PoW named-host tanpa `nexus_session` tetap `sast_only` (bukan gallery/vault selesai). Sesi lab hanya jika operator mengisi token yang sama di gateway + Job; **bukan** skip PoW pengunjung. Vaccine-probe HTTP tetap jalan tanpa PoW.
19. **Kredit** — ledger file **per tamu atau akun** di Channel Portal (`kredit-guest-{uuid}.json` / `kredit-account-{uuid}.json`); keran hanya `NEXUS_LEDGER_MODE=lab`. Tamu = cookie sesi `nexus_portal_sid` (bukan SSO). **Bukan** e-money, **bukan** settlement IDR, **bukan** jual Job 200 Kr dari portal. Top-up QRIS/VA milik pemilik + bukti + approve **disepakati, belum dikode**. **Bukan** Midtrans/Stripe. CLI `channel-starter` generate **tanpa** debit. Halaman `/order` tidak memakai `opacity: 0` Framer Motion.
---

## Yang sengaja ditunda (legacy subscription)

- Webhook / PSP pihak ketiga (Midtrans, Stripe)
- Alur top-up QRIS/VA + unggah bukti + approve (disepakati, **belum dikode**)
- Back-office F-10 di portal legacy
- Provisioner per-tenant CNAME massal

Lihat [CHANGELOG.md](../CHANGELOG.md) Unreleased.

---

*Limitations GaaS — 2026-08-31 (gerbang NEX-AI lab fail-closed + degradasi antibodi RAM + ban PG hydrate + golden GET).*
