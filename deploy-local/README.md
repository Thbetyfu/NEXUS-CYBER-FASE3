# Nexus Cyber — deploy lokal 1 klik

Folder ini menyalakan **tim biru** (WAF Gateway + Postgres + Redis + Caddy) di laptop, lalu mem-proxy situs portofolio di belakangnya.

Alur yang benar untuk bukti:

`pengunjung → http://IP-laptop:80 (Caddy) → Gateway :8080 → origin`

Jangan buka URL Vercel langsung jika ingin membuktikan Nexus. Situs publik tetap di [portofolio Vercel](https://portfolio-website-three-ruddy-65.vercel.app/) tanpa WAF.

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

Tidak perlu Go, Node, atau Python untuk mode default.

## Laptop pengembangan (Windows Security)

Dialog **Allow / Don't allow** yang berulang (Firewall, Defender yang memindai `go`/`node`/`docker`, SmartScreen pada `.bat`) bisa dipasang **sekali**:

1. Double-click [`ALLOW-DEV-LAPTOP.bat`](./ALLOW-DEV-LAPTOP.bat)
2. Tekan **Yes** di UAC (hanya saat itu)

Setelah itu aturan firewall 80/8080/9090 dan pengecualian folder repo tetap tersimpan. **Tombol UAC Administrator** saat `blue-team\START.bat` (hotspot) tidak bisa dihilangkan oleh aplikasi — biarkan stack nyala, jangan START berulang setiap edit kode. Port SOC `8081`/`3001` **tidak** dibuka ke jaringan.

## Windows — 1 klik

1. Buka folder `deploy-local`.
2. Double-click **`START.bat`**.
3. Tunggu build pertama (beberapa menit). Jendela tidak boleh ditutup sampai ada alamat.
4. Buka di browser laptop ini: **http://127.0.0.1**
5. Dari laptop lain di Wi-Fi yang sama: **http://IP-LAN** yang tercetak di jendela (contoh `http://192.168.1.12`).

| File | Fungsi |
| --- | --- |
| `ALLOW-DEV-LAPTOP.bat` | Sekali: firewall lab + Defender tidak tanya terus |
| `START-OFFLINE.bat` | Sama, origin = `playground/Portofolio-Thoriq` (tanpa Vercel) |
| `STATUS.bat` | Lihat kontainer hidup/mati |
| `STOP.bat` | Matikan stack (data Postgres tetap di volume Docker) |

## Linux / macOS / WSL

```bash
cd deploy-local
chmod +x start.sh stop.sh status.sh
./start.sh
# tanpa Vercel:
./start.sh --offline
./status.sh
./stop.sh
```

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

Jika Anda menjalankan dasbor di laptop (`npm run dev -p 3001`) sambil stack `deploy-local` hidup:

- `NEXT_PUBLIC_API_URL=http://127.0.0.1:8081`
- Login memakai `NEXUS_ADMIN_TOKEN` dari `deploy-local/.env` (bukan variabel `NEXT_PUBLIC_*`)
- Port 8081 hanya `127.0.0.1` — red team di hotspot tidak bisa membuka SOC

## Origin

- **Default (`START.bat`)**: `https://portfolio-website-three-ruddy-65.vercel.app`
- **Offline (`START-OFFLINE.bat`)**: container `portfolio` di port internal 3002

Ubah origin di `deploy-local/.env` (disalin otomatis dari `.env.example` saat start pertama).

## NEX-RED (opsional, laptop yang sama)

Setelah stack hijau, uji posture lewat WAF:

```bash
python NEX-RED/nexred.py scan -u http://127.0.0.1 -m blackbox --no-llm
```

## Kalau gagal

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
