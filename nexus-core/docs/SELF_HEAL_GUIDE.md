# Panduan Self-Heal

**Pembaruan:** 2026-08-31  
**Model produk:** [PRODUCT_MODEL.md](./PRODUCT_MODEL.md) — komponen tepi Alur A. Mengembalikan **file origin yang dipantau** tanpa mematikan website. Bukan PITR database, bukan RCE di memori proses, **bukan** HTML di Vercel (origin deploy remote tidak di-restore).

Integrity monitor di `nexus-core-gateway/internal/repair`:

- **Kosong `INTEGRITY_MONITORED_DIR`** = skip (default deploy). Log: pin folder lokal dilewati.
- Baseline **dipin** ke berkas snapshot (BLAKE3 manifest) hanya jika folder diisi. Restart gateway **tidak** mengambil ulang “asli” dari disk yang mungkin sudah di-deface.
- Deteksi perubahan lewat **fsnotify** (cadangan poll 2 detik). Restore tulis file di tempat — proses origin tidak di-restart.
- Pager Telegram (jika `TELEGRAM_*` diisi) pada restore/purge, lewat `ReportThreat` yang sama dengan autoban.
- Restore/purge **mengosongkan golden GET cache** di WAF.
- `node_modules`, `.git`, `.next`, dan berkas &gt; 2 MiB dilewati. Folder `playground/` **tidak** ada di monorepo ([PLAYGROUND_ARCHIVE.md](./PLAYGROUND_ARCHIVE.md)).

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
   Isi file terpantau di-hash BLAKE3, disimpan di `INTEGRITY_BASELINE_PATH`.
2. **Start berikutnya**  
   Snapshot dimuat. Disk hidup yang berbeda → di-restore ke pin.
3. **Live**  
   Event fsnotify (debounce ~75ms) + poll 2 detik.

## 2. Uji (hanya jika folder lokal diisi)

Gateway harus berjalan dengan `INTEGRITY_MONITORED_DIR` menunjuk folder di disk **ini**. Origin Vercel tidak punya bind-mount.

```env
# Kosong = skip (deploy). Isi hanya untuk folder lokal yang ingin di-pin.
# INTEGRITY_MONITORED_DIR=/path/ke/origin-lokal
# INTEGRITY_REPIN=1
```

Tes unit: `go test ./internal/repair/` di `nexus-core-gateway`.
