# Checklist red team (lab hotspot)

Hanya uji **IP laptop blue team** hasil `JOIN.bat` (contoh `http://192.168.137.1`). Bukan URL Vercel, bukan Wi-Fi kampus/rumah orang lain.

Tidak ada kit exploit di folder ini. Payload ofensif **tidak** ditulis di sini. Cek encoding/obfuskasi ada di unit test gateway (`internal/ai/reflex_normalize_test.go`), bukan dari hotspot.

## Urutan

1. Blue team: `deploy-local\blue-team\START.bat`, kartu lab ada.
2. Join Wi-Fi `NEXUS-BLUE-LAB`.
3. `JOIN.bat` — browser terbuka ke IP WAF.
4. `CHECK.bat` — postur otomatis (situs hidup, SOC tertutup).
5. Uji manual di bawah (browser).
6. Opsional: `SCAN.bat` (NEX-RED blackbox, perlu Python).

## Wajib lulus (tulis hasil di kertas/sesi)

| # | Yang diuji | Cara | Lulus jika |
| --- | --- | --- | --- |
| 1 | Pintu benar | URL di address bar = IP hotspot, bukan `vercel.app`. Skrip `CHECK.bat` boleh dapat HTTP 403 (tantangan sesi); **browser** harus sampai halaman portofolio (200). | Halaman portofolio tampil di browser |
| 2 | Situs hidup | Beranda, navigasi, Gallery `#gallery` | Halaman biasa 200, foto/form terlihat |
| 3 | Unggah sah | Kirim gambar wajar di Gallery | Tidak ditolak sebagai ancaman; atau pesan WAF jelas jika berkas rusak. `GET /api/photos` boleh berisi `/api/guest-photos/…` meski kartu list origin masih 0 |
| 4 | Vault lab | Password **salah** berulang di hadiah (maks. 5) | Setelah 5 gagal, IP terban (akses situs teralih / ditolak). Minta blue team unban jika perlu lanjut |
| 5 | SOC tertutup | Dari laptop red team buka `http://IP-BLUE:3001` dan `http://IP-BLUE:8081` | **Tidak** nyambung (timeout / refused). Dasbor hanya di laptop blue team |
| 6 | Postgres/Redis | `IP:5432` / `IP:6379` | Tidak terbuka ke hotspot |
| 7 | Honeypot (opsional) | Port `9090` di IP blue team | Ada layanan umpan; boleh lambat. Jangan diandalkan sebagai “bobol” |
| 8 | Postur NEX-RED | `SCAN.bat` | Laporan header/reachability; **bukan** bukti exploit |

## Jangan

- Jangan buka origin Vercel lalu bilang “Nexus gagal”.
- Jangan minta blue team mem-publish dasbor ke hotspot.
- Jangan scan internet / IP di luar kartu lab.
- Jangan menyimpan atau membagikan daftar payload serangan di repo.

Unggah/vault error “MUX” / “Connection error” di **HTTP** hotspot: biasanya sidik jari `crypto.subtle` (sudah di-fallback di kode). Blue team harus `git pull origin main --recurse-submodules` lalu **START-OFFLINE** (rebuild), bukan hanya refresh Chrome.

## Kalau CHECK.bat gagal

- Masih di Wi-Fi salah, atau `JOIN.bat` belum dapat `target.txt`.
- Blue team belum `START.bat` / Docker mati.
- Isolasi klien hotspot HP: pakai hotspot **laptop** blue team.
