# Panduan Self-Heal

**Pembaruan:** 2026-08-29  
**Model produk:** [PRODUCT_MODEL.md](./PRODUCT_MODEL.md) — komponen tepi Alur A. Mengembalikan **file origin yang dipantau** tanpa mematikan website. Bukan PITR database, bukan RCE di memori proses, bukan HTML di Vercel kecuali salinan folder itu ada di disk yang dipantau.

Integrity monitor di `nexus-core-gateway/internal/repair`:

- Baseline **dipin** ke berkas snapshot (BLAKE3 manifest). Restart gateway **tidak** mengambil ulang “asli” dari disk yang mungkin sudah di-deface.
- Deteksi perubahan lewat **fsnotify** (cadangan poll 2 detik). Restore tulis file di tempat — proses origin tidak di-restart.
- Pager Telegram (jika `TELEGRAM_*` diisi) pada restore/purge, lewat `ReportThreat` yang sama dengan autoban.
- Restore/purge **mengosongkan golden GET cache** di WAF agar HTML tepi tidak menahan halaman deface (relevan jika cache diopt-in pada origin HTTP).
- Folder default lab: `playground/Portofolio-Thoriq` (bukan portal OJK lama / `Portfolio-website`). `node_modules`, `.git`, `.next`, dan berkas &gt; 2 MiB dilewati.

---

Nexus Cyber memakai **System Integrity Monitor (Self-Heal)** agar deface/webshell di folder terpantau dikembalikan tanpa campur tangan operator dan **tanpa mematikan situs**.

---

## 1. Mekanisme

```text
[ Pin snapshot (disk) ] ──muat saat start──► [ RAM baseline ]
                                                    │
[ fsnotify / poll ] ──hash ≠ pin──► tulis ulang file (situs tetap jalan)
                                                    │
                                           Telegram + log SOC
```

1. **Pin (pertama kali, atau `INTEGRITY_REPIN=1` pada pohon yang diketahui sehat)**  
   Isi file terpantau di-hash BLAKE3, disimpan di `INTEGRITY_BASELINE_PATH` (default: berkas `.nexus-integrity-<hash>.json` di **induk** folder, bukan di dalam pohon yang di-purge).
2. **Start berikutnya**  
   Snapshot dimuat. Disk hidup yang berbeda → di-restore ke pin. Snapshot rusak/dipalsukan → **tidak** re-baseline dari disk; gateway log `SELF-HEAL-WARN` (set `INTEGRITY_REPIN=1` hanya jika pohon benar-benar sehat).
3. **Live**  
   Event fsnotify (debounce ~75ms) + poll 2 detik: file diubah/dihapus dikembalikan; file baru yang tidak ada di pin dihapus (anti-webshell di folder itu).

---

## 2. Uji lab (origin lokal)

Gateway harus berjalan dengan `INTEGRITY_MONITORED_DIR` menunjuk folder yang sama dengan yang Anda ubah (lab: submodule portofolio).

### Deface
Ubah sebuah berkas sumber di folder itu (mis. di `playground/Portofolio-Thoriq`). Dalam waktu singkat isi kembali ke pin. Log: `[SELF-HEAL] [INTEGRITY_VIOLATION] Restored MODIFIED file: ...`  
Jika Telegram dikonfigurasi, pager ikut (cooldown IP `self-heal` 15 menit, sama seperti pager ban).

### Hapus berkas
Hapus berkas yang ada di pin → file muncul lagi dari snapshot.

### Berkas liar
Buat `backdoor.php` di folder terpantau (bukan di `node_modules`) → dihapus.

**Docker lab (START-OFFLINE):** `dist/` di-bind ke container origin `/app/dist` (Go FileServer). Gateway memantau `/origin-lab/dist` — **folder yang sama**. Pertama kali, entrypoint men-seed `dist` dari image jika `index.html` belum ada. Deface `playground/Portofolio-Thoriq/dist/index.html` (setelah seed) kembali di situs tanpa mematikan container. `dist/uploads` (foto tamu) tidak dihapus oleh self-heal.

Origin **Vercel** (`START.bat` tanpa offline) tidak memakai bind-mount ini.

---

## 3. Konfigurasi

```env
INTEGRITY_MONITORED_DIR=../playground/Portofolio-Thoriq
# INTEGRITY_BASELINE_PATH=  # kosong = default di induk folder
# INTEGRITY_REPIN=1         # hanya saat Anda sengaja mengambil pin baru dari disk sehat
```

`deploy-local` / Docker: `INTEGRITY_MONITORED_DIR=/origin-lab`, `INTEGRITY_BASELINE_PATH=/app/data/integrity-baseline.json`.

Ganti folder jika instance melindungi site Channel Starter di disk, bukan portofolio.

Tes unit: `go test ./internal/repair/` di `nexus-core-gateway`.
