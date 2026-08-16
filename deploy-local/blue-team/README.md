# Blue team — laptop yang menjaga situs

Laptop ini = **pos pertahanan**. Tugasnya: menyalakan hotspot Windows, lalu menyalakan Nexus di depan portofolio.

Red team **tidak** menembak URL Vercel. Mereka join Wi-Fi hotspot ini, lalu membuka IP laptop ini.

## 1 klik

1. Docker Desktop sudah Ready.
2. Disarankan: internet lewat **kabel Ethernet** (Wi-Fi laptop dipakai untuk hotspot). Kalau hanya ada satu Wi-Fi, Windows kadang gagal share; skrip akan membuka Settings.
3. Double-click **`START.bat`** (akan minta Administrator).
   Sekali di laptop ini: `deploy-local\ALLOW-DEV-LAPTOP.bat` supaya Firewall/Defender tidak muncul terus.
4. Tunjukkan file **`KARTU-BLUE-TEAM.txt`** ke red team (SSID + password + URL).
5. Biarkan hotspot dan Docker tetap nyala sampai sesi selesai.
6. Double-click **`STOP.bat`** untuk mematikan.

`START-OFFLINE.bat` sama, tetapi origin-nya folder `playground/Portofolio-Thoriq` (tanpa Vercel).

## Kode + model: hard disk, bukan GitHub

Uji lab **tidak wajib** `git push` / `git pull`. Bobot NEX-AI (`nex-ai-models/*.gguf`) tidak masuk Git.

Alur yang disarankan: satu hard disk repo (di laptop kerja hurufnya bisa `D:\`, di blue team `E:\NEXUS-CYBER-FASE3`). Cabut → colok → jalankan dari folder itu. **Jangan hapus salinan “lama” di E: jika itu disk yang sama.**

Ollama **per laptop**. Jika model NEX-AI **sudah ada di folder lain** di laptop itu: `ollama rm nex-ai-protect` dan `ollama rm nex-ai-reflex`, lalu impor **hanya** dari `E:\NEXUS-CYBER-FASE3\nex-ai-models\IMPORT-OLLAMA.bat` (jangan dua sumber). Detail: [`nex-ai-models/README.md`](../../nex-ai-models/README.md).

## Setelah laptop red team push perbaikan (hanya jika blue team memakai clone Git terpisah)

`git pull` **saja tidak cukup** jika image Docker portofolio masih yang lama. Di laptop **blue team**:

```bat
cd D:\NEXUS-CYBER-FASE3
git pull origin main --recurse-submodules
```

Kalau folder submodule masih kosong/lama: `git submodule update --init --recursive`

Lalu **STOP.bat** → **START-OFFLINE.bat** (wajib rebuild agar JS Gallery baru masuk container). Jangan pakai origin Vercel untuk tes Gallery/vault lab.

Dataset NEX-AI dari log WAF (bukan LLM): **`COLLECT-DATASET.bat`** (butuh Python + Docker stack nyala).

## Yang otomatis

- Mobile Hotspot Windows, SSID `NEXUS-BLUE-LAB` / password `NexusBlue1` (bisa diubah di `deploy-local/.env`)
- Firewall Windows: izinkan port **80** dan **8080**
- Stack WAF (Caddy + Gateway + Postgres + Redis)
- Kartu lab untuk red team

## Kalau hotspot tidak nyala sendiri

Buka Settings → Mobile hotspot, nyalakan tombolnya, samakan nama & password dengan kartu. Stack WAF tetap bisa jalan.
