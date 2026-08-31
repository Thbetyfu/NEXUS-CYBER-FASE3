# Blue team — laptop yang menjaga situs

Lab **GaaS Alur A** (tepi) + uji wasit NEX-RED. Model: [`../../docs/PRODUCT_MODEL.md`](../../docs/PRODUCT_MODEL.md).

Laptop ini = **pos pertahanan**. Tugasnya: menyalakan hotspot Windows, lalu menyalakan Nexus di depan portofolio.

Red team **tidak** menembak URL Vercel. Mereka join Wi-Fi hotspot ini, lalu membuka IP laptop ini (atau `http://portfolio.nexus-lab.test` setelah `hosts`).

## 1 klik

1. Docker Desktop sudah Ready. Ollama host sudah punya `nex-ai-protect` **dan** `nex-ai-reflex` (`IMPORT-OLLAMA.bat` — bukan Hub). Tanpa itu START berhenti sebelum compose.
2. Disarankan: internet lewat **kabel Ethernet** (Wi-Fi laptop dipakai untuk hotspot). Kalau hanya ada satu Wi-Fi, Windows kadang gagal share; skrip akan membuka Settings.
3. Double-click **`START.bat`** (akan minta Administrator).
   Sekali di laptop ini: `deploy-local\ALLOW-DEV-LAPTOP.bat` supaya Firewall/Defender tidak muncul terus.
4. Tunjukkan file **`KARTU-BLUE-TEAM.txt`** ke red team (SSID + password + URL).
5. Biarkan hotspot dan Docker tetap nyala sampai sesi selesai.
6. Double-click **`STOP.bat`** untuk mematikan.

`START-OFFLINE.bat` **ditolak** (folder playground diarsip). Pakai **`START.bat`** — origin Vercel di belakang WAF. Self-heal file Vercel **tidak** ada.

## Kode + model: hard disk, bukan GitHub

Uji lab **tidak wajib** `git push` / `git pull`. Bobot NEX-AI (`nex-ai-models/*.gguf`) tidak masuk Git.

Alur yang disarankan: satu hard disk repo (di laptop kerja hurufnya bisa `D:\`, di blue team `E:\NEXUS-CYBER-FASE3`). Cabut → colok → jalankan dari folder itu. **Jangan hapus salinan “lama” di E: jika itu disk yang sama.**

Ollama **per laptop**. Jika model NEX-AI **sudah ada di folder lain** di laptop itu: `ollama rm nex-ai-protect` dan `ollama rm nex-ai-reflex`, lalu impor **hanya** dari `E:\NEXUS-CYBER-FASE3\nex-ai-models\IMPORT-OLLAMA.bat` (jangan dua sumber). Detail: [`nex-ai-models/README.md`](../../nex-ai-models/README.md).

## Setelah laptop red team push perbaikan (hanya jika blue team memakai clone Git terpisah)

`git pull` **saja tidak cukup** jika image Docker portofolio masih yang lama. Di laptop **blue team**:

```bat
cd D:\NEXUS-CYBER-FASE3
git pull origin main
```

Lalu **STOP.bat** → **START.bat**. Klaim Nexus = lewat `PROTECTED_HOST` / IP laptop, bukan URL Vercel langsung. **Channel Portal** ada di `nexus-gaas-web/` (git root), bukan origin hotspot.

Dataset NEX-AI dari log WAF (bukan LLM): **`COLLECT-DATASET.bat`** (butuh Python + Docker stack nyala).

## Pager Telegram (HP blue team)

Ini **pager setelah WAF sudah mem-ban**, bukan pelacak. Tanpa token, pertahanan tetap jalan; hanya tidak ada getaran di HP.

1. Di Telegram, buka [@BotFather](https://t.me/BotFather) → `/newbot` → salin token.
2. Buka bot baru, kirim `/start`.
3. Chat ID: buka `https://api.telegram.org/bot<TOKEN>/getUpdates` di browser laptop blue team (yang ada internet), lihat `"chat":{"id": ...}`.
4. Isi `deploy-local\.env` (jangan commit):

```
TELEGRAM_BOT_TOKEN=isi-token-bot
TELEGRAM_CHAT_ID=isi-chat-id
```

5. `STOP.bat` lalu `START.bat` supaya container gateway membaca env baru.
6. Uji: dari red team, 5× password vault salah sampai autoban. HP blue team dapat satu pesan berisi IP lab (`192.168.137.x`) yang **dilabeli privat** — bukan peta rumah.

Laptop blue team perlu **internet keluar** (kabel Ethernet disarankan). Hotspot ke red team tidak harus membagikan internet.

## Yang otomatis

- Mobile Hotspot Windows, SSID `NEXUS-BLUE-LAB` / password `NexusBlue1` (bisa diubah di `deploy-local/.env`)
- Firewall Windows: izinkan port **80** dan **8080**
- Stack WAF (Caddy + Gateway + Postgres + Redis)
- Kartu lab untuk red team

## Kalau hotspot tidak nyala sendiri

Buka Settings → Mobile hotspot, nyalakan tombolnya, samakan nama & password dengan kartu. Stack WAF tetap bisa jalan.
