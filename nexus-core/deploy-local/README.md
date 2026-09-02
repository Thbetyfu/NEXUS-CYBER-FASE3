# Nexus Cyber — deploy lokal 1 klik

Folder ini = **`nexus-core/deploy-local/`** (git root `D:\NEXUS`). 1 klik: **`nexus-core\deploy-local\START.bat`**. Bukan `D:\NEXUS\deploy-local\` di akar repo (sisa pohon lama).

Lab **Alur A** (tepi) + uji **Alur B** (NEX-RED wasit). Model produk: [`../docs/PRODUCT_MODEL.md`](../docs/PRODUCT_MODEL.md).

Folder ini menyalakan **tim biru** (WAF Gateway + Postgres + Redis + Caddy) di laptop, lalu mem-proxy situs portofolio di belakangnya.

Alur yang benar untuk bukti:

`pengunjung → http://IP-laptop:80 atau http://PROTECTED_HOST (Caddy) → Gateway :8080 → origin`

Lab default: `PROTECTED_HOST=portfolio.nexus-lab.test` (HTTP, berkas `hosts`). Origin = **Vercel di belakang WAF**. Folder `playground/` diarsip — [`../docs/PLAYGROUND_ARCHIVE.md`](../docs/PLAYGROUND_ARCHIVE.md). Self-heal file hanya jika `INTEGRITY_MONITORED_DIR` diisi folder lokal (bukan restore Vercel). **Channel Starter:** subdomain statis `{slug}.nexus-lab.test` dilayani Caddy langsung (tanpa WAF). Hostname toko lab: **`portal.nexus-lab.test`** → `:3003`, **`starter.nexus-lab.test`** atau path **`/starter/`** → `:3010`. **Upsell Cowork:** `channel-starter/cli.py upsell enable --slug …` → WAF + Job; env `deploy-local/channel-starter-upsell.env`. Jangan buka URL Vercel langsung jika ingin membuktikan Nexus. **Channel Portal (jual):** `cd nexus-gaas-web && npm run dev` (`:3003`). Generate Node = `CHANNEL_STARTER_URL=http://127.0.0.1:3010`. Tunnel pembeli: **`START-PORTAL-PILOT.bat`** (`:3003` saja). Tunnel juri/WAF: `jury\START-FOR-JURY.bat` (`:80`). Jangan tunnel SOC.

## Skenario lab: hotspot blue team

Blue team menyalakan **Mobile Hotspot Windows**. Red team join Wi-Fi itu, lalu menembak IP laptop blue team (bukan Vercel).

| Peran | Folder | 1 klik |
| --- | --- | --- |
| Blue team (jaga situs + hotspot) | [`blue-team/`](./blue-team/README.md) | `blue-team\START.bat` |
| Red team (join Wi-Fi, buka WAF) | [`red-team/`](./red-team/README.md) | `red-team\JOIN.bat` lalu `CHECK.bat` + [`red-team/CHECKLIST.md`](./red-team/CHECKLIST.md) |

Urutan: blue team dulu sampai kartu lab muncul → red team join `NEXUS-BLUE-LAB` → `JOIN.bat`. Password default lab: `NexusBlue1` (ubah di `.env`).

## Prasyarat

