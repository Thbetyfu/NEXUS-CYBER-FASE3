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

## Yang otomatis

- Mobile Hotspot Windows, SSID `NEXUS-BLUE-LAB` / password `NexusBlue1` (bisa diubah di `deploy-local/.env`)
- Firewall Windows: izinkan port **80** dan **8080**
- Stack WAF (Caddy + Gateway + Postgres + Redis)
- Kartu lab untuk red team

## Kalau hotspot tidak nyala sendiri

Buka Settings → Mobile hotspot, nyalakan tombolnya, samakan nama & password dengan kartu. Stack WAF tetap bisa jalan.