1. [Docker Desktop](https://www.docker.com/products/docker-desktop/) terpasang dan **sudah running** (ikon paus tidak sedang starting).
2. Port **80** dan **8080** belum dipakai (matikan `start-dev.bat` / compose root jika masih hidup).
3. Laptop terhubung internet (build image + origin Vercel).
4. **NEX-AI lokal** sudah terdaftar di Ollama host: `nex-ai-protect` **dan** `nex-ai-reflex`. Salin `nex_ai_q4_k_m.gguf` ke `nex-ai-models\` lalu jalankan `nex-ai-models\IMPORT-OLLAMA.bat`. **Bukan** `ollama pull` dari Hub. Cek: `CHECK-NEX-AI.bat` atau `ollama list`.
5. **Python 3** di PATH (hanya untuk gerbang `scripts/check_nex_ai.py` sebelum compose).

Tidak perlu Go atau Node untuk mode default. Tanpa langkah 4, START **berhenti sebelum** `docker compose up` (pesan Indonesia + jeda). CI: `NEX_AI_REQUIRED=0` (eksplisit; bukan fallback Hub).

Lab **Juice Shop** untuk skor kelas NEX-RED (bukan hotspot red team): [`NEX-RED/lab/juice-shop/README.md`](../NEX-RED/lab/juice-shop/README.md) — hanya `127.0.0.1:3003`.

## Laptop pengembangan (Windows Security)

Dialog **Allow / Don't allow** yang berulang (Firewall, Defender yang memindai `go`/`node`/`docker`, SmartScreen pada `.bat`) bisa dipasang **sekali**:

1. Double-click [`ALLOW-DEV-LAPTOP.bat`](./ALLOW-DEV-LAPTOP.bat)
2. Tekan **Yes** di UAC (hanya saat itu)

Setelah itu aturan firewall 80/8080/9090 dan pengecualian folder repo tetap tersimpan. **Tombol UAC Administrator** saat `blue-team\START.bat` (hotspot) tidak bisa dihilangkan oleh aplikasi — biarkan stack nyala, jangan START berulang setiap edit kode. Port SOC `8081`/`3001` **tidak** dibuka ke jaringan.

## Windows — 1 klik

1. Buka folder `deploy-local`.
2. Double-click **`START.bat`**.
3. Tunggu build pertama (beberapa menit). Jendela tidak boleh ditutup sampai ada alamat.
4. Buka di browser laptop ini: **http://127.0.0.1** atau **http://portfolio.nexus-lab.test** (jika `hosts` sudah diisi)
5. Dari laptop lain di Wi-Fi yang sama: **http://IP-LAN** atau nama yang sama setelah baris `hosts` mengarah ke IP itu.

| File | Fungsi |
| --- | --- |
| `ALLOW-DEV-LAPTOP.bat` | Sekali: firewall lab + Defender tidak tanya terus |
| `CHECK-NEX-AI.bat` | Cek Ollama lokal punya `nex-ai-protect` + `nex-ai-reflex` (helper yang sama dipakai START) |
| `START-PORTAL-PILOT.bat` | Cloudflare Tunnel ke Channel Portal `:3003` (bukan SOC, bukan WAF) |
| `START-OFFLINE.bat` | **Ditolak** — playground diarsip; pakai `START.bat` |
| `STATUS.bat` | Lihat kontainer hidup/mati |
| `STOP.bat` | Matikan stack (data Postgres tetap di volume Docker) |

## Linux / macOS / WSL

```bash
cd deploy-local
chmod +x start.sh stop.sh status.sh
./start.sh
./status.sh
./stop.sh
```

`./start.sh --offline` **ditolak** (playground diarsip).

## Apa yang ikut jalan

| Layanan | Port di laptop | Catatan |
| --- | --- | --- |
| Caddy | **80** (semua interface) | Pintu masuk pengunjung |
| Gateway WAF | **8080** | Pintu langsung, sama seperti lewat Caddy (bukan API SOC) |
| SOC admin | **127.0.0.1:8081** | Ban/reset/CLI — hanya laptop blue team |
| Honeypot | 9090 | Umpan scanner |
| Postgres | 127.0.0.1:5432 | Tidak dibuka ke LAN |
| Redis | 127.0.0.1:6379 | Tidak dibuka ke LAN |

Dashboard SOC Next.js **tidak** ikut di stack ini (image dashboard butuh `output: 'standalone'` yang belum diaktifkan). SSH tarpit **tidak** dipasang di port 22 Windows.

Pager Telegram opsional: isi `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` di `.env` laptop blue team. Lihat [`blue-team/README.md`](./blue-team/README.md).

Jika Anda menjalankan dasbor di laptop (`npm run dev -p 3001`) sambil stack `deploy-local` hidup:

- `NEXT_PUBLIC_API_URL=http://127.0.0.1:8081`
- Login memakai `NEXUS_ADMIN_TOKEN` dari `deploy-local/.env` (bukan variabel `NEXT_PUBLIC_*`)
- Port 8081 hanya `127.0.0.1` — red team di hotspot tidak bisa membuka SOC

## Origin

- **Default (`START.bat`)**: `https://portfolio-website-three-ruddy-65.vercel.app` di belakang WAF
- **Offline:** dihapus. Cadangan zip playground bukan origin deploy.

Host `portfolio.nexus-lab.test` **dan** `127.0.0.1` (WAF `:8080`) memakai origin compose yang sama. Jangan buka URL Vercel langsung untuk klaim “Nexus melindungi”.

Hosts lab toko (opsional, named tunnel / Caddy): `127.0.0.1 portal.nexus-lab.test starter.nexus-lab.test`

## Pilot storefront (bukan WAF)

Stack Docker di folder ini = tepi portofolio. Toko + wizard **bukan** kontainer:

1. `nexus-core\channel-starter` → `python cli.py serve` (`:3010`)
2. `nexus-gaas-web` → `.env.local` dari `.env.local.example` (pilot: `NEXUS_LEDGER_MODE=live`, `NEXUS_LAB_FAUCET=0`) → `npm run dev` (`:3003`)
3. Double-click **`START-PORTAL-PILOT.bat`** — tunnel Cloudflare ke `:3003` saja
4. HP: `/gate` → daftar → `/kredit` Isi → WA + bukti → approve `http://127.0.0.1:3003/operator/topup` → `/pesan/umkm-starter`
5. Preview: `https://<trycloudflare>/starter/preview/{slug}`

Pemilik: sleep Windows OFF; `cloudflared tunnel login` + hostname tetap (Zero Trust) sendiri. Jangan tunnel `:3001`/`:8081`.

Ubah origin di `deploy-local/.env` (disalin otomatis dari `.env.example` saat start pertama).

## NEX-RED (opsional, laptop yang sama)

Setelah stack hijau, uji posture lewat WAF:

```bash
python NEX-RED/nexred.py scan -u http://127.0.0.1 -m blackbox --no-llm
```

## Kalau gagal

- **Model AI tidak ada. Silakan pasang terlebih dahulu.** — Ollama belum nyala, atau `nex-ai-protect` / `nex-ai-reflex` belum diimpor. Salin `nex_ai_q4_k_m.gguf` ke `nex-ai-models\` lalu `IMPORT-OLLAMA.bat`. Jangan `ollama pull qwen` / `llama` / `gpt`. CI saja: `NEX_AI_REQUIRED=0`.
- **Docker Desktop is not running** — buka Docker Desktop, tunggu sampai Ready, klik `START.bat` lagi.
- **port is already allocated** — `STOP.bat`, atau matikan compose di root repo (`docker compose down`).
- **Halaman kosong / 502** — `STATUS.bat`, lalu `docker logs nexus-local-gateway`.
- **Laptop lain tidak bisa buka** — Windows Firewall: izinkan Docker / port 80 masuk; pastikan IP yang dipakai adalah IP Wi-Fi, bukan 127.0.0.1.
- **eBPF / iptables di Windows** — stub atau terbatas; Reflex WAF + proxy tetap jalan.

## Mematikan

Double-click `STOP.bat`. Volume `nexus-local_*` tetap ada. Hapus total:

```bash
cd deploy-local
docker compose --project-name nexus-local down -v
```
